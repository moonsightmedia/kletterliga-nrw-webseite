import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Flag,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGyms } from "@/services/appApi";
import type { Gym } from "@/services/appTypes";
import { cn } from "@/lib/utils";
import { formatUnlockDate } from "@/config/launch";

type RegisterFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthDate: string;
  gender: string;
  homeGymId: string;
  league: string;
};

const steps = [
  {
    step: 1,
    eyebrow: "Schritt 1",
    label: "Konto",
    detail: "Persönliche Daten und Login",
    icon: UserRound,
  },
  {
    step: 2,
    eyebrow: "Schritt 2",
    label: "Liga",
    detail: "Wertung, Geburtsdatum und Halle",
    icon: Flag,
  },
  {
    step: 3,
    eyebrow: "Schritt 3",
    label: "Start",
    detail: "Freischaltung und letzter Check",
    icon: CalendarDays,
  },
];

const Register = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<RegisterFormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    birthDate: "",
    gender: "",
    homeGymId: "",
    league: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadGyms = async () => {
      try {
        const { data } = await listGyms();
        if (active) {
          setGyms(data ?? []);
        }
      } catch (error) {
        console.error("Failed to load gyms for registration", error);
      }
    };

    void loadGyms();

    return () => {
      active = false;
    };
  }, []);

  const unlockDate = formatUnlockDate();
  const stepOneComplete =
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.password.length >= 6;
  const stepTwoComplete =
    form.birthDate.trim().length > 0 &&
    form.gender.trim().length > 0 &&
    form.league.trim().length > 0;
  const canAdvance =
    currentStep === 1 ? stepOneComplete : currentStep === 2 ? stepTwoComplete : true;

  const stepNote = useMemo(() => {
    if (currentStep === 1) {
      return "Wir nutzen diese Daten nur für deinen Login und die Bestätigungsmail. Das Passwort braucht mindestens 6 Zeichen.";
    }
    if (currentStep === 2) {
      return "Mit diesen Angaben ordnen wir dich sauber deiner Liga und Wertung zu. Die Heimat-Halle bleibt optional.";
    }
    return `Dein Account wird sofort erstellt. Hallen, Codes, Ranglisten und weitere Wettkampfbereiche öffnen am ${unlockDate}.`;
  }, [currentStep, unlockDate]);

  const goToNextStep = () => {
    if (currentStep === 1 && !stepOneComplete) {
      toast({
        title: "Pflichtfelder fehlen",
        description: "Bitte vervollständige zuerst deine Konto-Daten.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep === 2 && !stepTwoComplete) {
      toast({
        title: "Liga-Setup unvollständig",
        description: "Bitte ergänze Geburtsdatum, Wertungsklasse und Liga.",
        variant: "destructive",
      });
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (currentStep < 3) {
      goToNextStep();
      return;
    }

    if (!stepOneComplete || !stepTwoComplete) {
      toast({
        title: "Registrierung unvollständig",
        description: "Bitte prüfe deine Angaben in den vorherigen Schritten.",
        variant: "destructive",
      });
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
      });

      if (result.error) {
        toast({
          title: "Registrierung fehlgeschlagen",
          description: result.error,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Account erstellt",
        description: "Im nächsten Schritt zeigen wir dir, wie es weitergeht.",
        variant: "success",
      });

      navigate("/app/register/success");
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const selectedHomeGym = gyms.find((gym) => gym.id === form.homeGymId);

  return (
    <div className="overflow-hidden">
      <section className="border-b border-primary/10 bg-[linear-gradient(135deg,rgba(242,220,171,0.34),rgba(255,255,255,0.98)_42%,rgba(0,61,85,0.05)_100%)] px-5 py-6 sm:px-8 sm:py-8">
        <div className="inline-flex -skew-x-6 items-center bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary-foreground shadow-sm">
          <span className="skew-x-6">Saisonstart vorbereiten</span>
        </div>

        <div className="mt-5 max-w-3xl space-y-4">
          <h1 className="font-headline text-4xl leading-[0.96] text-primary sm:text-5xl">
            Erstelle deinen Liga-Account in drei klaren Schritten.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Lege deinen Account und dein Profil jetzt in Ruhe an. Dein Dashboard ist direkt nutzbar,
            die wettbewerbsrelevanten Bereiche werden am {unlockDate} freigeschaltet.
          </p>
        </div>

        <div className="mt-5 space-y-3 text-sm text-primary">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
            <span>Account, Profil und Liga-Setup kannst du sofort anlegen und prüfen.</span>
          </div>
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
            <span>Hallen, Codes, Ranglisten und weitere Liga-Funktionen öffnen gesammelt am {unlockDate}.</span>
          </div>
        </div>

        <div className="mt-6 grid overflow-hidden rounded-[26px] border border-primary/10 bg-background/85 sm:grid-cols-3">
          {steps.map(({ step, eyebrow, label, detail, icon: Icon }, index) => {
            const isActive = currentStep === step;
            const isComplete = currentStep > step;

            return (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 sm:px-5",
                  index > 0 && "border-t border-primary/10 sm:border-l sm:border-t-0",
                  isActive && "bg-primary/[0.045]",
                  isComplete && "bg-secondary/[0.06]",
                )}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 flex-shrink-0 items-center justify-center -skew-x-6 border text-primary transition-colors",
                    isActive && "border-secondary bg-secondary text-secondary-foreground",
                    isComplete && "border-primary bg-primary text-primary-foreground",
                    !isActive && !isComplete && "border-primary/20 bg-accent/45",
                  )}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5 skew-x-6" />
                  ) : (
                    <Icon className="h-5 w-5 skew-x-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
                    {eyebrow}
                  </div>
                  <div className="mt-1 text-base font-semibold text-primary">{label}</div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="px-5 py-6 sm:px-8 sm:py-8">
        <div className="space-y-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex -skew-x-6 items-center border border-primary/15 bg-accent/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
                  <span className="skew-x-6">Konto anlegen</span>
                </div>
                <h2 className="font-headline text-3xl leading-tight text-primary sm:text-[2.2rem]">
                  Deine Basisdaten.
                </h2>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Wir brauchen nur die Angaben, mit denen wir deinen Account anlegen und die Bestätigungsmail verschicken.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex -skew-x-6 items-center border border-primary/15 bg-accent/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
                  <span className="skew-x-6">Liga vorbereiten</span>
                </div>
                <h2 className="font-headline text-3xl leading-tight text-primary sm:text-[2.2rem]">
                  Dein Liga-Setup.
                </h2>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Diese Angaben sorgen dafür, dass Wertung, Liga und Heimat-Halle direkt richtig hinterlegt sind.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Geburtsdatum</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => setForm({ ...form, birthDate: event.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Wertungsklasse (m/w)</Label>
                  <select
                    id="gender"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.gender}
                    onChange={(event) => setForm({ ...form, gender: event.target.value })}
                    required
                  >
                    <option value="">Auswählen</option>
                    <option value="w">Weiblich</option>
                    <option value="m">Männlich</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
                <div className="space-y-2">
                  <Label htmlFor="league">Liga</Label>
                  <select
                    id="league"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.league}
                    onChange={(event) => setForm({ ...form, league: event.target.value })}
                    required
                  >
                    <option value="">Auswählen</option>
                    <option value="toprope">Toprope</option>
                    <option value="lead">Vorstieg</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="homeGym">Heimat-Halle (optional)</Label>
                  <select
                    id="homeGym"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.homeGymId}
                    onChange={(event) => setForm({ ...form, homeGymId: event.target.value })}
                  >
                    <option value="">Keine Auswahl</option>
                    {gyms.map((gym) => (
                      <option key={gym.id} value={gym.id}>
                        {gym.name} {gym.city ? `(${gym.city})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex -skew-x-6 items-center border border-primary/15 bg-accent/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
                  <span className="skew-x-6">Vor dem letzten Klick</span>
                </div>
                <h2 className="font-headline text-3xl leading-tight text-primary sm:text-[2.2rem]">
                  So geht es nach der Registrierung weiter.
                </h2>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Dein Account steht sofort. Danach bestätigst du kurz deine E-Mail und bist startklar für den Saisonstart.
                </p>
              </div>

              <div className="overflow-hidden rounded-[26px] border border-primary/10">
                <div className="flex gap-4 px-4 py-4 sm:px-5">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center -skew-x-6 bg-primary text-primary-foreground">
                    <LockKeyhole className="h-5 w-5 skew-x-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">Account sofort aktiv</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Wir erstellen dein Konto direkt nach dem Klick und senden dir sofort die Bestätigungsmail.
                    </p>
                  </div>
                </div>
                <div className="border-t border-primary/10 px-4 py-4 sm:px-5">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center -skew-x-6 bg-accent text-primary">
                      <CheckCircle2 className="h-5 w-5 skew-x-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">Dashboard direkt nutzbar</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Nach der Mail-Bestätigung kannst du dich einloggen, dein Profil pflegen und dich in Ruhe vorbereiten.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-primary/10 px-4 py-4 sm:px-5">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center -skew-x-6 bg-secondary text-secondary-foreground">
                      <CalendarDays className="h-5 w-5 skew-x-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">Volle Freischaltung am {unlockDate}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Hallen, Codes, Ranglisten und weitere Liga-Bereiche werden dann automatisch freigeschaltet.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-secondary/15 bg-accent/25 px-4 py-4 sm:px-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
                  Dein Check
                </div>
                <div className="mt-3 grid gap-3 text-sm text-primary sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Name:</span> {form.firstName} {form.lastName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">E-Mail:</span> {form.email}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Liga:</span>{" "}
                    {form.league === "lead" ? "Vorstieg" : "Toprope"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Wertung:</span>{" "}
                    {form.gender === "w" ? "Weiblich" : "Männlich"}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Heimat-Halle:</span>{" "}
                    {selectedHomeGym
                      ? `${selectedHomeGym.name}${selectedHomeGym.city ? ` (${selectedHomeGym.city})` : ""}`
                      : "Noch keine Auswahl"}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[22px] border border-primary/10 bg-primary/[0.03] px-4 py-4 sm:px-5">
            <p className="text-sm leading-6 text-muted-foreground">
              <span className="font-semibold text-primary">Wichtig:</span> {stepNote}
            </p>
          </div>

          <div className="flex flex-col gap-4 border-t border-primary/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Bereits registriert?{" "}
              <Link to="/app/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Zum Login
              </Link>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
                  className="w-full sm:w-auto"
                >
                  <span className="inline-flex items-center gap-2 skew-x-6">
                    <ArrowLeft className="h-4 w-4" />
                    Zurück
                  </span>
                </Button>
              )}

              {currentStep < 3 ? (
                <Button type="submit" disabled={!canAdvance} className="w-full sm:w-auto">
                  <span className="inline-flex items-center gap-2 skew-x-6">
                    Weiter
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              ) : (
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  <span className="inline-flex items-center gap-2 skew-x-6">
                    {loading ? "Account wird erstellt..." : "Account erstellen"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Register;
