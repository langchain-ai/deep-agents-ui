import { Client } from "@langchain/langgraph-sdk";
import {
  getDeployment,
  getDeploymentForAgent,
} from "./environment/deployments";

export function createClient(accessToken: string) {
  const deployment = getDeployment();
  return new Client({
    apiUrl: deployment?.deploymentUrl || "",
    apiKey: accessToken,
    defaultHeaders: {
      "x-auth-scheme": "langsmith",
    },
  });
}

export function createClientForAgent(accessToken: string, agentId: string) {
  const deployment = getDeploymentForAgent(agentId);
  return new Client({
    apiUrl: deployment?.deploymentUrl || "",
    apiKey: accessToken,
    defaultHeaders: {
      "x-auth-scheme": "langsmith",
    },
  });
}
