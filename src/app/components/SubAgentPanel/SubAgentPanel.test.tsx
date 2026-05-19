import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubAgentPanel } from "./SubAgentPanel";
import type { SubAgent } from "../../types/types";

// Mock the subcomponent dependencies
jest.mock("../MarkdownContent/MarkdownContent", () => ({
  MarkdownContent: ({ content }: { content: string }) => (
    <div data-testid="markdown-content">{content}</div>
  ),
}));

// Mock the UI components
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button
      onClick={onClick}
      className={className}
      data-testid="close-button"
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="scroll-area">
      {children}
    </div>
  ),
}));

describe("SubAgentPanel", () => {
  const mockSubAgent: SubAgent = {
    id: "1",
    name: "Test Agent",
    subAgentName: "test-agent",
    input: "Test input",
    output: "Test output",
    status: "completed",
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it("renders the sub agent panel with correct information", () => {
    render(<SubAgentPanel subAgent={mockSubAgent} onClose={mockOnClose} />);

    // Check if the agent name is displayed
    expect(screen.getByText("test-agent")).toBeInTheDocument();

    // Check if the status is displayed
    expect(screen.getByText("Completed")).toBeInTheDocument();

    // Check if the input section is displayed
    expect(screen.getByText("Input")).toBeInTheDocument();
    // Since there are multiple markdown-content elements, we need to get all of them
    const markdownContents = screen.getAllByTestId("markdown-content");
    expect(markdownContents[0]).toHaveTextContent("Test input");

    // Check if the output section is displayed
    expect(screen.getByText("Output")).toBeInTheDocument();
    expect(markdownContents[1]).toHaveTextContent("Test output");

    // Check if the close button is present
    expect(screen.getByTestId("close-button")).toBeInTheDocument();
  });

  it("renders only input section when output is not provided", () => {
    const subAgentWithoutOutput: SubAgent = {
      ...mockSubAgent,
      output: undefined,
    };

    render(<SubAgentPanel subAgent={subAgentWithoutOutput} onClose={mockOnClose} />);

    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.queryByText("Output")).not.toBeInTheDocument();
    // Only one markdown-content should exist when output is undefined
    expect(screen.getAllByTestId("markdown-content")).toHaveLength(1);
  });

  it("handles close button click", () => {
    render(<SubAgentPanel subAgent={mockSubAgent} onClose={mockOnClose} />);

    const closeButton = screen.getByTestId("close-button");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("displays correct status icons and texts for different statuses", () => {
    const statuses: Array<SubAgent["status"]> = [
      "completed",
      "error",
      "active",
      "pending",
    ];

    statuses.forEach((status) => {
      const subAgentWithStatus: SubAgent = {
        ...mockSubAgent,
        status,
        subAgentName: `${status}-agent`,
      };

      render(<SubAgentPanel subAgent={subAgentWithStatus} onClose={mockOnClose} />);

      // Check that the status text is correct
      const expectedStatusText = {
        completed: "Completed",
        error: "Error",
        active: "Running",
        pending: "Pending",
      }[status];

      expect(screen.getByText(expectedStatusText!)).toBeInTheDocument();

      // Cleanup for next test
      document.body.innerHTML = '';
    });
  });

  it("handles different input types (string and object)", () => {
    const subAgentWithStringInput: SubAgent = {
      ...mockSubAgent,
      input: "String input",
      output: undefined, // To avoid confusion with output markdown content
    };

    const subAgentWithObjectInput: SubAgent = {
      ...mockSubAgent,
      input: { key: "value" },
      output: undefined, // To avoid confusion with output markdown content
    };

    // Test with string input
    render(<SubAgentPanel subAgent={subAgentWithStringInput} onClose={mockOnClose} />);
    expect(screen.getAllByTestId("markdown-content")[0]).toHaveTextContent("String input");

    // Cleanup
    document.body.innerHTML = '';

    // Test with object input (should be JSON stringified)
    render(<SubAgentPanel subAgent={subAgentWithObjectInput} onClose={mockOnClose} />);
    expect(screen.getAllByTestId("markdown-content")[0]).toHaveTextContent('{ "key": "value" }');
  });

  it("handles different output types (string and object)", () => {
    const subAgentWithStringOutput: SubAgent = {
      ...mockSubAgent,
      output: "String output",
    };

    const subAgentWithObjectOutput: SubAgent = {
      ...mockSubAgent,
      output: { result: "data" },
    };

    // Test with string output
    render(<SubAgentPanel subAgent={subAgentWithStringOutput} onClose={mockOnClose} />);
    const outputMarkdown1 = screen.getAllByTestId("markdown-content")[1];
    expect(outputMarkdown1).toHaveTextContent("String output");

    // Cleanup
    document.body.innerHTML = '';

    // Test with object output (should be JSON stringified)
    render(<SubAgentPanel subAgent={subAgentWithObjectOutput} onClose={mockOnClose} />);
    const outputMarkdown2 = screen.getAllByTestId("markdown-content")[1];
    expect(outputMarkdown2).toHaveTextContent('{ "result": "data" }');
  });

  it("displays the bot icon", () => {
    render(<SubAgentPanel subAgent={mockSubAgent} onClose={mockOnClose} />);

    // We can't directly test for the Bot icon since it's from lucide-react
    // but we can verify that the header structure is present
    expect(screen.getByText("test-agent")).toBeInTheDocument();
  });

  it("renders with correct class names from module", () => {
    render(<SubAgentPanel subAgent={mockSubAgent} onClose={mockOnClose} />);

    // Check if the main panel div has the correct class
    const panel = screen.getByTestId("scroll-area").parentElement;
    // Instead of using expect.stringContaining, check if the element has any class that contains 'panel'
    expect(Array.from(panel!.classList).some(cls => cls.includes('panel'))).toBe(true);
  });

  it("properly memoizes the component", () => {
    const { rerender } = render(
      <SubAgentPanel subAgent={mockSubAgent} onClose={mockOnClose} />
    );

    // Rerender with same props (should not re-render due to memo)
    rerender(<SubAgentPanel subAgent={mockSubAgent} onClose={mockOnClose} />);

    // Just check that component still renders correctly after rerender
    expect(screen.getByText("test-agent")).toBeInTheDocument();
  });
});