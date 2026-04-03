import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import {
  createMasterCodes,
  fetchProfile,
  getGym,
  listGymAdminsByProfile,
  listMasterCodes,
  listProfiles,
} from "@/services/appApi";
import type { MasterCode, Profile } from "@/services/appTypes";
import { CodeQrDisplay } from "@/components/CodeQrDisplay";
import { printCodeSheet } from "@/lib/printableCodeSheet";
import { Calendar, Download, Filter, Plus, TicketCheck, User } from "lucide-react";

const GymMastercodes = () => {
  const { profile } = useAuth();
  const [codes, setCodes] = useState<MasterCode[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [gymId, setGymId] = useState<string | null>(null);
  const [gymName, setGymName] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "available" | "redeemed">("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;

    listGymAdminsByProfile(profile.id).then(({ data }) => {
      const firstGym = data?.[0]?.gym_id ?? null;
      setGymId(firstGym);

      if (!firstGym) return;

      Promise.all([
        listMasterCodes(firstGym),
        getGym(firstGym),
        listProfiles(),
      ]).then(([{ data: codesData }, { data: gymData }, { data: profilesData }]) => {
        setCodes(codesData ?? []);
        setGymName(gymData?.name ?? "");

        const redeemedByIds = new Set(
          (codesData ?? []).filter((code) => code.redeemed_by).map((code) => code.redeemed_by!),
        );

        Promise.all(Array.from(redeemedByIds).map((id) => fetchProfile(id))).then((results) => {
          const profileMap = new Map<string, Profile>();
          results.forEach(({ data }) => {
            if (data) profileMap.set(data.id, data);
          });
          (profilesData ?? []).forEach((item) => profileMap.set(item.id, item));
          setProfiles(profileMap);
        });
      });
    });
  }, [profile?.id]);

  const visibleCodes = useMemo(() => {
    if (filter === "available") return codes.filter((code) => !code.redeemed_by);
    if (filter === "redeemed") return codes.filter((code) => code.redeemed_by);
    return codes;
  }, [codes, filter]);

  const stats = useMemo(() => {
    const total = codes.length;
    const available = codes.filter((code) => !code.redeemed_by).length;
    const redeemed = total - available;
    return { total, available, redeemed };
  }, [codes]);

  const availableCount = visibleCodes.filter((code) => !code.redeemed_by).length;
  const redeemedCount = visibleCodes.filter((code) => code.redeemed_by).length;

  const getRedeemerName = (profileId: string | null) => {
    if (!profileId) return null;
    const item = profiles.get(profileId);
    if (!item) return "Unbekannt";
    const name = `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim();
    return name || item.email || "Unbekannt";
  };

  const generateCode = () =>
    `KL-MASTER-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const exportToPDF = async () => {
    const availableCodes = codes.filter((code) => !code.redeemed_by);
    if (availableCodes.length === 0) {
      toast({ title: "Keine Codes", description: "Es gibt keine freien Mastercodes zum Exportieren." });
      return;
    }

    toast({ title: "PDF wird vorbereitet...", description: "QR-Codes werden erzeugt." });
    try {
      await printCodeSheet({
        windowTitle: "Mastercodes - Kletterliga NRW",
        heading: "Mastercodes - Teilnahmegebühr",
        description:
          "Der Mastercode ist ligaweit gültig, schaltet das gesamte Profil frei und wird einmalig für 15 € in einer Halle verkauft.",
        calloutTitle: "Wichtig für die Ausgabe",
        calloutLines: [
          "Dieser Mastercode gilt für die gesamte Liga und nicht nur für deine Halle.",
          "Der Hallen-Code wird separat eingelöst und schaltet nur die jeweilige Halle frei.",
          "Ausgegeben von: " + (gymName || "deiner Halle"),
        ],
        cards: availableCodes.map((code) => ({
          code: code.code,
          qrLabel: "Mastercode (scannbar)",
          badge: "Ligaweit gültig",
          detailLines: [
            `Ausgegeben von: ${gymName || "deiner Halle"}`,
            "Teilnahmegebühr: 15 €",
          ],
          footerLabel: "Zum Ausschneiden",
        })),
      });
    } catch (error) {
      toast({
        title: "PDF-Export fehlgeschlagen",
        description: error instanceof Error ? error.message : "Die Druckansicht konnte nicht geöffnet werden.",
        variant: "destructive",
      });
    }
  };

  const handleCreateBatch = async (count: number) => {
    if (!gymId) {
      toast({ title: "Fehler", description: "Keine Halle zugeordnet." });
      return;
    }
    if (count <= 0) {
      toast({ title: "Ungültige Anzahl", description: "Bitte eine Zahl größer 0 wählen." });
      return;
    }

    setCreating(true);
    const payload = Array.from({ length: count }, () => ({
      code: generateCode(),
      gym_id: gymId,
      redeemed_by: null,
      redeemed_at: null,
      expires_at: null,
      status: "available",
    }));
    const { data, error } = await createMasterCodes(payload);
    setCreating(false);

    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }

    if (data) {
      setCodes((prev) => [...data, ...prev]);
      setShowCreateForm(false);
      toast({ title: "Mastercodes erstellt", description: `${data.length} Mastercode(s) wurden angelegt.` });
    }
  };

  if (!gymId) {
    return (
      <div className="space-y-4">
        <h1 className="font-headline text-xl md:text-2xl text-primary">Mastercodes</h1>
        <Card className="p-6 text-center text-muted-foreground">
          Keine Halle zugeordnet. Nur Hallen-Admins können hier Mastercodes verwalten.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-primary break-words">Mastercodes</h1>
          <p className="text-sm text-muted-foreground mt-2 break-words">
            Der Mastercode ist ligaweit gültig, schaltet das gesamte Profil frei und wird einmalig für 15 € in einer Halle verkauft.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={exportToPDF}
            disabled={stats.available === 0}
            className="touch-manipulation"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="skew-x-6">PDF Export</span>
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)} className="touch-manipulation">
            <Plus className="h-4 w-4 mr-2" />
            <span className="skew-x-6">Neue Mastercodes</span>
          </Button>
        </div>
      </div>

      <div className="flex sm:hidden flex-col gap-2">
        <Button
          variant="outline"
          onClick={exportToPDF}
          disabled={stats.available === 0}
          className="w-full min-h-[44px] touch-manipulation"
        >
          <Download className="h-4 w-4 mr-2" />
          <span className="skew-x-6">PDF Export</span>
        </Button>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="w-full min-h-[44px] touch-manipulation"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="skew-x-6">Neue Mastercodes</span>
        </Button>
      </div>

      <Card className="p-4 md:p-5 border-border/60 bg-muted/30">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-secondary">Mastercode</div>
            <p className="text-sm text-foreground leading-6">
              Gilt für die ganze Liga, schaltet das komplette Profil frei und deckt die Teilnahmegebühr von 15 € ab.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-secondary">Hallencode</div>
            <p className="text-sm text-foreground leading-6">
              Wird zusätzlich eingelöst und schaltet nur die jeweilige Halle frei, in der geklettert wird.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-3">
        <Card className="p-3 sm:p-4 border-border/60">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-secondary">Gesamt</div>
          <div className="font-headline text-xl sm:text-2xl text-primary mt-1 sm:mt-2">{stats.total}</div>
        </Card>
        <Card className="p-3 sm:p-4 border-border/60">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-secondary">Verfügbar</div>
          <div className="font-headline text-xl sm:text-2xl text-primary mt-1 sm:mt-2">{stats.available}</div>
        </Card>
        <Card className="p-3 sm:p-4 border-border/60">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-secondary">Eingelöst</div>
          <div className="font-headline text-xl sm:text-2xl text-secondary mt-1 sm:mt-2">{stats.redeemed}</div>
        </Card>
      </div>

      {showCreateForm && (
        <Card className="p-4 md:p-6 border-border/60 space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-secondary mb-4">
            <TicketCheck className="h-4 w-4 flex-shrink-0" />
            <span className="break-words">Mastercodes für diese Halle erzeugen</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="space-y-2 flex-1 w-full">
              <Label htmlFor="batchSize">Anzahl</Label>
              <Input
                id="batchSize"
                type="number"
                min={1}
                max={200}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="touch-manipulation min-h-[44px]"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
              <Button onClick={() => handleCreateBatch(batchSize)} disabled={creating} className="w-full sm:w-auto min-h-[44px] touch-manipulation">
                {creating ? "Erstelle..." : `Batch (${batchSize})`}
              </Button>
              <Button variant="outline" onClick={() => handleCreateBatch(1)} disabled={creating} className="w-full sm:w-auto min-h-[44px] touch-manipulation">
                Einzelcode
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)} className="w-full sm:w-auto min-h-[44px] touch-manipulation">
                Abbrechen
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <select
          className="h-10 sm:h-9 min-h-[44px] sm:min-h-0 w-full sm:w-auto rounded-md border border-input bg-background px-3 text-sm touch-manipulation"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | "available" | "redeemed")}
        >
          <option value="all">Alle</option>
          <option value="available">Nur verfügbar ({availableCount})</option>
          <option value="redeemed">Nur eingelöst ({redeemedCount})</option>
        </select>
      </div>

      {visibleCodes.length === 0 ? (
        <Card className="p-6 md:p-8 text-center text-muted-foreground">
          {filter === "available"
            ? "Keine verfügbaren Mastercodes. Erstelle neue oben."
            : filter === "redeemed"
              ? "Keine eingelösten Mastercodes."
              : "Keine Mastercodes vorhanden. Erstelle neue oben."}
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCodes.map((code) => {
            const isRedeemed = Boolean(code.redeemed_by);
            const redeemer = isRedeemed ? getRedeemerName(code.redeemed_by) : null;

            return (
              <Card
                key={code.id}
                className={`p-4 md:p-5 border-2 transition-all hover:shadow-md min-w-0 ${
                  isRedeemed ? "border-secondary/50 opacity-75" : "border-border/60"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">Ligaweit gültig · 15 € Teilnahmegebühr</div>
                      <div className="font-mono font-semibold text-sm md:text-base text-primary break-all">{code.code}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Erstellt: {code.created_at ? new Date(code.created_at).toLocaleDateString("de-DE") : "-"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge variant={isRedeemed ? "secondary" : "default"}>
                        {isRedeemed ? "Eingelöst" : "Frei"}
                      </Badge>
                      <CodeQrDisplay value={code.code} size={64} />
                    </div>
                  </div>

                  {isRedeemed && redeemer ? (
                    <div className="pt-2 border-t border-border/50 space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-muted-foreground">Eingelöst von: </span>
                          <span className="font-medium text-primary break-words">{redeemer}</span>
                        </div>
                      </div>
                      {code.redeemed_at && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>
                            {new Date(code.redeemed_at).toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GymMastercodes;
