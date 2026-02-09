import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { listAdminSettings, upsertAdminSettings } from "@/services/appApi";
import type { Stage } from "@/services/appTypes";
import { Calendar, Trophy, Users, Plus } from "lucide-react";
import StageEditor from "./StageEditor";

const LeagueSeason = () => {
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  const [form, setForm] = useState({
    season_year: "",
    qualification_start: "",
    qualification_end: "",
    preparation_start: "",
    preparation_end: "",
    finale_date: "",
    finale_registration_deadline: "",
    age_cutoff_date: "",
    top_30_per_class: "30",
    wildcards_per_class: "10",
    age_u16_max: "14",
    age_u40_min: "40",
    finale_enabled: "false",
  });
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    listAdminSettings().then(({ data }) => {
      const current = data?.[0];
      if (!current) return;
      setSettingsId(current.id);
      setForm({
        season_year: current.season_year ?? "",
        qualification_start: current.qualification_start ?? "",
        qualification_end: current.qualification_end ?? "",
        preparation_start: current.preparation_start ?? "",
        preparation_end: current.preparation_end ?? "",
        finale_date: current.finale_date ?? "",
        finale_registration_deadline: current.finale_registration_deadline ?? "",
        age_cutoff_date: current.age_cutoff_date ?? "",
        top_30_per_class: current.top_30_per_class?.toString() ?? "30",
        wildcards_per_class: current.wildcards_per_class?.toString() ?? "10",
        age_u16_max: current.age_u16_max?.toString() ?? "14",
        age_u40_min: current.age_u40_min?.toString() ?? "40",
        finale_enabled: current.finale_enabled ? "true" : "false",
      });
      
      // Lade gespeicherte Etappen - nur wenn explizit gesetzt, sonst leer lassen
      // (nicht automatisch generieren, damit gelöschte Etappen nicht wieder erscheinen)
      if (current.stages && Array.isArray(current.stages) && current.stages.length > 0) {
        setStages(current.stages);
      } else {
        // Nur wenn noch nie Etappen gesetzt wurden, initial generieren
        // Wenn stages explizit null oder [] ist, bedeutet das, dass der Benutzer sie gelöscht hat
        setStages([]);
      }
    });
  }, []);

  const generateStagesFromQualification = (start?: string | null, end?: string | null) => {
    if (!start || !end) {
      setStages([]);
      return;
    }
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    const generated: Stage[] = [];
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    let index = 1;
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      // Verwende Qualifikationsende wenn Monatsende später ist
      const stageEnd = monthEnd > endDate ? endDate : monthEnd;
      
      generated.push({
        key: `${year}-${String(month + 1).padStart(2, "0")}`,
        label: `Etappe ${index} (${monthNames[month]})`,
        start: monthStart.toISOString().split("T")[0],
        end: stageEnd.toISOString().split("T")[0],
      });
      
      current = new Date(year, month + 1, 1);
      index++;
    }
    
    setStages(generated);
  };

  // Auto-Generiere Etappen wenn Qualifikationszeitraum geändert wird
  useEffect(() => {
    if (form.qualification_start && form.qualification_end && stages.length === 0) {
      generateStagesFromQualification(form.qualification_start, form.qualification_end);
    }
  }, [form.qualification_start, form.qualification_end]);

  const handleGenerateStages = () => {
    generateStagesFromQualification(form.qualification_start, form.qualification_end);
    toast({ title: "Etappen generiert", description: "Etappen wurden automatisch aus dem Qualifikationszeitraum generiert." });
  };

  const handleEditStage = (index: number) => {
    setEditingStageIndex(index);
  };

  const handleSaveStage = (index: number, updatedStage: Stage) => {
    const newStages = [...stages];
    newStages[index] = updatedStage;
    setStages(newStages);
    setEditingStageIndex(null);
  };

  const handleDeleteStage = (index: number) => {
    if (!confirm("Möchtest du diese Etappe wirklich löschen? Vergiss nicht, die Änderungen zu speichern!")) return;
    const newStages = stages.filter((_, i) => i !== index);
    setStages(newStages);
    toast({ 
      title: "Etappe gelöscht", 
      description: "Vergiss nicht, die Änderungen zu speichern, damit sie dauerhaft gelöscht wird." 
    });
  };

  const handleAddStage = () => {
    const newStage: Stage = {
      key: `custom-${Date.now()}`,
      label: "Neue Etappe",
      start: form.qualification_start || "",
      end: form.qualification_end || "",
    };
    setStages([...stages, newStage]);
    setEditingStageIndex(stages.length);
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Generiere stage_months aus Etappen für Rückwärtskompatibilität
    const stageMonths = stages.map((s) => {
      const date = new Date(s.start);
      const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
      return monthNames[date.getMonth()];
    });
    
    const payload = {
      id: settingsId ?? undefined,
      season_year: form.season_year || null,
      qualification_start: form.qualification_start || null,
      qualification_end: form.qualification_end || null,
      preparation_start: form.preparation_start || null,
      preparation_end: form.preparation_end || null,
      finale_date: form.finale_date || null,
      finale_registration_deadline: form.finale_registration_deadline || null,
      age_cutoff_date: form.age_cutoff_date || form.qualification_start || null,
      top_30_per_class: Number(form.top_30_per_class) || 30,
      wildcards_per_class: Number(form.wildcards_per_class) || 10,
      stage_months: stageMonths,
      stages: stages.length > 0 ? stages : [],
      age_u16_max: Number(form.age_u16_max) || 14,
      age_u40_min: Number(form.age_u40_min) || 40,
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
              <Calendar className="h-6 w-6 md:h-8 md:w-8 text-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-white break-words">Saisonverwaltung</h1>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs flex-shrink-0">
                  Liga
                </Badge>
              </div>
              <p className="text-white/90 text-xs md:text-sm lg:text-base break-words">
                Konfiguration der laufenden Saison {form.season_year || "2026"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Grunddaten */}
      <Card className="p-4 md:p-6 border-2 border-border/60 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
          <h2 className="text-base md:text-lg font-semibold text-primary">Grunddaten</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="season">Saisonjahr</Label>
          <Input
            id="season"
            placeholder="2026"
            value={form.season_year}
            onChange={(e) => setForm({ ...form, season_year: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start">Qualifikation Start</Label>
            <Input
              id="start"
              type="date"
              value={form.qualification_start}
              onChange={(e) => setForm({ ...form, qualification_start: e.target.value })}
              className="touch-manipulation"
            />
            <p className="text-xs text-muted-foreground">z. B. 01.05.2026</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Qualifikation Ende</Label>
            <Input
              id="end"
              type="date"
              value={form.qualification_end}
              onChange={(e) => setForm({ ...form, qualification_end: e.target.value })}
              className="touch-manipulation"
            />
            <p className="text-xs text-muted-foreground">z. B. 13.09.2026</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Schraubphase</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prepStart" className="text-xs">Schraubphase Start</Label>
              <Input
                id="prepStart"
                type="date"
                value={form.preparation_start}
                onChange={(e) => setForm({ ...form, preparation_start: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">z. B. 15.04.2026</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prepEnd" className="text-xs">Schraubphase Ende</Label>
              <Input
                id="prepEnd"
                type="date"
                value={form.preparation_end}
                onChange={(e) => setForm({ ...form, preparation_end: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">z. B. 30.04.2026</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Etappen-Verwaltung */}
      <Card className="p-4 md:p-6 border-2 border-border/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="text-base md:text-lg font-semibold text-primary">Etappen</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerateStages} disabled={!form.qualification_start || !form.qualification_end} className="touch-manipulation">
              <Plus className="h-4 w-4 mr-1" />
              <span className="text-xs md:text-sm">Auto-generieren</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleAddStage} className="touch-manipulation">
              <Plus className="h-4 w-4 mr-1" />
              <span className="text-xs md:text-sm">Etappe hinzufügen</span>
            </Button>
          </div>
        </div>
        
        {stages.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Keine Etappen konfiguriert. Klicke auf "Auto-generieren" um Etappen aus dem Qualifikationszeitraum zu erstellen.
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage, index) => (
              <StageEditor
                key={stage.key}
                stage={stage}
                index={index}
                isEditing={editingStageIndex === index}
                onEdit={() => handleEditStage(index)}
                onSave={(updated) => handleSaveStage(index, updated)}
                onCancel={() => setEditingStageIndex(null)}
                onDelete={() => handleDeleteStage(index)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Finale */}
      <Card className="p-4 md:p-6 border-2 border-border/60 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-secondary flex-shrink-0" />
          <h2 className="text-base md:text-lg font-semibold text-primary">Finalevent</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="finaleEnabled">Finale aktiviert</Label>
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
        {form.finale_enabled === "true" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="finaleDate">Finalevent Datum</Label>
                <Input
                  id="finaleDate"
                  type="date"
                  value={form.finale_date}
                  onChange={(e) => setForm({ ...form, finale_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">z. B. 03.10.2026</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="finaleDeadline">Anmeldeschluss</Label>
                <Input
                  id="finaleDeadline"
                  type="date"
                  value={form.finale_registration_deadline}
                  onChange={(e) => setForm({ ...form, finale_registration_deadline: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">z. B. 27.09.2026</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="top30">Top-Plätze je Wertungsklasse</Label>
                <Input
                  id="top30"
                  type="number"
                  min="1"
                  value={form.top_30_per_class}
                  onChange={(e) => setForm({ ...form, top_30_per_class: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Direkte Qualifikation (Standard: 30)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wildcards">Wildcards je Wertungsklasse</Label>
                <Input
                  id="wildcards"
                  type="number"
                  min="0"
                  value={form.wildcards_per_class}
                  onChange={(e) => setForm({ ...form, wildcards_per_class: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Verlosung unter Vollteilnehmern (Standard: 10)</p>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Wertungsklassen */}
      <Card className="p-6 border-2 border-border/60 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-accent-foreground" />
          <h2 className="text-lg font-semibold text-primary">Wertungsklassen</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ageCutoff">Stichtag für Altersberechnung</Label>
          <Input
            id="ageCutoff"
            type="date"
            value={form.age_cutoff_date || form.qualification_start}
            onChange={(e) => setForm({ ...form, age_cutoff_date: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            An diesem Datum wird das Alter für die Einteilung in die Wertungsklassen berechnet. 
            Standard: Start der Qualifikation ({form.qualification_start || "nicht gesetzt"}).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="u15max">U15 max Alter</Label>
            <Input
              id="u15max"
              type="number"
              min="1"
              max="20"
              value={form.age_u16_max}
              onChange={(e) => setForm({ ...form, age_u16_max: e.target.value })}
              className="touch-manipulation"
            />
            <p className="text-xs text-muted-foreground">Maximales Alter für U15 / unter 15 Jahre (Standard: 14)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="u40min">Ü40 min Alter</Label>
            <Input
              id="u40min"
              type="number"
              min="30"
              value={form.age_u40_min}
              onChange={(e) => setForm({ ...form, age_u40_min: e.target.value })}
              className="touch-manipulation"
            />
            <p className="text-xs text-muted-foreground">Minimales Alter für Ü40 (Standard: 40)</p>
          </div>
        </div>
        <div className="p-3 bg-accent/50 rounded-lg">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Hauptwertungsklassen (finalrelevant)</p>
          <div className="text-sm text-foreground space-y-1">
            <p>• U15 (bis {form.age_u16_max} Jahre) - männlich & weiblich</p>
            <p>• Ü15 ({Number(form.age_u16_max) + 1}–{Number(form.age_u40_min) - 1} Jahre) - männlich & weiblich</p>
            <p>• Ü40 (ab {form.age_u40_min} Jahre) - männlich & weiblich</p>
          </div>
          {form.age_cutoff_date && (
            <p className="text-xs text-muted-foreground mt-2">
              Stichtag: {new Date(form.age_cutoff_date).toLocaleDateString("de-DE")}
            </p>
          )}
        </div>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto touch-manipulation">
        <span className="skew-x-6">{saving ? "Speichern..." : "Saison-Einstellungen speichern"}</span>
      </Button>
    </div>
  );
};

export default LeagueSeason;
