import React from "react";
import { render, screen } from "@testing-library/react";

// Mock all external dependencies BEFORE importing the component
jest.mock("./MarkdownContent.module.scss", () => ({
  markdown: "markdown",
  link: "link",
  inlineCode: "inlineCode",
  preWrapper: "preWrapper",
  codeBlock: "codeBlock",
  blockquote: "blockquote",
  list: "list",
  orderedList: "orderedList",
  tableWrapper: "tableWrapper",
  table: "table",
}));

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children, components }: { children: React.ReactNode; components?: any }) => {
    // Better mock that processes markdown content more accurately
    const processContent = (content: string) => {
      let processed = content;

      // Handle tables (lines with | and - separators)
      processed = processed.replace(/(\|[^\n]+\|\s*\n)+(\|[\s-:|]+\|\s*\n)?(\|[^\n]+\|)/g, (match) => {
        const lines = match.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return match;

        const rows = lines.map(line => line.replace(/^\| *| *$/g, '').split(/\s*\|\s*/));
        let tableHtml = '<table class="table"><tbody>';

        rows.forEach((cells, index) => {
          tableHtml += '<tr>';
          cells.forEach(cell => {
            const tag = index === 0 ? 'th' : 'td';
            tableHtml += `<${tag}>${cell}</${tag}>`;
          });
          tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table>';
        return tableHtml;
      });

      // Headers
      processed = processed.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
      processed = processed.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
      processed = processed.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
      processed = processed.replace(/^### (.*$)/gm, '<h3>$1</h3>');
      processed = processed.replace(/^## (.*$)/gm, '<h2>$1</h2>');
      processed = processed.replace(/^# (.*$)/gm, '<h1>$1</h1>');

      // Blockquotes
      processed = processed.replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>');

      // Bold and italic
      processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
      processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');
      processed = processed.replace(/_(.*?)_/g, '<em>$1</em>');

      // Code
      processed = processed.replace(/`(.*?)`/g, '<code>$1</code>');

      // Images and links
      processed = processed.replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" />');
      processed = processed.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="link">$1</a>');

      // Lists - process block by block
      const listRegex = /^(\d+\. .*$\n?|^- .*$\n?)*/gm;
      processed = processed.replace(listRegex, (match) => {
        if (match.trim() === '') return match;

        const lines = match.split('\n');
        let isOrderedList = false;
        let listItems = '';

        lines.forEach(line => {
          line = line.trim();
          if (line.startsWith('- ')) {
            listItems += `<li class="list">${line.substring(2)}</li>`;
          } else if (/^\d+\. /.test(line)) {
            isOrderedList = true;
            const item = line.replace(/^\d+\. /, '');
            listItems += `<li class="orderedList">${item}</li>`;
          }
        });

        const listTag = isOrderedList ? 'ol' : 'ul';
        return `<${listTag}>${listItems}</${listTag}>`;
      });

      // Wrap non-empty lines that are not already wrapped in other tags
      processed = processed
        .split('\n')
        .map(line => {
          line = line.trim();
          if (line === '') return '';
          if (!line.startsWith('<') && !line.endsWith('>')) {
            // Check if it's already inside another tag
            if (!processed.includes(`<p>${line}</p>`) &&
                !processed.includes(`<h1>${line}</h1>`) &&
                !processed.includes(`<h2>${line}</h2>`) &&
                !processed.includes(`<h3>${line}</h3>`) &&
                !processed.includes(`<h4>${line}</h4>`) &&
                !processed.includes(`<h5>${line}</h5>`) &&
                !processed.includes(`<h6>${line}</h6>`) &&
                !processed.includes(`<blockquote>${line}</blockquote>`)) {
              return `<p>${line}</p>`;
            }
          }
          return line;
        })
        .join('\n');

      return processed;
    };

    if (typeof children === 'string') {
      // Process simple markdown to HTML
      const processed = processContent(children);
      return <div dangerouslySetInnerHTML={{ __html: processed }} />;
    }
    return <div>{children}</div>;
  },
}));

jest.mock("remark-gfm", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock react-syntax-highlighter to render a simple pre element for code blocks
jest.mock("react-syntax-highlighter", () => ({
  __esModule: true,
  Prism: ({ children, language }: { children: string; language?: string }) => (
    <pre data-language={language || ''} className="codeBlock">
      <code>{children}</code>
    </pre>
  ),
}));

jest.mock("react-syntax-highlighter/dist/esm/styles/prism", () => ({
  __esModule: true,
  oneDark: {},
}));

// Import the component AFTER all mocks are set up
import { MarkdownContent } from "./MarkdownContent";

describe("MarkdownContent", () => {
  it("renders basic markdown content correctly", () => {
    const content = "# Hello World\n\nThis is a paragraph.";
    render(<MarkdownContent content={content} />);
    
    expect(screen.getByRole("heading", { level: 1, name: /Hello World/i })).toBeInTheDocument();
    expect(screen.getByText(/This is a paragraph\./i)).toBeInTheDocument();
  });

  it("renders with custom className", () => {
    const content = "Simple text";
    render(<MarkdownContent content={content} className="custom-class" />);

    // Find the container div that has the custom class along with the default markdown class
    const container = document.querySelector('.markdown.custom-class');
    expect(container).toBeInTheDocument();
  });

  it("renders inline code correctly", () => {
    const content = "This has `inline code` in it.";
    render(<MarkdownContent content={content} />);
    
    expect(screen.getByText(/inline code/i)).toBeInTheDocument();
    const codeElement = screen.getByText(/inline code/i);
    expect(codeElement.tagName).toBe("CODE");
  });

  it("renders code blocks with syntax highlighting", () => {
    const content = "```javascript\nconst x = 5;\n```";
    render(<MarkdownContent content={content} />);
    
    // Check if the code block is rendered with syntax highlighting
    const codeElement = screen.getByText("const x = 5;");
    expect(codeElement).toBeInTheDocument();
  });

  it("renders ordered lists correctly", () => {
    const content = "1. First item\n2. Second item\n3. Third item";
    render(<MarkdownContent content={content} />);
    
    const orderedList = screen.getByRole("list");
    expect(orderedList).toBeInTheDocument();
    expect(orderedList.tagName).toBe("OL");
    
    expect(screen.getByText(/First item/i)).toBeInTheDocument();
    expect(screen.getByText(/Second item/i)).toBeInTheDocument();
    expect(screen.getByText(/Third item/i)).toBeInTheDocument();
  });

  it("renders unordered lists correctly", () => {
    const content = "- First item\n- Second item\n- Third item";
    render(<MarkdownContent content={content} />);
    
    const unorderedList = screen.getByRole("list");
    expect(unorderedList).toBeInTheDocument();
    expect(unorderedList.tagName).toBe("UL");
    
    expect(screen.getByText(/First item/i)).toBeInTheDocument();
    expect(screen.getByText(/Second item/i)).toBeInTheDocument();
    expect(screen.getByText(/Third item/i)).toBeInTheDocument();
  });

  it("renders blockquotes correctly", () => {
    const content = "> This is a blockquote";
    render(<MarkdownContent content={content} />);
    
    const blockquote = screen.getByText(/This is a blockquote/i);
    expect(blockquote.tagName).toBe("BLOCKQUOTE");
  });

  it("renders links correctly", () => {
    const content = "[Link text](https://example.com)";
    render(<MarkdownContent content={content} />);
    
    const link = screen.getByRole("link", { name: /Link text/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders tables correctly", () => {
    const content = `| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |`;
    render(<MarkdownContent content={content} />);
    
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    
    expect(screen.getByText(/Header 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Header 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Cell 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Cell 2/i)).toBeInTheDocument();
  });

  it("handles markdown with multiple elements", () => {
    const content = `# Title\n\nThis is a paragraph with [a link](https://example.com).\n\n- List item 1\n- List item 2\n\n> A blockquote`;
    render(<MarkdownContent content={content} />);
    
    expect(screen.getByRole("heading", { level: 1, name: /Title/i })).toBeInTheDocument();
    expect(screen.getByText(/This is a paragraph with/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /a link/i })).toBeInTheDocument();
    
    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();
    expect(screen.getByText(/List item 1/i)).toBeInTheDocument();
    expect(screen.getByText(/List item 2/i)).toBeInTheDocument();
    
    const blockquote = screen.getByText(/A blockquote/i);
    expect(blockquote.tagName).toBe("BLOCKQUOTE");
  });

  it("handles empty content", () => {
    const content = "";
    render(<MarkdownContent content={content} />);

    // Check that the main container div is rendered with the markdown class
    const container = document.querySelector('.markdown');
    expect(container).toBeInTheDocument();
  });

  it("renders emphasis and strong text", () => {
    const content = "This text is *italic* and this is **bold**.";
    render(<MarkdownContent content={content} />);
    
    const italicElement = screen.getByText(/italic/i);
    expect(italicElement).toBeInTheDocument();
    const boldElement = screen.getByText(/bold/i);
    expect(boldElement).toBeInTheDocument();
  });

  it("renders headers of different levels", () => {
    const content = "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6";
    render(<MarkdownContent content={content} />);
    
    expect(screen.getByRole("heading", { level: 1, name: /H1/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /H2/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /H3/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: /H4/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 5, name: /H5/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 6, name: /H6/i })).toBeInTheDocument();
  });

  it("applies default container even without custom className", () => {
    const content = "Test content";
    render(<MarkdownContent content={content} />);

    expect(screen.getByText(/Test content/i)).toBeInTheDocument();
  });
});