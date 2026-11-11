import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase/server'
import { getMember, errorResponse, audit, HttpError, MANAGERS } from '@/lib/auth/member'

export const dynamic = 'force-dynamic'

const BUCKET = 'hotel-logos'
const MAX_BYTES = 2 * 1024 * 1024
const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

function sniff(buf: Uint8Array): string | null {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp'
  return null
}

async function ensureBucket(svc: ReturnType<typeof createServiceSupabase>) {
  const { data } = await svc.storage.getBucket(BUCKET)
  if (!data) {
    await svc.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: Object.keys(TYPES) })
  }
}

function pathFromUrl(url: string | null) {
  if (!url) return null
  const i = url.indexOf(`/${BUCKET}/`)
  return i >= 0 ? url.slice(i + BUCKET.length + 2).split('?')[0] : null
}

export async function POST(req: NextRequest) {
  try {
    const member = await getMember(MANAGERS)
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof Blob)) throw new HttpError(400, 'Selecione um arquivo de imagem')
    if (file.size > MAX_BYTES) throw new HttpError(400, 'A imagem deve ter no máximo 2 MB')
    const buf = new Uint8Array(await file.arrayBuffer())
    const type = sniff(buf)
    if (!type) throw new HttpError(400, 'Formato não suportado. Envie PNG, JPG ou WebP.')

    const svc = createServiceSupabase()
    await ensureBucket(svc)
    const { data: hotel } = await svc.from('hotels').select('logo_url').eq('id', member.hotelId).single()
    const path = `${member.hotelId}/logo-${Date.now()}.${TYPES[type]}`
    const { error } = await svc.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: false, cacheControl: '31536000' })
    if (error) throw new HttpError(500, `Falha ao salvar a imagem: ${error.message}`)
    const { data: pub } = svc.storage.from(BUCKET).getPublicUrl(path)
    await svc.from('hotels').update({ logo_url: pub.publicUrl }).eq('id', member.hotelId)
    const old = pathFromUrl(hotel?.logo_url || null)
    if (old && old.startsWith(member.hotelId + '/')) await svc.storage.from(BUCKET).remove([old])
    await audit(member.hotelId, member.userId, 'settings.logo_updated', 'hotel', member.hotelId)
    return NextResponse.json({ ok: true, logo_url: pub.publicUrl })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE() {
  try {
    const member = await getMember(MANAGERS)
    const svc = createServiceSupabase()
    const { data: hotel } = await svc.from('hotels').select('logo_url').eq('id', member.hotelId).single()
    await svc.from('hotels').update({ logo_url: null }).eq('id', member.hotelId)
    const old = pathFromUrl(hotel?.logo_url || null)
    if (old && old.startsWith(member.hotelId + '/')) await svc.storage.from(BUCKET).remove([old])
    await audit(member.hotelId, member.userId, 'settings.logo_removed', 'hotel', member.hotelId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
