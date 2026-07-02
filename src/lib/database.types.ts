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
  // Holds either a legacy LearningModeId or a ResearchModeId — stored as text.
  mode: string
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

export type ResearchLog = {
  id: string
  user_id: string
  chat_id: string | null
  question: string
  answer: string
  sources: unknown
  model: string
  mode: string
  question_type: string | null
  research_used: boolean
  confidence: number
  created_at: string
}

export type ResearchMemory = {
  id: string
  user_id: string
  topic: string
  summary: string
  source_urls: unknown
  mode: string | null
  embedding: number[] | null
  created_at: string
}

export type Flashcard = {
  id: string
  user_id: string
  topic: string
  question: string
  answer: string
  ease: number
  interval_days: number
  repetitions: number
  due_at: string
  last_reviewed_at: string | null
  created_at: string
}

export type QuizAttempt = {
  id: string
  user_id: string
  topic: string
  difficulty: string
  total_questions: number
  correct_count: number
  questions: unknown
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
          mode: string
          created_at?: string
        }
        Update: {
          title?: string
          model?: string
          mode?: string
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
      research_logs: {
        Row: ResearchLog
        Insert: {
          id?: string
          user_id: string
          chat_id?: string | null
          question: string
          answer: string
          sources?: unknown
          model: string
          mode: string
          question_type?: string | null
          research_used?: boolean
          confidence?: number
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      research_memory: {
        Row: ResearchMemory
        Insert: {
          id?: string
          user_id: string
          topic: string
          summary: string
          source_urls?: unknown
          mode?: string | null
          embedding?: number[] | null
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      flashcards: {
        Row: Flashcard
        Insert: {
          id?: string
          user_id: string
          topic: string
          question: string
          answer: string
          ease?: number
          interval_days?: number
          repetitions?: number
          due_at?: string
          last_reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          topic?: string
          question?: string
          answer?: string
          ease?: number
          interval_days?: number
          repetitions?: number
          due_at?: string
          last_reviewed_at?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: QuizAttempt
        Insert: {
          id?: string
          user_id: string
          topic: string
          difficulty?: string
          total_questions: number
          correct_count: number
          questions?: unknown
          created_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      match_research_memory: {
        Args: {
          query_embedding: number[]
          match_count: number
          match_user: string
        }
        Returns: Array<{ id: string; topic: string; summary: string; similarity: number }>
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
