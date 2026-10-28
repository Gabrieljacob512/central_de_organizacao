# Tecno System — Central Unificada de Service Desk

![React 19](https://img.shields.io/badge/React-19.3-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9_Strict-3178c6?style=flat-square&logo=typescript)
![Storage](https://img.shields.io/badge/Storage-localStorage_%2B_IndexedDB-blue?style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38bdf8?style=flat-square&logo=tailwindcss)
![Status](https://img.shields.io/badge/Modo-Demonstra%C3%A7%C3%A3o_Local-success?style=flat-square)

Plataforma corporativa de atendimento, suporte técnico, gestão de demandas, gestão de pessoas e controladoria financeira da **Tecno System**, empresa júnior universitária.

O sistema opera com persistência 100% no navegador via **LocalStorage** (dados estruturados e coleções com validação Zod) e **IndexedDB** (armazenamento binário de comprovantes, anexos e fotos de perfil no banco `tecno-files`), sem dependência de servidores externos ou banco de dados em nuvem.

> ℹ️ **Nota de Recuperação do Backend (Supabase / PostgreSQL)**:
> Para acessar ou restaurar o backend anterior baseado em Supabase, migrations SQL e Docker, basta alternar para a branch de backup:
> ```bash
> git checkout backup-supabase
> ```

---

## 🏛️ Estrutura Organizacional e Departamentos

O sistema opera com 5 departamentos (1 executivo e 4 operacionais):
- **Administração (`ADM`)**: Departamento executivo ao qual pertencem o Presidente e o Vice-presidente.
- **Financeiro (`FIN`)**: Contas a pagar/receber, conciliação e projetos com anexos auditados.
- **RH (`RH`)**: Gestão de membros, controle de acesso e monitoramento de atividades.
- **Marketing (`MKT`)**: Identidade visual, mídias sociais, comunicação e branding.
- **Projetos (`PRJ`)**: Desenvolvimento, consultoria técnica, engenharia e entregas.

### Hierarquia de Acesso (RBAC)
1. **Presidente**: Acesso executivo global irrestrito; visualiza e filtra todos os departamentos; gerencia todos os colaboradores e auditoria.
2. **Vice-presidente**: Pertence à Administração e atua como Diretor de Projetos; possui prerrogativas executivas globais equivalentes ao Presidente.
3. **Diretor (Financeiro)**: Gerencia o Financeiro (`finance.view`, `finance.manage`, `finance.close_month`), exclui chamados e visualiza auditoria do próprio setor.
4. **Membro (RH)**: Acesso à gestão de pessoas (`people.view_all`, `people.create_member`, `people.edit_members_other_depts`, `people.view_activity`), abertura e atendimento de chamados do seu setor.

---

## 📱 Menu Lateral Retrátil (13 Itens Ordenados)

A barra lateral deslizante segue a ordem oficial dos 13 itens da plataforma:

1. **Perfil do Usuário**: Avatar circular (40px) com iniciais/foto, nome completo, e-mail institucional e subtítulo oficial.
2. **Visão Geral das Solicitações**: Painel inicial enxuto com resumo da fila operacional, chamados recentes e atalhos rápidos.
3. **Chamados**: Central unificada com alternância imediata entre visualização em **Lista** e **Quadro Kanban**.
4. **Meus Chamados**: Página dedicada com abas segmentadas **"Atribuídos a mim"** e **"Abertos por mim"** e contadores dinâmicos.
5. **Notificações**: Central dedicada com contador e bolinha vermelha sincronizada em tempo real (inclusive entre abas do navegador).
6. **Painel Executivo & Métricas**: Métricas de atendimento e seção financeira executiva com 4 gráficos Recharts.
7. **Pessoas**: Gestão de colaboradores internos, controle de ativação/inativação e relatório agregado de atividade dos atendentes.
8. **Financeiro**: Módulo contábil mensal com receitas, despesas, saldo em centavos inteiros, projetos com anexos e fechamento auditado.
9. **Espaço Privado**: Bloco confidencial de anotações e tarefas particulares do colaborador logado.
10. **Calendário**: Calendário corporativo e pessoal com exportação no padrão RFC 5545 (`.ics`).
11. **Auditoria**: Trilha de auditoria append-only imutável (exclusivo para Presidente, Vice-presidente e Diretores).
12. **Configurações**: Central do colaborador organizada em 3 abas (**Aparência**, **Perfil** e **Segurança**).
13. **Sair da Conta (Logout)**: Encerramento da sessão simulada ativa.

---

## 👥 As 4 Contas de Demonstração (Seed Oficial)

| Cargo | E-mail | Senha | Departamento(s) | Prerrogativas |
| :--- | :--- | :--- | :--- | :--- |
| **Presidente** | `presidente@gmail.com` | `presidente123` | Administração | Acesso executivo global irrestrito, todos os módulos, fechamento contábil e auditoria |
| **Vice-presidente** | `vicepresidente@gmail.com` | `vicepresidente123` | Administração & Projetos | Acesso executivo global irrestrito e Diretor de Projetos |
| **Diretor** | `diretor@gmail.com` | `diretor123` | Financeiro | Gestão financeira completa, fechamento contábil mensal, exclusão de chamados do setor |
| **Membro** | `membro@gmail.com` | `membro123` | RH | Gestão de pessoas (módulo RH), criação de membros operacionais, abertura de chamados |

---

## 🚀 Como Rodar Localmente

### 1. Clonar e instalar dependências
```bash
npm install
```

### 2. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em `http://127.0.0.1:5173/`.

### 3. Resetar Dados de Demonstração (Desenvolvimento)
Em ambiente de desenvolvimento (`import.meta.env.DEV`), você pode resetar todo o armazenamento do navegador abrindo o console do DevTools (F12) e executando:
```javascript
window.__resetDemo()
```
Isso recriará o seed limpo com as 4 contas e dados de demonstração coerentes.

---

## 🧪 Como Rodar os Testes

```bash
# Executa os testes unitários e de integração com Vitest
npm test

# Executa as suítes de aceitação do sistema
npm run test:all

# Validação do build de produção e tipos TypeScript
npm run build
```

---

## 📄 Licença
Desenvolvido com exclusividade para a **Tecno System — Empresa Júnior**. Todos os direitos reservados.
