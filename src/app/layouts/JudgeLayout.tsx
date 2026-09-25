import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function JudgeLayout({ children }: { children: ReactNode }) {
  return <div className="judge-layout stitch-app stitch-app-shell min-h-screen bg-[#f8f4ee] text-[#003d55]">
    <header className="sticky top-0 z-40 bg-[#003d55] text-[#f2dcab] shadow-[0_8px_24px_rgba(0,38,55,0.12)]">
      <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="stitch-headline whitespace-nowrap text-sm text-[#f2dcab] focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2dcab] min-[360px]:text-lg sm:text-xl">KLETTERLIGA NRW</Link>
        <span className="stitch-kicker shrink-0 text-right text-[0.56rem] text-[#f2dcab] sm:text-[0.68rem]">WETTKAMPFTAG</span>
      </div>
    </header>
    <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">{children}</main>
  </div>;
}
