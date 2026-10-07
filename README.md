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

- Produkte anlegen und nach ID abrufen;

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

- `EMPLOYEE`: Kunden suchen, anlegen, lesen und aktualisieren sowie eigene Benutzerdaten abrufen.
- `ADMIN`: dieselben Berechtigungen und zusätzlich Kunden ohne Bestellungen löschen sowie die Benutzerliste abrufen.

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
| GET     | `/api/v1/customers`     | angemeldet | Kunden suchen und paginieren               |
| PATCH   | `/api/v1/customers/:id` | angemeldet | Kundendaten teilweise ändern               |
| DELETE  | `/api/v1/customers/:id` | ADMIN      | Kunden ohne Bestellungen löschen           |
| POST    | `/api/v1/products`      | angemeldet | Produkt anlegen                            |
| GET     | `/api/v1/products/:id`  | angemeldet | Produkt nach ID abrufen                    |

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

### Kunden suchen und paginieren

```http
GET /api/v1/customers?search=anna&page=1&limit=5
Authorization: Bearer <accessToken>
```

Die Suche berücksichtigt Vorname, Nachname und E-Mail unabhängig von Groß- und Kleinschreibung.

Parameter:

- `search`: optionaler Suchtext, 1–100 Zeichen.
- `page`: Seitennummer, standardmäßig 1, maximal 100000.
- `limit`: Einträge pro Seite, standardmäßig 10, maximal 100.

Antwort: `200 OK`

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 0,
    "totalPages": 0
  }
}
```

`data` enthält die gefundenen Kunden. Ungültige Parameter liefern `400`, ein fehlender oder ungültiger Token liefert `401`.

### Kunden aktualisieren

```http
PATCH /api/v1/customers/<UUID>
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "phone": "+49 987 654321"
}
```

Nur übergebene Felder werden geändert. Mit `"phone": null` wird die Telefonnummer entfernt. Ein leeres Objekt wird abgelehnt.

Antwort: `200 OK` mit dem aktualisierten Kunden in `data`.

Fehler: `400` bei ungültigen Eingaben oder UUID, `401` ohne gültigen Token, `404` bei fehlendem Kunden und `409` bei bereits vergebener E-Mail-Adresse.

### Kunden löschen

```http
DELETE /api/v1/customers/<UUID>
Authorization: Bearer <accessToken>
```

Nur `ADMIN` darf Kunden löschen. Kunden mit Bestellungen bleiben erhalten.

Antwort: `204 No Content` ohne Antwortkörper.

Fehler:

- `400`: ungültige UUID.
- `401`: fehlender oder ungültiger Token.
- `403`: unzureichende Berechtigung.
- `404`: Kunde nicht gefunden.
- `409`: Kunde besitzt Bestellungen.

Beispiel für einen Löschkonflikt:

```json
{
  "error": {
    "code": "CUSTOMER_HAS_ORDERS",
    "message": "Kunden mit Bestellungen können nicht gelöscht werden."
  }
}
```

### Produkt anlegen

```http
POST /api/v1/products
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "sku": "tasse-001",
  "name": "Keramiktasse",
  "description": "Weiße Keramiktasse, 300 ml",
  "priceCents": 1999,
  "stock": 20
}
```

Antwort: `201 Created`. Der Header `Location` enthält die Adresse des neuen Produkts.

```json
{
  "data": {
    "id": "005b0c6e-1474-463d-98da-d686d265d237",
    "sku": "TASSE-001",
    "name": "Keramiktasse",
    "description": "Weiße Keramiktasse, 300 ml",
    "priceCents": 1999,
    "stock": 20,
    "active": true,
    "createdAt": "2026-10-07T07:31:48.253Z",
    "updatedAt": "2026-10-07T07:31:48.253Z"
  }
}
```

Validierungsregeln:

- SKU: 1–50 Zeichen, Buchstaben und Zahlen mit optionalen trennenden Bindestrichen; wird in Großbuchstaben gespeichert und muss eindeutig sein.
- Name: 1–150 Zeichen.
- Beschreibung: optional, 1–2000 Zeichen.
- Preis: positive ganze Zahl in Cent; `1999` entspricht 19,99 Euro.
- Lagerbestand: nicht negative ganze Zahl; Standardwert ist `0`.
- Aktivstatus: Boolean; Standardwert ist `true`.
- Preis und Lagerbestand dürfen maximal `2147483647` betragen.
- Unbekannte Felder werden abgelehnt.

Fehler: `400` bei ungültigen Eingaben, `401` ohne gültigen Token und `409` bei bereits vorhandener SKU.

Beispiel für einen SKU-Konflikt:

```json
{
  "error": {
    "code": "PRODUCT_SKU_EXISTS",
    "message": "Ein Produkt mit dieser SKU existiert bereits."
  }
}
```

### Produkt abrufen

```http
GET /api/v1/products/<UUID>
Authorization: Bearer <accessToken>
```

Antwort: `200 OK` mit derselben Produktstruktur wie beim Anlegen.

Fehler: `400` bei ungültiger UUID, `401` ohne gültigen Token und `404`, wenn das Produkt nicht existiert.

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
