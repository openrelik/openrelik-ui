<template>
  <div class="investigation-chat-pane fill-height d-flex flex-column">
    <div
      class="chat-pane-toolbar d-flex align-center justify-space-between"
      :class="{ 'light-theme-bar': isLightTheme }"
    >
      <div class="text-body-2 font-weight-bold py-3 px-4">
        <v-icon icon="mdi-console-line" class="mr-2" size="small" />
        {{ investigationStore.sessionId }}
      </div>
      <div class="d-flex align-center">
        <v-btn
          v-if="isFullscreen"
          icon="mdi-fullscreen-exit"
          variant="text"
          density="compact"
          class="mr-2"
          @click="toggleFullscreen"
        ></v-btn>
      </div>
    </div>

    <div
      class="flex-grow-1 overflow-y-auto d-flex flex-column-reverse pa-4 scrollable-content"
      style="height: 100%"
    >
      <div v-for="(message, index) in reversedChatMessages" :key="index">
        <!-- User Message -->
        <v-sheet
          color="info"
          class="pa-3 ml-auto mr-3"
          rounded="lg"
          style="max-width: 80%; width: fit-content"
          v-if="message.role === 'user'"
        >
          {{ message.content }}
        </v-sheet>

        <!-- Agent Message (Complex Structure) -->
        <div v-else>
          <div v-if="message.content && message.content.parts">
            <template
              v-for="(part, pIndex) in message.content.parts"
              :key="pIndex"
            >
              <div v-if="part.functionCall">
                <div class="mb-1">
                  <small>
                    <v-icon class="mr-2 mt-n1" size="small" color="grey">
                      mdi-tools
                    </v-icon>
                    <strong>{{ message.author }}</strong> is
                    <strong>using tool</strong>
                    {{ part.functionCall.name }}
                    <strong>with args</strong>
                    {{ part.functionCall.args }}
                  </small>
                </div>
              </div>
              <div
                v-if="part.functionResponse && message.actions.transferToAgent"
              >
                <div class="mb-1">
                  <small>
                    <v-icon class="mr-2" size="small" color="grey">
                      mdi-account-switch
                    </v-icon>
                    <strong>{{ message.author }}</strong> delegated to
                    <strong>{{ message.actions.transferToAgent }}</strong>
                  </small>
                </div>
              </div>
              <div v-if="part.text && part.text.trim().length > 0">
                <v-sheet
                  color="transparent"
                  style="font-size: 0.9em"
                  class="markdown-body pa-2"
                  v-html="toHtml(part.text)"
                ></v-sheet>
              </div>
            </template>
          </div>
          <div v-else-if="message.type === 'complete'">
            <div class="mb-1">
              <small>
                <v-icon class="mr-2 mt-n1" size="small" color="success">
                  mdi-check-circle
                </v-icon>
                <strong>{{ message.message }}</strong>
              </small>
            </div>
          </div>
          <div v-else-if="message.error">
            <div class="mb-1">
              <small>
                <v-icon class="mr-2 mt-n1" size="small" color="error">
                  mdi-alert-circle
                </v-icon>
                <strong>{{ message.error }}</strong>
              </small>
            </div>
          </div>
          <!-- Fallback for simple assistant messages if any -->
          <v-sheet
            v-else-if="message.content && typeof message.content === 'string'"
            color="transparent"
            style="font-size: 0.9em"
            class="markdown-body pa-2"
            v-html="toHtml(message.content)"
          ></v-sheet>
        </div>
        <br />
      </div>
    </div>

    <v-spacer></v-spacer>

    <div class="pa-4 pt-2">
      <!-- Pending Approval Action Row -->
      <transition name="slide-up-only">
        <div
          v-if="investigationStore.pendingApproval"
          class="d-flex align-center justify-end mb-2 pr-1"
        >
          <div class="mr-4 text-caption text-medium-emphasis">
            Review and approve plan to continue
          </div>
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
            class="text-none"
            @click="handleApprove()"
          ></v-btn>
        </div>
      </transition>

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

      <!-- Action Row (Context + Actions) -->
      <transition name="slide-up-only">
        <div
          v-if="showStartButton"
          class="d-flex align-center justify-end mb-2 pr-1"
        >
          <div class="mr-4 text-caption text-medium-emphasis">
            Start by creating an investigation plan
          </div>
          <v-btn
            prepend-icon="mdi-play"
            color="info"
            variant="flat"
            size="small"
            text="Create plan"
            class="text-none"
            :loading="isCreatingSession"
            @click="handleStart()"
          ></v-btn>
        </div>
      </transition>

      <div
        v-if="
          (investigationStore.isLoading || loading) &&
          !investigationStore.pendingApproval
        "
        class="jumping-dots ml-2 mb-2"
      >
        <span class="dot-1"></span>
        <span class="dot-2"></span>
        <span class="dot-3"></span>
      </div>

      <div class="chat-input-container">
        <v-textarea
          v-model="chatPrompt"
          variant="solo"
          bg-color="transparent"
          placeholder="Ask anything..."
          rows="1"
          flat
          auto-grow
          autofocus
          hide-details
          disabled
          @keydown.enter.exact.prevent="sendMessage()"
        ></v-textarea>
        <div class="chat-input-actions d-flex justify-end pa-2">
          <v-btn
            icon="mdi-arrow-right"
            variant="flat"
            size="x-small"
            color="info"
            class="send-btn"
            :disabled="!chatPrompt.trim()"
            @click="sendMessage()"
          ></v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed } from "vue";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { useInvestigationStore } from "@/stores/investigation";
