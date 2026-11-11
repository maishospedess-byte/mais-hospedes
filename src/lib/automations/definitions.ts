// Definição dos fluxos de automação (estrutura fixa — o hotel só edita textos permitidos)

export type AutomationType = 'welcome' | 'checkin_info' | 'during_stay' | 'checkout_survey'
export type TemplateLang = 'pt-BR' | 'es' | 'en'

export const AUTOMATION_TYPES: AutomationType[] = ['welcome', 'checkin_info', 'during_stay', 'checkout_survey']
export const LANGS: TemplateLang[] = ['pt-BR', 'es', 'en']

/** Código de idioma exigido pela Meta para templates */
export const META_LANG: Record<TemplateLang, string> = { 'pt-BR': 'pt_BR', es: 'es', en: 'en' }

export const WELCOME_DELAY_SECONDS = 300 // 5 minutos
export const DURING_STAY_DELAY_HOURS = 24

export type VariableKey =
  | 'nome_hospede' | 'nome_hotel' | 'cafe_da_manha' | 'wifi' | 'horario_checkin'
  | 'horario_checkout' | 'contato_recepcao' | 'regras' | 'link_google'

export const VARIABLES: Record<VariableKey, { label: string; example: string }> = {
  nome_hospede: { label: 'Nome do hóspede', example: 'Maria' },
  nome_hotel: { label: 'Nome do hotel', example: 'Hotel Exemplo' },
  cafe_da_manha: { label: 'Horário do café', example: '06:30 às 10:00' },
  wifi: { label: 'Wi-Fi', example: 'Hotel_WiFi / senha 1234' },
  horario_checkin: { label: 'Horário de check-in', example: '14:00' },
  horario_checkout: { label: 'Horário de check-out', example: '12:00' },
  contato_recepcao: { label: 'Contato da recepção', example: '+55 65 99999-9999' },
  regras: { label: 'Regras do hotel', example: 'Silêncio após 22h' },
  link_google: { label: 'Link de avaliação Google', example: 'https://mais-hospedes.vercel.app/r/abc123' },
}

export type AutomationDef = {
  type: AutomationType
  templateName: string
  title: string
  objective: string
  trigger: string
  mandatory: boolean
  defaultEnabled: boolean
  allowedVars: VariableKey[]
  requiredVars: VariableKey[]
  defaults: Record<TemplateLang, string>
}

