# Stitch-Abgleich App

Stand: 25.03.2026
Projekt: `Mein Profil` (`3630402656427266070`)

## Aktuelle Zuordnung

| Stitch-Screen | ID | App-Route | Datei | Status |
| --- | --- | --- | --- | --- |
| Registrierung Schritt 1 | `c0bb3cf1e5014472b020d9355d7e4583` | `/app/register` | `src/app/pages/auth/Register.tsx` | integriert |
| Registrierung Schritt 2 | `603178feb2a743118d0faf688662d556` | `/app/register` | `src/app/pages/auth/Register.tsx` | integriert |
| Registrierung Schritt 3 | `bce8eba576704232a1e0ad3a8636b7b9` | `/app/register` | `src/app/pages/auth/Register.tsx` | integriert |
| Login Seite | `a3419861bd7d42808a26f95f5d26eea1` | `/app/login` | `src/app/pages/auth/Login.tsx` | integriert |
| Dashboard Home V5 (Mit Glocke) | `43e86455694a475a891f4d42dc35d323` | `/app` | `src/app/pages/participant/Home.tsx` | integriert |
| Code einlösen | `537845595014404dac1f1b39244e94ca` | `/app/gyms/redeem` | `src/app/pages/participant/GymRedeem.tsx` | neu integriert |
| Hallen Übersicht (Ohne Menü) | `accc501f60054f5e854857590761f768` | `/app/gyms` | `src/app/pages/participant/Gyms.tsx` | verifiziert, bereits integriert |
| Rangliste mit Filtern | `87aa9b7c93914938b9ce00a4b4f838d7` | `/app/rankings` | `src/app/pages/participant/Rankings.tsx` | verifiziert, bereits integriert |
| Hallen Ergebnisse Detail | `726eaa1b69f040fbb2c82da244a1f40b` | `/app/gyms/:gymId/routes` | `src/app/pages/participant/GymRoutes.tsx` | neu integriert |
| Mein Profil (Ohne Menü) | `1a74ffdbb266460594c1b9820f4ac157` | `/app/profile` | `src/app/pages/participant/ProfileScreen.tsx` | verifiziert, bereits integriert |
| Mastercode Freischalten V1 | `a0dfe5eee9f84a9a8472648081a74a91` | `/app/participation/redeem` | `src/app/pages/participant/MastercodeRedeem.tsx` | neu integriert |
| Hallen-Details: Superblock | `9fe50ef66941460fa61d6ee16fa81235` | `/app/gyms/:gymId` | `src/app/pages/participant/GymDetail.tsx` | neu integriert |

## Wichtige Mapping-Entscheidungen

- `Hallen Ergebnisse Detail` wurde bewusst auf `GymRoutes.tsx` gemappt.
  Der Stitch-Screen zeigt eine Hallenübersicht plus Route-Log und passt damit fachlich auf die Routen-/Ergebnisübersicht einer Halle, nicht auf das einzelne Ergebnisformular.
- `Registrierung Schritt 3` bleibt Teil des Flows, obwohl er in der letzten User-Liste nicht erneut genannt wurde.
  Der Live-Registrierungsprozess hat weiterhin drei Schritte und der Screen ist weiterhin im Stitch-Projekt vorhanden.

## Fehlende Stitch-Screens

Diese App-Seiten haben aktuell keinen eigenen Stitch-Screen und werden deshalb im gleichen Designsystem frei abgeleitet:

- `/app/gyms/:gymId/routes/:routeId/result`
  Datei: `src/app/pages/participant/ResultEntry.tsx`
  Status: im Stitch-Stil umgesetzt, aber ohne direkte Stitch-Vorlage
- `/app/age-group-rankings`
  Datei: `src/app/pages/participant/AgeGroupRankings.tsx`
- `/app/finale`
  Datei: `src/app/pages/participant/Finale.tsx`
- `/app/register/success`
  Datei: `src/app/pages/auth/RegisterSuccess.tsx`
- `/app/auth/confirm`
  Datei: `src/app/pages/auth/EmailConfirm.tsx`
- `/app/auth/reset-password`
  Datei: `src/app/pages/auth/ResetPassword.tsx`
- `/app/invite/gym/:token`
  Datei: `src/app/pages/auth/GymInvite.tsx`
- alle `FeatureLocked`-Zustände
  Datei: `src/app/pages/participant/FeatureLocked.tsx`

## Fehlende Daten oder Zustände in Stitch

Diese Dinge tauchen in den Stitch-Vorlagen nicht oder nur als Platzhalter auf und mussten im Produkt separat berücksichtigt werden:

- QR-Scanner für Hallencode und Mastercode
- Validierungs-, Fehler-, Loading- und Success-Zustände für Formulare
- aktivierter Zustand für den Mastercode-Flow
- Detailformular für ein einzelnes Routenergebnis
- Change-Request-Flow für Liga-/Geschlechtsänderungen im Profil
- Passwort-Reset, E-Mail-Bestätigung und Invite-Flow
- Prelaunch-/Feature-Lock-Zustände

## Fehlende Daten im aktuellen App-Modell gegenüber Stitch

Diese visuellen Elemente sind in Stitch angelegt, können aber aus den aktuellen App-Daten noch nicht 1:1 gespeist werden:

- Hallen-Coverfotos für die Hallenübersicht
- große Hero-Innenraumfotos je Halle
- echte Kartendarstellung oder Geo-Kacheln für Hallen
- Live-Auslastung oder `Current Load`
- Hallen-Sektoren/Zonen mit eigenen Namen und Beschreibungen
- Fresh-Set-Zeitstempel pro Route
- detaillierte Profil-Avatar-/Medienwelt für alle Ranglisten-Einträge
- Benachrichtigungseinstellungen mit echtem Backend

## Absichtlich nicht umgesetzt

Diese Stitch-Elemente sind aktuell bewusst nicht als echte Funktion gebaut, weil dafür keine Produktlogik existiert:

- Login mit Google oder Apple
- Pro-/Upgrade-/Abo-Teaser als echte Funktion
- Social-/Community-Features ohne Backend
- generische englische Placeholder-Texte aus Stitch

## Bereits umgesetzte App-Erweiterungen außerhalb von Stitch

- lokaler Feature-Unlock für `localhost`, damit Hallen und Ranglisten in der Entwicklung offen sind
- QR-Scanner-Dialoge für Codes
- Glocke oben rechts als Benachrichtigungs-Placeholder in der Participant-Topbar
- produktnahe Ergebnis-Erfassung inklusive Bewertung und Feedback

