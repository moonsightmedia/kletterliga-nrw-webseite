import { Link } from "react-router-dom";
import { ArrowRight, Clock3, MapPin } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { usePageMeta } from "@/hooks/usePageMeta";

type HandoutKind = "teilnehmende" | "crew";

const schedule = [
  { time: "08:00", label: "Halle geöffnet" },
  { time: "08:45", label: "Check-in beginnt" },
  { time: "09:00–16:00", label: "Halbfinale" },
  { time: "12:00", label: "Check-in endet / Foodtruck öffnet" },
  { time: "16:30", label: "Finale beginnt" },
  { time: "ca. 19:30", label: "Siegerehrung" },
  { time: "ca. 20:00", label: "Verlosung" },
];

const crewSchedule = [
  schedule[0],
  { time: "08:30", label: "Crew-Einweisung" },
  ...schedule.slice(1),
];

export const FinaleHandout = ({ kind }: { kind: HandoutKind }) => {
  const isCrew = kind === "crew";
  const title = isCrew ? "Crew-Handout" : "Teilnehmerhandout";

  usePageMeta({
    title: `${title} · Finale 2026`,
    description: `Informationen für ${isCrew ? "die Crew" : "Teilnehmende"} zum Finale der Kletterliga NRW 2026.`,
    noindex: true,
  });

  return (
    <PageLayout>
      <section className="bg-primary px-5 pb-12 pt-36 text-[#f2dcab] sm:pt-40">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-secondary-foreground/80">
            Kletterliga NRW · Finale 2026
          </p>
          <h1 className="mt-4 font-headline text-4xl leading-tight sm:text-6xl">
            {isCrew ? "Dein Tag in der Crew" : "Dein Finaltag"}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-[#f2dcab]/90 sm:text-lg">
            {isCrew
              ? "Danke, dass du den Finaltag möglich machst! Hier findest du die wichtigsten Zeiten und Hinweise für deinen Einsatz."
              : "Willkommen zum Saisonabschluss! Hier findest du alles Wichtige für Check-in, Halbfinale und Finale."}
          </p>
          <div className="mt-8 flex flex-col gap-3 text-sm sm:flex-row sm:gap-8">
            <span className="flex items-center gap-2"><Clock3 size={18} aria-hidden="true" /> Samstag, 03.10.2026</span>
            <span className="flex items-center gap-2"><MapPin size={18} aria-hidden="true" /> Kletterwelt Sauerland, Altena</span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-4xl gap-9 px-5 py-12 lg:grid-cols-[1fr_0.9fr]">
        <section aria-labelledby="zeiten">
          <h2 id="zeiten" className="font-headline text-2xl text-primary">Zeitplan</h2>
          <ol className="mt-5 divide-y divide-primary/15 border-y border-primary/15">
            {(isCrew ? crewSchedule : schedule).map(({ time, label }) => (
              <li key={`${time}-${label}`} className="grid grid-cols-[7.5rem_1fr] gap-3 py-3 text-sm sm:text-base">
                <strong className="text-secondary">{time}</strong>
                <span className="text-primary">{label}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-muted-foreground">
            Die Abendzeiten sind geplant. Bitte beachte die aktuellen Ansagen vor Ort.
          </p>
        </section>

        <div className="space-y-5">
          {isCrew ? (
            <>
              <section className="border-l-4 border-secondary bg-[#f2dcab]/35 p-5" aria-labelledby="einsatz">
                <h2 id="einsatz" className="font-headline text-xl text-primary">Dein Einsatz</h2>
                <p className="mt-3 text-sm leading-relaxed text-primary">
                  Komm um 08:30 Uhr zur Einweisung. Dort erhältst du dein Helfershirt und deine CREW-Karte;
                  Station und Ablösung klären wir gemeinsam. Verlass deinen Posten nur nach Absprache.
                  Fragen oder Ausfälle meldest du direkt der Orga.
                </p>
              </section>
              <section className="border-l-4 border-secondary bg-[#f2dcab]/35 p-5" aria-labelledby="einlass">
                <h2 id="einlass" className="font-headline text-xl text-primary">Wenn du am Einlass hilfst</h2>
                <p className="mt-3 text-sm leading-relaxed text-primary">
                  Öffne die <a className="font-bold underline" href="/app/schiedsrichter/einlass">Crew-Einlassseite</a>.
                  Zugang und Passwort gibt René bei der Einweisung aus. Prüfe die Startklasse, bevor du jemanden eincheckst;
                  Sonderfälle bitte direkt mit René klären. Erst nach dem Check-in können Teilnehmende Ergebnisse eintragen.
                </p>
              </section>
              <section className="border-l-4 border-secondary bg-[#f2dcab]/35 p-5" aria-labelledby="verpflegung">
                <h2 id="verpflegung" className="font-headline text-xl text-primary">Essen & Pausen</h2>
                <p className="mt-3 text-sm leading-relaxed text-primary">
                  Zeig deine CREW-Karte bei Marla & Mathilda vor und behalte sie. Während der Ausgabezeiten ist Essen
                  für dich ganztägig inklusive. Stimme Pausen mit deiner Ablösung ab; Getränke-Infos gibt es bei der Einweisung.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="border-l-4 border-secondary bg-[#f2dcab]/35 p-5" aria-labelledby="checkin">
                <h2 id="checkin" className="font-headline text-xl text-primary">Check-in & Halbfinale</h2>
                <p className="mt-3 text-sm leading-relaxed text-primary">
                  Check-in am Empfang: 08:45–12:00 Uhr. Erst danach kannst du Ergebnisse eintragen.
                  Deine fünf zugeteilten Routen kannst du in freier Reihenfolge klettern – pro Route genau ein Versuch.
                  Starte möglichst früh, damit du alle Routen entspannt schaffst.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-primary">
                  Bring möglichst eine geeignete Sicherungsperson mit. Falls du ohne Partner:in kommst, melde dich
                  am Empfang; wir helfen dir, dich mit anderen Teilnehmenden zusammenzutun.
                </p>
              </section>
              <section className="border-l-4 border-secondary bg-[#f2dcab]/35 p-5" aria-labelledby="wertung">
                <h2 id="wertung" className="font-headline text-xl text-primary">App & Wertung</h2>
                <p className="mt-3 text-sm leading-relaxed text-primary">
                  Halte dein Handy geladen und die Kletterliga-App angemeldet bereit. Scanne an jeder Route den QR-Code
                  und trag dein Ergebnis bis 16:00 Uhr ein; die Stationscrew prüft mit. Bei Problemen sprich sie sofort an.
                  Die Reihenfolge der Finalstarts geben wir nach dem Halbfinale bekannt.
                </p>
                <Link to="/app/wettkampf" className="mt-4 inline-flex items-center gap-2 font-bold text-primary underline underline-offset-4">
                  Wettkampftag in der App öffnen <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </section>
              <section className="border-l-4 border-secondary bg-[#f2dcab]/35 p-5" aria-labelledby="vorort">
                <h2 id="vorort" className="font-headline text-xl text-primary">Rund um den Wettkampf</h2>
                <p className="mt-3 text-sm leading-relaxed text-primary">
                  Ab 12:00 Uhr gibt es den veganen Foodtruck von Marla & Mathilda.
                  Der Kletterladen NRW bietet einen Sale auf der Empore an. Zuschauen und Anfeuern ist kostenlos.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-5 pb-12 text-sm text-muted-foreground">
        <p>Kletterwelt Sauerland · Rosmarter Allee 12 · 58762 Altena</p>
        {isCrew && <p className="mt-2">Camper/Zelt nach Absprache · Hallen- und WC-Zugang bis 22:00 Uhr, wieder ab 08:00 Uhr.</p>}
      </div>
    </PageLayout>
  );
};
