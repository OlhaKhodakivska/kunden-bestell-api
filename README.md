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

- TypeScript-Projektgrundgerüst;
- Express-Server;
- Health-Endpoint.

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

## Team

Einzelprojekt von: **Olha Khodakivska**

## Projektstatus

Das Projekt befindet sich in der Entwicklung.

Die URL des bereitgestellten Backends wird nach dem Deployment ergänzt.
