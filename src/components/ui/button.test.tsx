import * as React from "react";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";
import { buttonVariants } from "./button";

describe("Button", () => {
  describe("Render", () => {
    it("renders a button element by default", () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe("BUTTON");
    });

    it("renders children correctly", () => {
      render(<Button>Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Test Button");
    });

    it("applies default classes", () => {
      render(<Button>Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("inline-flex");
      expect(button).toHaveClass("items-center");
      expect(button).toHaveClass("justify-center");
      expect(button).toHaveClass("gap-2");
      expect(button).toHaveClass("whitespace-nowrap");
      expect(button).toHaveClass("rounded-md");
      expect(button).toHaveClass("text-sm");
      expect(button).toHaveClass("font-medium");
      expect(button).toHaveClass("transition-all");
      expect(button).toHaveClass("disabled:pointer-events-none");
      expect(button).toHaveClass("disabled:opacity-50");
    });

    it("applies default variant and size classes", () => {
      render(<Button>Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-primary");
      expect(button).toHaveClass("text-primary-foreground");
      expect(button).toHaveClass("h-9");
      expect(button).toHaveClass("px-4");
      expect(button).toHaveClass("py-2");
    });
  });

  describe("Props", () => {
    it("handles custom className prop", () => {
      render(<Button className="custom-class">Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });

    it("respects disabled prop", () => {
      render(<Button disabled>Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveClass("disabled:pointer-events-none");
      expect(button).toHaveClass("disabled:opacity-50");
    });

    it("handles asChild prop correctly", () => {
      render(
        <Button asChild>
          <a href="#">Link Button</a>
        </Button>
      );
      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe("A");
    });
  });

  describe("Variants", () => {
    it("applies default variant", () => {
      render(<Button variant="default">Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-primary");
      expect(button).toHaveClass("text-primary-foreground");
      expect(button).toHaveClass("shadow-xs");
      expect(button).toHaveClass("hover:bg-primary/90");
    });

    it("applies destructive variant", () => {
      render(<Button variant="destructive">Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-destructive");
      expect(button).toHaveClass("text-white");
      expect(button).toHaveClass("shadow-xs");
      expect(button).toHaveClass("hover:bg-destructive/90");
    });

    it("applies outline variant", () => {
      render(<Button variant="outline">Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("border");
      expect(button).toHaveClass("bg-background");
      expect(button).toHaveClass("shadow-xs");
      expect(button).toHaveClass("hover:bg-accent");
      expect(button).toHaveClass("hover:text-accent-foreground");
    });

    it("applies secondary variant", () => {
      render(<Button variant="secondary">Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-secondary");
      expect(button).toHaveClass("text-secondary-foreground");
      expect(button).toHaveClass("shadow-xs");
      expect(button).toHaveClass("hover:bg-secondary/80");
    });

    it("applies ghost variant", () => {
      render(<Button variant="ghost">Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("hover:bg-accent");
      expect(button).toHaveClass("hover:text-accent-foreground");
    });

    it("applies link variant", () => {
      render(<Button variant="link">Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("text-primary");
      expect(button).toHaveClass("underline-offset-4");
      expect(button).toHaveClass("hover:underline");
    });
  });

  describe("Sizes", () => {
    it("applies default size", () => {
      render(<Button size="default">Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-9");
      expect(button).toHaveClass("px-4");
      expect(button).toHaveClass("py-2");
    });

    it("applies sm size", () => {
      render(<Button size="sm">Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-8");
      expect(button).toHaveClass("rounded-md");
      expect(button).toHaveClass("gap-1.5");
      expect(button).toHaveClass("px-3");
    });

    it("applies lg size", () => {
      render(<Button size="lg">Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10");
      expect(button).toHaveClass("rounded-md");
      expect(button).toHaveClass("px-6");
    });

    it("applies icon size", () => {
      render(<Button size="icon">Test Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("size-9");
    });
  });

  describe("buttonVariants function", () => {
    it("returns correct classes for default variant and size", () => {
      const classes = buttonVariants();
      expect(classes).toContain("bg-primary");
      expect(classes).toContain("h-9");
    });

    it("returns correct classes for specific variant and size", () => {
      const classes = buttonVariants({ variant: "destructive", size: "sm" });
      expect(classes).toContain("bg-destructive");
      expect(classes).toContain("h-8");
    });

    it("returns correct classes when className is provided", () => {
      const classes = buttonVariants({ className: "custom-class" });
      expect(classes).toContain("custom-class");
    });
  });
});