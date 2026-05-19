import { renderHook, act } from "@testing-library/react";
import { useChat } from "./useChat";
import { useStream } from "@langchain/langgraph-sdk/react";
import { useAuthContext } from "@/providers/Auth";
import { getDeployment } from "@/lib/environment/deployments";
import { createClient } from "@/lib/client";
import { Message } from "@langchain/langgraph-sdk";

// Mock the dependencies
jest.mock("@langchain/langgraph-sdk/react", () => ({
  useStream: jest.fn(),
}));

jest.mock("@/providers/Auth", () => ({
  useAuthContext: jest.fn(),
}));

jest.mock("@/lib/environment/deployments", () => ({
  getDeployment: jest.fn(),
}));

jest.mock("@/lib/client", () => ({
  createClient: jest.fn(),
}));

// Mock uuid to return a consistent value
jest.mock("uuid", () => ({
  v4: () => "test-uuid-123",
}));

// Define types to match the implementation
type StateType = {
  messages: Message[];
  todos: { id: string; content: string; completed: boolean }[];
  files: Record<string, string>;
};

// Mock data
const mockDeployment = {
  agentId: "test-agent-id",
};

const mockSession = {
  accessToken: "test-access-token",
};

const mockThreadMessages: Message[] = [
  {
    id: "test-message-id",
    type: "human",
    content: "Hello, world!",
  },
];

const mockStreamResult = {
  messages: mockThreadMessages,
  isLoading: false,
  submit: jest.fn(),
  stop: jest.fn(),
};

