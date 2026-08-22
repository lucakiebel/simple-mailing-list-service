# ADR 004: Frontend-Dev-Modus via NestJS Static-File-Serving

- **Status:** angenommen
- **Datum:** 2026-08-22

## Kontext

Das Frontend soll im Development-Modus ebenfalls über das NestJS-Backend erreichbar sein, ohne dass ein separater Vite-Proxy aufgesetzt werden muss.

## Entscheidung

- **Development:** NestJS serviert das Vite-Dev-Build statisch über `@nestjs/serve-static` (oder manuelles Middleware-Serving). Alternativ: Vite startet separat und der Entwickler greift direkt auf Port 5173 zu (mit API-Proxy in der vite.config.ts).
- **Production:** Der `npm run build` im Frontend produziert `frontend/dist/`, und die Production-Infrastruktur (Nginx) serviert die statischen Dateien.

Aktuelle Entscheidung für Dev: Vite läuft eigenständig mit API-Proxy in `vite.config.ts`.

Begründung:
- Trennung der Dev-Server (Vite HMR bleibt erhalten)
- Keine Änderungen am NestJS-Backend nötig
- Einfach umzusetzen

## Konsequenzen

- `vite.config.ts` enthält Proxy-Regeln (`/api/*` → `http://localhost:3000`)
- Zwei `dev`-Scripts: `npm run dev` (NestJS) und `npm run dev` (Vite im frontend/-Ordner)
- Optional: root-`package.json` mit `concurrently` für paralleles Starten
