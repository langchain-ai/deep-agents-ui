import React from "react";
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "./ChatMessage";
import { Message } from "@langchain/langgraph-sdk";
import { ToolCall, SubAgent } from "../../types/types";

// Mock child components
jest.mock("../SubAgentIndicator/SubAgentIndicator", () => ({
  SubAgentIndicator: ({ subAgent, onClick }: { subAgent: any; onClick: () => void }) => (
    <div data-testid="sub-agent-indicator" onClick={onClick}>
      {subAgent.subAgentName}
    </div>
  ),
}));

jest.mock("../ToolCallBox/ToolCallBox", () => ({
  ToolCallBox: ({ toolCall }: { toolCall: any }) => (
    <div data-testid="tool-call-box">{toolCall.name}</div>
  ),
}));

jest.mock("../MarkdownContent/MarkdownContent", () => ({
  MarkdownContent: ({ content }: { content: string }) => (
    <div data-testid="markdown-content">{content}</div>
  ),
}));

// Mock SCSS module
jest.mock("./ChatMessage.module.scss", () => ({
  message: "message",
  user: "user",
  assistant: "assistant",
  avatar: "avatar",
  avatarHidden: "avatarHidden",
  avatarIcon: "avatarIcon",
  content: "content",
  bubble: "bubble",
  text: "text",
  toolCalls: "toolCalls",
  subAgents: "subAgents",
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  User: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="user-icon" />
  ),
  Bot: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="bot-icon" />
  ),
}));

const mockOnSelectSubAgent = jest.fn();

