import * as React from "react";
import { render, screen } from "@testing-library/react";
import { Input } from "./input";

describe("Input", () => {
  test("renders an input element", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  test("applies default props correctly", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("flex");
    expect(input).toHaveClass("h-9");
    expect(input).toHaveClass("w-full");
    expect(input).toHaveClass("min-w-0");
    expect(input).toHaveClass("rounded-md");
    expect(input).toHaveClass("border");
    expect(input).toHaveClass("bg-transparent");
    expect(input).toHaveClass("px-3");
    expect(input).toHaveClass("py-1");
    expect(input).toHaveClass("text-base");
    expect(input).toHaveClass("shadow-xs");
    expect(input).toHaveClass("transition-[color,box-shadow]");
    expect(input).toHaveClass("outline-none");
    expect(input).toHaveClass("disabled:pointer-events-none");
    expect(input).toHaveClass("disabled:cursor-not-allowed");
    expect(input).toHaveClass("disabled:opacity-50");
  });

  test("applies focus-visible classes correctly", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("class", expect.stringContaining("focus-visible:border-ring"));
    expect(input).toHaveAttribute("class", expect.stringContaining("focus-visible:ring-ring/50"));
    expect(input).toHaveAttribute("class", expect.stringContaining("focus-visible:ring-[3px]"));
  });

  test("applies aria-invalid classes correctly", () => {
    render(<Input aria-invalid="true" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("class", expect.stringContaining("aria-invalid:ring-destructive/20"));
    expect(input).toHaveAttribute("class", expect.stringContaining("aria-invalid:border-destructive"));
  });

  test("accepts and applies custom className prop", () => {
    render(<Input className="custom-class" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("custom-class");
  });

  test("passes through additional props", () => {
    render(<Input id="test-id" data-testid="test-input" />);
    const input = screen.getByTestId("test-input");
    expect(input).toHaveAttribute("id", "test-id");
  });

  test("respects the type prop", () => {
    render(<Input type="email" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "email");
  });

  test("handles placeholder correctly", () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText("Enter text");
    expect(input).toBeInTheDocument();
  });

  test("handles value correctly", () => {
    render(<Input defaultValue="initial value" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("initial value");
  });

  test("has data-slot attribute with value 'input'", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("data-slot", "input");
  });

  test("can be disabled", () => {
    render(<Input disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  test("handles different input types", () => {
    const { rerender } = render(<Input type="text" />);
    let input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "text");

    rerender(<Input type="email" />);
    input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "email");

    rerender(<Input type="tel" />);
    input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "tel");
  });
});