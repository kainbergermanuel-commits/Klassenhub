# Datenbestand KlassenHub

Vollständige Aufnahme aller personenbezogenen Daten, Stand 2026-08-14.
Erhoben aus `supabase/*.sql` (66 Dateien) und den tatsächlichen Queries in
`app/`, `components/`, `lib/`.

Dieses Dokument ist die **Quelle** für `/datenschutz` in der App. Wenn hier
eine Tabelle dazukommt, muss die Seite nachgezogen werden.

> Adressaten: Entwicklung und Ethikkapitel der Masterarbeit. Die
> Nutzer:innen-Fassung ist bewusst kürzer und anders formuliert.

---

## 1. Aktiv genutzte Tabellen

28 Tabellen werden im Code tatsächlich abgefragt.

`todos` und `todo_completions` werden **nicht mehr abgefragt**, seit das
Wochen-To-Do entfernt wurde, und sind hier deshalb nicht mehr geführt. Laut
Datenschutz-Dossier (Prüfung vom 06.08.2026) liegen in der Live-Datenbank aber
weiterhin Daten darin. Das verletzt die Datenminimierung: Tabellen droppen.

### Konto und Person

| Tabelle | Personenbezogene Felder | Lesezugriff laut RLS |
|---|---|---|
| `auth.users` | Login-Kennung, Passwort-Hash | nur Supabase Auth selbst |
| `profiles` | `full_name`, `role`, `class_id`, `gender`, Avatar-Felder, `special_role`, `child_id`, `preferred_guide_icon`, `joined_class_at` | **alle Mitglieder derselben Klasse** |
| `classes` | Klassenname, Schule | alle Angemeldeten (`using (true)`) |
| `teacher_classes` | Zuordnung Lehrperson zu Klasse, Fächer | Lehrpersonen |

**Wichtig:** Kinder haben keine echte E-Mail-Adresse. Der Login läuft über
einen Benutzernamen, der in `app/(auth)/login/page.tsx:20` zu
`benutzername@klassenhub.local` ergänzt wird. Diese Adresse existiert nur
innerhalb von Supabase Auth, es geht keine Post dorthin.

### Hausübungen

| Tabelle | Felder | Lesezugriff |
|---|---|---|
| `homework` | Fach, Titel, Fälligkeit, `created_by`, `attachment_name` | alle der Klasse |
| `homework_completions` | `student_id`, `completed_at`, `confirmed_by_parent_at` | eigene Zeile; zusätzlich **alle Lehrpersonen und alle Eltern der Klasse** |
| `homework_extensions` | `student_id`, `extra_days` | s. o. |
| `parent_nudges` | `student_id`, `homework_id`, Zeitpunkt | Kind selbst, Eltern, Lehrperson |

`attachment_name` ist **nur ein Dateiname als Text**. Es gibt keinen
Storage-Bucket und keinen Upload im ganzen Projekt (geprüft: kein Treffer für
`storage`/`bucket`/`upload`). Es liegen also keine Dateien von Nutzer:innen
auf dem Server.

### Abenteuer und Gamification

| Tabelle | Felder | Lesezugriff |
|---|---|---|
| `streak_confirmations` | `student_id`, `milestone`, `confirmed_by` | Kind, Eltern, Lehrperson |
| `streak_freezes` | `student_id`, `homework_id` | dieselbe Gruppe |
| `class_goals` | Klassenziel, Belohnung | alle der Klasse |
| `achievements` | `student_id`, Art, Schlüssel, Zeitraum | **nur das Kind selbst** |
| `quests` / `quest_choices` | gewählter Pfad je Kind | Quests klassenweit, Wahl beim Kind |
| `quest_riddle_solutions` | gelöstes Rätsel, `attempts` | nur das Kind selbst |
| `rucksack_item_seen` | welcher Übergabe-Dialog weggeklickt wurde | **nur das Kind selbst**, bewusst keine Eltern-/Lehrer-Policy |

`quest_riddle_solutions.attempts` ist laut Kommentar in der Migration reine
Analytik und wird nie kompetitiv angezeigt. Das ist eine Zusage, die beim
Ausbau nicht gebrochen werden darf.

### Schulalltag

| Tabelle | Felder | Lesezugriff |
|---|---|---|
| `timetable_entries` | Stundenplan je Kind | Klasse |
| `class_timetable_entries`, `class_timetable_pushes` | Klassen-Stundenplan, Push-Protokoll | Klasse bzw. Lehrpersonen |
| `teacher_timetable_entries`, `teacher_supervisions` | Stundenplan und Gangaufsichten der Lehrperson | Lehrperson selbst |
| `subjects` | Fächerkatalog, kein Personenbezug | alle |
| `duties`, `duty_completions` | Dienstzuteilung und Erledigung je Kind | Klasse |
| `events` | Termine, `target_student_ids` für persönliche Termine | Klasse, persönliche gefiltert |
| `reminders`, `reminder_views` | Erinnerungen, wer sie gesehen hat | Klasse, Gesehen-Status bei Lehrperson |
| `planning_notes` | Unterrichtsplanung der Lehrperson | **nur Lehrpersonen** |

