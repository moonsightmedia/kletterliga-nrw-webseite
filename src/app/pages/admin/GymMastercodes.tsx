import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { CodeQrDisplay } from "@/components/CodeQrDisplay";
import { printCodeSheet } from "@/lib/printableCodeSheet";
import {
  createMasterCodes,
  fetchProfile,
  listGymAdminsByProfile,
  listMasterCodes,
  listProfiles,
} from "@/services/appApi";
import type { MasterCode, Profile } from "@/services/appTypes";
import { Calendar, Download, Filter, Plus, TicketCheck, User } from "lucide-react";

const GymMastercodes = () => {
  const { profile } = useAuth();
  const [codes, setCodes] = useState<MasterCode[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [gymId, setGymId] = useState<string | null>(null);
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

      Promise.all([listMasterCodes(firstGym), listProfiles()]).then(
        ([{ data: codesData }, { data: profilesData }]) => {
          setCodes(codesData ?? []);

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
        },
      );
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

    toast({
      title: "PDF wird vorbereitet...",
      description: "Die QR-Codes werden auf einen kompakten Druckbogen gesetzt.",
    });

    try {
      await printCodeSheet({
        windowTitle: "Mastercodes - Kletterliga NRW",
        layout: "compact-qr",
        columns: 4,
        pageMarginCm: 0.45,
        gridGapCm: 0.18,
        qrImageSizeCm: 3.85,
        cards: availableCodes.map((code) => ({
          code: code.code,
          qrLabel: code.code,
        })),
      });
    } catch (error) {
      toast({
        title: "PDF-Export fehlgeschlagen",
        description:
          error instanceof Error ? error.message : "Die Druckansicht konnte nicht geöffnet werden.",
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
        <h1 className="font-headline text-xl text-primary md:text-2xl">Mastercodes</h1>
        <Card className="p-6 text-center text-muted-foreground">
          Keine Halle zugeordnet. Nur Hallen-Admins können hier Mastercodes verwalten.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-headline text-xl text-primary break-words md:text-2xl lg:text-3xl">
            Mastercodes
          </h1>
          <p className="mt-2 text-sm text-muted-foreground break-words">
            Der Mastercode ist ligaweit gültig, schaltet das gesamte Profil frei und wird einmalig
            für 15 € in einer Halle verkauft.
          </p>
        </div>
        <div className="hidden flex-shrink-0 items-center gap-2 sm:flex">
          <Button
            variant="outline"
            onClick={exportToPDF}
            disabled={stats.available === 0}
            className="touch-manipulation"
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="skew-x-6">PDF Export</span>
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)} className="touch-manipulation">
            <Plus className="mr-2 h-4 w-4" />
            <span className="skew-x-6">Neue Mastercodes</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:hidden">
        <Button
          variant="outline"
          onClick={exportToPDF}
          disabled={stats.available === 0}
          className="min-h-[44px] w-full touch-manipulation"
        >
          <Download className="mr-2 h-4 w-4" />
          <span className="skew-x-6">PDF Export</span>
        </Button>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="min-h-[44px] w-full touch-manipulation"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="skew-x-6">Neue Mastercodes</span>
        </Button>
      </div>

      <Card className="border-border/60 bg-muted/30 p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-secondary">Mastercode</div>
            <p className="text-sm leading-6 text-foreground">
              Gilt für die ganze Liga, schaltet das komplette Profil frei und deckt die
              Teilnahmegebühr von 15 € ab.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-secondary">Hallencode</div>
            <p className="text-sm leading-6 text-foreground">
              Wird zusätzlich eingelöst und schaltet nur die jeweilige Halle frei, in der
              geklettert wird.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <Card className="border-border/60 p-3 sm:p-4">
          <div className="text-[10px] uppercase tracking-widest text-secondary sm:text-xs">
            Gesamt
          </div>
          <div className="mt-1 font-headline text-xl text-primary sm:mt-2 sm:text-2xl">
            {stats.total}
          </div>
        </Card>
        <Card className="border-border/60 p-3 sm:p-4">
          <div className="text-[10px] uppercase tracking-widest text-secondary sm:text-xs">
            Verfügbar
          </div>
          <div className="mt-1 font-headline text-xl text-primary sm:mt-2 sm:text-2xl">
            {stats.available}
          </div>
        </Card>
        <Card className="border-border/60 p-3 sm:p-4">
          <div className="text-[10px] uppercase tracking-widest text-secondary sm:text-xs">
            Eingelöst
          </div>
          <div className="mt-1 font-headline text-xl text-secondary sm:mt-2 sm:text-2xl">
            {stats.redeemed}
          </div>
        </Card>
      </div>

      {showCreateForm && (
        <Card className="space-y-4 border-border/60 p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-secondary">
            <TicketCheck className="h-4 w-4 flex-shrink-0" />
            <span className="break-words">Mastercodes für diese Halle erzeugen</span>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full flex-1 space-y-2">
              <Label htmlFor="batchSize">Anzahl</Label>
              <Input
                id="batchSize"
                type="number"
                min={1}
                max={200}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="min-h-[44px] touch-manipulation"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
              <Button
                onClick={() => handleCreateBatch(batchSize)}
                disabled={creating}
                className="min-h-[44px] w-full touch-manipulation sm:w-auto"
              >
                {creating ? "Erstelle..." : `Batch (${batchSize})`}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCreateBatch(1)}
                disabled={creating}
                className="min-h-[44px] w-full touch-manipulation sm:w-auto"
              >
                Einzelcode
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="min-h-[44px] w-full touch-manipulation sm:w-auto"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Filter className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <select
          className="h-10 min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm touch-manipulation sm:h-9 sm:min-h-0 sm:w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | "available" | "redeemed")}
        >
          <option value="all">Alle</option>
          <option value="available">Nur verfügbar ({availableCount})</option>
          <option value="redeemed">Nur eingelöst ({redeemedCount})</option>
        </select>
      </div>

      {visibleCodes.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground md:p-8">
          {filter === "available"
            ? "Keine verfügbaren Mastercodes. Erstelle neue oben."
            : filter === "redeemed"
              ? "Keine eingelösten Mastercodes."
              : "Keine Mastercodes vorhanden. Erstelle neue oben."}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCodes.map((code) => {
            const isRedeemed = Boolean(code.redeemed_by);
            const redeemer = isRedeemed ? getRedeemerName(code.redeemed_by) : null;

            return (
              <Card
                key={code.id}
                className={`min-w-0 border-2 p-4 transition-all hover:shadow-md md:p-5 ${
                  isRedeemed ? "border-secondary/50 opacity-75" : "border-border/60"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-xs text-muted-foreground">
                        Ligaweit gültig · 15 € Teilnahmegebühr
                      </div>
                      <div className="font-mono text-sm font-semibold text-primary break-all md:text-base">
                        {code.code}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Erstellt:{" "}
                        {code.created_at ? new Date(code.created_at).toLocaleDateString("de-DE") : "-"}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-2">
                      <Badge variant={isRedeemed ? "secondary" : "default"}>
                        {isRedeemed ? "Eingelöst" : "Frei"}
                      </Badge>
                      <CodeQrDisplay value={code.code} size={64} />
                    </div>
                  </div>

                  {isRedeemed && redeemer ? (
                    <div className="space-y-2 border-t border-border/50 pt-2">
                      <div className="flex items-start gap-2 text-sm">
                        <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
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
