import { z } from 'zod'

// E.164 phone number format: + followed by 1-15 digits
const e164Regex = /^\+[1-9]\d{1,14}$/

export const registrationSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Nome é obrigatório')
    .max(200, 'Nome muito longo')
    .trim(),

  whatsapp_number: z
    .string()
    .regex(e164Regex, 'Número WhatsApp inválido')
    .transform((val) => val.replace(/\s/g, '')),

  email: z
    .string()
    .email('E-mail inválido')
    .optional()
    .or(z.literal('')),

  checkin_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de entrada inválida'),

  checkout_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de saída inválida'),

  guest_count: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional(),

  language: z
    .enum(['pt-BR', 'es', 'en'])
    .default('pt-BR'),

  consent: z
    .literal(true, { message: 'Consentimento é obrigatório' }),

  hotel_slug: z
    .string()
    .min(1, 'Hotel inválido'),
}).refine(
  (data) => {
    const checkin = new Date(data.checkin_date)
    const checkout = new Date(data.checkout_date)
    return checkout > checkin
  },
  {
    message: 'Data de saída deve ser posterior à data de entrada',
    path: ['checkout_date'],
  }
)

export type RegistrationInput = z.infer<typeof registrationSchema>
