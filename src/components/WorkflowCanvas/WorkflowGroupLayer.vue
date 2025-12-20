<template>
  <div class="group-layer">
    <div v-for="group in groups" :key="group.id" class="group-wrapper">
      <div
        class="group-box"
        :class="{
          dragging: dragGroupId === group.id || draggingGroupId === group.id,
        }"
        :style="getGroupLayoutStyle(group)"
        @mousedown="onMouseDown($event, group.id)"
        @mouseenter="$emit('group-hover', group.id)"
        @mouseleave="$emit('group-leave')"
      ></div>

      <!-- Ghost Node -->
      <Transition name="slide-down">
        <div
          v-if="!readOnly && activeGroupId === group.id"
          class="ghost-node"
          :class="{
            dragging: dragGroupId === group.id || draggingGroupId === group.id,
          }"
          :style="getGhostNodeStyle(group)"
          @click.stop="$emit('add-node-to-group', group.id)"
          @mouseenter="$emit('group-hover', group.id)"
          @mouseleave="$emit('group-leave')"
        >
          <div class="plus-sign">+</div>
        </div>
      </Transition>

      <!-- Group Output Ghost Node (Right) -->
      <Transition name="slide-right">
        <div
          v-if="
            !readOnly &&
            !group.hasOutgoing &&
            activeGroupId === group.id &&
            settings.WorkflowChordCreation
          "
          class="ghost-node right"
          :class="{
            dragging: dragGroupId === group.id || draggingGroupId === group.id,
          }"
          :style="getRightGhostNodeStyle(group)"
          @click.stop="$emit('add-group-callback', group.id)"
          @mouseenter="$emit('group-hover', group.id)"
          @mouseleave="$emit('group-leave')"
          title="Convert to Chord"
        >
          <div class="plus-sign">+</div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script>
export default {
  name: "WorkflowGroupLayer",
};
</script>

<script setup>
import { ref, computed } from "vue";
import { useUserSettings } from "@/composables/useUserSettings";

const { settings } = useUserSettings();

