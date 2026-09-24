export const competitionRouteColors = [
  { label: "Rot", value: "#dc3545" },
  { label: "Orange", value: "#ed7b25" },
  { label: "Gelb", value: "#f2cf35" },
  { label: "Grün", value: "#43954a" },
  { label: "Mint", value: "#71c7b0" },
  { label: "Blau", value: "#327bc1" },
  { label: "Violett", value: "#8951ac" },
  { label: "Pink", value: "#e66eab" },
  { label: "Schwarz", value: "#252525" },
  { label: "Weiß", value: "#ffffff" },
  { label: "Grau", value: "#939b9f" },
  { label: "Braun", value: "#95613c" },
] as const;

/** Keep legacy free-text colors readable until an admin chooses a swatch. */
export function competitionRouteColor(value: string) {
  const color = competitionRouteColors.find((option) => option.value === value.toLowerCase() || option.label.toLocaleLowerCase("de") === value.toLocaleLowerCase("de"));
  return color ?? { label: value || "Noch keine Farbe", value: /^#[0-9a-f]{6}$/i.test(value) ? value : "#a15523" };
}