### Besonders schutzbedürftig

| Tabelle | Felder | Lesezugriff |
|---|---|---|
| `attendance` | `date`, `status` (entschuldigt/unentschuldigt), **`note` als Freitext**, `reported_by`, `confirmed_by` | Kind nur eigene; Eltern nur eigenes Kind; Lehrpersonen der Klasse |
| `messages` | `body` als Freitext, Absender, `seen_at`, Bestätigung | Elternteil nur eigenes Heft; Lehrpersonen der Klasse |

Diese beiden sind die sensibelsten Bestände im System.

`attendance.note` ist ein freies Textfeld. Dort landen erfahrungsgemäß
Gesundheitsangaben ("Fieber", "Arzttermin"), also besondere Kategorien
personenbezogener Daten nach Art. 9 DSGVO. Die RLS ist hier eng und richtig,
aber die Seite muss Eltern und Lehrpersonen ausdrücklich sagen, dass sie
nur hineinschreiben sollen, was nötig ist.

`messages` ist als Mitteilungsheft korrekt abgeschottet: ein Elternteil sieht
ausschließlich das eigene Heft, auch bei einer Sammelnachricht, weil diese
als einzelne Kopien je Elternteil ausgeliefert wird.

---

## 2. Was nicht existiert

Belegbar, weil im ganzen Projekt kein Treffer:

- keine echten E-Mail-Adressen von Kindern
- keine Telefonnummern, keine Wohnadressen, keine Geburtsdaten
- kein Datei-Upload, kein Storage-Bucket
- keine Standortdaten
- keine Analyse-, Tracking- oder Werbe-Skripte, keine Drittanbieter-Einbindung
- keine Weitergabe an Dritte

Das ist der stärkste Teil der Datenschutzseite und gehört sichtbar nach vorne,
nicht in eine Fußnote.

---

## 3. Offene Punkte

### 3.1 Eltern können Erledigungen der ganzen Klasse lesen

`supabase/schema.sql:109` erlaubt beim Lesen von `homework_completions`
`role in ('teacher', 'parent')` für die gesamte Klasse. Ein Elternteil kann
über die API also die Erledigungen aller Kinder der Klasse abfragen, nicht nur
die des eigenen Kindes.

**Das ist kein Versehen.** Der Klassenziel-Fortschritt zählt alle bestätigten
Erledigungen der Season, und Eltern sehen das Klassenziel. Eine Verengung der
Policy auf das eigene Kind würde das Klassenziel für Eltern brechen.

In der Oberfläche wird nie ein fremdes Kind namentlich gezeigt, Eltern sehen
nur ihr eigenes Kind plus die anonyme Klassensumme. Die Abschottung ist damit
auf Anwendungsebene gegeben, nicht auf Datenbankebene.

Sauberer Weg, falls das später stören sollte: eine Datenbankfunktion, die
ausschließlich die Klassensumme zurückgibt, und danach die Policy verengen.
Bewusst nicht Teil dieses Arbeitsschritts, weil es ein funktionierendes
Feature anfasst.

Auf der Nutzer:innen-Seite wird deshalb beschrieben, **was die App anzeigt**,
und nicht behauptet, die Datenbank verbiete mehr, als sie verbietet.

### 3.2 Entwickler-Vollzugriff

Über den Service-Role-Key besteht Vollzugriff auf alle Tabellen unter Umgehung
sämtlicher RLS. Das ist derselbe offene Punkt wie auf der Ethikseite der
Masterarbeit und **vor dem Feldeinsatz organisatorisch zu klären**: wer hält
den Key, wird er vor dem Erhebungsstart rotiert, wird der Zugriff protokolliert.

Keine Code-Frage, deshalb bewusst nicht auf der Datenschutzseite versteckt,
sondern hier als eigener Punkt geführt.

### 3.3 Von Hand zu ergänzen

In `lib/privacyInfo.ts` stehen die Angaben, die ich nicht aus dem Code
erheben kann: Verantwortliche Stelle, Kontakt, Serverstandort, Aufbewahrungs-
dauer. Solange dort Platzhalter stehen, blendet die Seite für Lehrpersonen
einen Hinweis ein. Für Kinder und Eltern ist dieser Hinweis unsichtbar.
