<template>
  <div
    class="investigation-graph-node"
    :class="[node.type.toLowerCase(), { 'is-selected': isSelected }]"
    :style="{
      transform: `translate(${x}px, ${y}px)`,
      width: `${width}px`,
      minHeight: `${height}px`,
      height: 'auto',
    }"
    @click="$emit('click', node)"
  >
    <div
      class="node-header d-flex align-center justify-space-between px-2 py-1"
    >
      <div
        class="d-flex align-center text-caption font-weight-bold text-uppercase text-medium-emphasis"
      >
        <v-icon :icon="getIcon(node.type)" size="x-small" class="mr-1" />
        {{ node.type === "SECTION" ? "LEAD" : node.type }}
      </div>
      <v-icon
        v-if="node.status"
        :icon="getStatusIcon(node.status)"
        :color="getStatusColor(node.status)"
        size="small"
      />
    </div>

    <!-- Collapsed Indicator for Leads & Hypotheses -->
    <div
      v-if="
        (node.type === 'SECTION' || node.type === 'HYPOTHESIS') &&
        node.childCount > 0
      "
      class="position-absolute text-caption text-medium-emphasis font-weight-bold"
      style="right: 8px; bottom: 4px"
    >
      <span v-if="isCollapsed">
        {{ node.childCount }}
        <template v-if="node.type === 'SECTION'">
          {{ node.childCount === 1 ? "Hypothesis" : "Hypotheses" }}
        </template>
        <template v-else>
          {{ node.childCount === 1 ? "Task" : "Tasks" }}
        </template>
        <v-icon icon="mdi-chevron-right" size="small"></v-icon>
      </span>
      <span v-else>
        <!-- Similar text for expanded state if desired, or just count? 
             User template had full text. Keep full text. -->
        {{ node.childCount }}
        <template v-if="node.type === 'SECTION'">
          {{ node.childCount === 1 ? "Hypothesis" : "Hypotheses" }}
        </template>
        <template v-else>
          {{ node.childCount === 1 ? "Task" : "Tasks" }}
        </template>
        <v-icon icon="mdi-chevron-left" size="small"></v-icon>
      </span>
    </div>

    <div class="node-content px-2 py-1 text-body-2">
      {{ node.label }}
    </div>
  </div>
</template>

<script setup>
import { defineProps } from "vue";

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  x: {
    type: Number,
    required: true,
  },
  y: {
    type: Number,
    required: true,
  },
  width: {
    type: Number,
    default: 180,
  },
  height: {
    type: Number,
    default: 80,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
  isCollapsed: {
    type: Boolean,
    default: false,
  },
});

const getIcon = (type) => {
  switch (type) {
    case "QUESTION":
      return "mdi-help-circle-outline";
    case "SECTION": // Lead
      return "mdi-lightbulb-outline";
    case "HYPOTHESIS":
      return "mdi-flask-outline";
    case "TASK":
      return "mdi-checkbox-marked-circle-outline";
    default:
      return "mdi-circle-outline";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
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
      return "";
  }
};

const getStatusColor = (status) => {
  switch (status) {
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
};
</script>

<style scoped>
.investigation-graph-node {
  position: absolute;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s,
    transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  display: flex;
  flex-direction: column;
}

.investigation-graph-node:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-color: rgba(var(--v-theme-on-surface), 0.3);
}

.investigation-graph-node.is-selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.3);
}

/* Type specific styling accents */
.investigation-graph-node.question {
  border-left: 4px solid #9c27b0; /* Purple */
}

.investigation-graph-node.section {
  border-left: 4px solid #ff9800; /* Orange */
}

.investigation-graph-node.hypothesis {
  border-left: 4px solid #2196f3; /* Blue */
}

.investigation-graph-node.task {
  border-left: 4px solid #4caf50; /* Green */
}
</style>
