import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";
import "@testing-library/jest-dom/jest-globals";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

describe("Tabs Components", () => {
  it("renders Tabs component with correct structure", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );

    const tabsRoot = screen.getByRole("tablist");
    expect(tabsRoot).toBeInTheDocument();
    expect(tabsRoot).toHaveAttribute("data-slot", "tabs-list");
  });

  it("renders TabsList with correct class", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList className="custom-class">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
      </Tabs>
    );

    const tabsList = screen.getByRole("tablist");
    expect(tabsList).toHaveClass("bg-muted", "text-muted-foreground", "custom-class");
  });

  it("renders TabsTrigger with correct attributes", () => {
    render(
      <Tabs defaultValue="test-tab">
        <TabsList>
          <TabsTrigger value="test-tab" className="custom-trigger-class">
            Test Tab
          </TabsTrigger>
        </TabsList>
        <TabsContent value="test-tab">Test Content</TabsContent>
      </Tabs>
    );

    const tabTrigger = screen.getByRole("tab");
    expect(tabTrigger).toBeInTheDocument();
    expect(tabTrigger).toHaveTextContent("Test Tab");
    expect(tabTrigger).toHaveClass("custom-trigger-class");
    expect(tabTrigger).toHaveAttribute("data-slot", "tabs-trigger");
    // Radix UI TabsTrigger doesn't have a direct value attribute in the DOM,
    // but it does have a data-state attribute that we can check
    expect(tabTrigger).toHaveAttribute("data-radix-collection-item");
  });

  it("renders TabsContent with correct attributes", () => {
    render(
      <Tabs defaultValue="test-content">
        <TabsList>
          <TabsTrigger value="test-content">Test Tab</TabsTrigger>
        </TabsList>
        <TabsContent value="test-content" className="custom-content-class">
          Test Content
        </TabsContent>
      </Tabs>
    );

    const tabsContent = screen.getByRole("tabpanel");
    expect(tabsContent).toBeInTheDocument();
    expect(tabsContent).toHaveTextContent("Test Content");
    expect(tabsContent).toHaveClass("custom-content-class");
    expect(tabsContent).toHaveAttribute("data-slot", "tabs-content");
  });

  it("applies default styling classes to all components", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>
    );

    const tabsRoot = screen.getByRole("tablist").closest("[data-slot='tabs']");
    expect(tabsRoot).toHaveClass("flex", "flex-col", "gap-2");

    const tabsList = screen.getByRole("tablist");
    expect(tabsList).toHaveClass("bg-muted", "text-muted-foreground");

    const tabTrigger = screen.getByRole("tab");
    expect(tabTrigger).toHaveClass("text-foreground");

    // Find the tab content by its data-slot attribute, it might be hidden but still present in the DOM
    const tabContentElement = screen.getByText("Content").closest("[data-slot='tabs-content']");
    expect(tabContentElement).toHaveClass("flex-1", "outline-none");
  });

  it("preserves additional props passed to components", () => {
    render(
      <Tabs id="test-tabs" data-testid="tabs-root">
        <TabsList id="test-tabs-list" data-testid="tabs-list">
          <TabsTrigger 
            value="tab1" 
            id="test-tab-trigger" 
            data-testid="tab-trigger"
          >
            Tab 1
          </TabsTrigger>
        </TabsList>
        <TabsContent 
          value="tab1" 
          id="test-tab-content" 
          data-testid="tab-content"
        >
          Content 1
        </TabsContent>
      </Tabs>
    );

    expect(screen.getByTestId("tabs-root")).toBeInTheDocument();
    expect(screen.getByTestId("tabs-list")).toBeInTheDocument();
    expect(screen.getByTestId("tab-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("tab-content")).toBeInTheDocument();
  });
});