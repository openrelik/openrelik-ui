<template>
  <div class="investigation-tree-node">
    <!-- Section Header for Leads -->
    <div
      v-if="node.type === 'SECTION_HEADER'"
      class="section-header px-2 py-0 mt-2 mb-0"
      :style="{ paddingLeft: `${depth * 10 + 8}px` }"
    >
      {{ node.label }}
    </div>

    <div
      v-else
      class="node-content d-flex align-center py-1 pr-2 cursor-pointer"
      :class="{
        'active-hypothesis': isActive,
        disproven:
          node.status === 'DISPROVEN' || node.status === 'REFUTES_PARENT',
        proven: node.status === 'PROVEN' || node.status === 'SUPPORTS_PARENT',
        failed: node.status === 'FAILED',
        'data-unavailable': node.status === 'DATA_UNAVAILABLE',
        'hypothesis-node': node.type === 'HYPOTHESIS',
        'task-node': node.type === 'TASK',
      }"
      :style="{
        paddingLeft: node.type === 'MD_FILE' ? '8px' : `${depth * 10 + 8}px`,
      }"
      @click="handleNodeClick"
      @contextmenu.prevent="handleContextMenu"
    >
      <!-- Expand/Collapse Toggle -->
      <v-icon
        v-if="hasChildren"
        size="16"
        class="mr-1 toggle-icon"
        :class="{ expanded: isExpanded }"
        @click.stop="isExpanded = !isExpanded"
      >
        mdi-chevron-right
      </v-icon>
      <div
        v-else-if="node.type !== 'MD_FILE' && node.type !== 'QUESTION'"
        class="mr-1"
        style="width: 16px"
      ></div>

      <!-- Icon -->
      <v-icon
        v-if="nodeIcon"
        :icon="nodeIcon"
        :color="nodeIconColor"
        size="16"
        class="mr-2"
      />

      <!-- Label & Status -->
      <div
        class="node-label text-truncate flex-grow-1 d-flex flex-column justify-center"
      >
        <div class="text-truncate main-label">{{ node.label }}</div>
        <div
          v-if="node.approachLabel"
          class="text-caption approach-subtitle text-truncate"
        >
          {{ node.approachLabel }}
        </div>
      </div>

      <!-- Status Indicators -->
      <v-tooltip v-if="node.status" location="bottom">
        <template v-slot:activator="{ props }">
          <v-icon
            v-bind="props"
            v-if="statusIcon"
            :icon="statusIcon"
            :color="statusIconColor"
            size="14"
            class="ml-1"
          />
        </template>
        <span>{{ node.status }}</span>
      </v-tooltip>
    </div>

    <!-- Children -->
    <v-expand-transition>
      <div v-if="isExpanded && hasChildren" class="node-children">
        <InvestigationTreeNode
          v-for="child in nodeChildren"
          :key="child.id || child.label"
          :node="child"
          :depth="node.type === 'SECTION_HEADER' ? depth : depth + 1"
          :active-id="activeId"
          @node-click="$emit('node-click', $event)"
          @add-hypothesis="$emit('add-hypothesis', $event)"
        />
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  depth: {
    type: Number,
    default: 0,
  },
  activeId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["node-click", "add-hypothesis"]);

const isExpanded = ref(false); // Expand more levels by default
const isActive = computed(() => props.node.id === props.activeId);

const nodeChildren = computed(() => {
  // If the node comes from the DAG, the relationships are already in 'children'.

  // Findings (if any) are generally leaf content for Tasks.
  if (props.node.type === "TASK") return props.node.findings || [];

  return props.node.children || [];
});

const hasChildren = computed(
  () => nodeChildren.value && nodeChildren.value.length > 0
);

const nodeIcon = computed(() => {
  switch (props.node.type) {
    case "SECTION":
      return "mdi-folder-outline";
    case "MD_FILE":
      return "mdi-file-document-outline";
    case "OBSERVATION":
      return "mdi-eye-outline";
    case "QUESTION":
      return "mdi-help-circle-outline";
    case "HYPOTHESIS":
      return "mdi-lightbulb-outline";
    case "TASK":
      return "mdi-clipboard-check-outline";
    case "FINDING":
      return "mdi-file-find-outline";
    default:
      return null;
  }
});

const nodeIconColor = computed(() => {
  switch (props.node.type) {
    case "SECTION":
      return "grey";
    case "QUESTION":
      return "primary";
    case "HYPOTHESIS":
      return "amber";
    case "TASK":
      return "info";
    default:
      return "grey-darken-1";
  }
});

const statusIcon = computed(() => {
  switch (props.node.status) {
    case "COMPLETED":
    case "PROVEN":
    case "SUPPORTS_PARENT":
      return "mdi-check-circle";
    case "FAILED":
    case "DISPROVEN":
    case "REFUTES_PARENT":
      return "mdi-close-circle";
    case "IN_PROGRESS":
    case "RUNNING":
      return "mdi-play-circle-outline";
    case "DATA_UNAVAILABLE":
      return "mdi-alert-circle-outline";
    case "PENDING":
      return "mdi-clock-outline";
    default:
      return null;
  }
});

const statusIconColor = computed(() => {
  switch (props.node.status) {
    case "COMPLETED":
    case "PROVEN":
    case "SUPPORTS_PARENT":
      return "success";
    case "FAILED":
    case "DISPROVEN":
    case "REFUTES_PARENT":
      return "error";
    case "IN_PROGRESS":
    case "RUNNING":
      return "info";
    case "DATA_UNAVAILABLE":
      return "warning";
    default:
      return "grey";
  }
});

const handleNodeClick = () => {
  if (
    ["HYPOTHESIS", "TASK", "FINDING", "OBSERVATION", "MD_FILE"].includes(
      props.node.type
    )
  ) {
    emit("node-click", props.node);
  }

  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value;
  }
};

const handleContextMenu = (e) => {
  if (props.node.type === "QUESTION" || props.node.type === "HYPOTHESIS") {
    emit("add-hypothesis", props.node);
  }
};
</script>

<style scoped>
.investigation-tree-node {
  user-select: none;
}

.section-header {
  color: rgba(var(--v-theme-on-surface), 0.4);
  background-color: transparent;
  font-weight: 600;
  font-size: 0.75rem !important;
  text-transform: none;
  letter-spacing: 0.02em;
}

.node-content {
  border-radius: 4px;
  transition: background-color 0.2s;
  font-size: 0.8125rem;
  line-height: 1.25;
  color: rgba(var(--v-theme-on-surface), 0.87);
  min-height: 32px;
  padding: 4px 8px;
}

.node-content:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}

.active-hypothesis {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.hypothesis-node {
  font-weight: 500;
}

.main-label {
  font-weight: 400;
}

.approach-subtitle {
  font-size: 0.7rem !important;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-weight: 400;
  margin-top: -1px;
}

.toggle-icon {
  transition: transform 0.2s ease;
  opacity: 0.7;
}

.toggle-icon:hover {
  opacity: 1;
}

.toggle-icon.expanded {
  transform: rotate(90deg);
}

.node-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.disproven .node-label {
  text-decoration: line-through;
  opacity: 0.5;
}

.failed .node-label {
  color: rgb(var(--v-theme-error));
}

.data-unavailable .node-label {
  color: rgb(var(--v-theme-warning));
  font-style: italic;
}

/* Level 3 nodes styling (Symbols) */
.investigation-tree-node
  .investigation-tree-node
  .investigation-tree-node
  .node-content {
  opacity: 0.95;
}

.investigation-tree-node
  .investigation-tree-node
  .investigation-tree-node
  .node-label {
  font-size: 0.75rem;
}
</style>
