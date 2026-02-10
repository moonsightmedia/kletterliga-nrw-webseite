import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Crown, HelpCircle, KeyRound, LogOut, TicketCheck, Trophy, UserSquare2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import {
  createChangeRequest,
  listGyms,
  listProfiles,
  listResults,
  listResultsForUser,
  listRoutes,
  upsertProfile,
} from "@/services/appApi";
import { supabase } from "@/services/supabase";
import type { Gym, Result, Route } from "@/services/appTypes";
import { useSeasonSettings } from "@/services/seasonSettings";

const Profile = () => {
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [requestingChange, setRequestingChange] = useState(false);
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [changeRequestForm, setChangeRequestForm] = useState({
    requested_league: "",
    requested_gender: "",
    message: "",
  });

  useEffect(() => {
    listGyms().then(({ data }) => setGyms(data ?? []));
    listRoutes().then(({ data }) => setRoutes(data ?? []));
  }, []);

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

  useEffect(() => {
    if (!profile?.id) return;
    listResultsForUser(profile.id).then(({ data }) => setResults(data ?? []));
  }, [profile?.id]);

  useEffect(() => {
    const loadRank = async () => {
      const [{ data: profiles }, { data: allResults }, { data: allRoutes }] = await Promise.all([
        listProfiles(),
        listResults(),
        listRoutes(),
      ]);
      if (!profiles || !allResults || !allRoutes || !profile?.id) {
        setCurrentRank(null);
        return;
      }
      const leagueKey = league === "lead" || league === "toprope" ? league : null;
      if (!leagueKey) {
        setCurrentRank(null);
        return;
      }
      const classKey = getClassName(birthDate ?? null, gender ?? null);
      if (!classKey) {
        setCurrentRank(null);
        return;
      }
      const routeMap = new Map(allRoutes.map((route) => [route.id, route.discipline]));
      const totals = allResults.reduce<Record<string, number>>((acc, result) => {
        if (routeMap.get(result.route_id) !== leagueKey) return acc;
        acc[result.profile_id] =
          (acc[result.profile_id] ?? 0) + (result.points ?? 0) + (result.flash ? 1 : 0);
        return acc;
      }, {});
      const rows = profiles
        .filter((item) => {
          // Filtere Admin-Accounts heraus
          if (item.role === "gym_admin" || item.role === "league_admin") {
            return false;
          }
          return true;
        })
        .map((item) => ({
          id: item.id,
          className: getClassName(item.birth_date, item.gender) || null,
          points: totals[item.id] ?? 0,
        }))
        .filter((row) => row.className === classKey)
        .sort((a, b) => b.points - a.points);
      const index = rows.findIndex((row) => row.id === profile.id);
      setCurrentRank(index >= 0 ? index + 1 : null);
    };
    loadRank();
  }, [profile?.id, birthDate, gender, league]);

  const { points, visitedGyms } = useMemo(() => {
    const routeMap = new Map(routes.map((route) => [route.id, route]));
    const leagueKey = league === "lead" || league === "toprope" ? league : null;
    const filteredResults = leagueKey
      ? results.filter((res) => routeMap.get(res.route_id)?.discipline === leagueKey)
      : results;
    const pointsSum = filteredResults.reduce((sum, item) => sum + (item.points ?? 0) + (item.flash ? 1 : 0), 0);
    const gymIds = new Set(filteredResults.map((res) => routeMap.get(res.route_id)?.gym_id).filter(Boolean) as string[]);
    return { points: pointsSum, visitedGyms: gymIds.size };
  }, [results, routes, league]);

  const isGoldMember = points >= 200;
  const historyItems = useMemo(() => {
    const routeMap = new Map(routes.map((route) => [route.id, route]));
    const gymMap = new Map(gyms.map((gym) => [gym.id, gym]));
    return [...results]
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
      .map((result) => {
        const route = routeMap.get(result.route_id);
        const gym = route ? gymMap.get(route.gym_id) : null;
        return {
          id: result.id,
          createdAt: result.created_at,
          routeName: route?.name || route?.code || "Route",
          gymName: gym?.name || "Halle",
          points: (result.points ?? 0) + (result.flash ? 1 : 0),
          flash: result.flash,
        };
      });
  }, [results, routes, gyms]);

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
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    await refreshProfile();
    setEditOpen(false);
    toast({ title: "Profil gespeichert", description: "Deine Daten wurden aktualisiert." });
  };

  const resizeImage = (file: File, maxSize = 512, quality = 0.85) =>
    new Promise<Blob>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not available"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Bild konnte nicht verarbeitet werden"));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
      img.src = URL.createObjectURL(file);
    });

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return;
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
      toast({
        title: "Upload fehlgeschlagen",
        description: uploadError.message || "Bitte Bucket & Rechte prüfen.",
      });
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    setAvatarPreview(data.publicUrl);
    setUploading(false);
    setSavingAvatar(true);
    const { error } = await upsertProfile({
      id: user.id,
      email: profile?.email ?? user.email ?? null,
      avatar_url: data.publicUrl,
      role: profile?.role ?? "participant",
    });
    setSavingAvatar(false);
    if (error) {
      toast({ title: "Profilbild speichern fehlgeschlagen", description: error.message });
      return;
    }
    await refreshProfile();
    toast({ title: "Profilbild aktualisiert", description: "Dein Profilbild wurde gespeichert." });
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto">
      <Card className="border-0 overflow-hidden">
        <div className="px-0 pt-0">
          <div className="flex items-center justify-between bg-secondary px-5 md:px-8 py-3 md:py-4 text-white rounded-b-none rounded-t-2xl">
            <div className="flex items-center gap-2 text-sm md:text-base font-semibold">
              <span className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-white/70" />
              {currentRank ? `Platz ${currentRank}` : "Platz -"}
            </div>
            <button type="button" className="text-sm md:text-base font-semibold" onClick={() => setHistoryOpen(true)}>
              Verlauf <ChevronRight className="inline h-4 w-4 md:h-5 md:w-5" />
            </button>
          </div>
        </div>
        <div className="rounded-b-xl bg-primary px-5 md:px-8 py-6 md:py-8 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1 text-center">
              <button
                type="button"
                className={`mx-auto h-24 w-24 md:h-32 md:w-32 overflow-hidden rounded-full border-4 border-white/70 ${
                  uploading || savingAvatar ? "opacity-70" : ""
                }`}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Profilbild ändern"
                disabled={uploading || savingAvatar}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profilbild" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-white/10 flex items-center justify-center text-2xl md:text-3xl font-semibold">
                    {(firstName?.[0] ?? "") + (lastName?.[0] ?? "")}
                  </div>
                )}
              </button>
              {(uploading || savingAvatar) && (
                <div className="mt-2 text-xs md:text-sm text-white/80">
                  {uploading ? "Lädt hoch..." : "Speichert..."}
                </div>
              )}
              <div className="mt-4 text-lg md:text-xl lg:text-2xl font-semibold">{firstName} {lastName}</div>
              <div className="text-sm md:text-base text-white/70">{profile?.email ?? user?.email ?? "-"}</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />
          </div>

          <button
            type="button"
            className="mt-5 w-full bg-white text-primary px-4 py-2 text-sm flex items-center justify-between -skew-x-6"
            onClick={() => setEditOpen(true)}
          >
            <div className="flex items-center gap-2 font-semibold skew-x-6">
              <UserSquare2 className="h-4 w-4 text-primary" />
              Profil bearbeiten
            </div>
            <ChevronRight className="inline h-3.5 w-3.5 text-muted-foreground skew-x-6" />
          </button>
          <button
            type="button"
            className="mt-3 w-full bg-white text-primary px-4 py-2 text-sm flex items-center justify-between -skew-x-6"
            onClick={() => navigate("/app/age-group-rankings")}
          >
            <div className="flex items-center gap-2 font-semibold skew-x-6">
              <Trophy className="h-4 w-4 text-primary" />
              Altersklassenranglisten
            </div>
            <ChevronRight className="inline h-3.5 w-3.5 text-muted-foreground skew-x-6" />
          </button>
          <button
            type="button"
            className="mt-3 w-full bg-white text-primary px-4 py-2 text-sm flex items-center justify-between -skew-x-6"
            onClick={() => navigate("/app/participation/redeem")}
          >
            <div className="flex items-center gap-2 font-semibold skew-x-6">
              <TicketCheck className="h-4 w-4 text-primary" />
              Teilnahme freischalten
            </div>
            <ChevronRight className="inline h-3.5 w-3.5 text-muted-foreground skew-x-6" />
          </button>
        </div>
      </Card>

      <div className="space-y-3">
        <button
          type="button"
          className="w-full px-4 py-3 flex items-center justify-between text-sm -skew-x-6 bg-background border border-border/60"
          onClick={async () => {
            if (!user?.email) {
              toast({ title: "Nicht möglich", description: "Keine E-Mail vorhanden." });
              return;
            }
            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
            if (error) {
              toast({ title: "Fehler", description: error.message });
              return;
            }
            toast({ title: "E-Mail gesendet", description: "Bitte prüfe dein Postfach." });
          }}
        >
          <span className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-primary" />
            Passwort ändern
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          className="w-full px-4 py-3 flex items-center justify-between text-sm -skew-x-6 bg-background border border-border/60"
          onClick={() => {
            window.location.href = "mailto:support@kletterliga-nrw.de";
          }}
        >
          <span className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-primary" />
            Hilfe
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          className="w-full px-4 py-3 flex items-center justify-between text-sm -skew-x-6 bg-background border border-border/60"
          onClick={() => {
            window.location.href = "/impressum";
          }}
        >
          <span className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-primary" />
            Impressum
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          className="w-full px-4 py-3 flex items-center justify-between text-sm text-destructive -skew-x-6 bg-background border border-border/60"
          onClick={() => signOut()}
        >
          <span className="flex items-center gap-3">
            <LogOut className="h-5 w-5" />
            Logout
          </span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="h-[100dvh] w-[100dvw] max-w-none rounded-none sm:h-auto sm:w-full sm:max-w-lg md:max-w-2xl sm:rounded-lg p-0 [&>button]:right-6 [&>button]:top-6">
          <DialogHeader>
            <DialogTitle className="px-6 pt-6 text-center md:text-xl">Profil bearbeiten</DialogTitle>
            <DialogDescription className="px-6 text-center md:text-base">
              Passe deine persönlichen Daten an.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 pt-4 space-y-4 md:space-y-6 overflow-y-auto max-h-[calc(100dvh-80px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName" className="md:text-base">Vorname</Label>
                <Input
                  id="editFirstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="md:text-base md:h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName" className="md:text-base">Nachname</Label>
                <Input
                  id="editLastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="md:text-base md:h-12"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editBirthDate" className="md:text-base">Geburtsdatum</Label>
                <Input
                  id="editBirthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="md:text-base md:h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editGender" className="md:text-base">Wertungsklasse (m/w)</Label>
                <select
                  id="editGender"
                  className="h-10 md:h-12 w-full rounded-md border border-input bg-background px-3 text-sm md:text-base"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  disabled
                >
                  <option value="">Auswählen</option>
                  <option value="w">Weiblich</option>
                  <option value="m">Männlich</option>
                </select>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Auswahl gemäß Wettkampf-Wertungsklassen (m/w).
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editLeague">Liga</Label>
                <select
                  id="editLeague"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.league}
                  onChange={(e) => setForm({ ...form, league: e.target.value })}
                  disabled
                >
                  <option value="">Auswählen</option>
                  <option value="toprope">Toprope</option>
                  <option value="lead">Vorstieg</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editHomeGym">Heimat-Halle</Label>
                <select
                  id="editHomeGym"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.homeGymId}
                  onChange={(e) => setForm({ ...form, homeGymId: e.target.value })}
                >
                  <option value="">Keine Auswahl</option>
                  {gyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name} {gym.city ? `(${gym.city})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Card className="p-3 border-border/60 bg-background/60">
              <div className="text-xs uppercase tracking-widest text-secondary">Wertungsklasse gesperrt</div>
              <p className="text-xs text-muted-foreground mt-1">
                Liga und Wertungsklasse werden bei der Anmeldung festgelegt. Änderungen sind nur per Anfrage möglich.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setChangeRequestForm({
                    requested_league: "",
                    requested_gender: "",
                    message: "",
                  });
                  setChangeRequestOpen(true);
                }}
              >
                <span className="skew-x-6">Änderung anfragen</span>
              </Button>
            </Card>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              <span className="skew-x-6">{saving ? "Speichern..." : "Profil speichern"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="h-[100dvh] w-[100dvw] max-w-none rounded-none sm:h-auto sm:w-full sm:max-w-lg sm:rounded-lg p-0 [&>button]:right-6 [&>button]:top-6">
          <DialogHeader>
            <DialogTitle className="px-6 pt-6 text-center">Verlauf</DialogTitle>
            <DialogDescription className="px-6 text-center">
              Deine eingetragenen Routen und Punkte.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 pt-4 space-y-3 overflow-y-auto max-h-[calc(100dvh-80px)]">
            {historyItems.length === 0 && (
              <div className="text-sm text-muted-foreground text-center">Noch kein Verlauf vorhanden.</div>
            )}
            {historyItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/60 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-primary">{item.routeName}</div>
                    <div className="text-xs text-muted-foreground">{item.gymName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-secondary">
                      {item.points} Pts{item.flash ? " • Flash" : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("de-DE") : "-"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Request Dialog */}
      <Dialog open={changeRequestOpen} onOpenChange={setChangeRequestOpen}>
        <DialogContent className="h-[100dvh] w-[100dvw] max-w-none rounded-none sm:h-auto sm:w-full sm:max-w-lg md:max-w-2xl sm:rounded-lg p-0 [&>button]:right-6 [&>button]:top-6">
          <DialogHeader>
            <DialogTitle className="px-6 pt-6 text-center md:text-xl">Änderung der Wertungsklasse anfragen</DialogTitle>
            <DialogDescription className="px-6 text-center md:text-base">
              Bitte wähle die gewünschten Werte aus, die du ändern möchtest.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 pt-4 space-y-4 md:space-y-6 overflow-y-auto max-h-[calc(100dvh-200px)]">
            {/* Aktuelle Werte (nur lesend) */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="text-xs uppercase tracking-widest text-secondary mb-2">Aktuelle Werte</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Aktuelle Liga</Label>
                  <div className="text-sm font-semibold text-primary mt-1">
                    {league === "toprope" ? "Toprope" : league === "lead" ? "Vorstieg" : "-"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Aktuelles Geschlecht</Label>
                  <div className="text-sm font-semibold text-primary mt-1">
                    {gender === "m" ? "Männlich" : gender === "w" ? "Weiblich" : "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Gewünschte Werte (auswählbar) */}
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-widest text-secondary">Gewünschte Werte</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requestedLeague" className="md:text-base">Gewünschte Liga</Label>
                  <select
                    id="requestedLeague"
                    className="h-10 md:h-12 w-full rounded-md border border-input bg-background px-3 text-sm md:text-base"
                    value={changeRequestForm.requested_league}
                    onChange={(e) => setChangeRequestForm({ ...changeRequestForm, requested_league: e.target.value })}
                  >
                    <option value="">Keine Änderung</option>
                    <option value="toprope">Toprope</option>
                    <option value="lead">Vorstieg</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestedGender" className="md:text-base">Gewünschtes Geschlecht</Label>
                  <select
                    id="requestedGender"
                    className="h-10 md:h-12 w-full rounded-md border border-input bg-background px-3 text-sm md:text-base"
                    value={changeRequestForm.requested_gender}
                    onChange={(e) => setChangeRequestForm({ ...changeRequestForm, requested_gender: e.target.value })}
                  >
                    <option value="">Keine Änderung</option>
                    <option value="m">Männlich</option>
                    <option value="w">Weiblich</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="changeMessage" className="md:text-base">Nachricht (optional)</Label>
                <Textarea
                  id="changeMessage"
                  value={changeRequestForm.message}
                  onChange={(e) => setChangeRequestForm({ ...changeRequestForm, message: e.target.value })}
                  placeholder="Zusätzliche Informationen zu deiner Anfrage..."
                  className="md:text-base min-h-[100px]"
                />
              </div>
            </div>

            {/* Validierung */}
            {(() => {
              const hasLeagueChange = changeRequestForm.requested_league && changeRequestForm.requested_league !== league;
              const hasGenderChange = changeRequestForm.requested_gender && changeRequestForm.requested_gender !== gender;
              const hasNoChange = !changeRequestForm.requested_league && !changeRequestForm.requested_gender;
              const hasSameValues = 
                (changeRequestForm.requested_league && changeRequestForm.requested_league === league) ||
                (changeRequestForm.requested_gender && changeRequestForm.requested_gender === gender);

              if (hasNoChange) {
                return (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Bitte wähle mindestens eine Änderung aus (Liga oder Geschlecht).
                    </p>
                  </div>
                );
              }

              if (hasSameValues && !hasLeagueChange && !hasGenderChange) {
                return (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Die gewünschten Werte müssen sich von den aktuellen Werten unterscheiden.
                    </p>
                  </div>
                );
              }

              return null;
            })()}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setChangeRequestOpen(false)}
                className="w-full sm:w-auto"
              >
                Abbrechen
              </Button>
              <Button
                onClick={async () => {
                  // Validierung
                  const hasLeagueChange = changeRequestForm.requested_league && changeRequestForm.requested_league !== league;
                  const hasGenderChange = changeRequestForm.requested_gender && changeRequestForm.requested_gender !== gender;
                  const hasNoChange = !changeRequestForm.requested_league && !changeRequestForm.requested_gender;
                  const hasSameValues = 
                    (changeRequestForm.requested_league && changeRequestForm.requested_league === league) ||
                    (changeRequestForm.requested_gender && changeRequestForm.requested_gender === gender);

                  if (hasNoChange) {
                    toast({
                      title: "Fehler",
                      description: "Bitte wähle mindestens eine Änderung aus.",
                      variant: "destructive",
                    });
                    return;
                  }

                  if (hasSameValues && !hasLeagueChange && !hasGenderChange) {
                    toast({
                      title: "Fehler",
                      description: "Die gewünschten Werte müssen sich von den aktuellen Werten unterscheiden.",
                      variant: "destructive",
                    });
                    return;
                  }

                  if (!user?.id) return;

                  setRequestingChange(true);
                  const message = changeRequestForm.message.trim() || "Änderung der Wertungsklasse angefragt.";
                  
                  const { error } = await createChangeRequest({
                    profile_id: user.id,
                    email: profile?.email ?? user.email ?? null,
                    current_league: league ?? null,
                    current_gender: gender ?? null,
                    requested_league: changeRequestForm.requested_league || null,
                    requested_gender: changeRequestForm.requested_gender || null,
                    message: message,
                    status: "open",
                  });
                  
                  setRequestingChange(false);
                  if (error) {
                    toast({ title: "Fehler", description: error.message });
                    return;
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
                }}
                disabled={(() => {
                  const hasLeagueChange = changeRequestForm.requested_league && changeRequestForm.requested_league !== league;
                  const hasGenderChange = changeRequestForm.requested_gender && changeRequestForm.requested_gender !== gender;
                  const hasNoChange = !changeRequestForm.requested_league && !changeRequestForm.requested_gender;
                  const hasSameValues = 
                    (changeRequestForm.requested_league && changeRequestForm.requested_league === league) ||
                    (changeRequestForm.requested_gender && changeRequestForm.requested_gender === gender);
                  
                  return requestingChange || hasNoChange || (hasSameValues && !hasLeagueChange && !hasGenderChange);
                })()}
                className="w-full sm:w-auto sm:ml-auto"
              >
                <span className="skew-x-6">{requestingChange ? "Sende..." : "Anfrage senden"}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
