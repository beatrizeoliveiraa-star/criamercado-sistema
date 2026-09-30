# CRIAMERCADO · sistema

Substitui o Notion da CRIAMERCADO: clientes, leads, propostas, projetos, pedidos a fornecedores e entregas.
App web que também instala no celular, com a identidade do Guia de Uso da Marca (verde #009E3D, LOOS NORMAL nos títulos, Roboto Slab nos textos). Projeto completo: [Sistema CRIAMERCADO: projeto](https://claude.ai/code/artifact/384317c5-aaa0-40d7-ab68-731cc0b222f5).

## Fase 1 (esta versão)

- Login e papéis (Administração, Comercial, Projetos, Compras, Instalação), com as permissões no próprio banco.
- Painel, Leads (quadro por status), Não fechados, Clientes, Novo lead e a ficha de cada projeto com etapas,
  pedidos e histórico de mudanças.
- Importação do Notion (`scripts/notion`): LEADS, Calendário, Compromissos do Wander e EM ANDAMENTO.
- Sem Supabase configurado, o app abre em **modo demonstração** com clientes fictícios.

## Rodar

```bash
npm install
npm run dev       # http://localhost:5173 (modo demonstração sem .env.local)
npm test          # testes da conversão do Notion
npm run test:db   # testes de permissão do banco (Postgres local)
npm run build
```

## Ligar o banco (Supabase)

1. Crie um projeto novo no Supabase só para a CRIAMERCADO.
2. Rode `supabase/migrations/20261001000000_init.sql` no SQL Editor.
3. Copie `.env.example` para `.env.local` com a URL e a chave pública do projeto.
4. Crie as contas da equipe em Authentication → Users e dê os papéis no SQL Editor:
   `update public.usuarios set papeis = '{admin}' where email = 'voce@exemplo.com';`

## Importar do Notion

1. Em notion.so/profile/integrations crie uma integração interna e compartilhe a página CRIAMERCADO com ela.
2. No computador (nunca no navegador):

```bash
NOTION_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run importar
```

Pode rodar de novo: cada registro guarda o id do Notion e é atualizado, sem duplicar.
Use `npm run importar -- --simular` para só contar o que seria importado.
