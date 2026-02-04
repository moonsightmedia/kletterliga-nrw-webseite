import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGymAdminsByProfile, getGym, updateGym } from "@/services/appApi";
import type { Gym } from "@/services/appTypes";

const GymProfile = () => {
  const { profile } = useAuth();
  const [gymId, setGymId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    website: "",
  });

  useEffect(() => {
    if (!profile?.id) return;
    listGymAdminsByProfile(profile.id).then(({ data }) => {
      const firstGym = data?.[0]?.gym_id ?? null;
      setGymId(firstGym);
      if (firstGym) {
        getGym(firstGym).then(({ data: gymData, error }) => {
          setLoading(false);
          if (error || !gymData) {
            toast({ title: "Fehler", description: "Hallen-Daten konnten nicht geladen werden." });
            return;
          }
          setForm({
            name: gymData.name ?? "",
            city: gymData.city ?? "",
            address: gymData.address ?? "",
            website: gymData.website ?? "",
          });
        });
      } else {
        setLoading(false);
      }
    });
  }, [profile?.id]);

  const handleSave = async () => {
    if (!gymId) return;
    setSaving(true);
    const { data, error } = await updateGym(gymId, {
      name: form.name || null,
      city: form.city || null,
      address: form.address || null,
      website: form.website || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data) {
      toast({ title: "Gespeichert", description: "Hallen-Daten wurden aktualisiert." });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Lade...</div>;
  }

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">Keine Halle zugewiesen.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Hallenprofil</h1>
        <p className="text-sm text-muted-foreground mt-2">Daten deiner Halle bearbeiten.</p>
      </div>
      <Card className="p-5 border-border/60 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Kletterhalle NRW"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Stadt</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Düsseldorf"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Musterstraße 12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Webseite</Label>
          <Input
            id="website"
            type="url"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
            <span className="skew-x-6">{saving ? "Speichern..." : "Speichern"}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default GymProfile;
