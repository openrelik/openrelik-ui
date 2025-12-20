import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { 
  calculateTaskMenuWorldPosition, 
  calculateOverviewScreenPosition 
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

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    nodes.value.forEach((node) => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    });

    maxX += 250;
    maxY += 120;

    const width = maxX - minX;
    const height = maxY - minY;

    const viewportWidth = container.value.clientWidth;
    const viewportHeight = container.value.clientHeight;
    if (!viewportWidth || !viewportHeight) return;

    const padding = 50;
    const scaleX = (viewportWidth - padding * 2) / width;
    const scaleY = (viewportHeight - padding * 2) / height;
    
    scale.value = Math.min(Math.max(Math.min(scaleX, scaleY), 0.6), 0.9);
    panY.value = viewportHeight / 2 - (minY + height / 2) * scale.value;
    panX.value = 40 - minX * scale.value;
    hasInitialZoom.value = true;
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
