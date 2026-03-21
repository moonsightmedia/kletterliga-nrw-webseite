import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { redeemGymCode } from "@/services/appApi";
import { CodeQrScanner } from "@/components/CodeQrScanner";
import { Scan } from "lucide-react";

const GymRedeem = () => {
  const { profile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id) return;

    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    setLoading(true);
    const { data, error } = await redeemGymCode(normalized);
    setLoading(false);

    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }

    if (!data) {
      toast({ title: "Fehler", description: "Code konnte nicht eingelöst werden." });
      return;
    }

    toast({
      title: "Code eingelöst",
      description: data.gym_name
        ? `Halle "${data.gym_name}" wurde freigeschaltet.`
        : "Die Halle wurde freigeschaltet.",
    });
    setCode("");
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="font-headline text-2xl md:text-3xl lg:text-4xl text-primary">Code einlösen</h2>
        <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">Gib den Hallen-Code ein.</p>
      </div>
      <form onSubmit={handleRedeem} className="space-y-4 md:space-y-6">
        <div className="space-y-2 md:space-y-3">
          <Label htmlFor="code" className="text-sm md:text-base">Hallen-Code</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="z. B. KL-2026-XYZ"
              className="md:text-base md:h-12 flex-1"
            />
            <Dialog open={scanOpen} onOpenChange={setScanOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="lg" className="md:h-12 shrink-0" title="Code scannen">
                  <Scan className="h-5 w-5 md:mr-2" />
                  <span className="hidden md:inline">Scannen</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Code scannen</DialogTitle>
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
        <Button type="submit" className="w-full md:w-auto md:px-8" size="lg" disabled={loading || !code}>
          {loading ? "Einlösen..." : "Code einlösen"}
        </Button>
      </form>
    </div>
  );
};

export default GymRedeem;
