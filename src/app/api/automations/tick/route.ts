import { NextResponse } from 'next/server'
import { getMember, errorResponse } from '@/lib/auth/member'
import { dispatchDue } from '@/lib/automations/engine'

export const dynamic = 'force-dynamic'

/**
 * Reforço do agendador: enquanto o painel está aberto, processa as mensagens vencidas
 * do próprio hotel. O envio principal é feito pelo agendador do banco (pg_cron),
 * que funciona com o navegador fechado. A reivindicação atômica evita duplicidade.
 */
export async function POST() {
  try {
    const { hotelId } = await getMember()
    const r = await dispatchDue({ hotelId, limit: 10 })
    return NextResponse.json({ processed: r.processed, sent: r.sent, failed: r.failed })
  } catch (e) {
    return errorResponse(e)
  }
}
