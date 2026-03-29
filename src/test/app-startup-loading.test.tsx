import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppRouteLoadingState } from "@/app/components/AppRouteLoadingState";
import { AppStartupSplashOverlay } from "@/app/components/AppStartupSplashOverlay";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import {
  APP_STARTUP_SPLASH_KEY,
  APP_STARTUP_SPLASH_MIN_DURATION_MS,
  APP_STARTUP_SPLASH_VALUE,
} from "@/app/startup/appStartupSplash";

describe("app startup loading state", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it("shows the sponsor splash on the first app login load", () => {
    render(
      <AppRouteLoadingState
        pathname="/app/login"
        title="App wird geladen"
        description="Die Login-Seite wird vorbereitet."
      />,
    );

    expect(screen.getByText("App startet")).toBeInTheDocument();
    expect(screen.getByText("Powered by Kletterladen NRW")).toBeInTheDocument();
    expect(screen.getByAltText("Logo Kletterladen NRW")).toBeInTheDocument();
    expect(screen.queryByText("Hauptsponsor")).not.toBeInTheDocument();
    expect(screen.queryByText("kletterladen.nrw")).not.toBeInTheDocument();
  });

  it("does not show the sponsor splash again after the session flag is set", () => {
    window.sessionStorage.setItem(APP_STARTUP_SPLASH_KEY, APP_STARTUP_SPLASH_VALUE);

    render(
      <AppRouteLoadingState
        pathname="/app/login"
        title="App wird geladen"
        description="Die Login-Seite wird vorbereitet."
      />,
    );

    expect(screen.queryByText("Powered by Kletterladen NRW")).not.toBeInTheDocument();
    expect(screen.getByText("Inhalt wird vorbereitet")).toBeInTheDocument();
  });

  it("never shows the sponsor splash on public routes", () => {
    render(
      <AppRouteLoadingState
        pathname="/liga"
        title="Seite wird geladen"
        description="Die Seite wird vorbereitet."
      />,
    );

    expect(screen.queryByText("Powered by Kletterladen NRW")).not.toBeInTheDocument();
  });

  it("marks the sponsor splash as seen once an app layout mounts", () => {
    render(
      <MemoryRouter initialEntries={["/app/login"]}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/app/login" element={<div>Login</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(window.sessionStorage.getItem(APP_STARTUP_SPLASH_KEY)).toBe(APP_STARTUP_SPLASH_VALUE);
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("keeps the startup splash visible for a short minimum duration", () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={["/app/login"]}>
        <AppStartupSplashOverlay />
      </MemoryRouter>,
    );

    expect(screen.getByText("Powered by Kletterladen NRW")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(APP_STARTUP_SPLASH_MIN_DURATION_MS - 1);
    });

    expect(screen.getByText("Powered by Kletterladen NRW")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.queryByText("Powered by Kletterladen NRW")).not.toBeInTheDocument();
  });
});
