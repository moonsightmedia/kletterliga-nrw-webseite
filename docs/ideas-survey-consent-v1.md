# Ideen 2027 – Einwilligungstext Version 1

Historisches lokales Archiv, nie produktiv veröffentlicht. Für den ersten Livegang gilt Version 2 (`docs/ideas-survey-consent-v2.md`) mit bestätigter Teilnahme ab 16. Nicht Version 1 an produktive Clients ausliefern.

14.10.2026, lokal vorbereitet. Version: `1`. Änderungen des Textes/Zwecks benötigen eine neue Version und Prüfung. Keine Rechtsfreigabe durch die Dokumentation.

## Aktuelle Popup-Darstellung

Die Einwilligung steht jetzt in einem kompakten modalen Popup über der sichtbaren, nativ deaktivierten ersten Frage. Es öffnet beim Erreichen des Umfrageabschnitts, nicht bereits über dem Hero. Kreuz, Escape oder Hintergrundklick schließen ohne Zustimmung; danach öffnet „Umfrage starten“ es erneut. Keine erneute automatische Öffnung nach dem Schließen. Radix Dialog übernimmt Fokusbindung, Hintergrundsperre und Rückkehr zum Startbutton. Nach Zustimmung erhält die erste Frage den Fokus.

Kurzfassung vor „Einverstanden – Umfrage starten“, Datenschutz-/Widerrufslinks und aufklappbarer vollständiger Text darunter. Keine neue Text-/Zweckfassung, weiterhin Version 1. Schließen und Öffnen erzeugen keine Speicherung; auch Zustimmung alleine noch keinen Request. Kein separater Nichtteilnahmebutton.

## Frühere Inline-Darstellung (ersetzt)

Darstellung seit kompakter Layout-Revision: Vor dem Startbutton steht die Kurzfassung „Die Kletterliga GbR speichert und nutzt deine Antworten für die Planung 2027 – ab der ersten Auswahl, auch bei Abbruch. Freiwillig und jederzeit widerruflich.“. Der vollständige unveränderte Text unten ist vor dem Start über „Details zur Einwilligung“ erreichbar; Links und Details stehen unter den Start-/Nichtteilnahmebuttons. Keine zusätzliche große Unterüberschrift. Umfang, Zweck, Textfassung des vollständigen Einwilligungstextes und Version bleiben unverändert.

Aktuellste Darstellung: „Nicht teilnehmen“ auf ausdrücklichen Wunsch entfernt. Nicht starten übermittelt weiterhin keine Antworten. Erste Frage unmittelbar unter dem Einwilligungsblock sichtbar, bis zum Start nativ deaktiviert; Antworten erst nach ausdrücklichem Start möglich. Die weiter unten beschriebenen beiden Buttons dokumentieren die ursprüngliche Darstellung, nicht den aktuellen DOM.

## Vollständige Textfassung (aufklappbar)

Ich bin einverstanden, dass die Kletterliga GbR meine Auswahlantworten und freiwilligen Ideentexte für die Planung der Saison 2027 speichert und auswertet.

Die Speicherung beginnt mit der ersten Antwort. Auch wenn ich vorzeitig aufhöre, werden meine bisherigen Antworten ausgewertet.

Buttons: „Einverstanden – Umfrage starten“ und „Nicht teilnehmen“.

Mit dem Start stimmst du der beschriebenen Speicherung und Auswertung zu. Freiwillig und jederzeit widerruflich.

Direkte Links: Datenschutzhinweise (neuer Tab) und Einwilligung widerrufen.

## Details – Datenschutz & Widerruf

Die Teilnahme ist freiwillig und hat keinen Einfluss auf meine Liga-Teilnahme. Ich kann meine Einwilligung jederzeit für die Zukunft widerrufen und meine Antworten entfernen lassen.

Keine Kontoverknüpfung, keine abgefragten Namen oder E-Mail-Adressen. Bitte keine personenbezogenen Angaben in die Ideentexte. Einzelantworten löschen wir nach der Planung, spätestens am 31.03.2027.

Während der Umfrage kannst du mit einem Klick widerrufen. Für später kannst du einen vertraulichen Widerrufscode herunterladen. Technische Zugriffsdaten können beim Hosting anfallen.

## Technische Dokumentation

Einwilligung wird im Arbeitsspeicher nach dem ausdrücklichen Start gesetzt, ohne Request und ohne Browser-Storage. Der erste Antwort-Request enthält `{accepted:true,version:1}`. Datenbank dokumentiert diese Version und den ersten serverseitigen Empfang (`consent_recorded_at`), nicht einen verifizierten tatsächlichen Klickzeitpunkt. Keine Antwort wird ohne gültige Einwilligungsangabe akzeptiert. Nachträgliche Updates überschreiben den ersten Empfang nicht. Löschung benötigt Besitznachweis, keine neue Einwilligung. Gesperrte, antwortlose Tombstones inklusive Nachweismetadaten brauchen einen bestätigten Retention-/Löschprozess.
