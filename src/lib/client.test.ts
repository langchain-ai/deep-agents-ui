import { Client } from "@langchain/langgraph-sdk";
import { createClient } from "./client";
import { getDeployment } from "./environment/deployments";

// Mock the LangChain Client
jest.mock("@langchain/langgraph-sdk", () => ({
  Client: jest.fn().mockImplementation(() => ({})),
}));

// Mock the getDeployment function
jest.mock("./environment/deployments", () => ({
  getDeployment: jest.fn(),
}));

// Define the type for the expected deployment structure
type Deployment = {
  name: string;
  deploymentUrl: string;
  agentId: string;
};

describe("createClient", () => {
  const mockGetDeployment = getDeployment as jest.MockedFunction<() => Deployment | undefined>;
  const mockClientConstructor = Client as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a client with deployment URL and access token when deployment exists", () => {
    const mockDeployment: Deployment = { 
      name: "Test Agent", 
      deploymentUrl: "https://example.com/api", 
      agentId: "test-agent" 
    };
    mockGetDeployment.mockReturnValue(mockDeployment);
    
    const accessToken = "test-token";
    createClient(accessToken);

    expect(mockGetDeployment).toHaveBeenCalledTimes(1);
    expect(mockClientConstructor).toHaveBeenCalledWith({
      apiUrl: mockDeployment.deploymentUrl,
      apiKey: accessToken,
      defaultHeaders: {
        "x-auth-scheme": "langsmith",
      },
    });
  });

  it("should create a client with empty apiUrl when deployment is undefined", () => {
    mockGetDeployment.mockReturnValue(undefined);

    const accessToken = "test-token";
    createClient(accessToken);

    expect(mockGetDeployment).toHaveBeenCalledTimes(1);
    expect(mockClientConstructor).toHaveBeenCalledWith({
      apiUrl: "",
      apiKey: accessToken,
      defaultHeaders: {
        "x-auth-scheme": "langsmith",
      },
    });
  });

  it("should create a client with default deployment values", () => {
    const mockDeployment: Deployment = { 
      name: "Deep Agent", 
      deploymentUrl: "http://127.0.0.1:2024", 
      agentId: "deepagent" 
    };
    mockGetDeployment.mockReturnValue(mockDeployment);
    
    const accessToken = "test-token";
    createClient(accessToken);

    expect(mockGetDeployment).toHaveBeenCalledTimes(1);
    expect(mockClientConstructor).toHaveBeenCalledWith({
      apiUrl: mockDeployment.deploymentUrl,
      apiKey: accessToken,
      defaultHeaders: {
        "x-auth-scheme": "langsmith",
      },
    });
  });

  it("should always include the x-auth-scheme header", () => {
    const mockDeployment: Deployment = { 
      name: "Test Agent", 
      deploymentUrl: "https://example.com/api", 
      agentId: "test-agent" 
    };
    mockGetDeployment.mockReturnValue(mockDeployment);
    
    const accessToken = "test-token";
    createClient(accessToken);

    expect(mockClientConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultHeaders: {
          "x-auth-scheme": "langsmith",
        },
      })
    );
  });

  it("should use the provided access token as apiKey", () => {
    const mockDeployment: Deployment = { 
      name: "Test Agent", 
      deploymentUrl: "https://example.com/api", 
      agentId: "test-agent" 
    };
    mockGetDeployment.mockReturnValue(mockDeployment);
    
    const accessToken = "different-test-token";
    createClient(accessToken);

    expect(mockClientConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: accessToken,
      })
    );
  });

  it("should handle empty string access token", () => {
    const mockDeployment: Deployment = { 
      name: "Test Agent", 
      deploymentUrl: "https://example.com/api", 
      agentId: "test-agent" 
    };
    mockGetDeployment.mockReturnValue(mockDeployment);
    
    const accessToken = "";
    createClient(accessToken);

    expect(mockClientConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: accessToken,
      })
    );
  });
});