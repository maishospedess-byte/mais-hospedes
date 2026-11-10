# MAIS HÓSPEDES — Especificação funcional e técnica
**Versão:** 2.0 — decisões consolidadas e pendências resolvidas  
**Data:** 09/11/2026  
**Baseado em:** v1 (04/11/2026) + revisão e questionário de decisões (07/11/2026)  
**Estado:** documento-base para desenvolvimento. Itens sinalizados como *proposta* ou *a validar* não são requisitos definitivamente aprovados; todas as demais seções são decisões fechadas.

> **Objetivo do documento:** servir de contexto para implementação com Claude Code, orientar testes e evitar que decisões de produto se percam. Este documento descreve requisitos, não comprova que funcionalidades já estejam implementadas.

---

## 1. Visão do negócio
**Mais Hóspedes** é uma empresa e SaaS independente da ROITY, de propriedade integral do fundador. O produto ajuda hotéis a melhorar relacionamento com hóspedes, automatizar comunicações pelo WhatsApp, coletar satisfação e estimular avaliações públicas no Google.

**Posicionamento:** software complementar, especializado em relacionamento, automação e reputação; **não é PMS**, não substitui o software de gestão hoteleira. O objetivo empresarial é crescer com operação enxuta e remota e criar valor para eventual aquisição em 3–5 anos. Venda inicial pelo fundador, prioritariamente ao **proprietário** do hotel; gerente participa da implantação e acompanhamento.

**Mercados:** lançamento inicial no Brasil, preparado para expansão ao Paraguai. Marca sempre "Mais Hóspedes"; interface e mensagens em português, espanhol e inglês; parametrizar moeda, fuso, identificadores empresariais e obrigações legais por país.

**Regra de escopo fechada:** **nenhuma integração com PMS, software local, sistema de reservas ou instalação no hotel na V1**. Não assumir compromisso de integrar depois; reavaliar somente mediante demanda e justificativa futura.

## 2. Princípios de produto
1. SaaS self-service, utilizável sem visita técnica e sem equipe de implantação obrigatória.
2. Fluxos prontos; evitar complexidade de editores visuais e integrações personalizadas.
3. Minimizar trabalho da recepção e suporte da Mais Hóspedes.
4. Interface simples para hóspedes; conclusão do cadastro pretendida em ~30–60 segundos (*meta de UX a validar*).
5. Segurança e isolamento de dados entre hotéis.
6. Comunicação WhatsApp **sempre em nome do hotel**, com seu próprio número oficial, não em nome da Mais Hóspedes.
7. QR Code e formulário pertencem à experiência da **Mais Hóspedes**; tela final exclusivamente com a marca Mais Hóspedes, mas links levam aos canais do hotel.
8. Não apresentar cadastro como check-in confirmado sem validação da recepção.

## 3. Interfaces do sistema
### 3.1 Site comercial / contratação
Landing page, apresentação dos planos, cadastro, assinatura, teste grátis e onboarding.

### 3.2 Painel do hotel
- Operação da recepção: novos cadastros em tempo real, confirmação de estadia, edição de dados, encerramento de estadia.
- Gestão: configurações do hotel, informações úteis, WhatsApp, QR Code, textos de automação, Instagram, contato, usuários e cobrança.
- Resultados: métricas, avaliações, satisfação e consumo do plano.

### 3.3 Superadmin Mais Hóspedes
Painel completo de gestão multi-tenant com as seguintes funcionalidades na V1:

**Gestão de hotéis:**
- Listar, visualizar, suspender e reativar hotéis.
- Ver status de conexão WhatsApp, plano ativo e uso de estadias.
- Consultar logs de erro de envio de mensagens por hotel.

**Métricas e monitoramento:**
- Dashboard agregado: total de hotéis, estadias processadas, mensagens enviadas/falhas, satisfação média.
- Alertas de falhas sistêmicas (filas paradas, webhooks falhando, templates rejeitados).

**Suporte e conteúdo:**
- Gerenciar artigos de ajuda e respostas do FAQ.
- Visualizar e responder tickets de suporte.
- Consultar histórico de interações de suporte por hotel.

**Auditoria:**
- Trilha de auditoria de ações administrativas (suspensões, alterações de plano, acessos a dados).
- Acesso a dados de hóspedes restrito ao mínimo necessário, com registro de cada consulta.

### 3.4 Formulário público do hóspede
Página mobile acessada pelo QR Code exclusivo do hotel; não exige instalar aplicativo.

