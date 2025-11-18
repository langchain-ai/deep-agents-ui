import { Thread, ThreadStatus } from "@langchain/langgraph-sdk";

/**
 * Configuration for a human interrupt, specifying what actions
 * are allowed when handling the interrupt.
 */
export interface HumanInterruptConfig {
  allow_ignore: boolean;
  allow_respond: boolean;
  allow_edit: boolean;
  allow_accept: boolean;
}

/**
 * Action request from the agent to the human.
 * This is part of a HumanInterrupt.
 */
export interface ActionRequest {
  action: string;
  args: Record<string, any>;
}

/**
 * Represents a human interrupt in the agent flow.
 * Similar to the LangGraph Interrupt type but with specific fields
 * for human interaction.
 */
export interface HumanInterrupt {
  action_request: ActionRequest;
  config: HumanInterruptConfig;
  description?: string;
}

/**
 * Human response to an agent interrupt.
 * Matches the LangGraph SDK format for resuming interrupts.
 */
export type HumanResponse =
  | { type: "approve" }
  | { type: "edit"; edited_action: { name: string; args: Record<string, any> } }
  | { type: "reject"; message: string };

/**
 * Extended thread status type that includes our custom statuses.
 * Based on LangGraph ThreadStatus with additions.
 */
export type EnhancedThreadStatus = ThreadStatus | "human_response_needed";

/**
 * Base thread data interface with common properties.
 * This serves as the foundation for all thread data types.
 */
interface BaseThreadData<T extends Record<string, any> = Record<string, any>> {
  thread: Thread<T>;
  invalidSchema?: boolean;
}

/**
 * Thread data for non-interrupted states.
 * Follows the discriminated union pattern where the status
 * field acts as the discriminator.
 */
export interface GenericThreadData<
  T extends Record<string, any> = Record<string, any>
> extends BaseThreadData<T> {
  status: "idle" | "busy" | "error" | "human_response_needed";
  interrupts?: undefined;
}

/**
 * Thread data for interrupted state.
 * Contains additional fields specific to interruptions.
 */
export interface InterruptedThreadData<
  T extends Record<string, any> = Record<string, any>
> extends BaseThreadData<T> {
  status: "interrupted";
  interrupts?: HumanInterrupt[];
}

/**
 * Union type for all thread data types.
 * Using discriminated union pattern for better type safety.
 */
export type ThreadData<T extends Record<string, any> = Record<string, any>> =
  | GenericThreadData<T>
  | InterruptedThreadData<T>;

/**
 * Thread status with special "all" option for filtering.
 */
export type ThreadStatusWithAll = EnhancedThreadStatus | "all";

/**
 * Configuration for an agent inbox.
 */
export interface AgentInbox {
  /**
   * A unique identifier for the inbox.
   */
  id: string;
  /**
   * The ID of the graph.
   */
  graphId: string;
  /**
   * The ID of the deployment.
   */
  deploymentId: string;
  /**
   * The URL of the deployment. Either a localhost URL, or a deployment URL.
   * @deprecated Use deploymentId instead.
   */
  deploymentUrl?: string;
  /**
   * Optional name for the inbox, used in the UI to label the inbox.
   */
  name?: string;
  /**
   * Whether or not the inbox is selected.
   */
  selected: boolean;
  /**
   * The tenant ID for the deployment (only for deployed graphs).
   */
  tenantId?: string;
  createdAt: string;
}
