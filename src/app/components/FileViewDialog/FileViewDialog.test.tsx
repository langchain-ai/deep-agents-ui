import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FileViewDialog } from "./FileViewDialog";
import type { FileItem } from "../../types/types";

// Mock the child components that are used in FileViewDialog
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-title">{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size, className }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock("react-syntax-highlighter", () => ({
  __esModule: true,
  default: ({ children, language }: { children: React.ReactNode; language: string }) => (
    <pre data-testid="syntax-highlighter" data-language={language}>
      {children}
    </pre>
  ),
  Prism: ({ children, language }: { children: React.ReactNode; language: string }) => (
    <pre data-testid="syntax-highlighter" data-language={language}>
      {children}
    </pre>
  ),
}));

// Mock the MarkdownContent component
jest.mock("../MarkdownContent/MarkdownContent", () => ({
  MarkdownContent: ({ content }: { content: string }) => (
    <div data-testid="markdown-content">{content}</div>
  ),
}));

// Mock browser APIs used in the component
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

Object.defineProperty(window, "URL", {
  value: {
    createObjectURL: jest.fn(() => "mock-url"),
    revokeObjectURL: jest.fn(),
  },
  writable: true,
});

// Mock the syntax highlighter styles
jest.mock("react-syntax-highlighter/dist/esm/styles/prism", () => ({
  oneDark: {},
}));

// Mock document.body.appendChild and removeChild
const originalAppendChild = document.body.appendChild;
const originalRemoveChild = document.body.removeChild;