import { useThemeInfo } from "@/composables/useThemeInfo";
import { useRoute } from "vue-router";

const investigationStore = useInvestigationStore();
const { isLightTheme } = useThemeInfo();
const route = useRoute();
// Default to empty objects if not provided (safe fallback)
const { isFullscreen, toggleFullscreen } = inject("agent-fullscreen", {
  isFullscreen: ref(false),
  toggleFullscreen: () => {},
});

const chatPrompt = ref("");
const loading = ref(false);
const isCreatingSession = ref(false);

const isValidMessage = (m) => {
  if (!m) return false;
  if (m.role === "user") return true;
  if (m.error) return true;
  if (m.type === "complete") return true;

  if (m.content && m.content.parts && m.content.parts.length > 0) {
    return m.content.parts.some((p) => {
      // 1. Tool Use
      if (p.functionCall) return true;

      // 2. Tool Response (ONLY if delegation occurs)
      // We filter out internal function responses that don't result in a handoff
      if (p.functionResponse && m.actions?.transferToAgent) return true;

      // 3. Text content (non-empty)
      if (p.text && p.text.trim().length > 0) return true;

      return false;
    });
  }

  // Fallback for string content
  if (typeof m.content === "string" && m.content.trim().length > 0) return true;

  return false;
};

const reversedChatMessages = computed(() => {
  return [...investigationStore.chatMessages].filter(isValidMessage).reverse();
});

const isPlanEmpty = computed(() => {
  return !investigationStore.sessionData?.plan;
});

const showStartButton = computed(() => {
  if (investigationStore.isLoading) return false;

  const noSession = !investigationStore.sessionId;
  const sessionButNoPlan =
    investigationStore.sessionId &&
    isPlanEmpty.value &&
    investigationStore.chatMessages.length === 0;

  return noSession || sessionButNoPlan;
});

const toHtml = (markdown) => {
  return DOMPurify.sanitize(marked(markdown, { FORBID_TAGS: ["hr"] }));
};

const handleStart = async () => {
  if (!investigationStore.sessionId) {
    if (route.params.folderId) {
      isCreatingSession.value = true;
      try {
        await investigationStore.createSession(route.params.folderId);
        // Also run agent to create the plan as expected
        await investigationStore.runAgent(
          route.params.folderId,
          "Create the investigative plan."
        );
      } finally {
        isCreatingSession.value = false;
      }
    }
  } else {
    investigationStore.runAgent(
      route.params.folderId,
      "Continue the investigation."
    );
  }
};

const showReviewDialog = ref(false);
const reviewReason = ref("");

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

const sendMessage = async () => {
  if (!chatPrompt.value.trim()) return;

  // existing logic to add user message to chat UI could go here,
  // but user said "Ignore the user message for now"
  // so we will just trigger the agent.

  await investigationStore.runAgent(route.params.folderId, chatPrompt.value);
  chatPrompt.value = "";
};
</script>

<style scoped>
.investigation-chat-pane {
  background-color: rgb(var(--v-theme-background));
  height: 100%;
}

.chat-pane-toolbar {
  background-color: transparent;
  border-bottom: 1px solid rgb(var(--v-theme-custom-border-color));
  border-top: 1px solid rgb(var(--v-theme-custom-border-color));
}

.light-theme-bar {
  background-color: transparent !important;
}

.jumping-dots span {
  position: relative;
  margin-left: auto;
  margin-right: auto;
  animation: jump 1s infinite;
  display: inline-block;
}

.jumping-dots .dot-1,
.jumping-dots .dot-2,
.jumping-dots .dot-3 {
  background-color: rgb(var(--v-theme-primary));
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 3px;
}

.jumping-dots .dot-1 {
  animation-delay: 200ms;
}
.jumping-dots .dot-2 {
  animation-delay: 400ms;
}
.jumping-dots .dot-3 {
  animation-delay: 600ms;
}

@keyframes jump {
  0% {
    bottom: 0px;
  }
  20% {
    bottom: 5px;
  }
  40% {
    bottom: 0px;
  }
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

.investigation-chat-pane:hover .scrollable-content::-webkit-scrollbar-thumb {
  background-color: rgba(var(--v-theme-on-surface), 0.2);
}

.scrollable-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.3);
}

.chat-input-container {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 12px;
  background-color: rgba(var(--v-theme-on-surface), 0.02);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.chat-input-container:focus-within {
  border-color: rgba(var(--v-theme-on-surface), 0.2);
}

.slide-up-only-enter-active {
  transition: all 0.3s ease-out;
}

.slide-up-only-leave-active {
  transition: none;
}

.slide-up-only-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-up-only-enter-to {
  transform: translateY(0);
  opacity: 1;
}

.send-btn {
  border-radius: 8px;
}

.send-btn:disabled {
  background-color: rgba(var(--v-theme-on-surface), 0.1) !important;
  color: rgba(var(--v-theme-on-surface), 0.3) !important;
}
</style>
