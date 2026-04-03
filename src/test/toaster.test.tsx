import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";

const TOAST_REMOVE_DELAY = 1_000_000;

const renderToaster = (initialPath = "/") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Toaster />
    </MemoryRouter>,
  );

const resetToastState = () => {
  let handle: ReturnType<typeof toast> | undefined;

  act(() => {
    handle = toast({
      title: "__cleanup__",
      description: "__cleanup__",
    });
  });

  act(() => {
    handle?.dismiss();
    vi.advanceTimersByTime(TOAST_REMOVE_DELAY);
  });
};

describe("Toaster", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    resetToastState();
    cleanup();
    vi.useRealTimers();
  });

  it("rendert Success-Banner im Stitch-V2-Layout", () => {
    renderToaster("/app");

    act(() => {
      toast({
        title: "Ergebnis gespeichert",
        description: "Flash-Versuch in Sektor B erfolgreich gemeldet.",
        variant: "success",
      });
    });

    expect(screen.getByText("Ergebnis gespeichert")).toBeInTheDocument();
    expect(
      screen.getByText("Flash-Versuch in Sektor B erfolgreich gemeldet."),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-toast-variant="success"]')).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("rendert Destructive-Banner mit Error-Farbvariante", () => {
    renderToaster("/app/admin/gym");

    act(() => {
      toast({
        title: "Fehler",
        description: "Die Halle konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    });

    expect(screen.getByText("Fehler")).toBeInTheDocument();
    expect(
      screen.getByText("Die Halle konnte nicht gespeichert werden."),
    ).toBeInTheDocument();
    const toastRoot = document.querySelector('[data-toast-variant="destructive"]');
    expect(toastRoot).toBeInTheDocument();
    expect(toastRoot).toHaveClass("bg-[#ffdad6]");
  });

  it("positioniert Participant-Toasts direkt unter der Topbar", () => {
    renderToaster("/app/profile");

    act(() => {
      toast({
        title: "Link kopiert",
        description: "Der Seitenlink wurde in die Zwischenablage kopiert.",
      });
    });

    const viewport = document.querySelector("[data-toast-viewport]");
    expect(viewport).toHaveClass("top-16");
    expect(viewport).toHaveClass("px-0");
    expect(document.querySelector('[data-toast-variant="default"]')).toBeInTheDocument();
  });

  it("verwendet Admin-Offsets fuer Mobile und Desktop", () => {
    renderToaster("/app/admin/league/gyms");

    const viewport = document.querySelector("[data-toast-viewport]");
    expect(viewport).toHaveClass("top-[3.8125rem]");
    expect(viewport).toHaveClass("md:left-auto");
    expect(viewport).toHaveClass("md:right-5");
    expect(viewport).toHaveClass("md:w-[26rem]");
    expect(viewport).toHaveClass("lg:right-8");
    expect(viewport).toHaveClass("lg:w-[28rem]");
  });

  it("verwendet Auth-Offsets fuer headerlose Screens", () => {
    renderToaster("/app/login");

    const viewport = document.querySelector("[data-toast-viewport]");
    expect(viewport).toHaveClass("top-4");
    expect(viewport).toHaveClass("px-4");
    expect(viewport).toHaveClass("sm:top-6");
  });
});
