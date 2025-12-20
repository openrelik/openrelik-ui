<template>
  <div
    ref="container"
    class="canvas-container"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @wheel="handleWheel"
    :class="{
      panning: isPanning,
      'space-pressed': isSpacePressed,
      'light-theme': isLightTheme,
      'dark-theme': !isLightTheme,
    }"
  >
    <div
      class="viewport"
      :style="[viewportStyle, { opacity: hasInitialZoom || hasNodes ? 1 : 0 }]"
      style="transition: opacity 0.2s ease-in"
    >
      <WorkflowGroupLayer
        :nodes="visibleNodes"
        :edges="edges"
        :scale="scale"
        :dragging-group-id="externalDragGroupId"
        :active-group-id="hoveredGroupId"
        :read-only="readOnly"
        @move-group="handleGroupMove"
        @add-node-to-group="handleAddNodeToGroup"
        @add-group-callback="handleAddGroupCallback"
        @group-hover="handleGroupHover"
        @group-leave="handleGroupLeave"
        @group-drag-start="handleGroupDragStart"
        @group-drag-end="handleGroupDragEnd"
      />
      <WorkflowEdgeLayer :nodes="visibleNodes" :edges="edges" />
      <WorkflowNode
        v-for="node in visibleNodes"
        :key="node.id"
        :node="node"
        :nodes="visibleNodes"
        :edges="edges"
        :scale="scale"
        :external-drag-group-id="externalDragGroupId"
        :read-only="readOnly"
        :drag-disabled="node.type === 'Input' && nodes.length === 1"
        :active-overview-node-id="activeOverviewNodeId"
        @update:position="handleNodeMove"
        @add-node="handleAddNode"
        @drag-start="handleNodeDragStart"
        @drag-end="handleNodeDragEnd"
        @remove-node="removeNode"
        @node-hover="handleNodeHover"
        @node-leave="handleNodeLeave"
        @toggle-overview="handleToggleOverview"
        @update:node-config="updateNodeTaskConfig"
      />
    </div>

    <Teleport to="body">
      <WorkflowTaskSelector
        v-if="showTaskMenu"
        :tasks="registeredCeleryTasks"
        :x="taskMenuPosition.x"
        :y="taskMenuPosition.y"
        :is-light-theme="isLightTheme"
        @select="handleSelectTask"
        @close="closeTaskMenu"
      />
      <transition name="fade">
        <WorkflowTaskResult
          v-if="activeOverviewNodeId && activeOverviewNode"
          :data="activeOverviewNode.data"
          :x="overviewPosition.x"
          :y="overviewPosition.y"
          :is-light-theme="isLightTheme"
          :folder-id="folder.id"
          @close="activeOverviewNodeId = null"
        />
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import {
  ref,
  toRefs,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "@/stores/app";
import { useWorkflowLayout } from "@/composables/useWorkflowLayout";
import { useWorkflowPatterns } from "@/composables/useWorkflowPatterns";
import { useWorkflowCanvasView } from "@/composables/useWorkflowCanvasView";
import { useWorkflowPolling } from "@/composables/useWorkflowPolling";
import { useThemeInfo } from "@/composables/useThemeInfo";
import { useWorkflowStore } from "@/stores/workflow";
import { computeCollisionOffsets } from "@/utils/workflowCanvasUtils";

import WorkflowEdgeLayer from "./WorkflowEdgeLayer.vue";
import WorkflowGroupLayer from "./WorkflowGroupLayer.vue";
import WorkflowTaskSelector from "./WorkflowTaskSelector.vue";
import WorkflowTaskResult from "./WorkflowTaskResult.vue";
import WorkflowNode from "./WorkflowNode.vue";

// Props & Emits
const props = defineProps({
  folder: {
    type: Object,
    required: true,
  },
  workflow: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits([
  "content-resize",
  "workflow-updated",
  "workflow-renamed",
]);

// Stores
const workflowStore = useWorkflowStore();
const appStore = useAppStore();
const {
  nodes,
  edges,
  readOnly,
  workflow: activeWorkflow,
  hasActiveTasks,
} = storeToRefs(workflowStore);
const { registeredCeleryTasks } = storeToRefs(appStore);

const {
  updateNodePosition,
  appendNode,
  moveGroup,
  addNodeToGroup,
  removeNode,
  updateNodeTaskConfig,
} = workflowStore;
const { setRegisteredCeleryTasks } = appStore;

// State (from setup)
const container = ref(null);
const showTaskMenu = ref(false);
const pendingParentId = ref(null);
const pendingGroupId = ref(null);
const pendingCallbackGroupId = ref(null);
const activeOverviewNodeId = ref(null);

// State (from data)
const externalDragGroupId = ref(null);
const hoveredGroupId = ref(null);
const hoverTimeout = ref(null);
const hoverOffsets = ref({});
const resizeObserver = ref(null);
const containerWidth = ref(0);
const containerHeight = ref(0);

// Composables
const { layout } = useWorkflowLayout();
const { isLightTheme } = useThemeInfo();
const { createChain, createGroup, createChord, addCallbackToGroup } =
  useWorkflowPatterns();

const {
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
  handleMouseDown: handleMouseDownNav,
  handleMouseMove,
  handleMouseUp,
  zoomToFit,
} = useWorkflowCanvasView({
  nodes,
  container,
  showTaskMenu,
  pendingParentId,
  pendingGroupId,
  pendingCallbackGroupId,
  activeOverviewNodeId,
});

// Polling
const { folder, workflow } = toRefs(props);
const folderId = computed(() => folder.value?.id);
const workflowId = computed(() => workflow.value?.id);

useWorkflowPolling({
  folderId,
  workflowId,
  isActive: hasActiveTasks,
  onUpdate: () => emit("workflow-updated"),
});

// Computed (from Options API)
const visibleNodes = computed(() => {
  if (Object.keys(hoverOffsets.value).length === 0) {
    return nodes.value;
  }
  return nodes.value.map((node) => {
    if (hoverOffsets.value[node.id]) {
      return {
        ...node,
        y: node.y + hoverOffsets.value[node.id],
      };
    }
    return node;
  });
});

const hasNodes = computed(() => nodes.value.length > 0);

// Methods
const updateContentHeight = () => {
  if (nodes.value.length === 0) return;

  let maxY = -Infinity;

  visibleNodes.value.forEach((node) => {
    if (node.y > maxY) maxY = node.y;
  });

  if (hoveredGroupId.value) {
    const groupNodes = nodes.value.filter(
      (n) => n.groupId === hoveredGroupId.value
    );
    if (groupNodes.length > 0) {
      let gMaxY = -Infinity;
      groupNodes.forEach((n) => {
        if (n.y > gMaxY) gMaxY = n.y;
      });
      const expandedBottom = gMaxY + 80 + 120;
      if (expandedBottom > maxY) {
        maxY = expandedBottom;
      }
    }
  }

  const NODE_HEIGHT_BUFFER = 200;
  const screenHeight =
    maxY * scale.value + panY.value + NODE_HEIGHT_BUFFER * scale.value;

  emit("content-resize", screenHeight);
};

const handleNodeMove = ({ id, x, y }) => {
  const node = nodes.value.find((n) => n.id === id);
  if (node && node.groupId) {
    const dx = x - node.x;
    const dy = y - node.y;
    handleGroupMove({ groupId: node.groupId, dx, dy });
  } else {
    updateNodePosition(id, x, y);
  }
};

const handleAddNode = (parentId) => {
  const parent = nodes.value.find((n) => n.id === parentId);
  if (!parent) return;
  pendingParentId.value = parentId;
  showTaskMenu.value = true;
};

const closeTaskMenu = () => {
  showTaskMenu.value = false;
  pendingParentId.value = null;
  pendingGroupId.value = null;
  pendingCallbackGroupId.value = null;
};

const handleSelectTask = (taskData) => {
  if (pendingParentId.value) {
    appendNode(pendingParentId.value, taskData);
  } else if (pendingGroupId.value) {
    addNodeToGroup(pendingGroupId.value, taskData);
  } else if (pendingCallbackGroupId.value) {
    addCallbackToGroup(pendingCallbackGroupId.value, taskData);
  }
  closeTaskMenu();
};

const handleToggleOverview = (nodeId) => {
  if (activeOverviewNodeId.value === nodeId) {
    activeOverviewNodeId.value = null;
  } else {
    activeOverviewNodeId.value = nodeId;
  }
};

const handleGroupMove = ({ groupId, dx, dy }) => {
  moveGroup(groupId, dx, dy);
};

const handleAddNodeToGroup = (groupId) => {
  const groupNodes = nodes.value.filter((n) => n.groupId === groupId);
  if (groupNodes.length === 0) return;

  pendingGroupId.value = groupId;
  showTaskMenu.value = true;
};

const handleAddGroupCallback = (groupId) => {
  pendingCallbackGroupId.value = groupId;
  showTaskMenu.value = true;
};

const handleNodeDragStart = (node) => {
  if (node.id !== activeOverviewNodeId.value) {
    activeOverviewNodeId.value = null;
  }
  if (node.groupId) {
    externalDragGroupId.value = node.groupId;
  }
};

const handleGroupDragStart = (groupId) => {
  externalDragGroupId.value = groupId;
};

const handleGroupDragEnd = () => {
  externalDragGroupId.value = null;
};

const handleNodeDragEnd = () => {
  externalDragGroupId.value = null;
};

const calculateHoverOffsets = (activeGroupId) => {
  hoverOffsets.value = computeCollisionOffsets(nodes.value, activeGroupId);
};

const handleGroupHover = (groupId) => {
  if (readOnly.value) return;

  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value);
    hoverTimeout.value = null;
  }

  if (hoveredGroupId.value !== groupId) {
    hoveredGroupId.value = groupId;
    calculateHoverOffsets(groupId);
  }
};

const handleGroupLeave = () => {
  if (hoverTimeout.value) clearTimeout(hoverTimeout.value);
  hoverTimeout.value = setTimeout(() => {
    hoveredGroupId.value = null;
    hoverOffsets.value = {};
  }, 150);
};

const handleNodeHover = (node) => {
  if (node.groupId) {
    handleGroupHover(node.groupId);
  }
};

const handleNodeLeave = (node) => {
  if (node.groupId) {
    handleGroupLeave();
  }
};

const handleMouseDown = (e) => {
  if (showTaskMenu.value) {
    closeTaskMenu();
  }

  activeOverviewNodeId.value = null;

  handleMouseDownNav(e);
};

// Lifecycle
onMounted(() => {
  setRegisteredCeleryTasks();

  resizeObserver.value = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      containerWidth.value = width;
      containerHeight.value = height;

      const isDefaultState =
        nodes.value.length === 0 ||
        (nodes.value.length === 1 && nodes.value[0].id === "node-1");

      if (!isDefaultState && !hasInitialZoom.value) {
        nextTick(() => {
          zoomToFit();
        });
      }
    }
  });
  if (container.value) {
    resizeObserver.value.observe(container.value.$el || container.value);
  } else {
    // container ref is on a div, typically available on mount if template compiled
    const el = document.querySelector(".canvas-container");
    if (el) resizeObserver.value.observe(el);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  }
});

