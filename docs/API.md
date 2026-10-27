# Tecno System Service Desk — Documentação Formal da API (Phase 2)

Este documento especifica formalmente a camada de API do Tecno System Service Desk, composta por endpoints **PostgREST**, **Stored Procedures (RPCs)** atômicas no PostgreSQL e **Edge Functions** (Supabase/Deno).

---

## 1. Padrões e Convenções Gerais

- **Formato de Dados**: `application/json` (ou `multipart/form-data` para envio de arquivos).
- **Autenticação**: Bearer Token JWT do Supabase (`Authorization: Bearer <access_token>`).
- **Segurança de Acesso**: Protegida em 100% dos dados via **Row Level Security (RLS)** e funções com `SECURITY DEFINER` protegidas.
- **Idioma das Mensagens**: Estritamente em Português do Brasil (`pt-BR`).

---

## 2. Remote Procedure Calls (RPCs) Atômicas

### 2.1 `transition_ticket_status`
Altera o status de um chamado de forma atômica, validando permissões, máquina de estados, recalculando SLA (pausa e compensação), atualizando timestamps, disparando notificações in-app e registrando auditoria.

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

#### Parâmetros:
| Parâmetro | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `p_ticket_id` | `text` | Sim | Identificador único do chamado (ex: `TS-1001`). |
| `p_new_status` | `text` | Sim | Um dos status válidos: `Aberto`, `Em Andamento`, `Pendente`, `Resolvido`, `Fechado`. |

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
- **401 Unauthorized**: Token de autenticação ausente ou expirado.
- **403 Forbidden**: Usuário não possui permissão para atualizar este chamado.

---

### 2.2 `assign_ticket_atomic`
Atribui um responsável (membro) e/ou redireciona o departamento de um chamado, validando o departamento, calculando a carga de trabalho atual do membro e disparando notificação in-app.

- **Nome no Banco**: `public.assign_ticket_atomic`
- **Método HTTP**: `POST /rest/v1/rpc/assign_ticket_atomic`

#### Requisição (Body JSON):
```json
{
  "p_ticket_id": "TS-1001",
  "p_assignee_id": "b1000000-0000-0000-0000-000000000003",
  "p_assigned_department_id": "d1000000-0000-0000-0000-000000000001"
}
```

#### Respostas:
- **200 OK (Sucesso)**:
```json
{
  "success": true,
  "ticket_id": "TS-1001",
  "assignee_id": "b1000000-0000-0000-0000-000000000003",
  "assigned_department_id": "d1000000-0000-0000-0000-000000000001",
  "assignee_active_tickets": 2
}
```
- **200 OK (Membro não encontrado)**:
```json
{
  "success": false,
  "error": "Membro responsável não encontrado ou inativo."
}
```

---

## 3. Supabase Edge Functions

### 3.1 `invite-user`
Cria com segurança uma conta de usuário no Supabase Auth e o respectivo perfil no banco de dados, atribuindo departamento e cargo, sem expor chaves `service_role` ao cliente frontend.

- **Endpoint**: `POST /functions/v1/invite-user`
- **Permissão Necessária**: `user.manage`

#### Requisição (JSON):
```json
{
  "name": "Mariana Souza",
  "email": "mariana.souza@tecnosystem.org.br",
  "department_id": "d1000000-0000-0000-0000-000000000001",
  "role_id": "b1000000-0000-0000-0000-000000000003",
  "temporary_password": "OpcionalTempPassword123!"
}
```

#### Resposta de Sucesso (`201 Created`):
```json
{
  "success": true,
  "user": {
    "id": "7f8b9c0d-1234-5678-90ab-cdef01234567",
    "name": "Mariana Souza",
    "email": "mariana.souza@tecnosystem.org.br",
    "department_id": "d1000000-0000-0000-0000-000000000001",
    "role_id": "b1000000-0000-0000-0000-000000000003",
    "temporary_password": "Tecno@x8y9z!"
  }
}
```

---

