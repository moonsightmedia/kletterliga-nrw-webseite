import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  ChevronRight,
  Crown,
  HelpCircle,
  KeyRound,
  LogOut,
  TicketCheck,
  Trophy,
  UserSquare2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import {
  StitchButton,
  StitchCard,
  StitchSelectField,
  StitchTextField,
  StitchTextareaField,
} from "@/app/components/StitchPrimitives";
import { createChangeRequest, upsertProfile } from "@/services/appApi";
import { useSeasonSettings } from "@/services/seasonSettings";
import { supabase } from "@/services/supabase";
import { buildParticipantProfileData } from "./participantData";
import { useParticipantCompetitionData } from "./useParticipantCompetitionData";

const ActionRow = ({
  icon,
  label,
  detail,
  destructive = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  destructive?: boolean;
  onClick: () => void | Promise<void>;
}) => (
  <button
    type="button"
    onClick={() => {
      void onClick();
    }}
    className="flex w-full items-center justify-between gap-4 rounded-[1.2rem] border border-[rgba(0,38,55,0.08)] bg-white/70 px-4 py-4 text-left transition hover:bg-white"
  >
    <div className="flex items-center gap-3">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          destructive ? "bg-[rgba(186,26,26,0.08)] text-[#ba1a1a]" : "bg-[#f5efe5] text-[#003d55]"
        }`}
      >
        {icon}
      </div>
      <div>
        <div className={`text-sm font-semibold ${destructive ? "text-[#ba1a1a]" : "text-[#002637]"}`}>
          {label}
        </div>
        {detail ? <div className="text-xs text-[rgba(27,28,26,0.58)]">{detail}</div> : null}
      </div>
    </div>
    <ChevronRight
      className={`h-4 w-4 ${destructive ? "text-[#ba1a1a]" : "text-[rgba(0,38,55,0.48)]"}`}
    />
  </button>
);

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { profile, signOut, user, refreshProfile } = useAuth();
  const { getClassName } = useSeasonSettings();
  const { profiles, results, routes, gyms, loading, error, reload } = useParticipantCompetitionData();
  const firstName = profile?.first_name || (user?.user_metadata?.first_name as string | undefined);
  const lastName = profile?.last_name || (user?.user_metadata?.last_name as string | undefined);
  const birthDate = profile?.birth_date ?? (user?.user_metadata?.birth_date as string | undefined);
  const gender = (profile?.gender || (user?.user_metadata?.gender as string | undefined)) as
    | "m"
    | "w"
    | undefined;
  const league = profile?.league || (user?.user_metadata?.league as string | undefined);
  const homeGymId = profile?.home_gym_id ?? (user?.user_metadata?.home_gym_id as string | undefined);
  const avatarUrl = profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined);

  const [form, setForm] = useState({
    firstName: firstName ?? "",
    lastName: lastName ?? "",
    birthDate: birthDate ?? "",
    gender: gender ?? "",
    league: league ?? "",
    homeGymId: homeGymId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl ?? null);
  const [editOpen, setEditOpen] = useState(false);
  const [requestingChange, setRequestingChange] = useState(false);
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [changeRequestForm, setChangeRequestForm] = useState({
    requested_league: "",
    requested_gender: "",
    message: "",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm({
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      birthDate: birthDate ?? "",
      gender: gender ?? "",
      league: league ?? "",
      homeGymId: homeGymId ?? "",
    });
    setAvatarPreview(avatarUrl ?? null);
  }, [firstName, lastName, birthDate, gender, league, homeGymId, avatarUrl]);

  const selectedProfile = useMemo(
    () => (profile?.id ? profiles.find((item) => item.id === profile.id) ?? profile : null),
    [profiles, profile],
  );

  const profileData = useMemo(
    () =>
      buildParticipantProfileData({
        selectedProfile,
        allProfiles: profiles,
        results,
        routes,
        gyms,
        getClassName,
      }),
    [selectedProfile, profiles, results, routes, gyms, getClassName],
  );

  const leagueLabel =
    profileData?.leagueLabel ??
    (league === "lead" ? "Vorstieg" : league === "toprope" ? "Toprope" : "Noch offen");
  const genderLabel = gender === "m" ? "Maennlich" : gender === "w" ? "Weiblich" : "-";
  const participantProfileHref = profile?.id ? `/app/rankings/profile/${profile.id}` : "/app/rankings";

  const changeState = {
    hasLeagueChange: Boolean(changeRequestForm.requested_league && changeRequestForm.requested_league !== league),
    hasGenderChange: Boolean(changeRequestForm.requested_gender && changeRequestForm.requested_gender !== gender),
    hasNoChange: !changeRequestForm.requested_league && !changeRequestForm.requested_gender,
    hasSameValues:
      Boolean(changeRequestForm.requested_league && changeRequestForm.requested_league === league) ||
      Boolean(changeRequestForm.requested_gender && changeRequestForm.requested_gender === gender),
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    const { error: saveError } = await upsertProfile({
      id: user.id,
      email: profile?.email ?? user.email ?? null,
      first_name: form.firstName || null,
      last_name: form.lastName || null,
      birth_date: form.birthDate || null,
      gender: (form.gender as "m" | "w") || null,
      home_gym_id: form.homeGymId || null,
      league: (form.league as "toprope" | "lead") || null,
      avatar_url: avatarPreview || null,
      role: profile?.role ?? "participant",
    });
    setSaving(false);

    if (saveError) {
      return toast({ title: "Fehler", description: saveError.message });
    }

    await refreshProfile();
    reload();
    setEditOpen(false);
    toast({ title: "Profil gespeichert", description: "Deine Daten wurden aktualisiert." });
  };

  const resizeImage = (file: File, maxSize = 512, quality = 0.85) =>
    new Promise<Blob>((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Canvas not available"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error("Bild konnte nicht verarbeitet werden"));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Bild konnte nicht geladen werden"));
      };
      img.src = objectUrl;
    });

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return;

    try {
      setUploading(true);
      const optimized = await resizeImage(file);
      const filePath = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, optimized, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadError) {
        setUploading(false);
        return toast({
          title: "Upload fehlgeschlagen",
          description: uploadError.message || "Bitte Bucket und Rechte pruefen.",
        });
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarPreview(data.publicUrl);
      setUploading(false);
      setSavingAvatar(true);

      const { error: saveError } = await upsertProfile({
        id: user.id,
        email: profile?.email ?? user.email ?? null,
        avatar_url: data.publicUrl,
        role: profile?.role ?? "participant",
      });
      setSavingAvatar(false);

      if (saveError) {
        return toast({ title: "Profilbild speichern fehlgeschlagen", description: saveError.message });
      }

      await refreshProfile();
      reload();
      toast({ title: "Profilbild aktualisiert", description: "Dein Profilbild wurde gespeichert." });
    } catch (uploadError) {
      setUploading(false);
      setSavingAvatar(false);
      toast({
        title: "Upload fehlgeschlagen",
        description: uploadError instanceof Error ? uploadError.message : "Unbekannter Fehler beim Upload.",
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      return toast({ title: "Nicht moeglich", description: "Keine E-Mail vorhanden." });
    }

    const frontendUrl = typeof window !== "undefined" ? window.location.origin : "https://kletterliga-nrw.de";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${frontendUrl}/app/auth/reset-password`,
    });

    if (resetError) {
      return toast({ title: "Fehler", description: resetError.message });
    }

    toast({ title: "E-Mail gesendet", description: "Bitte pruefe dein Postfach.", variant: "success" });
  };

  const handleChangeRequestSubmit = async () => {
    if (changeState.hasNoChange) {
      return toast({
        title: "Fehler",
        description: "Bitte waehle mindestens eine Aenderung aus.",
        variant: "destructive",
      });
    }

    if (changeState.hasSameValues && !changeState.hasLeagueChange && !changeState.hasGenderChange) {
      return toast({
        title: "Fehler",
        description: "Die gewuenschten Werte muessen sich von den aktuellen Werten unterscheiden.",
        variant: "destructive",
      });
    }

    if (!user?.id) return;

    setRequestingChange(true);
    const { error: requestError } = await createChangeRequest({
      profile_id: user.id,
      email: profile?.email ?? user.email ?? null,
      current_league: league ?? null,
      current_gender: gender ?? null,
      requested_league: changeRequestForm.requested_league || null,
      requested_gender: changeRequestForm.requested_gender || null,
      message: changeRequestForm.message.trim() || "Aenderung der Wertungsklasse angefragt.",
      status: "open",
    });
    setRequestingChange(false);

    if (requestError) {
      return toast({ title: "Fehler", description: requestError.message });
    }

    toast({
      title: "Anfrage gesendet",
      description: "Wir pruefen deine Aenderung und melden uns per E-Mail.",
    });
    setChangeRequestOpen(false);
    setChangeRequestForm({ requested_league: "", requested_gender: "", message: "" });
  };

  const changeRequestDisabled =
    requestingChange ||
    changeState.hasNoChange ||
    (changeState.hasSameValues && !changeState.hasLeagueChange && !changeState.hasGenderChange);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <StitchCard tone="navy" className="overflow-hidden rounded-[2rem] p-5 text-[#f2dcab] sm:p-6">
        <div className="flex flex-col items-center text-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative rounded-full bg-[linear-gradient(135deg,#a15523_0%,#f2dcab_100%)] p-1 shadow-[0_22px_40px_rgba(0,0,0,0.26)]"
            disabled={uploading || savingAvatar}
          >
            <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[#003d55] bg-[rgba(242,220,171,0.12)] text-3xl font-semibold text-[#f2dcab]">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profilbild" className="h-full w-full object-cover" />
              ) : (
                `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}` || "?"
              )}
            </span>
            <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#a15523] text-white shadow-lg">
              <Camera className="h-4 w-4" />
            </span>
          </button>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-[#f2dcab] px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.22em] text-[#002637]">
              {profileData?.rank ? `Platz #${profileData.rank}` : "Noch ohne Rang"}
            </span>
            <span className="rounded-full bg-[#a15523] px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.22em] text-white">
              {leagueLabel}
            </span>
          </div>

          <div className="mt-4 font-['Space_Grotesk'] text-[2.2rem] font-bold leading-[0.92] text-[#f2dcab]">
            {firstName} {lastName}
          </div>
          <p className="mt-2 text-sm leading-6 text-[rgba(242,220,171,0.74)]">
            {profileData?.homeGymLabel ?? "Noch keine Heimathalle gesetzt"}
          </p>

          <div className="mt-5 grid w-full grid-cols-2 gap-3">
            <StitchButton type="button" variant="cream" onClick={() => setEditOpen(true)}>
              <UserSquare2 className="h-4 w-4" />
              Profil bearbeiten
            </StitchButton>
            <StitchButton
              type="button"
              variant="outline"
              className="border-[rgba(242,220,171,0.18)] bg-[rgba(242,220,171,0.08)] text-[#f2dcab] hover:bg-[rgba(242,220,171,0.14)]"
              onClick={() => navigate(participantProfileHref)}
            >
              <Trophy className="h-4 w-4" />
              Teilnehmerprofil
            </StitchButton>
            <StitchButton
              type="button"
              variant="outline"
              className="border-[rgba(242,220,171,0.18)] bg-[rgba(242,220,171,0.08)] text-[#f2dcab] hover:bg-[rgba(242,220,171,0.14)]"
              onClick={() => navigate("/app/age-group-rankings")}
            >
              <Trophy className="h-4 w-4" />
              Altersklassen
            </StitchButton>
            <StitchButton
              type="button"
              variant="outline"
              className="border-[rgba(242,220,171,0.18)] bg-[rgba(242,220,171,0.08)] text-[#f2dcab] hover:bg-[rgba(242,220,171,0.14)]"
              onClick={() => navigate("/app/participation/redeem")}
            >
              <TicketCheck className="h-4 w-4" />
              Teilnahme
            </StitchButton>
          </div>
        </div>
      </StitchCard>

      <div className="grid grid-cols-2 gap-3">
        <StitchCard tone="surface" className="rounded-[1.1rem] border-b border-[rgba(0,38,55,0.08)] bg-[#f5f3f0] p-4">
          <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.46)]">Punkte</div>
          <div className="mt-3 font-['Space_Grotesk'] text-3xl font-bold text-[#002637]">
            {profileData ? profileData.points : 0}
          </div>
        </StitchCard>
        <StitchCard tone="surface" className="rounded-[1.1rem] border-b border-[rgba(0,38,55,0.08)] bg-[#f5f3f0] p-4">
          <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.46)]">Routen</div>
          <div className="mt-3 font-['Space_Grotesk'] text-3xl font-bold text-[#002637]">
            {profileData ? profileData.routesLogged : 0}
          </div>
        </StitchCard>
        <StitchCard tone="surface" className="rounded-[1.1rem] border-b border-[rgba(0,38,55,0.08)] bg-[#f5f3f0] p-4">
          <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.46)]">Flash Rate</div>
          <div className="mt-3 font-['Space_Grotesk'] text-3xl font-bold text-[#a15523]">
            {profileData ? `${Math.round(profileData.flashRate)}%` : "0%"}
          </div>
        </StitchCard>
        <StitchCard tone="surface" className="rounded-[1.1rem] border-b border-[rgba(0,38,55,0.08)] bg-[#f5f3f0] p-4">
          <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.46)]">Heimathalle</div>
          <div className="mt-3 text-sm font-semibold leading-5 text-[#002637]">
            {profileData?.homeGymLabel ?? "Noch offen"}
          </div>
        </StitchCard>
      </div>

      <StitchCard tone="surface" className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="stitch-kicker text-[#a15523]">Verlauf</div>
            <div className="stitch-headline mt-2 text-2xl text-[#002637]">Letzte Eintraege</div>
          </div>
          <StitchButton type="button" variant="ghost" className="px-0" onClick={() => navigate("/app/profile/history")}>
            View History
          </StitchButton>
        </div>

        <div className="mt-5 space-y-3">
          {profileData?.recentAscents.length ? (
            profileData.recentAscents.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-[1.2rem] border border-[rgba(0,38,55,0.08)] bg-white/80 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-['Space_Grotesk'] text-lg font-bold uppercase leading-tight text-[#002637]">
                      {item.routeName}
                    </div>
                    <div className="mt-1 text-[0.72rem] font-medium text-[rgba(0,38,55,0.56)]">
                      {item.routeCode} • {item.gymName}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-['Space_Grotesk'] text-xl font-bold text-[#a15523]">
                      +{item.points}
                    </div>
                    <div className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[rgba(0,38,55,0.46)]">
                      {item.flash ? "Flash" : "Punkte"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-[rgba(27,28,26,0.64)]">
              {loading ? "Profil wird geladen..." : error || "Noch keine Eintraege vorhanden."}
            </p>
          )}
        </div>
      </StitchCard>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleAvatarUpload(file);
          }
        }}
      />

      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <StitchCard tone="surface" className="p-5 sm:p-6">
          <div className="stitch-kicker text-[#a15523]">Konto</div>
          <div className="stitch-headline mt-2 text-2xl text-[#002637]">Einstellungen und Hilfe</div>
          <div className="mt-5 space-y-3">
            <ActionRow
              icon={<KeyRound className="h-5 w-5" />}
              label="Passwort aendern"
              detail="Reset-Link an deine E-Mail-Adresse senden"
              onClick={handlePasswordReset}
            />
            <ActionRow
              icon={<HelpCircle className="h-5 w-5" />}
              label="Hilfe"
              detail="support@kletterliga-nrw.de"
              onClick={() => {
                window.location.href = "mailto:support@kletterliga-nrw.de";
              }}
            />
            <ActionRow
              icon={<HelpCircle className="h-5 w-5" />}
              label="Impressum"
              detail="Rechtliche Informationen"
              onClick={() => {
                window.location.href = "/impressum";
              }}
            />
            <ActionRow
              icon={<LogOut className="h-5 w-5" />}
              label="Logout"
              detail="Aus deinem Account abmelden"
              destructive
              onClick={signOut}
            />
          </div>
        </StitchCard>

        <StitchCard tone="cream" className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="stitch-kicker text-[#a15523]">Wertungsklasse</div>
              <div className="stitch-headline mt-2 text-2xl text-[#002637]">Fixiert aus der Registrierung</div>
            </div>
            <Crown className="h-6 w-6 text-[#003d55]" />
          </div>
          <p className="mt-4 text-sm leading-6 text-[rgba(27,28,26,0.68)]">
            Liga und Geschlecht werden bei der Registrierung gesetzt. Aenderungen laufen ueber eine Anfrage,
            damit die Wettkampfwertung sauber bleibt.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] bg-white/70 p-4">
              <div className="stitch-kicker text-[#a15523]">Liga</div>
              <div className="mt-2 text-sm font-semibold text-[#002637]">{leagueLabel}</div>
            </div>
            <div className="rounded-[1.2rem] bg-white/70 p-4">
              <div className="stitch-kicker text-[#a15523]">Geschlecht</div>
              <div className="mt-2 text-sm font-semibold text-[#002637]">{genderLabel}</div>
            </div>
          </div>
          <StitchButton
            type="button"
            variant="navy"
            className="mt-5 w-full"
            onClick={() => {
              setChangeRequestForm({ requested_league: "", requested_gender: "", message: "" });
              setChangeRequestOpen(true);
            }}
          >
            Aenderung anfragen
          </StitchButton>
        </StitchCard>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="stitch-app overflow-hidden border-0 bg-[linear-gradient(180deg,#fbf9f6_0%,#f5f0e7_100%)] p-0 text-[#1b1c1a] sm:max-w-2xl sm:rounded-[1.75rem]">
          <div className="bg-[#003d55] px-6 py-6 text-[#f2dcab]">
            <DialogHeader className="space-y-2 px-0 pt-0 text-left">
              <DialogTitle className="stitch-headline pr-12 text-3xl text-[#f2dcab]">Profil bearbeiten</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-[rgba(242,220,171,0.76)]">
                Passe deine persoenlichen Daten an und halte dein Profil aktuell.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-6 py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <StitchTextField
                label="Vorname"
                value={form.firstName}
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              />
              <StitchTextField
                label="Nachname"
                value={form.lastName}
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StitchTextField
                label="Geburtsdatum"
                type="date"
                value={form.birthDate}
                onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
              />
              <StitchSelectField
                label="Wertungsklasse"
                value={form.gender}
                onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
                disabled
                hint="Die Auswahl ist fuer die Wettkampfwertung gesperrt."
              >
                <option value="">Auswaehlen</option>
                <option value="w">Weiblich</option>
                <option value="m">Maennlich</option>
              </StitchSelectField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StitchSelectField
                label="Liga"
                value={form.league}
                onChange={(event) => setForm((current) => ({ ...current, league: event.target.value }))}
                disabled
                hint="Die Liga wird aus der Registrierung uebernommen."
              >
                <option value="">Auswaehlen</option>
                <option value="toprope">Toprope</option>
                <option value="lead">Vorstieg</option>
              </StitchSelectField>
              <StitchSelectField
                label="Heimat-Halle"
                value={form.homeGymId}
                onChange={(event) => setForm((current) => ({ ...current, homeGymId: event.target.value }))}
              >
                <option value="">Keine Auswahl</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                    {gym.city ? ` (${gym.city})` : ""}
                  </option>
                ))}
              </StitchSelectField>
            </div>
            <StitchCard tone="muted" className="p-4">
              <div className="space-y-2">
                <div className="stitch-kicker text-[#a15523]">Wertungsklasse gesperrt</div>
                <p className="text-sm leading-6 text-[rgba(27,28,26,0.68)]">
                  Liga und Wertungsklasse werden bei der Anmeldung festgelegt. Aenderungen sind nur per Anfrage moeglich.
                </p>
                <StitchButton type="button" variant="outline" size="sm" onClick={() => setChangeRequestOpen(true)}>
                  Aenderung anfragen
                </StitchButton>
              </div>
            </StitchCard>
            <StitchButton type="button" className="w-full" disabled={saving} onClick={handleSave}>
              {saving ? "Speichern..." : "Profil speichern"}
            </StitchButton>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={changeRequestOpen} onOpenChange={setChangeRequestOpen}>
        <DialogContent className="stitch-app overflow-hidden border-0 bg-[linear-gradient(180deg,#fbf9f6_0%,#f5f0e7_100%)] p-0 text-[#1b1c1a] sm:max-w-2xl sm:rounded-[1.75rem]">
          <div className="bg-[#003d55] px-6 py-6 text-[#f2dcab]">
            <DialogHeader className="space-y-2 px-0 pt-0 text-left">
              <DialogTitle className="stitch-headline pr-12 text-3xl text-[#f2dcab]">Aenderung anfragen</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-[rgba(242,220,171,0.76)]">
                Waehle die Werte, die du aendern moechtest. Wir pruefen die Anfrage anschliessend manuell.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-6 py-6">
            <StitchCard tone="muted" className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="stitch-kicker text-[#a15523]">Aktuelle Liga</div>
                  <div className="mt-2 text-sm font-semibold text-[#002637]">{leagueLabel}</div>
                </div>
                <div>
                  <div className="stitch-kicker text-[#a15523]">Aktuelles Geschlecht</div>
                  <div className="mt-2 text-sm font-semibold text-[#002637]">{genderLabel}</div>
                </div>
              </div>
            </StitchCard>
            <div className="grid gap-4 sm:grid-cols-2">
              <StitchSelectField
                label="Gewuenschte Liga"
                value={changeRequestForm.requested_league}
                onChange={(event) =>
                  setChangeRequestForm((current) => ({ ...current, requested_league: event.target.value }))
                }
              >
                <option value="">Keine Aenderung</option>
                <option value="toprope">Toprope</option>
                <option value="lead">Vorstieg</option>
              </StitchSelectField>
              <StitchSelectField
                label="Gewuenschtes Geschlecht"
                value={changeRequestForm.requested_gender}
                onChange={(event) =>
                  setChangeRequestForm((current) => ({ ...current, requested_gender: event.target.value }))
                }
              >
                <option value="">Keine Aenderung</option>
                <option value="m">Maennlich</option>
                <option value="w">Weiblich</option>
              </StitchSelectField>
            </div>
            <StitchTextareaField
              label="Nachricht"
              value={changeRequestForm.message}
              onChange={(event) =>
                setChangeRequestForm((current) => ({ ...current, message: event.target.value }))
              }
              placeholder="Zusaetzliche Informationen zu deiner Anfrage..."
              hint="Optional, aber hilfreich fuer die Pruefung."
            />
            {changeState.hasNoChange ? (
              <StitchCard tone="muted" className="p-4">
                <p className="text-sm leading-6 text-[rgba(27,28,26,0.68)]">
                  Bitte waehle mindestens eine Aenderung aus.
                </p>
              </StitchCard>
            ) : null}
            {changeState.hasSameValues && !changeState.hasLeagueChange && !changeState.hasGenderChange ? (
              <StitchCard tone="muted" className="p-4">
                <p className="text-sm leading-6 text-[rgba(27,28,26,0.68)]">
                  Die gewuenschten Werte muessen sich von den aktuellen Werten unterscheiden.
                </p>
              </StitchCard>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <StitchButton type="button" variant="outline" onClick={() => setChangeRequestOpen(false)}>
                Abbrechen
              </StitchButton>
              <StitchButton
                type="button"
                disabled={changeRequestDisabled}
                onClick={handleChangeRequestSubmit}
              >
                {requestingChange ? "Sende..." : "Anfrage senden"}
              </StitchButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileScreen;