describe("useChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    (getDeployment as jest.Mock).mockReturnValue(mockDeployment);
    (useAuthContext as jest.Mock).mockReturnValue({ session: mockSession });
    (createClient as jest.Mock).mockReturnValue({});
    (useStream as jest.Mock).mockReturnValue(mockStreamResult);
  });

  it("should return initial state correctly", () => {
    const mockSetThreadId = jest.fn();
    const mockOnTodosUpdate = jest.fn();
    const mockOnFilesUpdate = jest.fn();

    const { result } = renderHook(() =>
      useChat(null, mockSetThreadId, mockOnTodosUpdate, mockOnFilesUpdate)
    );

    expect(result.current.messages).toEqual(mockThreadMessages);
    expect(result.current.isLoading).toBe(false);
  });

  it("should call useStream with correct parameters", () => {
    const mockSetThreadId = jest.fn();
    const mockOnTodosUpdate = jest.fn();
    const mockOnFilesUpdate = jest.fn();
    const threadId = "test-thread-id";

    renderHook(() =>
      useChat(threadId, mockSetThreadId, mockOnTodosUpdate, mockOnFilesUpdate)
    );

    expect(useStream).toHaveBeenCalledWith({
      assistantId: "test-agent-id",
      client: {},
      reconnectOnMount: true,
      threadId: "test-thread-id",
      onUpdateEvent: expect.any(Function),
      onThreadId: mockSetThreadId,
      defaultHeaders: {
        "x-auth-scheme": "langsmith",
      },
    });
  });

  it("should handle null threadId correctly", () => {
    const mockSetThreadId = jest.fn();
    const mockOnTodosUpdate = jest.fn();
    const mockOnFilesUpdate = jest.fn();

    renderHook(() =>
      useChat(null, mockSetThreadId, mockOnTodosUpdate, mockOnFilesUpdate)
    );

    expect(useStream).toHaveBeenCalledWith({
      assistantId: "test-agent-id",
      client: {},
      reconnectOnMount: true,
      threadId: null,
      onUpdateEvent: expect.any(Function),
      onThreadId: mockSetThreadId,
      defaultHeaders: {
        "x-auth-scheme": "langsmith",
      },
    });
  });

  it("should throw error when no agent ID is configured", () => {
    (getDeployment as jest.Mock).mockReturnValue({});

    const mockSetThreadId = jest.fn();
    const mockOnTodosUpdate = jest.fn();
    const mockOnFilesUpdate = jest.fn();

    expect(() => {
      renderHook(() =>
        useChat(null, mockSetThreadId, mockOnTodosUpdate, mockOnFilesUpdate)
      );
    }).toThrow("No agent ID configured in environment");
  });

  it("should call stream.submit with correct parameters when sendMessage is called", async () => {
    const mockSubmit = jest.fn();
    (useStream as jest.Mock).mockReturnValue({
      ...mockStreamResult,
      submit: mockSubmit,
    });

    const mockSetThreadId = jest.fn();
    const mockOnTodosUpdate = jest.fn();
    const mockOnFilesUpdate = jest.fn();

    const { result } = renderHook(() =>
      useChat(null, mockSetThreadId, mockOnTodosUpdate, mockOnFilesUpdate)
    );

    await act(async () => {
      result.current.sendMessage("Hello, assistant!");
    });

    expect(mockSubmit).toHaveBeenCalledWith(
      { messages: [
        {
          id: "test-uuid-123",
          type: "human",
          content: "Hello, assistant!",
        }
      ]},
      {
        optimisticValues: expect.any(Function),
        config: {
          recursion_limit: 100,
        },
      }
    );
  });

  it("should call stream.stop when stopStream is called", async () => {
    const mockStop = jest.fn();
    (useStream as jest.Mock).mockReturnValue({
      ...mockStreamResult,
      stop: mockStop,
    });

    const mockSetThreadId = jest.fn();
    const mockOnTodosUpdate = jest.fn();
    const mockOnFilesUpdate = jest.fn();

    const { result } = renderHook(() =>
      useChat(null, mockSetThreadId, mockOnTodosUpdate, mockOnFilesUpdate)
    );

    await act(async () => {
      result.current.stopStream();
    });

    expect(mockStop).toHaveBeenCalled();
  });

  it("should handle onUpdateEvent correctly when todos are updated", () => {
    const mockSetThreadId = jest.fn();
    const mockOnTodosUpdate = jest.fn();
    const mockOnFilesUpdate = jest.fn();

    const { result } = renderHook(() =>
      useChat(null, mockSetThreadId, mockOnTodosUpdate, mockOnFilesUpdate)
    );

    // Access the handleUpdateEvent function from the hook
    const handleUpdateEvent = (useStream as jest.Mock).mock.calls[0][0].onUpdateEvent;
    
    const mockTodos = [
      { id: "1", content: "Test todo", completed: false }
    ];
    
    handleUpdateEvent({
      testNode: { todos: mockTodos }
    });

    expect(mockOnTodosUpdate).toHaveBeenCalledWith(mockTodos);
  });

  it("should handle onUpdateEvent correctly when files are updated", () => {
    const mockSetThreadId = jest.fn();
    const mockOnTodosUpdate = jest.fn();
    const mockOnFilesUpdate = jest.fn();

    const { result } = renderHook(() =>
      useChat(null, mockSetThreadId, mockOnTodosUpdate, mockOnFilesUpdate)
    );

    // Access the handleUpdateEvent function from the hook
    const handleUpdateEvent = (useStream as jest.Mock).mock.calls[0][0].onUpdateEvent;
    
    const mockFiles = {
      "file1.txt": "content1",
      "file2.txt": "content2"
    };
    
    handleUpdateEvent({
      testNode: { files: mockFiles }
    });

    expect(mockOnFilesUpdate).toHaveBeenCalledWith(mockFiles);
  });

  it("should handle onUpdateEvent correctly when both todos and files are updated", () => {
    const mockSetThreadId = jest.fn();
    const mockOnTodosUpdate = jest.fn();
    const mockOnFilesUpdate = jest.fn();

    const { result } = renderHook(() =>
      useChat(null, mockSetThreadId, mockOnTodosUpdate, mockOnFilesUpdate)
    );

    // Access the handleUpdateEvent function from the hook
    const handleUpdateEvent = (useStream as jest.Mock).mock.calls[0][0].onUpdateEvent;
    
    const mockTodos = [
      { id: "1", content: "Test todo", completed: false }
    ];
    
    const mockFiles = {
      "file1.txt": "content1"
    };
    
    handleUpdateEvent({
      testNode: { todos: mockTodos, files: mockFiles }
    });

    expect(mockOnTodosUpdate).toHaveBeenCalledWith(mockTodos);
    expect(mockOnFilesUpdate).toHaveBeenCalledWith(mockFiles);
  });

  it("should create client with access token when available", () => {
    renderHook(() =>
      useChat(null, jest.fn(), jest.fn(), jest.fn())
    );

    expect(createClient).toHaveBeenCalledWith("test-access-token");
  });

  it("should create client with empty string when no access token", () => {
    (useAuthContext as jest.Mock).mockReturnValue({ session: null });

    renderHook(() =>
      useChat(null, jest.fn(), jest.fn(), jest.fn())
    );

    expect(createClient).toHaveBeenCalledWith("");
  });

  it("should handle optimistic values correctly in sendMessage", async () => {
    const mockSubmit = jest.fn();
    (useStream as jest.Mock).mockReturnValue({
      ...mockStreamResult,
      submit: mockSubmit,
    });

    const mockSetThreadId = jest.fn();
    const mockOnTodosUpdate = jest.fn();
    const mockOnFilesUpdate = jest.fn();

    const { result } = renderHook(() =>
      useChat(null, mockSetThreadId, mockOnTodosUpdate, mockOnFilesUpdate)
    );

    // Get the optimisticValues function that should be passed to submit
    let submittedOptions: any;
    mockSubmit.mockImplementation((data, options) => {
      submittedOptions = options;
    });

    await act(async () => {
      result.current.sendMessage("Hello, assistant!");
    });

    const prev = { messages: [{ id: "existing", type: "ai", content: "previous" }] };
    const optimisticResult = submittedOptions.optimisticValues(prev);

    expect(optimisticResult.messages).toHaveLength(2);
    expect(optimisticResult.messages[0]).toEqual({ id: "existing", type: "ai", content: "previous" });
    expect(optimisticResult.messages[1]).toEqual({
      id: "test-uuid-123",
      type: "human",
      content: "Hello, assistant!"
    });
  });

  it("should handle empty previous messages in optimisticValues", async () => {
    const mockSubmit = jest.fn();
    (useStream as jest.Mock).mockReturnValue({
      ...mockStreamResult,
      submit: mockSubmit,
    });

    const mockSetThreadId = jest.fn();
    const mockOnTodosUpdate = jest.fn();
    const mockOnFilesUpdate = jest.fn();

    const { result } = renderHook(() =>
      useChat(null, mockSetThreadId, mockOnTodosUpdate, mockOnFilesUpdate)
    );

    // Get the optimisticValues function that should be passed to submit
    let submittedOptions: any;
    mockSubmit.mockImplementation((data, options) => {
      submittedOptions = options;
    });

    await act(async () => {
      result.current.sendMessage("Hello, assistant!");
    });

    const prev = { messages: undefined };
    const optimisticResult = submittedOptions.optimisticValues(prev);

    expect(optimisticResult.messages).toHaveLength(1);
    expect(optimisticResult.messages[0]).toEqual({
      id: "test-uuid-123",
      type: "human",
      content: "Hello, assistant!"
    });
  });
});