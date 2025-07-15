import { useUserAIAgent } from './useUserAIAgent';

export const useAIAgentConfig = () => {
  const { selectedAgent, getSelectedAgentId } = useUserAIAgent();

  return {
    agentId: getSelectedAgentId(),
    hasAgent: !!selectedAgent,
    selectedAgent
  };
};