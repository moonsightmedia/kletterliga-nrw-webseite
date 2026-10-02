import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Saisonfeedback from "@/pages/Saisonfeedback";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/services/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/supabase")>();
  return { ...actual, supabase: { ...actual.supabase, functions: { invoke } } };
});

const renderForm = () => render(<MemoryRouter><Saisonfeedback /></MemoryRouter>);
const send = () => fireEvent.click(screen.getByRole("button", { name: /Feedback absenden/i }));

describe("season feedback v4", () => {
  beforeEach(() => {
    invoke.mockReset();
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-10-01T12:00:00+02:00").getTime());
  });
  afterEach(() => vi.restoreAllMocks());

  it("requires a perspective and lets late newcomers skip speculative detail questions", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    renderForm();

    send();
    expect(screen.getByRole("alert")).toHaveTextContent("Bitte wähle zuerst");
    expect(invoke).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "Ich habe erst spät oder nach der Saison davon erfahren" }));
    expect(screen.getByRole("textbox", { name: "Wo oder wann bist du auf die Kletterliga aufmerksam geworden?" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Mir fehlte die Zeit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Mehr Routen" })).not.toBeInTheDocument();
    send();

    await waitFor(() => expect(screen.getByText("DANKE FÜR DEIN FEEDBACK!")).toBeInTheDocument());
    const payload = invoke.mock.calls[0][1].body;
    expect(payload).toEqual(expect.objectContaining({ survey_version: 4, participation: "not_participated", main_barrier: "", deep_dive_topics: [] }));
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("profile_id");
  });

  it("asks informed nonparticipants for one main reason and an optional technical detail", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Ich kannte die Liga, habe aber nicht mitgemacht" }));
    send();
    expect(screen.getByRole("alert")).toHaveTextContent("wichtigsten Grund");
    expect(invoke).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "Anmeldung oder App haben nicht funktioniert" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Was hat bei Anmeldung oder App nicht funktioniert?" }), { target: { value: "Der Login blieb hängen." } });
    fireEvent.click(screen.getByRole("radio", { name: "Mir fehlte die Zeit" }));
    expect(screen.queryByRole("textbox", { name: "Was hat bei Anmeldung oder App nicht funktioniert?" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Anmeldung oder App haben nicht funktioniert" }));
    expect(screen.getByRole("textbox", { name: "Was hat bei Anmeldung oder App nicht funktioniert?" })).toHaveValue("");
    fireEvent.change(screen.getByRole("textbox", { name: "Was hat bei Anmeldung oder App nicht funktioniert?" }), { target: { value: "Der Login blieb hängen." } });
    send();

    await waitFor(() => expect(invoke).toHaveBeenCalledWith("submit-season-feedback", { body: expect.objectContaining({
      survey_version: 4, participation: "followed", main_barrier: "registration", registration_detail: "Der Login blieb hängen.",
    }) }));
  });

  it("asks about the semifinal only when an active climber was eligible", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Ich bin 2026 mitgeklettert" }));
    expect(screen.getByRole("radio", { name: "Nein, ich bin nicht startberechtigt" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Nein, ich nehme nicht teil" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Ja, ich bin fürs Halbfinale startberechtigt" }));
    fireEvent.click(screen.getByRole("radio", { name: "Nein, ich nehme nicht teil" }));
    fireEvent.click(screen.getByRole("radio", { name: "Die Finalanmeldung hat nicht funktioniert" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Möchtest du dazu noch etwas erklären?" }), { target: { value: "Die Anmeldung lud nicht." } });
    fireEvent.click(screen.getByRole("radio", { name: "Nein, ich bin nicht startberechtigt" }));
    expect(screen.queryByRole("radio", { name: "Die Finalanmeldung hat nicht funktioniert" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Ja, ich bin fürs Halbfinale startberechtigt" }));
    expect(screen.getByRole("radio", { name: "Nein, ich nehme nicht teil" })).not.toBeChecked();
    send();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("submit-season-feedback", { body: expect.objectContaining({
      participation: "active", finale_eligibility: "yes", finale_attendance: "", finale_reason: "", finale_detail: "",
    }) }));
  });

  it("opens only selected deep-dive topics and clears hidden answers", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Ich bin 2026 mitgeklettert" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Hallen & Wege" }));
    expect(screen.getByRole("radio", { name: "Mehr Partnerhallen zur Auswahl" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Eine feste Anzahl aus einem größeren Hallenpool wählen" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Mehr Routen" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Mehr Partnerhallen zur Auswahl" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Hallen & Wege" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Hallen & Wege" }));
    expect(screen.getByRole("radio", { name: "Mehr Partnerhallen zur Auswahl" })).not.toBeChecked();
    send();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("submit-season-feedback", { body: expect.objectContaining({
      deep_dive_topics: ["halls"], hall_pool: "", hall_visits: "",
    }) }));
  });

  it("separates a skipped hall from dropping a low hall score", () => {
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Ich bin 2026 mitgeklettert" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Hallen & Wege" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Wertung & Streichstationen" }));
    expect(screen.getByText("Wie sollte festgelegt werden, welche Hallen man für die Wertung besuchen muss?")).toBeInTheDocument();
    expect(screen.getByText("Wenn alle Pflicht-Hallen besucht wurden: Soll eine schwache Hallenwertung aus der Rangliste herausfallen?")).toBeInTheDocument();
  });

  it("clears branch-specific and deep-dive answers when the perspective changes", () => {
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Ich bin 2026 mitgeklettert" }));
    fireEvent.click(screen.getByRole("radio", { name: "Ja, ich bin fürs Halbfinale startberechtigt" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Routen" }));
    fireEvent.click(screen.getByRole("radio", { name: "Mehr Routen" }));
    fireEvent.click(screen.getByRole("radio", { name: "Ich kannte die Liga, habe aber nicht mitgemacht" }));
    expect(screen.queryByRole("radio", { name: "Ja, ich bin fürs Halbfinale startberechtigt" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Mehr Routen" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Routen" })).not.toBeChecked();
  });

  it("uses past-tense semifinal questions after the final day", () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-10-04T12:00:00+02:00").getTime());
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Ich bin 2026 mitgeklettert" }));
    expect(screen.getByText("Warst du für das Halbfinale startberechtigt?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Ja, ich war fürs Halbfinale startberechtigt" }));
    expect(screen.getByText("Hast du am Halbfinale am 3. Oktober teilgenommen?")).toBeInTheDocument();
  });
});
