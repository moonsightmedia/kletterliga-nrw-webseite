import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { createGymAdmin, listGymAdminsByGym, listGyms, listProfiles, updateGym, deleteGym, inviteGymAdmin, updateProfile } from "@/services/appApi";
import type { Profile } from "@/services/appTypes";
import { supabase } from "@/services/supabase";
import type { Gym } from "@/services/appTypes";
import { Building2, Plus, UserPlus, Edit2, Trash2, Mail } from "lucide-react";

const LeagueGyms = () => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [adminsByGym, setAdminsByGym] = useState<Record<string, string[]>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedGym, setSelectedGym] = useState<string>("");
  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editingGym, setEditingGym] = useState<Gym | null>(null);
  const [deletingGym, setDeletingGym] = useState<Gym | null>(null);
  const [createMode, setCreateMode] = useState<"direct" | "invite">("direct");
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    website: "",
    logo_url: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [skipEmail, setSkipEmail] = useState(false); // Für Testing: E-Mail-Versand überspringen
  const [editForm, setEditForm] = useState({
    name: "",
    city: "",
    address: "",
    website: "",
    logo_url: "",
  });

  useEffect(() => {
    listGyms().then(({ data }) => setGyms(data ?? []));
    listProfiles().then(({ data }) => setProfiles(data ?? []));
  }, []);

  const loadAdmins = async (gymsToLoad: Gym[] = gyms) => {
    if (gymsToLoad.length === 0) return;
    const mapping: Record<string, string[]> = {};
    await Promise.all(
      gymsToLoad.map(async (gym) => {
        const { data, error } = await listGymAdminsByGym(gym.id);
        if (error) {
          console.error(`Error loading admins for gym ${gym.id}:`, error);
          mapping[gym.id] = [];
        } else {
          mapping[gym.id] = (data ?? []).map((item) => item.profile_id);
        }
      })
    );
    setAdminsByGym(mapping);
  };

  useEffect(() => {
    if (gyms.length > 0) {
      loadAdmins(gyms);
    }
  }, [gyms]);

  const handleCreate = async () => {
    if (!form.name || !form.adminEmail || !form.adminPassword) {
      toast({ title: "Fehlende Angaben", description: "Name, E-Mail und Passwort sind Pflicht." });
      return;
    }
    setCreating(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("create-gym-admin", {
      body: {
        gym: {
          name: form.name,
          city: form.city || null,
          address: form.address || null,
          website: form.website || null,
          logo_url: form.logo_url || null,
        },
        admin: {
          email: form.adminEmail,
          password: form.adminPassword,
        },
      },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data?.gym) {
      const newGym = data.gym as Gym;
      setGyms((prev) => {
        const updated = [newGym, ...prev];
        // Reload admins immediately with updated gyms list
        loadAdmins(updated);
        return updated;
      });
    }
    setForm({
      name: "",
      city: "",
      address: "",
      website: "",
      logo_url: "",
      adminEmail: "",
      adminPassword: "",
    });
    toast({ title: "Halle erstellt", description: "Der Hallen-Admin kann sich jetzt anmelden." });
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast({ title: "Ungültige E-Mail", description: "Bitte gib eine gültige E-Mail-Adresse ein." });
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await inviteGymAdmin(inviteEmail, skipEmail);
      if (error) {
        console.error("Invite error:", error);
        
        // Prüfe auf spezifische Fehlermeldungen
        const errorMessage = error.message || "";
        const errorCode = (error as any)?.code || (data?.error as any)?.code;
        
        if (errorCode === "INVITE_ALREADY_EXISTS" ||
            errorMessage.includes("active invite already exists") || 
            errorMessage.includes("bereits eine aktive Einladung") ||
            errorMessage.includes("Einladung bereits vorhanden")) {
          toast({ 
            title: "Einladung bereits vorhanden", 
            description: `Für ${inviteEmail} existiert bereits eine aktive Einladung. Die E-Mail wurde bereits gesendet.`,
            variant: "default",
          });
        } else if (errorMessage.includes("Valid email address is required") ||
                   errorMessage.includes("gültige E-Mail")) {
          toast({ 
            title: "Ungültige E-Mail-Adresse", 
            description: "Bitte gib eine gültige E-Mail-Adresse ein." 
          });
        } else {
          toast({ 
            title: "Fehler", 
            description: errorMessage || "Einladung konnte nicht gesendet werden. Bitte versuche es erneut.",
            variant: "destructive",
          });
        }
        return;
      }
      if (data?.error) {
        console.error("Invite data error:", data.error);
        
        // Prüfe auf spezifische Fehlermeldungen im data.error
        const errorData = typeof data.error === "string" 
          ? { message: data.error } 
          : data.error || {};
        const errorMessage = errorData.message || errorData.toString() || "";
        const errorCode = errorData.code;
        
        if (errorCode === "INVITE_ALREADY_EXISTS" ||
            errorMessage.includes("active invite already exists") || 
            errorMessage.includes("bereits eine aktive Einladung") ||
            errorMessage.includes("Einladung bereits vorhanden")) {
          toast({ 
            title: "Einladung bereits vorhanden", 
            description: `Für ${inviteEmail} existiert bereits eine aktive Einladung. Die E-Mail wurde bereits gesendet.`,
            variant: "default",
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
      // Zeige den Link an, auch wenn E-Mail-Versand fehlgeschlagen ist
      const inviteUrl = data?.invite_url;
      const emailSent = data?.email_sent !== false; // Default to true if not specified
      const savedEmail = inviteEmail; // Speichere E-Mail vor dem Löschen
      
      setInviteEmail("");
      
      if (inviteUrl) {
        // Kopiere Link in Zwischenablage
        if (navigator.clipboard) {
          navigator.clipboard.writeText(inviteUrl).catch(() => {
            // Ignoriere Fehler beim Kopieren
          });
        }
        
        toast({
          title: emailSent ? "Einladung gesendet" : "Einladung erstellt",
          description: emailSent 
            ? `Eine E-Mail wurde an ${savedEmail} gesendet. Link: ${inviteUrl}`
            : `Einladung erstellt. Link wurde kopiert: ${inviteUrl}`,
          duration: 10000, // Länger anzeigen damit Link sichtbar ist
        });
        
        // Zeige Link auch in Konsole für einfaches Kopieren
        console.log("📧 Einladungslink:", inviteUrl);
        console.log("📋 Link wurde in die Zwischenablage kopiert");
      } else {
        toast({
          title: "Einladung gesendet",
          description: `Eine E-Mail wurde an ${savedEmail} gesendet. Die Halle kann sich jetzt registrieren.`,
        });
      }
    } catch (err) {
      console.error("Invite exception:", err);
      toast({ 
        title: "Fehler", 
        description: err instanceof Error ? err.message : "Einladung konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleAssignAdmin = async () => {
    if (!selectedGym || !selectedAdmin) {
      toast({ title: "Fehlende Auswahl", description: "Bitte Halle und Admin wählen." });
      return;
    }
    
    // Erstelle gym_admins Eintrag
    const { error: gymAdminError } = await createGymAdmin({
      gym_id: selectedGym,
      profile_id: selectedAdmin,
    });
    if (gymAdminError) {
      toast({ title: "Fehler", description: gymAdminError.message });
      return;
    }
    
    // Setze die Rolle automatisch auf gym_admin, falls sie es noch nicht ist
    const selectedProfile = profiles.find((p) => p.id === selectedAdmin);
    if (selectedProfile && selectedProfile.role !== "gym_admin") {
      const { error: roleError } = await updateProfile(selectedAdmin, { role: "gym_admin" });
      if (roleError) {
        console.warn("Rolle konnte nicht automatisch gesetzt werden:", roleError);
        // Fortfahren, auch wenn die Rolle nicht gesetzt werden konnte
      } else {
        // Aktualisiere das lokale Profile-State
        setProfiles((prev) =>
          prev.map((p) => (p.id === selectedAdmin ? { ...p, role: "gym_admin" } : p))
        );
      }
    }
    
    setAdminsByGym((prev) => ({
      ...prev,
      [selectedGym]: [...(prev[selectedGym] ?? []), selectedAdmin],
    }));
    setSelectedGym("");
    setSelectedAdmin("");
    toast({ title: "Zugeordnet", description: "Admin wurde der Halle zugeordnet." });
    // Reload admins to ensure consistency
    loadAdmins(gyms);
    // Reload profiles to reflect role changes
    listProfiles().then(({ data }) => setProfiles(data ?? []));
  };

  const handleEdit = (gym: Gym) => {
    setEditingGym(gym);
    setEditForm({
      name: gym.name,
      city: gym.city ?? "",
      address: gym.address ?? "",
      website: gym.website ?? "",
      logo_url: gym.logo_url ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingGym) return;
    const { data, error } = await updateGym(editingGym.id, editForm);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data) {
      setGyms((prev) => prev.map((gym) => (gym.id === editingGym.id ? data : gym)));
      setEditingGym(null);
      toast({ title: "Gespeichert", description: "Halle wurde aktualisiert." });
    }
  };

  const handleDelete = async () => {
    if (!deletingGym) return;
    const { error } = await deleteGym(deletingGym.id);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    setGyms((prev) => {
      const updated = prev.filter((gym) => gym.id !== deletingGym.id);
      // Reload admins immediately with updated gyms list
      loadAdmins(updated);
      return updated;
    });
    setDeletingGym(null);
    toast({ title: "Gelöscht", description: "Halle wurde gelöscht." });
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/90 shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
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
                Alle Partnerhallen im Überblick · {gyms.length} {gyms.length === 1 ? 'Halle' : 'Hallen'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Neue Halle erstellen */}
      <Card className="p-4 md:p-6 border-2 border-border/60 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-primary flex-shrink-0" />
          <h2 className="text-base md:text-lg font-headline text-primary">Neue Halle erstellen</h2>
        </div>
        <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as "direct" | "invite")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct" className="text-xs md:text-sm">Direkt erstellen</TabsTrigger>
            <TabsTrigger value="invite" className="text-xs md:text-sm">Per E-Mail einladen</TabsTrigger>
          </TabsList>
          <TabsContent value="direct" className="space-y-4 mt-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gymName">Hallenname</Label>
                <Input
                  id="gymName"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymCity">Stadt</Label>
                <Input
                  id="gymCity"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="gymAddress">Adresse</Label>
                <Input
                  id="gymAddress"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymWebsite">Webseite</Label>
                <Input
                  id="gymWebsite"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymLogo">Logo URL</Label>
                <Input
                  id="gymLogo"
                  value={form.logo_url}
                  onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin E-Mail</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Admin Passwort</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full md:w-auto touch-manipulation">
              <span className="skew-x-6">{creating ? "Erstelle..." : "Halle anlegen"}</span>
            </Button>
          </TabsContent>
          <TabsContent value="invite" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">E-Mail-Adresse der Halle</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="halle@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Die Halle erhält eine E-Mail mit einem Link zur Registrierung. Dort kann sie ihre Daten und ein Passwort eingeben.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="skipEmail"
                checked={skipEmail}
                onChange={(e) => setSkipEmail(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="skipEmail" className="text-xs text-muted-foreground cursor-pointer">
                E-Mail-Versand überspringen (nur Link generieren - für Testing)
              </Label>
            </div>
            <Button onClick={handleInvite} disabled={inviting} className="w-full md:w-auto touch-manipulation">
              <Mail className="h-4 w-4 mr-2" />
              <span className="skew-x-6">{inviting ? "Erstelle..." : (skipEmail ? "Link generieren" : "Einladung senden")}</span>
            </Button>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Admin zuordnen */}
      <Card className="p-6 border-2 border-border/60 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-secondary" />
          <h2 className="text-lg font-semibold text-primary">Admin zu Halle zuordnen</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="assignGym">Halle</Label>
            <select
              id="assignGym"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedGym}
              onChange={(e) => setSelectedGym(e.target.value)}
            >
              <option value="">Bitte wählen</option>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignAdmin">Admin (Gym)</Label>
            <select
              id="assignAdmin"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
            >
              <option value="">Bitte wählen</option>
              {profiles
                .filter((p) => {
                  // Zeige alle Benutzer außer league_admins
                  if (p.role === "league_admin") return false;
                  // Optional: Filtere bereits zugewiesene Admins für die ausgewählte Halle heraus
                  if (selectedGym) {
                    const isAlreadyAdminForThisGym = (adminsByGym[selectedGym] ?? []).includes(p.id);
                    return !isAlreadyAdminForThisGym;
                  }
                  return true;
                })
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.email ?? profile.id}
                    {profile.role === "gym_admin" ? " (bereits Admin)" : ""}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <Button onClick={handleAssignAdmin} className="touch-manipulation">
          <span className="skew-x-6">Zuordnen</span>
        </Button>
      </Card>

      {/* Hallen-Liste */}
      <div className="space-y-4">
        <h2 className="text-base md:text-lg font-semibold text-primary">Alle Hallen</h2>
        <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
          {gyms.map((gym) => {
            const admins = (adminsByGym[gym.id] ?? []).map(
              (adminId) => profiles.find((p) => p.id === adminId)?.email ?? adminId
            );
            return (
              <Card key={gym.id} className="p-4 md:p-5 border-2 border-border/60 hover:border-primary/50 transition-all hover:shadow-lg space-y-3 md:space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-primary text-base md:text-lg mb-1 break-words">{gym.name}</div>
                    <div className="text-sm text-muted-foreground">{gym.city}</div>
                    {gym.address && (
                      <div className="text-xs text-muted-foreground mt-1 break-words">{gym.address}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                    {gym.logo_url && (
                      <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg border border-border/60 overflow-hidden flex-shrink-0 hidden sm:block">
                        <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-contain" />
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(gym)}
                      className="h-9 w-9 md:h-9 md:w-9 p-0 touch-manipulation"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingGym(gym)}
                      className="h-9 w-9 md:h-9 md:w-9 p-0 text-destructive hover:text-destructive touch-manipulation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/60">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Admins:</span> {admins.length ? admins.join(", ") : "Keine"}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Bearbeiten-Dialog */}
      <Dialog open={editingGym !== null} onOpenChange={(open) => !open && setEditingGym(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Halle bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Hallenname</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">Stadt</Label>
                <Input
                  id="edit-city"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-address">Adresse</Label>
                <Input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-website">Webseite</Label>
                <Input
                  id="edit-website"
                  type="url"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-logo">Logo URL</Label>
                <Input
                  id="edit-logo"
                  type="url"
                  value={editForm.logo_url}
                  onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGym(null)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveEdit}>
              <span className="skew-x-6">Speichern</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Löschen-Dialog */}
      <AlertDialog open={deletingGym !== null} onOpenChange={(open) => !open && setDeletingGym(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Halle löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du die Halle "{deletingGym?.name}" wirklich löschen? Alle zugehörigen Routen, Codes und Ergebnisse werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto touch-manipulation">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto touch-manipulation">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeagueGyms;
