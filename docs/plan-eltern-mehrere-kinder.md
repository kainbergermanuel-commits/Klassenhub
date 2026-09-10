# Ein Elternkonto, mehrere Kinder

**Stand:** 10.09.2026 · noch nicht begonnen

## Das Problem

Ein Elternkonto hängt heute an genau einem Kind und genau einer Klasse. Fünf von
fünfzig Familien haben aber zwei Kinder an der Schule:

| Familie | Kinder |
|---|---|
| Isakovic | Jovan-Kristian (1b) · Daniel (2b) |
| Ployer | Sarah (2a) · Kemal (2b) |
| Bock | Kim (2a) · Ben (4a) |
| Darani | Simon (2a) · Salina (4a) |
| Markus | Leon (1b) · Elias (4a) |

Ohne Umbau bräuchte jede dieser Familien zwei Anmeldungen und müsste sich merken,
welche zu welchem Kind gehört.

## Die Entscheidung: Verknüpfungstabelle, kein Array

Zwei Wege wären gangbar: eine Tabelle `parent_children` oder eine Array-Spalte
`profiles.child_ids`. Die Tabelle gewinnt, aus drei Gründen:

1. **Gleiche Form wie bei den Lehrpersonen.** `teacher_classes` löst dasselbe
   Problem und ist erprobt, inklusive Rollback-Skript. Eine Array-Spalte daneben
   wäre ein zweites Muster für dieselbe Sache, und das kostet auf Dauer mehr als
   der eine Index-Zugriff.
2. **Referentielle Integrität.** Ein gelöschtes Kind verschwindet aus der
   Verknüpfung. In einem Array bliebe eine tote UUID stehen.
3. **Die Latenzsorge trifft nicht zu.** Kein zusätzlicher Roundtrip aus der App.
   Serverseitig ein Index-Zugriff pro Anweisung, nicht pro Zeile, solange die
   Funktion `STABLE` ist und die Policy `IN (SELECT …)` verwendet. Genau so
   läuft `my_class_ids()` heute schon, in 22 Policies.

## Die Abkürzung, die den Umbau klein hält

Die Klassenzugehörigkeit muss **nicht** in 22 Policies angefasst werden. Es
genügt, `my_class_ids()` um die Klassen der eigenen Kinder zu erweitern. Alle
klassenbezogenen Policies gelten damit automatisch für Eltern mit Kindern in
mehreren Klassen.

Anzufassen sind nur die rund zehn Prädikate, die direkt auf `child_id` zeigen.

---

## Stufe 0 · Bestandsaufnahme (nur lesen)

Die Migrationsdateien sind nicht zwingend der Live-Stand. Vor dem ersten Eingriff
im Supabase-SQL-Editor ausführen:

```sql
SELECT schemaname, tablename, policyname,
       pg_get_expr(polqual, polrelid) AS using_ausdruck
FROM pg_policies
JOIN pg_policy ON pg_policy.polname = pg_policies.policyname
WHERE pg_get_expr(polqual, polrelid) LIKE '%child_id%';
```

Ergebnis ist die verbindliche Arbeitsliste für Stufe 3. Erwartet werden Policies
auf `homework_completions`, `attendance`, `timetable_entries`, `duty_completions`,
`streak_freezes` und `homework_extensions`.

## Stufe 1 · Schema, rein additiv

Legt die Verknüpfung an und befüllt sie aus dem Ist-Zustand. **Ändert keine
Policy und keine Funktion, kann den Login also nicht brechen.** Idempotent.

```sql
CREATE TABLE IF NOT EXISTS public.parent_children (
  parent_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS parent_children_student_idx
  ON public.parent_children (student_id);

INSERT INTO public.parent_children (parent_id, student_id, is_primary)
SELECT id, child_id, true
FROM public.profiles
WHERE role = 'parent' AND child_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

`profiles.child_id` bleibt vorerst bestehen und wird weiter mitgeschrieben. Erst
Stufe 6 entscheidet über den Abbau.

## Stufe 2 · Funktionen

```sql
-- Alle Kinder des aktuellen Elternteils.
CREATE OR REPLACE FUNCTION public.my_child_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT student_id FROM public.parent_children WHERE parent_id = auth.uid()
$$;
```

Dazu `my_class_ids()` um einen dritten Zweig erweitern, damit Eltern die Klassen
aller ihrer Kinder sehen:

```sql
  SELECT class_id FROM public.profiles
  WHERE id IN (SELECT public.my_child_ids()) AND class_id IS NOT NULL
