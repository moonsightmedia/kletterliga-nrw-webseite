import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/services/supabase";
import { Building2, Loader2 } from "lucide-react";

const GymInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    website: "",
    logo_url: "",
    password: "",
    passwordConfirm: "",
  });

  useEffect(() => {
    if (!token) {
      toast({ title: "Fehler", description: "Kein Token gefunden." });
      navigate("/app/login");
      return;
    }

    // Load invite data
    const loadInvite = async () => {
      try {
        const { data, error } = await supabase
          .from("gym_invites")
          .select("email, expires_at, used_at")
          .eq("token", token)
          .single();

        if (error || !data) {
          toast({
            title: "Ungültiger Link",
            description: "Der Einladungslink ist ungültig oder abgelaufen.",
          });
          navigate("/app/login");
          return;
        }

        if (data.used_at) {
          toast({
            title: "Link bereits verwendet",
            description: "Dieser Einladungslink wurde bereits verwendet.",
          });
          navigate("/app/login");
          return;
        }

        const expiresAt = new Date(data.expires_at);
        if (new Date() > expiresAt) {
          toast({
            title: "Link abgelaufen",
            description: "Der Einladungslink ist abgelaufen. Bitte kontaktiere einen Liga-Admin.",
          });
          navigate("/app/login");
          return;
        }

        setInviteEmail(data.email);
        setLoading(false);
      } catch (error) {
        toast({
          title: "Fehler",
          description: "Fehler beim Laden der Einladung.",
        });
        navigate("/app/login");
      }
    };

    loadInvite();
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.password) {
      toast({
        title: "Fehlende Angaben",
        description: "Bitte fülle alle Pflichtfelder aus.",
      });
      return;
    }

    if (form.password !== form.passwordConfirm) {
      toast({
        title: "Passwörter stimmen nicht überein",
        description: "Bitte überprüfe deine Passwort-Eingabe.",
      });
      return;
    }

    if (form.password.length < 6) {
      toast({
        title: "Passwort zu kurz",
        description: "Das Passwort muss mindestens 6 Zeichen lang sein.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke("complete-gym-invite", {
        body: {
          token,
          password: form.password,
          gym: {
            name: form.name,
            city: form.city || null,
            address: form.address || null,
            website: form.website || null,
            logo_url: form.logo_url || null,
          },
        },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Unbekannter Fehler");
      }

      toast({
        title: "Erfolgreich registriert!",
        description: "Deine Halle wurde erstellt. Du kannst dich jetzt anmelden.",
      });

      // Redirect to login
      navigate("/app/login", { state: { email: inviteEmail } });
    } catch (error) {
      toast({
        title: "Fehler",
        description: (error as Error).message || "Registrierung fehlgeschlagen.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Lade Einladung...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-headline text-primary">Halle registrieren</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Einladung für: <span className="font-medium">{inviteEmail}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Hallenname <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="z. B. Kletterhalle Ruhr"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">Stadt</Label>
              <Input
                id="city"
                placeholder="z. B. Essen"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                placeholder="z. B. Hauptstraße 123"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Webseite</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                type="url"
                placeholder="https://example.com/logo.png"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                Passwort <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mindestens 6 Zeichen"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">
                Passwort bestätigen <span className="text-destructive">*</span>
              </Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="Passwort wiederholen"
                value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registriere...
                </>
              ) : (
                "Halle registrieren"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/app/login")}
              disabled={submitting}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default GymInvite;
