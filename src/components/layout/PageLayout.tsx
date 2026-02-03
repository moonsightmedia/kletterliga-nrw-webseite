import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SponsorBanner } from "@/components/home/SponsorBanner";

interface PageLayoutProps {
  children: ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen pt-8">
      <SponsorBanner />
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
};
