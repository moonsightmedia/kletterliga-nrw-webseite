import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { getGym, checkGymCodeRedeemed, getGymCodeByCode, updateGymCode } from "@/services/appApi";
import { useAuth } from "@/app/auth/AuthProvider";
import type { Gym } from "@/services/appTypes";
import { Lock, CheckCircle2, MapPin, Globe, Clock } from "lucide-react";

const GymDetail = () => {
  const { gymId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [gym, setGym] = useState<Gym | null>(null);
  const [codeRedeemed, setCodeRedeemed] = useState<boolean | null>(null);
  const [checkingCode, setCheckingCode] = useState(true);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gymId || !profile?.id) return;
    
    getGym(gymId).then(({ data }) => setGym(data ?? null));
    
    // Prüfe, ob ein Code für diese Halle eingelöst wurde
    checkGymCodeRedeemed(gymId, profile.id).then(({ data, error }) => {
      setCheckingCode(false);
      if (error) {
        console.error("Error checking code:", error);
        setCodeRedeemed(false);
      } else {
        setCodeRedeemed(data !== null);
      }
    });
  }, [gymId, profile?.id]);

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id || !gymId) return;
    
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
    
    // Prüfe, ob der Code zu dieser Halle gehört
    if (data.gym_id !== gymId) {
      setLoading(false);
      toast({ title: "Falscher Code", description: "Dieser Code gehört nicht zu dieser Halle." });
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
    setCodeRedeemed(true);
  };

  if (!gym || checkingCode) {
    return <div className="text-muted-foreground">Halle wird geladen…</div>;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header mit Logo */}
      <div className="flex items-start gap-4 md:gap-6">
        <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-background border-2 border-border flex items-center justify-center overflow-hidden flex-shrink-0">
          {gym.logo_url ? (
            <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-contain" />
          ) : (
            <span className="text-lg md:text-xl font-semibold text-muted-foreground">KL</span>
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl text-primary">{gym.name}</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">{gym.city}</p>
          {codeRedeemed && (
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-500 font-medium">Halle freigeschaltet</span>
            </div>
          )}
        </div>
      </div>

      {/* Halle-Informationen */}
      <Card className="p-6 md:p-8 lg:p-10 border-2 border-border/60 space-y-4 md:space-y-5">
        <div className="space-y-3 md:space-y-4">
          {gym.address && (
            <div className="flex items-start gap-3 md:gap-4">
              <MapPin className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs md:text-sm uppercase tracking-widest text-muted-foreground mb-1">Adresse</div>
                <div className="text-sm md:text-base text-foreground">{gym.address}</div>
              </div>
            </div>
          )}
          
          {gym.opening_hours && (
            <div className="flex items-start gap-3 md:gap-4">
              <Clock className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs md:text-sm uppercase tracking-widest text-muted-foreground mb-1">Öffnungszeiten</div>
                <div className="text-sm md:text-base text-foreground">{gym.opening_hours}</div>
              </div>
            </div>
          )}
          
          {gym.website && (
            <div className="flex items-start gap-3 md:gap-4">
              <Globe className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs md:text-sm uppercase tracking-widest text-muted-foreground mb-1">Website</div>
                <a 
                  href={gym.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm md:text-base text-primary underline-offset-4 hover:underline"
                >
                  {gym.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Code-Einlösung oder Routen-Button */}
      {!codeRedeemed ? (
        <Card className="p-6 md:p-8 lg:p-10 border-2 border-destructive/50 bg-destructive/5">
          <div className="flex items-start gap-4 md:gap-6">
            <div className="p-2 md:p-3 rounded-full bg-destructive/10">
              <Lock className="h-6 w-6 md:h-7 md:w-7 text-destructive" />
            </div>
            <div className="flex-1 space-y-4 md:space-y-5">
              <div>
                <h3 className="font-semibold md:text-lg text-destructive mb-2">Halle freischalten</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Um Ergebnisse für diese Halle eintragen zu können, musst du zuerst einen Hallen-Code einlösen.
                </p>
              </div>
              
              <form onSubmit={handleRedeem} className="space-y-3 md:space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="code">Hallen-Code</Label>
                  <Input 
                    id="code" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value.toUpperCase())} 
                    placeholder="z. B. KL-2026-XYZ"
                    disabled={loading}
                    className="md:text-base"
                  />
                </div>
                <Button type="submit" className="w-full md:w-auto" disabled={loading || !code.trim()}>
                  {loading ? "Einlösen..." : "Code einlösen"}
                </Button>
              </form>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          <Button className="w-full" size="lg" asChild>
            <Link to={`/app/gyms/${gym.id}/routes`}>
              <span className="skew-x-6">Routen & Ergebnisse anzeigen</span>
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default GymDetail;
