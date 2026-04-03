import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/app/auth/AuthProvider";
import {
  StitchBadge,
  StitchButton,
  StitchCard,
} from "@/app/components/StitchPrimitives";
import {
  MARKETING_OPT_IN_TEXT,
  REQUIRED_CONSENT_TEXT,
} from "@/data/participationConsent";

export const ParticipationConsentGate = () => {
  const { user, acceptParticipationConsents, signOut } = useAuth();
  const [requiredAccepted, setRequiredAccepted] = useState(false);
  const [marketingRequested, setMarketingRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!requiredAccepted) {
      setError(
        "Bitte bestätige zuerst die Teilnahmebedingungen und Datenschutzhinweise.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    const result = await acceptParticipationConsents({
      marketingOptInRequested: marketingRequested,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (marketingRequested && result.marketingOptInEmailSent === false) {
      setNotice(
        result.marketingOptInEmailError ||
          "Dein Account ist freigeschaltet. Die Bestätigungs-E-Mail für freiwillige Infos konnte gerade noch nicht gesendet werden.",
      );
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(161,85,35,0.12),transparent_32%),linear-gradient(180deg,#003d55_0%,#002637_100%)] px-4 py-8 text-[#f2dcab] sm:py-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="space-y-3 text-center">
          <StitchBadge
            tone="cream"
            className="mx-auto rounded-[0.9rem] px-4 py-1.5"
          >
            Teilnahme
          </StitchBadge>
          <h1 className="stitch-headline text-4xl leading-[0.94] text-[#f2dcab] sm:text-5xl">
            Einmal kurz bestätigen.
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-6 text-[rgba(242,220,171,0.8)] sm:text-base">
            Wir dokumentieren deine Zustimmung zu Teilnahmebedingungen und
            trennen notwendige Mails von optionalen Liga-Infos.
          </p>
          {user?.email ? (
            <div className="inline-flex items-center gap-2 rounded-[0.95rem] border border-[rgba(242,220,171,0.16)] bg-[rgba(242,220,171,0.08)] px-4 py-2 text-sm text-[rgba(242,220,171,0.82)]">
              <Mail className="h-4 w-4" />
              {user.email}
            </div>
          ) : null}
        </div>

        <StitchCard tone="cream" className="rounded-[1.2rem] p-5 sm:p-6">
          <div className="space-y-4 text-[#002637]">
            <div className="flex items-start gap-3 rounded-[0.95rem] border border-[rgba(0,38,55,0.08)] bg-[#f8f1e6] p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-[#a15523]" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-[0.6rem] bg-[#a15523] px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white">
                    Pflicht
                  </span>
                  <div className="font-['Space_Grotesk'] text-base font-bold">
                    Notwendige E-Mails
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-[rgba(27,28,26,0.72)]">
                  Account, Passwort, Qualifikation, Finale, Fristen und wichtige
                  organisatorische Änderungen.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-4 rounded-[0.95rem] border border-[rgba(0,38,55,0.12)] bg-white p-4 sm:p-5">
              <Checkbox
                checked={requiredAccepted}
                onCheckedChange={(checked) =>
                  setRequiredAccepted(checked === true)
                }
                className="mt-1 h-5 w-5 rounded border-[rgba(0,38,55,0.28)] data-[state=checked]:border-[#a15523] data-[state=checked]:bg-[#a15523]"
              />
              <span className="space-y-2 text-sm leading-6 text-[rgba(27,28,26,0.78)]">
                <span className="block font-semibold text-[#002637]">
                  Teilnahme und Datenschutz
                </span>
                <span className="block">{REQUIRED_CONSENT_TEXT}</span>
                <span className="block text-xs font-medium tracking-[0.04em] text-[rgba(27,28,26,0.56)]">
                  Mehr unter{" "}
                  <Link
                    to="/teilnahmebedingungen"
                    className="font-bold text-[#a15523] underline decoration-[#a15523]/30 underline-offset-4"
                  >
                    Teilnahmebedingungen
                  </Link>
                  ,{" "}
                  <Link
                    to="/regelwerk"
                    className="font-bold text-[#a15523] underline decoration-[#a15523]/30 underline-offset-4"
                  >
                    Regelwerk
                  </Link>{" "}
                  und{" "}
                  <Link
                    to="/datenschutz"
                    className="font-bold text-[#a15523] underline decoration-[#a15523]/30 underline-offset-4"
                  >
                    Datenschutzhinweisen
                  </Link>
                  .
                </span>
              </span>
            </label>

            <label className="flex items-start gap-4 rounded-[0.95rem] border border-[rgba(0,38,55,0.12)] bg-white p-4 sm:p-5">
              <Checkbox
                checked={marketingRequested}
                onCheckedChange={(checked) =>
                  setMarketingRequested(checked === true)
                }
                className="mt-1 h-5 w-5 rounded border-[rgba(0,38,55,0.28)] data-[state=checked]:border-[#003d55] data-[state=checked]:bg-[#003d55]"
              />
              <span className="space-y-2 text-sm leading-6 text-[rgba(27,28,26,0.78)]">
                <span className="block font-semibold text-[#002637]">
                  Optionale Liga-Infos
                </span>
                <span className="block">{MARKETING_OPT_IN_TEXT}</span>
              </span>
            </label>

            {error ? (
              <div className="rounded-[0.95rem] border border-[#ba1a1a]/20 bg-[#fff1f1] px-4 py-3 text-sm text-[#8f1d1d]">
                {error}
              </div>
            ) : null}

            {notice ? (
              <div className="rounded-[0.95rem] border border-[#003d55]/12 bg-[#edf6f9] px-4 py-3 text-sm text-[#003d55]">
                {notice}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <StitchButton
                type="button"
                variant="outline"
                className="rounded-[0.95rem]"
                onClick={() => void signOut()}
              >
                Abmelden
              </StitchButton>
              <StitchButton
                type="button"
                className="rounded-[0.95rem]"
                onClick={() => void handleSubmit()}
                disabled={loading || !requiredAccepted}
              >
                {loading ? "Wird gespeichert..." : "Zustimmung speichern"}
              </StitchButton>
            </div>
          </div>
        </StitchCard>
      </div>
    </div>
  );
};
