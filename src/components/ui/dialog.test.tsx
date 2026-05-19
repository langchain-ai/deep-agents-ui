import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogPortal, DialogOverlay, DialogClose } from "./dialog";

// Add fail function if not imported from Jest
const fail = (message: string) => {
  throw new Error(message);
};

describe("Dialog", () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
  });

  it("renders Dialog with children", () => {
    render(
      <Dialog>
        <div>Dialog Content</div>
      </Dialog>
    );

    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
  });

  it("calls onOpenChange when open state changes", () => {
    render(
      <Dialog open onOpenChange={mockOnOpenChange}>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          <div>Dialog Content</div>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByText("Open Dialog");
    fireEvent.click(trigger);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("opens dialog when trigger is clicked", () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          <div>Dialog Content</div>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByText("Open Dialog");
    fireEvent.click(trigger);

    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
  });

  it("closes dialog when close button is clicked", async () => {
    const onOpenChange = jest.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent data-testid="dialog-content">
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          Dialog Content
        </DialogContent>
      </Dialog>
    );

    const closeButton = screen.getByRole("button", { name: /Close/i });
    fireEvent.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes dialog when overlay is clicked", async () => {
    const onOpenChange = jest.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent data-testid="dialog-content">
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          Dialog Content
        </DialogContent>
      </Dialog>
    );

    // Wait for the dialog to render first
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Wait for the overlay to be in the document before clicking
    await waitFor(() => {
      const overlay = document.querySelector('[data-slot="dialog-overlay"]');
      expect(overlay).toBeInTheDocument();
    });

    const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement;

    // Radix UI's DialogOverlay closes on pointer down events
    fireEvent.pointerDown(overlay);

    // Wait for the onOpenChange callback to be called
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    }, { timeout: 1000 });
  });

  it("shows close button by default", () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog-content">
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          Dialog Content
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByRole("button", { name: /Close/i })).toBeInTheDocument();
  });

  it("does not show close button when showCloseButton is false", () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          Dialog Content
        </DialogContent>
      </Dialog>
    );

    expect(screen.queryByRole("button", { name: /Close/i })).not.toBeInTheDocument();
  });

  it("renders DialogHeader with correct classes", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          <DialogHeader data-testid="dialog-header">Header Content</DialogHeader>
        </DialogContent>
      </Dialog>
    );

    const header = screen.getByTestId("dialog-header");
    expect(header).toHaveClass("flex");
    expect(header).toHaveClass("flex-col");
    expect(header).toHaveClass("gap-2");
    expect(header).toHaveClass("text-center");
    expect(header).toHaveClass("sm:text-left");
  });

  it("renders DialogFooter with correct classes", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          <DialogFooter data-testid="dialog-footer">Footer Content</DialogFooter>
        </DialogContent>
      </Dialog>
    );

    const footer = screen.getByTestId("dialog-footer");
    expect(footer).toHaveClass("flex");
    expect(footer).toHaveClass("flex-col-reverse");
    expect(footer).toHaveClass("gap-2");
    expect(footer).toHaveClass("sm:flex-row");
    expect(footer).toHaveClass("sm:justify-end");
  });

  it("renders DialogTitle with correct classes", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle data-testid="dialog-title">Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    const title = screen.getByTestId("dialog-title");
    expect(title).toHaveClass("text-lg");
    expect(title).toHaveClass("leading-none");
    expect(title).toHaveClass("font-semibold");
  });

  it("renders DialogDescription with correct classes", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription data-testid="dialog-description">Dialog Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    const description = screen.getByTestId("dialog-description");
    expect(description).toHaveClass("text-muted-foreground");
    expect(description).toHaveClass("text-sm");
  });

  it("applies custom class names when provided", () => {
    const customClassName = "custom-dialog-class";

    render(
      <Dialog open>
        <DialogContent className={customClassName} data-testid="dialog-content">
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          Dialog Content
        </DialogContent>
        <DialogHeader className={customClassName} data-testid="dialog-header">
          Header
        </DialogHeader>
        <DialogFooter className={customClassName} data-testid="dialog-footer">
          Footer
        </DialogFooter>
        <DialogTitle className={customClassName} data-testid="dialog-title">
          Title
        </DialogTitle>
        <DialogDescription className={customClassName} data-testid="dialog-description">
          Description
        </DialogDescription>
      </Dialog>
    );

    expect(screen.getByTestId("dialog-content")).toHaveClass(customClassName);
    expect(screen.getByTestId("dialog-header")).toHaveClass(customClassName);
    expect(screen.getByTestId("dialog-footer")).toHaveClass(customClassName);
    expect(screen.getByTestId("dialog-title")).toHaveClass(customClassName);
    expect(screen.getByTestId("dialog-description")).toHaveClass(customClassName);
  });

  it("renders with data-slot attributes", () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog-content">
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          Dialog Content
        </DialogContent>
      </Dialog>
    );

    const dialogContent = screen.getByTestId("dialog-content");
    expect(dialogContent).toHaveAttribute("data-slot", "dialog-content");

    // DialogPortal renders its children inside a portal, so we need to check if the portal structure is present
    // The dialog content will be inside an element that may be created by the portal
    // Let's check that the content rendered properly and the attributes are present
    expect(dialogContent).toBeInTheDocument();
  });

  it("renders Portal and Overlay components", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          Dialog Content
        </DialogContent>
      </Dialog>
    );

    // The dialog role element should exist
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Check if overlay exists by looking for the element with the overlay attributes
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).toBeInTheDocument();
  });

  it("handles nested dialogs", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Outer Dialog</DialogTitle>
          <DialogDescription>Outer dialog description</DialogDescription>
          <p data-testid="outer-content">Outer Dialog Content</p>
          <Dialog>
            <DialogTrigger>Open Inner Dialog</DialogTrigger>
            <DialogContent>
              <DialogTitle>Inner Dialog</DialogTitle>
              <DialogDescription>Inner dialog description</DialogDescription>
              <p data-testid="inner-content">Inner Dialog Content</p>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByTestId("outer-content")).toBeInTheDocument();

    const innerTrigger = screen.getByText("Open Inner Dialog");
    fireEvent.click(innerTrigger);

    expect(screen.getByTestId("inner-content")).toBeInTheDocument();
  });
});