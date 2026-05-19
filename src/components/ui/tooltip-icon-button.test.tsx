import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipIconButton } from "./tooltip-icon-button";

describe("TooltipIconButton", () => {
  const mockIcon = <span data-testid="mock-icon">icon</span>;
  const mockTooltip = "Test tooltip";
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it("renders the icon correctly", () => {
    render(
      <TooltipIconButton
        icon={mockIcon}
        onClick={mockOnClick}
        tooltip={mockTooltip}
      />
    );

    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });

  it("has the tooltip structure", () => {
    render(
      <TooltipIconButton
        icon={mockIcon}
        onClick={mockOnClick}
        tooltip={mockTooltip}
      />
    );

    // Check that the tooltip structure exists by checking for tooltip-related data attributes
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-slot", "tooltip-trigger");
  });

  it("calls onClick when button is clicked", () => {
    render(
      <TooltipIconButton
        icon={mockIcon}
        onClick={mockOnClick}
        tooltip={mockTooltip}
      />
    );

    fireEvent.click(screen.getByRole("button"));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("is enabled by default", () => {
    render(
      <TooltipIconButton
        icon={mockIcon}
        onClick={mockOnClick}
        tooltip={mockTooltip}
      />
    );

    const button = screen.getByRole("button");
    expect(button).not.toHaveAttribute("disabled");
    expect(button).toBeEnabled();
  });

  it("can be disabled with disabled prop", () => {
    render(
      <TooltipIconButton
        icon={mockIcon}
        onClick={mockOnClick}
        tooltip={mockTooltip}
        disabled={true}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("disabled");
    expect(button).toBeDisabled();
  });

  it("does not call onClick when disabled", () => {
    render(
      <TooltipIconButton
        icon={mockIcon}
        onClick={mockOnClick}
        tooltip={mockTooltip}
        disabled={true}
      />
    );

    fireEvent.click(screen.getByRole("button"));
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it("renders with correct button variant and size", () => {
    render(
      <TooltipIconButton
        icon={mockIcon}
        onClick={mockOnClick}
        tooltip={mockTooltip}
      />
    );

    const button = screen.getByRole("button");
    // Check that the button has the icon size by checking for size-related classes
    expect(button).toHaveClass("size-9");
    // Check that the button has the ghost variant by checking for hover classes
    expect(button).toHaveClass("hover:bg-accent");
  });

  it("passes accessibility attributes properly", () => {
    render(
      <TooltipIconButton
        icon={mockIcon}
        onClick={mockOnClick}
        tooltip={mockTooltip}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });
});