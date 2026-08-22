# Projektplan: Admin-Frontend + Delivery-Log

Erweiterung des Simple Mailing List Service um ein Admin-Dashboard und Versand-Tracking.

---

## Übersicht

### Ziele
- **Delivery-Log** in der DB: welche Mail wann an welches Mitglied gesendet wurde
- **Admin-Frontend** (Vue 3 + Vite): Verwaltung von Listen, Mitgliedern, Moderation, Debug-Ansicht
- **Neue API-Endpunkte** für die Frontend-Features

### Nicht-Ziele (nicht im MVP)
- BCC-Support (bereits auf Roadmap)
- Rate-Limiting für große Listen
- TypeORM-Migrationen statt `synchronize`
- E-Mail-Bounce-Erkennung

---

## Architektur-Entscheidungen (ADRs)

| # | Entscheidung | Status |
|---|---|---|
| [ADR 001](adr/001-vue3-vite-frontend.md) | Vue 3 + Vite als Frontend-Framework | ✅ angenommen |
| [ADR 002](adr/002-monorepo-struktur.md) | Monorepo-Struktur (Frontend + Backend) | ✅ angenommen |
| [ADR 003](adr/003-delivery-log-entity.md) | DeliveryLog-Entity für Versand-Log | ✅ angenommen |
| [ADR 004](adr/004-frontend-serviert-durch-nestjs.md) | Dev-Modus: Vite eigenständig mit API-Proxy | ✅ angenommen |
| [ADR 005](adr/005-keycloak-auth-fuer-frontend.md) | Keycloak-Authentifizierung im Frontend | ✅ angenommen |

---

## Datenmodell (Änderungen)

### Neu: `DeliveryLog`

```
DeliveryLog
├── id            UUID (PK)
├── messageId     varchar       -- Message-ID aus Mail-Header
├── listId        number (FK)   -- → List.id
├── fromEmail     varchar       -- Absender
├── subject       varchar       -- Betreff
├── recipientEmail varchar      -- Empfänger
├── status        enum          -- 'pending' | 'sent' | 'failed'
├── errorMessage  text?         -- Fehlerdetails
├── sentAt        datetime      -- Zeitpunkt
└── source        varchar       -- 'direct' | 'moderation' | 'manual'

UNIQUE INDEX: (messageId, listId, recipientEmail)
```

Keine Änderungen an bestehenden Entities.

---

## Neue API-Endpunkte

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| `GET` | `/delivery-log` | admin | Delivery-Logs (filterbar: listId, dateFrom, dateTo, status, recipient) |
| `GET` | `/delivery-log/stats` | admin | Statistiken (gesamt, heute, Fehler, pro Liste) |
| `GET` | `/lists/:id/messages/pending` | admin | Ausstehende Moderations-Queue für eine Liste |
| `POST` | `/lists/:id/messages/pending/:pendingId/approve` | admin | Per API freigeben |
| `POST` | `/lists/:id/messages/pending/:pendingId/reject` | admin | Per API ablehnen |
| `GET` | `/imap/status` | admin | IMAP-Worker-Status (verbunden? läuft? letzter Poll?) |
| `GET` | `/system/health` | admin | Health-Check (DB, IMAP, SMTP) |

### Erweiterte bestehende API

- `GET /lists/:id/members` — inkludiert Delivery-Statistik pro Mitglied (erhaltene Mails, letzte Mail)

---

## Backend-Änderungen

### Neues Modul: `DeliveryLogModule`

```
src/delivery-log/
├── delivery-log.entity.ts
├── delivery-log.service.ts
├── delivery-log.controller.ts
├── delivery-log.module.ts
```

### Änderungen in bestehenden Modulen

**ImapService** (`distributeToMembers`):
- Vor `mailService.sendMail()`: DeliveryLog-Eintrag mit status `pending` anlegen
- Nach erfolgreichem Senden: Status auf `sent` setzen
- Bei Fehler: Status auf `failed` + Fehlermeldung speichern
- `messageId` aus Mail-Parse-Ergebnis extrahieren

**ModerationController** (Approval):
- Gleiche DeliveryLog-Schreibzugriffe beim Approve-Versand

**ImapService**:
- Neues Feld `lastPollAt: Date` für Status-Abfrage
- Health-Prüfung (Client verbunden? läuft Worker?)

