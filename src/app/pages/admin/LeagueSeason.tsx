import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { listAdminSettings, upsertAdminSettings } from "@/services/appApi";

const LeagueSeason = () => {
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState({
    season_year: "",
    qualification_start: "",
    qualification_end: "",
    stage_months: "Mai, Juni, Juli, August",
    age_u16_max: "15",
    age_u40_min: "40",
    class_labels: "U16-m,U16-w,Ü16-m,Ü16-w,Ü40-m,Ü40-w",
    finale_enabled: "false",
  });

  useEffect(() => {
    listAdminSettings().then(({ data }) => {
      const current = data?.[0];
      if (!current) return;
      setSettingsId(current.id);
      setForm({
        season_year: current.season_year ?? "",
        qualification_start: current.qualification_start ?? "",
        qualification_end: current.qualification_end ?? "",
        stage_months: (current.stage_months ?? []).join(", "),
        age_u16_max: current.age_u16_max?.toString() ?? "15",
        age_u40_min: current.age_u40_min?.toString() ?? "40",
        class_labels: current.class_labels ? Object.keys(current.class_labels).join(",") : "U16-m,U16-w,Ü16-m,Ü16-w,Ü40-m,Ü40-w",
        finale_enabled: current.finale_enabled ? "true" : "false",
      });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      id: settingsId ?? undefined,
      season_year: form.season_year || null,
      qualification_start: form.qualification_start || null,
      qualification_end: form.qualification_end || null,
      stage_months: form.stage_months.split(",").map((s) => s.trim()).filter(Boolean),
      age_u16_max: Number(form.age_u16_max),
      age_u40_min: Number(form.age_u40_min),
      class_labels: form.class_labels
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .reduce<Record<string, string>>((acc, key) => {
          acc[key] = key;
          return acc;
        }, {}),
      finale_enabled: form.finale_enabled === "true",
    };
    const { data, error } = await upsertAdminSettings(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data?.id) setSettingsId(data.id);
    toast({ title: "Gespeichert", description: "Saison-Einstellungen aktualisiert." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Saisonverwaltung</h1>
        <p className="text-sm text-muted-foreground mt-2">Konfiguration der laufenden Saison.</p>
      </div>
      <Card className="p-5 border-border/60 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="season">Aktuelle Saison</Label>
          <Input
            id="season"
            placeholder="2026"
            value={form.season_year}
            onChange={(e) => setForm({ ...form, season_year: e.target.value })}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start">Qualifikation Start</Label>
            <Input
              id="start"
              type="date"
              value={form.qualification_start}
              onChange={(e) => setForm({ ...form, qualification_start: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Qualifikation Ende</Label>
            <Input
              id="end"
              type="date"
              value={form.qualification_end}
              onChange={(e) => setForm({ ...form, qualification_end: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stages">Etappen (Monate)</Label>
          <Input
            id="stages"
            placeholder="Mai, Juni, Juli, August"
            value={form.stage_months}
            onChange={(e) => setForm({ ...form, stage_months: e.target.value })}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="u16max">U16 max Alter</Label>
            <Input
              id="u16max"
              type="number"
              value={form.age_u16_max}
              onChange={(e) => setForm({ ...form, age_u16_max: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u40min">Ü40 min Alter</Label>
            <Input
              id="u40min"
              type="number"
              value={form.age_u40_min}
              onChange={(e) => setForm({ ...form, age_u40_min: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="classLabels">Klassen-Labels (csv)</Label>
          <Input
            id="classLabels"
            placeholder="U16-m,U16-w,Ü16-m,Ü16-w,Ü40-m,Ü40-w"
            value={form.class_labels}
            onChange={(e) => setForm({ ...form, class_labels: e.target.value })}
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

export default LeagueSeason;
