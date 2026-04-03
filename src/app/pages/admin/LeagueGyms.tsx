import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import {
  archiveGym,
  createGymAdmin,
  inviteGymAdmin,
  listGymInvites,
  listGymAdminsByGym,
  listGyms,
  listProfiles,
  restoreGym,
  updateGym,
  updateProfile,
} from "@/services/appApi";
import { supabase } from "@/services/supabase";
import type { Gym, GymInvite, Profile } from "@/services/appTypes";
import { Archive, Building2, Edit2, Mail, Plus, RotateCcw, UserPlus } from "lucide-react";

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("de-DE") : "—";

const formatProfileLabel = (profile: Profile) => {
  const base =
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
    profile.email ||
    profile.id;
  return profile.archived_at ? `${base} (archiviert)` : base;
};

const LeagueGyms = () => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymInvites, setGymInvites] = useState<GymInvite[]>([]);
  const [adminsByGym, setAdminsByGym] = useState<Record<string, string[]>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedGym, setSelectedGym] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editingGym, setEditingGym] = useState<Gym | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Gym | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Gym | null>(null);
  const [createMode, setCreateMode] = useState<"direct" | "invite">("invite");
  const [form, setForm] = useState({
    name: "",
    city: "",
    postal_code: "",
    address: "",
    website: "",
    logo_url: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteForm, setInviteForm] = useState({
    gymId: "",
    email: "",
  });
  const [skipEmail, setSkipEmail] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    city: "",
    postal_code: "",
    address: "",
    website: "",
    logo_url: "",
  });
  const allowInviteLinkPreview = import.meta.env.DEV;
  const inviteSectionRef = useRef<HTMLDivElement | null>(null);

  const loadData = async () => {
    const [{ data: gymData }, { data: profileData }, { data: inviteData }] = await Promise.all([
      listGyms({ includeArchived: true }),
      listProfiles({ includeArchived: true }),
      listGymInvites(),
    ]);
    setGyms(gymData ?? []);
    setProfiles(profileData ?? []);
    setGymInvites(inviteData ?? []);
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (gyms.length === 0) {
      setAdminsByGym({});
      return;
    }

    const syncAdmins = async () => {
      const mapping: Record<string, string[]> = {};
      await Promise.all(
        gyms.map(async (gym) => {
          const { data } = await listGymAdminsByGym(gym.id);
          mapping[gym.id] = (data ?? []).map((item) => item.profile_id);
        }),
      );
      setAdminsByGym(mapping);
    };

    void syncAdmins();
  }, [gyms]);

  const activeGyms = useMemo(() => gyms.filter((gym) => !gym.archived_at), [gyms]);
  const archivedGyms = useMemo(() => gyms.filter((gym) => Boolean(gym.archived_at)), [gyms]);
  const activeProfiles = useMemo(() => profiles.filter((profile) => !profile.archived_at), [profiles]);
  const gymProfilesByGym = useMemo(
    () =>
      gyms.reduce<Record<string, Profile[]>>((acc, gym) => {
        acc[gym.id] = (adminsByGym[gym.id] ?? [])
          .map((adminId) => profiles.find((profile) => profile.id === adminId))
          .filter((profile): profile is Profile => Boolean(profile));
        return acc;
      }, {}),
    [adminsByGym, gyms, profiles],
  );
  const openInvitesByGym = useMemo(() => {
    const now = Date.now();
    return gymInvites.reduce<Record<string, GymInvite>>((acc, invite) => {
      if (!invite.gym_id || invite.used_at || invite.revoked_at) return acc;
      if (new Date(invite.expires_at).getTime() <= now) return acc;
      const current = acc[invite.gym_id];
      if (!current || new Date(invite.created_at).getTime() > new Date(current.created_at).getTime()) {
        acc[invite.gym_id] = invite;
      }
      return acc;
    }, {});
  }, [gymInvites]);

  const getProfilesForGym = (gymId: string) =>
    (adminsByGym[gymId] ?? [])
      .map((adminId) => profiles.find((profile) => profile.id === adminId))
      .filter((profile): profile is Profile => Boolean(profile));

  const hasActiveAdmin = (gymId: string) => getProfilesForGym(gymId).some((profile) => !profile.archived_at);
  const claimableGyms = useMemo(
    () => activeGyms.filter((gym) => !(gymProfilesByGym[gym.id] ?? []).some((profile) => !profile.archived_at)),
    [activeGyms, gymProfilesByGym],
  );

  const getErrorCode = (value: unknown) => {
    if (typeof value !== "object" || value === null || !("code" in value)) return null;
    const { code } = value as { code?: unknown };
    return typeof code === "string" ? code : null;
  };

  const getCreateGymErrorDescription = (errorMessage: string): string => {
    const msg = errorMessage.toLowerCase();
    if (msg.includes("missing required") || msg.includes("fehlende")) return "Name, PLZ, E-Mail und Passwort sind Pflicht.";
    if (msg.includes("password") && (msg.includes("6") || msg.includes("least"))) return "Das Passwort muss mindestens 6 Zeichen lang sein.";
    if (msg.includes("already") && (msg.includes("registered") || msg.includes("exist") || msg.includes("e-mail"))) return "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.";
    if (msg.includes("invalid") && msg.includes("email")) return "Bitte gib eine gültige E-Mail-Adresse ein.";
    if (msg.includes("gym create") || msg.includes("halle")) return "Die Halle konnte nicht angelegt werden. Bitte prüfe die Angaben.";
    if (msg.includes("user create") || msg.includes("user create failed")) return "Der Hallen-Admin konnte nicht angelegt werden.";
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists")) return "Eine Halle oder E-Mail mit diesen Daten existiert bereits.";
    return errorMessage || "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.";
  };

  const prepareInviteForGym = (gym: Gym) => {
    setCreateMode("invite");
    setInviteForm((prev) => ({
      gymId: gym.id,
      email: openInvitesByGym[gym.id]?.email ?? prev.email,
    }));
    inviteSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyInviteUrlIfPossible = async (inviteUrl?: string) => {
    if (!inviteUrl || !navigator.clipboard) return false;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      return true;
    } catch {
      return false;
    }
  };

  const handleCreate = async () => {
    const trimmedPlz = form.postal_code.trim();
    if (!form.name.trim()) {
      toast({ title: "Fehlende Angaben", description: "Bitte gib einen Hallennamen ein.", variant: "destructive" });
      return;
    }
    if (!trimmedPlz) {
      toast({ title: "Fehlende Angaben", description: "Bitte gib die Postleitzahl der Halle ein.", variant: "destructive" });
      return;
    }
    if (!form.adminEmail.trim()) {
      toast({ title: "Fehlende Angaben", description: "Bitte gib die E-Mail-Adresse des Hallen-Admins ein.", variant: "destructive" });
      return;
    }
    if (!form.adminPassword) {
      toast({ title: "Fehlende Angaben", description: "Bitte gib ein Passwort für den Hallen-Admin ein.", variant: "destructive" });
      return;
    }
    if (form.adminPassword.length < 6) {
      toast({ title: "Ungültiges Passwort", description: "Das Passwort muss mindestens 6 Zeichen lang sein.", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) {
      toast({ title: "Ungültige E-Mail", description: "Bitte gib eine gültige E-Mail-Adresse ein.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("create-gym-admin", {
        body: {
          gym: {
            name: form.name.trim(),
            city: form.city.trim() || null,
            postal_code: trimmedPlz || null,
            address: form.address.trim() || null,
            website: form.website.trim() || null,
            logo_url: form.logo_url.trim() || null,
          },
          admin: {
            email: form.adminEmail.trim(),
            password: form.adminPassword,
          },
        },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) {
        toast({
          title: "Fehler beim Anlegen",
          description: getCreateGymErrorDescription(error.message),
          variant: "destructive",
        });
        return;
      }

      const remoteError = typeof data?.error === "string" ? data.error : (data?.error as { message?: string })?.message;
      if (remoteError) {
        toast({
          title: "Fehler beim Anlegen",
          description: getCreateGymErrorDescription(remoteError),
          variant: "destructive",
        });
        return;
      }

      await loadData();
      setForm({
        name: "",
        city: "",
        postal_code: "",
        address: "",
        website: "",
        logo_url: "",
        adminEmail: "",
        adminPassword: "",
      });
      toast({ title: "Halle erstellt", description: "Die Halle und der Hallen-Admin wurden angelegt." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Netzwerkfehler";
      toast({
        title: "Fehler",
        description: message.includes("fetch") || message.includes("network")
          ? "Verbindungsproblem. Bitte prüfe deine Internetverbindung."
          : message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleLegacyInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast({ title: "Ungültige E-Mail-Adresse", description: "Bitte gib eine gültige E-Mail-Adresse ein." });
      return;
    }

    setInviting(true);
    try {
      const shouldSkipEmail = allowInviteLinkPreview && skipEmail;
      const { data, error } = await inviteGymAdmin(inviteEmail, shouldSkipEmail);
      if (error) {
        const errorMessage = error.message || "";
        const errorCode = getErrorCode(error) || getErrorCode(data?.error);

        if (
          errorCode === "INVITE_ALREADY_EXISTS" ||
          errorMessage.includes("active invite already exists") ||
          errorMessage.includes("bereits eine aktive Einladung")
        ) {
          toast({
            title: "Einladung bereits vorhanden",
            description: `Für ${inviteEmail} existiert bereits eine aktive Einladung.`,
          });
        } else {
          toast({
            title: "Fehler",
            description: errorMessage || "Einladung konnte nicht gesendet werden.",
            variant: "destructive",
          });
        }
        return;
      }

      if (data?.invite_url && shouldSkipEmail && navigator.clipboard) {
        void navigator.clipboard.writeText(data.invite_url).catch(() => undefined);
      }

      toast({
        title: shouldSkipEmail ? "Test-Link erzeugt" : "Einladung gesendet",
        description: shouldSkipEmail
          ? `Für ${inviteEmail} wurde ein Test-Link erzeugt und in die Zwischenablage kopiert.`
          : `Eine Einladung wurde an ${inviteEmail} gesendet.`,
        variant: shouldSkipEmail ? "success" : "default",
      });
      setInviteEmail("");
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Einladung konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.gymId) {
      toast({ title: "Fehlende Halle", description: "Bitte wähle zuerst eine bestehende Halle aus." });
      return;
    }

    if (!inviteForm.email || !inviteForm.email.includes("@")) {
      toast({ title: "Ungültige E-Mail-Adresse", description: "Bitte gib eine gültige E-Mail-Adresse ein." });
      return;
    }

    if (hasActiveAdmin(inviteForm.gymId)) {
      toast({
        title: "Zugang bereits aktiv",
        description: "Für diese Halle ist bereits ein Hallenzugang aktiv.",
      });
      return;
    }

    setInviting(true);
    try {
      const shouldSkipEmail = allowInviteLinkPreview && skipEmail;
      const { data, error } = await inviteGymAdmin(inviteForm.gymId, inviteForm.email.trim(), shouldSkipEmail);
      if (error) {
        const errorCode = getErrorCode(error);
        const errorMessage = error.message || "";

        if (errorCode === "GYM_ADMIN_ALREADY_EXISTS") {
          toast({
            title: "Zugang bereits aktiv",
            description: "Für diese Halle ist bereits ein Hallenzugang aktiv.",
          });
        } else {
          toast({
            title: "Fehler",
            description: errorMessage || "Claim-Link konnte nicht gesendet werden.",
            variant: "destructive",
          });
        }
        return;
      }

      const copied = await copyInviteUrlIfPossible(data?.invite_url);
      await loadData();

      toast({
        title: shouldSkipEmail ? "Test-Link erzeugt" : (data?.email_sent ? "Claim-Link gesendet" : "Claim-Link erzeugt"),
        description: shouldSkipEmail
          ? `Für ${inviteForm.email} wurde ein Test-Link erzeugt${copied ? " und in die Zwischenablage kopiert." : "."}`
          : data?.email_sent
            ? `Der Claim-Link wurde an ${inviteForm.email} gesendet.`
            : `Der Claim-Link für ${inviteForm.email} wurde erzeugt${copied ? " und in die Zwischenablage kopiert." : "."}`,
        variant: shouldSkipEmail || !data?.email_sent ? "success" : "default",
      });

      setInviteForm((prev) => ({ ...prev, email: "" }));
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Claim-Link konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleLegacyAssignAdmin = async () => {
    if (!selectedGym || !selectedAdmin) {
      toast({ title: "Fehlende Auswahl", description: "Bitte Halle und Admin wählen." });
      return;
    }

    const { error: mappingError } = await createGymAdmin({
      gym_id: selectedGym,
      profile_id: selectedAdmin,
    });
    if (mappingError) {
      toast({ title: "Fehler", description: mappingError.message, variant: "destructive" });
      return;
    }

    const selectedProfile = profiles.find((profile) => profile.id === selectedAdmin);
    if (selectedProfile && selectedProfile.role !== "gym_admin") {
      const { error } = await updateProfile(selectedAdmin, { role: "gym_admin" });
      if (error) {
        console.warn("Gym admin role could not be synced", error);
      }
    }

    await loadData();
    setSelectedGym("");
    setSelectedAdmin("");
    toast({ title: "Zugeordnet", description: "Admin wurde der Halle zugeordnet." });
  };

  const handleAssignAdmin = async () => {
    if (!selectedGym || !selectedAdmin) {
      toast({ title: "Fehlende Auswahl", description: "Bitte Halle und Admin wählen." });
      return;
    }

    if (hasActiveAdmin(selectedGym)) {
      toast({
        title: "Zugang bereits aktiv",
        description: "Für diese Halle ist bereits ein Hallenzugang aktiv.",
      });
      return;
    }

    const { error: mappingError } = await createGymAdmin({
      gym_id: selectedGym,
      profile_id: selectedAdmin,
    });
    if (mappingError) {
      toast({ title: "Fehler", description: mappingError.message, variant: "destructive" });
      return;
    }

    const selectedProfile = profiles.find((profile) => profile.id === selectedAdmin);
    if (selectedProfile && selectedProfile.role !== "gym_admin") {
      const { error } = await updateProfile(selectedAdmin, { role: "gym_admin" });
      if (error) {
        console.warn("Gym admin role could not be synced", error);
      }
    }

    await loadData();
    setSelectedGym("");
    setSelectedAdmin("");
    toast({ title: "Zugeordnet", description: "Admin wurde der Halle zugeordnet." });
  };

  const handleEdit = (gym: Gym) => {
    setEditingGym(gym);
    setEditForm({
      name: gym.name,
      city: gym.city ?? "",
      postal_code: gym.postal_code ?? "",
      address: gym.address ?? "",
      website: gym.website ?? "",
      logo_url: gym.logo_url ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingGym) return;
    const { data, error } = await updateGym(editingGym.id, {
      name: editForm.name,
      city: editForm.city || null,
      postal_code: editForm.postal_code || null,
      address: editForm.address || null,
      website: editForm.website || null,
      logo_url: editForm.logo_url || null,
    });
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    if (data) {
      setGyms((prev) => prev.map((gym) => (gym.id === data.id ? data : gym)));
      setEditingGym(null);
      toast({ title: "Gespeichert", description: "Hallendaten wurden aktualisiert." });
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    const { error } = await archiveGym(archiveTarget.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    await loadData();
    setArchiveTarget(null);
    toast({ title: "Archiviert", description: "Die Halle und ihre Hallen-Admins wurden archiviert." });
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    const { error } = await restoreGym(restoreTarget.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    await loadData();
    setRestoreTarget(null);
    toast({ title: "Wiederhergestellt", description: "Die Halle ist wieder aktiv." });
  };

  const renderLegacyGymCard = (gym: Gym, archived: boolean) => {
    const admins = (adminsByGym[gym.id] ?? [])
      .map((adminId) => profiles.find((profile) => profile.id === adminId))
      .filter((profile): profile is Profile => Boolean(profile))
      .map((profile) => {
        const label = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email || profile.id;
        return profile.archived_at ? `${label} (archiviert)` : label;
      });

    return (
      <Card
        key={gym.id}
        className="p-4 md:p-5 border-2 border-border/60 hover:border-primary/50 transition-all hover:shadow-lg space-y-3 md:space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <div className="font-semibold text-primary text-base md:text-lg break-words">{gym.name}</div>
              {archived ? <Badge variant="outline">Archiviert</Badge> : null}
            </div>
            <div className="text-sm text-muted-foreground">
              {[gym.postal_code, gym.city].filter(Boolean).join(" ")}
            </div>
            {gym.address ? <div className="text-xs text-muted-foreground mt-1 break-words">{gym.address}</div> : null}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {gym.logo_url ? (
              <div className="hidden sm:block h-12 w-12 rounded-lg border border-border/60 overflow-hidden">
                <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-contain" />
              </div>
            ) : null}
            {!archived ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(gym)}
                  className="h-9 w-9 p-0"
                  aria-label={`Halle ${gym.name} bearbeiten`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setArchiveTarget(gym)}
                  className="h-9 w-9 p-0 text-amber-700 hover:text-amber-700 hover:bg-amber-500/10"
                  aria-label={`Halle ${gym.name} archivieren`}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRestoreTarget(gym)}
                className="h-9 gap-2 px-3"
                aria-label={`Halle ${gym.name} wiederherstellen`}
              >
                <RotateCcw className="h-4 w-4" />
                Restore
              </Button>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 space-y-2 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Admins:</span> {admins.length ? admins.join(", ") : "Keine"}
          </div>
          {archived ? (
            <>
              <div>
                <span className="font-medium">Archiviert am:</span> {formatDate(gym.archived_at)}
              </div>
              {gym.archive_reason ? (
                <div>
                  <span className="font-medium">Grund:</span> {gym.archive_reason}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </Card>
    );
  };

  const renderStatusBadge = (gym: Gym) => {
    if (gym.archived_at) {
      return <Badge variant="outline">Archiviert</Badge>;
    }

    if (hasActiveAdmin(gym.id)) {
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Zugang aktiv</Badge>;
    }

    if (openInvitesByGym[gym.id]) {
      return <Badge variant="secondary">Einladung offen</Badge>;
    }

    return <Badge variant="outline">Kein Zugang</Badge>;
  };

  const renderGymCard = (gym: Gym, archived: boolean) => {
    const gymProfiles = gymProfilesByGym[gym.id] ?? [];
    const activeAdminProfiles = gymProfiles.filter((profile) => !profile.archived_at);
    const activeInvite = openInvitesByGym[gym.id] ?? null;
    const adminLabels = gymProfiles.map(formatProfileLabel);

    return (
      <Card
        key={gym.id}
        className="p-4 md:p-5 border-2 border-border/60 hover:border-primary/50 transition-all hover:shadow-lg space-y-3 md:space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <div className="font-semibold text-primary text-base md:text-lg break-words">{gym.name}</div>
              {renderStatusBadge(gym)}
            </div>
            <div className="text-sm text-muted-foreground">
              {[gym.postal_code, gym.city].filter(Boolean).join(" ")}
            </div>
            {gym.address ? <div className="text-xs text-muted-foreground mt-1 break-words">{gym.address}</div> : null}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {gym.logo_url ? (
              <div className="hidden sm:block h-12 w-12 rounded-lg border border-border/60 overflow-hidden">
                <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-contain" />
              </div>
            ) : null}
            {!archived && activeAdminProfiles.length === 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => prepareInviteForGym(gym)}
                className="h-9 gap-2 px-3"
                aria-label={`Claim-Link fuer ${gym.name} senden`}
              >
                <Mail className="h-4 w-4" />
                {activeInvite ? "Neu senden" : "Claim-Link"}
              </Button>
            ) : null}
            {!archived ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(gym)}
                  className="h-9 w-9 p-0"
                  aria-label={`Halle ${gym.name} bearbeiten`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setArchiveTarget(gym)}
                  className="h-9 w-9 p-0 text-amber-700 hover:text-amber-700 hover:bg-amber-500/10"
                  aria-label={`Halle ${gym.name} archivieren`}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRestoreTarget(gym)}
                className="h-9 gap-2 px-3"
                aria-label={`Halle ${gym.name} wiederherstellen`}
              >
                <RotateCcw className="h-4 w-4" />
                Restore
              </Button>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 space-y-2 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Admins:</span> {adminLabels.length ? adminLabels.join(", ") : "Keine"}
          </div>
          {!archived && activeInvite && activeAdminProfiles.length === 0 ? (
            <>
              <div>
                <span className="font-medium">Offene Einladung:</span> {activeInvite.email}
              </div>
              <div>
                <span className="font-medium">Gueltig bis:</span> {formatDate(activeInvite.expires_at)}
              </div>
            </>
          ) : null}
          {!archived && !activeInvite && activeAdminProfiles.length === 0 ? (
            <div>
              <span className="font-medium">Status:</span> Noch kein Hallenzugang eingerichtet.
            </div>
          ) : null}
          {archived ? (
            <>
              <div>
                <span className="font-medium">Archiviert am:</span> {formatDate(gym.archived_at)}
              </div>
              {gym.archive_reason ? (
                <div>
                  <span className="font-medium">Grund:</span> {gym.archive_reason}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </Card>
    );
  };

  void handleLegacyInvite;
  void handleLegacyAssignAdmin;
  void renderLegacyGymCard;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/90 shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              backgroundRepeat: "repeat",
            }}
          />
        </div>
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-6 w-6 md:h-8 md:w-8 text-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-white break-words">Hallenverwaltung</h1>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs flex-shrink-0">
                  Liga
                </Badge>
              </div>
              <p className="text-white/90 text-xs md:text-sm lg:text-base break-words">
                {activeGyms.length} aktive Hallen · {archivedGyms.length} archiviert
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 md:p-6 border-2 border-border/60 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-primary flex-shrink-0" />
          <h2 className="text-base md:text-lg font-headline text-primary">Hallenzugang einrichten</h2>
        </div>
        <Tabs value={createMode} onValueChange={(value) => setCreateMode(value as "direct" | "invite")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite" className="text-xs md:text-sm">Claim-Link senden</TabsTrigger>
            <TabsTrigger value="direct" className="text-xs md:text-sm">Notfall: Direkt anlegen</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4 mt-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gymName">Hallenname</Label>
                <Input id="gymName" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymCity">Stadt</Label>
                <Input id="gymCity" value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymPlz">PLZ</Label>
                <Input id="gymPlz" value={form.postal_code} onChange={(event) => setForm((prev) => ({ ...prev, postal_code: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="gymAddress">Adresse</Label>
                <Input id="gymAddress" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymWebsite">Webseite</Label>
                <Input id="gymWebsite" value={form.website} onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymLogo">Logo URL</Label>
                <Input id="gymLogo" value={form.logo_url} onChange={(event) => setForm((prev) => ({ ...prev, logo_url: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin E-Mail</Label>
                <Input id="adminEmail" type="email" value={form.adminEmail} onChange={(event) => setForm((prev) => ({ ...prev, adminEmail: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Admin Passwort</Label>
                <Input id="adminPassword" type="password" value={form.adminPassword} onChange={(event) => setForm((prev) => ({ ...prev, adminPassword: event.target.value }))} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Erstelle..." : "Halle anlegen"}
            </Button>
          </TabsContent>

          <TabsContent value="invite" className="space-y-4 mt-4">
            <div ref={inviteSectionRef} className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inviteGym">Bestehende Halle</Label>
                <select
                  id="inviteGym"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={inviteForm.gymId}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, gymId: event.target.value }))}
                >
                  <option value="">Bitte wählen</option>
                  {claimableGyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">E-Mail-Adresse der Halle</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="halle@example.com"
                value={inviteForm.email}
                onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Die Halle erhält einen Link zur Registrierung und kann ihre Daten selbst hinterlegen.
              </p>
            </div>
            {inviteForm.gymId && openInvitesByGym[inviteForm.gymId] ? (
              <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Aktuell offene Einladung an {openInvitesByGym[inviteForm.gymId].email}, gültig bis {formatDate(openInvitesByGym[inviteForm.gymId].expires_at)}.
              </div>
            ) : null}
            {allowInviteLinkPreview ? (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="skipEmail"
                  checked={skipEmail}
                  onChange={(event) => setSkipEmail(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="skipEmail" className="cursor-pointer text-xs text-muted-foreground">
                  E-Mail-Versand überspringen und Test-Link lokal erzeugen
                </Label>
              </div>
            ) : null}
            <Button onClick={handleInvite} disabled={inviting || claimableGyms.length === 0}>
              <Mail className="h-4 w-4 mr-2" />
              {inviting ? "Erstelle..." : allowInviteLinkPreview && skipEmail ? "Link generieren" : "Claim-Link senden"}
            </Button>
            {claimableGyms.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Für alle aktiven Hallen ist bereits ein Hallenzugang eingerichtet.
              </p>
            ) : null}
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-6 border-2 border-border/60 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-secondary" />
          <h2 className="text-lg font-semibold text-primary">Fallback: Bestehenden Account zu Halle zuordnen</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Nur für bestehende Accounts ohne aktiven Hallenzugang. Pro Halle ist aktuell genau ein primärer Zugang vorgesehen.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="assignGym">Halle</Label>
            <select
              id="assignGym"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedGym}
              onChange={(event) => setSelectedGym(event.target.value)}
            >
              <option value="">Bitte wählen</option>
              {claimableGyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignAdmin">Admin</Label>
            <select
              id="assignAdmin"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedAdmin}
              onChange={(event) => setSelectedAdmin(event.target.value)}
            >
              <option value="">Bitte wählen</option>
              {activeProfiles
                .filter((profile) => profile.role !== "league_admin")
                .filter((profile) => !selectedGym || !(adminsByGym[selectedGym] ?? []).includes(profile.id))
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.email ?? profile.id}
                    {profile.role === "gym_admin" ? " (bereits Admin)" : ""}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <Button onClick={handleAssignAdmin} disabled={claimableGyms.length === 0}>Zuordnen</Button>
      </Card>

      <div className="space-y-4">
        <h2 className="text-base md:text-lg font-semibold text-primary">Aktive Hallen ({activeGyms.length})</h2>
        {activeGyms.length > 0 ? (
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
            {activeGyms.map((gym) => renderGymCard(gym, false))}
          </div>
        ) : (
          <Card className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">Noch keine aktiven Hallen vorhanden.</p>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-base md:text-lg font-semibold text-primary">Archiv ({archivedGyms.length})</h2>
        {archivedGyms.length > 0 ? (
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
            {archivedGyms.map((gym) => renderGymCard(gym, true))}
          </div>
        ) : (
          <Card className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">Keine archivierten Hallen vorhanden.</p>
          </Card>
        )}
      </div>

      <Dialog open={editingGym !== null} onOpenChange={(open) => !open && setEditingGym(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Halle bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Hallenname</Label>
                <Input id="edit-name" value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">Stadt</Label>
                <Input id="edit-city" value={editForm.city} onChange={(event) => setEditForm((prev) => ({ ...prev, city: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-postal_code">PLZ</Label>
                <Input id="edit-postal_code" value={editForm.postal_code} onChange={(event) => setEditForm((prev) => ({ ...prev, postal_code: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-address">Adresse</Label>
                <Input id="edit-address" value={editForm.address} onChange={(event) => setEditForm((prev) => ({ ...prev, address: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-website">Webseite</Label>
                <Input id="edit-website" value={editForm.website} onChange={(event) => setEditForm((prev) => ({ ...prev, website: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-logo">Logo URL</Label>
                <Input id="edit-logo" value={editForm.logo_url} onChange={(event) => setEditForm((prev) => ({ ...prev, logo_url: event.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-wrap gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditingGym(null)} className="min-w-0 flex-1 sm:flex-initial">
              Abbrechen
            </Button>
            <Button onClick={handleSaveEdit} className="min-w-0 flex-1 sm:flex-initial">
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Halle archivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.name} verschwindet aus allen aktiven Ansichten. Zugeordnete Hallen-Admins werden ebenfalls archiviert, Daten bleiben aber erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700">
              Archivieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreTarget !== null} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Halle wiederherstellen?</AlertDialogTitle>
            <AlertDialogDescription>
              {restoreTarget?.name} und ihre Hallen-Admins werden wieder aktiv geschaltet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="w-full sm:w-auto">
              Wiederherstellen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeagueGyms;
