const normalizeGymName = (name: string) =>
  name
    .trim()
    .toLocaleLowerCase("de-DE")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const GYM_NAME_LINE_OVERRIDES: Record<string, string[]> = {
  chimpanzodrom: ["Chimpanzo", "drom"],
  chimpanzodromfrechen: ["Chimpanzo", "drom"],
  chimpanzodrome: ["Chimpanzo", "drome"],
  chimpanzodromefrechen: ["Chimpanzo", "drome"],
  schimpanzodrom: ["Schimpanzo", "drom"],
  schimpanzodromfrechen: ["Schimpanzo", "drom"],
  kletterfabrikkoln: ["Kletter", "fabrik", "Köln"],
  kletterzentrumowl: ["Kletter", "zentrum", "OWL"],
};

export const formatGymNameLines = (name: string) => {
  const override = GYM_NAME_LINE_OVERRIDES[normalizeGymName(name)];
  if (override) return override;

  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length <= 1) return [name];
  if (words.length === 2) return words;

  const totalLength = words.reduce((sum, word) => sum + word.length, 0);
  let bestSplitIndex = 1;
  let bestDifference = Number.POSITIVE_INFINITY;

  for (let index = 1; index < words.length; index += 1) {
    const firstLineLength = words.slice(0, index).join(" ").length;
    const secondLineLength = totalLength + (words.length - index - 1) - firstLineLength;
    const difference = Math.abs(firstLineLength - secondLineLength);

    if (difference < bestDifference) {
      bestDifference = difference;
      bestSplitIndex = index;
    }
  }

  return [words.slice(0, bestSplitIndex).join(" "), words.slice(bestSplitIndex).join(" ")];
};