// Watchers
watch(
  hoverOffsets,
  () => {
    updateContentHeight();
  },
  { deep: true }
);

watch(scale, () => {
  updateContentHeight();
});

watch(panY, () => {
  updateContentHeight();
});

watch(
  nodes,
  (newNodes) => {
    const isDefaultState =
      newNodes.length === 0 ||
      (newNodes.length === 1 && newNodes[0].id === "node-1");

    nextTick(() => {
      updateContentHeight();
    });

    if (isDefaultState) {
      setTimeout(() => {
        zoomToFit();
      }, 50);
      hasInitialZoom.value = false;
    }

    if (
      !hasInitialZoom.value &&
      containerWidth.value > 0 &&
      containerHeight.value > 0
    ) {
      setTimeout(() => {
        zoomToFit();
      }, 50);
    } else if (isDefaultState) {
      setTimeout(() => {
        zoomToFit();
      }, 50);
    }
  },
  { deep: true }
);

watch(containerWidth, (newWidth) => {
  if (newWidth > 0 && !hasInitialZoom.value && nodes.value.length > 0) {
    zoomToFit();
  }
});

watch(containerHeight, (newHeight) => {
  if (newHeight > 0 && !hasInitialZoom.value && nodes.value.length > 0) {
    zoomToFit();
  }
});

watch(
  () => activeWorkflow.value?.display_name,
  (newName, oldName) => {
    if (
      oldName === "Untitled workflow" &&
      newName !== oldName &&
      newName !== "Generating workflow name..."
    ) {
      if (props.folder.display_name === "Untitled workflow") {
        emit("workflow-renamed", newName);
      }
    }
  }
);

defineExpose({
  zoomToFit,
});
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.canvas-container.light-theme {
  --accent-color: rgb(122, 128, 136);
  --accent-rgb: 122, 128, 136;
  --accent-glow: transparent;
}

.canvas-container.dark-theme {
  --accent-color: rgb(87, 189, 232);
  --accent-rgb: 87, 189, 232;
  --accent-glow: transparent;
}

.canvas-container.space-pressed {
  cursor: grab;
}

.canvas-container.panning {
  cursor: grabbing;
}

.viewport {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
  will-change: transform;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