## 4. Papéis e permissões
- **Proprietário:** acesso integral à conta do hotel, assinatura, configurações, usuários e dashboard de resultados.
- **Gerente:** acesso operacional e ao dashboard de resultados; poderes de configuração conforme política de permissões.
- **Recepcionista:** recebe alertas, visualiza cadastros pertinentes, corrige informações, confirma entrada e clica **"Finalizar estadia"**; não precisa acessar dados financeiros e relatórios estratégicos.

Um proprietário pode administrar mais de um hotel, respeitando plano e permissões. Toda consulta e atualização deve ser filtrada por hotel/tenant no servidor, nunca apenas na interface.

## 5. Jornada do hóspede via QR Code
### 5.1 QR Code
- **Um QR Code único, permanente, por hotel.**
- O código aponta para URL pública exclusiva e estável, por exemplo `https://maishospedes.com.br/h/<identificador-opaco>`.
- Identificador opaco não é credencial; **não concede acesso a cadastros nem ao painel**.
- Hotel baixa o QR Code, imprime e coloca na recepção.
- **V1: cadastro somente após chegada e leitura do QR Code.** Não oferecer pré-check-in por link enviado antes da chegada.
- O endereço do QR permanece o mesmo mesmo após atualizações no formulário.

### 5.2 Idioma
- Seleção **manual e visível** pelo hóspede entre **três idiomas**: Português (Brasil), Español e English, com bandeiras e nome textual do idioma.
- Todo o fluxo do formulário, mensagens de tela, erros e confirmação devem acompanhar o idioma escolhido.
- Mensagens WhatsApp devem ser enviadas no idioma selecionado pelo hóspede no formulário.
- Não depender exclusivamente de detecção automática do idioma do aparelho.

### 5.3 Aparência e textos
- **Texto de abertura padronizado, não editável pelo hotel.**
- Identidade do formulário: Mais Hóspedes. A experiência é padronizada nacionalmente.
- *Copy provisória sugerida*: "Bem-vindo! 👋 Vamos tornar sua hospedagem ainda melhor? Faça seu cadastro em menos de 1 minuto." / tradução equivalente em espanhol e inglês.
- Fluxo rápido, visual de aplicativo, três etapas e barra de progresso; gamificação leve, sem desafios que aumentem o tempo.
- Não exigir CPF, fotos, documentos ou endereço na experiência inicial, salvo exigência legal/operacional tratada em fluxo distinto.
- O cadastro do Mais Hóspedes **não substitui** obrigações oficiais de registro de hóspedes.

### 5.4 Campos do formulário
| Campo | Regra V1 | Observações |
|---|---|---|
| Nome completo | Obrigatório | Validar preenchimento |
| WhatsApp | Obrigatório | DDI, normalização E.164 e validação de formato; formato válido **não prova titularidade** |
| E-mail | Opcional | Validar formato se informado |
| Datas de entrada/saída | Obrigatório | Hóspede informa; recepção confirma/corrige ao validar estadia. Não assumir datas autorreferidas como verificadas |
| Quantidade de hóspedes | Opcional | Não criar dependência desnecessária |
| Consentimento | Obrigatório | Checkbox: "Aceito receber mensagens pelo WhatsApp sobre minha estadia" — base legal: consentimento explícito (LGPD art. 7°, I) |

Minimização de dados e informação clara sobre privacidade, finalidade do tratamento e comunicações. Eventual verificação por OTP/código é **opção futura**, não requisito fechado da V1.

### 5.5 Conclusão e tela final
- Só mostrar sucesso após confirmação de gravação no servidor.
- Tela final **somente com marca Mais Hóspedes**, sem nome ou logotipo do hotel.
- Mensagem padronizada nos três idiomas: cadastro enviado, sem afirmar que hospedagem foi confirmada.
- Dois botões **opcionais** e não bloqueantes:
  - **"Siga nosso Instagram"** → perfil do hotel configurado no painel.
  - **"Salve nosso WhatsApp"** → contato do hotel, idealmente arquivo `.vcf` para salvar na agenda.
- Apesar do branding Mais Hóspedes, o destino dos botões deve identificar claramente que é do **hotel**.
- Registrar **cliques** no Instagram e downloads/acionamentos de contato; **não** confundir com seguidores efetivos ou contatos efetivamente salvos.
- Se o hotel não configurar um destino válido, ocultar o botão correspondente.
- Validar a experiência com os primeiros hotéis; decisão de lançamento é padrão provisório sujeito a evidências de uso.

