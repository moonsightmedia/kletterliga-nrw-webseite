# Ideen 2027 – Produktions-Preflight

Stand 14.10.2026. Janosch hat den Livegang ausdrücklich erneut auf dem vorhandenen Hobby-Tarif beauftragt („nein, stell so live“). Kein Upgrade, keine Vertragsunterzeichnung und kein Hostingwechsel. Die nicht bestätigte Vercel-Tarif-/Vertragsgrundlage bleibt ein dokumentiertes Betreiber-Risiko; nicht als Anbieterfreigabe oder Rechtsprüfung ausgeben.

## Aktueller Release-Stand (ersetzt den historischen Preflight unten)

Backend produktiv: drei exakt benannte Migrationen einschließlich Retention und Einwilligung Version 2 angewendet; neue Function deployt. Bestehende Daten/Functions nicht verändert. 49 isolierte SQL-Prüfungen, vollständiger Live-SQL-Smoketest mit Rollback, identischer Test beim Commit und 14 echte Edge-HTTP-Prüfungen erfolgreich. Synthetische Fixture ausschließlich nach positivem UUID-/Hash-Besitznachweis permanent entfernt. Keine echte Stimme gespeichert.

Frontend: Build und 544 Tests/107 Dateien bestanden. Fehlende Typunterstützung für `exact` in Testing-Library-Aufrufen anschließend mechanisch korrigiert; weitere 59 Survey-Tests/6 Dateien erfolgreich. Gefilterter Typecheck zeigt keine Fehler in den neuen Umfrage-/angepassten Seiten-Dateien. Übrige bekannte globale Alt-Typefehler nicht Bestandteil dieses Releases. Veröffentlichungsnachweis nach Merge im gerätespezifischen Abschluss-Handoff.

Ab 16: kompakte Selbstauskunft im Startpopup, keine Geburtsdatenerhebung. Consent-Version 2 bindet den neuen Text in UI/API/SQL; archiviert in `docs/ideas-survey-consent-v2.md`. Kein geprüftes Alter behaupten.

Automatischer Produktiv-Purge bis 31.03.2027 (20:00 UTC/22:00 Berlin), stündlicher Job. Backupdaten separat begrenzt aufbewahrt und nicht ausgewertet; nach Restore vor Freigabe Purge anwenden. Technische Providerlogs bleiben eigener Betriebsprozess, nicht mit individuellen Stimmen verknüpft.

## Live verifiziert

- Frisch `git fetch origin`, HEAD und origin/main identisch auf `69ac8b1a687bbe4e6a473be21330cc9740113139`; bestehende Featureänderungen unveröffentlicht.
- Kanonisches Vercel-Team im Kletterliga-Chromeprofil: `kletterliga-nrws-projects`, Projekt `kletterliga-nrw-webseite`. Produktion `33rYDMF7c8cCwwCas6WFgEX8MRUS`, Ready, main/69ac8b1, Domain `www.kletterliga-nrw.de`, Tarif Hobby. Das im alten Project Brief genannte Moonsight-Projekt wurde bereits gelöscht; nicht verwenden oder neu erstellen.
- Supabase-CLI: `ssxuurccefxfhxucgepo`, ACTIVE_HEALTHY, `eu-west-1` (Irland), Organisation `tzrqodbivrjjsutskddp`.
- PostgREST-Abfrage nur `submission_id`, `limit=0`, Service-Rolle ausschließlich zur Laufzeit aus Bitwarden: neue Survey-Tabelle liefert 404. Kein personenbezogener Antwortdatensatz gelesen. Function-Inventar enthält `submit-ideas-survey-2027` nicht.
- Supabase-Organisationsdashboard Legal Documents erklärt: DPA ist in Nutzungsbedingungen enthalten, keine separate Unterzeichnung erforderlich. Keine Vereinbarung unterzeichnet oder Kontoeinstellung verändert.
- Aktuelle [Vercel-DPA](https://vercel.com/legal/dpa), Fassung 17.03.2026, Ziffer 1: Standard-DPA gilt für Pro-/Enterprise-Kunden. Eine wirksame abweichende Vereinbarung für das vorhandene Hobby-Team ist nicht nachgewiesen. Keine automatische Tarifänderung autorisiert.

## Lokale Korrektur

Pauschale, falsche Behauptung „Server befinden sich in Deutschland“ in `src/data/legal.ts` durch tatsächliche Provider und primäre Datenbankregion ersetzt; keine ausschließliche EU-Verarbeitung versprochen. Grammatik „unser freiwillige Einwilligung“ zu „deine freiwillige Einwilligung“ korrigiert. Keine Rechtsfreigabe und keine Vertragserfüllung aus diesen Textänderungen ableiten.

Quellen: [Supabase-Regionen](https://supabase.com/docs/guides/platform/regions), [DPA](https://supabase.com/legal/customer-resources/data-processing-addendum), [Residency-/Transfer-FAQ](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq), Vercel-DPA und authentifizierte Live-Dashboards.

## Betreiberentscheidungen vor Datenerhebung

Janosch hat am 14.10.2026 ausdrücklich bestätigt: Teilnahme ab 16 Jahren und Löschung aller Einzelantworten einschließlich Widerrufsdatensätzen spätestens 31.03.2027. Dies ist die verbindliche Betreiberentscheidung, nicht bloß ein Vorschlag. Altersbestätigung und Löschprozess sind technisch noch umzusetzen; das bisherige Standardformular enthält noch keine Altersregel.

Auf die Frage nach AV-Vereinbarungen antwortete Janosch „Noch nicht / weiß ich nicht“. Bei Supabase ist die Vertragsintegration unabhängig davon durch das Dashboard/aktuelle DPA geklärt. Bei Vercel bleibt eine passende Grundlage für das Hobby-Team unbestätigt. Keine Zustimmung zu Tarifwechsel, Kauf, Vertragsunterzeichnung oder Hostingmigration daraus ableiten.

Vercel-Vertragsbasis klären: Nachweis einer bestehenden passenden Vereinbarung oder separate Betreiberentscheidung für Pro-/Enterprise bzw. anderes Hosting. Keine Kostenentscheidung, Vertragsunterzeichnung oder Migration ohne passenden Auftrag.

Retention technisch umsetzen und testen (noch keine Löschautomation), Backup-Retention und Restore mit erneutem Löschen berücksichtigen. Supabase-Migrationen vor Live gegen tatsächlichen Schema-Stand kontrolliert prüfen; kein pauschales db push. Echte Speicher-/Widerrufsverifikation erst in isolierter Testumgebung mit eindeutig synthetischen Stimmen, nicht mit echten Teilnehmermeinungen. Dann exakt getestetes Feature über bestätigten Git-main-Publikationsweg ausrollen und Browser-Liveprüfung durchführen.
