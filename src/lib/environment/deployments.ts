export function getDeployment() {
  return {
    name: "Deep Agents Platform",
    deploymentUrl:
      process.env.NEXT_PUBLIC_DEPLOYMENT_URL || "http://127.0.0.1:2024",
  };
}

export function getDeploymentForAgent(agentId: string) {
  return {
    name: "Deep Agents Platform",
    deploymentUrl:
      process.env.NEXT_PUBLIC_DEPLOYMENT_URL || "http://127.0.0.1:2024",
    agentId,
  };
}
