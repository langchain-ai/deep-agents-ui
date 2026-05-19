import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubAgentIndicator } from "./SubAgentIndicator";
import type { SubAgent } from "../../types/types";

// Mock the module styles
jest.mock("./SubAgentIndicator.module.scss", () => ({
  container: "container",
  content: "content",
  header: "header",
  name: "name",
  description: "description",
  statusCompleted: "statusCompleted",
  statusError: "statusError",
  statusActive: "statusActive",
  statusPending: "statusPending",
}));

// Mock the Lucide icons
jest.mock("lucide-react", () => ({
  CheckCircle: ({ className }: { className?: string }) => (
    <span data-testid="check-circle" className={className}>✓</span>
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <span data-testid="alert-circle" className={className}>⚠</span>
  ),
  Clock: ({ className }: { className?: string }) => (
    <span data-testid="clock" className={className}>-clock-</span>
  ),
  Loader: ({ className }: { className?: string }) => (
    <span data-testid="loader" className={className}>🔄</span>
  ),
}));

describe("SubAgentIndicator", () => {
  const mockOnClick = jest.fn();
  const baseSubAgent: SubAgent = {
    id: "1",
    name: "Test Agent",
    subAgentName: "Test SubAgent",
    input: "Test input",
    status: "pending",
  };

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it("renders correctly with basic props", () => {
    render(<SubAgentIndicator subAgent={baseSubAgent} onClick={mockOnClick} />);
    
    expect(screen.getByText("Test SubAgent")).toBeInTheDocument();
    expect(screen.getByText("Test input")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders with completed status and correct icon", () => {
    const subAgent: SubAgent = {
      ...baseSubAgent,
      status: "completed",
    };
    
    render(<SubAgentIndicator subAgent={subAgent} onClick={mockOnClick} />);
    
    expect(screen.getByTestId("check-circle")).toBeInTheDocument();
    expect(screen.getByTestId("check-circle")).toHaveClass("statusCompleted");
  });

  it("renders with error status and correct icon", () => {
    const subAgent: SubAgent = {
      ...baseSubAgent,
      status: "error",
    };
    
    render(<SubAgentIndicator subAgent={subAgent} onClick={mockOnClick} />);
    
    expect(screen.getByTestId("alert-circle")).toBeInTheDocument();
    expect(screen.getByTestId("alert-circle")).toHaveClass("statusError");
  });

  it("renders with pending status and correct icon", () => {
    const subAgent: SubAgent = {
      ...baseSubAgent,
      status: "pending" as const,
    };

    render(<SubAgentIndicator subAgent={subAgent} onClick={mockOnClick} />);

    expect(screen.getByTestId("loader")).toBeInTheDocument();
    expect(screen.getByTestId("loader")).toHaveClass("statusActive");
  });

  it("renders with active status and correct icon", () => {
    const subAgent: SubAgent = {
      ...baseSubAgent,
      status: "active",
    };

    render(<SubAgentIndicator subAgent={subAgent} onClick={mockOnClick} />);

    expect(screen.getByTestId("clock")).toBeInTheDocument();
    expect(screen.getByTestId("clock")).toHaveClass("statusPending");
  });

  it("calls onClick when button is clicked", () => {
    render(<SubAgentIndicator subAgent={baseSubAgent} onClick={mockOnClick} />);
    
    fireEvent.click(screen.getByRole("button"));
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("displays the correct aria-label", () => {
    render(<SubAgentIndicator subAgent={baseSubAgent} onClick={mockOnClick} />);
    
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label", 
      "View Test Agent details"
    );
  });

  it("renders subAgentName correctly", () => {
    render(<SubAgentIndicator subAgent={baseSubAgent} onClick={mockOnClick} />);
    
    expect(screen.getByText("Test SubAgent")).toBeInTheDocument();
  });

  it("renders input correctly", () => {
    render(<SubAgentIndicator subAgent={baseSubAgent} onClick={mockOnClick} />);
    
    expect(screen.getByText("Test input")).toBeInTheDocument();
  });

  it("handles string input correctly", () => {
    const subAgentWithStringInput: SubAgent = {
      ...baseSubAgent,
      input: "Test string input",
    };

    render(
      <SubAgentIndicator
        subAgent={subAgentWithStringInput}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText("Test string input")).toBeInTheDocument();
  });
});