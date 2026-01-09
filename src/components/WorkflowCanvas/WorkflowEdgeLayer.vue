<!--
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
-->
<template>
  <svg class="edge-layer">
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="0"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" style="fill: var(--edge-color)" />
      </marker>
    </defs>
    <path
      v-for="path in paths"
      :key="path.id"
      :d="path.d"
      :class="{ 'animated-edge': path.animated }"
      marker-end="url(#arrowhead)"
    />
  </svg>
</template>

<script>
export default {
  name: "WorkflowEdgeLayer",
};
</script>

<script setup>
import { computed } from "vue";

const props = defineProps({
  nodes: {
    type: Array,
    required: true,
  },
  edges: {
    type: Array,
    required: true,
  },
});

/**
 * Creates a Map of nodes indexed by their ID for O(1) lookup.
 * @returns {Map<string, Object>} Map of node objects.
 */
const nodeMap = computed(() => {
  const map = new Map();
  for (const node of props.nodes) {
    if (node && node.id) {
      map.set(node.id, node);
    }
  }
  return map;
});

/**
 * Calculates the SVG path data for all edges.
 * Generates cubic bezier curves with dynamic curvature based on distance.
 * @returns {Array<Object>} Array of path objects with 'd' attribute and animation state.
 */
const paths = computed(() => {
  return props.edges
    .map((edge) => {
      const startNode = nodeMap.value.get(edge.from);
      const endNode = nodeMap.value.get(edge.to);

      if (!startNode || !endNode) return null;

      // Calculate anchor points (center right of start, center left of end)
      const startWidth = startNode.type === "Input" ? 200 : 180;
      const startX = startNode.x + startWidth; // Width of node
      const startY = startNode.y + 50; // Approx half height of 100px

      // Shorten the end point by arrow width (10px) + small gap (2px)
      const endX = endNode.x - 24;
      const endY = endNode.y + 50;

      // Cubic Bezier Curve
      // Control points push outward (Right for Source, Left for Target).
      const dist = Math.abs(endX - startX);
      const curvature = Math.max(dist * 0.5, 60); // Min 60px curve for close nodes

      const cp1x = startX + curvature;
      const cp1y = startY;
      const cp2x = endX - curvature;
      const cp2y = endY;

      return {
        id: edge.id,
        d: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
        animated: startNode.data && startNode.data.status_short === "PROGRESS",
      };
    })
    .filter((p) => p !== null);
});
</script>

<style scoped>
.edge-layer {
  --edge-color: var(--accent-color);
  --edge-layer-z: 0;

  z-index: var(--edge-layer-z);
  pointer-events: none;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
}

path {
  fill: none;
  stroke: var(--edge-color);
  stroke-width: 2px;
  stroke-linecap: round;
  filter: drop-shadow(0 0 4px var(--accent-glow));
}

.animated-edge {
  stroke-dasharray: 10 5;
  animation: flow 1s linear infinite;
}

@keyframes flow {
  to {
    stroke-dashoffset: -15;
  }
}
</style>
