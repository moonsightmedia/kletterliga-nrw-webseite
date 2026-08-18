import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";

describe("ScrollToTop", () => {
  it("scrolls a shared hash link to its rendered section", async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollIntoView",
    );
    const scrollIntoView = vi.fn();

    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      render(
        <MemoryRouter initialEntries={["/finale#finale-sale-stand"]}>
          <ScrollToTop />
          <h2 id="finale-sale-stand">Sale-Stand vom Kletterladen NRW</h2>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
      });
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalDescriptor);
      } else {
        delete HTMLElement.prototype.scrollIntoView;
      }
    }
  });
});
