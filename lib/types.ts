export type Role = 'teacher' | 'parent' | 'student'
export type Gender = 'm' | 'f'

// Hinweis: Diese Entitäten sind `type`-Aliase (nicht `interface`), damit sie
// `Record<string, unknown>` erfüllen — sonst akzeptiert der Supabase-Generic-Typ
// das Schema nicht und alle Queries würden zu `never` auflösen.
export type SpecialRole = 'klassensprecher' | 'stv_klassensprecher' | 'hw_admin'

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
  child_id: string | null
  special_role: SpecialRole | null
  is_admin: boolean
  joined_class_at: string | null
  /** "Mein Guide": persönlich gewählter Guide fürs Heldenbuch (Theme-Icon-
   *  Key, z. B. 'landscape'). NULL = kein Favorit, Fallback = aktuelle
   *  Klassenwelt. Nur wirksam, wenn der Guide bereits freigeschaltet ist
   *  (siehe isArcUnlocked in lib/seasonTheme.ts). */
  preferred_guide_icon: string | null
}

export type TimetableEntry = {
  student_id: string
  day: number
  slot: number
  subject: string
}

export type TeacherClass = {
  teacher_id: string
  class_id: string
  is_primary: boolean
  subjects: unknown | null
}

export type Class = {
  id: string
  name: string
  school: string
}

export type CalendarEvent = {
  id: string
  class_id: string
  created_by: string
  title: string
  description: string
  start_date: string
  end_date: string
  all_day: boolean
  start_time: string | null
  end_time: string | null
  location: string
  category: string
  created_at: string
  target_student_ids: string[] | null
}

/** Schlanke Termin-Repräsentation für die Startseiten-Agenda. */
export type AgendaEvent = {
  id: string
  title: string
  category: string
  start_date: string
  end_date: string
  all_day: boolean
  start_time: string | null
  target_student_ids: string[] | null
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
  status: 'published' | 'pending'
}

