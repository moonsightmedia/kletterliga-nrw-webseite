import type { MarketingEmailStatus, ProfileConsent } from "@/services/appTypes";

export const PARTICIPATION_TERMS_VERSION = "2026-04-02-v1";
export const PRIVACY_NOTICE_VERSION = "2026-04-02-v1";
export const MARKETING_EMAIL_SCOPE = "liga_updates_partner_offers";

export const REQUIRED_CONSENT_TEXT =
  "Ich akzeptiere die Teilnahmebedingungen, habe die Datenschutzhinweise gelesen und stimme zu, dass meine E-Mail für notwendige Infos zu Account, Teilnahme und Finale genutzt wird.";

export const MARKETING_OPT_IN_TEXT =
  "Ich möchte zusätzlich Liga-News und ausgewählte Partner-Infos per E-Mail erhalten. Das gilt erst nach Bestätigung per E-Mail und ist jederzeit widerrufbar.";

export const hasAcceptedRequiredParticipationConsent = (
  consent: Pick<
    ProfileConsent,
    "participation_terms_accepted_at" | "privacy_notice_acknowledged_at"
  > | null | undefined,
) =>
  Boolean(
    consent?.participation_terms_accepted_at &&
      consent?.privacy_notice_acknowledged_at,
  );

export const getMarketingEmailStatusLabel = (
  status: MarketingEmailStatus | null | undefined,
) => {
  switch (status) {
    case "pending":
      return "Bestätigung ausstehend";
    case "subscribed":
      return "Aktiv";
    case "unsubscribed":
      return "Abgemeldet";
    default:
      return "Nicht aktiviert";
  }
};

export const getMarketingEmailStatusHint = (
  status: MarketingEmailStatus | null | undefined,
) => {
  switch (status) {
    case "pending":
      return "Bitte bestätige zuerst den Link in der E-Mail, damit freiwillige Informationen freigeschaltet werden.";
    case "subscribed":
      return "Du erhältst freiwillige Informationen zur Kletterliga NRW und zu ausgewählten Partner-Angeboten.";
    case "unsubscribed":
      return "Du hast freiwillige Informationsmails abbestellt. Notwendige Teilnahme-Mails erhältst du weiterhin.";
    default:
      return "Du erhältst derzeit nur notwendige Informationen zu Account, Teilnahme und Finale.";
  }
};
