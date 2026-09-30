import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedSection } from "@/hooks/useScrollAnimation";

const schedule = [
  { time: "08:00", title: "Halle öffnet", detail: "Ankommen in der Kletterwelt Sauerland." },
  { time: "08:45", title: "Check-in beginnt", detail: "Für angemeldete Starter:innen; der Check-in endet um 12:00 Uhr." },
  { time: "09:00", title: "Halbfinale startet", detail: "Die Halbfinalrunden laufen bis 16:00 Uhr." },
  { time: "10:00", title: "Offizielle Begrüßung", detail: "Wir heißen Teilnehmende und Publikum willkommen." },
  { time: "12:00", title: "Foodtruck öffnet", detail: "Marla & Mathilda’s Genusswerkstatt versorgt euch vor Ort." },
  { time: "16:30", title: "Finals starten", detail: "Die Finalrunden werden live vor Publikum geklettert." },
  { time: "19:30", title: "Siegerehrung", detail: "Wir ehren die Wertungsklassen und die Acht-Hallen-Teilnehmenden." },
  { time: "20:00", title: "Verlosung", detail: "Gemeinsamer Ausklang des Finaltags." },
] as const;

export const FinaleDaySchedule = ({ onHomePage = false }: { onHomePage?: boolean }) => (
  <section id="finaltag-ablauf" className="section-padding scroll-mt-24 bg-primary text-primary-foreground" aria-labelledby="finaltag-ablauf-heading">
    <div className="container-kl">
      <AnimatedSection animation="fade-up" className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Samstag · 3. Oktober 2026</p>
          <h2 id="finaltag-ablauf-heading" className="mt-3 max-w-xl font-headline text-4xl leading-none text-accent sm:text-5xl">
            FINALTAG: DER ABLAUF
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-primary-foreground/85 md:text-lg">
            Halbfinale und Finals finden am selben Tag statt. Auch ohne Startanmeldung kannst du zum Zuschauen vorbeikommen.
          </p>
          <p className="mt-5 flex items-start gap-3 text-sm leading-6 text-primary-foreground/85">
            <MapPin className="mt-0.5 h-5 w-5 flex-none text-accent" aria-hidden="true" />
            <span>Kletterwelt Sauerland · Rosmarter Allee 12 · 58762 Altena</span>
          </p>
          {onHomePage && (
            <Link to="/finale" className="mt-7 inline-flex min-h-11 items-center gap-2 border-b-2 border-accent font-headline text-base text-accent transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
              Mehr zum Finaltag <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-accent">Geplanter öffentlicher Ablauf</p>
          <ol className="border-t border-accent/35">
            {schedule.map((item) => (
              <li key={item.time} className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-accent/25 py-4 sm:grid-cols-[6rem_1fr] sm:gap-6">
                <time dateTime={`2026-10-03T${item.time}:00+02:00`} className="font-headline text-xl text-accent sm:text-2xl">{item.time}</time>
                <div>
                  <h3 className="font-headline text-lg leading-tight text-primary-foreground sm:text-xl">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-primary-foreground/75">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-6 text-primary-foreground/70">
            Zeiten sind der aktuelle Planungsstand. Einzelne Finalstarts und organisatorische Details können sich noch ändern.
          </p>
        </div>
      </AnimatedSection>
    </div>
  </section>
);
