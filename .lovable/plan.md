
# Inhaltliche Aktualisierungen gemäß Konzept 2026

Basierend auf dem offiziellen Konzeptdokument müssen mehrere Inhalte auf der Website korrigiert und ergänzt werden.

---

## Übersicht der Änderungen

### 1. Punktevergabe (Modus-Seite) – KRITISCH

**Aktuell falsch:**
- Tabelle mit Schwierigkeitsgraden und festen Punkten (10-80+ Punkte pro Schwierigkeit)
- Flash-Bonus prozentual (+2 bis +16 Punkte)

**Korrekt laut Konzept:**
- **Zonenwertung:** 0 / 2,5 / 5 / 7,5 / 10 Punkte (je nach erreichter Zone)
- **Flash-Bonus:** +1 Punkt (pauschal)

Das bedeutet: Die Punkte werden pro Zone vergeben, nicht pro Schwierigkeitsgrad. Die bisherige Tabelle muss komplett ersetzt werden.

---

### 2. Wertungsklassen (Modus-Seite)

**Aktuell falsch:**
- Damen U18, Herren U18, Damen, Herren, Damen Ü40, Herren Ü40

**Korrekt laut Konzept - Hauptwertungsklassen (finalrelevant):**
- **U16** (unter 16 Jahre)
- **Ü16** (16–39 Jahre)
- **Ü40** (ab 40 Jahre)
- Jeweils weiblich & männlich

**Zusätzlich (ohne Finalrelevanz):**
- Altersklassenranglisten: U10, U12, U16, Ü16, Ü40, Ü50

---

### 3. Ligen-Schwierigkeitsbereiche (Modus-Seite)

**Neu hinzuzufügen:**
- Toprope-Liga: UIAA 5–9
- Vorstiegs-Liga: UIAA 5–10

---

### 4. Saisontermine (SeasonSection + Modus-Seite)

**Aktuell falsch:**
- Qualifikation: März – Oktober 2026
- Finale: November 2026

**Korrekt laut Konzept:**
- **Qualifikation:** 01.05.2026 – 13.09.2026
- **Finale:** Samstag, 03.10.2026

---

### 5. Finale-Details (Modus-Seite) – NEU

**Hinzuzufügen:**
- Top 30 je Wertungsklasse qualifizieren sich
- Wildcard-Plätze für alle, die alle Hallen besucht haben
- Verbindliche Anmeldung bis 27.09.2026
- Halbfinale: 5 Routen, max. 5 Min. pro Route, 10:00–16:00 Uhr
- Finale: Top 6 aus dem Halbfinale, je eine Finalroute

---

### 6. Etappenwertung (NEU – Modus-Seite)

**Konzept-Feature:**
- Monatliche Etappen mit Zwischenständen
- Etappensieger je Liga/Wertungsklasse
- Kleine Preise für Etappensieger

---

### 7. Hallen-Codes (Teilnahmebedingungen)

**Aktuell:**
- "Ein gültiger Hallenausweis ist erforderlich"

**Korrekt laut Konzept:**
- Ergebnisse können erst eingetragen werden, wenn ein hallenspezifischer Code vor Ort erhalten und im Account freigeschaltet wurde

---

### 8. Teilnehmende Hallen (Hallen-Seite)

**Aktuell:** Platzhalter-Hallen

**Laut Konzept bestätigt:**
- Canyon Chorweiler
- 2T Lindlar
- DAV Alpinzentrum Bielefeld
- Wupperwände Wuppertal
- Chimpanzodrome Frechen
- Kletterwelt Sauerland
- DAV Kletterzentrum Siegerland

---

## Technische Umsetzung

### Datei: `src/pages/Modus.tsx`

1. **Punktevergabe-Sektion komplett neu:**
   - Zonenwertung-Visualisierung (0 / 2,5 / 5 / 7,5 / 10)
   - Grafische Darstellung einer Route mit Zonen
   - Flash-Bonus: +1 Punkt

2. **Wertungsklassen aktualisieren:**
   - 6 Hauptklassen (U16, Ü16, Ü40 × m/w)
   - Hinweis auf zusätzliche Altersklassenranglisten
   - Erklärung Finalrelevanz

3. **Ligen-Bereich erweitern:**
   - Schwierigkeitsbereiche ergänzen (UIAA 5–9 / 5–10)

4. **Neue Sektion "Das Finale":**
   - Qualifikation, Wildcards, Anmeldung
   - Halbfinale- und Finale-Regeln

5. **Neue Sektion "Etappenwertung":**
   - Monatliche Zwischenstände
   - Etappensieger

6. **Teilnahmebedingungen aktualisieren:**
   - Wertungszeitraum korrigieren
   - Hallen-Code-System erklären

### Datei: `src/components/home/SeasonSection.tsx`

- Qualifikationszeitraum: "01.05. – 13.09.2026"
- Finale: "Samstag, 03.10.2026"

### Datei: `src/pages/Hallen.tsx`

- Platzhalter durch echte Hallen ersetzen (7 bestätigte Hallen)

### Datei: `src/pages/Ranglisten.tsx`

- Wertungsklassen in der Vorschau anpassen

---

## Zusammenfassung

| Bereich | Änderungstyp |
|---------|--------------|
| Punktevergabe | Komplett neu (Zonenwertung) |
| Wertungsklassen | Korrektur (U16/Ü16/Ü40) |
| Saisontermine | Korrektur (Mai–Sep, 03.10.) |
| Finale | Neue Sektion |
| Etappen | Neue Sektion |
| Hallen | Echte Daten |
| Teilnahme | Hallen-Code-System |
