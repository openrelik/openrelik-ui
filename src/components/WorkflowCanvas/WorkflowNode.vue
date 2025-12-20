<template>
  <div
    class="workflow-node glass"
    :class="{
      grouped: node.groupId,
      input: node.type === 'Input',
      'group-dragging':
        externalDragGroupId && externalDragGroupId === node.groupId,
      'status-success': node.data && node.data.status_short === 'SUCCESS',
      'status-failure': node.data && node.data.status_short === 'FAILURE',
      'status-progress': node.data && node.data.status_short === 'PROGRESS',
      'light-theme': isLightTheme,
      'dark-theme': !isLightTheme,
    }"
    :style="{
      transform: `translate(${node.x}px, ${node.y}px)`,
      paddingBottom: showConfigButton ? '42px' : '12px',
    }"
    @mousedown="onMouseDown"
    @mouseenter="$emit('node-hover', node)"
    @mouseleave="$emit('node-leave', node)"
  >
    <v-dialog v-model="showTaskConfigForm" width="600">
      <v-card width="600" class="mx-auto">
        <v-card-title>Config for {{ node.label }}</v-card-title>
        <v-card-text>
          <task-config-form
            :fields="node.data.task_config"
            @save="saveTaskConfig($event)"
            @cancel="showTaskConfigForm = false"
          ></task-config-form>
        </v-card-text>
      </v-card>
    </v-dialog>
    <div class="content">
      <div class="title">
        <span v-if="node.type !== 'Input'">
          {{ node.label }}
        </span>

        <span
          v-if="hasHighPriorityReport"
          class="alert-badge"
          title="High priority issues found"
          >Alert</span
        >
        <span
          v-if="isSuccessNoOutput"
          class="no-output-badge"
          title="Task completed successfully but produced no output files"
          >No output</span
        >
      </div>

      <!-- Creative Progress Effect -->
      <div
        v-if="node.data && node.data.status_short === 'PROGRESS'"
        class="circulating-border"
      ></div>

      <!-- Input Files List -->
      <div
        v-if="node.type === 'Input' && node.data && node.data.files"
        class="input-files"
      >
        <div
          v-for="file in visibleFiles"
          :key="file.id"
          class="filename"
          :title="file.display_name"
        >
          {{ file.display_name }}
        </div>
        <div
          v-if="hasMoreFiles"
          class="show-more-btn"
          @click.stop="isFilesExpanded = !isFilesExpanded"
        >
          {{
            isFilesExpanded
              ? "Show less"
              : `Show all (+${node.data.files.length - 3})`
          }}
        </div>
      </div>
    </div>
    <div
      v-if="!readOnly && !isConnectedToGroup && !isGroupConnectedToCallback"
      class="handle output-handle"
      @click.stop="onHandleClick"
      title="Click to add connected node"
    ></div>
    <div
      v-if="node.data && node.data.runtime"
      class="runtime-badge-on-node"
      :class="{ 'with-delete': !readOnly }"
    >
      {{ formatRuntime(node.data.runtime) }}
    </div>

    <!-- Config Button -->
    <div
      v-if="showConfigButton"
      class="config-btn"
      :class="{ 'is-configured': hasConfiguredValue }"
      @click.stop="showTaskConfigForm = true"
      :title="hasConfiguredValue ? 'Re-configure node' : 'Configure node'"
    >
      <v-icon size="small">mdi-cog-outline</v-icon>
      {{ hasConfiguredValue ? "Show configuration" : "Configure" }}
    </div>

    <div
      v-if="!readOnly"
      class="delete-btn"
      @click.stop="$emit('remove-node', node.id)"
      title="Remove node"
    >
      ×
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from "vue";
import TaskConfigForm from "../TaskConfigForm.vue";
import { useThemeInfo } from "@/composables/useThemeInfo";

const { isLightTheme } = useThemeInfo();

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  scale: {
    type: Number,
    default: 1,
  },
  edges: {
    type: Array,
    default: () => [],
  },
  nodes: {
    type: Array,
    default: () => [],
  },
  externalDragGroupId: {
    type: String,
    default: null,
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
  dragDisabled: {
    type: Boolean,
    default: false,
  },
  activeOverviewNodeId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits([
  "update:position",
  "add-node",
  "drag-start",
  "drag-end",
  "remove-node",
  "node-hover",
  "node-leave",
  "toggle-overview",
  "update:node-config",
]);

// Data / State
const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);
const initialNodeX = ref(0);
const initialNodeY = ref(0);
const rafId = ref(null);
const dragThreshold = 3; // Pixels to distinguish click from drag
const hasMoved = ref(false);
const showTaskConfigForm = ref(false);
const isFilesExpanded = ref(false);

