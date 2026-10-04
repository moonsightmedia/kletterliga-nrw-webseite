# Digitale Urkunden 2026

## Veröffentlichung

1. Migration `20260930120000_digital_certificates.sql` vor dem Frontend ausrollen.
2. SQL-Integrationstest `supabase/tests/digital_certificates.sql` in einer isolierten Testdatenbank nach den Migrationen ausführen. Der Test verwendet synthetische Daten und endet mit `rollback`.
3. Profil und Admin-Wettkampftag nach dem Frontend-Release mit einem berechtigten sowie einem unberechtigten Testprofil prüfen.
4. Quali-Urkunden erscheinen nach Saisonende für aktivierte Teilnehmende mit mindestens einem gewerteten Routenergebnis. Das Finale bleibt zunächst gesperrt.
5. Am Finalevent-Tag nach Ende der Eingabe die Platzierungen prüfen, die Eingabe schließen und jede Finalklasse nach Papierabgleich auf „Endgültig“ setzen. Erst dann im Liga-Adminbereich die Finalevent-Urkunden freigeben. Bei späteren Korrekturen nach erneuter Prüfung „Urkundenstand aktualisieren“ nutzen.

Die Finalevent-Urkunde nutzt für gewertete Finalisten exakt die serverseitige Finalrangliste (`competition_final_rankings`). Alle übrigen mit Halbfinalergebnissen erhalten eine ausdrücklich als „Halbfinale“ bezeichnete Urkunde. AW-Teilnahmen erhalten keine reguläre Platzierung. Der Snapshot speichert `scoring_stage`; Reopens und Finalkorrekturen markieren den Urkundenstand als veraltet. Fehlende Ergebnisse, ungeklärte Zwischenfälle oder Papierabgleiche blockieren die Veröffentlichung.

## Daten und Dateien

`get_my_certificates` liefert nur den eigenen Urkundenstand. Die Finalevent-Freigabe speichert Name, Disziplin, Klasse und Platz als Version in `finale_certificates`. Nur die Liga-Administration darf den Stand veröffentlichen. Die Quali-Platzierung wird aus dem abgeschlossenen Quali-Zeitraum berechnet; punktgleiche Personen teilen sich einen Platz.

Das A4-PDF und die Social-Bilder werden im Browser aus denselben Daten erstellt. Teilnehmende wählen ein Beitragsbild im Format 4:5 oder ein Story-Bild im Format 9:16. Die gewählte PNG-Datei wird an die Geräte-Teilenfunktion übergeben; falls dies nicht möglich ist, lädt die App sie herunter. Der Browser kann Instagram nicht direkt auf Beitrag oder Story festlegen. Diese Auswahl erfolgt nach dem Teilen in Instagram. Es gibt keinen öffentlichen Urkundenlink.
