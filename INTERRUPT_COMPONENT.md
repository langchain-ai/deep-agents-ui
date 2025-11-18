# LangGraph Interrupt Component

## Overview

The `InterruptActions` component provides a default UI for handling human-in-the-loop interrupts from LangGraph applications, particularly those using deep agents from LangChain. This component displays tool calls that require human approval and provides an intuitive interface for approving, editing, or rejecting them.

## Features

- ✅ **Approve**: Execute tool calls as-is without modifications
- ✏️ **Edit**: Modify tool arguments before execution
- ❌ **Reject**: Cancel tool calls with feedback to the agent
- 🔄 **Multiple Interrupts**: Handle multiple tool calls in a single interrupt batch
- 🎨 **Visual Feedback**: Color-coded states (orange for pending, blue for editing, red for rejecting)
- 📱 **Responsive Design**: Works seamlessly across different screen sizes
- 🔒 **Permission-Aware**: Respects interrupt configuration (allow_accept, allow_edit, allow_respond)

## Usage

### Basic Implementation

The component is already integrated into the `ChatInterface` component. When an interrupt occurs, it will automatically render the `InterruptActions` component:

```tsx
import { InterruptActions } from "@/app/components/InterruptActions";

// In your chat interface
{interrupt && (
  <InterruptActions
    interrupt={interrupt}
    onSubmit={sendHumanResponse}
    isLoading={isLoading}
  />
)}
```

### Component Props

```typescript
interface InterruptActionsProps {
  interrupt: Interrupt;           // The interrupt object from LangGraph SDK
  onSubmit: (responses: HumanResponse[]) => void;  // Callback when decisions are made
  isLoading?: boolean;            // Optional loading state
}
```

### Response Types

The component generates `HumanResponse` objects based on user actions:

```typescript
type HumanResponse = {
  type: "accept" | "ignore" | "response" | "edit";
  args: null | string | ActionRequest;
};
```

- **Accept**: `{ type: "accept", args: null }` - Approves the tool call as-is
- **Edit**: `{ type: "edit", args: { action: "tool_name", args: {...} } }` - Executes with modified arguments
- **Reject**: `{ type: "response", args: "rejection reason..." }` - Cancels with feedback

## LangGraph Configuration

### Backend Setup (Python)

To use interrupts with deep agents, configure the human-in-the-loop middleware:

```python
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langgraph.checkpoint.memory import InMemorySaver

agent = create_agent(
    model="gpt-4o",
    tools=[read_file_tool, write_file_tool, send_email_tool],
    checkpointer=InMemorySaver(),
    middleware=[
        HumanInTheLoopMiddleware(
            interrupt_on={
                "write_file_tool": {
                    "allowed_decisions": ["approve", "edit", "reject"],
                },
                "send_email_tool": {
                    "allowed_decisions": ["approve", "reject"],
                },
                "read_file_tool": False,  # No approval needed
            }
        ),
    ],
)
```

### Backend Setup (JavaScript/TypeScript)

```typescript
import { createAgent, humanInTheLoopMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [readFileTool, writeFileTool, sendEmailTool],
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: {
        write_file_tool: {
          allowAccept: true,
          allowEdit: true,
          allowRespond: true,
        },
        send_email_tool: {
          allowAccept: true,
          allowEdit: false,
          allowRespond: true,
        },
        read_file_tool: false,  // No approval needed
      }
    })
  ]
});
```

## Component Behavior

### Single Interrupt

When a single tool call requires approval:
1. The component displays the tool name and arguments
2. User clicks "Approve", "Edit", or "Reject"
3. For "Approve", the decision is immediately submitted
4. For "Edit", argument fields become editable
5. For "Reject", a text area appears for feedback
6. The decision is sent to the backend via `onSubmit`

### Multiple Interrupts

When multiple tool calls require approval:
1. Each interrupt is shown in a separate card
2. User can make decisions for each individually
3. A "Submit All Decisions" button appears at the bottom
4. All decisions are sent together in the correct order

### Argument Editing

- Arguments are displayed with expand/collapse functionality
- In edit mode, each argument becomes editable in a textarea
- The component attempts to parse JSON but accepts plain strings
- Changes are captured and sent back as edited arguments

### Visual States

- **Default (Orange)**: Waiting for decision
- **Editing (Blue)**: User is modifying arguments
- **Rejecting (Red)**: User is providing rejection feedback

