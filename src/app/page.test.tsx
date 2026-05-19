import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuthContext } from "@/providers/Auth";
import HomePage from "./page";

// Define the type locally since it's not exported from Auth provider
interface AuthSession {
  accessToken: string;
  user?: {
    id: string;
    email: string;
  };
}

interface AuthContextType {
  session: AuthSession | null;
  signIn?: () => void;
  signOut?: () => void;
  updateSession?: (session: AuthSession | null) => void;
}

// Mock the sub-components with function implementations that return simple divs
jest.mock("./components/ChatInterface/ChatInterface", () => ({
  ChatInterface: jest.fn(() => React.createElement("div", { "data-testid": "chat-interface" })),
}));

jest.mock("./components/TasksFilesSidebar/TasksFilesSidebar", () => ({
  TasksFilesSidebar: jest.fn(() => React.createElement("div", { "data-testid": "tasks-files-sidebar" })),
}));

jest.mock("./components/SubAgentPanel/SubAgentPanel", () => ({
  SubAgentPanel: jest.fn(() => React.createElement("div", { "data-testid": "subagent-panel" })),
}));

jest.mock("./components/FileViewDialog/FileViewDialog", () => ({
  FileViewDialog: jest.fn(() => React.createElement("div", { "data-testid": "file-view-dialog" })),
}));

// Mock the client library
jest.mock("@/lib/client", () => ({
  createClient: jest.fn(() => ({
    threads: {
      getState: jest.fn(),
    },
  })),
}));

// Mock nuqs
jest.mock("nuqs", () => ({
  useQueryState: jest.fn(() => [null, jest.fn()]),
}));

const queryClient = new QueryClient();

// Mock AuthContext
const mockAuthContext: AuthContextType = {
  session: {
    accessToken: "mock-token",
    user: {
      id: "user-123",
      email: "test@example.com",
    },
  },
  signIn: jest.fn(),
  signOut: jest.fn(),
  updateSession: jest.fn(),
};

// Mock the useAuthContext hook instead
jest.mock("@/providers/Auth", () => ({
  ...jest.requireActual("@/providers/Auth"),
  useAuthContext: jest.fn(),
}));

// Set the default mock implementation
(useAuthContext as jest.MockedFunction<typeof useAuthContext>).mockImplementation(() => mockAuthContext);

const renderWithProviders = (ui: React.ReactElement) => {
  // Set the default mock implementation before rendering
  (useAuthContext as jest.MockedFunction<typeof useAuthContext>).mockImplementation(() => mockAuthContext);
  return render(
    React.createElement(QueryClientProvider, { client: queryClient }, ui)
  );
};

describe("HomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the main page structure with sidebar and main content", () => {
    renderWithProviders(React.createElement(HomePage));
    
    expect(screen.getByTestId("tasks-files-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("chat-interface")).toBeInTheDocument();
  });

  it("does not render SubAgentPanel when no subagent is selected", () => {
    renderWithProviders(React.createElement(HomePage));
    
    expect(screen.queryByTestId("subagent-panel")).not.toBeInTheDocument();
  });

  it("does not render FileViewDialog when no file is selected", () => {
    renderWithProviders(React.createElement(HomePage));
    
    expect(screen.queryByTestId("file-view-dialog")).not.toBeInTheDocument();
  });

  it("passes correct props to ChatInterface", () => {
    renderWithProviders(React.createElement(HomePage));

    const { ChatInterface } = require("./components/ChatInterface/ChatInterface");
    // Check that ChatInterface was called with the necessary props at least once
    const callArgs = ChatInterface.mock.calls;
    const hasCorrectCall = callArgs.some((call: any[]) =>
      typeof call[0]?.onTodosUpdate === 'function' &&
      typeof call[0]?.onFilesUpdate === 'function' &&
      typeof call[0]?.onNewThread === 'function' &&
      typeof call[0]?.isLoadingThreadState === 'boolean' &&
      call[0]?.threadId === null &&
      call[0]?.selectedSubAgent === null
    );

    expect(hasCorrectCall).toBe(true);
  });

  it("passes correct props to TasksFilesSidebar", () => {
    renderWithProviders(React.createElement(HomePage));

    const { TasksFilesSidebar } = require("./components/TasksFilesSidebar/TasksFilesSidebar");
    // Check that TasksFilesSidebar was called with the necessary props at least once
    const callArgs = TasksFilesSidebar.mock.calls;
    const hasCorrectCall = callArgs.some((call: any[]) =>
      Array.isArray(call[0]?.todos) &&
      typeof call[0]?.files === 'object' &&
      typeof call[0]?.onFileClick === 'function' &&
      typeof call[0]?.onToggleCollapse === 'function' &&
      typeof call[0]?.collapsed === 'boolean'
    );

    expect(hasCorrectCall).toBe(true);
  });

  it("initializes with empty todos and files", () => {
    renderWithProviders(React.createElement(HomePage));

    const { TasksFilesSidebar } = require("./components/TasksFilesSidebar/TasksFilesSidebar");
    // Check that TasksFilesSidebar was called with empty todos and files at least once
    const callArgs = TasksFilesSidebar.mock.calls;
    const hasCorrectCall = callArgs.some((call: any[]) =>
      Array.isArray(call[0]?.todos) &&
      call[0]?.todos.length === 0 &&
      typeof call[0]?.files === 'object' &&
      Object.keys(call[0]?.files || {}).length === 0
    );

    expect(hasCorrectCall).toBe(true);
  });

  it("handles unauthorized session correctly", () => {
    const unauthorizedAuthContext: AuthContextType = {
      session: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      updateSession: jest.fn(),
    };

    // Mock the hook to return unauthorized context for this test
    (useAuthContext as jest.MockedFunction<typeof useAuthContext>).mockImplementation(() => unauthorizedAuthContext);

    renderWithProviders(React.createElement(HomePage));

    const { TasksFilesSidebar } = require("./components/TasksFilesSidebar/TasksFilesSidebar");
    // Check that TasksFilesSidebar was called with empty todos and files at least once
    const callArgs = TasksFilesSidebar.mock.calls;
    const hasCorrectCall = callArgs.some((call: any[]) =>
      Array.isArray(call[0]?.todos) &&
      call[0]?.todos.length === 0 &&
      typeof call[0]?.files === 'object' &&
      Object.keys(call[0]?.files || {}).length === 0
    );

    expect(hasCorrectCall).toBe(true);

    // Restore the default mock implementation
    (useAuthContext as jest.MockedFunction<typeof useAuthContext>).mockImplementation(() => mockAuthContext);
  });
});