### 3.2 `upload-attachment`
Upload rigorosamente validado para o bucket privado `ticket-attachments`. Verifica tamanho máximo (1 MB), tipos MIME permitidos e assinatura binária real (magic bytes).

- **Endpoint**: `POST /functions/v1/upload-attachment`
- **Tipo de Conteúdo**: `multipart/form-data`
- **Campos Form-Data**:
  - `file`: Arquivo binário (máximo 1 MB).
  - `ticket_id`: Identificador do chamado (ex: `TS-1001`).
  - `comment_id`: ID do comentário associado (opcional).
  - `description`: Descrição do anexo (máx 200 caracteres, opcional).

#### Resposta de Sucesso (`201 Created`):
```json
{
  "success": true,
  "attachment": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "ticket_id": "TS-1001",
    "file_name": "relatorio_sprint.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 245760,
    "storage_path": "TS-1001/uuid-relatorio_sprint.pdf"
  },
  "signed_url": "https://127.0.0.1:54321/storage/v1/object/sign/ticket-attachments/..."
}
```

#### Respostas de Erro:
- `400 Bad Request`: `O arquivo excede o limite máximo de 1 MB.`
- `400 Bad Request`: `Tipo de arquivo inválido ou conteúdo inconsistente com o cabeçalho.`

---

### 3.3 `send-notification-email`
Disparo de e-mails transacionais com identidade visual da Tecno System, fallback em texto puro e integração via Resend ou console/Mailpit em desenvolvimento.

- **Endpoint**: `POST /functions/v1/send-notification-email`
- **Requisição (JSON)**:
```json
{
  "to": "diretor.ti@tecnosystem.org.br",
  "subject": "Chamado Atribuído: TS-1001",
  "title": "Você foi atribuído ao chamado TS-1001",
  "message": "O chamado 'Erro ao gerar relatório financeiro' foi atribuído à sua fila de atendimento.",
  "ticketId": "TS-1001",
  "actionUrl": "http://localhost:5173",
  "actionText": "Visualizar Chamado"
}
```

---

### 3.4 `sla-check`
Processo em lote executado a cada 5 minutos pelo agendador de tarefas / cron.
Identifica chamados próximos de vencer (< 2h) ou vencidos, notificando os respectivos responsáveis, diretores de departamento e presidente, de forma idempotente.

- **Endpoint**: `POST /functions/v1/sla-check`
- **Resposta de Sucesso (`200 OK`)**:
```json
{
  "success": true,
  "scanned_tickets": 15,
  "near_breach": 2,
  "breached": 1,
  "timestamp": "2026-10-27T05:00:00.000Z"
}
```

---

## 4. Endpoints PostgREST Utilizados

| Recurso | Método | Rota | Descrição |
| :--- | :--- | :--- | :--- |
| **Tickets** | `GET` | `/rest/v1/tickets?select=*` | Listagem de chamados filtrada por RLS. |
| **Tickets** | `POST` | `/rest/v1/tickets` | Criação de novo chamado com SLA calculado. |
| **Tickets** | `PATCH` | `/rest/v1/tickets?id=eq.TS-1001` | Atualização direta de campos. |
| **Tickets** | `DELETE` | `/rest/v1/tickets?id=eq.TS-1001` | Exclusão de chamado (apenas Presidente/Diretor). |
| **Comentários** | `GET` | `/rest/v1/ticket_comments?ticket_id=eq.TS-1001` | Comentários públicos e notas internas (se autorizado). |
| **Comentários** | `POST` | `/rest/v1/ticket_comments` | Adição de comentário ou nota interna. |
| **Anexos** | `GET` | `/rest/v1/attachments?ticket_id=eq.TS-1001` | Metadados de anexos do chamado. |
| **Notificações** | `GET` | `/rest/v1/notifications?user_id=eq.<uid>` | Notificações in-app do usuário logado. |
| **Notificações** | `PATCH` | `/rest/v1/notifications?id=eq.<id>` | Marcação de notificação como lida (`read: true`). |
| **Auditoria** | `GET` | `/rest/v1/audit_logs?order=created_at.desc` | Histórico imutável de ações no sistema. |