// Computed
const visibleFiles = computed(() => {
  if (!props.node.data || !props.node.data.files) return [];
  if (isFilesExpanded.value) {
    return props.node.data.files;
  }
  return props.node.data.files.slice(0, 3);
});

const hasMoreFiles = computed(() => {
  return (
    props.node.data && props.node.data.files && props.node.data.files.length > 3
  );
});

/**
 * Checks if the node is connected to any node that is part of a group.
 * Used to control displaying the output handle.
 * @returns {boolean} True if connected to a group member.
 */
const isConnectedToGroup = computed(() => {
  const outgoingEdges = props.edges.filter(
    (edge) => edge.from === props.node.id
  );
  return outgoingEdges.some((edge) => {
    const targetNode = props.nodes.find((n) => n.id === edge.to);
    return targetNode && targetNode.groupId;
  });
});

/**
 * Checks if this node belongs to a group that is connected to a Callback node.
 * This implies the "Chord" pattern is fully formed.
 * @returns {boolean} True if the group connects to a callback.
 */
const isGroupConnectedToCallback = computed(() => {
  if (!props.node.groupId) return false;
  // Find all nodes in this group
  const groupNodes = props.nodes.filter(
    (n) => n.groupId === props.node.groupId
  );
  // Check if ANY of them connects to a callback
  return groupNodes.some((groupNode) => {
    const outgoingEdges = props.edges.filter(
      (edge) => edge.from === groupNode.id
    );
    return outgoingEdges.some((edge) => {
      const targetNode = props.nodes.find((n) => n.id === edge.to);
      return targetNode && targetNode.type === "Callback";
    });
  });
});

const outputFileCount = computed(() => {
  if (!props.node.data || !props.node.data.output_files) return 0;
  return props.node.data.output_files.length;
});

const isSuccessNoOutput = computed(() => {
  return (
    props.node.data &&
    props.node.data.status_short === "SUCCESS" &&
    outputFileCount.value === 0
  );
});

const hasHighPriorityReport = computed(() => {
  if (!props.node.data) return false;
  const fileReportHigh =
    props.node.data.file_reports &&
    props.node.data.file_reports.some((report) => report.priority >= 40);

  const taskReportHigh =
    props.node.data.task_report && props.node.data.task_report.priority >= 40;

  return fileReportHigh || taskReportHigh;
});

const hasTaskConfig = computed(() => {
  // Check node.data.task_config
  return (
    props.node.data &&
    props.node.data.task_config &&
    props.node.data.task_config.length > 0
  );
});

const hasConfiguredValue = computed(() => {
  if (
    !props.node.data ||
    !props.node.data.task_config ||
    !Array.isArray(props.node.data.task_config)
  )
    return false;
  return props.node.data.task_config.some((option) => {
    return (
      Object.prototype.hasOwnProperty.call(option, "value") &&
      option.value !== null &&
      option.value !== undefined &&
      option.value !== ""
    );
  });
});

const showConfigButton = computed(() => {
  return (
    hasTaskConfig.value && !props.readOnly && !props.node.data.status_short
  );
});

// Methods

/**
 * Initiates node dragging logic.
 * @param {MouseEvent} e - The mouse event.
 */
const onMouseDown = (e) => {
  if (props.dragDisabled) return;

  e.stopPropagation();
  isDragging.value = true;
  hasMoved.value = false; // Reset movement flag
  startX.value = e.clientX;
  startY.value = e.clientY;
  initialNodeX.value = props.node.x;
  initialNodeY.value = props.node.y;

  emit("drag-start", props.node);

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
};

/**
 * Handles mouse movement for updates node position via requestAnimationFrame.
 * @param {MouseEvent} e - The mouse event.
 */
