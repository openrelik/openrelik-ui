<template>
  <div class="investigation-tree-view fill-height d-flex flex-column">
    <div
      class="tree-header d-flex align-center"
      :class="{ 'light-theme-bar': isLightTheme }"
    >
      <!-- Logo in Fullscreen -->
      <div v-if="isFullscreen" class="pl-4 d-flex align-center">
        <v-img
          src="/logo-light-round.png"
          :width="$vuetify.theme.name === 'dark' ? '20' : '25'"
          :height="$vuetify.theme.name === 'dark' ? '20' : '25'"
          :class="$vuetify.theme.name === 'dark' ? 'mr-1' : 'mr-2'"
        />
      </div>

      <div class="text-body-2 font-weight-bold py-3 px-3 d-flex align-center">
        {{ investigationData.label }}
      </div>
    </div>

    <div class="tree-content flex-grow-1 overflow-y-auto pa-2">
      <template v-if="investigationData">
        <!-- Root Meta Files -->

        <InvestigationTreeNode
          :node="{
            type: 'MD_FILE',
            label: 'Investigation Plan',
            id: 'meta-plan',
          }"
          :depth="0"
          :active-id="activeHypothesisId"
          @node-click="$emit('select-node', $event)"
        />

        <InvestigationTreeNode
          :node="{
            type: 'MD_FILE',
            label: 'Final Report',
            id: 'meta-final-report',
            disabled: true,
          }"
          :depth="0"
          :active-id="activeHypothesisId"
          @node-click="$emit('select-node', $event)"
        />

        <v-divider class="my-2 mx-n2" opacity="0.1" />

        <!-- Questions Section Header -->
        <template
          v-if="
            investigationData.questions &&
            investigationData.questions.length > 0
          "
        >
          <div class="questions-header d-flex align-center mb-1">
            <div class="questions-header-text">Questions</div>
          </div>

          <!-- Questions Section -->
          <InvestigationTreeNode
            v-for="question in investigationData.questions"
            :key="question.id"
            :node="question"
            :depth="0"
            :active-id="activeHypothesisId"
            @node-click="$emit('select-node', $event)"
            @add-hypothesis="handleAddHypothesis"
          />
        </template>
      </template>
    </div>

    <!-- Context Menu Placeholder -->
    <v-menu
      v-model="contextMenu.show"
      :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
      absolute
    >
      <v-list density="compact">
        <v-list-item
          prepend-icon="mdi-plus"
          title="Add Hypothesis"
          @click="addHypothesisAction"
        />
      </v-list>
    </v-menu>
  </div>
</template>

<script setup>
import { ref, computed, reactive, inject } from "vue";
import { useThemeInfo } from "@/composables/useThemeInfo";
import { useInvestigationStore } from "@/stores/investigation";
import InvestigationTreeNode from "./InvestigationTreeNode.vue";

const { isLightTheme } = useThemeInfo();
const { isFullscreen } = inject("agent-fullscreen", {
  isFullscreen: ref(false),
});

const props = defineProps({
  activeHypothesisId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["select-node"]);

const investigationStore = useInvestigationStore();
const investigationData = computed(() => {
  const sessionData = investigationStore.sessionData || {};
  const treeRoots = investigationStore.tree || [];

  const questions = treeRoots.filter((node) => node.type === "QUESTION");

  return {
    type: "INVESTIGATION_ROOT",
    id: sessionData.id || "CASE-UUID",
    label: sessionData.label || "Untitled Investigation",
    status: sessionData.status || "IN_PROGRESS",
    final_verdict: sessionData.final_verdict || "PENDING",
    observations: sessionData.observations || [],
    questions: questions,
  };
});

const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  targetNode: null,
});

const handleAddHypothesis = (node) => {
  contextMenu.targetNode = node;
  contextMenu.show = true;
  contextMenu.x = 100;
  contextMenu.y = 100;
};

const addHypothesisAction = () => {
  contextMenu.show = false;
};
</script>

<style scoped>
.investigation-tree-view {
  background-color: rgb(var(--v-theme-background));
  height: 100%;
}

.tree-header {
  background-color: transparent;
  border-bottom: 1px solid rgb(var(--v-theme-custom-border-color));
  border-top: 1px solid rgb(var(--v-theme-custom-border-color));
}

.light-theme-bar {
  background-color: transparent !important;
}

.tree-content {
  scrollbar-width: thin;
}

.questions-header {
  height: 28px;
}

.questions-header-text {
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  padding-left: 8px;
}

.section-header-text {
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  padding-left: 8px;
}

.tree-content::-webkit-scrollbar {
  width: 6px;
}

.tree-content::-webkit-scrollbar-thumb {
  background-color: rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 3px;
}

.tree-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.2);
}
</style>
