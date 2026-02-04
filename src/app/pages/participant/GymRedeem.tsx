import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { getGymCodeByCode, updateGymCode } from "@/services/appApi";

const GymRedeem = () => {
  const { profile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id) return;
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setLoading(true);
    const { data, error } = await getGymCodeByCode(normalized);
    if (error) {
      setLoading(false);
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (!data) {
      setLoading(false);
      toast({ title: "Ungültiger Code", description: "Dieser Code wurde nicht gefunden." });
      return;
    }
    if (data.redeemed_by) {
      setLoading(false);
      toast({ title: "Bereits eingelöst", description: "Dieser Code wurde schon verwendet." });
      return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setLoading(false);
      toast({ title: "Abgelaufen", description: "Dieser Code ist nicht mehr gültig." });
      return;
    }
    const { error: redeemError } = await updateGymCode(data.id, {
      redeemed_by: profile.id,
      redeemed_at: new Date().toISOString(),
      status: "redeemed",
    });
    setLoading(false);
    if (redeemError) {
      toast({ title: "Fehler", description: redeemError.message });
      return;
    }
    toast({
      title: "Code eingelöst",
      description: "Die Halle wurde freigeschaltet.",
    });
    setCode("");
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-headline text-2xl text-primary">Code einlösen</h2>
        <p className="text-sm text-muted-foreground mt-1">Gib den Hallen-Code ein.</p>
      </div>
      <form onSubmit={handleRedeem} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Hallen-Code</Label>
          <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="z. B. KL-2026-XYZ" />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !code}>
          {loading ? "Einlösen..." : "Code einlösen"}
        </Button>
      </form>
    </div>
  );
};

export default GymRedeem;
