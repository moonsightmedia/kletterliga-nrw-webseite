export const formatGymNameLines = (name: string) => {
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
