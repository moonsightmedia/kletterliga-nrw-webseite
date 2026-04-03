import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, MailCheck, MailMinus, MailPlus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import {
  getMarketingEmailStatusHint,
  getMarketingEmailStatusLabel,
} from "@/data/participationConsent";

const NotificationSettings = () => {
  const navigate = useNavigate();
  const {
    profileConsent,
    requestMarketingOptInEmail,
    unsubscribeMarketingEmails,
    user,
  } = useAuth();
  const [loadingAction, setLoadingAction] = useState<"activate" | "resend" | "unsubscribe" | null>(null);

  const status = profileConsent?.marketing_email_status ?? "not_subscribed";
  const statusLabel = getMarketingEmailStatusLabel(status);
  const statusHint = getMarketingEmailStatusHint(status);

  const handleActivate = async () => {
    setLoadingAction(status === "pending" ? "resend" : "activate");
    const result = await requestMarketingOptInEmail();
    setLoadingAction(null);

    if (result.error) {
      toast({ title: "Nicht möglich", description: result.error, variant: "destructive" });
      return;
    }

    toast({
      title: status === "pending" ? "Bestätigungs-E-Mail erneut gesendet" : "Bestätigungs-E-Mail gesendet",
      description: "Bitte bestätige den Link in deinem Postfach, damit wir dir freiwillige Liga-Infos schicken dürfen.",
      variant: "success",
    });
  };

  const handleUnsubscribe = async () => {
    setLoadingAction("unsubscribe");
    const result = await unsubscribeMarketingEmails();
    setLoadingAction(null);

    if (result.error) {
      toast({ title: "Nicht möglich", description: result.error, variant: "destructive" });
      return;
    }

    toast({
      title: "Freiwillige Infos abbestellt",
      description: "Wichtige Teilnahme- und Organisationsmails bleiben weiterhin aktiv.",
      variant: "success",
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <section className="rounded-xl bg-[#003d55] p-6 text-[#f2dcab] shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f2dcab] text-[#003d55]">
            <Mail className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <div className="font-['Space_Grotesk'] text-2xl font-bold uppercase tracking-tight">
              E-Mail-Einstellungen
            </div>
            <p className="text-sm leading-7 text-[rgba(242,220,171,0.78)]">
              Hier steuerst du nur die freiwilligen Liga-Infos. Notwendige Mails zu Account, Teilnahme, Qualifikation
              und Finale bleiben unabhängig davon aktiv.
            </p>
          </div>
        </div>
      </section>

      <StitchCard tone="surface" className="p-5">
        <div className="space-y-4">
          <div className="rounded-[1.2rem] bg-[#f5efe5] p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#71787d]">Aktueller Status</div>
            <div className="mt-2 font-['Space_Grotesk'] text-2xl font-bold text-[#003d55]">{statusLabel}</div>
            <p className="mt-2 text-sm leading-6 text-[rgba(27,28,26,0.68)]">{statusHint}</p>
            {user?.email ? (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(27,28,26,0.46)]">
                Adresse: {user.email}
              </p>
            ) : null}
          </div>

          <div className="rounded-[1.2rem] border border-[rgba(0,38,55,0.1)] bg-white p-4">
            <div className="font-['Space_Grotesk'] text-lg font-bold text-[#003d55]">Pflicht-Mails</div>
            <p className="mt-2 text-sm leading-6 text-[rgba(27,28,26,0.68)]">
              Dazu gehören Login, Passwort-Reset, Qualifikation, Halbfinale, Finale, Fristen und wesentliche
              organisatorische Änderungen. Diese Nachrichten kannst du hier nicht abschalten.
            </p>
          </div>

          {status === "subscribed" ? (
            <StitchButton type="button" variant="outline" className="w-full" onClick={() => void handleUnsubscribe()} disabled={loadingAction !== null}>
              <MailMinus className="h-4 w-4" />
              {loadingAction === "unsubscribe" ? "Wird abbestellt..." : "Freiwillige Infos abbestellen"}
            </StitchButton>
          ) : (
            <StitchButton type="button" className="w-full" onClick={() => void handleActivate()} disabled={loadingAction !== null}>
              {status === "pending" ? <MailCheck className="h-4 w-4" /> : <MailPlus className="h-4 w-4" />}
              {loadingAction === "activate" || loadingAction === "resend"
                ? "Wird gesendet..."
                : status === "pending"
                  ? "Bestätigungs-E-Mail erneut senden"
                  : "Freiwillige Infos aktivieren"}
            </StitchButton>
          )}

          <StitchButton type="button" variant="ghost" className="w-full" onClick={() => navigate("/app/profile")}>
            Zurück zum Profil
          </StitchButton>
        </div>
      </StitchCard>
    </div>
  );
};

export default NotificationSettings;
