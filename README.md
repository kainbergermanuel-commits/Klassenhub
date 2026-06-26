# KlassenHub

Mobile-first Klassen-Kommunikation · Next.js 14 + Supabase

---

## Setup

### 1. Node.js installieren
Falls noch nicht vorhanden: https://nodejs.org (LTS-Version empfohlen)

### 2. Abhängigkeiten installieren
```bash
cd klassenhub
npm install
```

### 3. Supabase Projekt anlegen
1. Gehe zu https://supabase.com → Neues Projekt anlegen
2. Kopiere **Project URL** und **Anon Key** aus Settings → API

### 4. Umgebungsvariablen
```bash
cp .env.local.example .env.local
# Trage deine Supabase-URL und den Anon-Key ein
```

### 5. Datenbank aufsetzen
Öffne den **SQL Editor** in deinem Supabase-Projekt und führe den Inhalt von `supabase/schema.sql` aus.

### 6. Demo-User anlegen
Im Supabase Dashboard → Authentication → Users → "Add user":
- `berger@schule.at` / Passwort wählen (→ wird Lehrer)
- `lena@schule.at` / Passwort wählen (→ wird Schülerin)
- `hofer@schule.at` / Passwort wählen (→ wird Elternteil)

Dann im SQL Editor die UPDATE-Befehle aus `schema.sql` (ganz unten) mit den echten UUIDs ausführen.

### 7. App starten
```bash
npm run dev
# → http://localhost:3000
```

---

## Projektstruktur

```
app/(auth)/login/       Login-Seite
app/(app)/              App-Shell (TopBar + Sidebar + BottomNav)
  page.tsx              Home (rollenabhängig)
  hausübungen/page.tsx  Hausübungen-Liste
components/
  layout/               TopBar, Sidebar, BottomNav
  home/                 TeacherHome, StudentHome, ParentHome
  homework/             HomeworkCard, HomeworkList, AddHomeworkModal
lib/supabase/           Browser- und Server-Clients
lib/types.ts            TypeScript-Typen
middleware.ts           Auth-Guard
supabase/schema.sql     DB-Schema + RLS + Seed
```

## Farben & Design
Alle KH-Farben sind als Tailwind-Token definiert (`kh-dark`, `kh-teal`, `kh-amber`, `kh-red`, …).
Icons: Material Symbols Rounded (via Google Fonts CDN, Klasse `msym`).