## 6. Cadastro em tempo real no painel
### 6.1 Fluxo técnico
1. Hóspede abre URL do QR.
2. Frontend consulta configuração pública mínima do hotel.
3. Hóspede preenche e envia formulário.
4. Backend valida campos, protege contra abuso (rate limiting por IP/dispositivo, captcha adaptativo) e associa o registro ao hotel correto.
5. Backend persiste registro no PostgreSQL, com identificador idempotente para evitar duplicações por reenvio.
6. Após commit, o painel autenticado da recepção recebe evento em tempo real e atualiza a lista.
7. Se conexão em tempo real cair, o painel reconecta e sincroniza o estado atual, sem perder cadastros.

**Meta de UX:** aparecer em segundos em condições normais; **não prometer SLA de 1–2 s** sem medição.

### 6.2 Alertas
- Novo cadastro aparece em destaque **vermelho** no painel.
- Notificação sonora curta, com opção de silenciar.
- Regras de horário do som **não precisam ser definidas agora**.
- Mostrar status do registro e contagem regressiva visível de **50 segundos** para o primeiro envio de boas-vindas.
- Botões operacionais propostos: **Confirmar agora** e **Bloquear cadastro**; nomes e permissões podem ser refinados.

### 6.3 Regra dos 50 segundos — decisão fechada
- **Os 50 segundos liberam exclusivamente a primeira mensagem neutra de boas-vindas.**
- **Não confirmam check-in, não ativam automações de estadia e não provam reserva.**
- Funcionário pode intervir/bloquear antes do envio.
- **Envio ocorre 24h, independente do horário** — não há restrição de horário para a mensagem de boas-vindas.
- O disparo depende de elegibilidade de contato, consentimento explícito registrado no formulário, regras do WhatsApp Business Platform e template aprovado quando aplicável.
- Envio deve ser agendado de forma confiável no backend, **não** depender de navegador aberto ou cronômetro JavaScript no painel.
- Evitar envios duplicados, inclusive após reconexão/reprocessamento.

## 7. Ciclo de vida da estadia
**Estados:**
- `registration_pending`: formulário recebido; estadia ainda não confirmada.
- `stay_active`: recepção confirmou entrada e datas.
- `stay_completed`: recepção clicou **"Finalizar estadia"**.
- `registration_blocked` / `cancelled`: inválido, cancelado ou bloqueado.

**Decisões fechadas:**
- Recepção confirma a hospedagem, separadamente do envio de boas-vindas.
- Recepção **sempre** finaliza a estadia no painel na V1.
- O botão **"Finalizar estadia"** registra checkout e dispara pesquisa de satisfação **imediatamente** (sem atraso).
- Recepção pode corrigir datas, inclusive checkout antecipado ou extensão, cancelando/recalculando mensagens futuras.
- Não há sincronização com PMS.

**UX sugerida:** listas "Aguardando confirmação", "Hospedados", "Checkout realizado", com ações rápidas. Garantir que clicar duas vezes em finalizar não dispare duas pesquisas.

## 8. WhatsApp: integração e identidade
- Hotel conecta **seu próprio número** à **plataforma oficial WhatsApp Business da Meta**.
- Todas as mensagens chegam **em nome do hotel**, no número e identificação comercial dele, conforme configuração/validação da Meta.
- Mais Hóspedes opera nos bastidores; não aparece como remetente.
- **Hotel paga custos de mensagens diretamente à Meta**; a assinatura SaaS é cobrada separadamente pela Mais Hóspedes. O preço da assinatura não inclui custos de envio de mensagens.
- Mensagens iniciadas pela empresa podem exigir templates aprovados; edição de textos não significa envio irrestrito.
- Manter registro de consentimento explícito (checkbox do formulário), opt-out e preferências; não enviar mensagens sem consentimento registrado.
- Não criar agente conversacional de atendimento ao hóspede na V1. Oferecer contato/encaminhamento à recepção, sem fingir atendimento humano automatizado.

### 8.1 Onboarding de conexão WhatsApp — modelo híbrido
O onboarding de conexão do número WhatsApp do hotel segue modelo **híbrido**:

**Self-service (padrão):**
1. Tutorial passo a passo dentro do produto, com screenshots e vídeo curto.
2. Checklist de pré-requisitos: Meta Business Suite configurada, número não vinculado ao WhatsApp Business App pessoal, Business Verification da Meta.
3. Embedded Signup integrado ao fluxo de onboarding.
4. Status em tempo real de cada etapa: verificação da empresa, aprovação de templates, conexão ativa.
5. Testes em sandbox antes de ativar envios reais.

**Suporte assistido (sob demanda):**
- Se o hotel travar em qualquer etapa, pode solicitar ajuda via ticket ou chat.
- Mais Hóspedes oferece assistência remota para migração de número (quando hotel já usa WhatsApp Business App) e resolução de problemas com a Meta.
- Assistência de onboarding WhatsApp incluída no suporte, sem cobrança adicional.

