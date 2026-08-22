# ADR 005: Keycloak-Authentifizierung für das Frontend

- **Status:** angenommen
- **Datum:** 2026-08-22

## Kontext

Das Backend authentifiziert Admin-API-Endpunkte via Keycloak-JWT (RS256, globaler JwtAuthGuard). Das Frontend benötigt eine entsprechende Login-Integration.

## Entscheidung

Das Frontend verwendet `@react-keycloak/web` (für Vue adaptiert) bzw. die `keycloak-js`-Bibliothek direkt, um den Keycloak-Login-Flow umzusetzen:

1. Frontend zeigt Login-Seite → Redirect zu Keycloak
2. Keycloak gibt JWT-Token zurück
3. Token wird im Frontend gespeichert (Session-Storage)
4. Axios-Interceptor setzt `Authorization: Bearer <token>` auf alle API-Requests
5. Token-Refresh wird automatisch gehandhabt

Der bestehende Keycloak-Client wird um die Frontend-Redirect-URIs erweitert (`http://localhost:5173/*` für Development, Production-URL für Production).

## Konsequenzen

- Frontend benötigt eine `keycloak.json` (bzw. Keycloak-Konfiguration per env-Var)
- Client-Secret wird nicht benötigt (Public Client)
- Der Vue-Router schützt geschützte Routen via Navigation-Guard
- API-Fehler (401) lösen automatischen Logout/Redirect aus
