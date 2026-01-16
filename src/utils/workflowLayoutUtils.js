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
  const seenNodeIds = new Set();

  const addNode = (node) => {
    // Prevent duplicate nodes (can happen with complex chord/group structures)
    if (seenNodeIds.has(node.id)) {
      return;
    }
    seenNodeIds.add(node.id);
    nodes.push(node);
  };

  const seenEdgeIds = new Set();

  const addEdge = (from, to) => {
    const edgeId = `edge-${from}-${to}`;
    // Prevent duplicate edges
    if (seenEdgeIds.has(edgeId)) {
      return;
    }
    seenEdgeIds.add(edgeId);
    edges.push({
      id: edgeId,
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
                addEdge(tailId, callbackId);
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
          groupId || !(isGroupBoundary || isPrevComplex) ? 30 : 130;
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

  // Post-processing: resolve group collisions
  resolveGroupCollisions(nodes);

  return { nodes, edges, nextId, rootHeight };
};

/**
 * Resolves vertical collisions between groups and single nodes at the same X column.
 * Ensures groups have at least GROUP_GAP pixels between them.
 *
 * @param {Array} nodes - The array of nodes to process (mutated in place).
 */
const resolveGroupCollisions = (nodes) => {
  const GROUP_GAP = 110;
  const NODE_HEIGHT = 100;

  // Collect group bounds and single nodes as "blocks"
  const groupBounds = {};
  const singleNodes = [];

  nodes.forEach((node) => {
    if (!node.groupId) {
      // Single node - treat as its own block
      singleNodes.push({
        id: `single-${node.id}`,
        minX: node.x,
        minY: node.y,
        maxY: node.y + NODE_HEIGHT,
        nodes: [node],
        isSingleNode: true,
      });
      return;
    }

    if (!groupBounds[node.groupId]) {
      groupBounds[node.groupId] = {
        id: node.groupId,
        minX: Infinity,
        minY: Infinity,
        maxY: -Infinity,
        nodes: [],
        isSingleNode: false,
      };
    }

    const group = groupBounds[node.groupId];
    group.nodes.push(node);
    group.minX = Math.min(group.minX, node.x);
    group.minY = Math.min(group.minY, node.y);
    group.maxY = Math.max(group.maxY, node.y + NODE_HEIGHT);
  });

  // Combine groups and single nodes into one list of blocks
  const allBlocks = [...Object.values(groupBounds), ...singleNodes];
  if (allBlocks.length < 2) return;

  // Bucket blocks by X column (blocks at same X level)
  const columnThreshold = 50; // Blocks within 50px are considered same column
  const columns = [];

  allBlocks.forEach((block) => {
    let foundColumn = columns.find(
      (col) => Math.abs(col.x - block.minX) < columnThreshold
    );
    if (!foundColumn) {
      foundColumn = { x: block.minX, blocks: [] };
      columns.push(foundColumn);
    }
    foundColumn.blocks.push(block);
  });

  // For each column, sort blocks by minY and resolve collisions
  columns.forEach((column) => {
    if (column.blocks.length < 2) return;

    // Sort by minY
    column.blocks.sort((a, b) => a.minY - b.minY);

    // Resolve collisions by shifting blocks down
    for (let i = 1; i < column.blocks.length; i++) {
      const prevBlock = column.blocks[i - 1];
      const currBlock = column.blocks[i];

      const requiredY = prevBlock.maxY + GROUP_GAP;
      if (currBlock.minY < requiredY) {
        const shift = requiredY - currBlock.minY;

        // Shift all nodes in this block
        currBlock.nodes.forEach((node) => {
          node.y += shift;
        });

        // Update block bounds
        currBlock.minY += shift;
        currBlock.maxY += shift;
      }
    }
  });
};
