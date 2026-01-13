/*
Copyright 2025 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
