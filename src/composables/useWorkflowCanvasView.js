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

import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import {
  calculateTaskMenuWorldPosition,
  calculateOverviewScreenPosition,
} from "@/utils/workflowCanvasUtils";

/**
 * Composable to handle WorkflowCanvas navigation (pan, zoom) and positioning.
 *
 * @param {Object} options
 * @param {Ref} options.nodes - Reactive reference to workflow nodes.
 * @param {Ref} options.container - Reference to the canvas container element.
 * @param {Ref} options.showTaskMenu - Reactive boolean for task menu visibility.
 * @param {Ref} options.pendingParentId - ID of pending parent node.
 * @param {Ref} options.pendingGroupId - ID of pending group.
 * @param {Ref} options.pendingCallbackGroupId - ID of pending chord.
 * @param {Ref} options.activeOverviewNodeId - ID of node for status overview.
 * @param {Function} options.onVisibilityUpdate - Callback when visibility is calculated.
 */
export function useWorkflowCanvasView({
  nodes,
  container,
  showTaskMenu,
  pendingParentId,
  pendingGroupId,
  pendingCallbackGroupId,
  activeOverviewNodeId,
  onVisibilityUpdate,
}) {
  const panX = ref(0);
  const panY = ref(0);
  const scale = ref(1);
  const minScale = 0.1;
  const maxScale = 5;
  const isPanning = ref(false);
  const isSpacePressed = ref(false);
  const hasInitialZoom = ref(false);

  // Temporary drag state
  const startX = ref(0);
  const startY = ref(0);
  const initialPanX = ref(0);
  const initialPanY = ref(0);

  const activeOverviewNode = computed(() => {
    return nodes.value.find((n) => n.id === activeOverviewNodeId.value);
  });

  const taskMenuPosition = computed(() => {
    if (!showTaskMenu.value) return { x: 0, y: 0 };

    const worldPos = calculateTaskMenuWorldPosition({
      nodes: nodes.value,
      pendingParentId: pendingParentId.value,
      pendingGroupId: pendingGroupId.value,
      pendingCallbackGroupId: pendingCallbackGroupId.value,
    });

    let screenX = worldPos.x * scale.value + panX.value;
    let screenY = worldPos.y * scale.value + panY.value;

    const rect = container.value?.getBoundingClientRect?.();
    if (rect) {
      screenX += rect.left;
      screenY += rect.top;
    }

    return { x: screenX, y: screenY };
  });

  const overviewPosition = computed(() => {
    if (!activeOverviewNodeId.value || !activeOverviewNode.value)
      return { x: 0, y: 0 };

    return calculateOverviewScreenPosition({
      node: activeOverviewNode.value,
      scale: scale.value,
      panX: panX.value,
      panY: panY.value,
      rect: container.value?.getBoundingClientRect?.(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
  });

  const viewportStyle = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
  }));

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSensitivity = 0.005;
      const zoomDelta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(
        Math.max(minScale, scale.value + zoomDelta),
        maxScale
      );

      const rect = container.value.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - panX.value) / scale.value;
      const worldY = (mouseY - panY.value) / scale.value;

      scale.value = newScale;
      panX.value = mouseX - worldX * newScale;
      panY.value = mouseY - worldY * newScale;
    }
  };

  const handleMouseDown = (e) => {
    if (isSpacePressed.value) {
      isPanning.value = true;
      startX.value = e.clientX;
      startY.value = e.clientY;
      initialPanX.value = panX.value;
      initialPanY.value = panY.value;
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning.value) {
      const dx = e.clientX - startX.value;
      const dy = e.clientY - startY.value;
      panX.value = initialPanX.value + dx;
      panY.value = initialPanY.value + dy;
    }
  };

  const handleMouseUp = () => {
    isPanning.value = false;
  };

  const handleKeyDown = (e) => {
    if (["INPUT", "TEXTAREA", "CONTENTEDITABLE"].includes(e.target.tagName))
      return;
    if (e.code === "Space") {
      isSpacePressed.value = true;
      e.preventDefault();
    }
  };

  const handleKeyUp = (e) => {
    if (e.code === "Space") {
      isSpacePressed.value = false;
      isPanning.value = false;
    }
  };

  const zoomToFit = () => {
    if (nodes.value.length === 0 || !container.value) return;

    if (onVisibilityUpdate) onVisibilityUpdate();

    const viewportWidth = container.value.clientWidth;
    const viewportHeight = container.value.clientHeight;
    if (!viewportWidth || !viewportHeight) return;

    const padding = 50;
    const nodeWidth = 180;
    const nodeHeight = 100;

    // Calculate initial bounds
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    nodes.value.forEach((node) => {
      if (node.x < minX) minX = node.x;
      if (node.x + nodeWidth > maxX) maxX = node.x + nodeWidth;
      if (node.y < minY) minY = node.y;
      if (node.y + nodeHeight > maxY) maxY = node.y + nodeHeight;
    });

    // Add padding for visual breathing room
    maxX += 70;
    maxY += 20;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const scaleX = (viewportWidth - padding * 2) / contentWidth;
    const scaleY = (viewportHeight - padding * 2) / contentHeight;

    // If height-constrained (scaleY < scaleX), spread columns horizontally
    if (scaleY < scaleX && scaleY < 0.9) {
      // Calculate how much horizontal space is available at the height-constrained scale
      const availableWidth = (viewportWidth - padding * 2) / scaleY;
      const stretchFactor = availableWidth / contentWidth;

      // Only stretch if it would make a meaningful difference (> 20% more space)
      if (stretchFactor > 1.2) {
        // Cap the stretch to avoid excessive spacing
        const cappedStretch = Math.min(stretchFactor, 2.5);

        // Stretch X coordinates relative to minX
        nodes.value.forEach((node) => {
          node.x = minX + (node.x - minX) * cappedStretch;
        });

        // Recalculate bounds after stretching
        maxX = minX;
        nodes.value.forEach((node) => {
          if (node.x + nodeWidth > maxX) maxX = node.x + nodeWidth;
        });
        maxX += 70;
      }
    }

    const finalWidth = maxX - minX;
    const finalHeight = maxY - minY;

    const finalScaleX = (viewportWidth - padding * 2) / finalWidth;
    const finalScaleY = (viewportHeight - padding * 2) / finalHeight;
    const finalScale = Math.min(Math.max(Math.min(finalScaleX, finalScaleY), 0.1), 0.9);

    scale.value = finalScale;
    panY.value = viewportHeight / 2 - (minY + finalHeight / 2) * scale.value;
    panX.value = padding - minX * scale.value;

    // Wait for browser to paint the final positions before showing viewport
    // This prevents transition animations from triggering on the stretched positions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hasInitialZoom.value = true;
      });
    });
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  });

  return {
    panX,
    panY,
    scale,
    isPanning,
    isSpacePressed,
    hasInitialZoom,
    viewportStyle,
    taskMenuPosition,
    overviewPosition,
    activeOverviewNode,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKeyDown,
    handleKeyUp,
    zoomToFit,
  };
}
