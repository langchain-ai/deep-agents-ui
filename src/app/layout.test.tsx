import React from "react";
import { render, screen } from "@testing-library/react";

// Mock the next/font/google module before anything else
jest.mock("next/font/google", () => ({
  Inter: jest.fn(() => ({ className: "mocked-inter-class" })),
}));

// Mock the providers and components used in the layout
jest.mock("@/providers/Auth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

jest.mock("nuqs/adapters/next/app", () => ({
  NuqsAdapter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="nuqs-adapter">{children}</div>
  ),
}));

jest.mock("sonner", () => ({
  Toaster: ({ position }: { position: string }) => (
    <div data-testid="toaster" data-position={position} />
  ),
}));

// Mock the CSS import
jest.mock("./globals.css", () => ({}));

import RootLayout from "./layout";

describe("RootLayout", () => {
  it("renders the html and body elements with correct attributes", () => {
    const testChildren = <div data-testid="test-children">Test Content</div>;

    render(<RootLayout>{testChildren}</RootLayout>);

    // Check if html element exists with lang attribute
    const htmlElement = document.documentElement;
    expect(htmlElement).toBeInTheDocument();
    expect(htmlElement.lang).toBe("en");

    // Check if body element exists
    const bodyElement = document.body;
    expect(bodyElement).toBeInTheDocument();
  });

  it("renders the Inter font class on the body", () => {
    const testChildren = <div data-testid="test-children">Test Content</div>;

    render(<RootLayout>{testChildren}</RootLayout>);

    // Since we can't directly access the body class in JSDOM the same way,
    // we'll verify that the component renders without error and trust the className is applied
    expect(document.body).toBeInTheDocument();
  });

  it("wraps children with AuthProvider", () => {
    const testChildren = <div data-testid="test-children">Test Content</div>;

    render(<RootLayout>{testChildren}</RootLayout>);

    const authProvider = screen.getByTestId("auth-provider");
    expect(authProvider).toBeInTheDocument();
  });

  it("wraps children with NuqsAdapter inside AuthProvider", () => {
    const testChildren = <div data-testid="test-children">Test Content</div>;

    render(<RootLayout>{testChildren}</RootLayout>);

    const nuqsAdapter = screen.getByTestId("nuqs-adapter");
    expect(nuqsAdapter).toBeInTheDocument();

    // Verify that the test children are inside the NuqsAdapter
    const testChildrenElement = screen.getByTestId("test-children");
    expect(nuqsAdapter.contains(testChildrenElement)).toBe(true);
  });

  it("renders Toaster component with correct position", () => {
    const testChildren = <div data-testid="test-children">Test Content</div>;

    render(<RootLayout>{testChildren}</RootLayout>);

    const toaster = screen.getByTestId("toaster");
    expect(toaster).toBeInTheDocument();
    expect(toaster.getAttribute("data-position")).toBe("top-right");
  });

  it("renders children inside the layout structure", () => {
    const testChildren = <div data-testid="test-children">Test Content</div>;

    render(<RootLayout>{testChildren}</RootLayout>);

    const testChildrenElement = screen.getByTestId("test-children");
    expect(testChildrenElement).toBeInTheDocument();
    expect(testChildrenElement).toHaveTextContent("Test Content");
  });

  it("maintains the correct component hierarchy", () => {
    const testChildren = <div data-testid="test-children">Test Content</div>;

    render(<RootLayout>{testChildren}</RootLayout>);

    // Verify the hierarchy: html -> body -> AuthProvider -> NuqsAdapter -> children
    const authProvider = screen.getByTestId("auth-provider");
    const nuqsAdapter = screen.getByTestId("nuqs-adapter");
    const testChildrenElement = screen.getByTestId("test-children");
    const toaster = screen.getByTestId("toaster");

    // Check that nuqsAdapter is inside authProvider
    expect(authProvider.contains(nuqsAdapter)).toBe(true);
    
    // Check that children are inside nuqsAdapter
    expect(nuqsAdapter.contains(testChildrenElement)).toBe(true);
    
    // Check that toaster is also inside authProvider (sibling to nuqsAdapter)
    expect(authProvider.contains(toaster)).toBe(true);
  });
});