import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolCallBox } from './ToolCallBox';
import { ToolCall } from '../../types/types';

// Mock the SCSS module
jest.mock('./ToolCallBox.module.scss', () => ({
  container: 'container',
  header: 'header',
  headerLeft: 'headerLeft',
  toolName: 'toolName',
  content: 'content',
  section: 'section',
  sectionTitle: 'sectionTitle',
  codeBlock: 'codeBlock',
  statusCompleted: 'statusCompleted',
  statusError: 'statusError',
  statusRunning: 'statusRunning',
  statusDefault: 'statusDefault',
}));

// Mock the Lucide React icons
jest.mock('lucide-react', () => ({
  ChevronDown: () => <span data-testid="chevron-down" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
  Terminal: () => <span data-testid="terminal" />,
  CheckCircle: () => <span data-testid="check-circle" />,
  AlertCircle: () => <span data-testid="alert-circle" />,
  Loader: () => <span data-testid="loader" />,
}));

// Mock the Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button 
      data-testid="button" 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
    >
      {children}
    </button>
  ),
}));

describe('ToolCallBox', () => {
  const defaultProps: ToolCall = {
    id: '1',
    name: 'Test Tool',
    args: { param1: 'value1', param2: 42 },
    status: 'completed',
  };

  it('renders the tool name correctly', () => {
    render(<ToolCallBox toolCall={defaultProps} />);
    
    expect(screen.getByText('Test Tool')).toBeInTheDocument();
  });

  it('displays the completed status icon when status is completed', () => {
    render(<ToolCallBox toolCall={{ ...defaultProps, status: 'completed' }} />);
    
    expect(screen.getByTestId('check-circle')).toBeInTheDocument();
  });

  it('displays the error status icon when status is error', () => {
    render(<ToolCallBox toolCall={{ ...defaultProps, status: 'error' }} />);
    
    expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
  });

  it('displays the pending status icon when status is pending', () => {
    render(<ToolCallBox toolCall={{ ...defaultProps, status: 'pending' }} />);
    
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('defaults to terminal icon for unknown status', () => {
    render(<ToolCallBox toolCall={{ ...defaultProps, status: 'unknown' as any }} />);
    
    expect(screen.getByTestId('terminal')).toBeInTheDocument();
  });

  it('expands and shows content when header is clicked', () => {
    render(<ToolCallBox toolCall={defaultProps} />);
    
    // Initially content should not be visible
    expect(screen.queryByText('Arguments')).not.toBeInTheDocument();
    
    // Click the header to expand
    fireEvent.click(screen.getByTestId('button'));
    
    // Content should now be visible
    expect(screen.getByText('Arguments')).toBeInTheDocument();
    expect(screen.getByText(/param1/)).toBeInTheDocument();
    expect(screen.getByText(/value1/)).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('collapses content when header is clicked again', () => {
    render(<ToolCallBox toolCall={defaultProps} />);
    
    // Expand first
    fireEvent.click(screen.getByTestId('button'));
    expect(screen.getByText('Arguments')).toBeInTheDocument();
    
    // Then collapse
    fireEvent.click(screen.getByTestId('button'));
    expect(screen.queryByText('Arguments')).not.toBeInTheDocument();
  });

  it('shows the result when provided', () => {
    const toolCallWithResult: ToolCall = {
      ...defaultProps,
      result: 'Success result',
    };

    render(<ToolCallBox toolCall={toolCallWithResult} />);
    
    fireEvent.click(screen.getByTestId('button')); // Expand
    
    expect(screen.getByText('Result')).toBeInTheDocument();
    expect(screen.getByText('Success result')).toBeInTheDocument();
  });

  it('shows JSON formatted result object when result is a stringified object', () => {
    const toolCallWithResult: ToolCall = {
      ...defaultProps,
      result: JSON.stringify({ status: 'success', data: [1, 2, 3] }),
    };

    render(<ToolCallBox toolCall={toolCallWithResult} />);

    fireEvent.click(screen.getByTestId('button')); // Expand

    expect(screen.getByText('Result')).toBeInTheDocument();
    expect(screen.getByText(/status/)).toBeInTheDocument();
    expect(screen.getByText(/success/)).toBeInTheDocument();
  });

  it('shows chevron down when expanded and chevron right when collapsed', () => {
    render(<ToolCallBox toolCall={defaultProps} />);

    // Initially collapsed - should show chevron right
    expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
    expect(screen.queryByTestId('chevron-down')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByTestId('button'));

    // Should now show chevron down
    expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
    expect(screen.queryByTestId('chevron-right')).not.toBeInTheDocument();
  });

  it('handles string args correctly', () => {
    const toolCallWithStringArgs: ToolCall = {
      ...defaultProps,
      args: JSON.stringify({ stringParam: 'hello', numParam: 123 }),
    };

    render(<ToolCallBox toolCall={toolCallWithStringArgs} />);
    
    fireEvent.click(screen.getByTestId('button')); // Expand
    
    expect(screen.getByText('Arguments')).toBeInTheDocument();
    expect(screen.getByText(/stringParam/)).toBeInTheDocument();
    expect(screen.getByText(/hello/)).toBeInTheDocument();
  });

  it('handles invalid JSON args gracefully', () => {
    const toolCallWithInvalidArgs: ToolCall = {
      ...defaultProps,
      args: 'invalid json {',
    };

    render(<ToolCallBox toolCall={toolCallWithInvalidArgs} />);
    
    fireEvent.click(screen.getByTestId('button')); // Expand
    
    expect(screen.getByText('Arguments')).toBeInTheDocument();
    expect(screen.getByText(/raw/)).toBeInTheDocument();
    expect(screen.getByText(/invalid json {/)).toBeInTheDocument();
  });

  it('handles missing result gracefully', () => {
    render(<ToolCallBox toolCall={defaultProps} />);
    
    fireEvent.click(screen.getByTestId('button')); // Expand
    
    // Should show args but not result section
    expect(screen.getByText('Arguments')).toBeInTheDocument();
    expect(screen.queryByText('Result')).not.toBeInTheDocument();
  });

  it('handles empty args and result by disabling the button', () => {
    const toolCallWithoutContent: ToolCall = {
      id: '2',
      name: 'No Content Tool',
      args: {},
      status: 'completed',
    };

    render(<ToolCallBox toolCall={toolCallWithoutContent} />);
    
    const button = screen.getByTestId('button');
    expect(button).toBeDisabled();
  });

  it('uses "Unknown Tool" when name is not provided', () => {
    const toolCallWithoutName: ToolCall = {
      id: '3',
      name: '',
      args: { test: 'value' },
      status: 'completed',
    };

    render(<ToolCallBox toolCall={toolCallWithoutName} />);
    
    expect(screen.getByText('Unknown Tool')).toBeInTheDocument();
  });

  it('defaults to "completed" status when not provided', () => {
    const toolCallWithoutStatus: ToolCall = {
      id: '4',
      name: 'Test Tool',
      args: { test: 'value' },
      // status is intentionally omitted to test default
    } as any;

    render(<ToolCallBox toolCall={toolCallWithoutStatus} />);
    
    expect(screen.getByTestId('check-circle')).toBeInTheDocument(); // completed icon
  });

  it('does not render content section when no content exists', () => {
    const toolCallWithoutContent: ToolCall = {
      id: '5',
      name: 'No Content Tool',
      args: {},
      status: 'completed',
    };

    render(<ToolCallBox toolCall={toolCallWithoutContent} />);
    
    // Button should be disabled and content should not be rendered
    expect(screen.getByTestId('button')).toBeDisabled();
    fireEvent.click(screen.getByTestId('button')); // Try to expand
    
    // Content should still not be rendered
    expect(screen.queryByText('Arguments')).not.toBeInTheDocument();
  });
});