/**
 * investigationLayout.js
 *
 * Calculates the layout for the investigation DAG (visualized as a tree).
 * Since we want a top-down view:
 * - Questions are at the top (Rank 0)
 * - Leads (Rank 1)
 * - Hypotheses (Rank 2)
 * - Tasks (Rank 3)
 *
 * NOTE: The graph might check for multiple roots or disconnected components.
 * This simple layout assumes we can treat it as a forest of trees.
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

  // 2. Build Layout Tree
  // We'll traverse and build a lightweight tree purely for layout calculation.
  const forest = roots.map((rootId) => buildLayoutTree(graph, rootId, expandedNodes));

  // 3. Calculate Layout for each tree
  // In L-R layout, trees are stacked vertically.
  let currentY = 0;
  const positionedNodes = [];
  const positionedEdges = [];

  forest.forEach((tree) => {
    // First pass: Calculate subtree height (vertical span)
    calculateSubtreeHeight(tree);

    // Second pass: Assign coordinates
    // We place the tree starting at currentY
    assignCoordinates(tree, 0, currentY);

    // Collect nodes and edges
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
  
  // Calculate potential children
  // We no longer filter out TASKS, we want everything.
  const allChildren = graph.getChildren(nodeId);
  const childCount = allChildren.length;
  
  // Collapse logic: 
  // - Leads (SECTION) are collapsed by default.
  // - Hypotheses (HYPOTHESIS) are collapsed by default.
  const isCollapsible = node.type === "SECTION" || node.type === "HYPOTHESIS";
  const isCollapsed = isCollapsible && !expandedNodes.has(nodeId);
  
  // If collapsed, we don't recurse into children for layout purposes
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

  // Height is sum of children heights plus spacing between them
  const childrenTotalHeight =
    node.children.reduce((sum, child) => sum + child.height, 0) +
    (node.children.length - 1) * VERTICAL_SPACING;

  // Node height is at least NODE_HEIGHT, or the children height if taller
  node.height = Math.max(NODE_HEIGHT, childrenTotalHeight);
}

/**
 * Assigns X and Y coordinates.
 * @param {Object} node 
 * @param {number} depth (Column index)
 * @param {number} startY Top Y coordinate available for this node/subtree
 */
function assignCoordinates(node, depth, startY) {
  // X is simple: determined by depth
  node.x = depth * (NODE_WIDTH + HORIZONTAL_SPACING);

  // Y Logic:
  // The node itself should be centered vertically relative to its children's span.
  
  // 1. Position Children first (Top-Down stacking) starting at startY
  let childY = startY;
  
  // If parent is taller than children (e.g. leaf node or single small child), we center children?
  // Actually, we usually want children to just stack. 
  // But we need to center the PARENT relative to the children.
  
  const childrenTotalHeight =
    node.children.reduce((sum, child) => sum + child.height, 0) +
    (node.children.length - 1) * VERTICAL_SPACING;
    
  // If the node.height > childrenTotalHeight, it means node is taller (leaf usually).
  // But if children are taller, we use their height.
  
  // Center Parent:
  // If children exist, parent Y is mid-point of first child top and last child bottom.
  // If no children, parent Y is simply startY.

  if (node.children.length === 0) {
      node.y = startY;
  } else {
      // Position children
      // If we have extra space (node.height > childrenHeight), we might want to offset children?
      // For now, let's align children to startY (top-aligned block) and center parent relative to that block.
      
      let currentChildY = startY;
      // Centering block adjustment if node itself is forced to be huge? 
      // Usually node.height IS childrenTotalHeight (if children exist).
      // Unless we enforced a min-height.
      
      // Let's just stack children.
      node.children.forEach((child) => {
          assignCoordinates(child, depth + 1, currentChildY);
          currentChildY += child.height + VERTICAL_SPACING;
      });

      // Calculate Parent Y based on children bounds
      const firstChild = node.children[0];
      const lastChild = node.children[node.children.length - 1];
      
      // Center of children block
      // Note: lastChild.y is its top. Its center is lastChild.y + NODE_HEIGHT/2? 
      // Or bounding box? Usually simplified to: (first.y + last.y) / 2
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
