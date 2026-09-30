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

## Team

Einzelprojekt von: **Olha Khodakivska**

## Projektstatus

Das Projekt befindet sich in der Entwicklung.

Die URL des bereitgestellten Backends wird nach dem Deployment ergänzt.