**Importante:** o trial de 14 dias pode rodar com simulação/sandbox enquanto o WhatsApp não está totalmente aprovado. Hotel não perde dias de trial por demora da Meta.

## 9. Automações V1
**Filosofia:** fluxos pré-construídos, sem editor de arrastar e soltar. Hotel pode editar **textos permitidos**, ativar/desativar opções e preencher dados variáveis; não altera lógica estrutural. Textos editáveis devem passar por requisitos de template Meta. **Todos os textos devem existir nos três idiomas** (PT, ES, EN); o sistema envia no idioma escolhido pelo hóspede no formulário.

### Fluxo A — Boas-vindas ao cadastro (obrigatório)
**Gatilho:** envio bem-sucedido do formulário QR.  
**Atraso:** 50 segundos.  
**Condição:** cadastro não bloqueado, consentimento registrado, contato apto e envio autorizado.  
**Conteúdo:** saudação neutra, sem afirmar check-in confirmado.  
**Importante:** não altera estado da estadia. Dispara 24h, sem restrição de horário.

### Fluxo B — Check-in e informações úteis (obrigatório)
**Gatilho:** recepção confirma entrada.  
**Conteúdo consolidado em uma mensagem:** nome do hóspede, horário do café, Wi-Fi (avaliar segurança da exposição), horário de checkout, regras essenciais e contato da recepção.  
**Fonte:** seção **Informações do Hotel** preenchida uma vez pelo gestor.  
**Não enviar** se hospedagem não confirmada.

### Fluxo C — Durante a estadia (opcional)
**Gatilho:** estadia ativa e janela programada.  
**Conteúdo:** pergunta curta sobre experiência e opção de falar com recepção.  
**Escopo:** opcional na V1; não criar chatbot de IA para hóspedes.

### Fluxo D — Checkout, satisfação e Google (obrigatório)
**Gatilho:** recepção clica **"Finalizar estadia"**.  
**Timing:** envio **imediato**, sem atraso.  
**Canal:** toda interação **dentro do WhatsApp**.  
**Conteúdo da mensagem:** pesquisa de satisfação (nota 0 a 10) **E link do Google na mesma mensagem**.  
**Registro:** resposta da nota associada à estadia/hotel, com validação.  
**Regra ética/comercial:** não usar nota como filtro para mostrar link do Google; evitar review gating. O link do Google vai para **todos**, na mesma mensagem da pesquisa, **sem depender de resposta**.  
**Se não houver resposta à nota:** o hóspede já recebeu o link do Google na mensagem inicial — objetivo cumprido. Regra de lembrete para a nota: *a definir* (não bloqueia lançamento).  
**Meta:** não inventar aprovação de templates, recursos de interação ou capacidades da API; verificar no desenvolvimento.

## 10. Configurações do hotel
### Informações do Hotel
Campos: nome comercial, telefone/WhatsApp oficial, Instagram, URL direta para avaliação no Google, horários de check-in/checkout, café da manhã, Wi-Fi, regras, contato da recepção, fuso e idioma principal.

### Meu QR Code
Exibir, copiar URL, baixar para impressão e consultar número de cadastros originados do QR.

### Automações
Ativar/desativar fluxos opcionais, editar textos permitidos (nos três idiomas), visualizar prévia e status de aprovação de templates.

### Equipe
Convidar/remover usuários; atribuir papéis; manter trilha de alterações.

## 11. Dashboard e métricas
**Público principal:** gerente e proprietário. **Recepção:** painel operacional.

**Métricas:**
- Cadastros QR recebidos e concluídos; pendências.
- Check-ins confirmados e checkouts finalizados.
- Estadias processadas no ciclo de cobrança.
- Mensagens programadas/enviadas/entregues/falhas (conforme dados realmente disponíveis).
- Respostas da pesquisa 0–10 e média de satisfação.
- Avaliações Google: contagem e nota média, se integração/API e permissões permitirem.
- Cliques para Instagram e downloads/acionamentos do contato.
- Uso do plano: "420 de 600 estadias".
- Relatórios por período e por unidade conforme plano.

**Importante:** cliques ≠ seguidores; mensagem enviada ≠ lida; satisfação interna ≠ nota Google. Não prometer correlação causal ou integração Google antes de validar acesso e permissões.

