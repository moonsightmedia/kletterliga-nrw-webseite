import { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Palette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StitchButton, StitchTextField } from "@/app/components/StitchPrimitives";
import { competitionRouteColor } from "@/lib/competitionRouteColors";

function normalizeHex(value: string) {
  const hex = value.trim().replace(/^#/, "");
  if (/^[a-f\d]{6}$/i.test(hex)) return "#" + hex.toLowerCase();
  if (/^[a-f\d]{3}$/i.test(hex)) return "#" + [...hex.toLowerCase()].map((digit) => digit + digit).join("");
  return null;
}

export function CompetitionCustomColor({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(competitionRouteColor(value).value);
  const normalized = normalizeHex(draft);
  const preview = normalized ?? competitionRouteColor(value).value;
  const channels = [1, 3, 5].map((offset) => parseInt(preview.slice(offset, offset + 2), 16));
  const apply = () => { if (normalized && !disabled) { onChange(normalized); setOpen(false); } };

  return <Popover open={open} onOpenChange={(next) => { if (next) setDraft(competitionRouteColor(value).value); setOpen(next); }}>
    <PopoverTrigger asChild><StitchButton type="button" variant="outline" size="sm" disabled={disabled}><Palette size={16} /> Eigene Farbe</StitchButton></PopoverTrigger>
    <PopoverContent align="start" collisionPadding={16} className="stitch-app w-80 max-w-[calc(100vw-2rem)] max-h-[var(--radix-popover-content-available-height)] space-y-4 overflow-y-auto rounded-xl border-0 bg-[#faf8f5] p-4 text-[#003d55] shadow-[0_12px_40px_rgba(0,38,55,0.2)]" aria-label="Eigene Routenfarbe">
      <div className="flex items-center gap-3"><span aria-hidden="true" className="h-11 w-11 shrink-0 rounded-lg ring-1 ring-black/15" style={{ backgroundColor: preview }} /><div><h4 className="font-bold">Eigene Routenfarbe</h4><p className="text-xs text-[#526b72]">Mischen oder Farbcode eingeben.</p></div></div>
      <StitchTextField label="Farbcode (Hex)" value={draft} maxLength={7} spellCheck={false} autoComplete="off" placeholder="#12aabb" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); apply(); } }} error={normalized ? undefined : "Bitte einen gültigen Hex-Farbcode eingeben, z. B. #12aabb."} />
      <div>{["Rot", "Grün", "Blau"].map((label, index) => {
        const from = [...channels]; from[index] = 0;
        const to = [...channels]; to[index] = 255;
        return <div key={label}><div className="flex justify-between text-xs"><span>{label}</span><span className="tabular-nums">{channels[index]}</span></div>
          <Slider.Root min={0} max={255} step={1} value={[channels[index]]} onValueChange={([next]) => { const values = [...channels]; values[index] = next; setDraft("#" + values.map((channel) => channel.toString(16).padStart(2, "0")).join("")); }} className="relative flex h-11 w-full touch-none select-none items-center">
            <Slider.Track className="relative h-2 grow rounded-full" style={{ background: "linear-gradient(to right, rgb(" + from.join(",") + "), rgb(" + to.join(",") + "))" }} />
            <Slider.Thumb aria-label={label + "-Farbanteil"} className="block h-5 w-5 rounded-full bg-[#faf8f5] ring-2 ring-[#003d55] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a15523]" />
          </Slider.Root>
        </div>;
      })}</div>
      <StitchButton type="button" className="w-full" disabled={!normalized || disabled} onClick={apply}>Farbe übernehmen</StitchButton>
    </PopoverContent>
  </Popover>;
}