const onMouseMove = (e) => {
  if (!isDragging.value) return;

  const dx = e.clientX - startX.value;
  const dy = e.clientY - startY.value;

  // Check if moved beyond threshold
  if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
    hasMoved.value = true;
  }

  if (rafId.value) return; // Throttling

  rafId.value = requestAnimationFrame(() => {
    const scaledDx = dx / props.scale;
    const scaledDy = dy / props.scale;

    emit("update:position", {
      id: props.node.id,
      x: initialNodeX.value + scaledDx,
      y: initialNodeY.value + scaledDy,
    });

    rafId.value = null;
  });
};

/**
 * Ends the drag operation and cleans up listeners.
 */
const onMouseUp = () => {
  isDragging.value = false;
  if (rafId.value) {
    cancelAnimationFrame(rafId.value);
    rafId.value = null;
  }
  emit("drag-end", props.node);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);

  // Toggle overview if it was a click (not a drag)
  if (!hasMoved.value) {
    // Check if the task is complete (success or failure) to toggle overview
    if (
      props.node.data &&
      (props.node.data.status_short === "SUCCESS" ||
        props.node.data.status_short === "FAILURE")
    ) {
      emit("toggle-overview", props.node.id);
    }
  }
};

/**
 * Emits the add-node event when the output handle is clicked.
 */
const onHandleClick = () => {
  emit("add-node", props.node.id);
};

/**
 * Formats the runtime duration for display.
 * @param {number} seconds - The runtime in seconds.
 * @returns {string} Formatted string (e.g., "1.23s" or "< 1s").
 */
const formatRuntime = (seconds) => {
  if (!seconds) return "";
  if (seconds < 1) return "< 1s";
  return `${seconds.toFixed(2)}s`;
};

const saveTaskConfig = (formData) => {
  emit("update:node-config", {
    nodeId: props.node.id,
    formData,
  });
  showTaskConfigForm.value = false;
};

// Lifecycle Hooks

// Ensure cleanup even if component is unmounted while dragging
onUnmounted(() => {
  if (isDragging.value) {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    if (rafId.value) {
      cancelAnimationFrame(rafId.value);
    }
  }
});
</script>

<style scoped>
.workflow-node {
  /* Common for both themes */
  position: absolute;
  width: 180px;
  min-height: 100px; /* Increased to account for button space uniformly */
  height: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  text-align: left;
  padding: 12px;
  border-radius: 12px;
  cursor: grab;

  transition: transform 0.2s ease-out, box-shadow 0.2s;
  user-select: none;
  z-index: 10;
  /* padding-bottom removed to allow content to fill naturally */
}

.workflow-node.light-theme {
  --node-bg: rgba(255, 255, 255, 0.7);
  --node-border: #afafaf;
  --input-text-color: #333333;
  --node-shadow: none;
}

.workflow-node.dark-theme {
  --node-bg: rgba(148, 163, 184, 0.1);
  --node-border: rgba(255, 255, 255, 0.1);
  --input-text-color: #ffffff;
  --node-shadow: none;
}

.workflow-node:active,
.workflow-node.group-dragging {
  cursor: grabbing;
  box-shadow: 0 0 20px var(--accent-glow);
  border-color: var(--accent-color);
  transition: none !important; /* Critical for performant dragging */
}

.glass {
  background: var(--node-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--node-border);
  box-shadow: var(--node-shadow);
}

.content {
  min-width: 0; /* Allow shrinking for text overflow */
  width: 100%;
}

.title {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Handles */
.handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--accent-color);
  border-radius: 50%;
  top: 50px; /* Fixed offset */
  transform: translateY(-50%);
  box-shadow: 0 0 8px var(--accent-glow);
  transition: transform 0.2s, background 0.2s;
}

.output-handle {
  right: -10px;
  width: 20px;
  height: 20px;
  background: var(--node-bg);

  border: 2px solid var(--accent-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.output-handle::before,
.output-handle::after {
  content: "";
  position: absolute;
  background: var(--accent-color);
  border-radius: 2px;
}

/* Vertical bar */
.output-handle::before {
  width: 2px;
  height: 10px;
}

/* Horizontal bar */
.output-handle::after {
  width: 10px;
  height: 2px;
}

.output-handle:hover {
  transform: translateY(-50%) scale(1.1);
  background: var(--accent-color);
}

.output-handle:hover::before,
.output-handle:hover::after {
  background: white;
}

.delete-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding-bottom: 2px;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 25;
}

.workflow-node:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  transform: scale(1.1);
  background: #dc2626;
}

