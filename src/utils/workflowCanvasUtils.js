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
 * Pure utilities for WorkflowCanvas UI calculations.
 */

/**
 * Calculates the world position for the task menu based on the pending interaction.
 *
 * @param {Object} args
 * @param {Array} args.nodes - Current workflow nodes.
 * @param {string|null} args.pendingParentId - ID of parent node (if adding child).
 * @param {string|null} args.pendingGroupId - ID of group (if adding node to group).
 * @param {string|null} args.pendingCallbackGroupId - ID of group (if adding callback).
 * @returns {Object} { worldX, worldY }
 */
export const calculateTaskMenuWorldPosition = ({
  nodes,
  pendingParentId,
  pendingGroupId,
  pendingCallbackGroupId,
}) => {
  let worldX = 0;
  let worldY = 0;

  if (pendingParentId) {
    const parent = nodes.find((n) => n.id === pendingParentId);
    if (!parent) return { x: 0, y: 0 };
    const width = parent.type === "Input" ? 200 : 180;
    worldX = parent.x + width + 25;
    worldY = parent.y;
  } else if (pendingGroupId) {
    const groupNodes = nodes.filter((n) => n.groupId === pendingGroupId);
    if (groupNodes.length === 0) return { x: 0, y: 0 };

    let maxY = -Infinity;
    let commonX = groupNodes[0].x;

    groupNodes.forEach((n) => {
      if (n.y > maxY) maxY = n.y;
    });
    worldX = commonX;
    worldY = maxY + 100;
  } else if (pendingCallbackGroupId) {
    const groupNodes = nodes.filter(
      (n) => n.groupId === pendingCallbackGroupId
    );
    if (groupNodes.length === 0) return { x: 0, y: 0 };

    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const NODE_WIDTH = 180;

    groupNodes.forEach((n) => {
      if (n.x + NODE_WIDTH > maxX) maxX = n.x + NODE_WIDTH;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const midY = (minY + maxY) / 2;
    worldX = maxX + 50;
    worldY = midY;
  }

  return { x: worldX, y: worldY };
};

/**
 * Calculates the screen position for the status overview popup.
 *
 * @param {Object} args
 * @param {Object} args.node - The node to position relative to.
 * @param {number} args.scale - Current zoom scale.
 * @param {number} args.panX - Current pan X.
 * @param {number} args.panY - Current pan Y.
 * @param {Object} args.rect - Bounding rect of the canvas container.
 * @param {number} args.viewportWidth - window.innerWidth.
 * @param {number} args.viewportHeight - window.innerHeight.
 * @returns {Object} { x, y } screen coordinates.
 */
export const calculateOverviewScreenPosition = ({
  node,
  scale,
  panX,
  panY,
  rect,
  viewportWidth,
  viewportHeight,
}) => {
  const NODE_WIDTH = 180;
  const EST_NODE_HEIGHT = 150;
  const GAP = 20;
  const POPUP_WIDTH = 500;
  const POPUP_HEIGHT = 500;
  const EDGE_PADDING = 10;

  const offsetX = rect ? rect.left : 0;
  const offsetY = rect ? rect.top : 0;

  const nodeScreenX = node.x * scale + panX + offsetX;
  const nodeScreenY = node.y * scale + panY + offsetY;
  const scaledNodeWidth = NODE_WIDTH * scale;
  const scaledGap = GAP * scale;

  const clampY = (y) => {
    const minY = EDGE_PADDING;
    const popupBottom = y + POPUP_HEIGHT;
    const maxBottom = viewportHeight - EDGE_PADDING;
    const overflow = popupBottom - maxBottom;

    if (overflow > 0) {
      return Math.round(Math.max(minY, y - overflow));
    }
    return Math.round(Math.max(minY, y));
  };

  const rightX = nodeScreenX + scaledNodeWidth + scaledGap;
  const leftX = nodeScreenX - scaledGap - POPUP_WIDTH;
  const underX = nodeScreenX;
  const underY = nodeScreenY + EST_NODE_HEIGHT * scale + scaledGap;

  if (rightX + POPUP_WIDTH <= viewportWidth) {
    return { x: Math.round(rightX), y: clampY(nodeScreenY) };
  }

  if (leftX >= 0) {
    return { x: Math.round(leftX), y: clampY(nodeScreenY) };
  }

  const clampedUnderX = Math.max(
    EDGE_PADDING,
    Math.min(underX, viewportWidth - POPUP_WIDTH - EDGE_PADDING)
  );
  return { x: Math.round(clampedUnderX), y: clampY(underY) };
};

/**
 * Computes temporary position offsets for nodes that collide
 * with a highlighted/expanded group.
 *
 * @param {Array} nodes - All workflow nodes.
 * @param {string} activeGroupId - The ID of the hovered group.
 * @returns {Object} Map of nodeId to Y offset.
 */
export const computeCollisionOffsets = (nodes, activeGroupId) => {
  const hoverOffsets = {};
  const groupNodes = nodes.filter((n) => n.groupId === activeGroupId);
  if (groupNodes.length === 0) return hoverOffsets;

  let gMinX = Infinity;
  let gMaxX = -Infinity;
  let gMaxY = -Infinity;

  groupNodes.forEach((n) => {
    if (n.x < gMinX) gMinX = n.x;
    if (n.x > gMaxX) gMaxX = n.x;
    if (n.y > gMaxY) gMaxY = n.y;
  });

  gMaxX += 180;
  gMaxY += 100; // Full node height

  const expansionAmount = 120;
  // expandedBottom = max-y-of-group-content + extra-space-for-ghost + padding
  const expandedBottom = gMaxY + expansionAmount + 20;

  const candidates = nodes.filter((n) => {
    if (n.groupId === activeGroupId) return false;
    const nMinX = n.x;
    const nMaxX = n.x + 180;
    const xOverlap =
      Math.max(0, Math.min(gMaxX, nMaxX) - Math.max(gMinX, nMinX)) > 0;
    if (!xOverlap) return false;
    return n.y >= gMaxY - 10 && n.y < expandedBottom;
  });

  if (candidates.length === 0) return hoverOffsets;

  const pushMap = {};
  candidates.forEach((n) => {
    const targetId = n.groupId ? n.groupId : n.id;
    // requiredShift = desired-bottom (expandedBottom + spacing) - current-top (n.y)
    // using 50 spacing
    const requiredShift = expandedBottom + 50 - n.y;
    if (!pushMap[targetId] || pushMap[targetId] < requiredShift) {
      pushMap[targetId] = requiredShift;
    }
  });

  nodes.forEach((n) => {
    const targetId = n.groupId ? n.groupId : n.id;
    if (pushMap[targetId]) {
      hoverOffsets[n.id] = pushMap[targetId];
    }
  });

  return hoverOffsets;
};
