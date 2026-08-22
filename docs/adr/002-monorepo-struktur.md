# ADR 002: Monorepo-Struktur für Frontend und Backend

- **Status:** angenommen
- **Datum:** 2026-08-22

## Kontext

Das Frontend (Vue 3) und Backend (NestJS) sollen gemeinsam versioniert und deployed werden. Es gibt zwei Möglichkeiten: getrennte Repositories oder ein Monorepo.

## Entscheidung

Wir nutzen ein **Monorepo** mit folgender Struktur:

```
simple-mailing-list-service/
├── src/                          # Backend (NestJS)
├── frontend/                     # Frontend (Vue 3 + Vite)
├── docker-compose.yml            # Dev-Setup
├── docker-compose.prod.yml       # Production-Setup mit Nginx
└── ...
```

Begründung:
- Einfacherer Deployment-Workflow (ein Build-Schritt)
- Konsistente Versionierung von API und Frontend
- Gemeinsame CI/CD-Pipeline
- Frontend kann im Dev-Modus direkt via NestJS statisch serviert werden

## Konsequenzen

- `package.json` im Root bleibt für das Backend
- Separates `package.json` in `/frontend/` für Frontend-Dependencies
- CI muss beide Teile bauen
- Docker-Compose-Production-Setup benötigt Nginx für das Frontend
