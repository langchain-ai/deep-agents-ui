import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThreadHistorySidebar } from "./ThreadHistorySidebar";
import { Thread } from "../../types/types";

// Mock child components and dependencies
jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size, className }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

// Mock the SCSS module
jest.mock("./ThreadHistorySidebar.module.scss", () => ({
  overlay: "overlay",
  container: "container",
  header: "header",
  title: "title",
  headerActions: "header-actions",
  closeButton: "close-button",
  scrollArea: "scroll-area",
  loading: "loading",
  empty: "empty",
  emptyIcon: "empty-icon",
  threadList: "thread-list",
  group: "group",
  groupTitle: "group-title",
  threadItem: "thread-item",
  active: "active",
  threadIcon: "thread-icon",
  threadContent: "thread-content",
  threadTitle: "thread-title",
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  MessageSquare: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="message-square-icon" />
  ),
  X: ({ size }: { size?: number }) => (
    <svg data-testid="x-icon" style={{ width: size, height: size }} />
  ),
}));

// Mock client and other dependencies
const mockSearch = jest.fn().mockResolvedValue([]);
jest.mock("@/lib/client", () => ({
  createClient: jest.fn(() => ({
    threads: {
      search: mockSearch,
    },
  })),
}));

jest.mock("@/lib/environment/deployments", () => ({
  getDeployment: jest.fn(() => ({
    deploymentUrl: "https://example.com",
  })),
}));

// Mock the Auth context
const mockAuthContext = {
  session: {
    accessToken: "test-token",
  },
};

jest.mock("@/providers/Auth", () => ({
  useAuthContext: jest.fn(() => mockAuthContext),
}));

