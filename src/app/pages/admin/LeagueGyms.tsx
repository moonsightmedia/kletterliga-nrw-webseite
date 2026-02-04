import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { createGymAdmin, listGymAdminsByGym, listGyms, listProfiles, updateGym } from "@/services/appApi";
import type { Profile } from "@/services/appTypes";
import { supabase } from "@/services/supabase";
import type { Gym } from "@/services/appTypes";

const LeagueGyms = () => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [adminsByGym, setAdminsByGym] = useState<Record<string, string[]>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedGym, setSelectedGym] = useState<string>("");
  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    website: "",
    logo_url: "",
    adminEmail: "",
    adminPassword: "",
  });

  useEffect(() => {
    listGyms().then(({ data }) => setGyms(data ?? []));
    listProfiles().then(({ data }) => setProfiles(data ?? []));
  }, []);

  useEffect(() => {
    const loadAdmins = async () => {
      const mapping: Record<string, string[]> = {};
      await Promise.all(
        gyms.map(async (gym) => {
          const { data } = await listGymAdminsByGym(gym.id);
          mapping[gym.id] = (data ?? []).map((item) => item.profile_id);
        })
      );
      setAdminsByGym(mapping);
    };
    if (gyms.length) {
      loadAdmins();
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
      setGyms((prev) => [data.gym as Gym, ...prev]);
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

  const handleAssignAdmin = async () => {
    if (!selectedGym || !selectedAdmin) {
      toast({ title: "Fehlende Auswahl", description: "Bitte Halle und Admin wählen." });
      return;
    }
    const { error } = await createGymAdmin({
      gym_id: selectedGym,
      profile_id: selectedAdmin,
    });
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    setAdminsByGym((prev) => ({
      ...prev,
      [selectedGym]: [...(prev[selectedGym] ?? []), selectedAdmin],
    }));
    toast({ title: "Zugeordnet", description: "Admin wurde der Halle zugeordnet." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl text-primary">Hallenverwaltung</h1>
          <p className="text-sm text-muted-foreground mt-2">Alle Partnerhallen im Überblick.</p>
        </div>
      </div>

      <Card className="p-4 border-border/60 space-y-4">
        <div className="text-xs uppercase tracking-widest text-secondary">Neue Halle + Login</div>
        <div className="grid gap-4 md:grid-cols-2">
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
        <Button onClick={handleCreate} disabled={creating}>
          <span className="skew-x-6">{creating ? "Erstelle..." : "Halle anlegen"}</span>
        </Button>
      </Card>

      <Card className="p-4 border-border/60 space-y-4">
        <div className="text-xs uppercase tracking-widest text-secondary">Admin zu Halle zuordnen</div>
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
                .filter((p) => p.role === "gym_admin")
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.email ?? profile.id}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <Button onClick={handleAssignAdmin}>
          <span className="skew-x-6">Zuordnen</span>
        </Button>
      </Card>

      <div className="space-y-3">
        {gyms.map((gym) => {
          const admins = (adminsByGym[gym.id] ?? []).map(
            (adminId) => profiles.find((p) => p.id === adminId)?.email ?? adminId
          );
          return (
            <Card key={gym.id} className="p-4 border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-primary">{gym.name}</div>
                  <div className="text-xs text-muted-foreground">{gym.city}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedGym(gym.id)}>
                  <span className="skew-x-6">Auswählen</span>
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="Name"
                  defaultValue={gym.name}
                  onBlur={(e) => updateGym(gym.id, { name: e.target.value })}
                />
                <Input
                  placeholder="Stadt"
                  defaultValue={gym.city ?? ""}
                  onBlur={(e) => updateGym(gym.id, { city: e.target.value })}
                />
                <Input
                  placeholder="Adresse"
                  defaultValue={gym.address ?? ""}
                  onBlur={(e) => updateGym(gym.id, { address: e.target.value })}
                />
                <Input
                  placeholder="Webseite"
                  defaultValue={gym.website ?? ""}
                  onBlur={(e) => updateGym(gym.id, { website: e.target.value })}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Admins: {admins.length ? admins.join(", ") : "Keine"}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default LeagueGyms;
