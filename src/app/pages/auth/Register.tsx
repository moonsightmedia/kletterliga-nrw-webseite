import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Flag,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import {
  StitchBadge,
  StitchButton,
  StitchCard,
  StitchSelectField,
  StitchTextField,
} from "@/app/components/StitchPrimitives";
import { listGyms } from "@/services/appApi";
import type { Gym } from "@/services/appTypes";
import { cn } from "@/lib/utils";
import {
  formatAccountCreationOpenDate,
  formatUnlockDate,
  useLaunchSettings,
} from "@/config/launch";
import { MARKETING_OPT_IN_TEXT, REQUIRED_CONSENT_TEXT } from "@/data/participationConsent";
import logo from "@/assets/logo.png";

type RegisterFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
  gender: string;
  homeGymId: string;
  league: string;
};

const steps = [
  { step: 1, progressLabel: "Schritt 1 von 3", shortLabel: "Basisdaten", cardTitle: "Willkommen bei der Kletterliga NRW", cardDescription: "Lege deinen Account an und sichere dir deinen Einstieg in den Teilnehmerbereich." },
  { step: 2, progressLabel: "Schritt 2 von 3", shortLabel: "Sicherheit", cardTitle: "Passwort festlegen", cardDescription: "Dein Zugang soll verlässlich sein. Wähle ein Passwort, mit dem du sicher in deine Saison startest." },
  { step: 3, progressLabel: "Schritt 3 von 3", shortLabel: "Liga wählen", cardTitle: "Deine Liga wählen", cardDescription: "Verknüpfe dein Profil mit Disziplin, Wertungsklasse und optional deiner Heimathalle." },
] as const;

const passwordStrengthLabel = (password: string) => {
  if (password.length >= 10) return "Stark";
  if (password.length >= 6) return "Stabil";
  return "Zu kurz";
};

