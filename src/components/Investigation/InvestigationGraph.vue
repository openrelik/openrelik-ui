<template>
  <div
    class="investigation-graph-container"
    ref="container"
    @mousedown="onMouseDown"
    @wheel="onWheel"
  >
    <div
      class="graph-viewport"
      :style="{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }"
    >
      <!-- Edges Layer (SVG) -->
      <svg
        class="edges-layer"
        :width="graphSize.width + 500"
        :height="graphSize.height + 500"
      >
        <path
          v-for="edge in edges"
          :key="edge.id"
          :d="getEdgePath(edge)"
          fill="none"
          stroke="rgba(150, 150, 150, 0.5)"
          stroke-width="2"
        />
      </svg>

      <!-- Nodes Layer -->
      <transition-group
        name="node"
        tag="div"
        class="nodes-layer"
        @before-enter="onBeforeEnter"
        @enter="onEnter"
        @leave="onLeave"
        :css="false"
      >
        <InvestigationGraphNode
          v-for="node in nodes"
          :key="node.id"
          :data-id="node.id"
          :node="node"
          :x="node.x"
          :y="node.y"
          :width="NODE_WIDTH - 20"
          :height="NODE_HEIGHT - 20"
          @click="handleNodeClick"
          :is-collapsed="
            (node.type === 'SECTION' || node.type === 'HYPOTHESIS') &&
            !expandedNodes.has(node.id)
          "
        />
      </transition-group>
    </div>

    <!-- Controls -->
    <div class="graph-controls">
      <v-btn
        icon="mdi-plus"
        size="x-small"
        variant="flat"
        @click="zoomIn"
        class="mb-1"
      ></v-btn>
      <v-btn
        icon="mdi-minus"
        size="x-small"
        variant="flat"
        @click="zoomOut"
        class="mb-1"
      ></v-btn>
      <v-btn
        icon="mdi-fit-to-screen-outline"
        size="x-small"
        variant="flat"
        @click="fitToScreen"
      ></v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useInvestigationStore } from "@/stores/investigation";
import {
  calculateLayout,
  NODE_WIDTH,
  NODE_HEIGHT,
} from "@/utils/investigationLayout";
import InvestigationGraphNode from "./InvestigationGraphNode.vue";

const investigationStore = useInvestigationStore();
const container = ref(null);

const nodes = ref([]);
const edges = ref([]);
const graphSize = ref({ width: 0, height: 0 });
// New: Track expanded nodes (Default closed for Leads)
const expandedNodes = ref(new Set());

const pan = ref({ x: 0, y: 0 });
const zoom = ref(1);
const isDragging = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });

// Layout Calculation
const performLayout = () => {
  const graph = investigationStore.graph;
  if (!graph) return;

  const layout = calculateLayout(graph, expandedNodes.value);
  nodes.value = layout.nodes;
  edges.value = layout.edges;
  graphSize.value = { width: layout.width, height: layout.height };
};

// React to graph changes
watch(
  () => investigationStore.graph,
  () => {
    // We do NOT reset expandedNodes here. User state persists.
    performLayout();
  },
  { immediate: true }
);

const handleNodeClick = (node) => {
  if (node.type === "SECTION" || node.type === "HYPOTHESIS") {
    if (expandedNodes.value.has(node.id)) {
      expandedNodes.value.delete(node.id);
    } else {
      expandedNodes.value.add(node.id);
    }
    // Trigger layout update
    performLayout();
  }
};

// Animation Helpers
const getParentNode = (nodeId) => {
  const graph = investigationStore.graph;
  if (!graph) return null;
  const parents = graph.getParents(nodeId);
  if (parents.length > 0) {
    // Return the visible parent node object if possible
    // We try to find it in the current `nodes` array first,
    // but for 'enter' it might be there. For 'leave', the parent should be there.
    const parentId = parents[0].id;
    return nodes.value.find((n) => n.id === parentId);
  }
  return null;
};

const onBeforeEnter = (el) => {
  const nodeId = el.getAttribute("data-id");
  const parent = getParentNode(nodeId);

  if (parent) {
    el.style.transition = "none";
    el.style.transform = `translate(${parent.x}px, ${parent.y}px)`;
    el.style.opacity = "0";
  }
};

const onEnter = (el, done) => {
  const nodeId = el.getAttribute("data-id");
  const targetNode = nodes.value.find((n) => n.id === nodeId);

  // Force reflow
  el.offsetHeight;

  // Animate to target
  el.style.transition = "all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)";

  if (targetNode) {
    el.style.transform = `translate(${targetNode.x}px, ${targetNode.y}px)`;
  }
  el.style.opacity = "1";

  // Clean up after animation
  setTimeout(() => {
    el.style.transition = "";
    done();
  }, 300);
};

