import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/hooks/useScrollAnimation";

const Impressum = () => {
  return (
    <PageLayout>
      <PageHeader title="IMPRESSUM" />

      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up">
            <div className="max-w-3xl mx-auto prose prose-lg">
              <h2 className="font-headline text-2xl text-primary mb-4">Angaben gemäß § 5 TMG</h2>
              <p className="text-muted-foreground">
                Kletterliga NRW<br />
                Musterstraße 123<br />
                12345 Musterstadt
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">Kontakt</h2>
              <p className="text-muted-foreground">
                E-Mail: info@kletterliga-nrw.de
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
              <p className="text-muted-foreground">
                Max Mustermann<br />
                Musterstraße 123<br />
                12345 Musterstadt
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">Haftung für Inhalte</h2>
              <p className="text-muted-foreground">
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf 
                diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 
                bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, 
                übermittelte oder gespeicherte fremde Informationen zu überwachen oder 
                nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">Haftung für Links</h2>
              <p className="text-muted-foreground">
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren 
                Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden 
                Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten 
                Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten 
                verantwortlich.
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">Urheberrecht</h2>
              <p className="text-muted-foreground">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen 
                Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, 
                Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der 
                Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des 
                jeweiligen Autors bzw. Erstellers.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageLayout>
  );
};

export default Impressum;
