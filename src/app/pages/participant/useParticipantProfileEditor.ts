import { useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { createChangeRequest, upsertProfile } from "@/services/appApi";
import { useSeasonSettings } from "@/services/seasonSettings";
import { supabase } from "@/services/supabase";
import { resizeImageFile } from "@/lib/imageProcessing";
import { buildParticipantProfileData } from "./participantData";
import { useParticipantCompetitionData } from "./useParticipantCompetitionData";
import type { ParticipantChangeRequestForm } from "./ParticipantProfileChangeRequestDialog";

export const useParticipantProfileEditor = () => {
  const { profile, user, refreshProfile } = useAuth();
  const { getClassName } = useSeasonSettings();
  const { profiles, results, routes, gyms, viewerMasterRedemption, loading, error, reload } =
    useParticipantCompetitionData();
  const hasOfficialMasterRedemption = Boolean(viewerMasterRedemption?.redeemed_at);

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
  const [requestingChange, setRequestingChange] = useState(false);
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [changeRequestForm, setChangeRequestForm] = useState<ParticipantChangeRequestForm>({
    requested_league: "",
    requested_gender: "",
    message: "",
  });

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
  }, [avatarUrl, birthDate, firstName, gender, homeGymId, lastName, league]);

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
  const genderLabel = gender === "m" ? "Männlich" : gender === "w" ? "Weiblich" : "-";
  const displayName =
    profileData?.displayName || `${firstName ?? ""} ${lastName ?? ""}`.trim() || user?.email || "Profil";

  const changeState = {
    hasLeagueChange: Boolean(changeRequestForm.requested_league && changeRequestForm.requested_league !== league),
    hasGenderChange: Boolean(changeRequestForm.requested_gender && changeRequestForm.requested_gender !== gender),
    hasNoChange: !changeRequestForm.requested_league && !changeRequestForm.requested_gender,
    hasSameValues:
      Boolean(changeRequestForm.requested_league && changeRequestForm.requested_league === league) ||
      Boolean(changeRequestForm.requested_gender && changeRequestForm.requested_gender === gender),
  };

  const handleSave = async () => {
    if (!user?.id) return false;

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
      toast({ title: "Fehler", description: saveError.message });
      return false;
    }

    await refreshProfile();
    await reload();
    toast({ title: "Profil gespeichert", description: "Deine Daten wurden aktualisiert." });
    return true;
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return false;

    try {
      setUploading(true);
      const optimized = await resizeImageFile(file, { maxSize: 512, quality: 0.85 });
      const filePath = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, optimized, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadError) {
        setUploading(false);
        toast({
          title: "Upload fehlgeschlagen",
          description: uploadError.message || "Bitte Bucket und Rechte prüfen.",
        });
        return false;
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
        toast({ title: "Profilbild speichern fehlgeschlagen", description: saveError.message });
        return false;
      }

      await refreshProfile();
      await reload();
      toast({ title: "Profilbild aktualisiert", description: "Dein Profilbild wurde gespeichert." });
      return true;
    } catch (uploadError) {
      setUploading(false);
      setSavingAvatar(false);
      toast({
        title: "Upload fehlgeschlagen",
        description: uploadError instanceof Error ? uploadError.message : "Unbekannter Fehler beim Upload.",
      });
      return false;
    }
  };

  const handleChangeRequestSubmit = async () => {
    if (changeState.hasNoChange) {
      toast({
        title: "Fehler",
        description: "Bitte wähle mindestens eine Änderung aus.",
        variant: "destructive",
      });
      return false;
    }

    if (changeState.hasSameValues && !changeState.hasLeagueChange && !changeState.hasGenderChange) {
      toast({
        title: "Fehler",
        description: "Die gewünschten Werte müssen sich von den aktuellen Werten unterscheiden.",
        variant: "destructive",
      });
      return false;
    }

    if (!user?.id) return false;

    setRequestingChange(true);
    const { error: requestError } = await createChangeRequest({
      profile_id: user.id,
      email: profile?.email ?? user.email ?? null,
      current_league: league ?? null,
      current_gender: gender ?? null,
      requested_league: changeRequestForm.requested_league || null,
      requested_gender: changeRequestForm.requested_gender || null,
      message: changeRequestForm.message.trim() || "Änderung der Wertungsklasse angefragt.",
      status: "open",
    });
    setRequestingChange(false);

    if (requestError) {
      toast({ title: "Fehler", description: requestError.message });
      return false;
    }

    toast({
      title: "Anfrage gesendet",
      description: "Wir prüfen deine Änderung und melden uns per E-Mail.",
    });
    setChangeRequestOpen(false);
    setChangeRequestForm({
      requested_league: "",
      requested_gender: "",
      message: "",
    });
    return true;
  };

  return {
    profile,
    user,
    gyms,
    viewerMasterRedemption,
    hasOfficialMasterRedemption,
    participationMasterMismatch: Boolean(profile?.participation_activated_at) && !hasOfficialMasterRedemption,
    loading,
    error,
    profileData,
    displayName,
    leagueLabel,
    genderLabel,
    form,
    setForm,
    avatarPreview,
    saving,
    uploading,
    savingAvatar,
    handleSave,
    handleAvatarUpload,
    changeRequestOpen,
    setChangeRequestOpen,
    changeRequestForm,
    setChangeRequestForm,
    changeRequestDisabled:
      requestingChange ||
      changeState.hasNoChange ||
      (changeState.hasSameValues && !changeState.hasLeagueChange && !changeState.hasGenderChange),
    changeState,
    requestingChange,
    handleChangeRequestSubmit,
  };
};