export type HomeworkCompletion = {
  homework_id: string
  student_id: string
  completed_at: string
  confirmed_by_parent_at: string | null
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
          child_id?: string | null
          is_admin?: boolean
          joined_class_at?: string | null
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
          status?: 'published' | 'pending'
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
          status?: 'published' | 'pending'
          target_student_ids?: string[] | null
        }
        Update: Partial<Reminder>
        Relationships: []
      }
      timetable_entries: {
        Row: TimetableEntry
        Insert: { student_id: string; day: number; slot: number; subject: string }
        Update: Partial<TimetableEntry>
        Relationships: []
      }
      teacher_classes: {
        Row: TeacherClass
        Insert: { teacher_id: string; class_id: string; is_primary?: boolean; subjects?: unknown | null }
        Update: Partial<TeacherClass>
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
      class_goals: {
        Row: ClassGoal
        Insert: { id?: string; class_id: string; season: string; target: number; reward?: string | null; updated_by?: string | null; updated_at?: string }
        Update: Partial<ClassGoal>
        Relationships: []
      }
      streak_freezes: {
        Row: StreakFreeze
        Insert: { id?: string; student_id: string; homework_id: string; created_at?: string }
        Update: Partial<StreakFreeze>
        Relationships: []
      }
      messages: {
        Row: Message
        Insert: {
          id?: string
          class_id: string
          parent_id: string
          sender_id?: string | null
          body: string
          created_at?: string
          seen_at?: string | null
          broadcast_id?: string | null
          requires_ack?: boolean
          acknowledged_at?: string | null
        }
        Update: Partial<Message>
        Relationships: []
      }
      events: {
        Row: AppEvent
        Insert: {
          id?: string
          class_id: string
          created_by: string
          title: string
          description?: string
          start_date: string
          end_date: string
          all_day?: boolean
          start_time?: string | null
          end_time?: string | null
          location?: string
          category?: string
          target_student_ids?: string[] | null
          created_at?: string
        }
        Update: Partial<AppEvent>
        Relationships: []
      }
      quests: {
        Row: Quest
        Insert: { id?: string; class_id: string; template_key: string; week_start: string; created_by?: string | null; created_at?: string }
        Update: Partial<Quest>
        Relationships: []
      }
      quest_choices: {
        Row: QuestChoiceRow
        Insert: { class_id: string; template_key: string; week_start: string; student_id: string; choice_key: string; chosen_at?: string }
        Update: Partial<QuestChoiceRow>
        Relationships: []
      }
      achievements: {
        Row: Achievement
        Insert: { student_id: string; kind: AchievementKind; key: string; period: string; achieved_at?: string }
        Update: Partial<Achievement>
        Relationships: []
      }
      duty_completions: {
        Row: DutyCompletion
        Insert: { duty_id: string; student_id: string; weekday: number; completed_at?: string }
        Update: Partial<DutyCompletion>
        Relationships: []
      }
      homework_extensions: {
        Row: HomeworkExtension
        Insert: { student_id: string; homework_id: string; extra_days: number; created_at?: string }
        Update: Partial<HomeworkExtension>
        Relationships: []
      }
      parent_nudges: {
        Row: ParentNudge
        Insert: { student_id: string; homework_id: string; created_at?: string }
        Update: Partial<ParentNudge>
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
  status: 'published' | 'pending'
  target_student_ids: string[] | null
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

export type ClassGoal = {
  id: string
  class_id: string
  season: string
  target: number
  reward: string | null
  updated_by: string | null
  updated_at: string
}

export type StreakFreeze = {
  id: string
  student_id: string
  homework_id: string
  created_at: string
}

// Quest-Instanz: verweist per template_key auf lib/questVault.ts (kein FK,
// keine eigene Tabelle für den Vorrat — siehe supabase/feature-quests.sql).
export type Quest = {
  id: string
  class_id: string
  template_key: string
  week_start: string
  created_by: string | null
  created_at: string
}

// QuestChoiceRow statt QuestChoice, um Kollision mit dem gleichnamigen
// Vorrats-Typ in lib/questVault.ts (Wahlpfad-Definition) zu vermeiden.
// Bewusst NICHT an quests.id gekoppelt (siehe fix-quest-choices-key.sql) —
// automatisch gewählte Quests erzeugen keine quests-Zeile.
export type QuestChoiceRow = {
  class_id: string
  template_key: string
  week_start: string
  student_id: string
  choice_key: string
  chosen_at: string
}

// Dienst-Selbstbestätigung — siehe supabase/feature-duty-completions.sql.
// Schließt die Lücke: `duties` speichert nur die Zuteilung, kein "erledigt".
export type DutyCompletion = {
  duty_id: string
  student_id: string
  weekday: number // 1=Mo … 5=Fr
  completed_at: string
}

// Zeitkristall (Balance-Fahrplan Phase 3) — siehe supabase/feature-hw-extension.sql
// + lib/streak.ts (effectiveDueDate).
export type HomeworkExtension = {
  student_id: string
  homework_id: string
  extra_days: number
  created_at: string
}

// Botenfeder (Balance-Fahrplan Phase 3) — siehe supabase/feature-parent-nudge.sql.
export type ParentNudge = {
  id: string
  student_id: string
  homework_id: string
  created_at: string
}

// Reines Log fürs Heldenbuch (Statistik-Zeilen) — siehe lib/achievements.ts.
// Persistiert NICHT den Quest-Fortschritt selbst (der bleibt live berechnet),
// nur DASS etwas irgendwann geschafft wurde.
export type AchievementKind = 'quest' | 'guild_quest' | 'class_goal'

export type Achievement = {
  student_id: string
  kind: AchievementKind
  key: string
  period: string
  achieved_at: string
}

// Termine ("events"). AppEvent statt Event, um Kollision mit dem DOM-Event zu vermeiden.
export type AppEvent = {
  id: string
  class_id: string
  created_by: string
  title: string
  description: string
  start_date: string
  end_date: string
  all_day: boolean
  start_time: string | null
  end_time: string | null
  location: string
  category: string
  target_student_ids: string[] | null
  created_at: string
}

// Mitteilungsheft: eine Nachricht gehoert genau einem Heft (parent_id).
// sender_id === parent_id  => vom Elternteil; sonst von der Lehrkraft.
export type Message = {
  id: string
  class_id: string
  parent_id: string
  sender_id: string | null
  body: string
  created_at: string
  seen_at: string | null
  broadcast_id: string | null
  requires_ack: boolean
  acknowledged_at: string | null
}
