import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { MaterialIcon } from "@/app/components/MaterialIcon";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { formatUnlockDate, useLaunchSettings } from "@/config/launch";
import { getMyPartnerVoucherRedemption } from "@/services/appApi";
import { supabase } from "@/services/supabase";
import { useParticipantProfileEditor } from "./useParticipantProfileEditor";
import { getClassLabel } from "./participantData";

const SettingsRow = ({
  icon,
  label,
  hint,
  disabled = false,
  onClick,
}: {
  icon: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}) => (
  <button
    type="button"
    onClick={() => {
      if (disabled) return;
      void onClick();
    }}
    disabled={disabled}
    className={`group flex w-full items-center gap-3 rounded-[0.95rem] px-3 py-3.5 text-left transition-colors ${
      disabled
        ? "cursor-not-allowed opacity-85"
        : "hover:bg-[#f2dcab]/16"
    }`}
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-[#f7e7bd] text-[#003d55] transition-colors group-hover:bg-[#edd39c]">
      <MaterialIcon name={icon} />
    </span>
    <span className="min-w-0">
      <span className="block font-['Space_Grotesk'] text-sm font-bold text-[#003d55]">{label}</span>
      {hint ? (
        <span className="mt-0.5 block text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#6d7478]">
          {hint}
        </span>
      ) : null}
    </span>
    {disabled ? (
      <MaterialIcon
        name="check_circle"
        className="ml-auto text-base text-[#2f9d76]"
      />
    ) : (
      <MaterialIcon
        name="chevron_right"
        className="ml-auto text-sm text-[#71787d]"
      />
    )}
  </button>
);

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const PRELAUNCH_NOTICE_STORAGE_KEY = "kl_profile_prelaunch_notice_dismissed_until";
const PRELAUNCH_NOTICE_DISMISS_THRESHOLD = 96;
const PARTNER_VOUCHER_SLUG = "kletterladen_nrw";

const getPrelaunchDismissToken = (unlockDate: Date) => unlockDate.toISOString();
const formatVoucherTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const readPrelaunchNoticeDismissed = (unlockDate: Date) => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PRELAUNCH_NOTICE_STORAGE_KEY) === getPrelaunchDismissToken(unlockDate);
};

const writePrelaunchNoticeDismissed = (unlockDate: Date) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRELAUNCH_NOTICE_STORAGE_KEY, getPrelaunchDismissToken(unlockDate));
};

