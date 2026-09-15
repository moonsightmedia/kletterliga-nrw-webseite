import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import type { Stage } from "@/services/appTypes";

export function QualificationTimeline({ stages, animated = false }: { stages: Stage[]; animated?: boolean }) {
  if (!stages.length) return null;
  return <ol className={`qualification-timeline ${animated ? "qualification-timeline--animated" : ""}`} aria-label="Abgeschlossene Qualifikationsetappen">
    {stages.map((stage, index) => {
      const month = /\(([^)]+)\)/.exec(stage.label)?.[1];
      return <li key={stage.key} style={{ "--stage-delay": `${index * 1600 / stages.length}ms`, "--stage-duration": `${1600 / stages.length}ms` } as CSSProperties}>
        <div className="qualification-timeline__track" aria-hidden="true"><span /></div>
        <div className="qualification-timeline__node" aria-hidden="true"><Check size={13} strokeWidth={3} /></div>
        <span className="qualification-timeline__label" title={stage.label}>{month ? month.slice(0, 3) : stage.label}</span>
        <span className="sr-only">{month ? stage.label : ""} abgeschlossen</span>
      </li>;
    })}
  </ol>;
}
