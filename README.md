# Simple Mailing List Service

A small self‑hosted mailing list service built with **NestJS**.  
It polls an IMAP mailbox (e.g. from Mailcow), distributes incoming messages to one or more lists, supports moderation, and provides unsubscribe links compliant with modern mailbox providers (Gmail, Telekom, …).

---

## Features

- **Multiple mailing lists**
    - Each list has its own address (e.g. `members@club.org`, `board@club.org`)
    - List modes: `open`, `members_only`, `moderated`

- **Members & roles**
    - Members belong to a list
    - Roles:
        - `member`: receives list mail, may be restricted to send by mode
        - `admin`: receives moderation requests, can always send

- **Incoming mail processing**
    - Polls an **IMAP INBOX** with `ImapFlow`
    - Parses messages with `mailparser`
    - Maps incoming mails to lists via `To`/`Cc` addresses
    - Distributes directly or enqueues for moderation according to list mode

- **Moderation**
    - Messages can be held in a pending queue
    - Moderation emails are sent to list admins with **Approve/Reject links**
    - HTTP endpoint `/moderate/:token` applies the action:
        - approve → distribute message to all active members
        - reject → mark as rejected

- **Unsubscribe**
    - Each member has a unique `unsubscribeToken`
    - `/unsubscribe/:token` immediately deactivates the member
    - Outgoing mails include:
        - `List-Unsubscribe` + `List-Unsubscribe-Post` headers
        - Visible unsubscribe link in the email body (text + HTML)

- **HTTP API**
    - CRUD‑like endpoints for lists and members (no UI, API‑only)
    - Simple endpoints for moderation and unsubscribe

- **Simple storage**
    - Uses **SQLite + TypeORM** by default
    - Easy to switch to Postgres/MySQL if needed

---

## Architecture Overview

**Tech stack**

