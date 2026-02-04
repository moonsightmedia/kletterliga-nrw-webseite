import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { listAdminSettings, upsertAdminSettings } from "@/services/appApi";

const LeagueSettings = () => {
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState({
    banner: "",
    finale_enabled: "false",
  });

  useEffect(() => {
    listAdminSettings().then(({ data }) => {
      const current = data?.[0];
      if (!current) return;
      setSettingsId(current.id);
      setForm({
        banner: (current.class_labels?.banner as string) ?? "",
        finale_enabled: current.finale_enabled ? "true" : "false",
      });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      id: settingsId ?? undefined,
      class_labels: { banner: form.banner },
      finale_enabled: form.finale_enabled === "true",
    };
    const { data, error } = await upsertAdminSettings(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data?.id) setSettingsId(data.id);
    toast({ title: "Gespeichert", description: "Einstellungen aktualisiert." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Liga-Einstellungen</h1>
        <p className="text-sm text-muted-foreground mt-2">Allgemeine Einstellungen und Hinweise.</p>
      </div>
      <Card className="p-5 border-border/60 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="banner">Hinweisbanner (Text)</Label>
          <Input
            id="banner"
            placeholder="z. B. Finale-Anmeldung ab 01.09."
            value={form.banner}
            onChange={(e) => setForm({ ...form, banner: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finaleEnabled">Finale freigeschaltet</Label>
          <select
            id="finaleEnabled"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.finale_enabled}
            onChange={(e) => setForm({ ...form, finale_enabled: e.target.value })}
          >
            <option value="false">Nein</option>
            <option value="true">Ja</option>
          </select>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <span className="skew-x-6">{saving ? "Speichern..." : "Speichern"}</span>
        </Button>
      </Card>
    </div>
  );
};

export default LeagueSettings;