const props = defineProps({
  nodes: {
    type: Array,
    required: true,
  },
  edges: {
    type: Array,
    default: () => [],
  },
  scale: {
    type: Number,
    default: 1,
  },
  draggingGroupId: {
    type: String,
    default: null,
  },
  activeGroupId: {
    type: String,
    default: null,
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "move-group",
  "add-node-to-group",
  "add-group-callback",
  "group-hover",
  "group-leave",
  "group-drag-start",
  "group-drag-end",
]);

const isDragging = ref(false);
const dragGroupId = ref(null);
const startX = ref(0);
const startY = ref(0);

/**
 * Groups nodes by their groupId and calculates bounding boxes.
 * Determines if a group has outgoing edges (for chord pattern logic).
 * @returns {Array<Object>} List of group objects with bounds and nodes.
 */
const groups = computed(() => {
  const groupsData = {};
  const nodesWithOutgoingEdges = new Set(props.edges.map((e) => e.from));

  props.nodes.forEach((node) => {
    if (!node.groupId) return;

    // Create dependency on node position for reactivity
    // eslint-disable-next-line no-unused-vars
    const _ = node.x + node.y;

    if (!groupsData[node.groupId]) {
      groupsData[node.groupId] = {
        id: node.groupId,
        nodes: [],
        // Initialize bounds
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
        hasOutgoing: false,
      };
    }

    const group = groupsData[node.groupId];
    group.nodes.push(node);

    // Update bounds incrementally
    const nodeWidth = 180;
    const nodeHeight = 100;

    if (node.x < group.minX) group.minX = node.x;
    if (node.y < group.minY) group.minY = node.y;
    if (node.x + nodeWidth > group.maxX) group.maxX = node.x + nodeWidth;
    if (node.y + nodeHeight > group.maxY) group.maxY = node.y + nodeHeight;

    // Check outgoing edge
    if (nodesWithOutgoingEdges.has(node.id)) {
      group.hasOutgoing = true;
    }
  });

  return Object.values(groupsData);
});

/**
 * Calculates the CSS layout styles (position and dimensions) for a group's bounding box.
 * Use this to determine where the group box should be drawn on the canvas.
 * @param {Object} group - The group object.
 * @returns {Object} CSS style object containing top, left, width, height.
 */
const getGroupLayoutStyle = (group) => {
  if (group.nodes.length === 0) return {};

  // Use pre-calculated bounds from the group object
  let minX = group.minX;
  let minY = group.minY;
  let maxX = group.maxX;
  let maxY = group.maxY;

  // Extend box to include ghost node ONLY if active (hovered) and NOT read-only
  if (!props.readOnly && props.activeGroupId === group.id) {
    maxY += 120;
  }

  const padding = 20;

  return {
    left: `${minX - padding}px`,
    top: `${minY - padding}px`,
    width: `${maxX - minX + padding * 2}px`,
    height: `${maxY - minY + padding * 2}px`,
  };
};

/**
 * Calculates the position of the ghost node (add button) at the bottom of the group.
 * @param {Object} group - The group object.
 * @returns {Object} CSS style object.
 */
const getGhostNodeStyle = (group) => {
  if (group.nodes.length === 0) return {};

  let maxY = -Infinity;
  let commonX = group.nodes[0].x;

  group.nodes.forEach((node) => {
    if (node.y > maxY) maxY = node.y;
  });

  // Position it below the last node
  const top = maxY + 120; // Same spacing as between nodes (100 height + 20 gap)

  return {
    left: `${commonX}px`,
    top: `${top}px`,
  };
};

/**
 * Calculates the position of the right-side ghost node (callback adder).
 * @param {Object} group - The group object.
 * @returns {Object} CSS style object.
 */
const getRightGhostNodeStyle = (group) => {
  if (group.nodes.length === 0) return {};

  let maxY = -Infinity;
  let maxX = -Infinity;
  let minY = Infinity;

  // Node dimensions
  const nodeWidth = 180;
  const nodeHeight = 100;

  group.nodes.forEach((node) => {
    if (node.x + nodeWidth > maxX) maxX = node.x + nodeWidth;
    if (node.y + nodeHeight > maxY) maxY = node.y + nodeHeight;
    if (node.y < minY) minY = node.y;
  });

  // Account for ghost node space (same as in getGroupStyle)
  maxY += 120;

  const padding = 20;

  // Center vertically relative to group
  const centerY = (minY + maxY) / 2;
  // Center the 80px high node
  const top = centerY - nodeHeight / 2;

  return {
    left: `${maxX + padding + 50}px`,
    top: `${top}px`,
  };
};

/**
 * Initiates dragging of a group.
 * @param {Event} e - The mouse event.
 * @param {string} groupId - The ID of the group being dragged.
 */
const onMouseDown = (e, groupId) => {
  e.stopPropagation(); // Prevent canvas panning/selection
  isDragging.value = true;
  dragGroupId.value = groupId;
  startX.value = e.clientX;
  startY.value = e.clientY;

  // Emit drag-start when dragging by the box
  emit("group-drag-start", groupId);

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
};

/**
 * Handles mouse move during group dragging.
 * @param {Event} e - The mouse event.
 */
const onMouseMove = (e) => {
  if (!isDragging.value) return;

  const dx = (e.clientX - startX.value) / props.scale;
  const dy = (e.clientY - startY.value) / props.scale;

  // Reset start position to current for next delta
  startX.value = e.clientX;
  startY.value = e.clientY;

  emit("move-group", { groupId: dragGroupId.value, dx, dy });
};

/**
 * Ends the group dragging session.
 */
const onMouseUp = () => {
  isDragging.value = false;

  // Emit drag-end when dragging by the box
  emit("group-drag-end", dragGroupId.value);

  dragGroupId.value = null;
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
};
</script>

<style scoped>
.group-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Let clicks pass through to nodes */
  z-index: 5; /* Below nodes */
}

.group-box {
  position: absolute;
  border: 2px dashed rgba(var(--accent-rgb), 0.5);
  background: rgba(var(--accent-rgb), 0.05);
  border-radius: 16px;
  transition: all 0.2s ease-out; /* Smoother resize */
  pointer-events: auto; /* Enable interaction */
  cursor: grab;
}

.group-box.dragging {
  cursor: grabbing;
  background: rgba(var(--accent-rgb), 0.1);
  transition: none !important; /* Critical for performant dragging */
}

.group-box:active {
  cursor: grabbing;
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.8);
}

.ghost-node {
  position: absolute;
  width: 180px; /* Same as node width */
  height: 100px; /* Same as node height */
  border: 2px dashed rgba(var(--accent-rgb), 0.4);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgba(var(--accent-rgb), 0.02);
  transition: all 0.2s ease;
  pointer-events: auto; /* Clickable */
}

.ghost-node:hover {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.8);
}

.plus-sign {
  font-size: 24px;
  color: rgba(var(--accent-rgb), 0.6);
  font-weight: bold;
}

.ghost-node:hover .plus-sign {
  color: rgba(var(--accent-rgb), 1);
}

.ghost-node.dragging {
  transition: none;
}

/* Ghost node right styles reuse .ghost-node */
.ghost-node.right::before {
  content: "";
  position: absolute;
  left: -50px;
  top: 50%;
  width: 50px;
  height: 0;
  border-top: 2px dashed rgba(var(--accent-rgb), 0.4);
  transform: translateY(-50%);
}

/* Transitions */
.slide-down-enter-active,
.slide-down-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.2s ease-out;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-50px); /* Start halfway up */
  opacity: 0;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(-50px);
  opacity: 0;
}
</style>