export const AUTOMATIONS: Record<AutomationType, AutomationDef> = {
  welcome: {
    type: 'welcome',
    templateName: 'mh_boas_vindas',
    title: 'Boas-vindas',
    objective: 'Primeiro contato neutro: avisa ao hóspede que o cadastro foi recebido. Não confirma check-in.',
    trigger: 'Automático 5 minutos após o cadastro pelo QR Code, ou na hora, pelo botão "Enviar boas-vindas agora" na Recepção.',
    mandatory: true,
    defaultEnabled: true,
    allowedVars: ['nome_hospede', 'nome_hotel', 'contato_recepcao'],
    requiredVars: ['nome_hotel'],
    defaults: {
      'pt-BR': 'Olá, {nome_hospede}! Recebemos seu cadastro no {nome_hotel}. Por este número você receberá informações sobre sua hospedagem. Se não quiser mais receber mensagens, responda SAIR.',
      es: '¡Hola, {nome_hospede}! Recibimos su registro en {nome_hotel}. Por este número recibirá información sobre su estadía. Si no desea recibir más mensajes, responda SALIR.',
      en: 'Hi, {nome_hospede}! We have received your registration at {nome_hotel}. You will receive information about your stay through this number. If you no longer want to receive messages, reply STOP.',
    },
  },
  checkin_info: {
    type: 'checkin_info',
    templateName: 'mh_checkin_info',
    title: 'Check-in e informações úteis',
    objective: 'Envia em uma única mensagem café da manhã, Wi-Fi, horário de check-out, regras e contato da recepção.',
    trigger: 'Quando a recepção clica em "Confirmar check-in".',
    mandatory: true,
    defaultEnabled: true,
    allowedVars: ['nome_hospede', 'nome_hotel', 'cafe_da_manha', 'wifi', 'horario_checkin', 'horario_checkout', 'contato_recepcao', 'regras'],
    requiredVars: ['nome_hotel'],
    defaults: {
      'pt-BR': 'Olá, {nome_hospede}! Sua hospedagem no {nome_hotel} está confirmada.\nCafé da manhã: {cafe_da_manha}\nWi-Fi: {wifi}\nCheck-out: {horario_checkout}\nRecepção: {contato_recepcao}\nInformações importantes: {regras}\nTenha uma ótima estadia!',
      es: '¡Hola, {nome_hospede}! Su estadía en {nome_hotel} está confirmada.\nDesayuno: {cafe_da_manha}\nWi-Fi: {wifi}\nCheck-out: {horario_checkout}\nRecepción: {contato_recepcao}\nInformación importante: {regras}\n¡Que tenga una excelente estadía!',
      en: 'Hi, {nome_hospede}! Your stay at {nome_hotel} is confirmed.\nBreakfast: {cafe_da_manha}\nWi-Fi: {wifi}\nCheck-out: {horario_checkout}\nFront desk: {contato_recepcao}\nImportant information: {regras}\nEnjoy your stay!',
    },
  },
  during_stay: {
    type: 'during_stay',
    templateName: 'mh_durante_estadia',
    title: 'Durante a hospedagem',
    objective: 'Mensagem opcional de acompanhamento perguntando como está a estadia e oferecendo contato com a recepção.',
    trigger: '24 horas após a confirmação do check-in, somente se o hóspede ainda estiver hospedado.',
    mandatory: false,
    defaultEnabled: false,
    allowedVars: ['nome_hospede', 'nome_hotel', 'contato_recepcao'],
    requiredVars: ['nome_hotel'],
    defaults: {
      'pt-BR': 'Olá, {nome_hospede}! Como está sua estadia no {nome_hotel}? Se precisar de algo, fale com a recepção: {contato_recepcao}. Estamos à disposição!',
      es: '¡Hola, {nome_hospede}! ¿Cómo va su estadía en {nome_hotel}? Si necesita algo, hable con la recepción: {contato_recepcao}. ¡Estamos a su disposición!',
      en: 'Hi, {nome_hospede}! How is your stay at {nome_hotel} going? If you need anything, contact the front desk: {contato_recepcao}. We are here to help!',
    },
  },
  checkout_survey: {
    type: 'checkout_survey',
    templateName: 'mh_checkout_pesquisa',
    title: 'Checkout, satisfação e avaliação Google',
    objective: 'Pesquisa de satisfação de 0 a 10 e convite de avaliação no Google na MESMA mensagem, para todos os hóspedes, independentemente da nota.',
    trigger: 'Imediatamente quando a recepção clica em "Finalizar estadia".',
    mandatory: true,
    defaultEnabled: true,
    allowedVars: ['nome_hospede', 'nome_hotel', 'link_google'],
    requiredVars: ['link_google'],
    defaults: {
      'pt-BR': 'Olá, {nome_hospede}! Obrigado por se hospedar no {nome_hotel}.\nDe 0 a 10, qual nota você dá para sua estadia? Responda esta mensagem apenas com o número.\nSua opinião também ajuda outros viajantes. Avalie-nos no Google: {link_google}\nObrigado e até a próxima!',
      es: '¡Hola, {nome_hospede}! Gracias por hospedarse en {nome_hotel}.\nDel 0 al 10, ¿qué nota le da a su estadía? Responda este mensaje solo con el número.\nSu opinión también ayuda a otros viajeros. Evalúenos en Google: {link_google}\n¡Gracias y hasta pronto!',
      en: 'Hi, {nome_hospede}! Thank you for staying at {nome_hotel}.\nFrom 0 to 10, how would you rate your stay? Reply to this message with just the number.\nYour feedback also helps other travelers. Review us on Google: {link_google}\nThank you and see you soon!',
    },
  },
}

const VAR_RE = /\{([a-z_]+)\}/g

/** Extrai variáveis na ordem em que aparecem */
export function extractVars(text: string): string[] {
  return Array.from(text.matchAll(VAR_RE)).map(m => m[1])
}

/** Valida um texto editado segundo as regras dos templates da Meta. Retorna lista de erros. */
export function validateTemplateText(type: AutomationType, text: string): string[] {
  const def = AUTOMATIONS[type]
  const errors: string[] = []
  const trimmed = text.trim()
  if (trimmed.length < 20) errors.push('O texto precisa ter pelo menos 20 caracteres.')
  if (trimmed.length > 900) errors.push('O texto pode ter no máximo 900 caracteres.')
  const vars = extractVars(trimmed)
  for (const v of vars) {
    if (!(def.allowedVars as string[]).includes(v)) errors.push(`Variável não permitida neste fluxo: {${v}}`)
  }
  for (const r of def.requiredVars) {
    if (!vars.includes(r)) errors.push(`A variável {${r}} é obrigatória neste fluxo.`)
  }
  if (/^\{[a-z_]+\}/.test(trimmed)) errors.push('O texto não pode começar com uma variável (regra da Meta).')
  if (/\{[a-z_]+\}[.!?]?$/.test(trimmed)) errors.push('O texto não pode terminar com uma variável (regra da Meta).')
  if (/\}\s*\{/.test(trimmed)) errors.push('Duas variáveis não podem ficar lado a lado.')
  if (/\{(?![a-z_]+\})/.test(trimmed) || /(?<!\{[a-z_]+)\}/.test(trimmed)) errors.push('Chaves { } inválidas no texto.')
  return errors
}

/** Converte {variavel} → {{n}} (formato Meta) e devolve a ordem das variáveis */
export function toMetaBody(text: string): { body: string; variables: string[] } {
  const variables: string[] = []
  const body = text.trim().replace(VAR_RE, (_m, name: string) => {
    variables.push(name)
    return `{{${variables.length}}}`
  })
  return { body, variables }
}

/** Renderiza a prévia com valores reais */
export function renderPreview(text: string, values: Partial<Record<string, string>>): string {
  return text.replace(VAR_RE, (_m, name: string) => values[name] || VARIABLES[name as VariableKey]?.example || '')
}
