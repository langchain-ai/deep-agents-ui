// types/test-utils.d.ts
import "@testing-library/jest-dom";

declare module "@testing-library/jest-dom" {
  interface JestMatchers<R> {
    toBeInTheDocument(): R;
    toHaveClass(...classNames: string[]): R;
    toHaveAttribute(attr: string, value?: string): R;
    toHaveTextContent(text: string | RegExp): R;
    toHaveRole(role: string): R;
    toBeDisabled(): R;
    toHaveFocus(): R;
  }
}