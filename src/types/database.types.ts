
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "attachments": {
                  Row: {
                    "comment_id": string | null,"created_at": string,"description": string | null,"file_name": string,"id": string,"mime_type": string,"size_bytes": number,"storage_path": string,"ticket_id": string,"uploaded_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment_id"?: string | null,"created_at"?: string,"description"?: string | null,"file_name": string,"id"?: string,"mime_type": string,"size_bytes": number,"storage_path": string,"ticket_id": string,"uploaded_by": string
                  }
                  Update: {
                    "comment_id"?: string | null,"created_at"?: string,"description"?: string | null,"file_name"?: string,"id"?: string,"mime_type"?: string,"size_bytes"?: number,"storage_path"?: string,"ticket_id"?: string,"uploaded_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attachments_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "ticket_comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_ticket_id_fkey"
      columns: ["ticket_id"]
isOneToOne: false
      referencedRelation: "tickets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": string,"id": string,"performed_by": string,"ticket_id": string | null,"ticket_title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details": string,"id"?: string,"performed_by": string,"ticket_id"?: string | null,"ticket_title"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: string,"id"?: string,"performed_by"?: string,"ticket_id"?: string | null,"ticket_title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"calendar_events": {
                  Row: {
                    "category": string,"created_at": string,"created_by_email": string,"created_by_id": string,"created_by_name": string,"date": string,"department_id": string | null,"description": string | null,"id": string,"scope": string,"time": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string,"created_at"?: string,"created_by_email": string,"created_by_id": string,"created_by_name": string,"date": string,"department_id"?: string | null,"description"?: string | null,"id"?: string,"scope": string,"time"?: string | null,"title": string
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"created_by_email"?: string,"created_by_id"?: string,"created_by_name"?: string,"date"?: string,"department_id"?: string | null,"description"?: string | null,"id"?: string,"scope"?: string,"time"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_events_created_by_id_fkey"
      columns: ["created_by_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"departments": {
                  Row: {
                    "code": string,"created_at": string,"email": string | null,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"email"?: string | null,"id"?: string,"name": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notification_preferences": {
                  Row: {
                    "email_enabled": boolean,"id": string,"in_app_enabled": boolean,"notify_mention": boolean,"notify_new_comment": boolean,"notify_sla_breached": boolean,"notify_sla_warning": boolean,"notify_status_change": boolean,"notify_ticket_assigned": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "email_enabled"?: boolean,"id"?: string,"in_app_enabled"?: boolean,"notify_mention"?: boolean,"notify_new_comment"?: boolean,"notify_sla_breached"?: boolean,"notify_sla_warning"?: boolean,"notify_status_change"?: boolean,"notify_ticket_assigned"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "email_enabled"?: boolean,"id"?: string,"in_app_enabled"?: boolean,"notify_mention"?: boolean,"notify_new_comment"?: boolean,"notify_sla_breached"?: boolean,"notify_sla_warning"?: boolean,"notify_status_change"?: boolean,"notify_ticket_assigned"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": string,"link": string | null,"message": string,"read": boolean,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"link"?: string | null,"message": string,"read"?: boolean,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"link"?: string | null,"message"?: string,"read"?: boolean,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"private_notes": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"tasks": NonNullable<Json>,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: string,"created_at"?: string,"id"?: string,"tasks"?: NonNullable<Json>,"title"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"tasks"?: NonNullable<Json>,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "private_notes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"department_id": string | null,"email": string,"id": string,"is_active": boolean,"must_change_password": boolean,"name": string,"role_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"department_id"?: string | null,"email": string,"id": string,"is_active"?: boolean,"must_change_password"?: boolean,"name": string,"role_id": string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"department_id"?: string | null,"email"?: string,"id"?: string,"is_active"?: boolean,"must_change_password"?: boolean,"name"?: string,"role_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"name": string,"permissions": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"permissions"?: (string)[]
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"permissions"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"sla_policies": {
                  Row: {
                    "business_hours_only": boolean,"created_at": string,"id": string,"priority": string,"resolution_hours": number,"response_hours": number
                  }
                  ComputedFields: never
                  Insert: {
                    "business_hours_only"?: boolean,"created_at"?: string,"id"?: string,"priority": string,"resolution_hours": number,"response_hours"?: number
                  }
                  Update: {
                    "business_hours_only"?: boolean,"created_at"?: string,"id"?: string,"priority"?: string,"resolution_hours"?: number,"response_hours"?: number
                  }
                  Relationships: [
                    
                  ]
                },"ticket_comments": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"deleted_at": string | null,"edited_at": string | null,"id": string,"ticket_id": string,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: string,"ticket_id": string,"visibility"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: string,"ticket_id"?: string,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ticket_comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ticket_comments_ticket_id_fkey"
      columns: ["ticket_id"]
isOneToOne: false
      referencedRelation: "tickets"
      referencedColumns: ["id"]
    }
                  ]
                },"tickets": {
                  Row: {
                    "assigned_department_id": string | null,"assignee_id": string | null,"category": string,"closed_at": string | null,"created_at": string,"department_id": string,"description": string,"id": string,"paused_at": string | null,"priority": string,"requester_email": string,"requester_id": string | null,"requester_name": string,"resolved_at": string | null,"sla_due_at": string,"status": string,"title": string,"total_paused_seconds": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_department_id"?: string | null,"assignee_id"?: string | null,"category": string,"closed_at"?: string | null,"created_at"?: string,"department_id": string,"description"?: string,"id"?: string,"paused_at"?: string | null,"priority": string,"requester_email": string,"requester_id"?: string | null,"requester_name": string,"resolved_at"?: string | null,"sla_due_at": string,"status"?: string,"title": string,"total_paused_seconds"?: number,"updated_at"?: string
                  }
                  Update: {
                    "assigned_department_id"?: string | null,"assignee_id"?: string | null,"category"?: string,"closed_at"?: string | null,"created_at"?: string,"department_id"?: string,"description"?: string,"id"?: string,"paused_at"?: string | null,"priority"?: string,"requester_email"?: string,"requester_id"?: string | null,"requester_name"?: string,"resolved_at"?: string | null,"sla_due_at"?: string,"status"?: string,"title"?: string,"total_paused_seconds"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tickets_assigned_department_id_fkey"
      columns: ["assigned_department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tickets_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tickets_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tickets_priority_fkey"
      columns: ["priority"]
isOneToOne: false
      referencedRelation: "sla_policies"
      referencedColumns: ["priority"]
    },{
      foreignKeyName: "tickets_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "assign_ticket_atomic":
{ Args: { "p_assigned_department_id"?: string,"p_assignee_id"?: string,"p_ticket_id": string }; Returns: Json
                           },
"calculate_sla_due_at":
{ Args: { "p_from_time"?: string,"p_priority": string }; Returns: string
                           },
"current_department_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_profile":
{ Args: Record<PropertyKey, never>; Returns: {
              "avatar_url": string | null,
"created_at": string,
"department_id": string | null,
"email": string,
"id": string,
"is_active": boolean,
"must_change_password": boolean,
"name": string,
"role_id": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"has_permission":
{ Args: { "p_permission": string }; Returns: boolean
                           },
"transition_ticket_status":
{ Args: { "p_new_status": string,"p_ticket_id": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
