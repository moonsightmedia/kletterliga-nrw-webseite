import { ReactNode } from "react";
import { AnimatedSection } from "@/hooks/useScrollAnimation";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export const PageHeader = ({ title, subtitle, children }: PageHeaderProps) => {
  return (
    <section className="bg-accent relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-20">
      {/* Paper Texture Effect */}
      <div 
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Diagonal Stripes */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute bg-accent-foreground/[0.04] w-[200%] h-24"
          style={{ top: '40%', left: '-50%', transform: 'rotate(-15deg)' }}
        />
      </div>

      <div className="container-kl relative z-10">
        <AnimatedSection animation="fade-up">
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl text-primary mb-4">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg md:text-xl text-primary/70 max-w-2xl">
              {subtitle}
            </p>
          )}
          {children}
        </AnimatedSection>
      </div>
    </section>
  );
};
