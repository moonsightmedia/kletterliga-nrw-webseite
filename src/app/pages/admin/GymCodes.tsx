import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { createGymCodes, listGymAdminsByProfile, listGymCodesByGym } from "@/services/appApi";
import type { GymCode } from "@/services/appTypes";

const GymCodes = () => {
  const { profile } = useAuth();
  const [codes, setCodes] = useState<GymCode[]>([]);
  const [gymId, setGymId] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(50);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "available" | "redeemed">("all");

  useEffect(() => {
    if (!profile?.id) return;
    listGymAdminsByProfile(profile.id).then(({ data }) => {
      const firstGym = data?.[0]?.gym_id ?? null;
      setGymId(firstGym);
      if (firstGym) {
        listGymCodesByGym(firstGym).then(({ data: codesData }) => setCodes(codesData ?? []));
      }
    });
  }, [profile?.id]);

  const visibleCodes = useMemo(() => {
    if (filter === "all") return codes;
    if (filter === "available") return codes.filter((code) => !code.redeemed_by);
    return codes.filter((code) => code.redeemed_by);
  }, [codes, filter]);

  const generateCode = () =>
    `KL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const handleCreateBatch = async (count: number) => {
    if (!gymId) return;
    if (count <= 0) {
      toast({ title: "Ungültige Anzahl", description: "Bitte eine Zahl größer 0 wählen." });
      return;
    }
    setCreating(true);
    const payload = Array.from({ length: count }, () => ({
      gym_id: gymId,
      code: generateCode(),
      status: "available",
      redeemed_by: null,
      redeemed_at: null,
      expires_at: null,
    }));
    const { data, error } = await createGymCodes(payload);
    setCreating(false);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data) {
      setCodes((prev) => [...data, ...prev]);
      toast({ title: "Codes erstellt", description: `${data.length} Codes wurden angelegt.` });
    }
  };

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">Keine Halle zugewiesen.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl text-primary">Code-Verwaltung</h1>
          <p className="text-sm text-muted-foreground mt-2">Hallen-Codes generieren und verwalten.</p>
        </div>
      </div>
      <Card className="p-4 border-border/60 space-y-4">
        <div className="text-xs uppercase tracking-widest text-secondary">Codes erzeugen</div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="batchSize">Batch-Größe</Label>
            <Input
              id="batchSize"
              type="number"
              min={1}
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={() => handleCreateBatch(batchSize)} disabled={creating}>
              <span className="skew-x-6">{creating ? "Erstelle..." : "Batch erstellen"}</span>
            </Button>
            <Button variant="outline" onClick={() => handleCreateBatch(1)} disabled={creating}>
              <span className="skew-x-6">Einzelcode</span>
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filterStatus">Filter</Label>
            <select
              id="filterStatus"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | "available" | "redeemed")}
            >
              <option value="all">Alle</option>
              <option value="available">Frei</option>
              <option value="redeemed">Eingelöst</option>
            </select>
          </div>
        </div>
      </Card>
      <div className="space-y-3">
        {visibleCodes.map((item) => (
          <Card key={item.id} className="p-4 border-border/60 flex items-center justify-between">
            <div>
              <div className="font-semibold text-primary">{item.code}</div>
              <div className="text-xs text-muted-foreground">
                Erstellt: {item.created_at ? new Date(item.created_at).toLocaleDateString("de-DE") : "-"}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {item.redeemed_by ? "Eingelöst" : "Frei"}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GymCodes;
