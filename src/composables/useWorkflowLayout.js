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
import { computeWorkflowLayout } from "@/utils/workflowLayoutUtils";

export function useWorkflowLayout() {
  const workflowStore = useWorkflowStore();

  /**
   * Performs the layout algorithm on the provided workflow data.
   * Updates the store state with the new layout.
   * 
   * @param {Object} workflowData - The workflow data.
   * @param {Map} taskStatusMap - Task status map.
   * @param {boolean} centerInputNode - Whether to center the input node.
   */
  const layout = (workflowData, taskStatusMap = null, centerInputNode = true) => {
    const { nodes, edges, nextId, rootHeight } = computeWorkflowLayout(
      workflowData, 
      taskStatusMap, 
      { initialNextId: workflowStore.nextId }
    );

    workflowStore.nodes = nodes;
    workflowStore.edges = edges;
    workflowStore.nextId = nextId;

    if (centerInputNode && rootHeight > 0) {
      const inputNode = workflowStore.nodes.find((n) => n.id === "node-1");
      if (inputNode) {
        inputNode.y = 300 + rootHeight / 2 - 40;
      }
    }
  };

  return {
    layout,
  };
}
