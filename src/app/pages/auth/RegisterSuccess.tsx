import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  LockKeyhole,
  MailCheck,
  UserRound,
} from "lucide-react";
import { StitchBadge, StitchButton } from "@/app/components/StitchPrimitives";
import { formatUnlockDate, hasParticipantLaunchStarted } from "@/config/launch";

type RegisterSuccessLocationState = {
  marketingOptInRequested?: boolean;
  marketingOptInEmailSent?: boolean;
  marketingOptInEmailError?: string;
};

const RegisterSuccess = () => {
  const location = useLocation();
  const state = (location.state as RegisterSuccessLocationState | null) ?? null;
  const unlockDate = formatUnlockDate();
  const participantLaunchStarted = hasParticipantLaunchStarted();
  const marketingOptInRequested = state?.marketingOptInRequested === true;
  const marketingOptInEmailSent = state?.marketingOptInEmailSent !== false;
  const steps = [
    {
      title: "Postfach öffnen",
      description: "Öffne die Bestätigungsmail der Kletterliga NRW.",
      icon: MailCheck,
    },
    {
      title: "E-Mail bestätigen",
      description: "Ein Klick auf den Link aktiviert deinen Zugang.",
      icon: LockKeyhole,
    },
    {
      title: "Direkt ins Profil",
      description: "Nach der Bestätigung landest du automatisch in deinem Profil.",
      icon: UserRound,
    },
  ] as const;

  return (
    <div className="mx-auto max-w-md space-y-8 px-4 pb-10 pt-4">
      <section className="relative overflow-hidden">
        <div className="absolute right-[-2rem] top-[-1rem] h-24 w-24 rounded-full bg-[#a15523]/16 blur-2xl" />

        <div className="relative space-y-4">
          <div className="flex items-center justify-between gap-3">
            <StitchBadge tone="cream" className="rounded-xl px-3.5 py-1.5">
              Account erstellt
            </StitchBadge>
            <div className="inline-flex items-center gap-2 rounded-xl border border-[rgba(242,220,171,0.14)] bg-[rgba(242,220,171,0.08)] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[rgba(242,220,171,0.72)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#f2dcab]" />
              Fast geschafft
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-[rgba(242,220,171,0.14)] bg-[rgba(242,220,171,0.08)] px-3.5 py-2.5 backdrop-blur-md">
            <MailCheck className="h-4 w-4 text-[#f2dcab]" />
            <span className="stitch-kicker text-[rgba(242,220,171,0.72)]">E-Mail bestätigen</span>
          </div>

          <div className="space-y-3.5">
            <h1 className="stitch-headline max-w-[12ch] text-[2.45rem] leading-[0.9] text-[#f2dcab] sm:text-5xl">
              Bestätige jetzt deine E-Mail.
            </h1>
            <p className="max-w-[30rem] text-base leading-7 text-[rgba(242,220,171,0.78)]">
              Sobald die Bestätigungsmail angekommen ist, fehlt nur noch ein Klick. Danach landest du direkt in deinem Profil.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.06)] px-3 py-2 text-sm text-[rgba(242,220,171,0.68)]">
            <CalendarDays className="h-4 w-4 text-[#f2dcab]" />
            {participantLaunchStarted ? "Saisonbereiche jetzt offen" : `Saisonbereiche ab ${unlockDate}`}
          </div>

          {marketingOptInRequested ? (
            <div className="rounded-xl border border-[rgba(242,220,171,0.14)] bg-[rgba(242,220,171,0.08)] px-4 py-3 text-sm leading-6 text-[rgba(242,220,171,0.76)]">
              {marketingOptInEmailSent
                ? "Du hast zusätzlich freiwillige Liga-Infos angefordert. Dafür erhältst du eine separate Bestätigungs-E-Mail. Erst nach diesem zweiten Klick schicken wir dir freiwillige Updates."
                : state?.marketingOptInEmailError ||
                  "Dein Account ist erstellt. Die Bestätigungs-E-Mail für freiwillige Liga-Infos konnte gerade noch nicht gesendet werden. Du kannst das später in deinem Profil erneut anstoßen."}
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-5">
        <div className="stitch-kicker text-[rgba(242,220,171,0.58)]">So geht es jetzt weiter</div>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="flex items-start gap-4 rounded-xl border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.06)] p-4 backdrop-blur-md"
              >
                <div className="flex flex-col items-center gap-2 pt-0.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2dcab] text-[#002637] shadow-[0_12px_22px_rgba(0,0,0,0.12)]">
                    <span className="stitch-headline text-[0.72rem] tracking-[0.12em]">{index + 1}</span>
                  </div>
                  {index < steps.length - 1 ? <div className="h-8 w-px bg-[rgba(242,220,171,0.18)]" /> : null}
                </div>

                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(242,220,171,0.1)] text-[#f2dcab]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-['Space_Grotesk'] text-base font-bold text-[#f2dcab]">{step.title}</div>
                    <p className="text-sm leading-6 text-[rgba(242,220,171,0.72)]">{step.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-sm leading-6 text-[rgba(242,220,171,0.72)]">
          Keine Mail da? Im Login kannst du dir jederzeit einen neuen Bestätigungslink senden lassen. Wenn auch das nicht klappt,
          melde dich unter{" "}
          <a href="mailto:info@kletterliga-nrw.de" className="underline underline-offset-2">
            info@kletterliga-nrw.de
          </a>
          .
        </p>

        <div className="flex flex-col gap-3 pt-1">
          <StitchButton asChild variant="cream" className="w-full rounded-xl">
            <Link to="/app/login?registered=true">
              Zum Login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </StitchButton>
          <StitchButton
            asChild
            variant="outline"
            className="w-full rounded-xl border-[rgba(242,220,171,0.18)] bg-[rgba(255,255,255,0.78)]"
          >
            <Link to="/">Zur Startseite</Link>
          </StitchButton>
        </div>
      </section>
    </div>
  );
};

export default RegisterSuccess;