## 12. Assinatura, limites e cobrança
| Plano | Preço mensal | Limite de estadias/mês | Usuários | Unidades | Destaques |
|---|---:|---:|---:|---:|---|
| Essencial | R$ 97 | 150 | 2 | 1 | QR, mensagens básicas, satisfação, link Google, dashboard básico |
| Profissional | R$ 197 | 600 | 5 | 1 | Fluxos completos, reputação Google quando viável, dashboard e relatório mensal |
| Premium | R$ 347 | 1.500 | 15 | até 3 | Relatórios avançados, suporte prioritário, multiunidade |

**Modelo de cobrança de mensagens:** o hotel paga os custos de mensagens WhatsApp **diretamente à Meta**. A assinatura Mais Hóspedes cobre o software, não os envios. Isso deve ser comunicado de forma clara na contratação, no onboarding e na página de preços.

- **Profissional** como plano recomendado/destaque da página de preços; teste grátis de **14 dias** no Profissional.
- Assistência remota opcional de onboarding, preços preliminares de pagamento único: Essencial **R$197**, Profissional **R$297**, Premium **R$497**.
- Self-service e suporte básico sem obrigação de contratar onboarding.
- Teste grátis refere-se ao SaaS; **não pressupor gratuidade dos envios Meta**. Comunicar isso explicitamente.
- Assinatura e autorização de cobrança devem ter condições transparentes, inclusive término do trial.
- **Unidade de consumo = estadia processada**, não número de mensagens nem hóspedes individuais.
- Uma estadia conta uma vez quando o serviço efetivamente começa; cancelada antes de iniciar não conta; atravessar virada de mês não duplica; nova estadia posterior conta novamente.
- Ao alcançar limite: alertar, oferecer upgrade/adicional; **não interromper automações de estadias em andamento**.
- Preço de excedentes/adicionais e comportamento exato de bloqueio de novos cadastros: **a definir**.

## 13. Onboarding self-service
**Fase 1 — Conta e hotel (self-service):**
1. Criar conta e verificar e-mail.
2. Cadastrar estabelecimento, país, fuso e informações básicas.
3. Escolher plano/iniciar trial e aceitar condições.
4. Configurar dados operacionais e canais (Instagram, Google).

**Fase 2 — WhatsApp (self-service + suporte híbrido):**
5. Checklist de pré-requisitos (Meta Business Suite, número disponível, verificação).
6. Conectar número WhatsApp via Embedded Signup integrado.
7. Acompanhar status de verificação e aprovação de templates em tempo real.
8. Se travar: solicitar suporte assistido sem sair do fluxo.
9. Trial de 14 dias não conta tempo de espera da Meta — sandbox disponível.

**Fase 3 — Ativação:**
10. Gerar/baixar QR Code e imprimir.
11. Fazer teste completo com cadastro fictício/sandbox, sem disparos indevidos.
12. Concluir checklist de ativação.

**Princípio:** cada etapa deve explicar erros e permitir retomar sem intervenção humana. Exibir status real da conexão e da aprovação de templates.

## 14. Suporte ao hotel
- Ajuda dentro do produto, documentação e FAQ.
- Chat com IA 24/7 para **responder perguntas somente**; **não** modificar dados, executar ações, alterar cobranças ou conectar contas.
- Escalar para ticket humano quando necessário.
- Atendimento humano remoto em horário comercial; prioridade Premium.
- Superadmin pode manter artigos e respostas de ajuda.
- Evitar depender de WhatsApp de suporte como canal padrão.

## 15. Privacidade, LGPD e retenção de dados
### Base legal
- **Consentimento explícito** (LGPD art. 7°, I) como base legal para envio de mensagens WhatsApp.
- Checkbox obrigatório no formulário QR: "Aceito receber mensagens pelo WhatsApp sobre minha estadia."
- Registro de consentimento vinculado ao cadastro do hóspede, com timestamp e IP.
- Sem consentimento marcado = formulário não é enviado e nenhuma mensagem é disparada.

### Retenção de dados
- Dados de hóspedes são retidos por **6 meses** após a data de checkout.
- Após 6 meses: exclusão automática de PII (nome, WhatsApp, e-mail). Dados agregados/anonimizados (notas de satisfação, contagens) podem ser mantidos para métricas.
- Job de limpeza periódico (semanal ou mensal) para exclusão de dados expirados.

### Direitos do titular
- Hóspede pode solicitar exclusão de seus dados a qualquer momento via opt-out na conversa WhatsApp ou contato direto.
- Hotel é o **controlador** dos dados de seus hóspedes; Mais Hóspedes é **operadora**.
- Contrato de processamento de dados (DPA) obrigatório entre Mais Hóspedes e cada hotel — incluído nos termos de serviço.
- Revisão jurídica antes do lançamento para Brasil e Paraguai.

