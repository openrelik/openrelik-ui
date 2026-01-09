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
  <div class="investigation-chat-pane fill-height d-flex flex-column">
    <div
      class="chat-pane-toolbar d-flex align-center justify-space-between"
      :class="{ 'light-theme-bar': isLightTheme }"
    >
      <div class="text-body-2 font-weight-bold py-3 px-4">
        <v-icon icon="mdi-console-line" class="mr-2" size="small" />
      </div>
      <div class="d-flex align-center">
        <!-- Removed Toggle Button -->
        <v-chip
          v-if="
            totalTokens.input > 0 ||
            totalTokens.output > 0 ||
            totalTokens.thinking > 0
          "
          variant="text"
          size="small"
          class="mr-2 text-caption text-medium-emphasis"
        >
          <v-icon start icon="mdi-counter" size="x-small"></v-icon>
          Input: {{ formatTokenCount(totalTokens.input) }} • Output:
          {{ formatTokenCount(totalTokens.output) }} • Thinking:
          {{ formatTokenCount(totalTokens.thinking) }}
        </v-chip>
        <v-chip
          variant="outlined"
          size="x-small"
          :color="investigationStore.runSubscription ? 'success' : 'warning'"
          class="mr-4 font-weight-medium"
        >
          {{ investigationStore.runSubscription ? "Active" : "Idle" }}
        </v-chip>
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
      <div
        v-for="(message, index) in reversedChatMessages"
        :key="index"
        class="mb-4"
      >
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
          <div
            v-if="message.content && message.content.parts"
            class="d-flex flex-column ga-2"
          >
            <template
              v-for="(part, pIndex) in message.content.parts"
              :key="pIndex"
            >
              <!-- Thought Part -->
              <div v-if="part.thought">
                <InvestigationChatThought :text="part.text || part.thought" />
              </div>

              <!-- Other Parts (Tool Use, Tool Response, Text) -->
              <template v-else-if="!part.thought">
                <div v-if="part.functionCall">
                  <InvestigationChatFunction
                    :name="part.functionCall.name"
                    :args="part.functionCall.args"
                    :author="message.author"
                  />
                </div>
                <div
                  v-if="
                    part.functionResponse && message.actions.transferToAgent
                  "
                >
                  <div>
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
            </template>
          </div>
          <div v-else-if="message.error || message.type === 'error'">
            <div class="mb-1">
              <small>
                <v-icon class="mr-2 mt-n1" size="small" color="error">
                  mdi-alert-circle
                </v-icon>
                <strong>{{ message.error || message.message }}</strong>
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

          <!-- Token Count Footer -->
          <div
            v-if="
              message.usageMetadata &&
              (message.usageMetadata.promptTokenCount ||
                message.usageMetadata.candidatesTokenCount ||
                message.usageMetadata.thoughtsTokenCount)
            "
            class="d-flex justify-start mt-1 ml-1"
          >
            <div class="text-caption text-medium-emphasis">
              <v-icon icon="mdi-counter" size="x-small" class="mr-1" />
              Input:
              {{ formatTokenCount(message.usageMetadata.promptTokenCount) }} •
              Output:
              {{
                formatTokenCount(
                  message.usageMetadata.candidatesTokenCount || 0
                )
              }}
              • Thinking:
              {{
                formatTokenCount(message.usageMetadata.thoughtsTokenCount || 0)
              }}
            </div>
          </div>
        </div>
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

      <div
        v-if="
          investigationStore.isLoading && !investigationStore.pendingApproval
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
import InvestigationChatThought from "./InvestigationChatThought.vue";
import InvestigationChatFunction from "./InvestigationChatFunction.vue";

const investigationStore = useInvestigationStore();
const { isLightTheme } = useThemeInfo();
const route = useRoute();
const { isFullscreen, toggleFullscreen } = inject("agent-fullscreen", {
  isFullscreen: ref(false),
  toggleFullscreen: () => {},
});

const chatPrompt = ref("");

const isValidMessage = (m) => {
  if (!m) return false;
  if (m.role === "user") return true;
  if (m.error) return true;
  if (m.type === "complete") return true;
  if (m.type === "error") return true;

  if (m.content && m.content.parts && m.content.parts.length > 0) {
    return m.content.parts.some((p) => {
      // 0. Thought (always valid, handled by component)
      if (p.thought) return true;

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

  if (typeof m.content === "string" && m.content.trim().length > 0) return true;

  return false;
};

const reversedChatMessages = computed(() => {
  return [...investigationStore.chatMessages].filter(isValidMessage).reverse();
});

const totalTokens = computed(() => {
  let input = 0;
  let output = 0;
  let thinking = 0;
  investigationStore.chatMessages.forEach((m) => {
    if (m && m.usageMetadata) {
      input += m.usageMetadata.promptTokenCount || 0;
      output += m.usageMetadata.candidatesTokenCount || 0;
      thinking += m.usageMetadata.thoughtsTokenCount || 0;
    }
  });
  return { input, output, thinking };
});

const formatTokenCount = (count) => {
  if (!count) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count);
};

const toHtml = (markdown) => {
  return DOMPurify.sanitize(marked(markdown, { FORBID_TAGS: ["hr"] }));
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