```

## Stufe 3 · Policies umstellen

Jedes Prädikat aus Stufe 0 von

```sql
student_id = (select child_id from public.profiles where id = auth.uid())
```

auf

```sql
student_id IN (SELECT public.my_child_ids())
```

Für Eltern mit einem Kind ist das Verhalten identisch. Dazu ein
`rollback-policies-before-multichild.sql` nach dem Vorbild von
`rollback-policies-before-multiclass.sql`.

## Stufe 4 · Anwendung

Der Umschalter kann den Klassen-Umschalter kopieren: `app/api/active-class/route.ts`
setzt ein httpOnly-Cookie. Gegenstück `active_child_id`.

Neun Dateien lesen heute `profile.child_id` und brauchen stattdessen das aktive Kind:

| Datei | Was daran hängt |
|---|---|
| `lib/auth.ts` | `matchChild()` wird zu `getChildren()` plus aktivem Kind |
| `app/(app)/layout.tsx` | zwei Badge-Zähler |
| `app/(app)/stundenplan/page.tsx` | angezeigter Stundenplan |
| `app/(app)/anwesenheit/page.tsx` | persönliche Statistik |
| `app/(app)/mitteilungsheft/page.tsx` | Heft-Zuordnung |
| `app/(app)/klasse/page.tsx` | Anzeige „Elternteil von …" |
| `app/actions/timetable.ts` | Zielkind |
| `app/actions/confirmHomeworkCompletion.ts` | Besitzprüfung, zweimal |
| `app/actions/attendance.ts` | Krankmeldung |

Die beiden Besitzprüfungen in `confirmHomeworkCompletion.ts` sind
sicherheitsrelevant: aus `profile.child_id !== studentId` wird eine Prüfung gegen
die Kinderliste. Nicht vergessen.

Umschalter im UI nur zeigen, wenn ein Elternteil mehr als ein Kind hat, analog zu
`showClassSwitcher` in Sidebar und MobileHeader.

## Stufe 5 · Daten und Verwaltung

- Die fünf Familien auf je ein Konto zusammenführen.
- Eine Admin-Möglichkeit, einem bestehenden Elternkonto ein zweites Kind
  zuzuordnen. Ohne sie ist der Umbau im Alltag nicht bedienbar.

## Stufe 6 · Aufräumen

Erst wenn Stufe 1 bis 5 verifiziert sind: entweder `profiles.child_id` entfernen
oder bewusst als „Hauptkind" behalten, analog zu `is_primary` bei
`teacher_classes`. Diese Stufe ist optional und darf lange offen bleiben.

---

## Reihenfolge gegenüber den Elternbriefen

Die 66 Konten für 2b und 4a sind **noch nicht angelegt**. Daraus folgt eine
Weggabelung:

**A · Jetzt anlegen, später zusammenführen.** Die fünf Familien bekämen zwei
Konten und zwei Zettel. Nach dem Umbau müssten ihre Briefe neu gedruckt und
erneut ausgegeben werden.

**B · Stufe 1 bis 3 zuerst, dann anlegen.** Die Briefe stimmen beim ersten Druck.
Die fünf Familien bekommen von Anfang an einen Zugang für beide Kinder.

**Empfehlung: B.** Die Stufen 1 bis 3 sind klein und additiv, und gedruckte
Zugangsdaten wieder einzusammeln ist deutlich teurer als ein Abend Vorarbeit.
Stufe 4 kann danach in Ruhe folgen; bis dahin sehen Eltern schlicht ihr
Hauptkind, so wie heute.
