# ADR 001: Vue 3 + Vite als Frontend-Framework

- **Status:** angenommen
- **Datum:** 2026-08-22

## Kontext

Das Projekt benötigt ein Admin-Frontend zur Verwaltung von Mailing-Listen, Mitgliedern, Delivery-Logs und zur Debug-Ansicht eingehender Mails. Bisher existiert nur ein reines Backend (NestJS) mit REST-API.

## Entscheidung

Wir verwenden **Vue 3** mit **Vite** als Build-Tool, **TypeScript**, **Pinia** für State-Management und **Vue Router** für Routing.

Begründung:
- Vue 3 ist leichtgewichtig und hat eine flache Lernkurve
- Vite bietet schnelle HMR-Entwicklung und optimierte Production-Builds
- Pinia ist der offizielle Vue-3-State-Manager (einfach, typsicher)
- Vue Router ist Standard für SPA-Routing
- Geringere Komplexität als Angular, vergleichbar mit React

## Konsequenzen

- Frontend-Code liegt in `/frontend/` (Monorepo)
- Production-Build (`/frontend/dist/`) wird via NestJS statisch serviert
- Entwicklung erfolgt parallel: Vite-Dev-Server für HMR, Proxied zu NestJS-Backend
