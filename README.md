# Kunden- und Bestellverwaltung API

Eine REST-API zur zentralen Verwaltung von Kunden, Produkten und Bestellungen für kleine Handelsunternehmen.

Das Projekt wird als Einzelprojekt im Rahmen des Backend-Modulabschlusses entwickelt.

## Problemstellung

Kleine Händler verwalten Kunden, Produkte und Bestellungen häufig in unterschiedlichen Tabellen oder Dateien. Dadurch können doppelte Daten, unklare Lagerbestände und schwer nachvollziehbare Bestellungen entstehen.

Die API soll diese Informationen zentral, konsistent und geschützt bereitstellen.

## Zielgruppe

Die API richtet sich an:

- Mitarbeitende kleiner Handelsunternehmen;
- Administrator:innen;
- Entwickler:innen eines zukünftigen Web- oder Mobile-Clients.

## Geplanter Funktionsumfang

Die erste Version der API umfasst:

- Anmeldung mit E-Mail und Passwort;
- rollenbasierte Autorisierung;
- Verwaltung von Kunden;
- Verwaltung von Produkten;
- Verwaltung des Lagerbestands;
- Erstellung und Verwaltung von Bestellungen;
- Bestellungen mit mehreren Produkten;
- Suche, Filterung und Paginierung;
- Validierung der Eingabedaten;
- automatisierte Tests;
- Dokumentation und Deployment.

Nicht Bestandteil der ersten Version sind ein Frontend, Zahlungsabwicklung, PDF-Rechnungen und E-Mail-Versand.

## Datenmodell

Die wichtigsten Entitäten sind:

- `User`
- `Customer`
- `Product`
- `Order`
- `OrderItem`

Ein Kunde kann mehrere Bestellungen aufgeben. Eine Bestellung enthält eine oder mehrere Bestellpositionen. Jede Bestellposition verweist auf ein Produkt.

## Technologie-Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- Prisma
- Zod
- JSON Web Token
- bcrypt
- Vitest
- Supertest

## Aktueller Entwicklungsstand

## Dokumentation

- [Projektplan mit ER-Diagramm und Endpunkten](docs/PROJEKTPLAN.md)
- [Tagesplan bis zur Abgabe](docs/TAGESPLAN.md)

Folgende Funktionen sind bereits vorhanden:

- TypeScript-/Express-Grundgerüst;
- PostgreSQL-Datenbank und Prisma-Migration;
- zentrale Konfiguration und Fehlerbehandlung;
- Login mit bcrypt und JWT;
- Authentifizierung und Rollenprüfung;
- Kunden anlegen und nach ID abrufen;
- automatisierte API-Tests.

## API-Endpunkte

### Systemstatus prüfen

```http
GET /api/v1/health
```

## Lokale Datenbank

Die API verwendet PostgreSQL. Für die lokale Entwicklung wird die Datenbank mit Docker Compose gestartet.

PostgreSQL starten:

```bash
docker compose up -d
```

Status überprüfen:

```bash
docker compose ps
```

Die lokale Datenbank ist über Port `5433` erreichbar.

PostgreSQL stoppen:

```bash
docker compose down
```

Der Docker-Volume bleibt dabei erhalten.

## Umgebungsvariablen

Die lokale Konfiguration wird in einer `.env`-Datei gespeichert:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/kunden_bestell_api?schema=public"
```

Die Datei `.env` wird nicht in Git gespeichert. Als Vorlage dient `.env.example`.

## Prisma

Prisma Client generieren:

```bash
npm run db:generate
```

Lokale Migrationen erstellen und anwenden:

```bash
npm run db:migrate
```

Status der Migrationen überprüfen:

```bash
npm run db:status
```

Vorhandene Migrationen in einer Produktionsumgebung anwenden:

```bash
npm run db:deploy
```

Prisma Studio öffnen:

```bash
npm run db:studio
```

## Datenbankmodelle

Die Datenbank enthält folgende Modelle:

- `User`
- `Customer`
- `Product`
- `Order`
- `OrderItem`

Ein Kunde kann mehrere Bestellungen besitzen. Eine Bestellung enthält eine oder mehrere Bestellpositionen. Jede Bestellposition verweist auf ein Produkt.

## Authentifizierung und Rollen

Die Anmeldung erfolgt mit E-Mail und Passwort. Passwörter werden mit bcrypt gehasht. Nach erfolgreicher Anmeldung liefert die API einen JWT.

Geschützte Anfragen verwenden diesen Header:

```http
Authorization: Bearer <accessToken>
```

Rollen:

- `EMPLOYEE`: Kunden anlegen und lesen sowie eigene Benutzerdaten abrufen.
- `ADMIN`: dieselben Berechtigungen und zusätzlich die Benutzerliste abrufen.

Die aktuelle Benutzerrolle wird bei geschützten Anfragen aus der Datenbank gelesen.

### Lokale Testbenutzer

In `.env` konfigurieren:

```env
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="<eigenes Passwort mit mindestens 12 Zeichen>"
SEED_EMPLOYEE_EMAIL="employee@example.com"
SEED_EMPLOYEE_PASSWORD="<eigenes Passwort mit mindestens 12 Zeichen>"
```

Administrator erstellen:

```bash
npm run db:seed
```

Mitarbeiter erstellen:

```bash
npx tsx prisma/seed-employee.ts
```

Vorhandene Benutzer werden durch die Seed-Skripte nicht verändert.

Administrator-Passwort anhand der aktuellen `.env` ändern:

```bash
npx tsx prisma/change-admin-password.ts
```

Diese Zugangsdaten sind ausschließlich für die lokale Entwicklung vorgesehen.

## Implementierte Endpunkte

| Methode | Route                   | Zugriff    | Zweck                                      |
| ------- | ----------------------- | ---------- | ------------------------------------------ |
| GET     | `/api/v1/health`        | öffentlich | Erreichbarkeit prüfen                      |
| POST    | `/api/v1/auth/login`    | öffentlich | Anmelden und JWT erhalten                  |
| GET     | `/api/v1/auth/me`       | angemeldet | Aktuellen Benutzer abrufen                 |
| GET     | `/api/v1/auth/users`    | ADMIN      | Benutzerliste ohne Passwort-Hashes abrufen |
| POST    | `/api/v1/customers`     | angemeldet | Kunden anlegen                             |
| GET     | `/api/v1/customers/:id` | angemeldet | Kunden nach ID abrufen                     |

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@example.com",
  "password": "<lokales Passwort>"
}
```

