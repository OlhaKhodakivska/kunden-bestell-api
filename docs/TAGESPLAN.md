# Tagesplan vom 30.09.2026 bis 19.10.2026

## Arbeitsweise

Das Projekt wird als Einzelprojekt entwickelt.

Jeder Arbeitstag beginnt mit einem Planungsupdate zwischen 09:00 und 10:00 Uhr und endet mit einem ehrlichen Fortschrittsupdate. Nach jeder größeren Funktion werden Tests ausgeführt und Änderungen in Git dokumentiert.

## Täglicher Projektplan

| Datum      | Schwerpunkt                  | Geplantes Ergebnis                                                                                              |
| ---------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 30.09.2026 | Projektstart und Planung     | Lokales Git-Repository, TypeScript-/Express-Grundgerüst, README, Projektplan, ERD und Endpunktentwurf erstellen |
| 01.10.2026 | Datenbank vorbereiten        | PostgreSQL und Prisma einrichten, Datenbankschema ergänzen und erste Migration ausführen                        |
| 02.10.2026 | Projektarchitektur           | Modulstruktur, Umgebungsvariablen, Prisma-Client, Fehlerklassen und Middleware vorbereiten                      |
| 03.10.2026 | Authentifizierung            | Benutzer-Seed, Passwort-Hashing, Login und JWT-Erzeugung implementieren                                         |
| 04.10.2026 | Autorisierung und Sicherheit | Auth-Middleware, Rollenprüfung, CORS, Helmet und Rate Limiting ergänzen                                         |
| 05.10.2026 | Kundenverwaltung I           | Kunden anlegen und einzelne Kunden lesen, Validierung und positive Tests ergänzen                               |
| 06.10.2026 | Kundenverwaltung II          | Kundensuche, Paginierung, Aktualisierung und Löschregeln implementieren                                         |
| 07.10.2026 | Produktverwaltung I          | Produkte anlegen und lesen, SKU-, Preis- und Lagerbestandvalidierung ergänzen                                   |
| 08.10.2026 | Produktverwaltung II         | Produktsuche, Filter, Paginierung, Aktualisierung und Deaktivierung implementieren                              |
| 09.10.2026 | Bestellungen I               | Bestellung mit mehreren Bestellpositionen transaktional erstellen                                               |
| 10.10.2026 | Bestellungen II              | Lagerbestand prüfen und aktualisieren sowie Rollback- und Konfliktfälle testen                                  |
| 11.10.2026 | Bestellungen III             | Bestellliste, Detailansicht, Statusfilter und erlaubte Statuswechsel implementieren                             |
| 12.10.2026 | Erstes Deployment            | Produktionsdatenbank konfigurieren und einen ersten Deployment-Test durchführen                                 |
| 13.10.2026 | Integrationstests            | Kritische Abläufe sowie Validierungs-, Fehler- und Autorisierungsfälle testen                                   |
| 14.10.2026 | API-Dokumentation            | Alle Endpunkte mit Request-, Response- und Fehlerbeispielen dokumentieren                                       |
| 15.10.2026 | Codequalität                 | TypeScript-, Lint- und Testfehler beseitigen, Code refaktorieren und Antworten vereinheitlichen                 |
| 16.10.2026 | Deployment absichern         | Migrationen, Umgebungsvariablen, CORS, Logs und Produktionsstart überprüfen                                     |
| 17.10.2026 | Installationstest            | Projekt anhand der README in einer sauberen Umgebung installieren und gefundene Fehler beheben                  |
| 18.10.2026 | Projektabnahme               | Definition of Done prüfen, Live-API testen und technische Interviewfragen vorbereiten                           |
| 19.10.2026 | Abgabe und Puffer            | Letzte Tests durchführen, GitHub- und Deployment-Links prüfen und Projekt vor 23:59 Uhr abgeben                 |

## Täglicher Ablauf

1. Zwischen 09:00 und 10:00 Uhr: Planung, drei Hauptaufgaben, Risiko und Gegenmaßnahme an die Lehrkraft senden.
2. Wichtigste Tagesaufgabe implementieren.
3. Passende Tests und Dokumentation ergänzen.
4. Änderungen lokal überprüfen und mit Git dokumentieren.
5. Spätestens um 23:59 Uhr: Fortschritt, Erkenntnis und Priorität für morgen senden.

## Umgang mit Abweichungen

Wenn eine geplante Aufgabe nicht abgeschlossen werden kann, wird dies im täglichen Fortschrittsupdate ehrlich dokumentiert. Der Grund, der aktuelle Blocker und der nächste konkrete Schritt werden genannt.

Optionale Funktionen werden erst begonnen, wenn alle Anforderungen des MVP erfüllt sind.
