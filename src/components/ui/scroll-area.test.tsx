import * as React from "react";
import { render, screen } from "@testing-library/react";
import { ScrollArea, ScrollBar } from "./scroll-area";

describe("ScrollArea", () => {
  it("renders without crashing", () => {
    render(
      <ScrollArea data-testid="scroll-area">
        <div>Scrollable content</div>
      </ScrollArea>
    );
    expect(screen.getByTestId("scroll-area")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <ScrollArea className="custom-class" data-testid="scroll-area">
        <div>Scrollable content</div>
      </ScrollArea>
    );
    const scrollAreaElement = screen.getByTestId("scroll-area");
    expect(scrollAreaElement).toHaveClass("custom-class");
    expect(scrollAreaElement).toHaveClass("relative");
  });

  it("renders children correctly", () => {
    render(
      <ScrollArea data-testid="scroll-area">
        <div data-testid="child-element">Child content</div>
      </ScrollArea>
    );
    expect(screen.getByTestId("child-element")).toBeInTheDocument();
    expect(screen.getByTestId("child-element")).toHaveTextContent("Child content");
  });

  it("renders with proper structure", () => {
    const { container } = render(
      <ScrollArea data-testid="scroll-area">
        <div>Scrollable content</div>
      </ScrollArea>
    );
    // Check that the root element has expected attributes
    const rootElement = container.querySelector('[data-slot="scroll-area"]');
    expect(rootElement).toBeInTheDocument();
    expect(rootElement).toHaveClass("relative");
  });
});

// Focus on ScrollArea functionality tests only since ScrollBar is internal
describe("ScrollArea functionality", () => {
  it("correctly passes props to Radix UI primitives", () => {
    render(
      <ScrollArea data-testid="scroll-area" dir="rtl">
        <div>Content</div>
      </ScrollArea>
    );

    // Check that the root element has the dir attribute passed through
    const scrollAreaElement = screen.getByTestId("scroll-area");
    expect(scrollAreaElement).toHaveAttribute("dir", "rtl");
  });
});

// Test additional functionality
describe("ScrollArea Props", () => {
  it("forwards additional props correctly", () => {
    render(
      <ScrollArea aria-label="Custom scroll area" id="custom-id" data-testid="scroll-area">
        <div>Content</div>
      </ScrollArea>
    );

    const scrollArea = screen.getByTestId("scroll-area");
    expect(scrollArea).toHaveAttribute("aria-label", "Custom scroll area");
    expect(scrollArea).toHaveAttribute("id", "custom-id");
  });
});

// Accessibility tests
describe("Accessibility", () => {
  it("has proper viewport attributes", () => {
    const { container } = render(
      <ScrollArea data-testid="scroll-area">
        <div>Content</div>
      </ScrollArea>
    );

    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');
    // The viewport should have the correct data-slot attribute
    expect(viewport).toBeInTheDocument();
    expect(viewport).toHaveAttribute("data-slot", "scroll-area-viewport");
  });
});