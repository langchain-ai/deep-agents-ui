import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuthContext } from "./Auth";

// Mock component to test the context
const TestComponent = () => {
  const { session } = useAuthContext();
  return (
    <div>
      {session ? (
        <div>
          {session.accessToken ? (
            <span data-testid="session-token">{session.accessToken}</span>
          ) : (
            <span data-testid="session-token">no-token</span>
          )}
          <span data-testid="session-available">yes</span>
        </div>
      ) : (
        <span data-testid="session-available">no</span>
      )}
    </div>
  );
};

describe("Auth Context", () => {
  beforeEach(() => {
    // Clear any existing environment variables for consistent tests
    delete process.env.NEXT_PUBLIC_LANGSMITH_API_KEY;
  });

  it("provides session with environment variable token when set", async () => {
    // Set the environment variable before rendering
    process.env.NEXT_PUBLIC_LANGSMITH_API_KEY = "test-api-key";

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for token to be loaded
    await waitFor(() => {
      expect(screen.getByTestId("session-token")).not.toHaveTextContent("no-token");
    });

    expect(screen.getByTestId("session-token")).toHaveTextContent("test-api-key");
  });

  it("provides session context to nested components", async () => {
    const NestedComponent = () => {
      const { session } = useAuthContext();
      return (
        <span data-testid="nested-token">
          {session?.accessToken || "no-token"}
        </span>
      );
    };

    const ComponentWithNested = () => (
      <AuthProvider>
        <div>
          <TestComponent />
          <NestedComponent />
        </div>
      </AuthProvider>
    );

    // Set the default token
    process.env.NEXT_PUBLIC_LANGSMITH_API_KEY = "demo-token";
    
    render(<ComponentWithNested />);

    // Wait for nested token to be loaded
    await waitFor(() => {
      expect(screen.getByTestId("nested-token")).not.toHaveTextContent("no-token");
    });

    expect(screen.getByTestId("nested-token")).toHaveTextContent("demo-token");
  });

  it("returns the default null session value when context is accessed outside provider", () => {
    // Create a component that uses the context outside of the provider
    const ComponentOutsideProvider = () => {
      const { session } = useAuthContext();
      return (
        <div>
          <span data-testid="session-outside-available">{session ? "yes" : "no"}</span>
          <span data-testid="session-outside-token">{session?.accessToken || "null"}</span>
        </div>
      );
    };

    render(<ComponentOutsideProvider />);

    // When used outside the provider, it should return the default value from createContext
    expect(screen.getByTestId("session-outside-available")).toHaveTextContent("no");
    expect(screen.getByTestId("session-outside-token")).toHaveTextContent("null");
  });

  it("maintains stable session value after initial render", async () => {
    // Set the default token
    process.env.NEXT_PUBLIC_LANGSMITH_API_KEY = "demo-token";
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for token to be loaded
    await waitFor(() => {
      expect(screen.getByTestId("session-token")).not.toHaveTextContent("no-token");
    });

    // Get the token element and ensure it's the expected value
    const tokenElement = screen.getByTestId("session-token");
    expect(tokenElement.textContent).toBe("demo-token");
  });
});