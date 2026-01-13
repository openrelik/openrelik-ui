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

/**
 * Finds all descendants for each start node.
 * 
 * @param {string} nodeId - The ID of the node to start from.
 * @param {Array} edges - Array of edges in the graph.
 * @param {Set} [visited=new Set()] - Set of visited node IDs to avoid cycles.
 * @returns {Set} Set of descendant node IDs.
 */
export const getDescendants = (nodeId, edges, visited = new Set()) => {
  const children = edges
    .filter(e => String(e.from) === String(nodeId))
    .map(e => String(e.to));
  children.forEach(child => {
    if (!visited.has(child)) {
      visited.add(child);
      getDescendants(child, edges, visited);
    }
  });
  return visited;
};

/**
 * Determines if a set of nodes converge to a single common descendant.
 * If they do, returns that descendant (the callback).
 * 
 * @param {Array} startNodes - The list of nodes to check.
 * @param {Array} edges - Array of edges in the graph.
 * @param {Array} nodes - Array of nodes in the graph.
 * @returns {Object|null} The common callback node or null.
 */
export const findCommonCallback = (startNodes, edges, nodes) => {
  if (startNodes.length < 2) return null;

  const descendantSets = startNodes.map(n => getDescendants(n.id, edges));

  // Find intersection of all descendant sets
  const firstSet = descendantSets[0];
  if (firstSet.size === 0) return null;

  const common = [...firstSet].filter(id =>
    descendantSets.every(s => s.has(id))
  );

  if (common.length === 0) return null;

  // Heuristic: Pick the left-most node (smallest X) as the first point of convergence.
  let candidates = common.map(id => nodes.find(n => String(n.id) === String(id))).filter(n => n);
  candidates.sort((a, b) => a.x - b.x);

  return candidates[0];
};

/**
 * Recursively builds the task tree structure for spec JSON.
 * 
 * @param {string} parentId - The ID of the parent node.
 * @param {string|null} stopAtId - The ID of the node where to stop recursion.
 * @param {Array} edges - Array of edges.
 * @param {Array} nodes - Array of nodes.
 * @returns {Array} The task tree array.
 */
export const buildTaskTree = (parentId, stopAtId, edges, nodes) => {
  // Find edges identifying children of parentId
  const childEdges = edges.filter((e) => String(e.from) === String(parentId));
  if (childEdges.length === 0) return [];

  // Retrieve child nodes
  const children = childEdges
    .map((edge) => nodes.find((n) => String(n.id) === String(edge.to)))
    .filter((n) => n && n.id !== stopAtId && String(n.id) !== String(stopAtId));

  if (children.length === 0) return [];

  // Sort children by vertical position (Y) to maintain visual order
  children.sort((a, b) => a.y - b.y);

  // --- Chord Detection ---
  let chordCallback = null;
  if (children.length > 1) {
    chordCallback = findCommonCallback(children, edges, nodes);
    if (chordCallback && String(chordCallback.id) === String(stopAtId)) {
      chordCallback = null;
    }
  }

  if (chordCallback) {
    const branches = children.map(node => {
      const nodeData = node.data || {};
      return {
        ...nodeData,
        uuid: nodeData.uuid || node.id,
        task_name: nodeData.task_name || "openrelik-worker-placeholder.tasks.placeholder",
        display_name: node.label,
        description: nodeData.description || "Task created in designer",
        task_config: nodeData.task_config || {},
        type: "task",
        tasks: buildTaskTree(node.id, chordCallback.id, edges, nodes)
      };
    });

    const cbData = chordCallback.data || {};
    const callbackObj = {
      ...cbData,
      uuid: cbData.uuid || chordCallback.id,
      task_name: cbData.task_name || "openrelik-worker-placeholder.tasks.placeholder",
      display_name: chordCallback.label,
      description: cbData.description || "Chord Callback",
      task_config: cbData.task_config || {},
      type: "task",
      tasks: buildTaskTree(chordCallback.id, stopAtId, edges, nodes)
    };

    return [{
      type: "chord",
      tasks: branches,
      callback: callbackObj
    }];
  }

  return children.map((node) => {
    const nodeData = node.data || {};
    return {
      ...nodeData,
      uuid: nodeData.uuid || node.id,
      task_name: nodeData.task_name || "openrelik-worker-placeholder.tasks.placeholder",
      display_name: node.label,
      description: nodeData.description || "Task created in designer",
      task_config: nodeData.task_config || {},
      type: "task",
      tasks: buildTaskTree(node.id, stopAtId, edges, nodes),
    };
  });
};

/**
 * Recursively flattens task data into a Map by UUID.
 * 
 * @param {Array} tasks - Array of tasks to flatten.
 * @param {Map} [taskMap=new Map()] - Map to populate.
 * @returns {Map} The populated task map.
 */
export const flattenTasks = (tasks, taskMap = new Map()) => {
  if (!tasks) return taskMap;
  tasks.forEach((task) => {
    if (task.uuid) {
      taskMap.set(task.uuid, task);
    }
    if (task.tasks) {
      flattenTasks(task.tasks, taskMap);
    }
    if (task.type === 'chord' && task.callback) {
        flattenTasks([task.callback], taskMap)
    }
  });
  return taskMap;
};

/**
 * Finds leaf nodes of a task structure.
 * 
 * @param {Object} task - The task object.
 * @returns {Array} Array of leaf node UUIDs.
 */
export const findTails = (task) => {
  if (task.type === 'chord') {
    if (task.callback) return findTails(task.callback);
    return task.tasks.flatMap(findTails);
  }
  if (!task.tasks || task.tasks.length === 0) return [task.uuid];
  return task.tasks.flatMap(findTails);
};

/**
 * Calculates the ideal Y position for a new set of siblings to avoid collisions.
 * 
 * @param {Object} parent - The parent node.
 * @param {Array} siblings - Array of sibling nodes including the new one.
 * @param {Array} allNodes - Array of all nodes to check for collisions.
 * @param {number} spacing - Vertical spacing between nodes.
 * @returns {number} The starting Y coordinate for the group of siblings.
 */
export const getIdealPlacement = (parent, siblings, allNodes, spacing) => {
    const totalHeight = (siblings.length - 1) * spacing;
    const targetX = siblings.length > 1 ? siblings[0].x : parent.x + 280;

    const otherNodes = allNodes.filter(
      (n) =>
        !siblings.some((s) => s.id === n.id) && 
        Math.abs(n.x - targetX) < 150
    );

    let startY = parent.y - totalHeight / 2;

    const obstacles = [];
    otherNodes.forEach((n) => {
      let top = n.y;
      let bottom = n.y + 100;

      if (n.groupId) {
        const groupNodes = allNodes.filter((g) => g.groupId === n.groupId);
        let gMinY = Infinity;
        let gMaxY = -Infinity;
        groupNodes.forEach((g) => {
          if (g.y < gMinY) gMinY = g.y;
          if (g.y > gMaxY) gMaxY = g.y;
        });
        top = gMinY - 20;
        bottom = gMaxY + 240; // max Y + height (100) + ghost (120) + padding (20)
      }
      obstacles.push({ top, bottom });
    });

    obstacles.sort((a, b) => a.top - b.top);

    obstacles.forEach((obs) => {
      const myBottom = startY + totalHeight;
      if (startY < obs.bottom && myBottom + 50 > obs.top) {
        startY = obs.bottom + 50;
      }
    });

    return startY;
};
