import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Crown, HelpCircle, KeyRound, LogOut, Sparkles, TicketCheck, Trophy, UserSquare2, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StarRating } from "@/components/ui/star-rating";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { StitchBadge, StitchButton, StitchCard, StitchSelectField, StitchTextField, StitchTextareaField } from "@/app/components/StitchPrimitives";
import { createChangeRequest, listGyms, listProfiles, listResults, listResultsForUser, listRoutes, upsertProfile } from "@/services/appApi";
import { supabase } from "@/services/supabase";
import type { Gym, Result, Route } from "@/services/appTypes";
import { useSeasonSettings } from "@/services/seasonSettings";

const ActionRow = ({ icon, label, detail, destructive = false, onClick }: { icon: React.ReactNode; label: string; detail?: string; destructive?: boolean; onClick: () => void | Promise<void>; }) => (
  <button type="button" onClick={() => { void onClick(); }} className="flex w-full items-center justify-between gap-4 rounded-[1.2rem] border border-[rgba(0,38,55,0.08)] bg-white/70 px-4 py-4 text-left transition hover:bg-white">
    <div className="flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${destructive ? "bg-[rgba(186,26,26,0.08)] text-[#ba1a1a]" : "bg-[#f5efe5] text-[#003d55]"}`}>{icon}</div>
      <div>
        <div className={`text-sm font-semibold ${destructive ? "text-[#ba1a1a]" : "text-[#002637]"}`}>{label}</div>
        {detail ? <div className="text-xs text-[rgba(27,28,26,0.58)]">{detail}</div> : null}
      </div>
    </div>
    <ChevronRight className={`h-4 w-4 ${destructive ? "text-[#ba1a1a]" : "text-[rgba(0,38,55,0.48)]"}`} />
  </button>
);

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { profile, signOut, user, refreshProfile } = useAuth();
  const { getClassName } = useSeasonSettings();
  const firstName = profile?.first_name || (user?.user_metadata?.first_name as string | undefined);
  const lastName = profile?.last_name || (user?.user_metadata?.last_name as string | undefined);
  const birthDate = profile?.birth_date ?? (user?.user_metadata?.birth_date as string | undefined);
  const gender = (profile?.gender || (user?.user_metadata?.gender as string | undefined)) as "m" | "w" | undefined;
  const league = profile?.league || (user?.user_metadata?.league as string | undefined);
  const homeGymId = profile?.home_gym_id ?? (user?.user_metadata?.home_gym_id as string | undefined);
  const avatarUrl = profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined);
  const [form, setForm] = useState({ firstName: firstName ?? "", lastName: lastName ?? "", birthDate: birthDate ?? "", gender: gender ?? "", league: league ?? "", homeGymId: homeGymId ?? "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [requestingChange, setRequestingChange] = useState(false);
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [changeRequestForm, setChangeRequestForm] = useState({ requested_league: "", requested_gender: "", message: "" });

  useEffect(() => {
    listGyms().then(({ data }) => setGyms(data ?? []));
    listRoutes().then(({ data }) => setRoutes(data ?? []));
  }, []);

  useEffect(() => {
    setForm({ firstName: firstName ?? "", lastName: lastName ?? "", birthDate: birthDate ?? "", gender: gender ?? "", league: league ?? "", homeGymId: homeGymId ?? "" });
    setAvatarPreview(avatarUrl ?? null);
  }, [firstName, lastName, birthDate, gender, league, homeGymId, avatarUrl]);

  useEffect(() => {
    if (!profile?.id) return;
    listResultsForUser(profile.id).then(({ data }) => setResults(data ?? []));
  }, [profile?.id]);

  useEffect(() => {
    const loadRank = async () => {
      const [{ data: profiles }, { data: allResults }, { data: allRoutes }] = await Promise.all([listProfiles(), listResults(), listRoutes()]);
      if (!profiles || !allResults || !allRoutes || !profile?.id) return setCurrentRank(null);
      const leagueKey = league === "lead" || league === "toprope" ? league : null;
      const classKey = getClassName(birthDate ?? null, gender ?? null);
      if (!leagueKey || !classKey) return setCurrentRank(null);
      const routeMap = new Map(allRoutes.map((route) => [route.id, route.discipline]));
      const totals = allResults.reduce<Record<string, number>>((acc, result) => {
        if (routeMap.get(result.route_id) !== leagueKey) return acc;
        acc[result.profile_id] = (acc[result.profile_id] ?? 0) + (result.points ?? 0) + (result.flash ? 1 : 0);
        return acc;
      }, {});
      const rows = profiles.filter((item) => item.role !== "gym_admin" && item.role !== "league_admin").map((item) => ({ id: item.id, className: getClassName(item.birth_date, item.gender) || null, points: totals[item.id] ?? 0 })).filter((row) => row.className === classKey).sort((a, b) => b.points - a.points);
      const index = rows.findIndex((row) => row.id === profile.id);
      setCurrentRank(index >= 0 ? index + 1 : null);
    };
    void loadRank();
  }, [profile?.id, birthDate, gender, league, getClassName]);

  const stats = useMemo(() => {
    const routeMap = new Map(routes.map((route) => [route.id, route]));
    const leagueKey = league === "lead" || league === "toprope" ? league : null;
    const filtered = leagueKey ? results.filter((result) => routeMap.get(result.route_id)?.discipline === leagueKey) : results;
    const points = filtered.reduce((sum, item) => sum + (item.points ?? 0) + (item.flash ? 1 : 0), 0);
    const visitedGyms = new Set(filtered.map((result) => routeMap.get(result.route_id)?.gym_id).filter(Boolean) as string[]).size;
    return { points, visitedGyms, routesClimbed: filtered.filter((result) => result.points > 0).length, flashCount: filtered.filter((result) => result.flash).length };
  }, [results, routes, league]);

  const classLabel = getClassName(birthDate, gender) || "-";
  const leagueLabel = league === "toprope" ? "Toprope" : league === "lead" ? "Vorstieg" : "Noch offen";
  const historyItems = useMemo(() => {
    const routeMap = new Map(routes.map((route) => [route.id, route]));
    const gymMap = new Map(gyms.map((gym) => [gym.id, gym]));
    return [...results].sort((a, b) => (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || "")).map((result) => {
      const route = routeMap.get(result.route_id);
      const gym = route ? gymMap.get(route.gym_id) : null;
      return { id: result.id, createdAt: result.created_at, routeName: route?.name || route?.code || "Route", gymName: gym?.name || "Halle", points: (result.points ?? 0) + (result.flash ? 1 : 0), flash: result.flash, rating: result.rating };
    });
  }, [results, routes, gyms]);

  const homeGymLabel = useMemo(() => {
    const homeGym = gyms.find((gym) => gym.id === homeGymId);
    return homeGym ? `${homeGym.name}${homeGym.city ? ` (${homeGym.city})` : ""}` : "Noch keine Auswahl";
  }, [gyms, homeGymId]);

  const changeState = {
    hasLeagueChange: Boolean(changeRequestForm.requested_league && changeRequestForm.requested_league !== league),
    hasGenderChange: Boolean(changeRequestForm.requested_gender && changeRequestForm.requested_gender !== gender),
    hasNoChange: !changeRequestForm.requested_league && !changeRequestForm.requested_gender,
    hasSameValues: Boolean(changeRequestForm.requested_league && changeRequestForm.requested_league === league) || Boolean(changeRequestForm.requested_gender && changeRequestForm.requested_gender === gender),
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await upsertProfile({
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
    if (error) return toast({ title: "Fehler", description: error.message });
    await refreshProfile();
    setEditOpen(false);
    toast({ title: "Profil gespeichert", description: "Deine Daten wurden aktualisiert." });
  };

  const resizeImage = (file: File, maxSize = 512, quality = 0.85) => new Promise<Blob>((resolve, reject) => {
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
        return reject(new Error("Canvas not available"));
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) return reject(new Error("Bild konnte nicht verarbeitet werden"));
        resolve(blob);
      }, "image/jpeg", quality);
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
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, optimized, { contentType: "image/jpeg", cacheControl: "3600", upsert: true });
      if (uploadError) {
        setUploading(false);
        return toast({ title: "Upload fehlgeschlagen", description: uploadError.message || "Bitte Bucket und Rechte prüfen." });
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarPreview(data.publicUrl);
      setUploading(false);
      setSavingAvatar(true);
      const { error } = await upsertProfile({ id: user.id, email: profile?.email ?? user.email ?? null, avatar_url: data.publicUrl, role: profile?.role ?? "participant" });
      setSavingAvatar(false);
      if (error) return toast({ title: "Profilbild speichern fehlgeschlagen", description: error.message });
      await refreshProfile();
      toast({ title: "Profilbild aktualisiert", description: "Dein Profilbild wurde gespeichert." });
    } catch (error) {
      setUploading(false);
      setSavingAvatar(false);
      toast({ title: "Upload fehlgeschlagen", description: error instanceof Error ? error.message : "Unbekannter Fehler beim Upload." });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return toast({ title: "Nicht möglich", description: "Keine E-Mail vorhanden." });
    const frontendUrl = typeof window !== "undefined" ? window.location.origin : "https://kletterliga-nrw.de";
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${frontendUrl}/app/auth/reset-password` });
    if (error) return toast({ title: "Fehler", description: error.message });
    toast({ title: "E-Mail gesendet", description: "Bitte prüfe dein Postfach.", variant: "success" });
  };

  const handleChangeRequestSubmit = async () => {
    if (changeState.hasNoChange) {
      return toast({ title: "Fehler", description: "Bitte wähle mindestens eine Änderung aus.", variant: "destructive" });
    }
    if (changeState.hasSameValues && !changeState.hasLeagueChange && !changeState.hasGenderChange) {
      return toast({ title: "Fehler", description: "Die gewünschten Werte müssen sich von den aktuellen Werten unterscheiden.", variant: "destructive" });
    }
    if (!user?.id) return;
    setRequestingChange(true);
    const { error } = await createChangeRequest({
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
    if (error) return toast({ title: "Fehler", description: error.message });
    toast({ title: "Anfrage gesendet", description: "Wir prüfen deine Änderung und melden uns per E-Mail." });
    setChangeRequestOpen(false);
    setChangeRequestForm({ requested_league: "", requested_gender: "", message: "" });
  };

  const changeRequestDisabled = requestingChange || changeState.hasNoChange || (changeState.hasSameValues && !changeState.hasLeagueChange && !changeState.hasGenderChange);

  return (
    <div className="space-y-6">
      <StitchCard tone="navy" className="p-5 sm:p-6 lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex justify-center lg:justify-start">
            <button type="button" className={`stitch-avatar-ring relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[rgba(242,220,171,0.72)] bg-[rgba(242,220,171,0.12)] text-3xl font-semibold text-[#f2dcab] ${uploading || savingAvatar ? "opacity-70" : ""}`} onClick={() => fileInputRef.current?.click()} aria-label="Profilbild ändern" disabled={uploading || savingAvatar}>
              {avatarPreview ? <img src={avatarPreview} alt="Profilbild" className="h-full w-full object-cover" /> : <span>{(firstName?.[0] ?? "") + (lastName?.[0] ?? "")}</span>}
            </button>
          </div>
          <div className="space-y-4 text-center lg:text-left">
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              <StitchBadge tone="cream">{currentRank ? `Platz #${currentRank}` : "Noch ohne Rang"}</StitchBadge>
              <StitchBadge tone="terracotta">{leagueLabel}</StitchBadge>
              <StitchBadge tone="ghost">{classLabel}</StitchBadge>
            </div>
            <div>
              <div className="stitch-headline text-4xl text-[#f2dcab] sm:text-5xl">{firstName} {lastName}</div>
              <p className="mt-2 text-sm leading-6 text-[rgba(242,220,171,0.76)]">{profile?.email ?? user?.email ?? "-"}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <StitchBadge tone="ghost">{stats.points >= 200 ? "Stark unterwegs" : "Saisonprofil"}</StitchBadge>
              <StitchBadge tone="ghost">{profile?.participation_activated_at ? "Teilnahme aktiv" : "Teilnahme noch offen"}</StitchBadge>
            </div>
            {uploading || savingAvatar ? <p className="text-sm text-[rgba(242,220,171,0.76)]">{uploading ? "Bild wird hochgeladen..." : "Profilbild wird gespeichert..."}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <StitchButton type="button" variant="cream" onClick={() => setEditOpen(true)}><UserSquare2 className="h-4 w-4" />Profil bearbeiten</StitchButton>
            <StitchButton type="button" variant="outline" className="border-[rgba(242,220,171,0.18)] bg-[rgba(242,220,171,0.08)] text-[#f2dcab] hover:bg-[rgba(242,220,171,0.14)]" onClick={() => navigate("/app/age-group-rankings")}><Trophy className="h-4 w-4" />Altersklassen</StitchButton>
            <StitchButton type="button" variant="outline" className="border-[rgba(242,220,171,0.18)] bg-[rgba(242,220,171,0.08)] text-[#f2dcab] hover:bg-[rgba(242,220,171,0.14)]" onClick={() => navigate("/app/participation/redeem")}><TicketCheck className="h-4 w-4" />Teilnahme</StitchButton>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleAvatarUpload(file); }} />
      </StitchCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StitchCard tone="surface" className="p-5"><div className="stitch-kicker text-[#a15523]">Punkte</div><div className="stitch-metric mt-4 text-5xl text-[#002637]">{stats.points}</div></StitchCard>
        <StitchCard tone="surface" className="p-5"><div className="stitch-kicker text-[#a15523]">Rang</div><div className="stitch-metric mt-4 text-5xl text-[#002637]">{currentRank ? `#${currentRank}` : "--"}</div></StitchCard>
        <StitchCard tone="surface" className="p-5"><div className="stitch-kicker text-[#a15523]">Hallen</div><div className="stitch-metric mt-4 text-5xl text-[#002637]">{stats.visitedGyms}</div></StitchCard>
        <StitchCard tone="surface" className="p-5"><div className="stitch-kicker text-[#a15523]">Flashes</div><div className="stitch-metric mt-4 text-5xl text-[#002637]">{stats.flashCount}</div></StitchCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3">
          <StitchCard tone="surface" className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><div className="stitch-kicker text-[#a15523]">Profilstatus</div><div className="stitch-headline mt-2 text-2xl text-[#002637]">Dein aktueller Überblick</div></div>
              <Sparkles className="h-6 w-6 text-[#003d55]" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] bg-[#f5efe5] p-4"><div className="stitch-kicker text-[#a15523]">Heimat-Halle</div><div className="mt-2 text-sm font-semibold text-[#002637]">{homeGymLabel}</div></div>
              <div className="rounded-[1.2rem] bg-[#f5efe5] p-4"><div className="stitch-kicker text-[#a15523]">Gekletterte Routen</div><div className="mt-2 text-sm font-semibold text-[#002637]">{stats.routesClimbed}</div></div>
            </div>
          </StitchCard>
          <StitchCard tone="surface" className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><div className="stitch-kicker text-[#a15523]">Verlauf</div><div className="stitch-headline mt-2 text-2xl text-[#002637]">Letzte Einträge</div></div>
              <StitchButton type="button" variant="ghost" className="px-0" onClick={() => setHistoryOpen(true)}>Alle Einträge ansehen</StitchButton>
            </div>
            <div className="mt-5 space-y-3">
              {historyItems.slice(0, 3).length === 0 ? <p className="text-sm leading-6 text-[rgba(27,28,26,0.64)]">Noch kein Verlauf vorhanden.</p> : historyItems.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-[1.2rem] border border-[rgba(0,38,55,0.08)] bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-[#002637]">{item.routeName}</div>
                      <div className="mt-1 text-xs text-[rgba(27,28,26,0.58)]">{item.gymName}</div>
                      {item.rating !== null && item.rating !== undefined ? <div className="mt-2"><StarRating value={item.rating} readonly size="sm" /></div> : null}
                    </div>
                    <div className="text-right"><div className="text-sm font-semibold text-[#a15523]">{item.points} Pkt{item.flash ? " · Flash" : ""}</div><div className="mt-1 text-xs text-[rgba(27,28,26,0.58)]">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("de-DE") : "-"}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </StitchCard>
        </div>

        <div className="space-y-3">
          <StitchCard tone="surface" className="p-5 sm:p-6">
            <div className="stitch-kicker text-[#a15523]">Konto</div>
            <div className="stitch-headline mt-2 text-2xl text-[#002637]">Einstellungen und Hilfe</div>
            <div className="mt-5 space-y-3">
              <ActionRow icon={<KeyRound className="h-5 w-5" />} label="Passwort ändern" detail="Reset-Link an deine E-Mail-Adresse senden" onClick={handlePasswordReset} />
              <ActionRow icon={<HelpCircle className="h-5 w-5" />} label="Hilfe" detail="support@kletterliga-nrw.de" onClick={() => { window.location.href = "mailto:support@kletterliga-nrw.de"; }} />
              <ActionRow icon={<HelpCircle className="h-5 w-5" />} label="Impressum" detail="Rechtliche Informationen" onClick={() => { window.location.href = "/impressum"; }} />
              <ActionRow icon={<LogOut className="h-5 w-5" />} label="Logout" detail="Aus deinem Account abmelden" destructive onClick={signOut} />
            </div>
          </StitchCard>
          <StitchCard tone="cream" className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><div className="stitch-kicker text-[#a15523]">Wertungsklasse</div><div className="stitch-headline mt-2 text-2xl text-[#002637]">Fixiert aus der Registrierung</div></div><Crown className="h-6 w-6 text-[#003d55]" /></div>
            <p className="mt-4 text-sm leading-6 text-[rgba(27,28,26,0.68)]">Liga und Geschlecht werden bei der Registrierung gesetzt. Änderungen laufen über eine Anfrage, damit die Wettkampfwertung sauber bleibt.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] bg-white/70 p-4"><div className="stitch-kicker text-[#a15523]">Liga</div><div className="mt-2 text-sm font-semibold text-[#002637]">{leagueLabel}</div></div>
              <div className="rounded-[1.2rem] bg-white/70 p-4"><div className="stitch-kicker text-[#a15523]">Geschlecht</div><div className="mt-2 text-sm font-semibold text-[#002637]">{gender === "m" ? "Männlich" : gender === "w" ? "Weiblich" : "-"}</div></div>
            </div>
            <StitchButton type="button" variant="navy" className="mt-5 w-full" onClick={() => { setChangeRequestForm({ requested_league: "", requested_gender: "", message: "" }); setChangeRequestOpen(true); }}>Änderung anfragen</StitchButton>
          </StitchCard>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="stitch-app overflow-hidden border-0 bg-[linear-gradient(180deg,#fbf9f6_0%,#f5f0e7_100%)] p-0 text-[#1b1c1a] sm:max-w-2xl sm:rounded-[1.75rem]">
          <div className="bg-[#003d55] px-6 py-6 text-[#f2dcab]">
            <DialogHeader className="space-y-2 px-0 pt-0 text-left">
              <DialogTitle className="stitch-headline pr-12 text-3xl text-[#f2dcab]">Profil bearbeiten</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-[rgba(242,220,171,0.76)]">Passe deine persönlichen Daten an und halte dein Profil aktuell.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-6 py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <StitchTextField label="Vorname" value={form.firstName} onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))} />
              <StitchTextField label="Nachname" value={form.lastName} onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StitchTextField label="Geburtsdatum" type="date" value={form.birthDate} onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))} />
              <StitchSelectField label="Wertungsklasse" value={form.gender} onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))} disabled hint="Die Auswahl ist für die Wettkampfwertung gesperrt.">
                <option value="">Auswählen</option><option value="w">Weiblich</option><option value="m">Männlich</option>
              </StitchSelectField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StitchSelectField label="Liga" value={form.league} onChange={(event) => setForm((prev) => ({ ...prev, league: event.target.value }))} disabled hint="Die Liga wird aus der Registrierung übernommen.">
                <option value="">Auswählen</option><option value="toprope">Toprope</option><option value="lead">Vorstieg</option>
              </StitchSelectField>
              <StitchSelectField label="Heimat-Halle" value={form.homeGymId} onChange={(event) => setForm((prev) => ({ ...prev, homeGymId: event.target.value }))}>
                <option value="">Keine Auswahl</option>{gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name} {gym.city ? `(${gym.city})` : ""}</option>)}
              </StitchSelectField>
            </div>
            <StitchCard tone="muted" className="p-4">
              <div className="space-y-2">
                <div className="stitch-kicker text-[#a15523]">Wertungsklasse gesperrt</div>
                <p className="text-sm leading-6 text-[rgba(27,28,26,0.68)]">Liga und Wertungsklasse werden bei der Anmeldung festgelegt. Änderungen sind nur per Anfrage möglich.</p>
                <StitchButton type="button" variant="outline" size="sm" onClick={() => setChangeRequestOpen(true)}>Änderung anfragen</StitchButton>
              </div>
            </StitchCard>
            <StitchButton type="button" className="w-full" disabled={saving} onClick={handleSave}>{saving ? "Speichern..." : "Profil speichern"}</StitchButton>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="stitch-app overflow-hidden border-0 bg-[linear-gradient(180deg,#fbf9f6_0%,#f5f0e7_100%)] p-0 text-[#1b1c1a] sm:max-w-3xl sm:rounded-[1.75rem]">
          <div className="bg-[#003d55] px-6 py-6 text-[#f2dcab]">
            <DialogHeader className="space-y-2 px-0 pt-0 text-left">
              <DialogTitle className="stitch-headline pr-12 text-3xl text-[#f2dcab]">Verlauf</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-[rgba(242,220,171,0.76)]">Deine eingetragenen Routen und Punkte im neuen Profil-Look.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-3 px-6 py-6">
            {historyItems.length === 0 ? <p className="text-sm leading-6 text-[rgba(27,28,26,0.64)]">Noch kein Verlauf vorhanden.</p> : historyItems.map((item) => (
              <StitchCard key={item.id} tone="surface" className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[#002637]">{item.routeName}</div>
                    <div className="mt-1 text-xs text-[rgba(27,28,26,0.58)]">{item.gymName}</div>
                    {item.rating !== null && item.rating !== undefined ? <div className="mt-2"><StarRating value={item.rating} readonly size="sm" /></div> : null}
                  </div>
                  <div className="text-right"><div className="text-sm font-semibold text-[#a15523]">{item.points} Pkt{item.flash ? " · Flash" : ""}</div><div className="mt-1 text-xs text-[rgba(27,28,26,0.58)]">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("de-DE") : "-"}</div></div>
                </div>
              </StitchCard>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={changeRequestOpen} onOpenChange={setChangeRequestOpen}>
        <DialogContent className="stitch-app overflow-hidden border-0 bg-[linear-gradient(180deg,#fbf9f6_0%,#f5f0e7_100%)] p-0 text-[#1b1c1a] sm:max-w-2xl sm:rounded-[1.75rem]">
          <div className="bg-[#003d55] px-6 py-6 text-[#f2dcab]">
            <DialogHeader className="space-y-2 px-0 pt-0 text-left">
              <DialogTitle className="stitch-headline pr-12 text-3xl text-[#f2dcab]">Änderung anfragen</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-[rgba(242,220,171,0.76)]">Wähle die Werte, die du ändern möchtest. Wir prüfen die Anfrage anschließend manuell.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-6 py-6">
            <StitchCard tone="muted" className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><div className="stitch-kicker text-[#a15523]">Aktuelle Liga</div><div className="mt-2 text-sm font-semibold text-[#002637]">{leagueLabel}</div></div>
                <div><div className="stitch-kicker text-[#a15523]">Aktuelles Geschlecht</div><div className="mt-2 text-sm font-semibold text-[#002637]">{gender === "m" ? "Männlich" : gender === "w" ? "Weiblich" : "-"}</div></div>
              </div>
            </StitchCard>
            <div className="grid gap-4 sm:grid-cols-2">
              <StitchSelectField label="Gewünschte Liga" value={changeRequestForm.requested_league} onChange={(event) => setChangeRequestForm((prev) => ({ ...prev, requested_league: event.target.value }))}>
                <option value="">Keine Änderung</option><option value="toprope">Toprope</option><option value="lead">Vorstieg</option>
              </StitchSelectField>
              <StitchSelectField label="Gewünschtes Geschlecht" value={changeRequestForm.requested_gender} onChange={(event) => setChangeRequestForm((prev) => ({ ...prev, requested_gender: event.target.value }))}>
                <option value="">Keine Änderung</option><option value="m">Männlich</option><option value="w">Weiblich</option>
              </StitchSelectField>
            </div>
            <StitchTextareaField label="Nachricht" value={changeRequestForm.message} onChange={(event) => setChangeRequestForm((prev) => ({ ...prev, message: event.target.value }))} placeholder="Zusätzliche Informationen zu deiner Anfrage..." hint="Optional, aber hilfreich für die Prüfung." />
            {changeState.hasNoChange ? <StitchCard tone="muted" className="p-4"><p className="text-sm leading-6 text-[rgba(27,28,26,0.68)]">Bitte wähle mindestens eine Änderung aus.</p></StitchCard> : null}
            {changeState.hasSameValues && !changeState.hasLeagueChange && !changeState.hasGenderChange ? <StitchCard tone="muted" className="p-4"><p className="text-sm leading-6 text-[rgba(27,28,26,0.68)]">Die gewünschten Werte müssen sich von den aktuellen Werten unterscheiden.</p></StitchCard> : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <StitchButton type="button" variant="outline" onClick={() => setChangeRequestOpen(false)}>Abbrechen</StitchButton>
              <StitchButton type="button" disabled={changeRequestDisabled} onClick={handleChangeRequestSubmit}>{requestingChange ? "Sende..." : "Anfrage senden"}</StitchButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileScreen;
