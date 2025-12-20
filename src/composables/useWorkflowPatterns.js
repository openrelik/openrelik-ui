import { useWorkflowStore } from "@/stores/workflow";
import { 
  generateChainTemplate, 
  generateGroupTemplate, 
  generateChordTemplate,
  generateGroupCallback
} from "@/utils/workflowPatternUtils";

export function useWorkflowPatterns() {
  const workflowStore = useWorkflowStore();

  const applyTemplate = ({ nodes, edges, nextId }) => {
    workflowStore.clearWorkflow();
    workflowStore.addInputNode();
    workflowStore.nodes.push(...nodes);
    workflowStore.edges.push(...edges);
    workflowStore.nextId = nextId;
    workflowStore.updateWorkflowData();
  };

  const addCallbackToGroup = (groupId, taskData = null) => {
    const groupNodes = workflowStore.nodes.filter(n => n.groupId === groupId);
    if (groupNodes.length === 0) return;

    const result = generateGroupCallback(groupNodes, taskData, workflowStore.nextId);
    if (result) {
      workflowStore.nodes.push(result.node);
      workflowStore.edges.push(...result.edges);
      workflowStore.nextId = result.nextId;
      workflowStore.updateWorkflowData();
    }
  };

  const createChain = (count = 3) => {
    const template = generateChainTemplate(count, workflowStore.nextId);
    applyTemplate(template);
  };

  const createGroup = (count = 3) => {
    const template = generateGroupTemplate(count, workflowStore.nextId);
    applyTemplate(template);
  };

  const createChord = (count = 3) => {
    const template = generateChordTemplate(count, workflowStore.nextId);
    applyTemplate(template);
  };

  return {
    createChain,
    createGroup,
    createChord,
    addCallbackToGroup,
  };
}