describe("ChatMessage", () => {
  const baseMessage: Message = {
    id: "1",
    type: "ai",
    content: "Hello, this is a test message",
  };

  const mockToolCalls: ToolCall[] = [
    {
      id: "tool-1",
      name: "search",
      args: { query: "test" },
      status: "completed",
    },
    {
      id: "tool-2",
      name: "task",
      args: {
        subagent_type: "researcher",
        description: "Research topic",
      },
      status: "completed",
    },
  ];

  const mockSubAgent: SubAgent = {
    id: "tool-2",
    name: "task",
    subAgentName: "researcher",
    input: "Research topic",
    status: "completed",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user message correctly", () => {
    const userMessage: Message = { ...baseMessage, type: "human", content: "User message" };

    render(
      <ChatMessage
        message={userMessage}
        toolCalls={[]}
        showAvatar={true}
        onSelectSubAgent={mockOnSelectSubAgent}
        selectedSubAgent={null}
      />
    );

    expect(screen.getByTestId("user-icon")).toBeInTheDocument();
    expect(screen.getByText("User message")).toBeInTheDocument();
    expect(screen.getByText("User message")).toHaveClass("text");
  });

  it("renders assistant message correctly", () => {
    render(
      <ChatMessage
        message={baseMessage}
        toolCalls={[]}
        showAvatar={true}
        onSelectSubAgent={mockOnSelectSubAgent}
        selectedSubAgent={null}
      />
    );

    expect(screen.getByTestId("bot-icon")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
    expect(screen.getByText("Hello, this is a test message")).toBeInTheDocument();
  });

  it("hides avatar when showAvatar is false", () => {
    render(
      <ChatMessage
        message={baseMessage}
        toolCalls={[]}
        showAvatar={false}
        onSelectSubAgent={mockOnSelectSubAgent}
        selectedSubAgent={null}
      />
    );

    // When showAvatar is false, the icon should not be rendered
    expect(screen.queryByTestId("bot-icon")).not.toBeInTheDocument();

    // But the avatar container should still exist and have the avatarHidden class
    const avatarElement = document.querySelector('.avatar');
    expect(avatarElement).toHaveClass("avatarHidden");
  });

  it("shows tool calls when they exist", () => {
    const toolCallsWithNonTask: ToolCall[] = [
      {
        id: "tool-1",
        name: "search",
        args: { query: "test" },
        status: "completed",
      },
    ];

    render(
      <ChatMessage
        message={baseMessage}
        toolCalls={toolCallsWithNonTask}
        showAvatar={true}
        onSelectSubAgent={mockOnSelectSubAgent}
        selectedSubAgent={null}
      />
    );

    expect(screen.getByTestId("tool-call-box")).toBeInTheDocument();
    expect(screen.getByText("search")).toBeInTheDocument();
  });

  it("filters out task tool calls from display", () => {
    const toolCallsWithOnlyTask: ToolCall[] = [
      {
        id: "tool-2",
        name: "task",
        args: {
          subagent_type: "researcher",
          description: "Research topic",
        },
        status: "completed",
      },
    ];

    render(
      <ChatMessage
        message={baseMessage}
        toolCalls={toolCallsWithOnlyTask}
        showAvatar={true}
        onSelectSubAgent={mockOnSelectSubAgent}
        selectedSubAgent={null}
      />
    );

    // Task tool calls should not appear in the tool calls section
    // Only sub-agents should be displayed
    expect(screen.queryByTestId("tool-call-box")).not.toBeInTheDocument();
  });

  it("shows sub-agents when task tool calls with subagent_type exist", () => {
    render(
      <ChatMessage
        message={baseMessage}
        toolCalls={mockToolCalls}
        showAvatar={true}
        onSelectSubAgent={mockOnSelectSubAgent}
        selectedSubAgent={null}
      />
    );

    expect(screen.getByTestId("sub-agent-indicator")).toBeInTheDocument();
    expect(screen.getByText("researcher")).toBeInTheDocument();
  });

  it("calls onSelectSubAgent when sub-agent is clicked", () => {
    render(
      <ChatMessage
        message={baseMessage}
        toolCalls={mockToolCalls}
        showAvatar={true}
        onSelectSubAgent={mockOnSelectSubAgent}
        selectedSubAgent={null}
      />
    );

    const subAgentElement = screen.getByTestId("sub-agent-indicator");
    subAgentElement.click();

    expect(mockOnSelectSubAgent).toHaveBeenCalledWith(mockSubAgent);
  });

  it("does not show sub-agents for user messages", () => {
    const userMessage: Message = { ...baseMessage, type: "human", content: "User message" };

    render(
      <ChatMessage
        message={userMessage}
        toolCalls={mockToolCalls}
        showAvatar={true}
        onSelectSubAgent={mockOnSelectSubAgent}
        selectedSubAgent={null}
      />
    );

    expect(screen.queryByTestId("sub-agent-indicator")).not.toBeInTheDocument();
  });

  it("handles empty message content", () => {
    const emptyMessage: Message = { ...baseMessage, content: "" };

    render(
      <ChatMessage
        message={emptyMessage}
        toolCalls={[]}
        showAvatar={true}
        onSelectSubAgent={mockOnSelectSubAgent}
        selectedSubAgent={null}
      />
    );

    // Check that the bubble doesn't render when content is empty
    expect(screen.queryByTestId("markdown-content")).not.toBeInTheDocument();
  });

  it("handles message with array content", () => {
    const arrayContentMessage: Message = {
      ...baseMessage,
      type: "ai",
      content: [
        { type: "text", text: "Part 1 of message" },
        { type: "text", text: "Part 2 of message" },
      ],
    };

    render(
      <ChatMessage
        message={arrayContentMessage}
        toolCalls={[]}
        showAvatar={true}
        onSelectSubAgent={mockOnSelectSubAgent}
        selectedSubAgent={null}
      />
    );

    expect(screen.getByTestId("markdown-content")).toHaveTextContent("Part 1 of messagePart 2 of message");
  });

  it("applies correct CSS classes based on message type", () => {
    // Test assistant message
    const { rerender } = render(
      <ChatMessage
        message={baseMessage}
        toolCalls={[]}
        showAvatar={true}
        onSelectSubAgent={mockOnSelectSubAgent}
        selectedSubAgent={null}
      />
    );

    expect(screen.getByTestId("bot-icon").closest(".message")).toHaveClass("assistant");

    // Test user message
    const userMessage: Message = { ...baseMessage, type: "human", content: "User message" };
    rerender(
      <ChatMessage
        message={userMessage}
        toolCalls={[]}
        showAvatar={true}
        onSelectSubAgent={mockOnSelectSubAgent}
        selectedSubAgent={null}
      />
    );

    expect(screen.getByTestId("user-icon").closest(".message")).toHaveClass("user");
  });
});