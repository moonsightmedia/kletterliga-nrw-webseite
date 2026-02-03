import { PageLayout } from "@/components/layout/PageLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { AboutSection } from "@/components/home/AboutSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { SeasonSection } from "@/components/home/SeasonSection";
import { GymsSection } from "@/components/home/GymsSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
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