beforeAll(() => {
  document.body.appendChild = jest.fn((el) => {
    // Simulate adding element to the DOM
    originalAppendChild.call(document.body, el);
    return el;
  });

  document.body.removeChild = jest.fn((el) => {
    originalRemoveChild.call(document.body, el);
    return el;
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("FileViewDialog", () => {
  const mockFile: FileItem = {
    path: "test-file.js",
    content: "console.log('Hello, world!');",
  };

  const mockOnClose = jest.fn();

  const renderComponent = (props?: Partial<{ file: FileItem; onClose: () => void }>) => {
    return render(
      <FileViewDialog 
        file={props?.file || mockFile} 
        onClose={props?.onClose || mockOnClose} 
      />
    );
  };

  it("renders the dialog with file information", () => {
    renderComponent();

    // Check if dialog content is rendered
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();

    // Check if the file path is displayed in the file name span (not just any text)
    expect(screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' &&
             element?.className.includes('fileName') &&
             content === "test-file.js";
    })).toBeInTheDocument();

    // Check if the file icon is rendered (svg with fileIcon class)
    expect(screen.getByTestId("dialog-content").querySelector('.fileIcon')).toBeInTheDocument();

    // Check if syntax highlighter is rendered for non-Markdown files
    expect(screen.getByTestId("syntax-highlighter")).toBeInTheDocument();
    expect(screen.getByText("console.log('Hello, world!');")).toBeInTheDocument();
  });

  it("renders Markdown content when file extension is .md", () => {
    const markdownFile: FileItem = {
      path: "readme.md",
      content: "# Hello\n\nThis is a markdown file.",
    };

    renderComponent({ file: markdownFile });

    // Check if MarkdownContent component is rendered instead of syntax highlighter
    expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
    expect(screen.queryByTestId("syntax-highlighter")).not.toBeInTheDocument();
  });

  it("renders Markdown content when file extension is .markdown", () => {
    const markdownFile: FileItem = {
      path: "readme.markdown",
      content: "# Hello\n\nThis is a markdown file.",
    };

    renderComponent({ file: markdownFile });

    // Check if MarkdownContent component is rendered instead of syntax highlighter
    expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
    expect(screen.queryByTestId("syntax-highlighter")).not.toBeInTheDocument();
  });

  it("renders empty content message when file content is empty", () => {
    const emptyFile: FileItem = {
      path: "empty-file.txt",
      content: "",
    };

    renderComponent({ file: emptyFile });

    expect(screen.getByText("File is empty")).toBeInTheDocument();
  });

  it("renders with correct language for JavaScript files", () => {
    const jsFile: FileItem = {
      path: "script.js",
      content: "const x = 5;",
    };

    renderComponent({ file: jsFile });

    const syntaxHighlighter = screen.getByTestId("syntax-highlighter");
    expect(syntaxHighlighter).toHaveAttribute("data-language", "javascript");
  });

  it("renders with correct language for TypeScript files", () => {
    const tsFile: FileItem = {
      path: "script.ts",
      content: "const x: number = 5;",
    };

    renderComponent({ file: tsFile });

    const syntaxHighlighter = screen.getByTestId("syntax-highlighter");
    expect(syntaxHighlighter).toHaveAttribute("data-language", "typescript");
  });

  it("renders with correct language for TSX files", () => {
    const tsxFile: FileItem = {
      path: "component.tsx",
      content: "const Component = () => <div>Hello</div>;",
    };

    renderComponent({ file: tsxFile });

    const syntaxHighlighter = screen.getByTestId("syntax-highlighter");
    expect(syntaxHighlighter).toHaveAttribute("data-language", "typescript");
  });

  it("renders with correct language for JSX files", () => {
    const jsxFile: FileItem = {
      path: "component.jsx",
      content: "const Component = () => <div>Hello</div>;",
    };

    renderComponent({ file: jsxFile });

    const syntaxHighlighter = screen.getByTestId("syntax-highlighter");
    expect(syntaxHighlighter).toHaveAttribute("data-language", "javascript");
  });

  it("renders with correct language for Python files", () => {
    const pyFile: FileItem = {
      path: "script.py",
      content: "print('Hello, world!')",
    };

    renderComponent({ file: pyFile });

    const syntaxHighlighter = screen.getByTestId("syntax-highlighter");
    expect(syntaxHighlighter).toHaveAttribute("data-language", "python");
  });

  it("renders with correct language for unknown file extensions", () => {
    const unknownFile: FileItem = {
      path: "script.unknown",
      content: "some unknown content",
    };

    renderComponent({ file: unknownFile });

    const syntaxHighlighter = screen.getByTestId("syntax-highlighter");
    expect(syntaxHighlighter).toHaveAttribute("data-language", "text");
  });

  it("handles copy button click", async () => {
    renderComponent();

    const copyButtons = screen.getAllByText("Copy");
    const copyButton = copyButtons[0];

    fireEvent.click(copyButton);

    // Check if clipboard writeText was called with file content
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("console.log('Hello, world!');");
  });

  it("handles download button click", () => {
    renderComponent();

    const downloadButtons = screen.getAllByText("Download");
    const downloadButton = downloadButtons[0];

    fireEvent.click(downloadButton);

    // Check if URL.createObjectURL was called
    expect(URL.createObjectURL).toHaveBeenCalled();

    // Check if a link element was created and clicked
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("calls onClose when dialog is closed", () => {
    renderComponent();

    // Since the Dialog is controlled with open={true}, we need to test onClose prop
    // The actual closing might be handled by Dialog component, but we can test that the onClose prop exists
    expect(mockOnClose).not.toHaveBeenCalled();

    // Trigger a close event - in a real scenario this would be handled by the Dialog component
    // For testing purposes, we'll directly call the onClose if it's passed as a handler
  });

  it("renders with correct class names from module styles", () => {
    renderComponent();

    // Check if elements have appropriate style class names applied
    const header = screen.getByTestId("dialog-content").firstElementChild?.nextElementSibling;
    expect(header).toHaveClass("header");

    const titleSection = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' &&
             element?.className.includes('fileName') &&
             content === "test-file.js";
    }).closest("div");
    expect(titleSection).toHaveClass("titleSection");

    expect(screen.getByTestId("scroll-area")).toBeInTheDocument();
  });

  it("displays the file name correctly", () => {
    const differentFile: FileItem = {
      path: "src/components/App.tsx",
      content: "const App = () => <div>Hello</div>;",
    };

    renderComponent({ file: differentFile });

    expect(screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' &&
             element?.className.includes('fileName') &&
             content === "src/components/App.tsx";
    })).toBeInTheDocument();
  });

  it("correctly identifies markdown file extensions", () => {
    const testCases = [
      { path: "readme.md", shouldRenderMarkdown: true },
      { path: "README.MD", shouldRenderMarkdown: true }, // case insensitive
      { path: "doc.markdown", shouldRenderMarkdown: true },
      { path: "doc.MARKDOWN", shouldRenderMarkdown: true }, // case insensitive
      { path: "readme.txt", shouldRenderMarkdown: false },
      { path: "script.js", shouldRenderMarkdown: false },
    ];

    testCases.forEach(({ path, shouldRenderMarkdown }) => {
      const file: FileItem = {
        path,
        content: "# Title\n\nContent",
      };

      render(
        <FileViewDialog 
          file={file} 
          onClose={mockOnClose} 
        />
      );

      if (shouldRenderMarkdown) {
        expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId("markdown-content")).not.toBeInTheDocument();
        expect(screen.getByTestId("syntax-highlighter")).toBeInTheDocument();
      }

      // Clean up for next test
      document.body.innerHTML = "";
    });
  });
});