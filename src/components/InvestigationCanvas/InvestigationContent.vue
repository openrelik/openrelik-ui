<!--
Copyright 2025-2026 Google LLC

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
  <div class="investigation-artifacts-pane fill-height d-flex flex-column">
    <!-- Custom Tab Bar -->
    <div
      class="custom-tab-bar d-flex align-center"
      :class="{ 'light-theme-bar': isLightTheme }"
    >
      <div
        class="custom-tab px-4 py-3 text-body-2"
        :class="{
          'active-tab': tab === 'plan',
          'light-theme-active-tab': isLightTheme && tab === 'plan',
          'cursor-pointer': true,
        }"
        @click="tab = 'plan'"
      >
        Investigation Plan
      </div>
      <div
        class="custom-tab px-4 py-3 text-body-2"
        :class="{
          'active-tab': tab === 'tasks',
          'light-theme-active-tab': isLightTheme && tab === 'tasks',
          'cursor-pointer':
            (hasContextOrPlan || formSubmitted) && taskCount > 0,
          'disabled-tab':
            (!hasContextOrPlan && !formSubmitted) || taskCount === 0,
        }"
        @click="
          (hasContextOrPlan || formSubmitted) &&
            taskCount > 0 &&
            (tab = 'tasks')
        "
      >
        Tasks{{ taskCount > 0 ? ` (${taskCount})` : "" }}
      </div>
      <div
        class="custom-tab px-4 py-3 text-body-2"
        :class="{
          'active-tab': tab === 'graph',
          'light-theme-active-tab': isLightTheme && tab === 'graph',
          'cursor-pointer': (hasContextOrPlan || formSubmitted) && hasGraph,
          'disabled-tab': (!hasContextOrPlan && !formSubmitted) || !hasGraph,
        }"
        @click="
          (hasContextOrPlan || formSubmitted) && hasGraph && (tab = 'graph')
        "
      >
        Graph
      </div>
      <!-- Spacer to fill the rest of the bar -->
      <div class="flex-grow-1"></div>
    </div>

    <!-- Content Area -->
    <div class="flex-grow-1 overflow-y-auto scrollable-content">
      <div
        v-if="investigationStore.sessionIsLoading"
        class="fill-height d-flex align-center justify-center"
      >
        <v-progress-circular
          indeterminate
          color="primary"
        ></v-progress-circular>
      </div>

      <div v-else-if="!hasContextOrPlan && !formSubmitted" class="fill-height">
        <InvestigationForm
          :loading="investigationStore.isLoading"
          @submit="handleFormSubmit"
        />
      </div>

      <template v-else>
        <div v-if="tab === 'plan'" class="fill-height position-relative">
          <div class="position-absolute top-0 right-0 ma-4 d-flex align-center">
            <template v-if="investigationStore.pendingApproval">
              <v-btn
                prepend-icon="mdi-pencil"
                variant="flat"
                size="small"
                text="Review"
                class="text-none mr-2"
                @click="handleReject()"
              ></v-btn>
              <v-btn
                prepend-icon="mdi-check"
                color="info"
                variant="flat"
                size="small"
                text="Approve"
                class="text-none mr-4"
                @click="handleApprove()"
              ></v-btn>
            </template>

            <v-chip
              v-if="sessionData?.status"
              variant="outlined"
              size="x-small"
              :color="planStatusColor"
              class="font-weight-medium"
            >
              {{ sessionData.status }}
            </v-chip>
          </div>

          <div
            v-if="!renderedPlan"
            class="pa-4 d-flex flex-column align-start fill-height"
          >
            <div class="mb-4 font-weight-regular">Plan is being drafted...</div>
            <v-skeleton-loader
              type="article, paragraph"
              width="100%"
            ></v-skeleton-loader>
          </div>

          <div v-else class="px-4 pb-4 markdown-body">
            <div v-html="renderedPlan"></div>
          </div>
        </div>

        <div v-show="tab === 'tasks'" class="fill-height">
          <InvestigationTaskList />
        </div>

        <div v-show="tab === 'graph'" class="fill-height">
          <InvestigationGraph />
        </div>
      </template>
    </div>
    <!-- Review Reason Dialog -->
    <v-dialog v-model="showReviewDialog" max-width="500">
      <v-card>
        <v-card-title>Review Feedback</v-card-title>
        <div class="pa-4">
          <v-textarea
            v-model="reviewReason"
            label="Feedback on the current plan"
            rows="3"
            auto-grow
            autofocus
            variant="outlined"
          ></v-textarea>
          <v-btn
            color="primary"
            variant="text"
            class="text-none"
            @click="submitReview()"
            :disabled="!reviewReason.trim()"
          >
            Submit review
          </v-btn>
          <v-btn
            variant="text"
            class="text-none"
            @click="showReviewDialog = false"
          >
            Cancel
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, inject } from "vue";
import { useThemeInfo } from "@/composables/useThemeInfo";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { useInvestigationStore } from "@/stores/investigation";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import InvestigationTaskList from "./InvestigationTaskList.vue";
import InvestigationGraph from "./InvestigationGraph.vue";
import InvestigationForm from "./InvestigationForm.vue";

const investigationStore = useInvestigationStore();
const { sessionData } = storeToRefs(investigationStore);
const route = useRoute();

const { isLightTheme } = useThemeInfo();
const { isFullscreen } = inject("agent-fullscreen", {
  isFullscreen: ref(false),
});
const tab = ref("plan");
const formSubmitted = ref(false);
const showReviewDialog = ref(false);
const reviewReason = ref("");

const setTab = (newTab) => {
  if (
    (hasContextOrPlan.value || formSubmitted.value) &&
    (newTab === "plan" ||
      (newTab === "tasks" && taskCount.value > 0) ||
      (newTab === "graph" && hasGraph.value))
  ) {
    tab.value = newTab;
  } else if (newTab === "plan") {
    // Always allow switching to plan key if it acts as default or is always enabled
    tab.value = newTab;
  }
};

defineExpose({
  setTab,
});

const hasContextOrPlan = computed(() => {
  return sessionData.value?.context || sessionData.value?.plan;
});

const hasGraph = computed(() => {
  const graph = investigationStore.graph;
  return graph && graph.nodes && graph.nodes.size > 0;
});

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

const planStatusColor = computed(() => {
  const status = sessionData.value?.status;
  if (status === "DRAFT") return "warning";
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "error";
  return "secondary";
});

const taskCount = computed(() => {
  return investigationStore.taskList?.length || 0;
});

const handleFormSubmit = async (formData) => {
  formSubmitted.value = true;
  if (route.params.folderId) {
    if (!investigationStore.sessionId) {
      await investigationStore.createSession(
        route.params.folderId,
        formData.context
      );
    }
    await investigationStore.runAgent(
      route.params.folderId,
      "Please create an investigation plan based on the provided context."
    );
  }
};

const handleApprove = async () => {
  await investigationStore.approveAction(route.params.folderId);
};

const handleReject = async () => {
  showReviewDialog.value = true;
};

const submitReview = async () => {
  await investigationStore.rejectAction(
    route.params.folderId,
    reviewReason.value
  );
  showReviewDialog.value = false;
  reviewReason.value = "";
};
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

.disabled-tab {
  opacity: 0.3 !important;
  cursor: not-allowed !important;
  pointer-events: none;
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
