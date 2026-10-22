# StockFlow

Controle de estoque (TCC). Backend em `backend/` (Express + Supabase/Postgres) e frontend em `frontend/` (React + Vite).

## Variáveis do backend

Copie `backend/.env.example` para `backend/.env` e preencha.

### Recuperação de senha (e-mail)

O código de recuperação é enviado pelo [Resend](https://resend.com):

- `RESEND_API_KEY`: chave da API do Resend. Sem ela, a recuperação responde que o envio não está disponível.
- `EMAIL_FROM`: remetente. Sem domínio verificado, use `onboarding@resend.dev`.

**Limite do Resend sem domínio verificado:** o e-mail só é entregue ao endereço da própria conta Resend. Para enviar a outros destinatários é preciso verificar um domínio no painel do Resend.
