# Quadro

Kanban da equipe (projetos, tarefas, tags, campos personalizados, agenda, equipe).
SPA em React + Vite + TanStack Router, com Supabase (auth, banco, realtime e storage).

## Rodar localmente

```sh
npm install
cp .env.example .env     # preencha com a URL e a chave publishable do seu Supabase
npm run dev
```

## Configurar o Supabase (uma vez)

1. Crie um projeto gratuito em https://supabase.com.
2. No **SQL Editor**, rode na ordem os arquivos de `supabase/migrations/`
   (`...schema.sql`, `...migration.sql`, `...agenda_events.sql`, `...storage_bucket.sql`).
   Ou use a CLI: `npx supabase link` e `npx supabase db push`.
3. **Authentication → Providers → Email**: DESLIGUE "Confirm email" (obrigatório: o app não envia e-mails).
4. **Authentication → URL Configuration**: coloque a URL do Vercel em *Site URL* e em *Redirect URLs*.
5. **Settings → API**: copie *Project URL* e a chave *publishable* (ou *anon*).

A primeira conta criada vira dona (owner). Os demais entram por convite na tela **Equipe**
(adicione o e-mail da pessoa; ela abre o site, clica em "Criar senha", usa esse e-mail e define a senha. Nenhum e-mail é enviado).

## Deploy no Vercel

1. Suba este projeto para um repositório no GitHub.
2. No Vercel: **Add New → Project**, importe o repositório (o preset Vite é detectado).
3. Em **Environment Variables**, defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. **Deploy**. O `vercel.json` já redireciona todas as rotas para o `index.html`.

## Scripts

`npm run dev` · `npm run build` · `npm test` · `npm run lint`
