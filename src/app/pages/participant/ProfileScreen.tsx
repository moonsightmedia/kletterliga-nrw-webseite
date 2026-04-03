import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { MaterialIcon } from "@/app/components/MaterialIcon";
import { supabase } from "@/services/supabase";
import { useParticipantProfileEditor } from "./useParticipantProfileEditor";

const SettingsRow = ({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void | Promise<void>;
}) => (
  <button
    type="button"
    onClick={() => {
      void onClick();
    }}
    className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f2dcab]/20"
  >
    <MaterialIcon name={icon} />
    <span className="font-['Space_Grotesk'] text-sm font-bold text-[#003d55]">
      {label}
    </span>
    <MaterialIcon
      name="chevron_right"
      className="ml-auto text-sm text-[#71787d]"
    />
  </button>
);

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const ProfileScreenSkeleton = () => (
  <div className="mx-auto max-w-md animate-pulse space-y-6">
    <section>
      <div className="overflow-hidden rounded-xl bg-[#003d55] p-6 text-[#f2dcab] shadow-lg">
        <div className="mx-auto h-24 w-24 rounded-xl bg-[#f2dcab]/14" />
        <div className="mx-auto mt-5 h-9 w-44 rounded-[0.9rem] bg-[#f2dcab]/12" />
        <div className="mx-auto mt-4 h-10 w-28 rounded-[0.9rem] bg-[#f2dcab]/12" />
        <div className="mx-auto mt-3 h-7 w-24 rounded-[0.85rem] bg-[#f2dcab]/10" />
        <div className="mx-auto mt-6 h-12 w-52 rounded-xl bg-[#f2dcab]/12" />
      </div>
    </section>

    <section className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="h-5 w-28 rounded-full bg-[#003d55]/8" />
        <div className="h-4 w-24 rounded-full bg-[#a15523]/10" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#f2dcab]/30 bg-white p-4 shadow-sm">
          <div className="h-3 w-20 rounded-full bg-[#003d55]/8" />
          <div className="mt-4 h-8 w-16 rounded-[0.85rem] bg-[#a15523]/10" />
        </div>
        <div className="rounded-xl border border-[#f2dcab]/30 bg-white p-4 shadow-sm">
          <div className="h-3 w-16 rounded-full bg-[#003d55]/8" />
          <div className="mt-4 h-8 w-14 rounded-[0.85rem] bg-[#003d55]/10" />
        </div>
        <div className="col-span-2 rounded-xl border border-[#f2dcab]/30 bg-white p-4 shadow-sm">
          <div className="h-3 w-24 rounded-full bg-[#003d55]/8" />
          <div className="mt-4 h-9 w-24 rounded-[0.9rem] bg-[#003d55]/10" />
        </div>
      </div>
    </section>

    <section className="space-y-4">
      <div className="h-5 w-32 rounded-full bg-[#003d55]/8" />
      <div className="overflow-hidden rounded-xl border border-[#f2dcab]/30 bg-white p-1 shadow-sm">
        <div className="h-14 rounded-[0.9rem] bg-[#003d55]/6" />
        <div className="mx-4 h-px bg-[#f2dcab]/30" />
        <div className="h-14 rounded-[0.9rem] bg-[#003d55]/6" />
        <div className="mx-4 h-px bg-[#f2dcab]/30" />
        <div className="h-14 rounded-[0.9rem] bg-[#003d55]/6" />
      </div>
    </section>
  </div>
);

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { signOut, loading: authLoading } = useAuth();
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

  const participantProfileHref = profile?.id
    ? `/app/rankings/profile/${profile.id}`
    : "/app/rankings";
  const isParticipationActivated = Boolean(profile?.participation_activated_at);
  const rankLabel = profileData?.rank ? `Platz #${profileData.rank}` : "Platz offen";
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

  const isScreenReady = Boolean(profile) && !authLoading && !loading && avatarReady;

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
    <div className="mx-auto max-w-md space-y-6">
      <section>
        <div className="relative overflow-hidden rounded-xl bg-[#003d55] p-6 text-center text-[#f2dcab] shadow-lg">
          <MaterialIcon
            name="person"
            filled
            className="absolute -bottom-6 -right-6 rotate-12 text-[120px] text-[#f2dcab]/5"
          />

          <button
            type="button"
            onClick={() => navigate("/app/profile/edit")}
            className="relative mb-4 inline-block"
          >
            <div className="mx-auto h-24 w-24 overflow-hidden rounded-xl border-4 border-[#a15523] shadow-xl">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#184c64] font-['Space_Grotesk'] text-3xl font-bold uppercase text-[#f2dcab]">
                  {getInitials(displayName)}
                </div>
              )}
            </div>
            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#a15523] text-white shadow-lg">
              <MaterialIcon name="edit" className="text-sm" />
            </span>
          </button>

          <h2 className="mb-4 font-['Space_Grotesk'] text-3xl font-bold uppercase tracking-tight text-[#f2dcab]">
            {displayName}
          </h2>

          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-[#f2dcab] px-5 py-2 text-[#002637] shadow-md">
              <MaterialIcon
                name="emoji_events"
                filled
                className="text-sm text-[#a15523]"
              />
              <span className="font-['Space_Grotesk'] text-lg font-bold italic">
                {rankLabel}
              </span>
            </div>
            <div className="rounded-full border border-[#f2dcab]/20 bg-[#f2dcab]/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#f2dcab] backdrop-blur-md">
              {leagueLabel}
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => {
                if (!isParticipationActivated) {
                  navigate("/app/participation/redeem");
                }
              }}
              disabled={isParticipationActivated}
              className={[
                "rounded-xl px-8 py-3 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-widest shadow-md transition-all",
                isParticipationActivated
                  ? "flex items-center gap-2 border border-[#f2dcab]/20 bg-[#f2dcab] text-[#003d55]"
                  : "bg-[#a15523] text-white hover:opacity-90 active:scale-95",
              ].join(" ")}
            >
              {isParticipationActivated ? (
                <>
                  <MaterialIcon
                    name="check_circle"
                    filled
                    className="text-sm text-[#a15523]"
                  />
                  Teilnahme aktiviert
                </>
              ) : (
                "Mastercode freischalten"
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-['Space_Grotesk'] text-lg font-bold uppercase tracking-widest text-[#003d55]">
            Statistiken
          </h3>
          <button
            type="button"
            onClick={() => navigate(participantProfileHref)}
            className="text-[10px] font-bold uppercase tracking-wider text-[#a15523] transition hover:underline"
          >
            Details ansehen
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-xl border border-[#f2dcab]/30 bg-white p-4 shadow-sm">
            <span className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#71787d]">
              Punkte/Route
            </span>
            <span className="font-['Space_Grotesk'] text-2xl font-black italic leading-none text-[#a15523]">
              {averagePointsPerRouteLabel}
            </span>
          </div>
          <div className="flex flex-col items-center rounded-xl border border-[#f2dcab]/30 bg-white p-4 shadow-sm">
            <span className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#71787d]">
              Sessions
            </span>
            <span className="font-['Space_Grotesk'] text-2xl font-black italic leading-none text-[#003d55]">
              {profileData?.sessionCount ?? 0}
            </span>
          </div>
          <div className="col-span-2 flex flex-col items-center rounded-xl border border-[#f2dcab]/30 bg-white p-4 shadow-sm">
            <span className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#71787d]">
              Gesamtpunkte
            </span>
            <span className="font-['Space_Grotesk'] text-3xl font-black italic leading-none text-[#003d55]">
              {profileData?.formattedPoints ?? "0"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/app/age-group-rankings")}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#003d55]/10 bg-white px-4 py-4 shadow-sm transition-all hover:border-[#a15523]/30 hover:shadow-md active:scale-[0.99]"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#003d55] text-[#f2dcab]">
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

      <section className="space-y-4">
        <h3 className="px-2 font-['Space_Grotesk'] text-lg font-bold uppercase tracking-widest text-[#003d55]">
          Einstellungen
        </h3>

        <div className="overflow-hidden rounded-xl border border-[#f2dcab]/30 bg-white p-1 shadow-sm">
          <SettingsRow
            icon="person_outline"
            label="Profil bearbeiten"
            onClick={() => navigate("/app/profile/edit")}
          />
          <div className="mx-4 h-px bg-[#f2dcab]/30" />
          <SettingsRow
            icon="lock_open"
            label="Passwort ändern"
            onClick={handlePasswordReset}
          />
          <div className="mx-4 h-px bg-[#f2dcab]/30" />
          <SettingsRow
            icon="notifications_none"
            label="Benachrichtigungen"
            onClick={() => navigate("/app/profile/notifications")}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            void signOut();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#003d55]/10 bg-[#f2dcab] py-4 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.2em] text-[#003d55] shadow-sm transition-all hover:bg-[#edd39c] active:scale-95"
        >
          <MaterialIcon name="logout" className="text-sm" />
          Logout
        </button>
      </section>
    </div>
  );
};

export default ProfileScreen;
