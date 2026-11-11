import { NextRequest, NextResponse } from 'next/server'
import { getMember, errorResponse, audit, MANAGERS } from '@/lib/auth/member'
import { listGuests } from '@/lib/guests'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, string> = {
  pending: 'Aguardando check-in', active: 'Hospedado', completed: 'Estadia finalizada', blocked: 'Bloqueado', none: '-',
}
const MSG: Record<string, string> = {
  scheduled: 'Programada', queued: 'Enviando', sent: 'Enviada', delivered: 'Entregue', read: 'Lida', failed: 'Falha', cancelled: 'Cancelada',
}

function cell(v: unknown) {
  const s = v === null || v === undefined ? '' : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Exportação CSV (somente proprietário/gerente). Separador ";" para abrir direto no Excel em PT-BR. */
export async function GET(req: NextRequest) {
  try {
    const member = await getMember(MANAGERS)
    const p = req.nextUrl.searchParams
    const rows = await listGuests(member.hotelId, {
      q: p.get('q'), from: p.get('from'), to: p.get('to'), status: p.get('status'), sort: p.get('sort'),
    })
    const header = ['Nome', 'WhatsApp', 'E-mail', 'Idioma', 'Hotel', 'Data do cadastro', 'Entrada', 'Saída', 'Status da estadia', 'Última mensagem', 'Status da mensagem', 'Nota (0-10)', 'Opt-out']
    const lines = rows.map(r => [
      r.full_name, r.whatsapp_number, r.email, r.language, r.hotel_name,
      new Date(r.registered_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      r.checkin_date, r.checkout_date, STATUS[r.stay_status],
      r.last_message?.automation_type || '', r.last_message ? MSG[r.last_message.status] || r.last_message.status : '',
      r.score ?? '', r.opted_out ? 'Sim' : 'Não',
    ].map(cell).join(';'))
    await audit(member.hotelId, member.userId, 'guests.exported', 'guest', null, { count: rows.length })
    const csv = '﻿' + [header.join(';'), ...lines].join('\r\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="hospedes-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
