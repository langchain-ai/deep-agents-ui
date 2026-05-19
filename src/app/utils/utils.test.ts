import { Message } from "@langchain/langgraph-sdk";
import { extractStringFromMessageContent } from "./utils";

// Note: We're using a simplified interface since we can't import the exact
// Message interface from the SDK without type conflicts
type TestMessage = {
  id: string;
  type: string;
  content: string | any[];
};

describe("extractStringFromMessageContent", () => {
  it("should return string content when message.content is a string", () => {
    const message = {
      id: "1",
      content: "Hello, world!",
      type: "human",
    } as TestMessage;

    const result = extractStringFromMessageContent(message as Message);
    expect(result).toBe("Hello, world!");
  });

  it("should return empty string when message.content is an empty string", () => {
    const message = {
      id: "1",
      content: "",
      type: "human",
    } as TestMessage;

    const result = extractStringFromMessageContent(message as Message);
    expect(result).toBe("");
  });

  it("should extract text from array of content items with text type", () => {
    const message = {
      id: "1",
      content: [
        { type: "text", text: "Hello" },
        { type: "text", text: " " },
        { type: "text", text: "World" },
      ],
      type: "human",
    } as TestMessage;

    const result = extractStringFromMessageContent(message as Message);
    expect(result).toBe("Hello World");
  });

  it("should extract text from array of mixed content items", () => {
    const message = {
      id: "1",
      content: [
        { type: "text", text: "Hello" },
        { type: "image_url", data: "image-data" }, // Using valid type
        { type: "text", text: "World" },
        " plain text ",
      ],
      type: "human",
    } as TestMessage;

    const result = extractStringFromMessageContent(message as Message);
    expect(result).toBe("HelloWorld plain text ");
  });

  it("should return empty string when content array has no text items", () => {
    const message = {
      id: "1",
      content: [
        { type: "image_url", data: "image-data" },
      ],
      type: "human",
    } as TestMessage;

    const result = extractStringFromMessageContent(message as Message);
    expect(result).toBe("");
  });

  it("should handle content array with non-text objects that have no text property", () => {
    const message = {
      id: "1",
      content: [
        { type: "text", text: "Hello" },
        { type: "image_url", other: "data" }, // Using valid type
        { type: "text", text: "World" },
      ],
      type: "human",
    } as TestMessage;

    const result = extractStringFromMessageContent(message as Message);
    expect(result).toBe("HelloWorld");
  });

  it("should return empty string when content type is not recognized", () => {
    const message = {
      id: "1",
      content: 123, // Non-string, non-array content
      type: "human",
    } as any as TestMessage;

    const result = extractStringFromMessageContent(message as Message);
    expect(result).toBe("");
  });

  it("should handle array with string elements", () => {
    const message = {
      id: "1",
      content: ["Hello", " ", "World"],
      type: "human",
    } as TestMessage;

    const result = extractStringFromMessageContent(message as Message);
    expect(result).toBe("Hello World");
  });
});