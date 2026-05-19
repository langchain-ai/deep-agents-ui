import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatInterface } from "./ChatInterface";
import { SubAgent, TodoItem } from "../../types/types";
import { Message, HumanMessage, AIMessage } from "@langchain/langgraph-sdk";

// Mock scrollIntoView for DOM elements
Element.prototype.scrollIntoView = jest.fn();

// Mock the child components
jest.mock("../ChatMessage/ChatMessage", () => ({
  ChatMessage: ({ message, showAvatar }: any) => (
    <div data-testid={`chat-message-${message.id}`}>
      {showAvatar && <span>Avatar</span>}
      {message.content}
    </div>
  ),
}));

jest.mock("../ThreadHistorySidebar/ThreadHistorySidebar", () => ({
  ThreadHistorySidebar: ({ open }: any) => (
    <div data-testid="thread-history-sidebar">{open ? "Sidebar Open" : "Sidebar Closed"}</div>
  ),
}));

// Mock the useChat hook
const mockUseChat = {
  messages: [] as Message[],
  isLoading: false,
  sendMessage: jest.fn(),
  stopStream: jest.fn(),
};

jest.mock("../../hooks/useChat", () => ({
  useChat: () => mockUseChat,
}));

// Mock the button and input components
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, disabled, ...props }: any) => (
    <input
      data-testid="input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      {...props}
    />
  ),
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  Send: () => <span data-testid="send-icon">Send</span>,
  Bot: () => <span data-testid="bot-icon">Bot</span>,
  LoaderCircle: () => <span data-testid="loader-icon">Loader</span>,
  SquarePen: () => <span data-testid="square-pen-icon">Square Pen</span>,
  History: () => <span data-testid="history-icon">History</span>,
  X: () => <span data-testid="x-icon">X</span>,
}));

