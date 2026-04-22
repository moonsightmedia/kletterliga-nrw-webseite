import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { QualificationNoticeBanner } from "@/components/home/QualificationNoticeBanner";
import { AboutSection } from "@/components/home/AboutSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { SeasonSection } from "@/components/home/SeasonSection";
import { GymsSection } from "@/components/home/GymsSection";
import { InstagramSection } from "@/components/home/InstagramSection";
import { CTASection } from "@/components/home/CTASection";
import { SponsorSpotlightSection } from "@/components/home/SponsorSpotlightSection";
import { usePageMeta } from "@/hooks/usePageMeta";

const Index = () => {
  usePageMeta({
    title: "Kletterliga NRW",
    description:
      "Kletterliga NRW: der landesweite Hallenkletter-Wettkampf in Nordrhein-Westfalen mit mehreren Hallen, digitaler Wertung und großem Finale.",
    canonicalPath: "/",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SportsOrganization",
      name: "Kletterliga NRW",
      url: "https://kletterliga-nrw.de/",
      logo: "https://kletterliga-nrw.de/logo.png",
      description:
        "Die Kletterliga NRW ist ein landesweiter Hallenkletter-Wettkampf in Nordrhein-Westfalen mit mehreren Hallen, digitaler Wertung und Finale.",
      sport: "Klettern",
      sameAs: [
        "https://www.instagram.com/kletterliga_nrw/",
      ],
    },
  });

  return (
    <PageLayout>
      <HeroSection />
      <QualificationNoticeBanner />
      <AboutSection />
      <HowItWorksSection />
      <SeasonSection />
      <GymsSection />
      <InstagramSection />
      <CTASection />
      <SponsorSpotlightSection />
    </PageLayout>
  );
};

export default Index;
