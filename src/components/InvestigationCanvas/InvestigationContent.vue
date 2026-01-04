<template>
  <div class="investigation-artifacts-pane fill-height d-flex flex-column">
    <!-- Custom Tab Bar -->
    <div
      class="custom-tab-bar d-flex align-center"
      :class="{ 'light-theme-bar': isLightTheme }"
    >
      <div
        class="custom-tab px-4 py-3 text-body-2 cursor-pointer"
        :class="{
          'active-tab': tab === 'plan',
          'light-theme-active-tab': isLightTheme && tab === 'plan',
        }"
        @click="tab = 'plan'"
      >
        Investigation Plan
      </div>
      <div
        class="custom-tab px-4 py-3 text-body-2 cursor-pointer"
        :class="{
          'active-tab': tab === 'tasks',
          'light-theme-active-tab': isLightTheme && tab === 'tasks',
        }"
        @click="tab = 'tasks'"
      >
        Tasks ({{ taskCount || 0 }})
      </div>
      <div
        class="custom-tab px-4 py-3 text-body-2 cursor-pointer"
        :class="{
          'active-tab': tab === 'graph',
          'light-theme-active-tab': isLightTheme && tab === 'graph',
        }"
        @click="tab = 'graph'"
      >
        Graph
      </div>
      <!-- Spacer to fill the rest of the bar -->
      <div class="flex-grow-1"></div>
    </div>

    <!-- Content Area -->
    <div class="flex-grow-1 overflow-y-auto scrollable-content">
      <div v-if="tab === 'plan'" class="fill-height">
        <div class="px-4 pb-4 markdown-body">
          <div v-html="renderedPlan"></div>
        </div>
      </div>

      <div v-show="tab === 'tasks'" class="fill-height">
        <InvestigationTaskList />
      </div>

      <div v-show="tab === 'graph'" class="fill-height">
        <InvestigationGraph />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from "vue";
import { useThemeInfo } from "@/composables/useThemeInfo";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { useInvestigationStore } from "@/stores/investigation";
import { storeToRefs } from "pinia";
import InvestigationTaskList from "./InvestigationTaskList.vue";
import InvestigationGraph from "./InvestigationGraph.vue";

const investigationStore = useInvestigationStore();
const { sessionData } = storeToRefs(investigationStore);

const { isLightTheme } = useThemeInfo();
const { isFullscreen } = inject("agent-fullscreen", {
  isFullscreen: ref(false),
});
const tab = ref("plan");
const isGeneratingPlan = ref(false);

const renderedPlan = computed(() => {
  let plan = sessionData.value?.plan || "";
  if (!plan) return "";
  if (plan.trim().startsWith("```")) {
    plan = plan
      .replace(/^```(?:markdown)?\s*\n/i, "")
      .replace(/\n\s*```\s*$/i, "");
  }
  return DOMPurify.sanitize(marked(plan));
});

const taskCount = computed(() => {
  return investigationStore.taskList?.length || 0;
});
</script>

<style scoped>
.investigation-artifacts-pane {
  background-color: rgb(var(--v-theme-background));
  height: 100%;
}

.custom-tab-bar {
  background-color: transparent;
  border-bottom: 1px solid rgb(var(--v-theme-custom-border-color));
  border-top: 1px solid rgb(var(--v-theme-custom-border-color));
}

.light-theme-bar {
  background-color: transparent !important;
}

.light-theme-active-tab {
  border-bottom: 1px solid #333 !important;
  color: #333 !important;
}

.custom-tab {
  opacity: 0.6;
  transition: opacity 0.2s, color 0.2s;
  user-select: none;
  border-bottom: 1px solid transparent;
  margin-bottom: -1px;
}

.custom-tab:not(.active-tab):hover {
  opacity: 1;
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
}

.light-theme-bar .custom-tab:not(.active-tab):hover {
  background-color: rgba(0, 0, 0, 0.04) !important;
}

.active-tab {
  background-color: transparent;
  border-bottom: 1px solid rgb(var(--v-theme-primary));
  opacity: 1;
  color: rgb(var(--v-theme-primary));
}

.border-bottom {
  border-bottom: 1px solid rgb(var(--v-theme-custom-border-color));
}

.scrollable-content::-webkit-scrollbar {
  width: 8px;
}

.scrollable-content::-webkit-scrollbar-track {
  background: transparent;
}

.scrollable-content::-webkit-scrollbar-thumb {
  background-color: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 0;
  transition: background-color 0.3s ease;
}

.investigation-artifacts-pane:hover
  .scrollable-content::-webkit-scrollbar-thumb {
  background-color: rgba(var(--v-theme-on-surface), 0.2);
}

.scrollable-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.3);
}
</style>
