import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { getMasterCodeByCode, updateMasterCode } from "@/services/appApi";
import { CodeQrScanner } from "@/components/CodeQrScanner";
import { CheckCircle, Scan } from "lucide-react";

const MastercodeRedeem = () => {
  const { profile, refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const isActivated = !!profile?.participation_activated_at;

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id) return;
    if (isActivated) return;
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setLoading(true);
    const { data, error } = await getMasterCodeByCode(normalized);
    if (error) {
      setLoading(false);
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (!data) {
      setLoading(false);
      toast({ title: "Ungültiger Code", description: "Dieser Mastercode wurde nicht gefunden." });
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
    const { error: redeemError } = await updateMasterCode(data.id, {
      redeemed_by: profile.id,
      redeemed_at: new Date().toISOString(),
      status: "redeemed",
    });
    setLoading(false);
    if (redeemError) {
      toast({ title: "Fehler", description: redeemError.message });
      return;
    }
    await refreshProfile();
    toast({ title: "Teilnahme freigeschaltet", description: "Deine Ergebnisse werden jetzt in den Ranglisten gezählt." });
    setCode("");
  };

  if (isActivated) {
    return (
      <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
        <Card className="p-6 md:p-8 border-2 border-green-500/30 bg-green-500/5">
          <div className="flex items-start gap-4">
            <CheckCircle className="h-10 w-10 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-headline text-xl md:text-2xl text-primary">Teilnahme aktiv</h2>
              <p className="text-sm md:text-base text-muted-foreground mt-2">
                Du hast deine Teilnahme freigeschaltet. Deine Ergebnisse werden in den Ranglisten gezählt.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="font-headline text-2xl md:text-3xl lg:text-4xl text-primary">Teilnahme freischalten</h2>
        <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
          Löse deinen Mastercode ein (z. B. nach Zahlung der Teilnahmegebühr in einer Halle). Nur einmal nötig.
        </p>
      </div>
      <form onSubmit={handleRedeem} className="space-y-4 md:space-y-6">
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="mastercode" className="text-sm md:text-base">Mastercode</Label>
          <div className="flex gap-2">
            <Input
              id="mastercode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="z. B. KL-MASTER-2026-ABC"
              className="md:text-base min-h-[44px] md:h-12 touch-manipulation flex-1"
            />
            <Dialog open={scanOpen} onOpenChange={setScanOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="lg" className="min-h-[44px] md:h-12 shrink-0 touch-manipulation" title="Code scannen">
                  <Scan className="h-5 w-5 md:mr-2" />
                  <span className="hidden md:inline">Scannen</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Mastercode scannen</DialogTitle>
                  <DialogDescription>Halte den QR-Code oder Barcode vor die Kamera.</DialogDescription>
                </DialogHeader>
                <CodeQrScanner
                  onScan={(value) => {
                    setCode(value.trim().toUpperCase());
                    setScanOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <Button type="submit" className="w-full md:w-auto md:px-8 min-h-[44px] touch-manipulation" size="lg" disabled={loading || !code.trim()}>
          {loading ? "Einlösen..." : "Mastercode einlösen"}
        </Button>
      </form>
    </div>
  );
};

export default MastercodeRedeem;
