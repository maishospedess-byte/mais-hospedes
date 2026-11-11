import { createServiceSupabase } from '@/lib/supabase/server'
import {
  AUTOMATIONS, AUTOMATION_TYPES, LANGS, META_LANG, VARIABLES, type AutomationType, type TemplateLang,
  toMetaBody, validateTemplateText, type VariableKey,
} from '@/lib/automations/definitions'
import { createTemplate, editTemplate, listTemplates, GraphError, logWaEvent, getConnectedAccount } from './graph'

export type TemplateRow = {
  id: string
  hotel_id: string
  automation_type: AutomationType
  template_name: string
  language: TemplateLang
  category: string
  status: string
  body_text: string
  draft_text: string | null
  variables: string[]
  meta_template_id: string | null
  rejection_reason: string | null
  submitted_at: string | null
  last_synced_at: string | null
}

/** Garante uma linha de template por fluxo × idioma (texto padrão, status "draft") */
export async function ensureTemplateRows(hotelId: string): Promise<TemplateRow[]> {
  const svc = createServiceSupabase()
  const { data: existing } = await svc.from('message_templates').select('*').eq('hotel_id', hotelId)
  const rows = (existing || []) as TemplateRow[]
  const missing: Record<string, unknown>[] = []
  for (const type of AUTOMATION_TYPES) {
    for (const lang of LANGS) {
      const def = AUTOMATIONS[type]
      if (!rows.find(r => r.automation_type === type && r.language === lang)) {
        const { variables } = toMetaBody(def.defaults[lang])
        missing.push({
          hotel_id: hotelId, automation_type: type, template_name: def.templateName, language: lang,
          category: 'UTILITY', status: 'draft', body_text: def.defaults[lang], variables,
        })
      }
    }
  }
  if (missing.length) {
    const { data } = await svc.from('message_templates').upsert(missing, { onConflict: 'hotel_id,template_name,language', ignoreDuplicates: true }).select('*')
    rows.push(...((data || []) as TemplateRow[]))
  }
  return rows
}

/** Texto que seria enviado à Meta numa nova submissão */
export function pendingText(row: TemplateRow) {
  return row.draft_text ?? row.body_text
}

/**
 * Envia (cria ou edita) templates na conta WhatsApp Business do hotel.
 * Só funciona com WhatsApp conectado. Retorna o resultado por template.
 */
export async function submitTemplates(hotelId: string, filter?: { type?: AutomationType; language?: TemplateLang }) {
  const account = await getConnectedAccount(hotelId)
  if (!account?.waba_id) throw new Error('Conecte o WhatsApp antes de enviar templates para aprovação.')
  const svc = createServiceSupabase()
  const rows = await ensureTemplateRows(hotelId)
  const results: { type: string; language: string; ok: boolean; status?: string; error?: string }[] = []

  let metaList: Awaited<ReturnType<typeof listTemplates>> | null = null

  for (const row of rows) {
    if (filter?.type && row.automation_type !== filter.type) continue
    if (filter?.language && row.language !== filter.language) continue
    const needsSubmit = row.status === 'draft' || row.status === 'rejected' || row.draft_text !== null
    if (!needsSubmit && !filter) continue

    const text = pendingText(row)
    const errors = validateTemplateText(row.automation_type, text)
    if (errors.length) {
      results.push({ type: row.automation_type, language: row.language, ok: false, error: errors.join(' ') })
      continue
    }
    const { body, variables } = toMetaBody(text)
    const examples = variables.map(v => VARIABLES[v as VariableKey]?.example || 'exemplo')
    try {
      let metaId = row.meta_template_id
      let status = 'pending'
      if (!metaId) {
        try {
          const created = await createTemplate(account.waba_id, account.token, {
            name: row.template_name, language: META_LANG[row.language], category: row.category || 'UTILITY', body, examples,
          })
          metaId = created.id
          status = (created.status || 'PENDING').toLowerCase()
        } catch (e) {
          // template com este nome/idioma já existe na conta → localizar e editar
          metaList = metaList || await listTemplates(account.waba_id, account.token)
          const found = metaList.find(t => t.name === row.template_name && t.language === META_LANG[row.language])
          if (!found) throw e
          metaId = found.id
          await editTemplate(metaId, account.token, { body, examples })
        }
      } else {
        await editTemplate(metaId, account.token, { body, examples })
      }
      await svc.from('message_templates').update({
        body_text: text, draft_text: null, variables, status, meta_template_id: metaId,
        submitted_at: new Date().toISOString(), rejection_reason: null,
      }).eq('id', row.id)
      await logWaEvent({ hotelId, kind: 'template', summary: `Template ${row.template_name} (${row.language}) enviado para aprovação` })
      results.push({ type: row.automation_type, language: row.language, ok: true, status })
    } catch (e) {
      const msg = e instanceof GraphError ? e.message : String(e)
      await logWaEvent({ hotelId, kind: 'template', level: 'error', summary: `Falha ao enviar template ${row.template_name} (${row.language}): ${msg}`, payload: e instanceof GraphError ? e.details : undefined })
      results.push({ type: row.automation_type, language: row.language, ok: false, error: msg })
    }
  }
  return results
}

/** Atualiza o status de aprovação consultando a Meta */
export async function syncTemplates(hotelId: string) {
  const account = await getConnectedAccount(hotelId)
  if (!account?.waba_id) throw new Error('WhatsApp não conectado.')
  const svc = createServiceSupabase()
  const rows = await ensureTemplateRows(hotelId)
  const list = await listTemplates(account.waba_id, account.token)
  let updated = 0
  for (const row of rows) {
    const found = list.find(t => t.name === row.template_name && t.language === META_LANG[row.language])
    if (!found) continue
    await svc.from('message_templates').update({
      status: found.status.toLowerCase(), meta_template_id: found.id,
      rejection_reason: found.rejected_reason && found.rejected_reason !== 'NONE' ? found.rejected_reason : null,
      last_synced_at: new Date().toISOString(),
    }).eq('id', row.id)
    updated++
  }
  return { updated, total: rows.length }
}