const Register = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<RegisterFormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    gender: "",
    homeGymId: "",
    league: "",
  });
  const [requiredConsentAccepted, setRequiredConsentAccepted] = useState(false);
  const [marketingOptInRequested, setMarketingOptInRequested] = useState(false);
  const { accountCreationOpenDate, unlockDate, participantLaunchStarted, beforeAccountCreationOpen } = useLaunchSettings();

  useEffect(() => {
    let active = true;
    const loadGyms = async () => {
      try {
        const { data } = await listGyms();
        if (active) setGyms(data ?? []);
      } catch (error) {
        console.error("Failed to load gyms for registration", error);
      }
    };
    void loadGyms();
    return () => {
      active = false;
    };
  }, []);

  const registrationOpenDate = formatAccountCreationOpenDate(accountCreationOpenDate);
  const unlockDateLabel = formatUnlockDate(unlockDate);
  const registrationClosed = beforeAccountCreationOpen;
  const stepOneComplete = form.firstName.trim() && form.lastName.trim() && form.email.trim();
  const stepTwoComplete =
    form.password.length >= 6 &&
    form.confirmPassword.length >= 6 &&
    form.password === form.confirmPassword;
  const stepThreeComplete = form.birthDate.trim() && form.gender.trim() && form.league.trim();
  const canAdvance = currentStep === 1 ? stepOneComplete : currentStep === 2 ? stepTwoComplete : stepThreeComplete;
  const selectedHomeGym = useMemo(() => gyms.find((gym) => gym.id === form.homeGymId), [gyms, form.homeGymId]);
  const selectedLeagueLabel = form.league === "lead" ? "Vorstieg" : form.league === "toprope" ? "Toprope" : "Noch offen";

  const stepNote = useMemo(() => {
    if (currentStep === 1) return "Mit deinen Basisdaten erstellen wir deinen Account und die Bestätigungsmail.";
    if (currentStep === 2) return "Mindestens sechs Zeichen sind Pflicht. Noch besser ist ein längeres Passwort mit klarer Struktur.";
    return participantLaunchStarted
      ? "Hallen, Ranglisten und weitere Wettbewerbsbereiche sind jetzt freigeschaltet."
      : `Hallen, Ranglisten und weitere Wettbewerbsbereiche werden zum Saisonstart am ${unlockDateLabel} freigeschaltet.`;
  }, [currentStep, participantLaunchStarted, unlockDateLabel]);

  const validateCurrentStep = () => {
    if (currentStep === 1 && !stepOneComplete) {
      toast({ title: "Pflichtfelder fehlen", description: "Bitte ergänze Vorname, Nachname und E-Mail-Adresse.", variant: "destructive" });
      return false;
    }
    if (currentStep === 2) {
      if (form.password.length < 6) {
        toast({ title: "Passwort zu kurz", description: "Bitte wähle ein Passwort mit mindestens 6 Zeichen.", variant: "destructive" });
        return false;
      }
      if (form.password !== form.confirmPassword) {
        toast({ title: "Passwörter stimmen nicht überein", description: "Bitte prüfe die Passwort-Wiederholung.", variant: "destructive" });
        return false;
      }
    }
    if (currentStep === 3 && !stepThreeComplete) {
      toast({ title: "Registrierung unvollständig", description: "Bitte ergänze Disziplin, Geburtsdatum und Wertungsklasse.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleTopBack = () => {
    if (currentStep === 1) {
      navigate("/app/login");
      return;
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (currentStep < steps.length) {
      if (!validateCurrentStep()) return;
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
      return;
    }
    if (!stepOneComplete || !stepTwoComplete || !stepThreeComplete) {
      toast({ title: "Registrierung unvollständig", description: "Bitte prüfe deine Angaben in allen Schritten.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await signUp({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: form.birthDate || null,
        gender: (form.gender as "m" | "w") || null,
        homeGymId: form.homeGymId || null,
        league: (form.league as "toprope" | "lead") || null,
        requiredConsentAccepted,
        marketingOptInRequested,
      });
      if (result.error) {
        toast({ title: "Registrierung fehlgeschlagen", description: result.error, variant: "destructive" });
        setLoading(false);
        return;
      }
      toast({ title: "Account erstellt", description: "Im nächsten Schritt zeigen wir dir, wie es weitergeht.", variant: "success" });
      navigate("/app/register/success", {
        state: {
          email: form.email,
          marketingOptInRequested: result.marketingOptInRequested ?? marketingOptInRequested,
          marketingOptInEmailSent: result.marketingOptInEmailSent ?? !marketingOptInRequested,
          marketingOptInEmailError: result.marketingOptInEmailError,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      toast({ title: "Fehler", description: error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten.", variant: "destructive" });
      setLoading(false);
    }
  };

  if (registrationClosed) {
    return (
      <div className="mx-auto max-w-md space-y-8 px-4 pb-10 pt-6">
        <section className="relative overflow-hidden">
          <div className="absolute right-[-2rem] top-[-1rem] h-24 w-24 rounded-full bg-[#a15523]/16 blur-2xl" />
          <div className="absolute left-[-1.5rem] top-24 h-20 w-20 rounded-full bg-[#f2dcab]/10 blur-xl" />

          <div className="relative space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <StitchBadge tone="cream">Registrierung folgt</StitchBadge>
                <div className="flex items-center gap-3">
                  <div className="rounded-[1rem] bg-[#f2dcab] p-2.5 shadow-[0_18px_30px_rgba(0,0,0,0.18)]">
                    <img src={logo} alt="Kletterliga NRW" className="h-8 w-8 object-contain" />
                  </div>
                  <div>
                    <div className="stitch-headline text-lg text-[#f2dcab]">Kletterliga NRW</div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgba(242,220,171,0.58)]">
                      Teilnehmer-App
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[rgba(242,220,171,0.14)] bg-[rgba(242,220,171,0.08)] text-[#f2dcab]">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="stitch-headline max-w-[13ch] text-[2.65rem] leading-[0.88] text-[#f2dcab] sm:text-5xl">
                Die Account-Erstellung öffnet am {registrationOpenDate}.
              </h1>
              <p className="max-w-[30rem] text-[1.02rem] leading-8 text-[rgba(242,220,171,0.78)]">
                Bis dahin kannst du dich in Ruhe auf der Webseite orientieren. Nach dem Start legst du deinen
                Account an, bestätigst deine E-Mail und bereitest dein Profil direkt auf den Saisonstart vor.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.15rem] border border-[rgba(242,220,171,0.14)] bg-[rgba(242,220,171,0.08)] p-4 backdrop-blur-md">
                <div className="stitch-kicker text-[rgba(242,220,171,0.6)]">Ab Registrierung</div>
                <div className="mt-2 font-['Space_Grotesk'] text-lg font-bold text-[#f2dcab]">Account anlegen</div>
                <p className="mt-2 text-sm leading-6 text-[rgba(242,220,171,0.74)]">
                  Profil erstellen, E-Mail bestätigen und direkt einloggen.
                </p>
              </div>
              <div className="rounded-[1.15rem] border border-[rgba(242,220,171,0.14)] bg-[rgba(242,220,171,0.08)] p-4 backdrop-blur-md">
                <div className="stitch-kicker text-[rgba(242,220,171,0.6)]">Ab Saisonstart</div>
                <div className="mt-2 font-['Space_Grotesk'] text-lg font-bold text-[#f2dcab]">{unlockDateLabel}</div>
                <p className="mt-2 text-sm leading-6 text-[rgba(242,220,171,0.74)]">
                  Hallen, Codes, Ranglisten und weitere Liga-Bereiche werden freigeschaltet.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="stitch-divider opacity-80" />

        <section className="space-y-5">
          <div className="space-y-2">
            <div className="stitch-kicker text-[rgba(242,220,171,0.58)]">So geht es weiter</div>
            <p className="text-sm leading-7 text-[rgba(242,220,171,0.78)]">
              Sobald die Registrierung öffnet, ist der Ablauf bewusst einfach gehalten und auch für neue
              Teilnehmer sofort verständlich.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: Mail,
                title: "Account anlegen",
                text: "Mit Vorname, E-Mail und Passwort startest du in wenigen Schritten in die App.",
              },
              {
                icon: ShieldCheck,
                title: "E-Mail bestätigen",
                text: "Ein Bestätigungslink aktiviert deinen Zugang und macht dein Profil einsatzbereit.",
              },
              {
                icon: Flag,
                title: "Zum Saisonstart loslegen",
                text: "Dann kannst du Hallen freischalten, Routen loggen und in den Ranglisten auftauchen.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-[1.1rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.06)] p-4 backdrop-blur-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[#f2dcab] text-[#003d55] shadow-[0_12px_22px_rgba(0,0,0,0.12)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-['Space_Grotesk'] text-base font-bold text-[#f2dcab]">{item.title}</div>
                    <p className="text-sm leading-6 text-[rgba(242,220,171,0.72)]">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <StitchButton asChild variant="cream" className="w-full">
              <Link to="/app/login">Zum Login</Link>
            </StitchButton>
            <StitchButton asChild variant="outline" className="w-full border-[rgba(242,220,171,0.18)] bg-[rgba(255,255,255,0.78)]">
              <Link to="/">Zur Startseite</Link>
            </StitchButton>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl">
      <form onSubmit={handleSubmit} className="pb-10">
        <header className="sticky top-0 z-20 bg-[#003d55]/95 px-4 py-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <button type="button" onClick={handleTopBack} className="inline-flex items-center gap-2 rounded-full border border-[rgba(242,220,171,0.16)] bg-[rgba(242,220,171,0.08)] px-4 py-2 text-sm font-semibold text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.14)]">
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </button>
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-[0.95rem] bg-[#f2dcab] p-2.5 shadow-[0_16px_28px_rgba(0,0,0,0.2)]">
                <img src={logo} alt="Kletterliga NRW" className="h-8 w-8 object-contain" />
              </div>
              <div className="min-w-0">
                <div className="stitch-headline truncate text-lg text-[#f2dcab]">Kletterliga NRW</div>
                <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Registrierung</div>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <div className="stitch-kicker text-[rgba(242,220,171,0.58)]">{steps[currentStep - 1]?.shortLabel}</div>
            </div>
          </div>
        </header>

        <div className="space-y-8 px-4 py-8 sm:px-6 sm:py-10">
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <div className="stitch-kicker text-[#f2dcab]">{steps[currentStep - 1]?.progressLabel}</div>
                <div className="text-sm font-medium text-[rgba(242,220,171,0.62)]">{steps[currentStep - 1]?.shortLabel}</div>
              </div>
              <div className="text-sm font-semibold text-[rgba(242,220,171,0.62)]">{Math.round((currentStep / steps.length) * 100)}%</div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(242,220,171,0.1)]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#a15523_0%,#f2dcab_100%)] transition-all duration-300" style={{ width: `${(currentStep / steps.length) * 100}%` }} />
            </div>
          </section>

          {currentStep === 1 ? (
            <div className="space-y-6">
              <StitchCard tone="cream" className="relative p-6 sm:p-8">
                <div className="absolute right-10 top-0 h-24 w-px bg-[#002637]/10" />
                <div className="absolute right-[34px] top-24 h-3 w-3 rounded-full border-2 border-[#002637]/10" />

                <div className="relative z-10 space-y-8">
                  <div className="space-y-3">
                    <div className="stitch-kicker text-[#a15523]">{steps[currentStep - 1]?.progressLabel}</div>
                    <h1 className="stitch-headline max-w-2xl text-4xl leading-[0.9] text-[#002637] sm:text-5xl">
                      {steps[currentStep - 1]?.cardTitle}
                    </h1>
                    <p className="max-w-xl text-base leading-7 text-[rgba(27,28,26,0.68)]">
                      {steps[currentStep - 1]?.cardDescription}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <StitchTextField
                      label="Vorname"
                      value={form.firstName}
                      onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                      placeholder="Jana"
                      required
                      icon={<UserRound className="h-4 w-4" />}
                    />
                    <StitchTextField
                      label="Nachname"
                      value={form.lastName}
                      onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                      placeholder="Muster"
                      required
                      icon={<UserRound className="h-4 w-4" />}
                    />
                    <div className="sm:col-span-2">
                      <StitchTextField
                        label="E-Mail-Adresse"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                        placeholder="dein.name@email.de"
                        required
                        icon={<Mail className="h-4 w-4" />}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-2 md:flex-row md:items-center">
                    <StitchButton type="submit" size="lg" className="md:min-w-[12rem]" disabled={!canAdvance}>
                      Weiter
                      <ArrowRight className="h-4 w-4" />
                    </StitchButton>
                    <div className="hidden h-px flex-1 bg-[#002637]/8 md:block" />
                    <p className="text-xs uppercase tracking-[0.18em] text-[rgba(27,28,26,0.46)]">
                      Die verbindliche Zustimmung gibst du erst im letzten Schritt. Vorab findest du hier schon unsere{" "}
                      <Link to="/datenschutz" className="font-bold text-[#a15523] underline decoration-[#a15523]/30 underline-offset-4">
                        Datenschutzhinweise
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </StitchCard>

              <div className="hidden grid gap-4 md:grid-cols-2">
                <StitchCard tone="navy" className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(242,220,171,0.1)] text-[#f2dcab]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Sicherer Zugang</div>
                      <p className="mt-2 text-sm leading-6 text-[rgba(242,220,171,0.76)]">
                        Deine Daten werden geschützt gespeichert und dein Zugang im nächsten Schritt abgesichert.
                      </p>
                    </div>
                  </div>
                </StitchCard>

                <div className="relative overflow-hidden rounded-[1.5rem] border border-[rgba(242,220,171,0.14)] bg-[linear-gradient(135deg,rgba(242,220,171,0.12),rgba(0,61,85,0.4))] p-5">
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#f2dcab]/10 blur-2xl" />
                  <div className="relative">
                    <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">
                      {participantLaunchStarted ? "Saisonstatus" : "Saisonstart"}
                    </div>
                    <div className="stitch-headline mt-3 text-2xl text-[#f2dcab]">
                      {participantLaunchStarted ? "Hallen und Ranglisten jetzt offen" : `Hallen und Ranglisten ab ${unlockDate}`}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[rgba(242,220,171,0.76)]">
                      {participantLaunchStarted
                        ? "Profil, Dashboard und Wettbewerbsbereiche sind jetzt direkt verfügbar."
                        : "Profil und Dashboard sind sofort da. Die Wettbewerbsbereiche öffnen gesammelt zum Saisonstart."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {currentStep === 2 ? (
            <div className="space-y-6">
              <div className="hidden bg-[#003d55] px-6 pb-20 pt-6 text-[#f2dcab] sm:px-8">
                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-1">
                    <div className="stitch-headline text-3xl text-[#f2dcab] sm:text-4xl">Sicherheit</div>
                    <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">{steps[currentStep - 1]?.progressLabel}</div>
                  </div>
                  <div className="hidden text-right text-sm text-[rgba(242,220,171,0.6)] sm:block">Zugang für deinen Account</div>
                </div>
              </div>

              <div className="px-0 pb-0">
                <StitchCard tone="cream" className="relative p-6 sm:p-8">
                  <div className="absolute right-10 top-0 h-24 w-px bg-[#002637]/10" />
                  <div className="absolute right-[34px] top-24 h-3 w-3 rounded-full border-2 border-[#002637]/10" />
                  <div className="relative z-10 space-y-8">
                    <div className="space-y-3">
                      <div className="stitch-kicker text-[#a15523]">{steps[currentStep - 1]?.progressLabel}</div>
                      <h2 className="stitch-headline max-w-2xl text-4xl leading-[0.9] text-[#002637] sm:text-5xl">
                        {steps[currentStep - 1]?.cardTitle}
                      </h2>
                      <p className="max-w-xl text-base leading-7 text-[rgba(27,28,26,0.68)]">
                        {steps[currentStep - 1]?.cardDescription}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <StitchTextField
                        label="Passwort"
                        type="password"
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                        placeholder="Mindestens 6 Zeichen"
                        required
                        icon={<LockKeyhole className="h-4 w-4" />}
                      />
                      <StitchTextField
                        label="Passwort bestätigen"
                        type="password"
                        autoComplete="new-password"
                        value={form.confirmPassword}
                        onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                        placeholder="Passwort erneut eingeben"
                        required
                        icon={<ShieldCheck className="h-4 w-4" />}
                        error={form.confirmPassword.length > 0 && form.confirmPassword !== form.password ? "Die Passwörter stimmen nicht überein." : null}
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                      <StitchCard tone="muted" className="p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="stitch-kicker text-[#a15523]">Sicherheitsgrad</div>
                            <div className="mt-2 text-lg font-semibold text-[#002637]">{passwordStrengthLabel(form.password)}</div>
                          </div>
                          <div className="text-sm text-[rgba(27,28,26,0.56)]">{form.password.length}/10+</div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          {[0, 1, 2, 3].map((segment) => {
                            const activeSegments = form.password.length >= 10 ? 4 : form.password.length >= 8 ? 3 : form.password.length >= 6 ? 2 : form.password.length > 0 ? 1 : 0;
                            return <div key={segment} className={cn("h-1.5 flex-1 rounded-full transition-all", segment < activeSegments ? "bg-[#a15523]" : "bg-[rgba(0,38,55,0.12)]")} />;
                          })}
                        </div>
                      </StitchCard>

                      <div className="hidden rounded-[1.4rem] border-l-4 border-[#fd9f66] bg-[#f5efe5] p-5">
                        <div className="flex items-start gap-3">
                          <ShieldCheck className="mt-0.5 h-5 w-5 text-[#a15523]" />
                          <div className="space-y-2">
                            <div className="stitch-kicker text-[#a15523]">Sicherheits-Check</div>
                            <ul className="space-y-2 text-sm leading-6 text-[rgba(27,28,26,0.68)]">
                              <li>Mindestens 6 Zeichen</li>
                              <li>Wiederholung zum Prüfen von Tippfehlern</li>
                              <li>Bestätigung deiner E-Mail im Anschluss</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <StitchCard tone="muted" className="p-5">
                        <div className="space-y-2">
                          <div className="stitch-kicker text-[#a15523]">Kurz geprüft</div>
                          <ul className="space-y-2 text-sm leading-6 text-[rgba(27,28,26,0.68)]">
                            <li>Mindestens 6 Zeichen</li>
                            <li>Wiederholung gegen Tippfehler</li>
                            <li>Bestätigung per E-Mail im Anschluss</li>
                          </ul>
                        </div>
                      </StitchCard>
                    </div>

                    <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center">
                      <StitchButton type="button" variant="outline" size="lg" className="md:min-w-[11rem]" onClick={() => setCurrentStep(1)}>
                        Zurück
                      </StitchButton>
                      <StitchButton type="submit" size="lg" className="md:min-w-[12rem]" disabled={!canAdvance}>
                        Weiter
                        <ArrowRight className="h-4 w-4" />
                      </StitchButton>
                      <div className="hidden h-px flex-1 bg-[#002637]/8 md:block" />
                      <p className="text-xs uppercase tracking-[0.18em] text-[rgba(27,28,26,0.46)]">
                        Passwort setzen, E-Mail bestätigen und dann direkt weiter zu deiner Liga.
                      </p>
                    </div>
                  </div>
                </StitchCard>
              </div>
            </div>
          ) : null}
          {currentStep === 3 ? (
            <div className="space-y-6 rounded-[2rem] bg-[#fbf9f6] p-6 shadow-[0_28px_64px_rgba(0,38,55,0.18)] sm:p-8">
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-2">
                    <div className="stitch-kicker text-[#a15523]">{steps[currentStep - 1]?.progressLabel}</div>
                    <h2 className="stitch-headline text-4xl leading-none text-[#002637] sm:text-5xl">
                      {steps[currentStep - 1]?.cardTitle}
                    </h2>
                  </div>
                  <div className="hidden max-w-[16rem] text-right text-sm leading-6 text-[rgba(27,28,26,0.56)] sm:block">
                    Wähle die Disziplin, mit der du in die Saison startest.
                  </div>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(0,38,55,0.08)]">
                  <div className="h-full w-full rounded-full bg-[#a15523]" />
                </div>
              </div>

              <StitchCard tone="surface" className="p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <StitchTextField
                    label="Geburtsdatum"
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                    required
                    icon={<CalendarDays className="h-4 w-4" />}
                  />
                  <StitchSelectField
                    label="Wertungsklasse"
                    value={form.gender}
                    onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
                    required
                  >
                    <option value="">Auswählen</option>
                    <option value="w">Weiblich</option>
                    <option value="m">Männlich</option>
                  </StitchSelectField>
                </div>

                <div className="mt-4">
                  <StitchSelectField
                    label="Heimathalle"
                    value={form.homeGymId}
                    onChange={(event) => setForm((prev) => ({ ...prev, homeGymId: event.target.value }))}
                    hint="Optional. Du kannst die Halle auch später im Profil ergänzen."
                  >
                    <option value="">Keine Auswahl</option>
                    {gyms.map((gym) => (
                      <option key={gym.id} value={gym.id}>
                        {gym.name} {gym.city ? `(${gym.city})` : ""}
                      </option>
                    ))}
                  </StitchSelectField>
                </div>
              </StitchCard>

              <div className="space-y-3">
                <div className="stitch-kicker text-[#a15523]">Disziplin wählen</div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {[
                    {
                      value: "lead",
                      title: "Vorstieg",
                      description:
                        "Für alle Teilnahmen in der Vorstiegsliga mit entsprechendem Fokus auf Technik und Routenlesen.",
                      meta: "Lead",
                    },
                    {
                      value: "toprope",
                      title: "Toprope",
                      description:
                        "Der ideale Einstieg, wenn du im Toprope-Format antrittst und deine Saison sauber aufbauen willst.",
                      meta: "Toprope",
                    },
                  ].map((option) => {
                    const isSelected = form.league === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, league: option.value }))}
                        className={cn(
                          "group relative flex min-h-[11.5rem] flex-col items-start overflow-hidden rounded-[1.2rem] border-b-4 px-3 py-4 text-left transition-all sm:min-h-[16rem] sm:rounded-[1.4rem] sm:px-5 sm:py-6",
                          isSelected
                            ? "border-[#a15523] bg-[#ede8e1] shadow-[0_16px_30px_rgba(0,38,55,0.08)]"
                            : "border-transparent bg-[#f5efe5] hover:border-[#a15523]",
                        )}
                      >
                        <div className="absolute -right-5 -top-5 text-[#002637]/5 transition-opacity group-hover:text-[#002637]/10">
                          {option.value === "lead" ? <Flag className="h-16 w-16 sm:h-24 sm:w-24" /> : <Sparkles className="h-16 w-16 sm:h-24 sm:w-24" />}
                        </div>

                        <div
                          className={cn(
                            "mb-4 flex h-10 w-10 items-center justify-center rounded-full sm:mb-6 sm:h-12 sm:w-12",
                            isSelected ? "bg-[#a15523] text-white" : "bg-white text-[#a15523]",
                          )}
                        >
                          {option.value === "lead" ? <Flag className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </div>

                        <div className="stitch-headline text-lg leading-tight text-[#002637] sm:text-2xl">{option.title}</div>
                        <div className="mt-auto pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#002637] sm:pt-5 sm:text-xs sm:tracking-[0.18em]">{option.meta}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="hidden grid gap-4 md:grid-cols-3">
                {[
                  { value: "lead", title: "Vorstieg", description: "Für alle Teilnahmen in der Vorstiegsliga mit entsprechendem Fokus auf Technik und Routenlesen.", meta: "Lead" },
                  { value: "toprope", title: "Toprope", description: "Der ideale Einstieg, wenn du im Toprope-Format antrittst und deine Saison sauber aufbauen willst.", meta: "Toprope" },
                  { value: "home", title: selectedHomeGym ? selectedHomeGym.name : "Heimathalle", description: selectedHomeGym ? selectedHomeGym.city || "Bereits ausgewählt" : "Optional. Du kannst deine Halle jetzt setzen oder später ergänzen.", meta: selectedHomeGym ? "Gesetzt" : "Optional" },
                ].map((option) => {
                  const isLeagueCard = option.value === "lead" || option.value === "toprope";
                  const isSelected = isLeagueCard && form.league === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (isLeagueCard) setForm((prev) => ({ ...prev, league: option.value }));
                      }}
                      className={cn("group relative flex min-h-[16rem] flex-col items-start overflow-hidden rounded-[1.4rem] border-b-4 px-5 py-6 text-left transition-all", isSelected ? "border-[#a15523] bg-[#ede8e1] shadow-[0_16px_30px_rgba(0,38,55,0.08)]" : "border-transparent bg-[#f5efe5] hover:border-[#a15523]", !isLeagueCard && "cursor-default")}
                    >
                      <div className="absolute -right-5 -top-5 text-[#002637]/5 transition-opacity group-hover:text-[#002637]/10">
                        {option.value === "lead" ? <Flag className="h-24 w-24" /> : option.value === "toprope" ? <Sparkles className="h-24 w-24" /> : <Building2 className="h-24 w-24" />}
                      </div>

                      <div className={cn("mb-6 flex h-12 w-12 items-center justify-center rounded-full", isSelected ? "bg-[#a15523] text-white" : "bg-white text-[#a15523]")}>
                        {option.value === "lead" ? <Flag className="h-5 w-5" /> : option.value === "toprope" ? <Sparkles className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                      </div>

                      <div className="stitch-headline text-2xl text-[#002637]">{option.title}</div>
                      <p className="mt-3 text-sm leading-6 text-[rgba(27,28,26,0.64)]">{option.description}</p>
                      <div className="mt-auto pt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#002637]">{option.meta}</div>
                    </button>
                  );
                })}
              </div>

              <StitchCard tone="surface" className="hidden p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <StitchTextField
                    label="Geburtsdatum"
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                    required
                    icon={<CalendarDays className="h-4 w-4" />}
                  />
                  <StitchSelectField
                    label="Wertungsklasse"
                    value={form.gender}
                    onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
                    required
                  >
                    <option value="">Auswählen</option>
                    <option value="w">Weiblich</option>
                    <option value="m">Männlich</option>
                  </StitchSelectField>
                </div>

                <div className="mt-4">
                  <StitchSelectField
                    label="Heimathalle"
                    value={form.homeGymId}
                    onChange={(event) => setForm((prev) => ({ ...prev, homeGymId: event.target.value }))}
                    hint="Optional. Du kannst die Halle auch später im Profil ergänzen."
                  >
                    <option value="">Keine Auswahl</option>
                    {gyms.map((gym) => (
                      <option key={gym.id} value={gym.id}>
                        {gym.name} {gym.city ? `(${gym.city})` : ""}
                      </option>
                    ))}
                  </StitchSelectField>
                </div>
              </StitchCard>

              <div className="rounded-[1.1rem] bg-[#f5efe5] p-5 sm:p-6">
                <div className="space-y-4">
                  <label className="flex items-start gap-4">
                    <Checkbox
                      checked={requiredConsentAccepted}
                      onCheckedChange={(checked) => setRequiredConsentAccepted(checked === true)}
                      className="mt-1 h-5 w-5 rounded border-[rgba(0,38,55,0.28)] data-[state=checked]:border-[#a15523] data-[state=checked]:bg-[#a15523]"
                    />
                    <span className="space-y-2 text-sm leading-6 text-[rgba(27,28,26,0.72)]">
                      <span className="block font-semibold text-[#002637]">Teilnahme und Datenschutz</span>
                      <span className="block">{REQUIRED_CONSENT_TEXT}</span>
                      <span className="block text-xs font-medium tracking-[0.04em] text-[rgba(27,28,26,0.56)]">
                        Mehr unter{" "}
                        <Link to="/teilnahmebedingungen" className="font-bold text-[#a15523] underline decoration-[#a15523]/30 underline-offset-4">
                          Teilnahmebedingungen
                        </Link>
                        ,{" "}
                        <Link to="/regelwerk" className="font-bold text-[#a15523] underline decoration-[#a15523]/30 underline-offset-4">
                          Regelwerk
                        </Link>{" "}
                        und{" "}
                        <Link to="/datenschutz" className="font-bold text-[#a15523] underline decoration-[#a15523]/30 underline-offset-4">
                          Datenschutzhinweisen
                        </Link>
                        .
                      </span>
                    </span>
                  </label>

                  <div className="h-px bg-[rgba(0,38,55,0.08)]" />

                  <label className="flex items-start gap-4">
                    <Checkbox
                      checked={marketingOptInRequested}
                      onCheckedChange={(checked) => setMarketingOptInRequested(checked === true)}
                      className="mt-1 h-5 w-5 rounded border-[rgba(0,38,55,0.28)] data-[state=checked]:border-[#003d55] data-[state=checked]:bg-[#003d55]"
                    />
                    <span className="space-y-2 text-sm leading-6 text-[rgba(27,28,26,0.72)]">
                      <span className="block font-semibold text-[#002637]">Optionale Liga-Infos</span>
                      <span className="block">{MARKETING_OPT_IN_TEXT}</span>
                    </span>
                  </label>
                </div>
              </div>

              <StitchCard tone="muted" className="p-5">
                <div className="grid gap-3 text-sm text-[#002637] sm:grid-cols-2">
                  <div><span className="font-semibold text-[rgba(27,28,26,0.56)]">Name:</span> {form.firstName} {form.lastName}</div>
                  <div><span className="font-semibold text-[rgba(27,28,26,0.56)]">E-Mail:</span> {form.email}</div>
                  <div><span className="font-semibold text-[rgba(27,28,26,0.56)]">Disziplin:</span> {selectedLeagueLabel}</div>
                  <div><span className="font-semibold text-[rgba(27,28,26,0.56)]">Wertungsklasse:</span> {form.gender === "w" ? "Weiblich" : form.gender === "m" ? "Männlich" : "-"}</div>
                  <div className="sm:col-span-2">
                    <span className="font-semibold text-[rgba(27,28,26,0.56)]">Heimathalle:</span>{" "}
                    {selectedHomeGym ? `${selectedHomeGym.name}${selectedHomeGym.city ? ` (${selectedHomeGym.city})` : ""}` : "Noch keine Auswahl"}
                  </div>
                </div>
              </StitchCard>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <StitchButton type="button" variant="outline" size="lg" className="md:min-w-[11rem]" onClick={() => setCurrentStep(2)}>
                  Zurück
                </StitchButton>
                <StitchButton type="submit" size="lg" className="md:min-w-[16rem]" disabled={loading || !stepThreeComplete || !requiredConsentAccepted}>
                  {loading ? "Account wird erstellt..." : "Jetzt registrieren"}
                </StitchButton>
              </div>
            </div>
          ) : null}

          <div className="hidden rounded-[1.3rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.06)] px-5 py-4 text-sm leading-6 text-[rgba(242,220,171,0.78)]">
            <span className="font-semibold text-[#f2dcab]">Wichtig:</span> {stepNote}
          </div>

          <div className="text-center text-sm text-[rgba(242,220,171,0.72)]">
            Bereits registriert?{" "}
            <Link to="/app/login" className="font-semibold text-[#f2dcab] underline decoration-[rgba(242,220,171,0.3)] underline-offset-4">
              Zum Login
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Register;