Antwort: `200 OK`

```json
{
  "data": {
    "accessToken": "<JWT>",
    "tokenType": "Bearer",
    "user": {
      "id": "<UUID>",
      "email": "admin@example.com",
      "role": "ADMIN"
    }
  }
}
```

Fehler: `400` bei ungültigen Eingaben, `401` bei falschen Zugangsdaten und `429` bei zu vielen fehlgeschlagenen Anmeldeversuchen.

### Kunden anlegen

```http
POST /api/v1/customers
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "email": "anna.beispiel@example.com",
  "firstName": "Anna",
  "lastName": "Beispiel",
  "phone": "+49 123 456789"
}
```

Antwort: `201 Created`. Der Header `Location` enthält die Adresse des neuen Kunden.

```json
{
  "data": {
    "id": "3d6fa886-91f3-4223-a848-78d29a3880fa",
    "email": "anna.beispiel@example.com",
    "firstName": "Anna",
    "lastName": "Beispiel",
    "phone": "+49 123 456789",
    "createdAt": "2026-10-05T12:13:29.739Z",
    "updatedAt": "2026-10-05T12:13:29.739Z"
  }
}
```

`phone` ist optional. E-Mail-Adressen werden normalisiert und müssen eindeutig sein.

Fehler: `400` bei ungültigen Eingaben, `401` ohne gültigen Token und `409` bei einer bereits vorhandenen E-Mail-Adresse.

### Kunden abrufen

```http
GET /api/v1/customers/<UUID>
Authorization: Bearer <accessToken>
```

Antwort: `200 OK` mit derselben Kundenstruktur wie beim Anlegen.

Fehler: `400` bei ungültiger UUID, `401` ohne gültigen Token und `404`, wenn der Kunde nicht existiert.

### Aktuellen Benutzer abrufen

```http
GET /api/v1/auth/me
Authorization: Bearer <accessToken>
```

Antwort: `200 OK`

```json
{
  "data": {
    "id": "<UUID>",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

### Benutzerliste abrufen

```http
GET /api/v1/auth/users
Authorization: Bearer <accessToken>
```

Antwort: `200 OK`

```json
{
  "data": [
    {
      "id": "<UUID>",
      "email": "admin@example.com",
      "role": "ADMIN",
      "createdAt": "2026-10-05T10:00:00.000Z"
    }
  ]
}
```

Beide Routen liefern `401` ohne gültigen Token. Die Benutzerliste liefert zusätzlich `403`, wenn die Rolle nicht `ADMIN` ist.

## Fehlerformat

```json
{
  "error": {
    "code": "CUSTOMER_EMAIL_EXISTS",
    "message": "Ein Kunde mit dieser E-Mail-Adresse existiert bereits."
  }
}
```

Validierungsfehler enthalten zusätzlich ein Array `details` mit den betroffenen Feldern.

## Sicherheit

- Zentrale Validierung der Konfiguration und Eingabedaten mit Zod.
- Passwort-Hashing mit bcrypt.
- Signierte, zeitlich begrenzte JWTs mit HS256.
- Authentifizierung und rollenbasierte Autorisierung.
- Helmet für Sicherheitsheader.
- CORS für die konfigurierte Client-Origin.
- Allgemeines Rate Limit und zusätzliches Login-Limit.
- Keine Passwort-Hashes oder internen Stacktraces in API-Antworten.
- `.env` wird nicht in Git gespeichert.

## Automatisierte Tests

Tests ausführen:

```bash
npm test
```

Tests während der Entwicklung beobachten:

```bash
npm run test:watch
```

Die Tests prüfen HTTP-Verhalten, Login, JWT-Prüfung, Rollen, Kundenvalidierung und Fehlerfälle.

Der Prisma-Zugriff wird in diesen Tests ersetzt. PostgreSQL und ein laufender Entwicklungsserver sind dafür nicht erforderlich. Die Tests verändern keine lokalen Daten.

## Team

Einzelprojekt von: **Olha Khodakivska**

## Projektstatus

Das Projekt befindet sich in der Entwicklung.

Die URL des bereitgestellten Backends wird nach dem Deployment ergänzt.