- Runtime: Node.js, NestJS
- HTTP: NestJS controllers (Express)
- DB: TypeORM + SQLite
- IMAP: [ImapFlow](https://github.com/postalsys/imapflow)
- SMTP: [Nodemailer](https://nodemailer.com/)
- MIME parsing: [mailparser](https://nodemailer.com/extras/mailparser/)

**Main modules**

- `ImapModule` / `ImapService`
    - Long‑running worker
    - Connects to IMAP, checks `INBOX` for unseen messages
    - For each new message:
        - Parse sender & recipients
        - Determine matching lists
        - Apply list rules (open / members_only / moderated)
        - Distribute or enqueue for moderation

- `MailModule` / `MailService`
    - Wraps Nodemailer
    - Adds List‑Unsubscribe headers and footer to outgoing emails
    - Sends:
        - Regular list mail
        - Moderation requests to admins

- `ModerationModule`
    - HTTP controller to handle `/moderate/:token`
    - Looks up `ModerationToken` and related `PendingMessage`
    - Approves → sends to members and marks as `approved`
    - Rejects → marks as `rejected`

- `ListsModule`
    - Entities and API for `List` and `ListMember`
    - Includes `/unsubscribe/:token` endpoint
    - Simple REST API to manage lists and members

---

## Data Model (Entities)

### List

- `id` (number, PK)
- `name` (string)
- `email` (string, unique) – the list address, e.g. `members@club.org`
- `mode` (`open` | `members_only` | `moderated`)

### ListMember

- `id` (number, PK)
- `list` (Many‑to‑One → `List`)
- `email` (string)
- `name` (string, optional)
- `role` (`member` | `admin`)
- `active` (boolean)
- `unsubscribeToken` (string, unique, used for one‑click unsubscribe)

### PendingMessage

- `id` (UUID, PK)
- `list` (Many‑to‑One → `List`)
- `fromEmail` (string)
- `subject` (string, optional)
- `rawMessage` (Buffer) – raw RFC822 message
- `status` (`pending` | `approved` | `rejected`)

### ModerationToken

- `id` (number, PK)
- `message` (Many‑to‑One → `PendingMessage`)
- `token` (string, unique)
- `action` (`approve` | `reject`)
- `expiresAt` (Date)
- `usedAt` (Date, optional)

---

## Requirements

- Node.js (>= 18 recommended)
- npm or Yarn
- Access to:
    - IMAP server (e.g. Mailcow, Dovecot)
    - SMTP server (e.g. Mailcow submission / SMTPS)
- SQLite (no extra service needed, file‑based)

---

## Configuration

Configuration is handled via environment variables (e.g. `.env` file in project root).

Example `.env`:

```env
# HTTP server
HTTP_PORT=3000
PUBLIC_BASE_URL=https://lists.example.org

# Database
DATABASE_PATH=./mailing.db

# IMAP (Mailcow / Dovecot)
IMAP_HOST=mail.example.org
IMAP_PORT=993
IMAP_USER=lists@example.org
IMAP_PASS=super-secret
# IMAPS (TLS on 993)
IMAP_TLS=true

# SMTP (Mailcow)
SMTP_HOST=mail.example.org
SMTP_PORT=465
SMTP_SECURE=true        # true for 465 (SMTPS), false for 587 (STARTTLS)
SMTP_USER=lists@example.org
SMTP_PASS=super-secret
SMTP_FROM_NAME=Example Club
SMTP_FROM_EMAIL=lists@example.org
```

The app uses:

*   DATABASE\_PATH for SQLite (sqlite://mailing.db internally via TypeORM)

*   PUBLIC\_BASE\_URL to generate links in emails:

    *   Moderation links: ${PUBLIC\_BASE\_URL}/moderate/:token

    *   Unsubscribe links: ${PUBLIC\_BASE\_URL}/unsubscribe/:token


Getting Started
---------------

### 1\. Install dependencies

```bash
npm install
# or
yarn install

```

### 2\. Configure environment

Create a .env file based on the example above and adjust:

*   IMAP/SMTP credentials

*   domain / base URLs

*   database path


### 3\. Run database migrations / sync

By default, the project uses TypeORM synchronize: true in development.For production, you should switch to proper migrations (out of scope of this README, but TypeORM migrations are supported).

### 4\. Start the service

Development:

```bash
npm run start:dev
# or
yarn start:dev

```

Production build:

```bash
npm run build
npm run start:prod
```

The service will:

*   start HTTP server on HTTP\_PORT (default: 3000)

*   start the IMAP worker which periodically polls the INBOX


Mail Flow
---------

1.  A user sends an email to members@club.org.

2.  The mail arrives in the IMAP INBOX configured for IMAP\_USER.

3.  The IMAP worker picks up **unseen** messages.

4.  For each message:

    *   It parses From and To/Cc.

    *   It finds all lists where list.email matches any recipient.

    *   For each list:

        *   If mode === 'open': distribute to all active members.

        *   If sender is admin: distribute.

        *   If mode === 'members\_only' and sender is member: distribute.

        *   Otherwise: enqueue for moderation.

5.  If enqueued for moderation:

    *   A PendingMessage is created.

    *   Two ModerationTokens are created (approve / reject).

    *   Admins of that list receive a moderation email with links:

        *   https://lists.example.org/moderate/

        *   https://lists.example.org/moderate/

6.  When an admin clicks a moderation link:

    *   /moderate/:token verifies and applies the action.

    *   On approve: the message is sent out to all active members.

7.  Every outgoing list email includes:

    *   An unsubscribe link per recipient (/unsubscribe/:token).

    *   List-Unsubscribe + List-Unsubscribe-Post headers.


HTTP API (Summary)
------------------

> Note: There is no authentication layer built in yet. For production, you should protect these endpoints via a reverse proxy (e.g. Basic Auth), VPN, or add proper auth to Nest.

### Lists

*   POST /lists

    *   Create a list

    *   jsonCode kopieren{ "name": "Members", "email": "members@example.org", "mode": "moderated"}

*   GET /lists

    *   List all lists

*   GET /lists/:id

    *   Get a specific list


### Members

*   GET /lists/:id/members

    *   List members of a list

*   POST /lists/:id/members

    *   Add a member to a list

    *   jsonCode kopieren{ "email": "user@example.org", "name": "User Name", "role": "member"}

*   PATCH /lists/members/:memberId/active?active=true|false

    *   Activate or deactivate a member manually


### Moderation

*   GET /moderate/:token

    *   Approve or reject a pending message based on the token

    *   Returns a simple HTML response stating the result


### Unsubscribe

*   GET /unsubscribe/:token

    *   Deactivates the corresponding ListMember

    *   Returns a simple HTML message:

        *   either “You were unsubscribed from list X”

        *   or “You are already unsubscribed”


Deployment Notes
----------------

*   Run behind a reverse proxy (nginx, Caddy, Traefik, …).

*   Expose only the HTTP port publicly (e.g. 80/443).

*   Protect administrative APIs (/lists, /lists/:id/members, …) via:

    *   IP restriction, or

    *   Basic Auth in the reverse proxy, or

    *   a proper auth layer in NestJS.

*   Make sure your SMTP and IMAP settings match your mail server (e.g. Mailcow):

    *   IMAP: port 993 + TLS

    *   SMTP: port 465 + TLS (or 587 + STARTTLS with secure: false)

*   Monitor logs:

    *   IMAP worker issues

    *   SMTP sending errors

    *   moderation/unsubscribe activity


Roadmap / Ideas
---------------

*   Admin UI (web frontend) for:

    *   managing lists and members

    *   viewing pending messages and moderation history

*   Support for BCC‑only list addressing (using IMAP envelope rather than To/Cc)

*   Rate limiting and batch sending strategies for large lists

*   Full TypeORM migrations instead of synchronize for production


License
-------

[MIT](./license)