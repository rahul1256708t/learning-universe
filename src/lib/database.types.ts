import type { LearningModeId } from "@/lib/learning"

export type Profile = {
  id: string
  full_name: string | null
  created_at: string
}

export type Chat = {
  id: string
  user_id: string
  title: string
  model: string
  mode: LearningModeId
  created_at: string
}

export type Message = {
  id: string
  chat_id: string
  user_id: string
  role: "user" | "assistant" | "system"
  content: string
  created_at: string
}

export type UsageLog = {
  id: string
  user_id: string
  model: string
  tokens_used: number
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          full_name?: string | null
        }
        Relationships: []
      }
      chats: {
        Row: Chat
        Insert: {
          id?: string
          user_id: string
          title: string
          model: string
          mode: LearningModeId
          created_at?: string
        }
        Update: {
          title?: string
          model?: string
          mode?: LearningModeId
        }
        Relationships: []
      }
      messages: {
        Row: Message
        Insert: {
          id?: string
          chat_id: string
          user_id: string
          role: "user" | "assistant" | "system"
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: UsageLog
        Insert: {
          id?: string
          user_id: string
          model: string
          tokens_used: number
          created_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
