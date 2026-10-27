# Tecno System — Central Unificada de Service Desk

![React 19](https://img.shields.io/badge/React-19.3-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9_Strict-3178c6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_17-3ecf8e?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38bdf8?style=flat-square&logo=tailwindcss)
![PWA Ready](https://img.shields.io/badge/PWA-Installable-blueviolet?style=flat-square)
![Tests](https://img.shields.io/badge/Acceptance_Tests-39%2F39_Passing-success?style=flat-square)

Plataforma corporativa de atendimento, suporte técnico, gestão de demandas, gestão de pessoas e controladoria financeira da **Tecno System**, empresa júnior universitária. O sistema conta com arquitetura Serverless sobre Supabase (PostgreSQL 17 com RLS ativo), interface mobile-first responsiva com tema claro/escuro sem flash, hierarquia RBAC rigorosa (Presidente > Vice-presidente > Diretor > Membro) com isolamento setorial e suporte a múltiplos departamentos (`department_memberships`), visualização unificada de chamados em Lista e Kanban, página dedicada "Meus Chamados", módulo de Pessoas (RH), módulo Financeiro com fechamento contábil e gráficos Recharts no Painel Executivo.

---

## 🏛️ Estrutura Organizacional e Departamentos

O sistema opera com um departamento executivo transversal e 4 departamentos operacionais:
- **Administração (`ADM`)**: Departamento executivo (`is_executive_department = true`) ao qual pertencem o Presidente e o Vice-presidente.
- **Financeiro (`FIN`)**: Contas, receitas, despesas, conciliação e projetos com anexos auditados.
- **RH (`RH`)**: Recrutamento, seleção, controle de colaboradores e monitoramento de atividade nos chamados via RPC segura.
- **Marketing (`MKT`)**: Identidade visual, mídias sociais, comunicação e branding.
- **Projetos (`PRJ`)**: Desenvolvimento, consultoria técnica, engenharia e entregas a clientes.

### Hierarquia de Acesso (RBAC)
1. **Presidente**: Acesso executivo global irrestrito; visualiza e filtra todos os departamentos; gerencia todos os colaboradores; não pode ser inativado se for o último ativo (protegido por trigger `trg_ensure_active_president`).
2. **Vice-presidente**: Pertence à Administração e atua como Diretor de um departamento operacional; possui prerrogativas executivas globais equivalentes ao Presidente.
3. **Diretores**: Gerenciam seu respectivo departamento, coordenam membros e possuem acesso à auditoria setorial.
4. **Membros**: Criam e atendem chamados de seus departamentos vinculados (`department_memberships`).

---

## 📱 Menu Lateral Retrátil (13 Itens Obrigatórios)

A barra lateral deslizante (Slide Drawer) segue rigorosamente a ordem oficial de 13 itens:

1. **Perfil do Usuário**: Avatar circular (40px) com iniciais/foto, nome completo, e-mail institucional e subtítulo oficial (`Presidente · Administração` ou `Vice-presidente · Administração e Diretor de [Depto]`).
2. **Visão Geral das Solicitações**: Painel inicial enxuto com resumo da fila operacional, chamados recentes e atalhos rápidos.
3. **Chamados**: Central unificada com alternância imediata entre visualização em **Lista** e **Quadro Kanban**, preservando busca e filtros compartilhados. No celular, o padrão é Lista.
4. **Meus Chamados**: Página dedicada com abas segmentadas **"Atribuídos a mim"** e **"Abertos por mim"**, contadores em tempo real, badges de prioridade/status e ordenação por SLA.
5. **Notificações**: Central dedicada com contador dinâmico e indicador vermelho de não lidas sincronizado via Realtime.
6. **Painel Executivo & Métricas**: Métricas de atendimento e seção financeira executiva com 4 gráficos Recharts. O seletor global "Todos os departamentos" é exclusivo dos executivos.
7. **Pessoas**: Gestão de colaboradores internos (RH), controle de ativação/inativação e relatório agregado de atividade dos atendentes via RPC `hr_responders_stats`.
8. **Financeiro**: Módulo contábil mensal com entradas, saídas, saldo em centavos inteiros, projetos com anexos e fechamento auditado.
9. **Espaço Privado**: Bloco confidencial de anotações e tarefas particulares do colaborador logado.
10. **Calendário**: Calendário corporativo e pessoal com exportação no padrão RFC 5545 (`.ics`).
11. **Auditoria**: Trilha de auditoria imutável (exclusivo para Presidente, Vice-presidente e Diretores).
12. **Configurações**: Central do colaborador organizada em 3 abas (**Aparência**, **Perfil** e **Segurança**).
13. **Sair da Conta (Logout)**: Encerramento seguro da sessão JWT ativa via Supabase Auth.

---

## ⚙️ Módulo de Configurações (3 Abas)

- **Aba Aparência**:
  - Seleção de tema: **Claro** ou **Escuro**.
  - Script síncrono no `<head>` do `index.html` garantindo zero flash de tema no carregamento.
  - Sincronização automática com `profiles.theme` no PostgreSQL e cache local.
- **Aba Perfil**:
  - Alteração de nome (mínimo 2, máximo 80 caracteres).
  - Alteração de e-mail institucional com estado pendente de confirmação via Supabase Auth.
  - Seletor de departamento bloqueado para membros e diretores; alteração permitida apenas para o Presidente e protegida por trigger no banco.
  - Upload de foto de perfil no bucket `avatars`: limite estrito de 1 MB, validação de formato e cabeçalho binário (*magic bytes*), preview circular e remoção pelo titular.
- **Aba Segurança**:
  - Exigência de reautenticação com a senha atual antes de permitir alteração.
  - Nova senha com validação de complexidade (mínimo 8 caracteres, contendo letras e números).
  - Indicador dinâmico de força da senha e alternância de visibilidade (olho).
  - Proteção contra força bruta: bloqueio automático temporário após 5 tentativas incorretas.
  - Remoção automática da flag `must_change_password` após a troca bem-sucedida.

---

## 📎 Anexos na Criação do Chamado (Fluxo Atômico em 2 Fases)

O formulário de abertura de chamados conta com área de anexos localizada diretamente abaixo da descrição:
- **Limite por arquivo**: 1 MB (1.048.576 bytes).
- **Limite por chamado**: até 5 arquivos simultâneos.
- **Formatos aceitos**: `.png`, `.jpg`, `.jpeg`, `.pdf`, `.txt`, `.docx`, `.xlsx`.
- **Bloqueio explícito de executáveis**: rejeição automática de `.exe`, `.bat`, `.cmd`, `.sh`, `.msi`, etc.
- **Interatividade**: Área de drag-and-drop, clique para selecionar e captura direta de prints colados via **Ctrl+V** (*paste* da área de transferência).
- **Submissão em duas fases**:
  1. O chamado é inserido e validado primeiro no banco de dados, gerando o identificador `ticket.id`.
  2. Os arquivos são transmitidos individualmente vinculados ao `ticket.id` com barra de progresso.
  3. Caso algum arquivo falhe, o chamado permanece íntegro e um botão de reenvio (*retry*) permite reenviar apenas os arquivos que falharam, sem criar registros órfãos.

---

## 🛠️ Stack Tecnológica

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend & Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL 17, GoTrue Auth, Storage S3 com buckets `ticket-attachments` e `avatars`)
- **Visualização de Dados**: [Recharts 3](https://recharts.org/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Validação de Schemas**: [Zod 4](https://zod.dev/)
- **Testes Automatizados**: [TSX](https://github.com/privatenumber/tsx) executando suítes completas de aceitação

---

## 🚀 Como Rodar Localmente

### 1. Clonar e instalar dependências
```bash
git clone https://github.com/tecnosystem/tecnosystem-service-desk.git
cd tecnosystem-service-desk
npm install
```

### 2. Configurar o ambiente (.env)
Certifique-se de que o arquivo `.env` contenha as credenciais do Supabase local:
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
SEED_PRESIDENT_PASSWORD=Presidente@2026
SEED_DEFAULT_PASSWORD=defina_uma_senha_forte_aqui
```
Confira se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são idênticas a `API_URL` e `ANON_KEY` de `npx supabase status -o env`.

### 3. Popular o banco de dados oficial (Seed)
```bash
npm run seed
```

### 4. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em `http://localhost:5173/`.

### 5. Recriar/corrigir os usuários de demonstração (somente DEV)
```bash
npm run dev:reset-users
```
O script [`scripts/reset-dev-users.ts`](scripts/reset-dev-users.ts) usa a `SUPABASE_SERVICE_ROLE_KEY` para:
1. Criar (`createUser`) ou atualizar (`updateUserById`) todos os usuários de demonstração com `email_confirm: true` e a senha de `SEED_DEFAULT_PASSWORD`;
2. Criar ou corrigir a linha em `profiles` com o **mesmo ID do Auth**, cargo e departamento principal;
3. Ajustar `department_memberships` (Presidente → Administração; Vice-presidente → Administração + Projetos como diretor; Diretores e Membros → seu departamento);
4. Testar `signInWithPassword` + leitura do próprio perfil para cada usuário e imprimir uma tabela com e-mail, senha e resultado.

> Proteções: o script se recusa a rodar se `NODE_ENV=production` ou se `VITE_SUPABASE_URL` não apontar para `localhost`/`127.0.0.1`.

Usuários criados direto no Auth também recebem perfil automaticamente pelo trigger `on_auth_user_created` (migration `20261027000007`).

Em modo dev, falhas de login exibem no console do navegador o erro real do Supabase (`[authService:signInWithPassword]` / `[authService:profiles.select]` com código, status e mensagem). O usuário final continua vendo só a mensagem genérica.

---

## 🧪 Como Rodar os Testes Automatizados

A plataforma conta com suítes completas de testes de aceitação:

```bash
# Executa os 39 testes de aceitação da hierarquia, Vice-presidente e novos módulos
npm run test:vice-president

# Executa os 24 testes da evolução anterior (Seção 12)
npm run test:evolution

# Executa todas as 8 suítes de testes de aceitação do sistema
npm run test:all

# Validação do build de produção e tipos TypeScript
npm run build
```

---

## 👥 Credenciais Padrão para Testes e Demonstração

| Perfil / Cargo | E-mail | Departamento | Permissões Principais |
| :--- | :--- | :--- | :--- |
| **Presidente** | `presidente@gmail.com` | Administração | Visão irrestrita global, filtro de departamentos, gestão de colaboradores, auditoria completa, fechamento contábil |
| **Vice-presidente** | `vicepresidente@tecnosystem.com` | Administração & Projetos | Acesso executivo global irrestrito, liderança em Projetos, auditoria, módulo Pessoas e Financeiro |
| **Diretor de RH** | `rh@tecnosystem.com` | RH | Gestão e chamados do setor de RH, cadastro de usuários, visualização de atividade (`people.view_activity`) |
| **Diretor Financeiro** | `financeiro@tecnosystem.com` | Financeiro | Gestão financeira, lançamento de entradas/saídas, conciliação e fechamento contábil mensal |
| **Diretor de Marketing** | `marketing@tecnosystem.com` | Marketing | Gestão e chamados do setor de Marketing, exclusão de chamados do setor, auditoria setorial |
| **Diretor de Projetos** | `projetos@tecnosystem.com` | Projetos | Gestão de chamados de Projetos, exclusão de chamados do setor, auditoria setorial |
| **Membro (Colaborador)** | `mariana.souza@tecnosystem.com.br` | Projetos | Abertura e acompanhamento de chamados do próprio setor; sem exclusão e sem auditoria |

*Todos os usuários de demonstração usam a senha definida em `SEED_DEFAULT_PASSWORD` (aplicada por `npm run dev:reset-users` e `npm run seed`). Os botões de acesso rápido da tela de login (somente em DEV) preenchem apenas o e-mail.*

---

## 📄 Licença
Desenvolvido com exclusividade para a **Tecno System — Empresa Júnior**. Todos os direitos reservados.
