import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase/server'
import { dispatchDue } from '@/lib/automations/engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

let cachedSecret: string | null = null

async function getSecret() {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET
  if (cachedSecret) return cachedSecret
  const svc = createServiceSupabase()
  const { data } = await svc.from('internal_config').select('value').eq('key', 'cron_secret').maybeSingle()
  cachedSecret = data?.value || null
  return cachedSecret
}

/** Chamado pelo pg_cron do Supabase a cada 30s (e opcionalmente pelo Vercel Cron). */
async function handle(req: NextRequest) {
  const secret = await getSecret()
  const provided = req.headers.get('x-cron-secret') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await dispatchDue({ limit: 40 })
  return NextResponse.json({ ok: true, ...result, results: undefined })
}

export const POST = handle
export const GET = handle