/* Specific Input behavior */

.workflow-node.input:active {
  box-shadow: 0 0 20px rgba(148, 163, 184, 0.2);
  border-color: rgba(148, 163, 184, 0.8);
}

.workflow-node.input .subtitle {
  color: rgba(148, 163, 184, 0.8);
}

.workflow-node.input {
  width: 200px;
}

/* Hide delete button for input nodes */
.workflow-node.input .delete-btn {
  display: none;
}

.input-files {
  font-size: 0.85rem;
  color: var(--input-text-color);
  margin-left: -12px;
  margin-right: -12px;
  width: auto;
  align-self: stretch;
  text-align: left;
  padding-left: 12px;
  padding-right: 12px;
}

.filename {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 2px 0;
  line-height: 1.4;
}

.show-more-btn {
  font-size: 0.75rem;
  color: var(--accent-color);
  cursor: pointer;
  margin-top: 4px;
  font-weight: 500;
}

.show-more-btn:hover {
  text-decoration: underline;
}

.workflow-node.status-success {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.workflow-node.status-failure {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.workflow-node.status-progress {
  border-color: #eab308;
  background: rgba(234, 179, 8, 0.1);
  box-shadow: none;
}

.workflow-node.light-theme.status-progress {
  border-color: #ca8a04;
  background: rgba(234, 179, 8, 0.25);
}

.circulating-border {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  overflow: hidden;
  padding: 2px;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.circulating-border::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    transparent 0%,
    rgba(234, 179, 8, 0.8) 20%,
    transparent 40%
  );
  animation: spin 3s linear infinite;
  transform: translate(-50%, -50%);
}

.runtime-badge-on-node {
  position: absolute;
  top: -8px;
  right: 0;
  background: var(--node-bg);
  border: 1px solid var(--node-border);
  border: 1px solid var(--node-border);
  border-bottom: none;

  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.65rem;
  color: #94a3b8;
  font-family: monospace;

  background: var(--popup-bg, #ffffff);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  z-index: 20;
}

.workflow-node.dark-theme .runtime-badge-on-node {
  background: #1e293b;
  color: #94a3b8;
}
.workflow-node.light-theme .runtime-badge-on-node {
  background: #ffffff;
  color: #64748b;
}

.runtime-badge-on-node {
  top: -9px; /* Overlap by half (18px height / 2 = 9px) */
  right: 12px; /* Move it slightly in instead of right on the edge */
  border-radius: 9px; /* Full pill shape */
  border: 1px solid;
  border-color: inherit;
  height: 18px;
  line-height: 16px; /* Center text vertically */
  z-index: 15; /* Top of node but below delete btn if overlaps */
}

.runtime-badge-on-node.with-delete {
  right: 16px; /* Shift left to avoid delete button overlap on hover */
}

.alert-badge {
  background-color: #ef4444;
  color: white;
  font-size: 0.6rem;
  padding: 1px 4px;
  border-radius: 4px;
  margin-left: 6px;
  font-weight: 600;
  vertical-align: middle;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.no-output-badge {
  background-color: #f59e0b; /* Orange-500 */
  color: white;
  font-size: 0.6rem;
  padding: 1px 4px;
  border-radius: 4px;
  margin-left: 6px;
  font-weight: 600;
  vertical-align: middle;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@keyframes spin {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.config-btn {
  position: absolute;
  bottom: 8px; /* Lift from bottom */
  left: 50%;
  transform: translateX(-50%);
  transform: translateX(-50%);
  width: calc(100% - 16px);
  padding: 0 8px;
  height: 24px;
  background: transparent;
  border: 1px solid var(--node-border);
  border-radius: 20px;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  font-size: 0.75rem;
  color: var(--input-text-color);
  cursor: pointer;
  transition: all 0.2s;
  z-index: 25;
}

.workflow-node.dark-theme .config-btn {
  background: rgba(0, 0, 0, 0.2);
  color: #94a3b8;
}

.config-btn:hover {
  background: var(--accent-color) !important;
  color: white !important;
  border-color: var(--accent-color);
}

.config-btn.is-configured {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
  opacity: 1 !important; /* Always visible if configured */
}
</style>
