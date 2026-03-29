import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, KeyRound, Mail, MailCheck, RefreshCcw } from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { consumeArchivedAccountNotice } from "@/app/auth/archivedAccountNotice";
import { StitchButton } from "@/app/components/StitchPrimitives";
import { formatUnlockDate, useLaunchSettings } from "@/config/launch";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const Notice = ({
  title,
  description,
  tone = "cream",
}: {
  title: string;
  description: string;
  tone?: "cream" | "navy";
}) => (
  <div
    className={cn(
      "rounded-[1.35rem] px-4 py-4 text-left shadow-[0_18px_34px_rgba(0,0,0,0.12)]",
      tone === "cream" ? "bg-[#f2dcab] text-[#002637]" : "bg-[rgba(242,220,171,0.1)] text-[#f2dcab]",
    )}
  >
    <div className="stitch-kicker text-[#a15523]">{title}</div>
    <p
      className={cn(
        "mt-2 text-sm leading-6",
        tone === "cream" ? "text-[rgba(27,28,26,0.68)]" : "text-[rgba(242,220,171,0.76)]",
      )}
    >
      {description}
    </p>
  </div>
);

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
  const [archivedAccount, setArchivedAccount] = useState(false);
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [resetRequestEmail, setResetRequestEmail] = useState("");
  const [resetRequestLoading, setResetRequestLoading] = useState(false);
  const [resetRequestMessage, setResetRequestMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const { unlockDate, participantLaunchStarted } = useLaunchSettings();
  const unlockDateLabel = formatUnlockDate(unlockDate);

  useEffect(() => {
    if (searchParams.get("confirmed") === "true") {
      setConfirmed(true);
      navigate("/app/login", { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (searchParams.get("password_reset") === "true") {
      setPasswordReset(true);
      navigate("/app/login", { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setRegistered(true);
      navigate("/app/login", { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (consumeArchivedAccountNotice()) {
      setArchivedAccount(true);
    }
  }, []);

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
        return;
      }
      navigate("/app", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async () => {
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
      setResendMessage("Bitte gib zuerst deine E-Mail-Adresse ein.");
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

  const needsConfirmationResend =
    error?.toLowerCase().includes("bestätigt") ||
    error?.toLowerCase().includes("bestaetigt") ||
    error?.toLowerCase().includes("bestatigt");

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center">
        <div className="inline-flex items-center justify-center rounded-[1.75rem] bg-[#f2dcab] p-5 shadow-[0_24px_48px_rgba(0,0,0,0.28)]">
          <img src={logo} alt="Kletterliga NRW" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
        </div>

        <h1 className="stitch-headline mt-8 text-[2.7rem] leading-[0.95] text-[#f2dcab] sm:text-[3.2rem]">
          Kletterliga NRW
        </h1>
        <p className="mt-3 font-['Manrope'] text-sm font-semibold uppercase tracking-[0.22em] text-[rgba(242,220,171,0.64)]">
          Dein Login für den Teilnehmerbereich
        </p>
      </div>

      <div className="mt-7 space-y-3">
        {registered ? (
          <Notice
            title="Account erstellt"
            description={
              participantLaunchStarted
                ? "Bitte bestätige jetzt deine E-Mail. Danach landest du direkt in deinem Profil. Hallen, Codes und Ranglisten sind dort bereits offen."
                : `Bitte bestätige jetzt deine E-Mail. Danach landest du direkt in deinem Profil. Hallen, Codes und Ranglisten öffnen am ${unlockDateLabel}.`
            }
          />
        ) : null}

        {confirmed ? (
          <Notice
            title="E-Mail bestätigt"
            description="Deine Adresse wurde erfolgreich bestätigt. Du kannst dich jetzt direkt anmelden."
          />
        ) : null}

        {passwordReset ? (
          <Notice
            title="Passwort aktualisiert"
            description="Dein Passwort wurde zurückgesetzt. Du kannst dich jetzt mit dem neuen Passwort einloggen."
          />
        ) : null}

        {archivedAccount ? (
          <Notice
            title="Konto archiviert"
            description="Dieses Konto wurde archiviert. Bitte kontaktiere die Liga, wenn du wieder freigeschaltet werden möchtest."
            tone="navy"
          />
        ) : null}
      </div>

      <div className="relative mt-7 overflow-hidden rounded-[2rem] bg-[#f2dcab] p-7 shadow-[0_28px_52px_rgba(0,0,0,0.32)] sm:p-8">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#a15523]/5" />

        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="email" className="stitch-kicker ml-1 text-[#002637]">
              E-Mail-Adresse
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[rgba(0,38,55,0.36)]" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="deine@email.de"
                className="w-full rounded-[1.1rem] border-0 border-b-2 border-[rgba(0,38,55,0.08)] bg-white py-4 pl-12 pr-4 font-['Space_Grotesk'] text-lg font-medium text-[#002637] placeholder:text-[rgba(0,38,55,0.26)] focus:border-[#003d55] focus:outline-none focus:ring-0"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 px-1">
              <label htmlFor="password" className="stitch-kicker text-[#002637]">
                Passwort
              </label>
              <button
                type="button"
                onClick={() => setShowResetRequest((prev) => !prev)}
                className="font-['Space_Grotesk'] text-[0.72rem] font-extrabold uppercase tracking-tight text-[#a15523] transition hover:text-[#002637]"
              >
                Passwort vergessen?
              </button>
            </div>

            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[rgba(0,38,55,0.36)]" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-[1.1rem] border-0 border-b-2 border-[rgba(0,38,55,0.08)] bg-white py-4 pl-12 pr-4 font-['Space_Grotesk'] text-lg font-medium text-[#002637] placeholder:text-[rgba(0,38,55,0.26)] focus:border-[#003d55] focus:outline-none focus:ring-0"
                required
              />
            </div>
          </div>

          {showResetRequest ? (
            <div className="rounded-[1.2rem] bg-white/75 p-4">
              <div className="space-y-3">
                <div className="stitch-kicker text-[#002637]">E-Mail für Reset-Link</div>
                <input
                  type="email"
                  value={resetRequestEmail}
                  onChange={(event) => setResetRequestEmail(event.target.value)}
                  placeholder="deine@email.de"
                  className="w-full rounded-[1rem] border-0 border-b-2 border-[rgba(0,38,55,0.08)] bg-white px-4 py-3 text-base text-[#002637] placeholder:text-[rgba(0,38,55,0.3)] focus:border-[#003d55] focus:outline-none"
                />
                <StitchButton
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResetRequest}
                  disabled={resetRequestLoading || !resetRequestEmail}
                >
                  {resetRequestLoading ? "Wird gesendet" : "Reset-Link senden"}
                </StitchButton>
                {resetRequestMessage ? (
                  <p className="text-xs leading-5 text-[rgba(27,28,26,0.64)]">{resetRequestMessage}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm font-semibold text-[#ba1a1a]">{error}</p> : null}

          {needsConfirmationResend ? (
            <div className="rounded-[1.2rem] bg-white/75 p-4">
              <div className="space-y-3">
                <div className="stitch-kicker text-[#a15523]">Bestätigungslink</div>
                <p className="text-sm leading-6 text-[rgba(27,28,26,0.68)]">
                  Wenn dein Account noch nicht bestätigt ist, schicken wir dir einen frischen Link.
                </p>
                <StitchButton
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                >
                  <RefreshCcw className="h-4 w-4" />
                  {resendLoading ? "Wird gesendet" : "Bestätigungslink senden"}
                </StitchButton>
                {resendMessage ? (
                  <p className="text-xs leading-5 text-[rgba(27,28,26,0.64)]">{resendMessage}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[1rem] bg-[#a15523] px-4 py-4 font-['Space_Grotesk'] text-sm font-black uppercase tracking-[0.22em] text-[#f2dcab] shadow-[0_16px_28px_rgba(161,85,35,0.28)] transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Einloggen..." : "Einloggen"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>
      </div>

      <div className="mt-7 text-center">
        <p className="font-['Space_Grotesk'] text-sm font-medium uppercase tracking-[0.2em] text-[rgba(242,220,171,0.58)]">
          Neu bei der Kletterliga NRW?
          <Link
            to="/app/register"
            className="ml-3 font-black text-[#f2dcab] underline-offset-4 hover:underline"
          >
            Jetzt registrieren
          </Link>
        </p>
      </div>

      {!registered && !confirmed && !passwordReset ? (
        <div className="mt-5 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(242,220,171,0.08)] px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(242,220,171,0.62)]">
            <MailCheck className="h-4 w-4" />
            {participantLaunchStarted ? "Ligafunktionen jetzt offen" : `Ligafunktionen ab ${unlockDateLabel}`}
          </div>
        </div>
      ) : null}

      {confirmed ? (
        <div className="mt-4 flex items-center justify-center text-[rgba(242,220,171,0.76)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(242,220,171,0.08)] px-4 py-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Bestätigung erfolgreich
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Login;

