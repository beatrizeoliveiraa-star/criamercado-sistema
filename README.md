# CRIAMERCADO · sistema

Substitui o Notion da CRIAMERCADO: clientes, leads, propostas, projetos, pedidos a fornecedores e entregas.
App web que também instala no celular, com a identidade do Guia de Uso da Marca (verde #009E3D, LOOS NORMAL nos títulos, Roboto Slab nos textos). Projeto completo: [Sistema CRIAMERCADO: projeto](https://claude.ai/code/artifact/384317c5-aaa0-40d7-ab68-731cc0b222f5).

## Fase 1 (esta versão)

- Login e papéis (Administração, Comercial, Projetos, Compras, Instalação), com as permissões no próprio banco.
- Painel, Leads (quadro por status), Não fechados, Clientes, Novo lead e a ficha de cada projeto com etapas,
  pedidos e histórico de mudanças.
- Importação do Notion (`scripts/notion`): LEADS, Calendário, Compromissos do Wander e EM ANDAMENTO.
- Sem Supabase configurado, o app abre em **modo demonstração** com clientes fictícios.

## Página da Superminas (call de diagnóstico + cupom)

- **Cliente:** `/superminas` (ex.: `https://SEU-SITE/superminas?origem=superminas-folder`). Página em HTML puro com as
  3 etapas (empresa, contato, dia e horário). Ao confirmar, a call é gravada e o cupom `SUPERMINAS10-XXXX` aparece na hora,
  com botões para a agenda do celular e o Google Agenda. Um cupom por CNPJ; ninguém marca um horário já ocupado.
- **Equipe:** menu **Superminas** (comercial e administração): calls do dia e próximas, busca, planilha (CSV) e a ficha de
  cada cliente com os materiais recebidos (faturamento por setor, setores, vídeo), o link da videochamada e as mensagens
  prontas (confirmação, lembrete, pedir materiais) para **WhatsApp** e **e-mail**. Cada envio fica registrado.
- **Agenda:** horários, dias da semana, feriados bloqueados, prazo do cupom e link padrão da call ficam na tabela
  `agenda_config` (Supabase → Table Editor).
- **E-mail pelo sistema** (opcional; sem isso o botão "Abrir no meu e-mail" usa o e-mail do computador):
  crie uma conta no [Resend](https://resend.com), valide o domínio criamercado.com.br e rode
  `supabase secrets set RESEND_API_KEY=re_... EMAIL_REMETENTE="CRIAMERCADO <contato@criamercado.com.br>"` e
  `supabase functions deploy enviar-email`.
- **WhatsApp:** o botão abre o WhatsApp (app ou web) com a mensagem pronta para o número do cliente; é só apertar enviar.

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
2. Rode os arquivos de `supabase/migrations/` no SQL Editor, na ordem.
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
