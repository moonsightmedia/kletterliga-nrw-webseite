import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { listAdminSettings, upsertAdminSettings } from "@/services/appApi";
import { Settings, Bell, Trophy } from "lucide-react";

const LeagueSettings = () => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState({
    banner: "",
    finale_enabled: false,
  });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      const { data } = await listAdminSettings();
      const current = data?.[0];
      if (current) {
        setSettingsId(current.id);
        setForm({
          banner: (current.class_labels?.banner as string) ?? "",
          finale_enabled: current.finale_enabled ?? false,
        });
      }
      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      id: settingsId ?? undefined,
      class_labels: { banner: form.banner },
      finale_enabled: form.finale_enabled,
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
              <Settings className="h-6 w-6 md:h-8 md:w-8 text-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-white break-words">Liga-Einstellungen</h1>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs flex-shrink-0">
                  Liga
                </Badge>
              </div>
              <p className="text-white/90 text-xs md:text-sm lg:text-base break-words">
                Allgemeine Einstellungen und Hinweise
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Einstellungen */}
      {loading ? (
        <Card className="p-8 text-center border-2 border-border/60">
          <p className="text-muted-foreground">Lade Einstellungen...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Banner-Einstellungen */}
          <Card className="p-4 md:p-6 border-2 border-border/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-headline text-primary">Hinweisbanner</h2>
                <p className="text-xs text-muted-foreground">Text, der auf der Startseite angezeigt wird</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner">Banner-Text</Label>
              <Input
                id="banner"
                placeholder="z. B. Finale-Anmeldung ab 01.09."
                value={form.banner}
                onChange={(e) => setForm({ ...form, banner: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Dieser Text wird als Banner auf der Startseite für alle Teilnehmer angezeigt. Leer lassen, um keinen Banner anzuzeigen.
              </p>
            </div>
          </Card>

          {/* Finale-Einstellungen */}
          <Card className="p-4 md:p-6 border-2 border-border/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-headline text-primary">Finale-Funktionalität</h2>
                <p className="text-xs text-muted-foreground">Finale-Anmeldung und -Verwaltung aktivieren</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-muted/50">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="finaleEnabled" className="text-sm md:text-base cursor-pointer">
                  Finale freigeschaltet
                </Label>
                <p className="text-xs text-muted-foreground">
                  Aktiviert die Finale-Funktionalität für Teilnehmer (Anmeldung, Verwaltung, etc.)
                </p>
              </div>
              <Switch
                id="finaleEnabled"
                checked={form.finale_enabled}
                onCheckedChange={(checked) => setForm({ ...form, finale_enabled: checked })}
                className="flex-shrink-0 touch-manipulation"
              />
            </div>
          </Card>

          {/* Speichern-Button */}
          <Card className="p-4 md:p-6 border-2 border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Änderungen speichern</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Alle Einstellungen werden sofort nach dem Speichern aktiv
                </p>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto min-w-[140px] touch-manipulation">
                <span className="skew-x-6">{saving ? "Speichern..." : "Speichern"}</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LeagueSettings;
