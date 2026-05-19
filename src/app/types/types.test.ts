import { 
  ToolCall, 
  SubAgent, 
  FileItem, 
  TodoItem, 
  Thread 
} from './types';

describe('Types', () => {
  describe('ToolCall', () => {
    it('should have the correct structure', () => {
      const toolCall: ToolCall = {
        id: '1',
        name: 'test-tool',
        args: { param: 'value' },
        result: 'success',
        status: 'completed'
      };

      expect(toolCall).toHaveProperty('id');
      expect(toolCall).toHaveProperty('name');
      expect(toolCall).toHaveProperty('args');
      expect(toolCall).toHaveProperty('result');
      expect(toolCall).toHaveProperty('status');
      expect(toolCall.id).toBe('1');
      expect(toolCall.name).toBe('test-tool');
      expect(toolCall.args).toEqual({ param: 'value' });
      expect(toolCall.result).toBe('success');
      expect(toolCall.status).toBe('completed');
    });

    it('should support all status values', () => {
      const pendingCall: ToolCall = {
        id: '1',
        name: 'test-tool',
        args: {},
        status: 'pending'
      };

      const completedCall: ToolCall = {
        id: '2',
        name: 'test-tool',
        args: {},
        result: 'result',
        status: 'completed'
      };

      const errorCall: ToolCall = {
        id: '3',
        name: 'test-tool',
        args: {},
        result: 'error occurred',
        status: 'error'
      };

      expect(pendingCall.status).toBe('pending');
      expect(completedCall.status).toBe('completed');
      expect(errorCall.status).toBe('error');
    });
  });

  describe('SubAgent', () => {
    it('should have the correct structure', () => {
      const subAgent: SubAgent = {
        id: '1',
        name: 'test-agent',
        subAgentName: 'sub-agent',
        input: { data: 'input' },
        output: { result: 'output' },
        status: 'active'
      };

      expect(subAgent).toHaveProperty('id');
      expect(subAgent).toHaveProperty('name');
      expect(subAgent).toHaveProperty('subAgentName');
      expect(subAgent).toHaveProperty('input');
      expect(subAgent).toHaveProperty('output');
      expect(subAgent).toHaveProperty('status');
      expect(subAgent.id).toBe('1');
      expect(subAgent.name).toBe('test-agent');
      expect(subAgent.subAgentName).toBe('sub-agent');
      expect(subAgent.input).toEqual({ data: 'input' });
      expect(subAgent.output).toEqual({ result: 'output' });
      expect(subAgent.status).toBe('active');
    });

    it('should support all status values', () => {
      const pendingAgent: SubAgent = {
        id: '1',
        name: 'test-agent',
        subAgentName: 'sub-agent',
        input: {},
        status: 'pending'
      };

      const activeAgent: SubAgent = {
        id: '2',
        name: 'test-agent',
        subAgentName: 'sub-agent',
        input: {},
        status: 'active'
      };

      const completedAgent: SubAgent = {
        id: '3',
        name: 'test-agent',
        subAgentName: 'sub-agent',
        input: {},
        output: 'result',
        status: 'completed'
      };

      const errorAgent: SubAgent = {
        id: '4',
        name: 'test-agent',
        subAgentName: 'sub-agent',
        input: {},
        status: 'error'
      };

      expect(pendingAgent.status).toBe('pending');
      expect(activeAgent.status).toBe('active');
      expect(completedAgent.status).toBe('completed');
      expect(errorAgent.status).toBe('error');
    });
  });

  describe('FileItem', () => {
    it('should have the correct structure', () => {
      const fileItem: FileItem = {
        path: '/path/to/file.txt',
        content: 'file content here'
      };

      expect(fileItem).toHaveProperty('path');
      expect(fileItem).toHaveProperty('content');
      expect(fileItem.path).toBe('/path/to/file.txt');
      expect(fileItem.content).toBe('file content here');
    });
  });

  describe('TodoItem', () => {
    it('should have the correct structure', () => {
      const createdAt = new Date();
      const updatedAt = new Date();

      const todoItem: TodoItem = {
        id: '1',
        content: 'Complete this task',
        status: 'pending',
        createdAt: createdAt,
        updatedAt: updatedAt
      };

      expect(todoItem).toHaveProperty('id');
      expect(todoItem).toHaveProperty('content');
      expect(todoItem).toHaveProperty('status');
      expect(todoItem.id).toBe('1');
      expect(todoItem.content).toBe('Complete this task');
      expect(todoItem.status).toBe('pending');
      expect(todoItem.createdAt).toBe(createdAt);
      expect(todoItem.updatedAt).toBe(updatedAt);
    });

    it('should support all status values', () => {
      const pendingTodo: TodoItem = {
        id: '1',
        content: 'Pending task',
        status: 'pending'
      };

      const inProgressTodo: TodoItem = {
        id: '2',
        content: 'In progress task',
        status: 'in_progress'
      };

      const completedTodo: TodoItem = {
        id: '3',
        content: 'Completed task',
        status: 'completed'
      };

      expect(pendingTodo.status).toBe('pending');
      expect(inProgressTodo.status).toBe('in_progress');
      expect(completedTodo.status).toBe('completed');
    });

    it('should allow optional createdAt and updatedAt', () => {
      const todoItemWithoutDates: TodoItem = {
        id: '1',
        content: 'Task without dates',
        status: 'pending'
      };

      expect(todoItemWithoutDates).toHaveProperty('id');
      expect(todoItemWithoutDates).toHaveProperty('content');
      expect(todoItemWithoutDates).toHaveProperty('status');
      expect(todoItemWithoutDates.createdAt).toBeUndefined();
      expect(todoItemWithoutDates.updatedAt).toBeUndefined();
    });
  });

  describe('Thread', () => {
    it('should have the correct structure', () => {
      const createdAt = new Date();
      const updatedAt = new Date();

      const thread: Thread = {
        id: 'thread-1',
        title: 'Discussion thread',
        createdAt: createdAt,
        updatedAt: updatedAt
      };

      expect(thread).toHaveProperty('id');
      expect(thread).toHaveProperty('title');
      expect(thread).toHaveProperty('createdAt');
      expect(thread).toHaveProperty('updatedAt');
      expect(thread.id).toBe('thread-1');
      expect(thread.title).toBe('Discussion thread');
      expect(thread.createdAt).toBe(createdAt);
      expect(thread.updatedAt).toBe(updatedAt);
    });
  });
});