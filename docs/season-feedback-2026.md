# Saisonfeedback 2026

Öffentliches, freiwilliges Formular: `https://www.kletterliga-nrw.de/feedback-2026`.
Es ist auch für den QR-Code auf den Fragebögen am Finaltag geeignet.

Die fünf Auswahlfragen erfassen Teilnahmeart, Gesamteindruck (1–5), größte Stärke,
wichtigsten Verbesserungsbereich und Interesse an 2027. Ein Kommentar bis 1000 Zeichen
ist optional. Das Formular fragt keinen Namen, keine E-Mail-Adresse und keine Profil-ID
ab. Die Antworten liegen in `public.season_feedback_2026` und werden nicht mit
Teilnehmerprofilen verbunden.

Direkter Tabellenzugriff für `anon` und `authenticated` ist entzogen. Nur die Edge
Function `submit-season-feedback` schreibt mit der serverseitigen Service Role.
Sie prüft erlaubte Antwortwerte, Länge, einen Honeypot und die Mindest-Ausfüllzeit.
Das instanzlokale IP-Limit von drei Anfragen pro Stunde ist nur ein Basisschutz, keine
garantierte Deduplizierung und keine dauerhafte Sperre. IP-Adressen werden nicht mit
den Antworten gespeichert.

Auswertung und Export nur mit berechtigtem Server-/Adminzugriff. Freitext vor Weitergabe
auf freiwillig eingegebene personenbezogene Angaben prüfen. Nach Abschluss der
Saisonauswertung alle Antworten spätestens am **31.03.2027** löschen; die Löschung
ist ein expliziter organisatorischer Folgeschritt und noch nicht automatisiert.

Der Feedback-Link kann öffentlich und auf Papier beworben werden. Eine E-Mail mit
Nachmeldeangebot und Feedbackfrage an alle nicht angemeldeten Teilnehmenden braucht
eine gesondert geprüfte Versandgrundlage; die Existenz des Formulars schafft diese
nicht. Der einzige zulässige sichtbare Absender für Kletterliga-Mails ist
`info@kletterliga-nrw.de`.
