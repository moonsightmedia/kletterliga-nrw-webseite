import { describe, expect, it } from "vitest";
import { filterSurveyTelemetry } from "@/lib/surveyTelemetry";
describe("2027 survey telemetry exclusion", () => {
  it("excludes the season/poll routes with fragments, querystrings and trailing slash", () => {
    for (const url of ["/saison/2027", "/saison/2027/", "/saison/2027#ideen-2027", "/ideen-2027?test=1", "/ideen-2027/widerruf", "https://www.kletterliga-nrw.de/saison/2027?x=1"]) expect(filterSurveyTelemetry({url})).toBeNull();
  });
  it("preserves other routes without adding identifiers or survey state", () => {
    const event = {url:"https://www.kletterliga-nrw.de/saison/2026",type:"pageview"};
    expect(filterSurveyTelemetry(event)).toBe(event);
  });
});