## Example Scenarios

### Scenario 1: File Operation Approval

```
Agent wants to write to a file:
- Action: write_file
- Arguments:
  - path: "/important/config.json"
  - content: "{ ... }"

User options:
1. Approve → File is written as-is
2. Edit → Modify path or content before writing
3. Reject → Provide reason why file shouldn't be written
```

### Scenario 2: Email Approval

```
Agent wants to send an email:
- Action: send_email
- Arguments:
  - to: "customer@example.com"
  - subject: "Your order update"
  - body: "..."

User options:
1. Approve → Email is sent
2. Edit → Change recipient, subject, or body
3. Reject → Explain why email shouldn't be sent
```

### Scenario 3: Multiple Tool Calls

```
Agent wants to perform multiple actions:
1. read_database (query: "SELECT * FROM users")
2. send_email (to: "admin@example.com", subject: "User report", body: "...")

User can:
- Approve the database read
- Edit the email recipient
- Submit both decisions together
```

## Customization

### Custom Styling

The component uses Tailwind CSS and can be customized by modifying the classes in the component file:

```tsx
// Change the interrupt card color
className="border-orange-500 bg-orange-50/50"

// Modify button styles
className="bg-green-600 hover:bg-green-700"
```

### Custom Component

If you need a completely custom UI, you can replace the `InterruptActions` component:

```tsx
// In ChatInterface.tsx
{interrupt && (
  <YourCustomInterruptComponent
    interrupt={interrupt}
    onSubmit={sendHumanResponse}
  />
)}
```

Your custom component must:
1. Parse the interrupt value to extract `HumanInterrupt[]`
2. Collect user decisions
3. Call `onSubmit` with an array of `HumanResponse` objects in the correct order

## Debug Mode

In debug mode, the component is hidden and a simple "Continue (Debug)" button is shown instead. This allows developers to bypass interrupts during testing:

```tsx
{debugMode ? (
  <Button onClick={handleContinue}>Continue (Debug)</Button>
) : (
  <InterruptActions ... />
)}
```

## Best Practices

1. **Clear Descriptions**: Configure your tools with clear names and descriptions
2. **Conservative Edits**: When editing arguments, make minimal changes to avoid confusing the agent
3. **Meaningful Feedback**: When rejecting, provide clear explanations so the agent can adapt
4. **Order Matters**: For multiple interrupts, decisions must be provided in the same order as requests
5. **Test Thoroughly**: Test interrupt flows in both approve and reject scenarios

## Troubleshooting

### Issue: Interrupt Not Showing

**Cause**: Interrupt object is undefined or not properly configured
**Solution**: Ensure your backend is configured with interrupts and the stream is properly connected

### Issue: Edit Mode Not Working

**Cause**: `allow_edit` is false in the interrupt config
**Solution**: Update your backend configuration to allow editing for that tool

### Issue: Multiple Interrupts Not Batching

**Cause**: Interrupts are being sent separately instead of batched
**Solution**: Ensure your backend sends multiple interrupts as an array in the interrupt value

### Issue: Arguments Not Parsing

**Cause**: Complex argument types or special characters
**Solution**: The component handles both JSON and string values automatically. Check the browser console for parsing errors.

## Future Enhancements

Potential improvements for this component:

- [ ] Argument validation based on tool schemas
- [ ] Rich text editing for complex arguments
- [ ] Keyboard shortcuts (e.g., Ctrl+Enter to approve)
- [ ] Undo/redo for edits
- [ ] Bulk approve/reject for multiple interrupts
- [ ] Custom argument renderers for specific tool types
- [ ] History of past interrupt decisions
- [ ] A/B comparison for edited vs original arguments

## Related Documentation

- [LangGraph Human-in-the-Loop Docs](https://docs.langchain.com/oss/javascript/langchain/human-in-the-loop)
- [Deep Agents Documentation](https://docs.langchain.com/oss/javascript/deepagents/human-in-the-loop)
- [LangGraph SDK Reference](https://langchain-ai.github.io/langgraph/sdk/)

## Support

For issues or questions about this component:
1. Check the browser console for error messages
2. Verify your LangGraph backend configuration
3. Ensure the LangGraph SDK version is compatible
4. Review the interrupt payload structure in the network tab

