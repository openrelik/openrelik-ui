<template>
  <div class="investigation-task-list fill-height">
    <v-data-table
      :headers="headers"
      :items="nodes"
      density="compact"
      class="fill-height task-table"
      fixed-header
      hover
      items-per-page="-1"
      hide-default-footer
      style="background-color: transparent"
    >
      <!-- Task (Main Info) -->
      <template v-slot:item.task="{ item }">
        <div class="d-flex align-center py-1">
          <v-icon
            :icon="getStatusIcon(item.status)"
            :color="getStatusColor(item.status)"
            size="x-small"
            class="mr-2"
          />
          <span class="text-caption font-weight-medium">{{ item.label }}</span>
        </div>
      </template>
    </v-data-table>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useInvestigationStore } from "@/stores/investigation";

const investigationStore = useInvestigationStore();

const headers = [{ title: "Task", key: "task", align: "start" }];

const nodes = computed(() => {
  return investigationStore.taskList || [];
});

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
      return "mdi-circle-outline";
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
.investigation-task-list {
  background-color: rgb(var(--v-theme-background));
}

.task-table :deep(th) {
  font-size: 0.75rem !important;
  white-space: nowrap;
}

.task-table :deep(td) {
  font-size: 0.75rem !important;
}
.task-table :deep(.v-table__wrapper::-webkit-scrollbar) {
  width: 8px;
}

.task-table :deep(.v-table__wrapper::-webkit-scrollbar-track) {
  background: transparent;
}

.task-table :deep(.v-table__wrapper::-webkit-scrollbar-thumb) {
  background-color: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 0;
  transition: background-color 0.3s ease;
}

.task-table :deep(.v-table__wrapper:hover::-webkit-scrollbar-thumb) {
  background-color: rgba(var(--v-theme-on-surface), 0.2);
}

.task-table :deep(.v-table__wrapper::-webkit-scrollbar-thumb:hover) {
  background-color: rgba(var(--v-theme-on-surface), 0.3);
}
</style>
