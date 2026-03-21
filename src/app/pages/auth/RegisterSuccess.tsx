import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  LockKeyhole,
  MailCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUnlockDate } from "@/config/launch";

const RegisterSuccess = () => {
  const unlockDate = formatUnlockDate();
  const nextSteps = [
    {
      title: "E-Mail öffnen",
      description: "Prüfe dein Postfach und öffne die Bestätigungsmail der Kletterliga NRW.",
      icon: MailCheck,
    },
    {
      title: "Adresse bestätigen",
      description: "Ein Klick auf den Link aktiviert deinen Account vollständig.",
      icon: LockKeyhole,
    },
    {
      title: "Einloggen und Profil prüfen",
      description: "Danach kannst du dich sofort einloggen und dein Profil jederzeit anpassen.",
      icon: UserRound,
    },
    {
      title: `Ab ${unlockDate} voll loslegen`,
      description: "Dann werden Hallen, Codes, Ranglisten und weitere Liga-Bereiche freigeschaltet.",
      icon: CalendarDays,
    },
  ];

  return (
    <div className="overflow-hidden">
      <section className="border-b border-primary/10 bg-[linear-gradient(135deg,rgba(242,220,171,0.34),rgba(255,255,255,0.98)_42%,rgba(0,61,85,0.05)_100%)] px-5 py-6 sm:px-8 sm:py-8">
        <div className="inline-flex -skew-x-6 items-center bg-secondary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary-foreground shadow-sm">
          <span className="skew-x-6">Account erstellt</span>
        </div>

        <div className="mt-5 max-w-3xl space-y-4">
          <h1 className="font-headline text-4xl leading-[0.96] text-primary sm:text-5xl">
            Fast geschafft. Dein Einstieg steht.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Dein Account ist angelegt. Nach der E-Mail-Bestätigung kannst du dich direkt einloggen,
            dein Profil pflegen und dich auf den Saisonstart vorbereiten.
          </p>
        </div>

        <div className="mt-5 space-y-3 text-sm text-primary">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
            <span>Profil und Dashboard sind direkt nach der Bestätigung nutzbar.</span>
          </div>
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
            <span>Die wettbewerbsrelevanten Liga-Bereiche öffnen gesammelt am {unlockDate}.</span>
          </div>
        </div>
      </section>

      <section className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
        <div className="space-y-2">
          <div className="inline-flex -skew-x-6 items-center border border-primary/15 bg-accent/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
            <span className="skew-x-6">Nächste Schritte</span>
          </div>
          <h2 className="font-headline text-3xl leading-tight text-primary sm:text-[2.2rem]">
            So geht es jetzt weiter.
          </h2>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-primary/10">
          {nextSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className={index === 0 ? "flex gap-4 px-4 py-4 sm:px-5" : "flex gap-4 border-t border-primary/10 px-4 py-4 sm:px-5"}
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center -skew-x-6 bg-accent text-primary">
                  <Icon className="h-5 w-5 skew-x-6" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
                    Schritt {index + 1}
                  </div>
                  <p className="mt-1 text-base font-semibold text-primary">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-[22px] border border-primary/10 bg-primary/[0.03] px-4 py-4 sm:px-5">
          <p className="text-sm leading-6 text-muted-foreground">
            <span className="font-semibold text-primary">Hinweis:</span> Keine Mail erhalten? Im Login
            kannst du dir jederzeit einen neuen Bestätigungslink senden lassen.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link to="/app/login?registered=true">
              <span className="inline-flex items-center gap-2 skew-x-6">
                Zum Login
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/">
              <span className="skew-x-6">Zur Startseite</span>
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default RegisterSuccess;
