import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { AboutSection } from "@/components/home/AboutSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { SeasonSection } from "@/components/home/SeasonSection";
import { GymsSection } from "@/components/home/GymsSection";
import { CTASection } from "@/components/home/CTASection";
import { usePageMeta } from "@/hooks/usePageMeta";

const Index = () => {
  usePageMeta({
    title: "Kletterliga NRW",
    description:
      "Der landesweite Hallenkletter-Wettkampf in NRW. Mehrere Hallen. Eine Liga. Ein Finale.",
    canonicalPath: "/",
  });

  return (
    <PageLayout>
      <HeroSection />
      <AboutSection />
      <HowItWorksSection />
      <SeasonSection />
      <GymsSection />
      <CTASection />
    </PageLayout>
  );
};

export default Index;
