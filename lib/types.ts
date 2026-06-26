export type Role = 'teacher' | 'parent' | 'student'
export type Gender = 'm' | 'f'

// Hinweis: Diese Entitäten sind `type`-Aliase (nicht `interface`), damit sie
// `Record<string, unknown>` erfüllen — sonst akzeptiert der Supabase-Generic-Typ
// das Schema nicht und alle Queries würden zu `never` auflösen.
export type Profile = {
  id: string
  role: Role
  full_name: string
  class_id: string | null
  avatar_color: string
  gender: Gender | null
  avatar_seed: string | null
  avatar_hair_color: string | null
  avatar_skin_color: string | null
}

export type Class = {
  id: string
  name: string
  school: string
}

export type Homework = {
  id: string
  class_id: string
  subject: string
  subject_short: string
  subject_color: string
  title: string
  due_date: string
  created_by: string | null
  created_at: string
  attachment_name: string | null
}

export type HomeworkCompletion = {
  homework_id: string
  student_id: string
  completed_at: string
}

// Supabase Database type for generic client usage.
// Wichtig: jede Tabelle braucht `Relationships` und das Schema `Views`/`Functions`/
// `Enums`/`CompositeTypes`, sonst fällt der getypte Client auf `never` zurück.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          role: Role
          full_name: string
          class_id?: string | null
          avatar_color?: string
          gender?: Gender | null
          avatar_seed?: string | null
          avatar_hair_color?: string | null
          avatar_skin_color?: string | null
        }
        Update: Partial<Profile>
        Relationships: []
      }
      classes: {
        Row: Class
        Insert: { id?: string; name: string; school: string }
        Update: Partial<Class>
        Relationships: []
      }
      homework: {
        Row: Homework
        Insert: {
          id?: string
          class_id: string
          subject: string
          subject_short: string
          subject_color: string
          title: string
          due_date: string
          created_by?: string | null
          created_at?: string
          attachment_name?: string | null
        }
        Update: Partial<Homework>
        Relationships: []
      }
      homework_completions: {
        Row: HomeworkCompletion
        Insert: { homework_id: string; student_id: string; completed_at?: string }
        Update: Partial<HomeworkCompletion>
        Relationships: []
      }
      todos: {
        Row: Todo
        Insert: {
          id?: string
          class_id: string
          title: string
          week_start: string
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Todo>
        Relationships: []
      }
      todo_completions: {
        Row: { todo_id: string; student_id: string; completed_at: string }
        Insert: { todo_id: string; student_id: string; completed_at?: string }
        Update: Partial<{ todo_id: string; student_id: string; completed_at: string }>
        Relationships: []
      }
      reminders: {
        Row: Reminder
        Insert: {
          id?: string
          class_id: string
          title: string
          description?: string | null
          event_date: string
          event_time?: string | null
          event_end_time?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Reminder>
        Relationships: []
      }
      duties: {
        Row: Duty
        Insert: {
          id?: string
          class_id: string
          week_start: string
          duty_name: string
          assignee_ids?: string[]
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Duty>
        Relationships: []
      }
      streak_confirmations: {
        Row: StreakConfirmation
        Insert: { student_id: string; milestone: number; confirmed_by?: string | null; confirmed_at?: string }
        Update: Partial<StreakConfirmation>
        Relationships: []
      }
      reminder_views: {
        Row: ReminderView
        Insert: { reminder_id: string; student_id: string; seen_at?: string }
        Update: Partial<ReminderView>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Homework with completion status attached (for client-side use)
export type HomeworkWithStatus = Homework & {
  done: boolean
  completion_count?: number // only visible to teacher
}

export type Todo = {
  id: string
  class_id: string
  title: string
  week_start: string
  created_by: string | null
  created_at: string
}

export type TodoWithStatus = Todo & {
  done: boolean
  completion_count?: number // nur für Lehrer
}

export type Reminder = {
  id: string
  class_id: string
  title: string
  description: string | null
  event_date: string
  event_time: string | null
  event_end_time: string | null
  created_by: string | null
  created_at: string
}

export type Duty = {
  id: string
  class_id: string
  week_start: string
  duty_name: string
  assignee_ids: string[]
  created_by: string | null
  created_at: string
}

export type StreakConfirmation = {
  student_id: string
  milestone: number
  confirmed_by: string | null
  confirmed_at: string
}

export type ReminderView = {
  reminder_id: string
  student_id: string
  seen_at: string
}
