import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { fetchGymInvite } from "@/services/appApi";
import { Building2, Loader2 } from "lucide-react";

const GymInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [gymName, setGymName] = useState("");
  const [form, setForm] = useState({
    password: "",
    passwordConfirm: "",
  });

  useEffect(() => {
    if (!token) {
      toast({ title: "Fehler", description: "Kein Token gefunden." });
      navigate("/app/login");
      return;
    }

    const loadInvite = async () => {
      try {
        const { data: invite, error } = await fetchGymInvite(token);

        if (error || !invite) {
          toast({
            title: "Ungültiger Link",
            description: error?.message || "Der Einladungslink ist ungültig oder abgelaufen.",
            variant: "destructive",
          });
          navigate("/app/login");
          return;
        }

        if (invite.used_at) {
          toast({
            title: "Link bereits verwendet",
            description: "Dieser Einladungslink wurde bereits verwendet.",
          });
          navigate("/app/login");
          return;
        }

        const expiresAt = new Date(invite.expires_at);
        if (new Date() > expiresAt) {
          toast({
            title: "Link abgelaufen",
            description: "Der Einladungslink ist abgelaufen. Bitte kontaktiere einen Liga-Admin.",
          });
          navigate("/app/login");
          return;
        }

        setInviteEmail(invite.email);
        setGymName(invite.gym_name);
        setLoading(false);
      } catch {
        toast({
          title: "Fehler",
          description: "Fehler beim Laden der Einladung.",
        });
        navigate("/app/login");
      }
    };

    void loadInvite();
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.password) {
      toast({ title: "Fehlende Angaben", description: "Bitte gib ein Passwort ein.", variant: "destructive" });
      return;
    }
    if (form.password !== form.passwordConfirm) {
      toast({ title: "Passwörter stimmen nicht überein", description: "Bitte überprüfe deine Passwort-Eingabe.", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Passwort zu kurz", description: "Das Passwort muss mindestens 6 Zeichen lang sein.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/complete-gym-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          token,
          password: form.password,
        }),
      });

      const data = await response.json().catch(() => ({}));
      const apiError = typeof data?.error === "string" ? data.error : "";

      if (!response.ok || !data?.success) {
        const title = response.status === 400 || response.status === 409 ? "Eingabe prüfen" : "Fehler";
        const description = apiError || "Der Hallenzugang konnte nicht eingerichtet werden. Bitte versuche es erneut.";
        toast({ title, description, variant: "destructive" });
        return;
      }

      toast({
        title: "Zugang eingerichtet",
        description: "Der Hallenzugang ist jetzt aktiv. Du kannst dich direkt anmelden.",
        variant: "success",
      });

      navigate("/app/login", { state: { email: inviteEmail } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const isNetwork = /fetch|network|Failed to fetch/i.test(message);
      toast({
        title: "Fehler",
        description: isNetwork
          ? "Verbindungsproblem. Bitte prüfe deine Internetverbindung und versuche es erneut."
          : (message || "Der Hallenzugang konnte nicht eingerichtet werden. Bitte versuche es erneut."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 w-full max-w-md">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Lade Einladung...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8 md:py-12">
      <Card className="w-full max-w-xl p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-headline text-primary">Hallenzugang einrichten</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
              Einladung für: <span className="font-medium">{inviteEmail}</span>
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 space-y-1">
          <p className="text-sm font-medium text-foreground">{gymName}</p>
          <p className="text-xs text-muted-foreground">
            Nach dem ersten Login können die Hallendaten direkt im internen Hallenbereich gepflegt werden.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Passwort <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
              className="w-full h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordConfirm" className="text-sm font-medium">
              Passwort wiederholen <span className="text-destructive">*</span>
            </Label>
            <Input
              id="passwordConfirm"
              type="password"
              value={form.passwordConfirm}
              onChange={(e) => setForm((prev) => ({ ...prev, passwordConfirm: e.target.value }))}
              required
              className="w-full h-11"
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full h-11">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Richte Zugang ein...
              </>
            ) : (
              "Zugang einrichten"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default GymInvite;
