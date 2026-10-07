import { ReactNode } from "react";
import { SeasonPreviewHeader as Header } from "@/preview/SeasonPreviewHeader";
import { SeasonPreviewFooter as Footer } from "@/preview/SeasonPreviewFooter";
import { SponsorBanner } from "@/components/home/SponsorBanner";

interface PageLayoutProps {
  children: ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen overflow-x-hidden pt-8">
      <SponsorBanner />
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
};