### Opt-out
- Hóspede que responder "SAIR" ou equivalente em qualquer idioma → bloquear todas as automações futuras para aquele número naquele hotel.
- Registrar opt-out com timestamp; respeitar em cadastros futuros do mesmo número.

## 16. Arquitetura técnica recomendada (não decisão irrevogável)
**Stack candidata:** Next.js + TypeScript; PostgreSQL/Supabase; Supabase Realtime; funções/API backend; filas/agendador confiável para automações; hospedagem gerenciada com observabilidade.

**Componentes lógicos:**
1. `public-registration`: formulário público QR, rate limiting por IP/dispositivo, captcha adaptativo, validação, idempotência, registro de consentimento.
2. `tenant-auth`: autenticação, RBAC, convites e escopo de hotéis.
3. `stay-service`: ciclo de vida da estadia e auditoria.
4. `notification-service`: eventos em tempo real para recepção, alerta visual/sonoro.
5. `automation-engine`: máquina de estados, jobs atrasados, deduplicação, cancelamento/reagendamento.
6. `whatsapp-adapter`: configuração por hotel, templates multilíngue (PT/ES/EN), webhooks de status/respostas, consentimento/opt-out.
7. `review-service`: satisfação 0–10 e convite Google na mesma mensagem para todos.
8. `billing-metering`: contagem de estadias e limites de plano.
9. `analytics`: agregações, dashboards, exportações.
10. `support`: artigos, IA restrita a consulta, tickets.
11. `data-retention`: job de limpeza periódica de PII após 6 meses, anonimização de métricas.
12. `superadmin`: gestão de hotéis, monitoramento, auditoria, conteúdo de ajuda, suporte.

**Entidades candidatas:**
- `organizations` (conta do cliente), `hotels`, `hotel_memberships`, `users`, `roles`
- `hotel_public_links` (QR/token opaco), `guest_profiles`, `registrations`, `stays`
- `stay_events`/`audit_logs`, `hotel_settings`, `hotel_contact_channels`
- `whatsapp_accounts`, `message_templates`, `automation_definitions`, `automation_runs`, `outbound_messages`, `inbound_messages`
- `satisfaction_responses`, `review_invites`, `click_events`
- `subscriptions`, `plans`, `usage_counters`, `invoices`, `support_tickets`
- `consent_records` (registro de consentimento por hóspede/hotel)
- `opt_out_records` (registro de opt-out por número/hotel)
- `admin_audit_logs` (ações do superadmin)

**Chaves e segurança:**
- `hotel_id` obrigatório nas entidades por estabelecimento; políticas de acesso no servidor e, quando aplicável, Row Level Security.
- URL pública do QR permite **criar** cadastro limitado, nunca listar hóspedes.
- Webhooks Meta autenticados/verificados; segredos criptografados; credenciais fora do frontend.
- Logs de alteração e trilha de auditoria, inclusive confirmação, bloqueio, checkout e envios.
- LGPD e legislação paraguaia aplicável: consentimento explícito, transparência, retenção de 6 meses, exclusão automática, direitos dos titulares e DPA obrigatório.
- Restringir PII nos logs e no painel de suporte.
- Backups e teste de restauração; monitoramento de filas e falhas.

## 17. Contratos de eventos e regras de automação
**Eventos internos:**
- `registration.created` → persistir, registrar consentimento e notificar recepção; agendar boas-vindas +50 s.
- `registration.blocked` → cancelar boas-vindas pendente.
- `welcome.due` → checar elegibilidade, consentimento registrado, bloqueio e idempotência antes de enviar.
- `stay.confirmed` → ativar mensagem informativa de check-in.
- `stay.dates_updated` → recalcular jobs futuros.
- `stay.completed` → enviar **imediatamente** mensagem com pesquisa 0–10 + link Google.
- `satisfaction.received` → registrar nota; fluxo já concluído (link Google foi na mesma mensagem).
- `whatsapp.delivery_updated` → atualizar status técnico.
- `review_link.clicked` → registrar clique, sem inferir avaliação publicada.
- `opt_out.received` → registrar opt-out, cancelar todas as automações pendentes para aquele número/hotel.
- `data_retention.check` → job periódico para excluir PII com mais de 6 meses.

**Regra de robustez:** processamento *at least once* com chaves de idempotência; não pressupor entrega exatamente uma vez por transportes externos. Jobs devem sobreviver a reinícios e indisponibilidades temporárias.