---

## Frontend (Vue 3 + TypeScript + Pinia + Vue Router)

### Seiten-Übersicht

| Route | View | Beschreibung |
|---|---|---|
| `/login` | LoginView | Keycloak-Login (Redirect) |
| `/` | DashboardView | Übersicht: Listen, letzte Aktivitäten, Versand-Graph (7/30 Tage) |
| `/lists` | ListsView | Alle Listen: anlegen, löschen, Modus ändern |
| `/lists/:id` | ListDetailView | Detail: Infos, Mitglieder-Tabelle, Moderation-Queue |
| `/lists/:id/members` | MembersView | Mitglieder verwalten (hinzufügen, Rolle, aktiv/inaktiv) |
| `/delivery-log` | DeliveryLogView | Versandlog mit Filtern (Liste, Status, Zeitraum, Empfänger) |
| `/imap` | ImapDebugView | IMAP-Status + Debug-Ansicht eingehender Mails |
| `/settings` | SettingsView | System-Konfiguration (read-only) |

### Pinia Stores

| Store | Beschreibung |
|---|---|
| `useAuthStore` | Keycloak-Status, JWT, User-Rollen |
| `useListsStore` | Listen-CRUD |
| `useMembersStore` | Mitglieder einer Liste |
| `useDeliveryLogStore` | Delivery-Log + Statistiken |
| `useModerationStore` | Moderations-Queue + Approve/Reject |
| `useImapStore` | IMAP-Status + Debug-Daten |

### API-Client

- Axios-Instanz mit Base-URL (`/api/`)
- Request-Interceptor: setzt `Authorization: Bearer <token>` aus Keycloak
- Response-Interceptor: 401 → Logout + Redirect zu `/login`

### Keycloak-Integration

- `keycloak-js` initialisiert beim App-Start
- Vue-Router Navigation-Guard: geschützte Routen prüfen `authenticated`
- Token-Refresh vor Ablauf (via `onTokenExpired`-Callback)

---

## Implementierungs-Reihenfolge

```
Phase 1: Backend-Erweiterungen
  ├── 1.1 DeliveryLog Entity + Modul + Service + Controller
  ├── 1.2 Logging in ImapService.distributeToMembers
  ├── 1.3 Logging in ModerationController (Approve)
  ├── 1.4 Neue API-Endpunkte (Pending-API, IMAP-Status, Health)
  └── 1.5 Erweiterung Listen-Member-API um Delivery-Statistik

Phase 2: Frontend-Scaffold
  ├── 2.1 Vite + Vue 3 + TypeScript + Router + Pinia aufsetzen
  ├── 2.2 Keycloak-Integration
  ├── 2.3 API-Client (Axios)
  └── 2.4 Basis-Layout (Sidebar, Header, Auth-Guard)

Phase 3: Frontend-Views
  ├── 3.1 DashboardView
  ├── 3.2 ListsView + ListDetailView + MembersView
  ├── 3.3 DeliveryLogView
  ├── 3.4 Moderation-Queue in ListDetailView
  ├── 3.5 ImapDebugView
  └── 3.6 SettingsView

Phase 4: Deployment
  ├── 4.1 NestJS serviert Frontend-Build statisch (Production)
  ├── 4.2 Nginx-Config für Production
  └── 4.3 docker-compose.prod.yml
```

---

## Glossar

| Begriff | Definition |
|---|---|
| **DeliveryLog** | Datenbank-Tabelle, die jeden E-Mail-Versand protokolliert |
| **Liste** | Mailing-Liste mit eigener E-Mail-Adresse |
| **Mitglied** | Person, die zu einer Liste gehört (Rollen: `member`, `admin`) |
| **Moderation** | Freigabeprozess für eingehende Mails (via Link oder API) |
| **Versand** | Ein einzelner E-Mail-Versand von einer Liste an ein Mitglied |

---

## Offene Fragen

1. Keycloak-Client-ID und Realm-Name für den Frontend-Public-Client
2. Production-URL/Subdomain für die Keycloak-Redirect-URI-Konfiguration
3. Soll das Nginx-Build-Artifact in den Docker-Container kopiert werden, oder via Volume gemountet?
