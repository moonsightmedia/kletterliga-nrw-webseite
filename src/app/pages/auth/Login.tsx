import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/app/auth/AuthProvider";
import { formatUnlockDate } from "@/config/launch";

const Login = () => {
  const { signIn, resetPassword, resendConfirmation, profile, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [resetRequestEmail, setResetRequestEmail] = useState("");
  const [resetRequestLoading, setResetRequestLoading] = useState(false);
  const [resetRequestMessage, setResetRequestMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const unlockDate = formatUnlockDate();

  useEffect(() => {
    const confirmedParam = searchParams.get("confirmed");
    if (confirmedParam === "true") {
      setConfirmed(true);
      navigate("/app/login", { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const passwordResetParam = searchParams.get("password_reset");
    if (passwordResetParam === "true") {
      setPasswordReset(true);
      navigate("/app/login", { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const registeredParam = searchParams.get("registered");
    if (registeredParam === "true") {
      setRegistered(true);
      navigate("/app/login", { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (!authLoading && profile) {
      if (role === "gym_admin") {
        navigate("/app/admin/gym", { replace: true });
      } else if (role === "league_admin") {
        navigate("/app/admin/league", { replace: true });
      }
    }
  }, [profile, role, authLoading, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      navigate("/app", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetRequestLoading(true);
    setResetRequestMessage(null);

    const result = await resetPassword(resetRequestEmail);
    if (result.error) {
      setResetRequestMessage(result.error);
      setResetRequestLoading(false);
      return;
    }

    setResetRequestMessage("Wenn ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.");
    setResetRequestLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setResendMessage("Bitte zuerst deine E-Mail eingeben.");
      return;
    }

    setResendLoading(true);
    setResendMessage(null);

    const result = await resendConfirmation(email);
    if (result.error) {
      setResendMessage(result.error);
      setResendLoading(false);
      return;
    }

    setResendMessage("Wenn ein unbestätigter Account existiert, wurde ein neuer Bestätigungslink gesendet.");
    setResendLoading(false);
  };

  return (
    <div className="overflow-hidden">
      <section className="border-b border-primary/10 bg-[linear-gradient(135deg,rgba(242,220,171,0.28),rgba(255,255,255,0.98)_48%,rgba(0,61,85,0.05)_100%)] px-5 py-6 sm:px-7 sm:py-7">
        <div className="inline-flex -skew-x-6 items-center bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary-foreground shadow-sm">
          <span className="skew-x-6">Liga-App</span>
        </div>
        <div className="mt-5 space-y-3">
          <h1 className="font-headline text-4xl leading-[0.96] text-primary">Einloggen</h1>
          <p className="text-base leading-7 text-muted-foreground">
            Zugriff auf dein Profil, dein Dashboard und alle Bereiche, die für deinen Account schon freigeschaltet sind.
          </p>
        </div>
      </section>

      <section className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
        {registered && (
          <div className="rounded-[22px] border border-secondary/15 bg-accent/25 px-4 py-4">
            <div className="flex items-start gap-3">
              <MailCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">Account erstellt. Bitte bestätige jetzt deine E-Mail.</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Danach kannst du dich einloggen, dein Profil pflegen und das Dashboard nutzen. Hallen,
                  Codes, Ranglisten und weitere Liga-Funktionen werden am {unlockDate} freigeschaltet.
                </p>
              </div>
            </div>
          </div>
        )}

        {confirmed && (
          <div className="rounded-[22px] border border-primary/15 bg-primary/[0.05] px-4 py-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">Deine E-Mail-Adresse wurde erfolgreich bestätigt.</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Du kannst dich jetzt einloggen. Profil und Dashboard sind direkt nutzbar, die
                  übrigen Liga-Bereiche öffnen am {unlockDate}.
                </p>
              </div>
            </div>
          </div>
        )}

        {passwordReset && (
          <div className="rounded-[22px] border border-primary/15 bg-primary/[0.05] px-4 py-4">
            <p className="text-sm font-semibold text-primary">Dein Passwort wurde erfolgreich zurückgesetzt.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Du kannst dich jetzt mit deinem neuen Passwort einloggen.
            </p>
          </div>
        )}

        <div className="rounded-[22px] border border-primary/10 bg-primary/[0.03] px-4 py-4">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary">Pre-Launch bis {unlockDate}</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Dein Account, Profil und Dashboard sind schon aktiv. Die wettbewerbsrelevanten Bereiche
                werden zum Saisonstart freigeschaltet.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowResetRequest((prev) => !prev)}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              aria-label="Passwort vergessen"
            >
              Passwort vergessen?
            </button>

            {showResetRequest && (
              <div className="space-y-3 rounded-[20px] border border-primary/10 bg-primary/[0.03] p-4">
                <Label htmlFor="reset-email">Reset-E-Mail</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetRequestEmail}
                  onChange={(event) => setResetRequestEmail(event.target.value)}
                  placeholder="deine@email.de"
                  required
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleResetRequest}
                  disabled={resetRequestLoading || !resetRequestEmail}
                >
                  <span className="skew-x-6">
                    {resetRequestLoading ? "Wird gesendet..." : "Reset-Link senden"}
                  </span>
                </Button>
                {resetRequestMessage && (
                  <p className="text-xs leading-5 text-muted-foreground">{resetRequestMessage}</p>
                )}
              </div>
            )}
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          {(error?.toLowerCase().includes("bestaetigt") ||
            error?.toLowerCase().includes("bestätigt")) && (
            <div className="space-y-3 rounded-[20px] border border-primary/10 bg-primary/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">
                Bestätigungslink erneut senden
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
              >
                <span className="skew-x-6">
                  {resendLoading ? "Wird gesendet..." : "Bestätigungslink erneut senden"}
                </span>
              </Button>
              {resendMessage && <p className="text-xs leading-5 text-muted-foreground">{resendMessage}</p>}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            <span className="skew-x-6">{loading ? "Einloggen..." : "Einloggen"}</span>
          </Button>
        </form>

        <div className="text-sm text-muted-foreground">
          Noch kein Account?{" "}
          <Link to="/app/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Jetzt registrieren
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Login;