describe("ChatInterface", () => {
  const mockSetThreadId = jest.fn();
  const mockOnSelectSubAgent = jest.fn();
  const mockOnTodosUpdate = jest.fn();
  const mockOnFilesUpdate = jest.fn();
  const mockOnNewThread = jest.fn();

  const defaultProps = {
    threadId: "thread-123",
    selectedSubAgent: null,
    setThreadId: mockSetThreadId,
    onSelectSubAgent: mockOnSelectSubAgent,
    onTodosUpdate: mockOnTodosUpdate,
    onFilesUpdate: mockOnFilesUpdate,
    onNewThread: mockOnNewThread,
    isLoadingThreadState: false,
  };

  const renderWithProviders = (props = defaultProps) => {
    return render(<ChatInterface {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockUseChat.sendMessage as jest.MockedFunction<any>).mockClear();
    (mockUseChat.stopStream as jest.MockedFunction<any>).mockClear();
  });

  it("renders the component with initial state", () => {
    renderWithProviders();

    // Check header elements
    expect(screen.getByText("Deep Agents")).toBeInTheDocument();
    expect(screen.getAllByTestId("bot-icon")).toHaveLength(2); // Header and empty state

    // Check input form
    expect(screen.getByTestId("input")).toBeInTheDocument();
    expect(screen.getAllByTestId("button")).toHaveLength(3); // 3 buttons: new thread, history, send

    // Check that empty state is not shown when there are no messages but component is loaded
    expect(mockUseChat.messages).toHaveLength(0);
  });

  it("displays empty state when there are no messages", () => {
    mockUseChat.messages = [];
    mockUseChat.isLoading = false;

    renderWithProviders();

    expect(screen.getByText("Start a conversation or select a thread from history")).toBeInTheDocument();
    expect(screen.getAllByTestId("bot-icon")).toHaveLength(2); // Header and empty state
  });

  it("shows loading state when thread is loading", () => {
    mockUseChat.messages = [];
    renderWithProviders({
      ...defaultProps,
      isLoadingThreadState: true,
    });

    expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
  });

  it("shows thread history sidebar when toggled", () => {
    renderWithProviders();

    // Initially sidebar should be closed
    expect(screen.getByTestId("thread-history-sidebar")).toHaveTextContent("Sidebar Closed");

    // Click the history button to open sidebar
    fireEvent.click(screen.getAllByTestId("button")[1]); // History button is the second button

    expect(screen.getByTestId("thread-history-sidebar")).toHaveTextContent("Sidebar Open");
  });

  it("handles new thread creation", () => {
    const mockMessages = [
      {
        id: "msg-1",
        type: "human",
        content: "Hello",
      } as Message,
    ];
    mockUseChat.messages = mockMessages;

    renderWithProviders();

    // Click the new thread button (SquarePen)
    fireEvent.click(screen.getByTestId("square-pen-icon"));

    expect(mockOnNewThread).toHaveBeenCalledTimes(1);
  });

  it("disables new thread button when no messages exist", () => {
    mockUseChat.messages = [];

    renderWithProviders();

    const newThreadButton = screen.getAllByTestId("button")[0]; // New thread button is the first button
    expect(newThreadButton).toBeDisabled();
  });

  it("enables new thread button when messages exist", () => {
    mockUseChat.messages = [
      {
        id: "msg-1",
        type: "human",
        content: "Hello",
      } as Message,
    ];

    renderWithProviders();

    const newThreadButton = screen.getAllByTestId("button")[0]; // New thread button is the first button
    expect(newThreadButton).not.toBeDisabled();
  });

  it("handles message submission", async () => {
    mockUseChat.messages = [];

    renderWithProviders();

    const input = screen.getByTestId("input");
    const form = screen.getByTestId("input").closest("form");

    // Type a message
    fireEvent.change(input, { target: { value: "Test message" } });

    // Submit the form
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockUseChat.sendMessage).toHaveBeenCalledWith("Test message");
    });
    expect(input).toHaveValue("");
  });

  it("does not submit empty messages", async () => {
    mockUseChat.messages = [];

    renderWithProviders();

    const input = screen.getByTestId("input");
    const form = screen.getByTestId("input").closest("form");

    // Try to submit an empty message
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockUseChat.sendMessage).not.toHaveBeenCalled();
    });
  });

  it("does not submit messages when loading", async () => {
    mockUseChat.messages = [];
    mockUseChat.isLoading = true;

    renderWithProviders();

    const input = screen.getByTestId("input");
    const form = screen.getByTestId("input").closest("form");

    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockUseChat.sendMessage).not.toHaveBeenCalled();
    });
  });

  it("shows loading indicator when messages are loading", () => {
    mockUseChat.messages = [
      {
        id: "msg-1",
        type: "human",
        content: "Hello",
      } as Message,
    ];
    mockUseChat.isLoading = true;

    renderWithProviders();

    expect(screen.getByText("Working...")).toBeInTheDocument();
    expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
  });

  it("shows stop button when loading messages", () => {
    mockUseChat.messages = [
      {
        id: "msg-1",
        type: "human",
        content: "Hello",
      } as Message,
    ];
    mockUseChat.isLoading = true;

    renderWithProviders();

    const buttons = screen.getAllByTestId("button");
    // When loading, the stop button should be shown instead of the send button
    expect(buttons[buttons.length - 1]).toHaveTextContent("Stop");
  });

  it("shows send button when not loading", () => {
    mockUseChat.messages = [
      {
        id: "msg-1",
        type: "human",
        content: "Hello",
      } as Message,
    ];
    mockUseChat.isLoading = false;

    renderWithProviders();

    const buttons = screen.getAllByTestId("button");
    // Find the send button by its icon
    const sendButton = buttons.find(
      btn => btn.querySelector('[data-testid="send-icon"]')
    );
    expect(sendButton).toBeInTheDocument();
  });

  it("calls stopStream when stop button is clicked", () => {
    mockUseChat.isLoading = true;

    renderWithProviders();

    // Click the stop button
    fireEvent.click(screen.getByText("Stop"));

    expect(mockUseChat.stopStream).toHaveBeenCalledTimes(1);
  });

  it("disables input when loading", () => {
    mockUseChat.isLoading = true;

    renderWithProviders();

    const input = screen.getByTestId("input");
    expect(input).toBeDisabled();
  });

  it("enables input when not loading", () => {
    mockUseChat.isLoading = false;

    renderWithProviders();

    const input = screen.getByTestId("input");
    expect(input).not.toBeDisabled();
  });

  it("renders messages correctly", () => {
    const messages: Message[] = [
      {
        id: "msg-1",
        type: "human",
        content: "Hello",
      },
      {
        id: "msg-2",
        type: "ai",
        content: "Hi there!",
      },
    ];
    mockUseChat.messages = messages;

    renderWithProviders();

    // Check that messages are rendered
    expect(screen.getByTestId("chat-message-msg-1")).toBeInTheDocument();
    expect(screen.getByTestId("chat-message-msg-2")).toBeInTheDocument();
  });

  it("handles new thread button click", () => {
    const mockMessages = [
      {
        id: "msg-1",
        type: "human",
        content: "Hello",
      } as Message,
    ];
    mockUseChat.messages = mockMessages;

    renderWithProviders();

    // Click the new thread button (SquarePen icon)
    fireEvent.click(screen.getAllByTestId("button")[0]); // First button is the new thread button

    expect(mockOnNewThread).toHaveBeenCalledTimes(1);
  });

  it("passes correct props to ThreadHistorySidebar", () => {
    renderWithProviders();

    // Initially sidebar should be closed
    expect(screen.getByTestId("thread-history-sidebar")).toHaveTextContent("Sidebar Closed");
  });

  it("displays correct header elements", () => {
    renderWithProviders();

    expect(screen.getByText("Deep Agents")).toBeInTheDocument();
    expect(screen.getByTestId("bot-icon")).toBeInTheDocument();
  });

  it("has correct input placeholder", () => {
    renderWithProviders();

    const input = screen.getByTestId("input");
    expect(input).toHaveAttribute("placeholder", "Type your message...");
  });
});