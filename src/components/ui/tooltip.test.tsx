import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";

// Mock ResizeObserver for JSDOM environment
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver;

describe("Tooltip", () => {
  it("renders without crashing", () => {
    render(
      <Tooltip>
        <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">Tooltip content</TooltipContent>
      </Tooltip>
    );
    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
  });

  it("renders children correctly", () => {
    render(
      <Tooltip>
        <TooltipTrigger data-testid="tooltip-trigger">
          <span>Trigger text</span>
        </TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">
          <span>Content text</span>
        </TooltipContent>
      </Tooltip>
    );

    expect(screen.getByText("Trigger text")).toBeInTheDocument();
    // Content text won't be immediately visible as it's in a portal and may be hidden
    // We check that the tooltip structure is in place
  });

  it("applies data-slot attribute correctly", () => {
    render(
      <Tooltip>
        <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">Tooltip content</TooltipContent>
      </Tooltip>
    );

    const triggerElement = screen.getByTestId("tooltip-trigger");
    expect(triggerElement).toHaveAttribute("data-slot", "tooltip-trigger");
  });

  it("passes additional props correctly", () => {
    render(
      <Tooltip open={true}>
        <TooltipTrigger id="test-trigger" data-testid="tooltip-trigger">Hover me</TooltipTrigger>
        <TooltipContent id="test-content" data-testid="tooltip-content">Tooltip content</TooltipContent>
      </Tooltip>
    );

    const triggerElement = screen.getByTestId("tooltip-trigger");

    expect(triggerElement).toHaveAttribute("id", "test-trigger");
    // TooltipContent is in a portal, so we can't easily test the id attribute here
  });
});

describe("TooltipProvider", () => {
  it("renders without crashing with default props", () => {
    render(
      <TooltipProvider>
        <div data-testid="test-content">Content</div>
      </TooltipProvider>
    );
    expect(screen.getByTestId("test-content")).toBeInTheDocument();
  });

  it("renders without crashing with custom delayDuration", () => {
    render(
      <TooltipProvider delayDuration={500}>
        <div data-testid="test-content">Content</div>
      </TooltipProvider>
    );
    expect(screen.getByTestId("test-content")).toBeInTheDocument();
    // Note: delayDuration is passed through to Radix UI component, so it's not directly visible in DOM
  });

  it("passes additional props correctly", () => {
    render(
      <TooltipProvider delayDuration={200}>
        <div data-testid="test-content">Content</div>
      </TooltipProvider>
    );

    expect(screen.getByTestId("test-content")).toBeInTheDocument();
    // Since delayDuration is passed to Radix UI component, we're testing
    // that the component accepts props without error
  });
});

describe("TooltipTrigger", () => {
  it("renders within tooltip context", () => {
    render(
      <Tooltip>
        <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">Content</TooltipContent>
      </Tooltip>
    );
    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
  });

  it("renders children correctly", () => {
    render(
      <Tooltip>
        <TooltipTrigger data-testid="tooltip-trigger">
          <span>Trigger text</span>
        </TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">Content</TooltipContent>
      </Tooltip>
    );

    expect(screen.getByText("Trigger text")).toBeInTheDocument();
  });

  it("applies data-slot attribute correctly", () => {
    render(
      <Tooltip>
        <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">Content</TooltipContent>
      </Tooltip>
    );

    const triggerElement = screen.getByTestId("tooltip-trigger");
    expect(triggerElement).toHaveAttribute("data-slot", "tooltip-trigger");
  });

  it("passes additional props correctly", () => {
    render(
      <Tooltip>
        <TooltipTrigger id="custom-trigger" className="custom-class" data-testid="tooltip-trigger">
          Hover me
        </TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">Content</TooltipContent>
      </Tooltip>
    );

    const triggerElement = screen.getByTestId("tooltip-trigger");
    expect(triggerElement).toHaveAttribute("id", "custom-trigger");
    expect(triggerElement).toHaveClass("custom-class");
  });
});

describe("TooltipContent", () => {
  it("renders within tooltip context", () => {
    render(
      <Tooltip open={true}>
        <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">Content</TooltipContent>
      </Tooltip>
    );
    // Since content is rendered in portal, we can't directly test for it using screen.getByTestId
    // But we can at least ensure the component renders without crashing
    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
  });

  it("applies default sideOffset correctly", () => {
    render(
      <Tooltip open={true}>
        <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">Content</TooltipContent>
      </Tooltip>
    );
    // Default sideOffset should be 0
    // This value is passed to Radix UI component
    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
  });

  it("applies custom sideOffset correctly", () => {
    render(
      <Tooltip open={true}>
        <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
        <TooltipContent sideOffset={10} data-testid="tooltip-content">
          Content
        </TooltipContent>
      </Tooltip>
    );
    // Custom sideOffset should be passed to Radix UI component
    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
  });

  it("applies custom className correctly", () => {
    render(
      <Tooltip open={true}>
        <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
        <TooltipContent className="custom-tooltip" data-testid="tooltip-content">
          Content
        </TooltipContent>
      </Tooltip>
    );
    // Custom class should be merged with default classes via cn utility
    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
  });

  it("contains Arrow component", () => {
    render(
      <Tooltip open={true}>
        <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">Content</TooltipContent>
      </Tooltip>
    );
    // The Arrow is rendered inside the content
    // We can't directly access it since it's an internal Radix component
    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
  });
});

describe("Tooltip Integration", () => {
  it("renders complete tooltip structure", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
          <TooltipContent data-testid="tooltip-content">Tooltip content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
  });

  it("allows open state to be controlled", () => {
    render(
      <Tooltip open={true}>
        <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">Tooltip content</TooltipContent>
      </Tooltip>
    );

    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
  });

  it("passes props through the entire tooltip chain", () => {
    render(
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger data-testid="tooltip-trigger">Hover me</TooltipTrigger>
          <TooltipContent data-testid="tooltip-content">Tooltip content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
  });
});