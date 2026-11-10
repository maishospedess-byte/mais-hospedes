# Mais Hóspedes

## Sobre o projeto
SaaS B2B para hotéis brasileiros (e futuramente paraguaios). Automatiza comunicação com hóspedes via WhatsApp, coleta satisfação e estimula avaliações no Google. Independente da Roity. Proprietário: Gustavo.

## Spec
Documento-base: `docs/SPEC_v2.md` — ler integralmente antes de implementar qualquer funcionalidade.

## Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, App Router (`src/` dir)
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Validação:** Zod
- **WhatsApp:** WhatsApp Cloud API (não BSP)

## Estrutura de pastas
```
src/
  app/
    (auth)/          — login, register, callback
    (dashboard)/     — painel do hotel (protegido)
    (public)/h/[hotelSlug]/ — formulário QR público
    (superadmin)/    — painel admin Mais Hóspedes
    api/             — API routes (webhooks, registration)
  lib/
    supabase/        — clients (browser, server, service role)
    whatsapp/        — integração Meta Cloud API
    automations/     — engine de automações
    validators/      — schemas Zod
  types/             — TypeScript types e Database types
  components/        — UI, dashboard, forms, layout
  hooks/             — React hooks
  utils/             — helpers
supabase/
  migrations/        — SQL migrations
  seed/              — dados de seed
docs/                — especificação e documentação
```

## Regras de desenvolvimento
1. **Multi-tenant obrigatório:** todo acesso a dados filtrado por `hotel_id` no servidor (RLS + queries). Nunca confiar apenas no frontend.
2. **Idiomas:** PT-BR, ES, EN — todo texto voltado ao hóspede deve existir nos 3 idiomas.
3. **Consentimento:** checkbox obrigatório no formulário. Sem consentimento = sem mensagens.
4. **Sem PMS:** nenhuma integração com PMS ou software local na V1.
5. **Mensagens:** hotel paga Meta separado; assinatura cobre apenas o SaaS.
6. **Retenção:** PII excluída automaticamente 6 meses após checkout.

## Cores da marca
- Primary indigo: `#4F46E5`
- Accent: `#6366F1`
- Dark sidebar: `#0F1729`

## Comandos úteis
```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # ESLint
```
