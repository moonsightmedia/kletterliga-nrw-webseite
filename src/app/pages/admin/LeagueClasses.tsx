import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSeasonSettings } from "@/services/seasonSettings";
import { listProfiles } from "@/services/appApi";
import type { Profile } from "@/services/appTypes";
import { Award, Users, Calendar, Info } from "lucide-react";

const LeagueClasses = () => {
  const { settings, getAgeU16Max, getAgeU40Min, getClassName } = useSeasonSettings();
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    listProfiles().then(({ data }) => {
      // Filtere nur Teilnehmer (keine Admins)
      const participants = (data ?? []).filter((p) => p.role === "participant");
      setProfiles(participants);
    });
  }, []);

  // Berechne Teilnehmeranzahl pro Klasse
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const allClasses = ["U16-m", "U16-w", "Ü16-m", "Ü16-w", "Ü40-m", "Ü40-w"];

    // Initialisiere alle Klassen mit 0
    allClasses.forEach((cls) => {
      counts[cls] = 0;
    });

    // Zähle Teilnehmer pro Klasse
    profiles.forEach((profile) => {
      const className = getClassName(profile.birth_date, profile.gender);
      if (className && counts.hasOwnProperty(className)) {
        counts[className]++;
      }
    });

    return counts;
  }, [profiles, getClassName]);

  const u16Max = getAgeU16Max();
  const u40Min = getAgeU40Min();
  const cutoffDate = settings?.age_cutoff_date || settings?.qualification_start || null;

  const classes = [
    {
      key: "U16",
      label: "U16",
      description: `Bis ${u16Max} Jahre`,
      ageRange: `≤ ${u16Max} Jahre`,
      classes: [
        { key: "U16-m", label: "U16 männlich", count: classCounts["U16-m"] || 0 },
        { key: "U16-w", label: "U16 weiblich", count: classCounts["U16-w"] || 0 },
      ],
    },
    {
      key: "Ü16",
      label: "Ü16",
      description: `${u16Max + 1}–${u40Min - 1} Jahre`,
      ageRange: `${u16Max + 1}–${u40Min - 1} Jahre`,
      classes: [
        { key: "Ü16-m", label: "Ü16 männlich", count: classCounts["Ü16-m"] || 0 },
        { key: "Ü16-w", label: "Ü16 weiblich", count: classCounts["Ü16-w"] || 0 },
      ],
    },
    {
      key: "Ü40",
      label: "Ü40",
      description: `Ab ${u40Min} Jahre`,
      ageRange: `≥ ${u40Min} Jahre`,
      classes: [
        { key: "Ü40-m", label: "Ü40 männlich", count: classCounts["Ü40-m"] || 0 },
        { key: "Ü40-w", label: "Ü40 weiblich", count: classCounts["Ü40-w"] || 0 },
      ],
    },
  ];

  const totalParticipants = Object.values(classCounts).reduce((sum, count) => sum + count, 0);
  const totalClasses = classes.reduce((sum, group) => sum + group.classes.length, 0);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/90 shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center flex-shrink-0">
              <Award className="h-6 w-6 md:h-8 md:w-8 text-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-white break-words">Wertungsklassen</h1>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs flex-shrink-0">
                  Liga
                </Badge>
              </div>
              <p className="text-white/90 text-xs md:text-sm lg:text-base break-words">
                Übersicht der Wertungsklassen · {totalClasses} Klassen · {totalParticipants} Teilnehmer zugeordnet
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Konfigurations-Info */}
      <Card className="p-4 md:p-6 border-2 border-border/60">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <h3 className="font-semibold text-primary text-sm md:text-base">Konfiguration</h3>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 text-sm">
              <div>
                <span className="text-muted-foreground">U16 max Alter:</span>{" "}
                <span className="font-medium">{u16Max} Jahre</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ü40 min Alter:</span>{" "}
                <span className="font-medium">{u40Min} Jahre</span>
              </div>
              <div>
                <span className="text-muted-foreground">Stichtag:</span>{" "}
                <span className="font-medium">
                  {cutoffDate ? new Date(cutoffDate).toLocaleDateString("de-DE") : "Nicht gesetzt"}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Die Altersgrenzen können in der Saisonverwaltung angepasst werden.
            </p>
          </div>
        </div>
      </Card>

      {/* Wertungsklassen-Übersicht */}
            <div className="space-y-4">
              <h2 className="text-base md:text-lg font-semibold text-primary">Hauptwertungsklassen (finalrelevant)</h2>
              <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {classes.map((group) => (
            <Card key={group.key} className="p-6 border-2 border-border/60 hover:border-primary/50 transition-all hover:shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-headline text-xl text-primary">{group.label}</h3>
                  <p className="text-xs text-muted-foreground">{group.ageRange}</p>
                </div>
              </div>
              <div className="space-y-3">
                {group.classes.map((cls) => (
                  <div
                    key={cls.key}
                    className="flex items-center justify-between p-3 bg-accent/20 rounded-lg border border-border/60"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{cls.label}</span>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {cls.count} {cls.count === 1 ? "Teilnehmer" : "Teilnehmer"}
                    </Badge>
                  </div>
                ))}
                <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground text-center">
                  Gesamt: {group.classes.reduce((sum, c) => sum + c.count, 0)} Teilnehmer
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Statistik-Zusammenfassung */}
      <Card className="p-6 border-2 border-border/60">
        <h3 className="font-semibold text-primary mb-4">Statistik</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-4 bg-accent/20 rounded-lg">
            <div className="font-headline text-3xl text-primary mb-1">{totalClasses}</div>
            <div className="text-sm text-muted-foreground">Wertungsklassen</div>
          </div>
          <div className="text-center p-4 bg-accent/20 rounded-lg">
            <div className="font-headline text-3xl text-primary mb-1">{totalParticipants}</div>
            <div className="text-sm text-muted-foreground">Teilnehmer zugeordnet</div>
          </div>
          <div className="text-center p-4 bg-accent/20 rounded-lg">
            <div className="font-headline text-3xl text-primary mb-1">
              {profiles.length - totalParticipants}
            </div>
            <div className="text-sm text-muted-foreground">Ohne Zuordnung</div>
            <p className="text-xs text-muted-foreground mt-1">
              (fehlende Geburtsdaten/Geschlecht)
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LeagueClasses;