## 18. Fluxo de ponta a ponta — caso feliz
1. Hotel cria conta, assina/testa, conecta WhatsApp (com suporte se necessário) e preenche informações.
2. Sistema cria QR Code permanente.
3. Hóspede chega e escaneia o código.
4. Escolhe português, espanhol ou inglês; conclui três etapas; marca consentimento.
5. Servidor grava registro e consentimento; tela final Mais Hóspedes apresenta sucesso e links opcionais do hotel.
6. Recepção vê cadastro imediatamente, com alerta vermelho, som curto e contador de 50 s.
7. Se não bloqueado, com consentimento e apto, sistema envia **apenas boas-vindas neutras** ao fim dos 50 s (qualquer horário).
8. Recepção confirma estadia e datas; sistema envia mensagem de check-in com informações úteis.
9. Durante estadia, contato opcional se ativado.
10. Recepção clica **"Finalizar estadia"**.
11. WhatsApp do hotel envia **imediatamente** mensagem com pesquisa de nota 0–10 **e link do Google** juntos.
12. Se hóspede responde nota, é salva no painel. Se não responde, link do Google já foi entregue.
13. Proprietário/gerente acompanha resultados e uso do plano.
14. Após 6 meses do checkout, PII do hóspede é excluída automaticamente.

## 19. Casos de erro e critérios de aceite
- **Duplo envio do formulário:** apenas um registro por idempotência.
- **QR de hotel A:** jamais criar/mostrar cadastro no hotel B.
- **Internet do hóspede cai:** não mostrar sucesso falso; permitir tentar de novo. Feedback visual de "sem conexão" e timeout configurável.
- **Internet da recepção cai:** sincronizar cadastros pendentes ao reconectar.
- **Número inválido:** informar erro no formulário; não tentar envio.
- **Consentimento não marcado:** formulário não permite envio; nenhuma mensagem é agendada.
- **Cadastro bloqueado antes dos 50 s:** não enviar boas-vindas.
- **Cadastro sem estadia confirmada:** não enviar check-in, mensagem de estadia ou checkout.
- **Checkout duplicado:** uma pesquisa por conclusão de estadia.
- **Nota 0 e nota 10:** ambas já receberam link Google na mesma mensagem.
- **Hóspede não responde nota:** link Google já foi enviado — objetivo cumprido.
- **Hotel sem Instagram:** botão Instagram não aparece.
- **Hotel sem WhatsApp de contato:** botão de salvar contato não aparece.
- **Template Meta não aprovado:** status claro e nenhum envio indevido.
- **Estadia estendida:** mensagens futuras reagendadas corretamente.
- **Virada do mês:** mesma estadia não é cobrada duas vezes.
- **Usuário recepcionista:** não acessa cobrança ou hotéis não autorizados.
- **Hóspede recusa mensagens / opt-out:** bloquear automações não permitidas; registrar opt-out.
- **Falha no provedor:** retry controlado, deduplicação e indicação de falha no painel.
- **Dados com mais de 6 meses:** PII excluída automaticamente; métricas anonimizadas mantidas.

## 20. Decisões fechadas
- Empresa e marca Mais Hóspedes; SaaS independente, Brasil primeiro, Paraguai depois.
- Operação remota, onboarding autônomo, sem PMS ou integração local V1.
- QR Code permanente único por hotel; uso **somente na chegada** V1.
- Formulário curto, três etapas, **três idiomas** (PT, ES, EN) escolhidos por bandeiras e nomes.
- Campos obrigatórios: nome, WhatsApp, datas de entrada/saída, consentimento (checkbox).
- **Consentimento explícito** como base legal para envio de mensagens (LGPD).
- Mensagem inicial padronizada e não editável pelo hotel.
- Tela final **somente marca Mais Hóspedes**, com Instagram e salvar WhatsApp do hotel.
- Painel da recepção em tempo real; alerta vermelho e som curto.
- Contador de 50 s para **primeira mensagem neutra apenas**; **dispara 24h, sem restrição de horário**.
- Confirmação de hospedagem separada; recepção encerra estadia manualmente.
- WhatsApp em nome/número do hotel; **hotel paga custos Meta separadamente**.
- Check-in informativo e checkout com satisfação 0–10 **dentro do WhatsApp**.
- Pesquisa de satisfação + link Google **na mesma mensagem**, enviada **imediatamente** após "Finalizar estadia".
- Convite Google **para todos**, sem filtrar nota, sem depender de resposta.
- Recepcionista na operação; gerente/proprietário no dashboard.
- Proprietário como contato comercial inicial.
- Fluxos prontos com textos editáveis nos três idiomas, sem editor visual.
- Onboarding WhatsApp **híbrido**: self-service + suporte sob demanda.
- Retenção de dados: **6 meses** após checkout; exclusão automática de PII.
- Superadmin **completo** na V1: hotéis, métricas, auditoria, suporte, artigos de ajuda.
- Preços confirmados: Essencial R$97, Profissional R$197, Premium R$347.

