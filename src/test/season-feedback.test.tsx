import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Saisonfeedback from "@/pages/Saisonfeedback";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/services/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/supabase")>();
  return { ...actual, supabase: { ...actual.supabase, functions: { invoke } } };
});

describe("season feedback v2", () => {
  beforeEach(() => invoke.mockReset());

  it("asks nonparticipants for a reason and a concrete wish, without identity data", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    render(<MemoryRouter><Saisonfeedback /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /Feedback absenden/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Bitte wähle zuerst");
    expect(invoke).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "Ich war 2026 nicht dabei" }));
    expect(screen.getByText("Was hat dich 2026 von einer Teilnahme abgehalten?")).toBeInTheDocument();
    expect(screen.queryByText("Was hat 2026 gut funktioniert?")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Feedback absenden/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("mindestens einen Grund");

    fireEvent.click(screen.getByRole("checkbox", { name: "Wege oder Hallen zu weit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Was war für dich der entscheidende Punkt?" }), { target: { value: "Die nächste Halle war zu weit weg." } });
    fireEvent.click(screen.getByRole("radio", { name: "Mehr Routen" }));
    fireEvent.click(screen.getByRole("radio", { name: "Mehr Auswahl der Hallen" }));
    fireEvent.click(screen.getByRole("radio", { name: "Ja, Streichstationen wären gut" }));
    fireEvent.click(screen.getByRole("button", { name: /Feedback absenden/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("wichtigsten Wunsch");

    fireEvent.change(screen.getByRole("textbox", { name: "Was wünschst du dir für die nächste Saison?" }), { target: { value: "Eine Halle in meiner Region und eine flexible Streichstation." } });
    fireEvent.click(screen.getByRole("button", { name: /Feedback absenden/i }));
    await waitFor(() => expect(screen.getByText("DANKE FÜR DEIN FEEDBACK!")).toBeInTheDocument());
    expect(invoke).toHaveBeenCalledWith("submit-season-feedback", { body: expect.objectContaining({
      survey_version: 2,
      participation: "not_participated",
      non_participation_reasons: ["travel"],
      route_quantity: "more",
      hall_choice: "more_choice",
      drop_stations: "yes",
      top_wish: "Eine Halle in meiner Region und eine flexible Streichstation.",
    }) });
    const payload = invoke.mock.calls[0][1].body;
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("profile_id");
  });

  it("shows active participants a different reflection instead of nonparticipation reasons", () => {
    const { container } = render(<MemoryRouter><Saisonfeedback /></MemoryRouter>);
    expect(container.querySelectorAll("main")).toHaveLength(1);
    fireEvent.click(screen.getByRole("radio", { name: "Ich war 2026 nicht dabei" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Zu wenig Zeit" }));
    fireEvent.click(screen.getByRole("radio", { name: "Ich habe mitgeklettert" }));
    expect(screen.getByRole("textbox", { name: "Was hat 2026 gut funktioniert?" })).toBeInTheDocument();
    expect(screen.queryByText("Was hat dich 2026 von einer Teilnahme abgehalten?")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Ich war 2026 nicht dabei" }));
    expect(screen.getByRole("checkbox", { name: "Zu wenig Zeit" })).not.toBeChecked();
  });
});
