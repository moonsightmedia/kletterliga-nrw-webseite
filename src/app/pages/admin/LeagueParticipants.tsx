import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { listGyms, listProfiles, updateProfile } from "@/services/appApi";
import type { Gym, Profile } from "@/services/appTypes";

const LeagueParticipants = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listProfiles().then(({ data }) => setProfiles(data ?? []));
    listGyms().then(({ data }) => setGyms(data ?? []));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter((profile) => {
      const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.toLowerCase();
      const email = (profile.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [profiles, search]);

  const handleUpdate = async (profileId: string, patch: Partial<Profile>) => {
    const { data, error } = await updateProfile(profileId, patch);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    if (data) {
      setProfiles((prev) => prev.map((item) => (item.id === data.id ? data : item)));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Teilnehmerverwaltung</h1>
        <p className="text-sm text-muted-foreground mt-2">Teilnehmer suchen und bearbeiten.</p>
      </div>

      <Card className="p-4 border-border/60 space-y-3">
        <Label htmlFor="search">Suche</Label>
        <Input
          id="search"
          placeholder="Name oder E-Mail"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      <div className="space-y-3">
        {filtered.map((profile) => (
          <Card key={profile.id} className="p-4 border-border/60 space-y-3">
            <div className="font-semibold text-primary">
              {profile.first_name ?? "-"} {profile.last_name ?? "-"}
            </div>
            <div className="text-xs text-muted-foreground">{profile.email ?? "-"}</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Vorname"
                defaultValue={profile.first_name ?? ""}
                onBlur={(e) => handleUpdate(profile.id, { first_name: e.target.value })}
              />
              <Input
                placeholder="Nachname"
                defaultValue={profile.last_name ?? ""}
                onBlur={(e) => handleUpdate(profile.id, { last_name: e.target.value })}
              />
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={profile.role ?? "participant"}
                onChange={(e) => handleUpdate(profile.id, { role: e.target.value as Profile["role"] })}
              >
                <option value="participant">Teilnehmer</option>
                <option value="gym_admin">Gym-Admin</option>
                <option value="league_admin">Liga-Admin</option>
              </select>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={profile.home_gym_id ?? ""}
                onChange={(e) => handleUpdate(profile.id, { home_gym_id: e.target.value || null })}
              >
                <option value="">Keine Halle</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LeagueParticipants;
