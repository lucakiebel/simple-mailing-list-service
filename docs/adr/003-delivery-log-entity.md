# ADR 003: DeliveryLog-Entity für Versand-Tracking

- **Status:** angenommen
- **Datum:** 2026-08-22

## Kontext

Bisher gibt es keine Aufzeichnung darüber, welche Mails wann an welche Mitglieder gesendet wurden. Für Fehleranalyse und Transparenz wird ein lückenloses Log benötigt.

## Entscheidung

Wir führen eine neue Datenbank-Entity `DeliveryLog` ein:

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | UUID (PK) | Auto-generiert |
| `messageId` | varchar | Message-ID aus dem Email-Header |
| `listId` | number (FK → list) | Die betroffene Liste |
| `fromEmail` | varchar | Absender der Original-Mail |
| `subject` | varchar | Betreff |
| `recipientEmail` | varchar | Empfänger (ein Mitglied) |
| `status` | enum | `pending` / `sent` / `failed` |
| `errorMessage` | text, nullable | Fehler bei `failed` |
| `sentAt` | datetime | Zeitpunkt des Sendens |
| `source` | varchar | `direct` / `moderation` / `manual` |

**Unique-Index:** `(messageId, listId, recipientEmail)` verhindert doppelte Logs bei Retries.

Begründung:
- Jeder Sendevorgang wird **vor** dem Senden als `pending` angelegt, nach Erfolg auf `sent` gesetzt
- Bei Fehlern bleibt der Log lesbar mit Fehlermeldung
- Die Tabelle dient als Grundlage für das Admin-Frontend (Statistiken, Fehlerübersicht)

## Konsequenzen

- `distributeToMembers()` in `ImapService` wird um DeliveryLog-Schreibzugriffe erweitert
- Auch `ModerationController` (bei Approve) schreibt DeliveryLogs
- Es entstehen keine Datenbank-Migrationen (TypeORM `synchronize: true`)
- Historische Mails werden nicht nachgetragen (Logging startet ab Einführung)
