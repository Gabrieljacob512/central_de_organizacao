# Tecno System — Central Unificada de Service Desk

![React 19](https://img.shields.io/badge/React-19.3-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9_Strict-3178c6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_17-3ecf8e?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38bdf8?style=flat-square&logo=tailwindcss)
![PWA Ready](https://img.shields.io/badge/PWA-Installable-blueviolet?style=flat-square)
![Tests](https://img.shields.io/badge/Acceptance_Tests-24%2F24_Passing-success?style=flat-square)

Plataforma corporativa de atendimento, suporte técnico e gestão de demandas da **Tecno System**, empresa júnior universitária. O sistema conta com arquitetura Serverless sobre Supabase (PostgreSQL 17 com RLS ativo), interface mobile-first responsiva com tema claro/escuro sem flash, hierarquia RBAC rigorosa com isolamento setorial nos 4 departamentos oficiais (**Financeiro**, **RH**, **Marketing** e **Projetos**), visualização unificada de chamados em Lista e Kanban, página dedicada "Meus Chamados", Painel Executivo com Recharts, central de Configurações do colaborador e upload atômico de anexos com captura de prints via Ctrl+V.

---

## 🏛️ Departamentos Oficiais da Empresa Júnior

O sistema opera estritamente com os 4 departamentos oficiais da Tecno System:
- **Financeiro (`FIN`)**: Contas, reembolso, notas fiscais e tesouraria.
- **RH (`RH`)**: Recrutamento, seleção, feedback, clima e gestão de pessoas.
- **Marketing (`MKT`)**: Identidade visual, mídias sociais, comunicação e branding.
- **Projetos (`PRJ`)**: Desenvolvimento, consultoria técnica, engenharia e entregas a clientes.

> [!NOTE]
> Departamentos legados (`TI` e `Operações`) foram formalmente descontinuados e migrados para **Projetos** e **Marketing**.

---

## 📱 Menu Lateral Retrátil (Mobile First)

A barra lateral deslizante (Slide Drawer) segue rigorosamente a ordem oficial de 10 itens:

1. **Perfil do Usuário**: Foto de perfil (ou iniciais), nome completo, e-mail institucional e badges de cargo/departamento.
2. **Visão Geral das Solicitações**: Painel inicial enxuto com resumo da fila operacional, chamados recentes e atalhos rápidos.
3. **Chamados**: Central unificada com alternância imediata entre visualização em **Lista** e **Quadro Kanban**, preservando busca e filtros compartilhados. No celular, o padrão é Lista.
4. **Meus Chamados**: Página dedicada com abas segmentadas **"Atribuídos a mim"** e **"Abertos por mim"**, contadores em tempo real, badges de prioridade/status, ordenação por SLA e toggle para exibir chamados encerrados.
5. **Painel Executivo & Métricas**: Métricas de atendimento consolidadas (Volume por setor, distribuição por status, MTTR e cumprimento de SLA). O filtro de departamento é de uso exclusivo do Presidente.
6. **Espaço Privado**: Bloco confidencial de anotações e tarefas particulares do colaborador logado.
7. **Calendário**: Calendário corporativo e pessoal com exportação no padrão RFC 5545 (`.ics`).
8. **Auditoria**: Trilha de auditoria imutável (exclusivo para Presidente e Diretores; Membros recebem bloqueio com 403 amigável).
9. **Configurações**: Central do colaborador organizada em 3 abas (**Aparência**, **Perfil** e **Segurança**).
10. **Sair da Conta (Logout)**: Encerramento seguro da sessão JWT ativa via Supabase Auth.

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
```

### 3. Popular o banco de dados oficial (Seed)
```bash
npm run seed
```

### 4. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em `http://localhost:5173/`.

---

## 🧪 Como Rodar os Testes Automatizados

A plataforma conta com suítes completas de testes de aceitação:

```bash
# Executa os 24 testes da evolução recente (Seção 12)
npm run test:evolution

# Executa todas as 7 suítes de testes de aceitação do sistema
npm run test:all

# Validação do build de produção e tipos TypeScript
npm run build
```

---

## 👥 Credenciais Padrão para Testes e Demonstração

| Perfil / Cargo | E-mail | Departamento | Permissões Principais |
| :--- | :--- | :--- | :--- |
| **Presidente (Admin)** | `presidente@gmail.com` | Projetos | Visão irrestrita global, filtro de departamentos, gestão de colaboradores, auditoria completa |
| **Diretor de RH** | `rh@tecnosystem.com` | RH | Gestão e chamados do setor de RH, cadastro de usuários, auditoria setorial |
| **Diretor de Marketing** | `marketing@tecnosystem.com` | Marketing | Gestão e chamados do setor de Marketing, exclusão de chamados do setor, auditoria setorial |
| **Diretor de Projetos** | `projetos@tecnosystem.com` | Projetos | Gestão de chamados de Projetos, exclusão de chamados do setor, auditoria setorial |
| **Membro (Colaborador)** | `membro@tecnosystem.com` | Projetos | Abertura e acompanhamento de chamados do próprio setor; sem exclusão e sem auditoria |

*Senha inicial padrão: `Presidente@2026` para o Presidente e `Tecno@2026!` para os demais colaboradores.*

---

## 📄 Licença
Desenvolvido com exclusividade para a **Tecno System — Empresa Júnior**. Todos os direitos reservados.
