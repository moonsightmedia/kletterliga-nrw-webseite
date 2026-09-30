import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Saisonfeedback from "@/pages/Saisonfeedback";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/services/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/supabase")>();
  return { ...actual, supabase: { ...actual.supabase, functions: { invoke } } };
});

describe("season feedback v3", () => {
  beforeEach(() => invoke.mockReset());

  it("lets newcomers answer without inventing a season wish, without identity data", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    render(<MemoryRouter><Saisonfeedback /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /Feedback absenden/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Bitte wähle zuerst");
    expect(invoke).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "Ich habe nicht mitgeklettert und die Liga kaum verfolgt" }));
    expect(screen.getByText("Wie kam es dazu, dass du 2026 nicht mitgeklettert bist?")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Saisonanmeldung oder App haben nicht funktioniert" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Ich kannte die Liga noch nicht" })).toBeInTheDocument();
    expect(screen.queryByText("Was hat 2026 gut funktioniert?")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Feedback absenden/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("mindestens einen Grund");

    fireEvent.click(screen.getByRole("checkbox", { name: "Wege oder Hallen zu weit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Was war für dich der entscheidende Punkt?" }), { target: { value: "Die nächste Halle war zu weit weg." } });
    fireEvent.click(screen.getByRole("radio", { name: "Mehr Routen" }));
    fireEvent.click(screen.getByRole("radio", { name: "Mehr Auswahl der Hallen" }));
    fireEvent.click(screen.getByRole("radio", { name: "Ja, Streichstationen wären gut" }));
    fireEvent.click(screen.getByRole("button", { name: /Feedback absenden/i }));
    await waitFor(() => expect(screen.getByText("DANKE FÜR DEIN FEEDBACK!")).toBeInTheDocument());
    expect(invoke).toHaveBeenCalledWith("submit-season-feedback", { body: expect.objectContaining({
      survey_version: 3,
      participation: "not_participated",
      non_participation_reasons: ["travel"],
      route_quantity: "more",
      hall_choice: "more_choice",
      drop_stations: "yes",
      top_wish: "",
    }) });
    const payload = invoke.mock.calls[0][1].body;
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("profile_id");
  });

  it("shows active participants a different reflection instead of nonparticipation reasons", () => {
    const { container } = render(<MemoryRouter><Saisonfeedback /></MemoryRouter>);
    expect(container.querySelectorAll("main")).toHaveLength(1);
    fireEvent.click(screen.getByRole("radio", { name: "Ich habe nicht mitgeklettert und die Liga kaum verfolgt" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Zu wenig Zeit" }));
    fireEvent.click(screen.getByRole("radio", { name: "Ich habe mitgeklettert" }));
    expect(screen.getByRole("textbox", { name: "Was hat 2026 gut funktioniert?" })).toBeInTheDocument();
    expect(screen.getByText("Wie sieht es mit deiner Teilnahme am Finale am 3. Oktober aus?")).toBeInTheDocument();
    expect(screen.queryByText("Wie kam es dazu, dass du 2026 nicht mitgeklettert bist?")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Ich habe nicht mitgeklettert und die Liga kaum verfolgt" }));
    expect(screen.getByRole("checkbox", { name: "Zu wenig Zeit" })).not.toBeChecked();
  });

  it("captures a separate finale reason from active climbers", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    render(<MemoryRouter><Saisonfeedback /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Ich habe mitgeklettert" }));
    fireEvent.click(screen.getByRole("radio", { name: "Nein, ich nehme nicht teil" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Die Finalanmeldung hat nicht funktioniert" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Möchtest du uns den Grund genauer erklären?" }), { target: { value: "Die Finalanmeldung lud nicht." } });
    fireEvent.change(screen.getByRole("textbox", { name: "Was wünschst du dir für die nächste Saison?" }), { target: { value: "Mehr Zeit für die Finalanmeldung." } });
    fireEvent.click(screen.getByRole("button", { name: /Feedback absenden/i }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("submit-season-feedback", { body: expect.objectContaining({
      survey_version: 3, participation: "active", finale_attendance: "no",
      finale_reasons: ["registration"], finale_detail: "Die Finalanmeldung lud nicht.",
    }) }));
  });

  it("asks for a specific technical hurdle and clears it when deselected", () => {
    render(<MemoryRouter><Saisonfeedback /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Ich habe die Liga verfolgt, aber nicht mitgeklettert" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Saisonanmeldung oder App haben nicht funktioniert" }));
    expect(screen.getByRole("textbox", { name: "Was genau hat technisch nicht funktioniert?" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Was genau hat technisch nicht funktioniert?" }), { target: { value: "Login funktionierte nicht" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Saisonanmeldung oder App haben nicht funktioniert" }));
    expect(screen.queryByRole("textbox", { name: "Was genau hat technisch nicht funktioniert?" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Saisonanmeldung oder App haben nicht funktioniert" }));
    expect(screen.getByRole("textbox", { name: "Was genau hat technisch nicht funktioniert?" })).toHaveValue("");
  });

  it("still requires a concrete wish from informed nonparticipants", () => {
    render(<MemoryRouter><Saisonfeedback /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Ich habe die Liga verfolgt, aber nicht mitgeklettert" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Zu wenig Zeit" }));
    fireEvent.click(screen.getByRole("button", { name: /Feedback absenden/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("wichtigsten Wunsch");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("clears finale reasons when the answer changes to taking part", () => {
    render(<MemoryRouter><Saisonfeedback /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Ich habe mitgeklettert" }));
    fireEvent.click(screen.getByRole("radio", { name: "Nein, ich nehme nicht teil" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Der Termin passt nicht" }));
    fireEvent.click(screen.getByRole("radio", { name: "Ja, ich nehme teil" }));
    expect(screen.queryByRole("checkbox", { name: "Der Termin passt nicht" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Nein, ich nehme nicht teil" }));
    expect(screen.getByRole("checkbox", { name: "Der Termin passt nicht" })).not.toBeChecked();
  });
});
