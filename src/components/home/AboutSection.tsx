import { Target, Users, Trophy } from "lucide-react";

export const AboutSection = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container-kl">
        <div className="max-w-4xl mx-auto text-center">
          {/* Section Header */}
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl text-primary mb-6">
            WAS IST DIE KLETTERLIGA NRW?
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-12">
            Die Kletterliga NRW ist ein landesweiter Hallenkletter-Wettkampf, der 
            Kletterer:innen aller Leistungsstufen zusammenbringt. Über mehrere 
            Monate hinweg sammelst du in verschiedenen Kletterhallen Punkte und 
            qualifizierst dich für das große Finale. Ob Einsteiger oder ambitionierter 
            Sportkletterer – bei uns findest du die passende Herausforderung.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="card-kl group">
              <div className="w-16 h-16 mx-auto mb-4 -skew-x-6 bg-accent flex items-center justify-center group-hover:bg-secondary transition-colors">
                <Target className="skew-x-6 text-primary group-hover:text-secondary-foreground transition-colors" size={28} />
              </div>
              <h3 className="font-headline text-xl text-primary mb-2">Wettkampfcharakter</h3>
              <p className="text-muted-foreground text-sm">
                Jede Route zählt. Sammle Punkte in deinem eigenen Tempo und miss 
                dich mit Kletterer:innen aus ganz NRW.
              </p>
            </div>

            <div className="card-kl group">
              <div className="w-16 h-16 mx-auto mb-4 -skew-x-6 bg-accent flex items-center justify-center group-hover:bg-secondary transition-colors">
                <Users className="skew-x-6 text-primary group-hover:text-secondary-foreground transition-colors" size={28} />
              </div>
              <h3 className="font-headline text-xl text-primary mb-2">Community</h3>
              <p className="text-muted-foreground text-sm">
                Werde Teil einer wachsenden Klettergemeinschaft. Lerne neue 
                Hallen kennen und triff Gleichgesinnte.
              </p>
            </div>

            <div className="card-kl group">
              <div className="w-16 h-16 mx-auto mb-4 -skew-x-6 bg-accent flex items-center justify-center group-hover:bg-secondary transition-colors">
                <Trophy className="skew-x-6 text-primary group-hover:text-secondary-foreground transition-colors" size={28} />
              </div>
              <h3 className="font-headline text-xl text-primary mb-2">Das Finale</h3>
              <p className="text-muted-foreground text-sm">
                Die Besten qualifizieren sich für das große Finale. Ein 
                einzigartiges Event mit Live-Atmosphäre.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
