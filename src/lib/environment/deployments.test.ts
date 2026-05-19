import { getDeployment } from './deployments';

// Mock environment variables before each test
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  // Reset environment variables to original state
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  // Restore original environment variables
  process.env = ORIGINAL_ENV;
});

describe('deployments', () => {
  describe('getDeployment', () => {
    it('should return default values when no environment variables are set', () => {
      // Clear any existing environment variables for this test
      delete process.env.NEXT_PUBLIC_DEPLOYMENT_URL;
      delete process.env.NEXT_PUBLIC_AGENT_ID;

      const result = getDeployment();
      
      expect(result).toEqual({
        name: "Deep Agent",
        deploymentUrl: "http://127.0.0.1:2024",
        agentId: "deepagent",
      });
    });

    it('should use NEXT_PUBLIC_DEPLOYMENT_URL when set', () => {
      process.env.NEXT_PUBLIC_DEPLOYMENT_URL = "https://example.com";
      delete process.env.NEXT_PUBLIC_AGENT_ID;

      const result = getDeployment();
      
      expect(result).toEqual({
        name: "Deep Agent",
        deploymentUrl: "https://example.com",
        agentId: "deepagent",
      });
    });

    it('should use NEXT_PUBLIC_AGENT_ID when set', () => {
      delete process.env.NEXT_PUBLIC_DEPLOYMENT_URL;
      process.env.NEXT_PUBLIC_AGENT_ID = "myagent";

      const result = getDeployment();
      
      expect(result).toEqual({
        name: "Deep Agent",
        deploymentUrl: "http://127.0.0.1:2024",
        agentId: "myagent",
      });
    });

    it('should use both environment variables when set', () => {
      process.env.NEXT_PUBLIC_DEPLOYMENT_URL = "https://production.com";
      process.env.NEXT_PUBLIC_AGENT_ID = "prodagent";

      const result = getDeployment();
      
      expect(result).toEqual({
        name: "Deep Agent",
        deploymentUrl: "https://production.com",
        agentId: "prodagent",
      });
    });

    it('should always return the same name regardless of environment variables', () => {
      const result = getDeployment();
      expect(result.name).toBe("Deep Agent");
    });
  });
});