const PrelaunchNoticeCard = ({
  unlockDateLabel,
  onDismiss,
}: {
  unlockDateLabel: string;
  onDismiss: () => void;
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef<number | null>(null);

  const resetSwipeState = () => {
    startXRef.current = null;
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  const commitDismiss = () => {
    resetSwipeState();
    onDismiss();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    startXRef.current = event.clientX;
    setIsSwiping(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (startXRef.current === null) return;

    const delta = event.clientX - startXRef.current;
    if (!Number.isFinite(delta)) return;
    const clampedDelta = Math.max(-168, Math.min(168, delta));
    setSwipeOffset(clampedDelta);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (startXRef.current === null) return;

    const delta = event.clientX - startXRef.current;
    if (!Number.isFinite(delta)) {
      resetSwipeState();
      return;
    }

    if (Math.abs(delta) >= PRELAUNCH_NOTICE_DISMISS_THRESHOLD) {
      commitDismiss();
      return;
    }

    resetSwipeState();
  };

  return (
    <StitchCard
      tone="navy"
      data-testid="profile-prelaunch-notice"
      className="relative rounded-[1.05rem] p-5 shadow-[0_20px_44px_rgba(0,38,55,0.24)] touch-pan-y select-none"
      style={{
        transform: `translateX(${swipeOffset}px)`,
        opacity: Math.max(0.45, 1 - Math.abs(swipeOffset) / 240),
        transition: isSwiping ? "opacity 120ms linear" : "transform 220ms ease, opacity 220ms ease",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={resetSwipeState}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Pre-Launch-Hinweis ausblenden"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-[0.72rem] border border-[#f2dcab]/12 bg-[#f2dcab]/8 text-[#f2dcab]/72 transition-colors hover:bg-[#f2dcab]/14 hover:text-[#f2dcab]"
      >
        <MaterialIcon name="close" className="text-base" />
      </button>

      <div className="space-y-4 pr-12">
        <div className="stitch-kicker text-[rgba(242,220,171,0.68)]">Pre-Launch</div>
        <div className="stitch-headline text-[2rem] leading-[0.92] text-[#f2dcab]">
          Dein Dashboard ist offen, die Liga startet am {unlockDateLabel}.
        </div>
        <p className="hidden text-sm leading-6 text-[rgba(242,220,171,0.76)]">
          Profil, Vorbereitung und persÃ¶nliche Statistiken sind bereits verfÃ¼gbar. Hallen,
          Codes und Ranglisten Ã¶ffnen gesammelt zum Saisonstart.
        </p>
        <p className="text-sm leading-6 text-[rgba(242,220,171,0.76)]">
          {"Profil, Vorbereitung und pers\u00f6nliche Statistiken sind bereits verf\u00fcgbar. Hallen, "}
          {"Codes und Ranglisten \u00f6ffnen gesammelt zum Saisonstart."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex min-h-10 items-center rounded-[0.72rem] border border-[#002637]/8 bg-[#f2dcab] px-3.5 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#002637]">
            Freischaltung {unlockDateLabel}
          </div>
          <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(242,220,171,0.48)]">
            Wische zum Ausblenden
          </div>
        </div>
      </div>
    </StitchCard>
  );
};

const ProfileScreenSkeleton = () => (
  <div className="mx-auto max-w-md animate-pulse space-y-4">
    <div className="rounded-[1.05rem] bg-[#003d55] p-5 shadow-[0_20px_44px_rgba(0,38,55,0.24)]">
      <div className="h-3 w-24 rounded-[0.65rem] bg-[#f2dcab]/18" />
      <div className="mt-4 h-12 w-4/5 rounded-[0.95rem] bg-[#f2dcab]/12" />
      <div className="mt-3 h-4 w-full rounded-[0.7rem] bg-[#f2dcab]/10" />
      <div className="mt-2 h-4 w-5/6 rounded-[0.7rem] bg-[#f2dcab]/10" />
      <div className="mt-5 h-9 w-40 rounded-[0.9rem] bg-[#f2dcab]/14" />
    </div>

    <div className="rounded-[1.05rem] bg-[#003d55] p-6 text-[#f2dcab] shadow-[0_20px_44px_rgba(0,38,55,0.24)]">
      <div className="mx-auto h-24 w-24 rounded-[1rem] bg-[#f2dcab]/14" />
      <div className="mx-auto mt-5 h-10 w-56 rounded-[0.95rem] bg-[#f2dcab]/12" />
      <div className="mx-auto mt-4 flex w-full max-w-[14rem] flex-col items-center gap-2">
        <div className="h-10 w-full rounded-[0.9rem] bg-[#f2dcab]/12" />
        <div className="h-10 w-28 rounded-[0.9rem] bg-[#f2dcab]/10" />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-[1rem] border border-[#f2dcab]/30 bg-white p-4 shadow-sm">
        <div className="h-3 w-20 rounded-[0.65rem] bg-[#003d55]/8" />
        <div className="mt-4 h-8 w-16 rounded-[0.85rem] bg-[#a15523]/10" />
      </div>
      <div className="rounded-[1rem] border border-[#f2dcab]/30 bg-white p-4 shadow-sm">
        <div className="h-3 w-16 rounded-[0.65rem] bg-[#003d55]/8" />
        <div className="mt-4 h-8 w-14 rounded-[0.85rem] bg-[#003d55]/10" />
      </div>
      <div className="col-span-2 rounded-[1rem] border border-[#f2dcab]/30 bg-white p-4 shadow-sm">
        <div className="h-3 w-24 rounded-[0.65rem] bg-[#003d55]/8" />
        <div className="mt-4 h-9 w-24 rounded-[0.85rem] bg-[#003d55]/10" />
      </div>
    </div>

    <div className="rounded-[1rem] border border-[#003d55]/10 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-[0.9rem] bg-[#003d55]/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded-[0.65rem] bg-[#003d55]/8" />
          <div className="h-4 w-full rounded-[0.7rem] bg-[#003d55]/8" />
        </div>
      </div>
    </div>
  </div>
);

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { signOut, loading: authLoading } = useAuth();
  const {
    beforeAppUnlock,
    unlockDate,
  } = useLaunchSettings();
  const {
    profile,
    user,
    loading,
    profileData,
    displayName,
    leagueLabel,
    avatarPreview,
  } = useParticipantProfileEditor();
  const avatarUrl = avatarPreview ?? profile?.avatar_url ?? null;
  const [avatarReady, setAvatarReady] = useState(!avatarUrl);
  const [isPrelaunchNoticeDismissed, setIsPrelaunchNoticeDismissed] = useState(() =>
    readPrelaunchNoticeDismissed(unlockDate),
  );
  const [partnerVoucherRedeemedAt, setPartnerVoucherRedeemedAt] = useState<string | null>(null);

  const participantProfileHref = profile?.id
    ? `/app/rankings/profile/${profile.id}`
    : "/app/rankings";
  const isParticipationActivated = Boolean(profile?.participation_activated_at);
  const shouldShowPrelaunchNotice = beforeAppUnlock && !isPrelaunchNoticeDismissed;
  const shouldShowParticipationNotice = !beforeAppUnlock && !isParticipationActivated;
  const unlockDateLabel = formatUnlockDate(unlockDate);
  const rankLabel = profileData?.rank ? `Platz #${profileData.rank}` : "Platz offen";
  const partnerVoucherRedeemed = Boolean(partnerVoucherRedeemedAt);
  const classLabel = profileData?.className ? getClassLabel(profileData.className) : "Klasse offen";
  const rankBadgeClass =
    "min-h-10 rounded-[0.72rem] border border-[#f2dcab]/55 bg-[#f2dcab] px-3.5 py-2 text-[0.62rem] tracking-[0.18em] text-[#002637] shadow-[0_12px_24px_rgba(0,0,0,0.18)]";
  const profileMetaBadgeClass =
    "min-h-10 rounded-[0.72rem] border border-[#f2dcab]/24 bg-[#f2dcab]/12 px-3.5 py-2 text-[0.62rem] tracking-[0.18em] text-[#f2dcab]";
  const averagePointsPerRouteLabel =
    profileData && profileData.routesLogged > 0
      ? profileData.averagePoints.toLocaleString("de-DE", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : "0.0";

  useEffect(() => {
    if (!avatarUrl) {
      setAvatarReady(true);
      return;
    }

    let cancelled = false;
    const image = new Image();
    const finish = () => {
      if (!cancelled) {
        setAvatarReady(true);
      }
    };

    setAvatarReady(false);
    image.onload = finish;
    image.onerror = finish;
    image.src = avatarUrl;

    if (image.complete) {
      finish();
    }

    return () => {
      cancelled = true;
    };
  }, [avatarUrl]);

  useEffect(() => {
    if (!beforeAppUnlock) {
      setIsPrelaunchNoticeDismissed(false);
      return;
    }

    setIsPrelaunchNoticeDismissed(readPrelaunchNoticeDismissed(unlockDate));
  }, [beforeAppUnlock, unlockDate]);

  useEffect(() => {
    if (!profile?.id || !isParticipationActivated) {
      setPartnerVoucherRedeemedAt(null);
      return;
    }

    let active = true;
    getMyPartnerVoucherRedemption(PARTNER_VOUCHER_SLUG)
      .then(({ data, error }) => {
        if (!active || error) return;
        setPartnerVoucherRedeemedAt(data?.redeemed_at ?? null);
      })
      .catch(() => {
        if (!active) return;
        setPartnerVoucherRedeemedAt(null);
      });

    return () => {
      active = false;
    };
  }, [profile?.id, isParticipationActivated]);

  const isScreenReady = Boolean(profile) && !authLoading && !loading && avatarReady;

  const handleDismissPrelaunchNotice = () => {
    writePrelaunchNoticeDismissed(unlockDate);
    setIsPrelaunchNoticeDismissed(true);
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({ title: "Nicht möglich", description: "Keine E-Mail vorhanden." });
      return;
    }

    const frontendUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://kletterliga-nrw.de";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      user.email,
      {
        redirectTo: `${frontendUrl}/app/auth/reset-password`,
      },
    );

    if (resetError) {
      toast({ title: "Fehler", description: resetError.message });
      return;
    }

    toast({
      title: "E-Mail gesendet",
      description: "Bitte prüfe dein Postfach.",
      variant: "success",
    });
  };

  if (!isScreenReady) {
    return <ProfileScreenSkeleton />;
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      {shouldShowPrelaunchNotice ? (
        <PrelaunchNoticeCard unlockDateLabel={unlockDateLabel} onDismiss={handleDismissPrelaunchNotice} />
      ) : null}

      {shouldShowParticipationNotice ? (
        <StitchCard tone="cream" className="rounded-[1.05rem] p-5">
          <div className="space-y-4">
            <div className="stitch-kicker text-[#a15523]">Teilnahme fehlt</div>
            <div className="space-y-2">
              <div className="stitch-headline text-2xl leading-[0.95] text-[#002637]">
                Deine Wertung ist noch nicht freigeschaltet.
              </div>
              <p className="text-sm leading-6 text-[rgba(27,28,26,0.7)]">
                Deine Ergebnisse werden erst nach dem Einlösen des Mastercodes in den Ranglisten
                berücksichtigt.
              </p>
            </div>
            <StitchButton
              type="button"
              size="lg"
              className="w-full rounded-[1rem]"
              onClick={() => navigate("/app/participation/redeem")}
            >
              Mastercode freischalten
            </StitchButton>
          </div>
        </StitchCard>
      ) : null}

      <StitchCard
        tone="navy"
        className={`relative overflow-hidden rounded-[1.1rem] p-6 text-center text-[#f2dcab] shadow-[0_20px_44px_rgba(0,38,55,0.24)] ${
          isParticipationActivated
            ? "outline outline-2 outline-[#63d3a8] outline-offset-2"
            : ""
        }`}
      >
        <div className="absolute -right-8 -top-8 h-24 w-24 rotate-12 rounded-[1.1rem] bg-[#f2dcab]/6" />
        <div className="absolute -bottom-10 -left-6 h-20 w-20 rotate-12 rounded-[1rem] bg-[#a15523]/18" />

        <div className="relative z-10 flex flex-col items-center gap-5">
          <button
            type="button"
            onClick={() => navigate("/app/profile/edit")}
            className="group relative inline-block"
            aria-label="Profil bearbeiten"
          >
            <div className="mx-auto h-24 w-24 overflow-hidden rounded-[1rem] border-[3px] border-[#a15523] bg-[#184c64] shadow-[0_16px_30px_rgba(0,0,0,0.24)]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-['Space_Grotesk'] text-3xl font-bold uppercase text-[#f2dcab]">
                  {getInitials(displayName)}
                </div>
              )}
            </div>
            <span className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-[0.9rem] border-2 border-[#003d55] bg-[#a15523] text-white shadow-[0_12px_22px_rgba(0,0,0,0.24)] transition-transform group-hover:scale-[1.03]">
              <MaterialIcon name="edit" className="text-sm" />
            </span>
          </button>

          <div className="space-y-3">
            <h2 className="font-['Space_Grotesk'] text-3xl font-bold uppercase tracking-tight text-[#f2dcab]">
              {displayName}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <StitchBadge tone="ghost" className={rankBadgeClass}>
                {rankLabel}
              </StitchBadge>
              <StitchBadge tone="ghost" className={profileMetaBadgeClass}>
                {leagueLabel}
              </StitchBadge>
              {isParticipationActivated ? (
                <StitchBadge tone="ghost" className={profileMetaBadgeClass}>
                  {classLabel}
                </StitchBadge>
              ) : null}
              {!beforeAppUnlock && partnerVoucherRedeemed ? (
                <StitchBadge tone="ghost" className="min-h-10 rounded-[0.72rem] border border-[#a8d6c2] bg-[#d8efe4] px-3.5 py-2 text-[0.62rem] tracking-[0.18em] text-[#0a5a3c]">
                  Gutschein eingelöst
                </StitchBadge>
              ) : null}
            </div>
          </div>
        </div>
      </StitchCard>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-['Space_Grotesk'] text-lg font-bold uppercase tracking-[0.08em] text-[#003d55]">
            Statistiken
          </h3>
          <button
            type="button"
            onClick={() => navigate(participantProfileHref)}
            className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a15523] transition hover:underline"
          >
            Details ansehen
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StitchCard tone="surface" className="rounded-[1rem] p-4">
            <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#71787d]">
              Punkte/Route
            </span>
            <span className="mt-4 block font-['Space_Grotesk'] text-3xl font-black leading-none text-[#a15523]">
              {averagePointsPerRouteLabel}
            </span>
          </StitchCard>

          <StitchCard tone="surface" className="rounded-[1rem] p-4">
            <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#71787d]">
              Einheiten
            </span>
            <span className="mt-4 block font-['Space_Grotesk'] text-3xl font-black leading-none text-[#003d55]">
              {profileData?.sessionCount ?? 0}
            </span>
          </StitchCard>

          <StitchCard tone="surface" className="col-span-2 rounded-[1rem] p-4">
            <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#71787d]">
              Gesamtpunkte
            </span>
            <span className="mt-4 block font-['Space_Grotesk'] text-4xl font-black leading-none text-[#003d55]">
              {profileData?.formattedPoints ?? "0"}
            </span>
          </StitchCard>
        </div>

        <button
          type="button"
          onClick={() => navigate("/app/age-group-rankings")}
          className="flex w-full items-center justify-between gap-3 rounded-[1rem] border border-[#003d55]/10 bg-white px-4 py-4 shadow-sm transition-all hover:border-[#a15523]/30 hover:shadow-md active:scale-[0.99]"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[0.9rem] bg-[#003d55] text-[#f2dcab]">
              <MaterialIcon name="leaderboard" filled className="text-lg" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-[#71787d]">
                Ranglisten
              </span>
              <span className="block font-['Space_Grotesk'] text-[0.78rem] font-bold uppercase leading-[1.2] tracking-[0.04em] text-[#003d55]">
                Altersklassen und Etappenwertung anzeigen lassen
              </span>
            </span>
          </span>
          <MaterialIcon
            name="chevron_right"
            className="text-base text-[#a15523]"
          />
        </button>
      </section>

      <section className="space-y-3">
        <h3 className="px-1 font-['Space_Grotesk'] text-lg font-bold uppercase tracking-[0.08em] text-[#003d55]">
          Einstellungen
        </h3>

        <StitchCard tone="surface" className="rounded-[1rem] p-1">
          <SettingsRow
            icon="person_outline"
            label="Profil bearbeiten"
            onClick={() => navigate("/app/profile/edit")}
          />
          <div className="mx-3 h-px bg-[#f2dcab]/40" />
          <SettingsRow
            icon="lock_open"
            label="Passwort ändern"
            onClick={handlePasswordReset}
          />
          <div className="mx-3 h-px bg-[#f2dcab]/40" />
          <SettingsRow
            icon="local_offer"
            label={
              partnerVoucherRedeemed
                ? "Gutschein Kletterladen.NRW eingelöst"
                : "Gutschein einlösen Kletterladen.NRW"
            }
            hint={
              partnerVoucherRedeemed && partnerVoucherRedeemedAt
                ? `am ${formatVoucherTimestamp(partnerVoucherRedeemedAt) ?? partnerVoucherRedeemedAt}`
                : undefined
            }
            disabled={partnerVoucherRedeemed}
            onClick={() => navigate("/app/profile/partner-voucher")}
          />
        </StitchCard>

        <StitchButton
          type="button"
          variant="cream"
          size="lg"
          className="w-full rounded-[1rem] border border-[#003d55]/10"
          onClick={() => {
            void signOut();
          }}
        >
          <MaterialIcon name="logout" className="text-sm" />
          Abmelden
        </StitchButton>
      </section>
    </div>
  );
};

export default ProfileScreen;
