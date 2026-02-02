import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { AboutSection } from "@/components/home/AboutSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { SeasonSection } from "@/components/home/SeasonSection";
import { GymsSection } from "@/components/home/GymsSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        <HowItWorksSection />
        <SeasonSection />
        <GymsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
