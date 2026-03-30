import { formatGymNameLines } from "@/components/gyms/formatGymNameLines";

describe("formatGymNameLines", () => {
  it("splits chimpanzodrom variants consistently for compact cards", () => {
    expect(formatGymNameLines("Chimpanzodrom")).toEqual(["Chimpanzo", "drom"]);
    expect(formatGymNameLines("Chimpanzodrome")).toEqual(["Chimpanzo", "drome"]);
    expect(formatGymNameLines("Chimpanzodrom Frechen")).toEqual(["Chimpanzo", "drom"]);
  });

  it("keeps other explicit overrides intact", () => {
    expect(formatGymNameLines("Kletterzentrum OWL")).toEqual(["Kletter", "zentrum", "OWL"]);
  });
});
