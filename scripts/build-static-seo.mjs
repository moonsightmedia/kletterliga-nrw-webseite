import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const siteUrl = "https://kletterliga-nrw.de";
const distDir = path.resolve("dist");
const today = new Date().toISOString().slice(0, 10);

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "SportsOrganization",
  name: "Kletterliga NRW",
  description:
    "Der landesweite Hallenkletter-Wettkampf in Nordrhein-Westfalen. Mehrere Hallen. Eine Liga. Ein Finale.",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  sameAs: ["https://www.instagram.com/kletterliga_nrw/"],
  address: {
    "@type": "PostalAddress",
    addressRegion: "Nordrhein-Westfalen",
    addressCountry: "DE",
  },
  sport: "Klettern",
};

const publicRoutes = [
  {
    path: "/",
    title: "Kletterliga NRW",
    description:
      "Kletterliga NRW: der landesweite Hallenkletter-Wettkampf in Nordrhein-Westfalen mit mehreren Hallen, digitaler Wertung und großem Finale.",
    keywords:
      "Kletterliga NRW, Kletterwettkampf NRW, Hallenklettern NRW, Kletterhallen NRW, Rangliste Klettern NRW",
    h1: "Kletterliga NRW",
    intro:
      "Mehrere Hallen. Eine Liga. Ein Finale. Die Kletterliga NRW verbindet Hallenklettern, digitale Ergebniswertung und eine landesweite Rangliste in Nordrhein-Westfalen.",
    sections: [
      {
        title: "Kletterwettkampf in ganz NRW",
        body:
          "Teilnehmende sammeln in mehreren Kletterhallen Punkte, vergleichen sich in Ranglisten und qualifizieren sich über die Saison für das Finale.",
      },
      {
        title: "Für Einsteiger und Fortgeschrittene",
        body:
          "Die Kletterliga NRW bietet Toprope- und Vorstiegswertung, faire Wertungsklassen und einen einfachen digitalen Einstieg über den Teilnehmerbereich.",
      },
    ],
    links: [
      { href: "/liga", label: "Mehr über die Liga" },
      { href: "/modus", label: "Modus und Regeln" },
      { href: "/hallen", label: "Teilnehmende Hallen" },
      { href: "/ranglisten", label: "Aktuelle Ranglisten" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Kletterliga NRW",
      url: `${siteUrl}/`,
      description:
        "Startseite der Kletterliga NRW mit Informationen zum landesweiten Hallenkletter-Wettkampf.",
    },
  },
  {
    path: "/liga",
    title: "Die Liga – Kletterliga NRW",
    description:
      "Die Kletterliga NRW ist ein landesweiter Kletterwettkampf in Nordrhein-Westfalen. Hier findest du Vision, Werte und Hintergründe der Liga.",
    keywords:
      "Kletterliga NRW, Kletterwettkampf NRW, Liga Klettern Nordrhein-Westfalen, Hallenklettern Wettbewerb",
    h1: "Die Liga hinter dem Kletterwettkampf NRW",
    intro:
      "Die Kletterliga NRW bringt Kletterinnen und Kletterer aus Nordrhein-Westfalen in einem gemeinsamen Hallenwettkampf zusammen und verbindet sportlichen Anspruch mit Community.",
    sections: [
      {
        title: "Vision und Werte",
        body:
          "Die Liga schafft einen fairen, digitalen und hallenübergreifenden Wettbewerb, der sowohl Anfängerinnen und Anfänger als auch erfahrene Sportkletternde anspricht.",
      },
      {
        title: "Team und Organisation",
        body:
          "Hinter der Kletterliga NRW steht ein engagiertes Team, das Saison, Partnerhallen, Kommunikation und Finale organisiert.",
      },
    ],
    links: [
      { href: "/modus", label: "Zum Modus" },
      { href: "/regelwerk", label: "Zum Regelwerk" },
      { href: "/kontakt", label: "Kontakt aufnehmen" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "Die Liga – Kletterliga NRW",
      url: `${siteUrl}/liga`,
      description:
        "Informationen über Vision, Werte und Team der Kletterliga NRW.",
    },
  },
  {
    path: "/modus",
    title: "Modus & Regeln – Kletterliga NRW",
    description:
      "Alle Regeln der Kletterliga NRW: Wertung, Punktevergabe, Wertungsklassen, Qualifikation, Wildcards und Finale im Überblick.",
    keywords:
      "Kletterliga NRW Regeln, Modus Kletterwettkampf NRW, Punktevergabe Klettern, Rangliste Klettern NRW",
    h1: "Modus und Regeln der Kletterliga NRW",
    intro:
      "Hier findest du den kompletten Modus der Kletterliga NRW: Ligen, Zonenwertung, Punktevergabe, Wertungsklassen, Wildcards und den Ablauf von Halbfinale und Finale.",
    sections: [
      {
        title: "Wertung und Punkte",
        body:
          "Die Liga arbeitet mit Zonenwertung, Flash-Bonus und klaren Regeln für Ranglisten und Qualifikation.",
      },
      {
        title: "Finale und Teilnahmebedingungen",
        body:
          "Zusätzlich findest du Informationen zu Wertungszeitraum, Hallencodes, Mastercode, Qualifikation und Finale.",
      },
    ],
    links: [
      { href: "/regelwerk", label: "Offizielles Regelwerk" },
      { href: "/ranglisten", label: "Zu den Ranglisten" },
      { href: "/app", label: "Zur App" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Modus & Regeln – Kletterliga NRW",
      url: `${siteUrl}/modus`,
      description:
        "Übersicht über Wertung, Punktevergabe und Teilnahmebedingungen der Kletterliga NRW.",
    },
  },
  {
    path: "/regelwerk",
    title: "Regelwerk – Kletterliga NRW",
    description:
      "Das offizielle Regelwerk der Kletterliga NRW mit allen Bestimmungen zu Teilnahme, Wertung, Qualifikation und Fair Play.",
    keywords:
      "Regelwerk Kletterliga NRW, Fair Play Kletterwettkampf, Teilnahmebedingungen Kletterliga",
    h1: "Offizielles Regelwerk der Kletterliga NRW",
    intro:
      "Das Regelwerk bündelt alle verbindlichen Bestimmungen zu Ligen, Wertung, Ergebniseintragung, Qualifikation und Fair Play in der Kletterliga NRW.",
    sections: [
      {
        title: "Verbindliche Teilnahmebedingungen",
        body:
          "Teilnehmerinnen und Teilnehmer sowie Partnerhallen finden hier alle zentralen Vorgaben für eine faire und nachvollziehbare Saison.",
      },
    ],
    links: [
      { href: "/modus", label: "Modus im Überblick" },
      { href: "/kontakt", label: "Fragen zum Regelwerk" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Regelwerk – Kletterliga NRW",
      url: `${siteUrl}/regelwerk`,
      description:
        "Offizielles Regelwerk der Kletterliga NRW.",
    },
  },
  {
    path: "/hallen",
    title: "Teilnehmende Hallen – Kletterliga NRW",
    description:
      "Alle teilnehmenden Kletterhallen der Kletterliga NRW in Nordrhein-Westfalen mit Adressen, Partnerinfos und direktem Einstieg.",
    keywords:
      "Kletterhallen NRW Wettkampf, teilnehmende Hallen Kletterliga NRW, Kletterhallen Nordrhein-Westfalen",
    h1: "Teilnehmende Kletterhallen in NRW",
    intro:
      "Auf dieser Seite findest du die teilnehmenden Kletterhallen der Kletterliga NRW. Dort kannst du Punkte sammeln, Hallencodes erhalten und an der Saison teilnehmen.",
    sections: [
      {
        title: "Hallenübersicht für die Liga",
        body:
          "Die Kletterliga NRW arbeitet mit Partnerhallen in Nordrhein-Westfalen zusammen. Jede Halle ist Teil des gemeinsamen Wettkampfsystems.",
      },
      {
        title: "Direkter Einstieg",
        body:
          "Zu jeder Halle findest du Adresse, Website und weitere Informationen für deinen nächsten Besuch.",
      },
    ],
    links: [
      { href: "/kontakt", label: "Halle vorschlagen" },
      { href: "/app", label: "Zur Teilnahme" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Teilnehmende Hallen der Kletterliga NRW",
      url: `${siteUrl}/hallen`,
      description:
        "Übersicht aller teilnehmenden Kletterhallen der Kletterliga NRW in Nordrhein-Westfalen.",
    },
  },
  {
    path: "/ranglisten",
    title: "Ranglisten – Kletterliga NRW",
    description:
      "Aktuelle Ranglisten der Kletterliga NRW mit Vorschau auf Spitzenplätze und Zugang zum Teilnehmerbereich für die vollständige Auswertung.",
    keywords:
      "Rangliste Klettern NRW, Kletterliga NRW Ranglisten, Platzierungen Kletterwettkampf NRW",
    h1: "Ranglisten der Kletterliga NRW",
    intro:
      "Hier findest du die öffentliche Ranglisten-Vorschau der Kletterliga NRW. Die vollständigen Auswertungen stehen im Teilnehmerbereich bereit.",
    sections: [
      {
        title: "Aktuelle Platzierungen",
        body:
          "Die Ranglisten zeigen die Spitzenplätze in den Ligen und Wertungsklassen der aktuellen Saison.",
      },
      {
        title: "Vollständige Auswertung in der App",
        body:
          "Im Teilnehmerbereich findest du persönliche Statistiken, Filter und die komplette Ranglistenansicht.",
      },
    ],
    links: [
      { href: "/app/rankings", label: "Teilnehmerbereich öffnen" },
      { href: "/modus", label: "Wertung verstehen" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Ranglisten – Kletterliga NRW",
      url: `${siteUrl}/ranglisten`,
      description:
        "Öffentliche Ranglisten-Vorschau der Kletterliga NRW.",
    },
  },
  {
    path: "/sponsoren",
    title: "Sponsoren & Partner – Kletterliga NRW",
    description:
      "Die Sponsoren und Partner der Kletterliga NRW, die den Hallenkletter-Wettkampf in Nordrhein-Westfalen unterstützen.",
    keywords:
      "Sponsoren Kletterliga NRW, Partner Kletterwettkampf NRW, Sponsoring Hallenklettern",
    h1: "Sponsoren und Partner der Kletterliga NRW",
    intro:
      "Diese Seite zeigt die Sponsoren und Partner, die die Kletterliga NRW und den landesweiten Hallenkletter-Wettkampf in Nordrhein-Westfalen möglich machen.",
    sections: [
      {
        title: "Unterstützung für die Kletterszene",
        body:
          "Partner und Sponsoren tragen dazu bei, dass Saisonbetrieb, Sichtbarkeit und Finale der Liga umgesetzt werden können.",
      },
    ],
    links: [
      { href: "/kontakt", label: "Partner werden" },
      { href: "/liga", label: "Mehr über die Liga" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Sponsoren & Partner – Kletterliga NRW",
      url: `${siteUrl}/sponsoren`,
      description:
        "Sponsoren und Partner der Kletterliga NRW.",
    },
  },
  {
    path: "/kontakt",
    title: "Kontakt – Kletterliga NRW",
    description:
      "Kontakt zur Kletterliga NRW für Fragen, Feedback, Partnerschaften und organisatorische Anliegen rund um den Kletterwettkampf in NRW.",
    keywords:
      "Kontakt Kletterliga NRW, Ansprechpartner Kletterwettkampf NRW, Partnerschaft Kletterliga",
    h1: "Kontakt zur Kletterliga NRW",
    intro:
      "Du hast Fragen zur Teilnahme, zu Hallenpartnerschaften, zum Regelwerk oder zum Finale? Über die Kontaktseite erreichst du die Kletterliga NRW direkt.",
    sections: [
      {
        title: "Fragen, Feedback und Partnerschaften",
        body:
          "Nutze den direkten Kontakt per E-Mail oder das Formular für organisatorische Fragen, Feedback und Kooperationsanfragen.",
      },
    ],
    links: [
      { href: "/liga", label: "Zur Liga" },
      { href: "/hallen", label: "Zu den Hallen" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Kontakt – Kletterliga NRW",
      url: `${siteUrl}/kontakt`,
      description:
        "Kontaktseite der Kletterliga NRW für Fragen, Feedback und Partnerschaften.",
      mainEntity: {
        "@type": "SportsOrganization",
        name: "Kletterliga NRW",
        email: "info@kletterliga-nrw.de",
      },
    },
  },
  {
    path: "/impressum",
    title: "Impressum – Kletterliga NRW",
    description: "Rechtliche Angaben und Kontaktdaten der Kletterliga NRW.",
    keywords: "Impressum Kletterliga NRW, rechtliche Angaben Kletterliga",
    h1: "Impressum der Kletterliga NRW",
    intro:
      "Das Impressum enthält die rechtlichen Angaben, Verantwortlichkeiten und Kontaktdaten der Kletterliga NRW.",
    sections: [],
    links: [{ href: "/datenschutz", label: "Zum Datenschutz" }],
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Impressum – Kletterliga NRW",
      url: `${siteUrl}/impressum`,
    },
  },
  {
    path: "/datenschutz",
    title: "Datenschutz – Kletterliga NRW",
    description:
      "Datenschutzhinweise der Kletterliga NRW zur Website, App, Kontaktaufnahme und Ergebniserfassung.",
    keywords: "Datenschutz Kletterliga NRW, DSGVO Kletterliga, Datenschutz Hallenklettern",
    h1: "Datenschutzhinweise der Kletterliga NRW",
    intro:
      "Auf dieser Seite findest du die Datenschutzhinweise der Kletterliga NRW zu Website, App, Kontaktformular, Nutzerkonto und Ergebniserfassung.",
    sections: [],
    links: [{ href: "/impressum", label: "Zum Impressum" }],
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Datenschutz – Kletterliga NRW",
      url: `${siteUrl}/datenschutz`,
    },
  },
];

const appPage = {
  title: "Kletterliga NRW App",
  description:
    "Teilnehmerbereich der Kletterliga NRW für Registrierung, Ergebniseintragung und persönliche Auswertungen.",
};

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const absoluteUrl = (routePath) =>
  routePath === "/" ? `${siteUrl}/` : `${siteUrl}${routePath}`;

const setTitle = (html, value) =>
  html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(value)}</title>`);

const setMeta = (html, attr, name, content) => {
  const escaped = escapeHtml(content);
  const regex = new RegExp(`<meta[^>]*${attr}="${name}"[^>]*>`, "i");
  const replacement = `<meta ${attr}="${name}" content="${escaped}" />`;
  return regex.test(html) ? html.replace(regex, replacement) : html.replace("</head>", `    ${replacement}\n  </head>`);
};

const setCanonical = (html, href) => {
  const escaped = escapeHtml(href);
  const regex = /<link[^>]*rel="canonical"[^>]*>/i;
  const replacement = `<link rel="canonical" href="${escaped}" />`;
  return regex.test(html) ? html.replace(regex, replacement) : html.replace("</head>", `    ${replacement}\n  </head>`);
};

const setStructuredData = (html, schemas) => {
  const withoutJsonLd = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  const scripts = schemas
    .map((schema) => `    <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n    </script>`)
    .join("\n");
  return withoutJsonLd.replace("</head>", `${scripts}\n  </head>`);
};

const buildSeoBody = (route) => {
  const sections = route.sections
    .map(
      (section) => `
        <section style="margin-top:1.5rem">
          <h2 style="font-size:1.35rem;margin:0 0 0.5rem;font-weight:700">${escapeHtml(section.title)}</h2>
          <p style="margin:0;color:#30414a;line-height:1.7">${escapeHtml(section.body)}</p>
        </section>`,
    )
    .join("");

  const links = route.links
    .map(
      (link) =>
        `<a href="${link.href}" style="display:inline-block;margin:0.5rem 0.75rem 0 0;color:#0b6476;font-weight:600;text-decoration:none">${escapeHtml(link.label)}</a>`,
    )
    .join("");

  return `
      <main data-seo-static="true" style="font-family:Inter,system-ui,sans-serif;max-width:72rem;margin:0 auto;padding:7rem 1.5rem 4rem;color:#12313a;background:#f8f4eb">
        <p style="text-transform:uppercase;letter-spacing:0.12em;font-size:0.85rem;color:#0b6476;margin:0 0 1rem">Kletterliga NRW</p>
        <h1 style="font-size:clamp(2.2rem,5vw,4.5rem);line-height:1.05;margin:0 0 1rem;font-weight:800">${escapeHtml(route.h1)}</h1>
        <p style="font-size:1.15rem;line-height:1.8;max-width:56rem;margin:0;color:#30414a">${escapeHtml(route.intro)}</p>
        ${sections}
        <nav aria-label="Wichtige Seiten" style="margin-top:2rem">${links}</nav>
      </main>
  `;
};

const injectNoscriptFallback = (html, fallbackContent) =>
  html.replace(
    /<div id="root"><\/div>/i,
    `<div id="root"></div>
    <noscript>${fallbackContent}</noscript>`,
  );

const applyPageMeta = (html, route, robots = "index, follow") => {
  const title = route.title.includes("Kletterliga NRW")
    ? route.title
    : `${route.title} – Kletterliga NRW`;
  const canonical = absoluteUrl(route.path);

  let next = html;
  next = setTitle(next, title);
  next = setMeta(next, "name", "description", route.description);
  next = setMeta(next, "name", "keywords", route.keywords);
  next = setMeta(next, "name", "robots", robots);
  next = setMeta(next, "property", "og:type", route.path === "/" ? "website" : "article");
  next = setMeta(next, "property", "og:url", canonical);
  next = setMeta(next, "property", "og:title", title);
  next = setMeta(next, "property", "og:description", route.description);
  next = setMeta(next, "property", "og:image", `${siteUrl}/og-image.png`);
  next = setMeta(next, "name", "twitter:url", canonical);
  next = setMeta(next, "name", "twitter:title", title);
  next = setMeta(next, "name", "twitter:description", route.description);
  next = setMeta(next, "name", "twitter:image", `${siteUrl}/og-image.png`);
  next = setCanonical(next, canonical);
  next = setStructuredData(next, [organizationSchema, route.schema]);
  return next;
};

const writeRouteHtml = async (route, baseHtml) => {
  const html = injectNoscriptFallback(applyPageMeta(baseHtml, route), buildSeoBody(route));

  if (route.path === "/") {
    await writeFile(path.join(distDir, "index.html"), html, "utf8");
    return;
  }

  const routeDir = path.join(distDir, route.path.slice(1));
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, "index.html"), html, "utf8");
};

const buildAppHtml = (baseHtml) => {
  const appHtml = applyPageMeta(
    baseHtml,
    {
      path: "/app",
      title: appPage.title,
      description: appPage.description,
      keywords: "Kletterliga NRW App, Teilnehmerbereich Kletterliga, Ergebniseintragung Klettern",
      schema: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: appPage.title,
        url: `${siteUrl}/app`,
        description: appPage.description,
      },
    },
    "noindex, nofollow",
  );

  return injectNoscriptFallback(
    appHtml,
    `
      <main data-seo-static="true" style="font-family:Inter,system-ui,sans-serif;max-width:56rem;margin:0 auto;padding:6rem 1.5rem 4rem;color:#12313a">
        <h1 style="font-size:2.5rem;line-height:1.1;margin:0 0 1rem;font-weight:800">${escapeHtml(appPage.title)}</h1>
        <p style="font-size:1.05rem;line-height:1.7;margin:0;color:#30414a">${escapeHtml(appPage.description)}</p>
      </main>
    `,
  );
};

const buildSitemap = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicRoutes
  .map(
    (route) => `  <url>
    <loc>${absoluteUrl(route.path)}</loc>
    <lastmod>${today}</lastmod>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const main = async () => {
  const indexPath = path.join(distDir, "index.html");
  const baseHtml = await readFile(indexPath, "utf8");

  for (const route of publicRoutes) {
    await writeRouteHtml(route, baseHtml);
  }

  await writeFile(path.join(distDir, "app.html"), buildAppHtml(baseHtml), "utf8");
  await writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(), "utf8");
};

await main();