describe("ThreadHistorySidebar", () => {
  const defaultProps = {
    open: true,
    setOpen: jest.fn(),
    currentThreadId: null,
    onThreadSelect: jest.fn(),
  };

  const mockThreads: Thread[] = [
    {
      id: "thread-1",
      title: "First Thread",
      createdAt: new Date("2025-11-25T10:00:00Z"),
      updatedAt: new Date("2025-11-25T10:00:00Z"),
    },
    {
      id: "thread-2",
      title: "Second Thread",
      createdAt: new Date("2025-11-24T10:00:00Z"),
      updatedAt: new Date("2025-11-24T10:00:00Z"),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to default empty response
    mockSearch.mockResolvedValue([]);
  });

  it("renders correctly when open is true", () => {
    render(<ThreadHistorySidebar {...defaultProps} />);
    
    expect(screen.getByText("Thread History")).toBeInTheDocument();
    expect(screen.getByTestId("scroll-area")).toBeInTheDocument();
    expect(screen.getByText("Loading threads...")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(<ThreadHistorySidebar {...defaultProps} open={false} />);
    
    expect(screen.queryByText("Thread History")).not.toBeInTheDocument();
  });

  it("renders close button and calls setOpen when clicked", () => {
    render(<ThreadHistorySidebar {...defaultProps} />);
    
    const closeButton = screen.getByTestId("x-icon");
    fireEvent.click(closeButton);
    
    expect(defaultProps.setOpen).toHaveBeenCalledWith(false);
  });

  it("fetches and displays threads when API call succeeds", async () => {
    // Mock the API response
    (mockSearch as jest.MockedFunction<typeof mockSearch>).mockResolvedValueOnce(
      mockThreads.map(thread => ({
        thread_id: thread.id,
        created_at: thread.createdAt.toISOString(),
        updated_at: thread.updatedAt.toISOString(),
        values: {
          messages: [{ role: "user", content: [{ type: "text", text: thread.title }] }],
        },
      }))
    );

    render(<ThreadHistorySidebar {...defaultProps} />);

    // Initially there should be loading message
    expect(screen.getByText("Loading threads...")).toBeInTheDocument();

    // Wait for the threads to load
    await waitFor(() => {
      expect(screen.getByText("First Thread")).toBeInTheDocument();
    });

    expect(screen.getByText("First Thread")).toBeInTheDocument();
    expect(screen.getByText("Second Thread")).toBeInTheDocument();
  });

  it("displays empty state when no threads exist", async () => {
    // Mock empty API response
    mockSearch.mockResolvedValueOnce([]);

    render(<ThreadHistorySidebar {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("No threads yet")).toBeInTheDocument();
    });

    expect(screen.getByText("No threads yet")).toBeInTheDocument();
  });

  it("calls onThreadSelect when a thread item is clicked", async () => {
    // Mock the API response with proper structure
    (mockSearch as jest.MockedFunction<typeof mockSearch>).mockResolvedValueOnce(
      mockThreads.map(thread => ({
        thread_id: thread.id,
        created_at: thread.createdAt.toISOString(),
        updated_at: thread.updatedAt.toISOString(),
        values: {
          messages: [{ role: "user", content: [{ type: "text", text: thread.title }] }],
        },
      }))
    );

    render(<ThreadHistorySidebar {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("First Thread")).toBeInTheDocument();
    });

    // Click on the first thread item
    const firstThreadItem = screen.getByText("First Thread").closest("button");
    if (firstThreadItem) {
      fireEvent.click(firstThreadItem);
    }

    expect(defaultProps.onThreadSelect).toHaveBeenCalledWith("thread-1");
  });

  it("marks current thread as active", async () => {
    // Mock the API response with proper structure
    (mockSearch as jest.MockedFunction<typeof mockSearch>).mockResolvedValueOnce(
      mockThreads.map(thread => ({
        thread_id: thread.id,
        created_at: thread.createdAt.toISOString(),
        updated_at: thread.updatedAt.toISOString(),
        values: {
          messages: [{ role: "user", content: [{ type: "text", text: thread.title }] }],
        },
      }))
    );

    render(<ThreadHistorySidebar
      {...defaultProps}
      currentThreadId="thread-1"
    />);

    await waitFor(() => {
      expect(screen.getByText("First Thread")).toBeInTheDocument();
    });

    // Find the active thread item - it should have the "active" class
    const firstThreadItem = screen.getByText("First Thread").closest("button");
    if (firstThreadItem) {
      expect(firstThreadItem).toHaveClass("active");
    }
  });

  it("groups threads by date", async () => {
    // Mock the API response with dates that will be grouped
    const mockThreadsForGrouping = [
      {
        id: "today-thread",
        title: "Today's Thread",
        createdAt: new Date(),
        updatedAt: new Date(), // Today
      },
      {
        id: "yesterday-thread",
        title: "Yesterday's Thread",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      },
      {
        id: "last-week-thread",
        title: "Last Week's Thread",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Three days ago
      },
      {
        id: "older-thread",
        title: "Older Thread",
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // Eight days ago
      },
    ];

    (mockSearch as jest.MockedFunction<typeof mockSearch>).mockResolvedValueOnce(
      mockThreadsForGrouping.map(thread => ({
        thread_id: thread.id,
        created_at: thread.createdAt.toISOString(),
        updated_at: thread.updatedAt.toISOString(),
        values: {
          messages: [{ role: "user", content: [{ type: "text", text: thread.title }] }],
        },
      }))
    );

    render(<ThreadHistorySidebar {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Today's Thread")).toBeInTheDocument();
    });

    // Check that group titles are present
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("Older")).toBeInTheDocument();
  });

  it("handles API fetch error gracefully", async () => {
    // Mock a failed API response
    mockSearch.mockRejectedValueOnce(new Error("API Error"));

    render(<ThreadHistorySidebar {...defaultProps} />);

    // Should initially show loading
    expect(screen.getByText("Loading threads...")).toBeInTheDocument();

    // Wait for error handling - after the API failure, it should show empty state
    await waitFor(() => {
      expect(screen.getByText("No threads yet")).toBeInTheDocument();
    });
  });

  it("should not fetch threads if deployment URL or access token is not available", () => {
    // Mock auth context without access token
    (require("@/providers/Auth").useAuthContext as jest.Mock).mockReturnValue({
      session: null,
    });

    render(<ThreadHistorySidebar {...defaultProps} />);
    
    // Since there's no access token, the search function shouldn't be called
    expect(mockSearch).not.toHaveBeenCalled();
  });
});