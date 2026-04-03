import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AuthCallbackRedirect } from "@/app/auth/AuthCallbackRedirect";

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</div>;
};

describe("AuthCallbackRedirect", () => {
  it("redirects signup callbacks from the root URL to the confirm route", async () => {
    render(
      <MemoryRouter initialEntries={["/#access_token=test-token&refresh_token=refresh&type=signup"]}>
        <AuthCallbackRedirect />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/app/auth/confirm#access_token=test-token&refresh_token=refresh&type=signup",
      );
    });
  });

  it("redirects recovery callbacks to the reset-password route", async () => {
    render(
      <MemoryRouter initialEntries={["/?token_hash=test-hash&type=recovery"]}>
        <AuthCallbackRedirect />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/app/auth/reset-password?token_hash=test-hash&type=recovery",
      );
    });
  });

  it("leaves regular anchor links untouched", async () => {
    render(
      <MemoryRouter initialEntries={["/#hallen"]}>
        <AuthCallbackRedirect />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/#hallen");
    });
  });
});
