# Tecno System Service Desk — Documentação Formal da API

Este documento especifica a camada de API do Tecno System Service Desk, composta por endpoints **PostgREST**, **Stored Procedures (RPCs)** atômicas no PostgreSQL, **Storage Buckets** e políticas de **Row Level Security (RLS)**.

---

## 1. Padrões e Convenções Gerais

- **Formato de Dados**: `application/json` (ou `multipart/form-data` para envio de arquivos).
- **Autenticação**: Bearer Token JWT do Supabase (`Authorization: Bearer <access_token>`).
- **Segurança de Acesso**: Protegida em 100% das tabelas via **Row Level Security (RLS)** e funções com `SECURITY DEFINER` blindadas contra escalação de privilégios.
- **Idioma das Mensagens**: Estritamente em Português do Brasil (`pt-BR`).
- **Departamentos Oficiais Suportados**: `Financeiro`, `RH`, `Marketing`, `Projetos`.

---

## 2. Remote Procedure Calls (RPCs) Atômicas

### 2.1 `transition_ticket_status`
Altera o status de um chamado de forma atômica, validando a hierarquia RBAC, a máquina de estados permitida, recalculando SLA (pausa em `Pendente` e compensação de tempo), atualizando timestamps, disparando notificações in-app e registrando auditoria.

- **Nome no Banco**: `public.transition_ticket_status`
- **Método HTTP**: `POST /rest/v1/rpc/transition_ticket_status`
- **Cabeçalhos**:
  - `Authorization: Bearer <jwt_usuario>`
  - `Content-Type: application/json`

#### Requisição (Body JSON):
```json
{
  "p_ticket_id": "TS-1001",
  "p_new_status": "Em Andamento"
}
```

#### Respostas:
- **200 OK (Sucesso)**:
```json
{
  "success": true,
  "ticket_id": "TS-1001",
  "previous_status": "Aberto",
  "status": "Em Andamento"
}
```
- **200 OK (Erro de Negócio)**:
```json
{
  "success": false,
  "error": "Transição de status não permitida de Fechado para Aberto"
}
```

---

### 2.2 `assign_ticket_atomic`
Atribui um atendente responsável e/ou redireciona o departamento de destino de um chamado, validando o setor, calculando a carga de trabalho atual do atendente e gerando notificação in-app.

- **Nome no Banco**: `public.assign_ticket_atomic`
- **Método HTTP**: `POST /rest/v1/rpc/assign_ticket_atomic`

#### Requisição (Body JSON):
```json
{
  "p_ticket_id": "TS-1001",
  "p_assignee_id": "b1000000-0000-0000-0000-000000000003",
  "p_assigned_department_id": "d1000000-0000-0000-0000-000000000007"
}
```

#### Respostas:
- **200 OK (Sucesso)**:
```json
{
  "success": true,
  "ticket_id": "TS-1001",
  "assignee_id": "b1000000-0000-0000-0000-000000000003",
  "assigned_department_id": "d1000000-0000-0000-0000-000000000007",
  "assignee_active_tickets": 2
}
```

---

## 3. Gestão de Perfis & Trigger de Departamento

### 3.1 Atualização de Perfil de Usuário
- **Endpoint**: `PATCH /rest/v1/profiles?id=eq.<user_id>`
- **Campos Editáveis pelo Próprio Usuário**: `name`, `theme`, `avatar_url`.
- **Regra de Validação de Nome**: `LENGTH(name) BETWEEN 2 AND 80`.

### 3.2 Bloqueio de Alteração de Departamento (`trg_check_profile_department_change`)
- **Trigger**: `BEFORE UPDATE ON profiles`
- **Comportamento**: Se o valor da coluna `department_id` for alterado e o usuário executor (`auth.uid()`) **não** for Presidente, a operação é sumariamente abortada pelo PostgreSQL com a mensagem:
  > *"Apenas o Presidente possui permissão para alterar o departamento de um colaborador."*

### 3.3 Solicitação de Alteração de E-mail
- **Endpoint Supabase Auth**: `POST /auth/v1/user`
- **Payload**: `{ "email": "novo.email@tecnosystem.com" }`
- **Comportamento**: Envia link de confirmação para o novo e-mail. Enquanto o link não for confirmado pelo usuário, o perfil mantém o e-mail anterior ativo com indicação visual de pendência.

---

## 4. Storage Buckets & Políticas RLS

### 4.1 Bucket `avatars` (Público para Leitura, Restrito para Escrita)
- **Finalidade**: Armazenamento de fotos de perfil dos colaboradores.
- **Configuração do Bucket**: `public: true`, `file_size_limit: 1048576` (1 MB).
- **Formatos Permitidos**: `image/png`, `image/jpeg`, `image/webp`.
- **Validação no Cliente**: Checagem de cabeçalho binário (*magic bytes*) antes do upload.
- **Políticas de Acesso (RLS)**:
  - **SELECT**: Acesso público (`bucket_id = 'avatars'`).
  - **INSERT / UPDATE**: Restrito ao próprio usuário (`bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text`).
  - **DELETE**: Apenas o titular do avatar pode remover sua foto.

### 4.2 Bucket `ticket-attachments` (Privado com Signed URLs)
- **Finalidade**: Anexos de chamados técnicos e arquivos de incidentes.
- **Configuração do Bucket**: `public: false`, `file_size_limit: 1048576` (1 MB).
- **Extensões Bloqueadas**: `.exe`, `.bat`, `.cmd`, `.sh`, `.msi`, `.bin`, `.dll`, `.com`, `.vbs`, `.js`, `.scr`.
- **Download**: Exclusivamente via **Signed URLs** geradas pelo backend com expiração de 1 hora.
- **Políticas de Acesso (RLS)**:
  - Usuários só podem ler anexos de chamados aos quais possuem permissão de leitura pela tabela `tickets`.

---

## 5. Permissões RBAC Registradas

| Permissão | Concedida a | Descrição |
| :--- | :--- | :--- |
| `audit.view` | Presidente, Diretores | Permite visualizar a trilha de auditoria e logs de segurança. |
| `ticket.assign` | Presidente, Diretores | Permite alterar o responsável atribuído e redirecionar chamado de setor. |
| `profile.change_department` | Presidente | Permite modificar o departamento de qualquer colaborador. |
| `ticket.view_all` | Presidente | Visão irrestrita global de todos os chamados da empresa júnior. |
| `user.manage` | Presidente, Diretor de RH | Cadastro e inativação de contas de colaboradores. |
| `ticket.delete` | Presidente, Diretores | Exclusão definitiva de chamados. |
| `ticket.view_own` | Clientes | Acesso estrito exclusivamente aos chamados de sua própria autoria. |
