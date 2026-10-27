# Tecno System — Central Unificada de Service Desk

![React 19](https://img.shields.io/badge/React-19.3-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9_Strict-3178c6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_17-3ecf8e?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38bdf8?style=flat-square&logo=tailwindcss)
![PWA Ready](https://img.shields.io/badge/PWA-Installable-blueviolet?style=flat-square)
![Tests](https://img.shields.io/badge/Acceptance_Tests-100%25_Passing-success?style=flat-square)

Plataforma corporativa de gestão de chamados, suporte técnico e acompanhamento de demandas desenvolvida para a **Tecno System**, empresa júnior universitária. O sistema integra visualização tabular e Kanban, controle estrito de SLA por prioridade, comentários e anexos em tempo real, dashboard executivo de métricas com Recharts, central de notificações e diferenciais específicos para o ecossistema MEJ (Movimento Empresa Júnior).

---

## 🚀 Principais Funcionalidades

### 🔐 1. Autenticação, RBAC e Isolamento Setorial
- **Autenticação Segura**: Gerenciada pelo Supabase Auth (GoTrue), com controle de sessão JWT e recuperação de senha.
- **Hierarquia RBAC Granular**:
  - **Presidente (Admin)**: Visão global de todos os chamados, gestão de colaboradores, auditoria e métricas consolidadas.
  - **Diretores**: Gestão operacional e membros do próprio departamento (TI, RH, Financeiro, Operações).
  - **Membros**: Abertura, acompanhamento e atendimento de demandas do seu setor.
  - **Clientes**: Acesso restrito via Portal do Cliente (apenas visualização dos chamados próprios e avaliação de atendimento).
- **Isolamento por RLS (Row Level Security)**: 100% das consultas ao PostgreSQL passam por políticas ativas no banco de dados.

### 📋 2. Gestão de Chamados & SLA Dinâmico
- **Visualização Dupla**: Alterne dinamicamente entre visualização em **Tabela** (com ordenação e filtros avançados) e **Quadro Kanban** interativo.
- **Identificação Automática do Solicitante**: Sessão do colaborador vinculada automaticamente na criação do ticket.
- **SLA Dinâmico e Alertas Visuais**:
  - Prazos definidos por prioridade: **Crítica (4h)**, **Alta (8h)**, **Média (24h)** e **Baixa (72h)**.
  - Badge pulsante quando o prazo estiver a menos de 2 horas do vencimento.
  - Alerta explícito de SLA estourado.
  - Status **Pendente** ativa o modo "Relógio Pausado", congelando o cômputo de SLA.

### 💬 3. Comunicação & Anexos em Tempo Real
- **Comentários Públicos vs. Notas Internas**: Anotações confidenciais visíveis apenas para os atendentes da empresa júnior.
- **Menções Inteligentes (@)**: Notificação instantânea com autocomplete para colaboradores mencionados na discussão.
- **Upload Seguro de Arquivos**: Armazenamento em bucket privado no Supabase Storage (`ticket-attachments`), com download exclusivo via **Signed URLs temporárias**.
- **Validação Binária (Magic Bytes)**: Bloqueia executáveis disfarçados validando assinaturas binárias (PNG, JPEG, PDF) com limite de 1 MB.
- **Edição & Soft Delete**: Histórico com indicação visual de mensagens editadas e exclusão suave rastreável.

### 🔔 4. Central de Notificações In-App
- **Sino com Badge ao Vivo**: Notificações instantâneas via canal WebSocket do Supabase Realtime.
- **Filtros por Categoria**: Menções (@), mudanças de status, novas atribuições, alertas e quebras de SLA.
- **Ações em Lote**: Leitura individual ou botão "Marcar todas como lidas".
- **Painel de Preferências**: O usuário configura quais tipos de evento deseja receber.

### 📊 5. Dashboard Executivo & Métricas
- **Gráficos Reativos com Recharts**:
  - Volume de chamados por Departamento (Gráfico de Barras com tooltips personalizadas).
  - Distribuição percentual por Status (Gráfico de Pizza/Donut).
  - Tempo Médio de Resolução (MTTR) segmentado por prioridade.
  - Taxa de Cumprimento de SLA (Compliance %).
- **Exportação CSV com Delimitador pt-BR**: Arquivo com BOM UTF-8 (`\uFEFF`) para compatibilidade perfeita com Microsoft Excel.
- **Modo de Impressão Executiva**: Estilização dedicada `@media print` para relatórios em PDF.

### 🌟 6. Diferenciais Empresa Júnior
- **Vínculo com Projetos da EJ**: Associação de demandas a projetos de consultoria ativos (ex.: `PRJ-ERP-01`, `PRJ-MKT-02`).
- **Avaliação CSAT (1 a 5 Estrelas)**: Coleta de satisfação do solicitante após a resolução do chamado.
- **Base de Conhecimento & FAQs**: Guias rápidos, tutoriais de acesso e políticas corporativas com busca textual e tags.
- **Reabertura Controlada (Regra dos 7 Dias)**: Solicitantes podem reabrir chamados resolvidos em até 7 dias mediante justificativa formal.
- **Conformidade LGPD**: Anonimização completa de dados pessoais (Direito ao Esquecimento) preservando o histórico operacional.
- **Exportação de Calendário (.ICS)**: Download da agenda de eventos no padrão RFC 5545 compatível com Google Calendar, Outlook e Apple Calendar.
- **PWA Instalável**: Suporte offline básico para shell estático e experiência app nativa.

---

## 🛠️ Stack Tecnológica

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`)
- **Backend & Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL 17, GoTrue Auth, Storage S3, Realtime WebSockets)
- **Visualização de Dados**: [Recharts 3](https://recharts.org/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Validação de Dados**: [Zod 4](https://zod.dev/)
- **Testes de Aceite**: [Vitest](https://vitest.dev/) & [TSX](https://github.com/privatenumber/tsx)

---

## ⚙️ Pré-requisitos

- **Node.js** >= 20.x
- **npm** >= 10.x
- **Docker Desktop** (para execução local do Supabase via CLI)
- **Supabase CLI** (`npm i -g supabase` ou via `npx supabase`)

---

## 📦 Instalação e Execução Local

### 1. Clonar o repositório
```bash
git clone https://github.com/tecnosystem/tecnosystem-service-desk.git
cd tecnosystem-service-desk
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Copie o arquivo de exemplo e ajuste as chaves locais:
```bash
cp .env.example .env
```

Conteúdo padrão para ambiente de desenvolvimento local:
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
VITE_ENABLE_STORAGE=true
VITE_ENABLE_REALTIME=true
VITE_ENABLE_AUDIT_LOGS=true
```

### 4. Iniciar o Supabase Local
```bash
npx supabase start
```
Após a inicialização, o painel do Supabase Studio estará acessível em `http://127.0.0.1:54323` e o Mailpit (emails locais) em `http://127.0.0.1:54324`.

### 5. Executar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em `http://localhost:5173`.

---

## 🔑 Credenciais de Acesso Pré-configuradas (Seed)

| Usuário | E-mail | Departamento | Cargo / Nível |
|---|---|---|---|
| **Presidente** | `presidente@gmail.com` | Diretoria | Presidente (Acesso Global) |
| **Mariana Souza** | `mariana.souza@tecnosystem.com.br` | TI | Diretor de TI |
| **Lucas Mendes** | `lucas.mendes@tecnosystem.com.br` | TI | Membro de TI |
| **Beatriz Lima** | `beatriz.lima@tecnosystem.com.br` | Financeiro | Diretor Financeiro |
| **Rafael Costa** | `rafael.costa@tecnosystem.com.br` | Operações | Diretor de Operações |
| **Juliana Rocha** | `juliana.rocha@tecnosystem.com.br` | RH | Diretor de RH |

> **Nota**: As senhas de desenvolvimento inicial seguem a credencial do seed local (`@TecnoSystem2026!` ou a configurada no onboarding).

---

## 🧪 Suítes de Testes de Aceite Automatizados

O projeto conta com suítes de testes automatizados dedicadas cobrindo 100% dos requisitos de negócio de cada fase:

| Comando | Descrição da Suíte | Cobertura |
|---|---|---|
| `npm run test:phase1` | **Fase 1**: Banco de Dados, RLS, Autenticação e Perfis | 100% |
| `npm run test:phase2` | **Fase 2**: RPCs Atômicas, Magic Bytes e Trilha de Auditoria | 100% (18/18) |
| `npm run test:phase3` | **Fase 3**: Comentários, Notas Internas, Anexos e Menções | 100% (17/17) |
| `npm run test:phase4` | **Fase 4**: Notificações In-App, Leitura e Preferências | 100% (14/14) |
| `npm run test:phase5` | **Fase 5**: Alertas de SLA, Filtro Meus Chamados, MTTR e CSV | 100% (12/12) |
| `npm run test:phase6` | **Fase 6**: Projetos, CSAT, Reabertura, LGPD e Calendário RFC 5545 | 100% (17/17) |
| `npm run test:all` | **Regressão Completa**: Executa todas as 6 suítes sequencialmente | **100%** |

Para verificar a compilação de produção e integridade de tipos:
```bash
npm run build
```

---

## 📁 Estrutura de Diretórios

```
tecnosystem-service-desk/
├── docs/                           # Documentação técnica e de arquitetura
│   ├── API.md                      # Especificação formal da API REST e RPCs
│   └── ARQUITETURA.md              # Diagramas Mermaid, modelo E-R e decisões técnicas
├── public/                         # Assets públicos e manifest PWA
│   ├── manifest.json               # Web App Manifest instalável
│   ├── sw.js                       # Service Worker para cache de shell offline
│   └── logo-tecnosystem.png        # Identidade visual da Tecno System
├── src/
│   ├── components/                 # Componentes React modularizados
│   │   ├── audit/                  # Modal da trilha de auditoria
│   │   ├── auth/                   # Telas de login e recuperação de senha
│   │   ├── calendar/               # Calendário interativo de eventos
│   │   ├── knowledge/              # Base de conhecimento e FAQs
│   │   ├── layout/                 # Cabeçalho e Menu Lateral Drawer
│   │   ├── lgpd/                   # Modal de privacidade e anonimização
│   │   ├── metrics/                # Dashboard executivo Recharts
│   │   ├── notifications/          # Central e preferências de notificações
│   │   ├── tickets/                # Tabela, Kanban, Detalhes, Anexos e CSAT
│   │   └── ui/                     # Badges, modais, formulários e temas
│   ├── hooks/                      # Hooks customizados React
│   ├── services/                   # Camada de serviços e integração Supabase
│   ├── types/                      # Tipagens TypeScript estritas e tipos do banco
│   ├── utils/                      # SLA, RBAC, validações binárias e formatação
│   └── App.tsx                     # Orquestrador central da aplicação
├── supabase/
│   ├── functions/                  # Edge Functions (Deno/TypeScript)
│   ├── migrations/                 # Migrações versionadas do PostgreSQL
│   └── seed.sql                    # Carga inicial de dados para desenvolvimento
└── tests/                          # Suítes de testes de aceite (Fases 1 a 6)
```

---

## 🌐 Deploy em Produção

### 1. Backend no Supabase Cloud
1. Crie um projeto no [Supabase Cloud](https://supabase.com).
2. Execute o deploy das migrações:
   ```bash
   npx supabase link --project-ref <SEU_PROJECT_REF>
   npx supabase db push
   ```
3. Realize o deploy das Edge Functions:
   ```bash
   npx supabase functions deploy
   ```

### 2. Frontend na Vercel ou Netlify
1. Conecte o repositório GitHub ao painel da Vercel/Netlify.
2. Defina as variáveis de ambiente de produção:
   - `VITE_SUPABASE_URL`: URL do projeto no Supabase Cloud.
   - `VITE_SUPABASE_ANON_KEY`: Chave anônima pública de produção.
3. Comando de Build: `npm run build`
4. Diretório de Saída: `dist`

---

## 📄 Licença e Direitos

Projeto desenvolvido com exclusividade para a **Tecno System Empresa Júnior**. Todos os direitos reservados.
