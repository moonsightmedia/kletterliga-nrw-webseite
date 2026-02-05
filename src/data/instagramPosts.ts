// Manuell konfigurierte Instagram-Posts
// Aktualisiere diese Liste regelmäßig mit den neuesten Post-URLs von @kletterliga_nrw

export type InstagramPostConfig = {
  id: string; // Eindeutige ID (kann die Post-ID oder eine selbstgewählte ID sein)
  permalink: string; // Vollständige Instagram-URL zum Post
  imageUrl: string; // Direkter Link zum Bild (kann von Instagram kopiert werden)
  caption?: string; // Optional: Caption-Präview
  timestamp?: string; // Optional: Datum des Posts
};

export const instagramPosts: InstagramPostConfig[] = [
  // Beispiel-Struktur - ersetze mit echten Post-URLs
  // {
  //   id: "1",
  //   permalink: "https://www.instagram.com/p/ABC123/",
  //   imageUrl: "https://...", // Rechtsklick auf Bild → "Bildadresse kopieren"
  //   caption: "Beispiel-Caption",
  //   timestamp: "2025-02-05",
  // },
  // Füge hier weitere Posts hinzu...
];
