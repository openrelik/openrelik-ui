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

import { findTails } from "./workflowGraphUtils";

/**
 * Computes the layout for a given set of workflow tasks.
 * This is a pure function that returns a set of nodes and edges.
 *
 * @param {Object} workflowData - The workflow data containing tasks.
 * @param {Map} taskStatusMap - A map of task UUIDs to their status data.
 * @param {Object} options - Layout options (startX, startY, nextId).
 * @returns {Object} { nodes: Array, edges: Array, nextId: number, rootHeight: number }
 */
export const computeWorkflowLayout = (
  workflowData,
  taskStatusMap,
  options = {}
) => {
  const { startX = 400, startY = 300, initialNextId = 1 } = options;
  let nextId = initialNextId;
  const nodes = [];
  const edges = [];

  const addNode = (node) => {
    nodes.push(node);
  };

  const addEdge = (from, to) => {
    edges.push({
      id: `edge-${from}-${to}`,
      from,
      to,
    });
  };

  const processTaskList = (tasks, parentId, x, y, depth = 0) => {
    if (!tasks || tasks.length === 0) return 0;

    let groupId = null;
    if (tasks.length > 1) {
      groupId = `group-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }

    let currentSiblingY = y;
    const childSpacingX = 320;

    tasks.forEach((task, index) => {
      if (task.type === "chord") {
        const branches = task.tasks || [];
        if (branches.length === 0) return;

        const branchesHeight = processTaskList(
          branches,
          parentId,
          x,
          currentSiblingY,
          depth
        );

        const callbackTask = task.callback;
        if (callbackTask) {
          callbackTask.type = "Callback";
          const callbackY = currentSiblingY + branchesHeight / 2 - 40;
          const callbackX = x + childSpacingX;

          processTaskList(
            [callbackTask],
            null,
            callbackX,
            callbackY,
            depth + 1
          );

          const callbackId = callbackTask.uuid;
          if (callbackId) {
            branches.forEach((branch) => {
              const tails = findTails(branch);
              tails.forEach((tailId) => {
                edges.push({
                  id: `edge-${tailId}-${callbackId}`,
                  from: tailId,
                  to: callbackId,
                });
              });
            });
          }
        }

        currentSiblingY += branchesHeight;
        return;
      }

      const nodeId = task.uuid || `node-${nextId++}`;
      task.uuid = nodeId;

      const label = task.display_name || task.task_name || "Task";
      const selfHeight = 100;

      const effectiveGroupId = task.groupId || groupId;

      if (index > 0) {
        const prevTask = tasks[index - 1];
        const prevEffectiveGroupId = prevTask.groupId || groupId;

        const isGroupBoundary = effectiveGroupId !== prevEffectiveGroupId;
        // Chords and tasks with >1 children create their own internal group structures
        // Also check if the task has a single child that is a chord (e.g. Image Export -> Chord)
        const isPrevComplex =
          prevTask.type === "chord" ||
          (prevTask.tasks && prevTask.tasks.length > 1) ||
          (prevTask.tasks &&
            prevTask.tasks.length > 0 &&
            prevTask.tasks[prevTask.tasks.length - 1].type === "chord");

        const spacing =
          groupId || !(isGroupBoundary || isPrevComplex) ? 20 : 120;
        currentSiblingY += spacing;
      }

      const childrenStartY = currentSiblingY;
      const childrenHeight = processTaskList(
        task.tasks,
        nodeId,
        x + childSpacingX,
        childrenStartY,
        depth + 1
      );

      let blockHeight = Math.max(selfHeight, childrenHeight);

      // If in a group, ignore children height for spacing
      if (groupId) {
        blockHeight = selfHeight;
      }

      const nodeY = currentSiblingY + blockHeight / 2 - 40;

      addNode({
        id: nodeId,
        x: x,
        y: nodeY,
        label: label,
        type: task.type === "Callback" ? "Callback" : "Task",
        groupId: task.groupId || groupId,
        data: {
          ...task,
          ...(taskStatusMap ? taskStatusMap.get(task.uuid) : {}),
        },
      });

      if (parentId) {
        addEdge(parentId, nodeId);
      }

      currentSiblingY += blockHeight;
    });

    return currentSiblingY - y;
  };

  let rootHeight = 0;
  if (workflowData && workflowData.tasks) {
    rootHeight = processTaskList(
      workflowData.tasks,
      "node-1",
      startX,
      startY,
      0
    );
  }

  return { nodes, edges, nextId, rootHeight };
};
