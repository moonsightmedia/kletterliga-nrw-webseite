# Saisonfeedback 2026

Öffentliches, freiwilliges Formular: `https://www.kletterliga-nrw.de/feedback-2026`.
Es ist auch für den QR-Code auf den Fragebögen am Finaltag geeignet.

Die erste Fassung erfasste fünf Auswahlfragen und einen optionalen Kommentar.
Die zweite Fassung verzweigt nach Teilnahme: Nichtteilnehmende können mehrere Gründe
und ihre konkrete Hürde beschreiben; aktiv Teilnehmende benennen Stärken und Probleme.
Alle können ausführliche Vorschläge zu Anzahl und Art der Routen, Anzahl und Auswahl
der Hallen, Saisonverteilung, Streichstationen und ihrem wichtigsten Wunsch für 2027
einreichen. Nur die Perspektive, bei Nichtteilnahme ein Grund und der wichtigste Wunsch
sind in der zweiten Fassung Pflicht. Das Formular fragt keinen Namen, keine E-Mail-Adresse und keine Profil-ID
ab. Die Antworten liegen in `public.season_feedback_2026` und werden nicht mit
Teilnehmerprofilen verbunden. Bestehende Antworten bleiben mit `survey_version = 1`
erhalten; die neuen Angaben liegen versioniert als `details`-Objekt vor.

Die dritte Fassung trennt Saison- und Finalteilnahme. Aktive Kletternde können angeben,
ob sie am Finale teilnehmen und bei Nein/Unsicherheit freiwillig Gründe und Details nennen.
Nichtteilnehmende sehen eine neutral formulierte Frage; Unkenntnis der Liga ist ein
eigener Grund. Bei technischen Saisonhürden gibt es eine gezielte, freiwillige Nachfrage.
Wer die Liga kaum verfolgt hat, muss keinen spekulativen Wunsch für 2027 formulieren.
Nur für die beiden informierten Zweige bleibt der wichtigste Wunsch Pflicht.
Die zusätzlichen Antworten werden als `survey_version = 3` gespeichert; V1/V2 bleiben
lesbar und während des Rollouts weiterhin serverseitig gültig.

Die vierte Fassung fragt zuerst offen nach der wichtigsten Änderung für 2027 und
trennt aktive Teilnehmende, informierte Nichtteilnehmende, spät Informierte sowie
Zuschauende/Begleitpersonen. Nur informierte Nichtteilnehmende wählen einen
Hauptgrund; technische Hürden können sie freiwillig erläutern. Eine Frage zum
Halbfinale erscheint nur für aktive Teilnehmende und wird erst nach bestätigter
Startberechtigung vertieft. Nach dem Finaltag wechseln die Antworttexte zur
Vergangenheit. Die weiteren Themen (Saisonrouten, Hallenpool und Besuchspflicht,
Zeit pro Hallenstation, Streichen einer schwachen Hallenwertung) sind freiwillig
und erscheinen nur nach Auswahl. Hallen auslassen und Wertungen streichen werden
als unterschiedliche Regeln behandelt. Die Antwort wird als `survey_version = 4`
mit einem validierten `details`-Objekt gespeichert; ältere Versionen bleiben lesbar.

Direkter Tabellenzugriff für `anon` und `authenticated` ist entzogen. Nur die Edge
Function `submit-season-feedback` schreibt mit der serverseitigen Service Role.
Sie prüft erlaubte Antwortwerte, Themenauswahl, Freitextlängen, einen Honeypot und
die Mindest-Ausfüllzeit. Während des Rollouts akzeptiert sie auch die alte Fassung,
damit bereits geöffnete Formulare nicht scheitern.
Für den V4-Rollout müssen zuerst die noch offenen Datenbankmigrationen angewendet werden,
dann die abwärtskompatible Edge Function veröffentlicht werden und zuletzt die
Website. Andernfalls würde die V4-Übermittlung abgewiesen.
Das instanzlokale IP-Limit von 300 Anfragen pro Stunde berücksichtigt gemeinsam
genutztes Hallen-WLAN. Es ist nur ein Basisschutz, keine garantierte Deduplizierung
und keine dauerhafte Sperre. IP-Adressen werden nicht mit den Antworten gespeichert.

Auswertung und Export nur mit berechtigtem Server-/Adminzugriff. Freitext vor Weitergabe
auf freiwillig eingegebene personenbezogene Angaben prüfen. Nach Abschluss der
Saisonauswertung alle Antworten spätestens am **31.03.2027** löschen; die Löschung
ist ein expliziter organisatorischer Folgeschritt und noch nicht automatisiert.

Der Feedback-Link kann öffentlich und auf Papier beworben werden. Eine E-Mail mit
Nachmeldeangebot und Feedbackfrage an alle nicht angemeldeten Teilnehmenden braucht
eine gesondert geprüfte Versandgrundlage; die Existenz des Formulars schafft diese
nicht. Der einzige zulässige sichtbare Absender für Kletterliga-Mails ist
`info@kletterliga-nrw.de`.