const onLeave = (el, done) => {
  const nodeId = el.getAttribute("data-id");
  const parent = getParentNode(nodeId);

  // Lock current dimensions/position for the animation start
  // (It should already be there)

  // Force reflow
  el.offsetHeight;

  el.style.transition = "all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)";

  if (parent) {
    el.style.transform = `translate(${parent.x}px, ${parent.y}px)`;
  }
  el.style.opacity = "0";

  setTimeout(done, 300);
};

// Interactions
const onMouseDown = (e) => {
  isDragging.value = true;
  lastMousePos.value = { x: e.clientX, y: e.clientY };
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
};

const onMouseMove = (e) => {
  if (!isDragging.value) return;
  const dx = e.clientX - lastMousePos.value.x;
  const dy = e.clientY - lastMousePos.value.y;
  pan.value.x += dx;
  pan.value.y += dy;
  lastMousePos.value = { x: e.clientX, y: e.clientY };
};

const onMouseUp = () => {
  isDragging.value = false;
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
};

const onWheel = (e) => {
  e.preventDefault();

  if (!container.value) return;

  const rect = container.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Calculate world coordinates of the mouse before zoom
  const worldX = (mouseX - pan.value.x) / zoom.value;
  const worldY = (mouseY - pan.value.y) / zoom.value;

  // Determine new zoom level
  // "Less sensitive": use smaller step, e.g. 0.05
  const zoomStep = 0.05;
  const direction = e.deltaY < 0 ? 1 : -1;
  let newZoom = zoom.value + direction * zoomStep;

  // Clamp zoom
  newZoom = Math.max(0.1, Math.min(newZoom, 3));

  // Update Pan to keep the world point at the same mouse position
  // mouseX = newPanX + worldX * newZoom
  // newPanX = mouseX - worldX * newZoom
  pan.value.x = mouseX - worldX * newZoom;
  pan.value.y = mouseY - worldY * newZoom;

  zoom.value = newZoom;
};

const zoomIn = () => (zoom.value = Math.min(zoom.value + 0.1, 3));
const zoomOut = () => (zoom.value = Math.max(zoom.value - 0.1, 0.1));

const fitToScreen = () => {
  if (!container.value || nodes.value.length === 0) return;
  const containerWidth = container.value.clientWidth;
  const containerHeight = container.value.clientHeight;

  const contentWidth = graphSize.value.width + 100; // Buffer
  const contentHeight = graphSize.value.height + 100;

  const scaleX = containerWidth / contentWidth;
  const scaleY = containerHeight / contentHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in pass 100%

  zoom.value = scale;
  // Center it
  pan.value.x = (containerWidth - contentWidth * scale) / 2;
  pan.value.y = 50; // Slight top padding
};

const VISUAL_NODE_WIDTH = NODE_WIDTH - 20;
const VISUAL_NODE_HEIGHT = NODE_HEIGHT - 20;

// Edge Path Calculation (Bezier)
const getEdgePath = (edge) => {
  const source = nodes.value.find((n) => n.id === edge.from);
  const target = nodes.value.find((n) => n.id === edge.to);

  if (!source || !target) return "";

  // Start at Right Center of Source
  const startX = source.x + VISUAL_NODE_WIDTH;
  const startY = source.y + VISUAL_NODE_HEIGHT / 2;

  // End at Left Center of Target
  const endX = target.x;
  const endY = target.y + VISUAL_NODE_HEIGHT / 2;

  const c1x = startX + 50; // Control point 1
  const c1y = startY;
  const c2x = endX - 50; // Control point 2
  const c2y = endY;

  return `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;
};

onMounted(() => {
  setTimeout(fitToScreen, 100); // Initial fit
});
</script>

<style scoped>
.investigation-graph-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background-color: rgb(var(--v-theme-background));
  cursor: grab;
}

.investigation-graph-container:active {
  cursor: grabbing;
}

.graph-viewport {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.edges-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  overflow: visible;
}

.edges-layer path {
  transition: d 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.nodes-layer {
  /* Wrapper for transition-group, acts as container for absolute nodes */
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Let clicks pass through wrapper to nodes */
}

.nodes-layer > * {
  pointer-events: auto; /* Re-enable clicks on nodes */
}

/* Node enter/leave transitions */
.node-enter-active,
.node-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.node-enter-from,
.node-leave-to {
  opacity: 0;
  transform: scale(
    0.8
  ); /* We can't easily transform scale AND translate because translate is inline style. 
                            However, Vue transitions usually append classes. 
                            If inline style has transform, adding transform in class might conflict or be overridden.
                            Ideally we use opacity only if translate is inline. 
                            OR we use !important (ugly). 
                            Actually, InvestigationGraphNode applies transform via :style.
                            So CSS class transform will be overridden by inline style for translation.
                            So we can only animate non-conflicting properties like opacity. */
  opacity: 0;
}

.graph-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  z-index: 10;
}
</style>