## 21. Pendências remanescentes (não tratar como aprovadas)
1. Como simplificar confirmação da estadia pela recepção e como prevenir cadastros falsos.
2. Regra de lembrete se hóspede não responder à nota de satisfação (não bloqueia lançamento — link Google já foi enviado).
3. Aprovação, limitações e experiência real de Embedded Signup da Meta; templates iniciais a submeter.
4. Acesso viável à API Google Business Profile e dados de reputação.
5. Preço de excedentes/adicionais e comportamento exato de bloqueio de novos cadastros ao atingir limite.
6. Design visual final, textos definitivos e testes de usabilidade.
7. Estratégia de disponibilidade, monitoramento, backups e metas de performance.
8. Recursos exatos do suporte IA e política de escalonamento.
9. Legislação paraguaia específica sobre proteção de dados e comunicação comercial.

## 22. Ordem de implementação sugerida para Claude Code
**Fase 0 — fundações:** repositório, autenticação, banco, migrations, tenants, RBAC, testes de isolamento, logging seguro.  
**Fase 1 — QR e cadastro:** URLs permanentes, formulário trilíngue com consentimento, validação, tela final, painel e Realtime, alerta vermelho/som.  
**Fase 2 — estadias:** confirmação, edição de datas, finalização, trilha de auditoria.  
**Fase 3 — automações:** jobs persistentes +50 s, WhatsApp oficial, templates trilíngues, webhooks, mensagem de check-in e pesquisa 0–10 + Google na mesma mensagem.  
**Fase 4 — comercial:** planos, trial 14 dias, cobrança, limites de estadias, onboarding self-service + WhatsApp híbrido.  
**Fase 5 — métricas e suporte:** dashboards, relatórios, integração Google se viável, FAQ/IA de suporte, tickets.  
**Fase 6 — superadmin:** painel completo de gestão, monitoramento, auditoria, conteúdo de ajuda.  
**Fase 7 — privacidade:** job de retenção de dados (6 meses), exclusão automática de PII, opt-out, DPA nos termos.  
**Fase 8 — validação piloto:** hotéis reais, métricas de tempo de cadastro, taxa de conclusão, erros, custo por estadia e volume de suporte.

### Prompt inicial sugerido para Claude Code
> Leia integralmente `Mais_Hospedes_Especificacao_Produto_v2.md`. Antes de escrever código, faça uma auditoria do repositório existente e produza: (1) matriz de funcionalidades implementadas, parciais e ausentes; (2) proposta de arquitetura alinhada ao documento; (3) schema de dados com isolamento multi-tenant, incluindo consent_records, opt_out_records e admin_audit_logs; (4) plano de implementação em etapas pequenas com testes e critérios de aceite; (5) dúvidas bloqueadoras. Não presuma que decisões marcadas como "pendentes" estão aprovadas. Não integre PMS. Priorize a segurança, a idempotência de envios, o consentimento explícito, a retenção de 6 meses, a atualização em tempo real e a simplicidade da recepção. Só implemente após apresentar o plano.

---
**Nota:** preços, textos de exemplo, stack, tempos de resposta e capacidades de integrações são propostas ou hipóteses quando assim identificados. Antes de lançar, verificar termos atuais da Meta, regras do Google, requisitos de privacidade e custos reais.

---
**Changelog v1 → v2:**
- Preços confirmados: R$97 / R$197 / R$347.
- Modelo de custo Meta decidido: hotel paga separado.
- Idiomas expandidos: PT + ES + EN (três idiomas no formulário e mensagens).
- Campos do formulário fechados: nome + WhatsApp obrigatórios + datas obrigatórias + consentimento obrigatório.
- Consentimento explícito como base legal LGPD (checkbox obrigatório).
- Fluxo D refeito: pesquisa de satisfação + link Google na mesma mensagem, envio imediato.
- Regra dos 50s: dispara 24h, sem restrição de horário.
- Tela final: confirmada somente marca Mais Hóspedes.
- Onboarding WhatsApp: modelo híbrido (self-service + suporte).
- Retenção de dados: 6 meses após checkout, exclusão automática de PII.
- Superadmin detalhado: gestão completa (hotéis, auditoria, suporte, conteúdo, métricas).
- Nova seção 15: Privacidade, LGPD e retenção de dados.
- Novas entidades: consent_records, opt_out_records, admin_audit_logs, data-retention service.
- Pendências reduzidas de 12 para 9 (3 resolvidas pelo questionário).
