import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2, LockKeyhole, MailCheck, UserRound } from "lucide-react";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
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
      description: "Danach kannst du dich direkt einloggen und dein Profil jederzeit anpassen.",
      icon: UserRound,
    },
    {
      title: `Ab ${unlockDate} voll loslegen`,
      description: "Dann werden Hallen, Codes, Ranglisten und weitere Liga-Bereiche freigeschaltet.",
      icon: CalendarDays,
    },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
      <StitchCard tone="glass" className="p-5 text-[#f2dcab] sm:p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <StitchBadge tone="cream">Account erstellt</StitchBadge>
            <h1 className="stitch-headline max-w-md text-4xl leading-[0.88] text-[#f2dcab] sm:text-5xl">
              Fast geschafft. Dein Einstieg steht.
            </h1>
            <p className="max-w-md text-sm leading-6 text-[rgba(242,220,171,0.76)]">
              Dein Account ist angelegt. Nach der E-Mail-Bestätigung kannst du dein Profil pflegen, dich
              einloggen und dich ohne Zeitdruck auf den Saisonstart vorbereiten.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.06)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Direkt offen</div>
              <div className="mt-2 text-sm font-semibold">Profil und Dashboard</div>
            </div>
            <div className="rounded-[1.3rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.06)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Saisonstart</div>
              <div className="mt-2 text-sm font-semibold">{unlockDate}</div>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f2dcab] text-[#002637]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-sm leading-6 text-[rgba(242,220,171,0.78)]">
                Keine Mail erhalten? Im Login kannst du dir jederzeit einen neuen Bestätigungslink senden lassen.
              </p>
            </div>
          </div>
        </div>
      </StitchCard>

      <StitchCard tone="cream" className="p-5 sm:p-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="stitch-kicker text-[#a15523]">Nächste Schritte</div>
            <div className="stitch-headline text-3xl leading-[0.92] text-[#002637] sm:text-4xl">
              So geht es jetzt weiter
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[rgba(27,28,26,0.68)]">
              Der Flow bleibt wie bisher. Nur die Oberfläche ist jetzt an das neue Stitch-System angepasst.
            </p>
          </div>

          <div className="space-y-3">
            {nextSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <StitchCard key={step.title} tone="surface" className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#003d55] text-[#f2dcab]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="stitch-kicker text-[#a15523]">Schritt {index + 1}</div>
                      <div className="text-base font-semibold text-[#002637]">{step.title}</div>
                      <p className="text-sm leading-6 text-[rgba(27,28,26,0.68)]">{step.description}</p>
                    </div>
                  </div>
                </StitchCard>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <StitchButton asChild className="w-full sm:w-auto">
              <Link to="/app/login?registered=true">
                Zum Login
                <ArrowRight className="h-4 w-4" />
              </Link>
            </StitchButton>
            <StitchButton asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/">Zur Startseite</Link>
            </StitchButton>
          </div>
        </div>
      </StitchCard>
    </div>
  );
};

export default RegisterSuccess;
