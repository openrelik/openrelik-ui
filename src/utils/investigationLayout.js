/*
Copyright 2025-2026 Google LLC

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
 * investigationLayout.js
 *
 * Calculates the layout for the investigation DAG (visualized as a tree).
 * Layout: Left-to-Right (Horizontal Tree).
 * - Questions (Rank 0) -> Left
 * - Leads -> Right of Questions
 * - Hypotheses -> Right of Leads
 *
 * Siblings are stacked VERTICALLY.
 */

export const NODE_WIDTH = 250;
export const NODE_HEIGHT = 120;
export const HORIZONTAL_SPACING = 100; // Gap between columns
export const VERTICAL_SPACING = 20;    // Gap between stacked nodes

/**
 * Calculates the layout for the given graph.
 * @param {Object} graph The graph object from investigationGraphUtils.js
 * @returns {Object} { nodes: [], edges: [], width: number, height: number }
 */
export function calculateLayout(graph, expandedNodes = new Set()) {
  if (!graph || graph.nodes.size === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  // 1. Identify Roots
  const roots = Array.from(graph.roots);

  const forest = roots.map((rootId) => buildLayoutTree(graph, rootId, expandedNodes));

  let currentY = 0;
  const positionedNodes = [];
  const positionedEdges = [];

  forest.forEach((tree) => {
    calculateSubtreeHeight(tree);

    assignCoordinates(tree, 0, currentY);

    collectItems(tree, positionedNodes, positionedEdges);

    currentY += tree.height + VERTICAL_SPACING;
  });

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    width: Math.max(...positionedNodes.map((n) => n.x + NODE_WIDTH), 0),
    height: currentY,
  };
}

function buildLayoutTree(graph, nodeId, expandedNodes) {
  const node = graph.getNode(nodeId);
  
  const allChildren = graph.getChildren(nodeId);
  const childCount = allChildren.length;
  
  const isCollapsible = node.type === "SECTION" || node.type === "HYPOTHESIS";
  const isCollapsed = isCollapsible && !expandedNodes.has(nodeId);
  
  const layoutChildren = isCollapsed ? [] : allChildren;
  
  return {
    id: nodeId,
    data: node,
    childCount, // Store true count regardless of collapse state
    height: 0, // Total height of subtree
    x: 0,
    y: 0,
    children: layoutChildren
      .map((child) => buildLayoutTree(graph, child.id, expandedNodes)),
  };
}

/**
 * Calculates the vertical height required for this subtree.
 */
function calculateSubtreeHeight(node) {
  if (node.children.length === 0) {
    node.height = NODE_HEIGHT;
    return;
  }

  node.children.forEach((child) => calculateSubtreeHeight(child));

  const childrenTotalHeight =
    node.children.reduce((sum, child) => sum + child.height, 0) +
    (node.children.length - 1) * VERTICAL_SPACING;

  node.height = Math.max(NODE_HEIGHT, childrenTotalHeight);
}

/**
 * Assigns X and Y coordinates.
 * @param {Object} node 
 * @param {number} depth (Column index)
 * @param {number} startY Top Y coordinate available for this node/subtree
 */
function assignCoordinates(node, depth, startY) {
  node.x = depth * (NODE_WIDTH + HORIZONTAL_SPACING);

  if (node.children.length === 0) {
      node.y = startY;
  } else {
      let currentChildY = startY;
      
      node.children.forEach((child) => {
          assignCoordinates(child, depth + 1, currentChildY);
          currentChildY += child.height + VERTICAL_SPACING;
      });

      const firstChild = node.children[0];
      const lastChild = node.children[node.children.length - 1];
      
      const childrenCenterY = (firstChild.y + lastChild.y) / 2;
      
      node.y = childrenCenterY;
  }
}

function collectItems(node, nodesList, edgesList) {
  nodesList.push({
    ...node.data,
    x: node.x,
    y: node.y,
    childCount: node.childCount, // Expose count of filtered children
  });

  node.children.forEach((child) => {
    edgesList.push({
      id: `${node.id}-${child.id}`,
      from: node.id,
      to: child.id,
    });
    collectItems(child, nodesList, edgesList);
  });
}
