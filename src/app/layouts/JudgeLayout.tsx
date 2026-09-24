import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function JudgeLayout({ children }: { children: ReactNode }) {
  return <div className="stitch-app stitch-app-shell min-h-screen bg-[#f8f4ee] text-[#003d55]">
    <header className="bg-[#003d55] text-[#f2dcab]">
      <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="stitch-headline text-lg text-[#f2dcab] focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2dcab] sm:text-xl">KLETTERLIGA NRW</Link>
        <span className="stitch-kicker text-right text-[#f2dcab]">SCHIEDSRICHTER</span>
      </div>
    </header>
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
  </div>;
}
