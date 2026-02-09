# E-Mail-Signatur für info@kletterliga-nrw.de

Einheitliche Signatur für alle Mails, die von **info@kletterliga-nrw.de** versendet werden. Nutzt die offiziellen Angaben aus dem Projekt (Logo, Farben, Website, Social).

---

## 1. HTML-Signatur (Outlook, Apple Mail, Gmail „Rich Text“)

Den folgenden Block in die Signatur-Einstellungen des Mail-Clients einfügen.

```html
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #333;">
  <tr>
    <td style="padding-right: 16px; vertical-align: top;">
      <a href="https://kletterliga-nrw.de" style="text-decoration: none;"><img src="https://kletterliga-nrw.de/logo.png" alt="Kletterliga NRW" width="80" height="80" style="display: block; border: 0;" /></a>
    </td>
    <td style="vertical-align: top; border-left: 3px solid #003D55; padding-left: 12px;">
      <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #003D55;">Kletterliga NRW</p>
      <p style="margin: 0 0 6px 0; color: #666; font-size: 11px;">Der landesweite Hallenkletter-Wettkampf in Nordrhein-Westfalen</p>
      <p style="margin: 0 0 2px 0;">Alt-Pungelscheid 2 · 58791 Werdohl</p>
      <p style="margin: 0 0 2px 0;">info@kletterliga-nrw.de</p>
      <p style="margin: 0 0 2px 0;"><a href="https://kletterliga-nrw.de" style="color: #A15523;">kletterliga-nrw.de</a></p>
      <p style="margin: 0;">Instagram: <a href="https://www.instagram.com/kletterliga_nrw/" style="color: #A15523;">@kletterliga_nrw</a></p>
    </td>
  </tr>
</table>
```

Falls der Client keine externen Bilder lädt: Logo weglassen oder als lokale Datei einbinden; der rechte Block funktioniert weiterhin.

---

## 2. Plain-Text-Signatur (einfache Clients / falls HTML nicht unterstützt wird)

```
--
Kletterliga NRW
Der landesweite Hallenkletter-Wettkampf in Nordrhein-Westfalen

Alt-Pungelscheid 2
58791 Werdohl

E-Mail:   info@kletterliga-nrw.de
Web:      https://kletterliga-nrw.de
Instagram: https://www.instagram.com/kletterliga_nrw/
```

---

## 3. Optionale Anpassungen

- **Logo:** Wenn ihr das Logo lokal speichert und in der Signatur einbettet, bleibt es auch in Clients sichtbar, die externe Bilder blockieren (z. B. `cid:`-Referenz oder lokaler Pfad je nach Client).

Die Signatur wird nur im E-Mail-Programm hinterlegt; keine weiteren Code- oder Konfigurationsänderungen im Projekt nötig.
