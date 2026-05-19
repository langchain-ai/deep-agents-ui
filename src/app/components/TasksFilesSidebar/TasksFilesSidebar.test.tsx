import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TasksFilesSidebar } from "./TasksFilesSidebar";
import type { TodoItem, FileItem } from "../../types/types";

// Mock the SCSS module
jest.mock("./TasksFilesSidebar.module.scss", () => ({
  sidebar: "sidebar",
  sidebarCollapsed: "sidebarCollapsed",
  header: "header",
  title: "title",
  toggleButton: "toggleButton",
  tabs: "tabs",
  tabsList: "tabsList",
  tabTrigger: "tabTrigger",
  tabContent: "tabContent",
  scrollArea: "scrollArea",
  emptyState: "emptyState",
  todoGroups: "todoGroups",
  todoGroup: "todoGroup",
  groupTitle: "groupTitle",
  todoItem: "todoItem",
  todoContent: "todoContent",
  completedIcon: "completedIcon",
  progressIcon: "progressIcon",
  pendingIcon: "pendingIcon",
  fileTree: "fileTree",
  fileItem: "fileItem",
  fileRow: "fileRow",
  fileName: "fileName",
}));

// Mock the Lucide icons
jest.mock("lucide-react", () => ({
  ChevronLeft: () => <span>ChevronLeft</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  FileText: () => <span>FileText</span>,
  Folder: () => <span>Folder</span>,
  FolderOpen: () => <span>FolderOpen</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  Circle: () => <span>Circle</span>,
  Clock: () => <span>Clock</span>,
}));

// Mock UI components
jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-content">{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button data-testid="button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
}));

describe("TasksFilesSidebar", () => {
  const mockTodos: TodoItem[] = [
    { id: "1", content: "Task 1", status: "pending" },
    { id: "2", content: "Task 2", status: "in_progress" },
    { id: "3", content: "Task 3", status: "completed" },
    { id: "4", content: "Task 4", status: "pending" },
  ];

  const mockFiles: Record<string, string> = {
    "file1.txt": "Content of file 1",
    "file2.js": "Content of file 2",
  };

  const mockOnFileClick = jest.fn();
  const mockOnToggleCollapse = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly in expanded state", () => {
    render(
      <TasksFilesSidebar
        todos={mockTodos}
        files={mockFiles}
        onFileClick={mockOnFileClick}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByTestId("tabs")).toBeInTheDocument();
    expect(screen.getByTestId("tabs-list")).toBeInTheDocument();
    expect(screen.getByTestId("tab-trigger-tasks")).toBeInTheDocument();
    expect(screen.getByTestId("tab-trigger-files")).toBeInTheDocument();
    
    // Check that both tabs show correct counts
    expect(screen.getByText("Tasks (4)")).toBeInTheDocument();
    expect(screen.getByText("Files (2)")).toBeInTheDocument();
  });

  it("renders correctly in collapsed state", () => {
    render(
      <TasksFilesSidebar
        todos={mockTodos}
        files={mockFiles}
        onFileClick={mockOnFileClick}
        collapsed={true}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    expect(screen.getByText("ChevronRight")).toBeInTheDocument();
    expect(screen.queryByTestId("tabs")).not.toBeInTheDocument();
    expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
  });

  it("calls onToggleCollapse when expand/collapse button is clicked", () => {
    // Test in expanded state
    render(
      <TasksFilesSidebar
        todos={mockTodos}
        files={mockFiles}
        onFileClick={mockOnFileClick}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    fireEvent.click(screen.getByText("ChevronLeft"));
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);

    // Test in collapsed state
    render(
      <TasksFilesSidebar
        todos={mockTodos}
        files={mockFiles}
        onFileClick={mockOnFileClick}
        collapsed={true}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    fireEvent.click(screen.getByText("ChevronRight"));
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(2);
  });

  it("displays todos grouped by status", () => {
    render(
      <TasksFilesSidebar
        todos={mockTodos}
        files={mockFiles}
        onFileClick={mockOnFileClick}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    // Switch to tasks tab
    fireEvent.click(screen.getByTestId("tab-trigger-tasks"));

    // Check for each group
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();

    // Check that todos are rendered with correct icons
    expect(screen.getByText("Task 1")).toBeInTheDocument(); // pending
    expect(screen.getByText("Task 2")).toBeInTheDocument(); // in_progress
    expect(screen.getByText("Task 3")).toBeInTheDocument(); // completed
    expect(screen.getByText("Task 4")).toBeInTheDocument(); // pending
  });

  it("displays file list correctly", () => {
    render(
      <TasksFilesSidebar
        todos={mockTodos}
        files={mockFiles}
        onFileClick={mockOnFileClick}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    // Switch to files tab
    fireEvent.click(screen.getByTestId("tab-trigger-files"));

    // Check that files are rendered
    expect(screen.getByText("file1.txt")).toBeInTheDocument();
    expect(screen.getByText("file2.js")).toBeInTheDocument();
  });

  it("handles empty todos list", () => {
    render(
      <TasksFilesSidebar
        todos={[]}
        files={mockFiles}
        onFileClick={mockOnFileClick}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    // Switch to tasks tab
    fireEvent.click(screen.getByTestId("tab-trigger-tasks"));

    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  });

  it("handles empty files list", () => {
    render(
      <TasksFilesSidebar
        todos={mockTodos}
        files={{}}
        onFileClick={mockOnFileClick}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    // Switch to files tab
    fireEvent.click(screen.getByTestId("tab-trigger-files"));

    expect(screen.getByText("No files yet")).toBeInTheDocument();
  });

  it("calls onFileClick when a file is clicked", () => {
    render(
      <TasksFilesSidebar
        todos={mockTodos}
        files={mockFiles}
        onFileClick={mockOnFileClick}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    // Switch to files tab
    fireEvent.click(screen.getByTestId("tab-trigger-files"));

    // Click on the first file
    fireEvent.click(screen.getByText("file1.txt"));

    expect(mockOnFileClick).toHaveBeenCalledWith({
      path: "file1.txt",
      content: "Content of file 1",
    });
  });

  it("displays correct icons for each todo status", () => {
    render(
      <TasksFilesSidebar
        todos={mockTodos}
        files={mockFiles}
        onFileClick={mockOnFileClick}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    // Switch to tasks tab
    fireEvent.click(screen.getByTestId("tab-trigger-tasks"));

    // Check that all the required icons are present
    expect(screen.getAllByText("Circle")).toHaveLength(2); // 2 pending tasks
    expect(screen.getByText("Clock")).toBeInTheDocument();  // 1 in_progress task
    expect(screen.getByText("CheckCircle")).toBeInTheDocument(); // 1 completed task
  });

  it("shows correct task counts in tab headers", () => {
    render(
      <TasksFilesSidebar
        todos={mockTodos}
        files={mockFiles}
        onFileClick={mockOnFileClick}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    // Check tasks count (4 tasks total)
    expect(screen.getByText("Tasks (4)")).toBeInTheDocument();
    
    // Check files count (2 files)
    expect(screen.getByText("Files (2)")).toBeInTheDocument();
  });
});