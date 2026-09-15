import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQualificationPhase } from "@/services/useQualificationPhase";
import { QualificationNotice } from "./QualificationNotice";
import { StitchButton } from "@/app/components/StitchPrimitives";

export function QualificationWriteRoute({ children }: { children: ReactNode }) {
  const { phase, qualificationEnd } = useQualificationPhase();
  if (phase === "active" || phase === "upcoming") return <>{children}</>;
  return <div className="mx-auto max-w-xl space-y-5"><QualificationNotice phase={phase} end={qualificationEnd} /><StitchButton asChild className="whitespace-normal tracking-wider"><Link to="/app/finale">Zum Halbfinale & zur Anmeldung</Link></StitchButton></div>;
}
