<!--
Copyright 2026 Google LLC

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
  <v-card-text class="pt-0">
    <v-alert closable>
      AI can make mistakes so always double-check the responses.</v-alert
    >
  </v-card-text>
  <v-card-text
    style="
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column-reverse;
    "
  >
    <div v-for="message in chatMessages.slice().reverse()" :key="message">
      <v-sheet
        color="info"
        class="pa-3 ml-auto mr-3"
        rounded="lg"
        style="max-width: 80%; width: fit-content"
        v-if="message.role === 'user'"
      >
        {{ message.content }}
      </v-sheet>
      <v-sheet
        v-else
        color="transparent"
        style="font-size: 1em"
        class="markdown-body pa-2"
        v-html="toHtml(message.content)"
      ></v-sheet>
      <br />
    </div>
  </v-card-text>
  <v-spacer></v-spacer>
  <div v-if="loading" class="jumping-dots ml-6 mb-3">
    <span class="dot-1"></span>
    <span class="dot-2"></span>
    <span class="dot-3"></span>
  </div>
  <v-divider></v-divider>
  <v-card-actions class="mb-n3">
    <v-textarea
      v-model="chatPrompt"
      variant="solo"
      bg-color="transparent"
      placeholder="Ask me anything about this file.."
      rows="1"
      flat
      auto-grow
      autofocus
      @keydown.enter.exact.prevent="sendMessage()"
    ></v-textarea>
  </v-card-actions>
</template>

<script>
import RestApiClient from "@/RestApiClient";
import DOMPurify from "dompurify";
import { marked } from "marked";

export default {
  props: { file: { type: Object, required: true } },
  data() {
    return {
      loading: false,
      chatPrompt: "",
      chatMessages: [],
      sseSubscription: null,
    };
  },
  computed: {},
  methods: {
    toHtml(markdown) {
      if (!markdown) return "";
      return DOMPurify.sanitize(marked(markdown, { FORBID_TAGS: ["hr"] }));
    },
    sendMessage() {
      // Prevent sending empty messages
      if (this.chatPrompt === "") {
        return;
      }

      this.loading = true;
      const prompt = this.chatPrompt;
      this.chatPrompt = "";

      this.chatMessages.push({ role: "user", content: prompt });

      const assistantMessageIndex =
        this.chatMessages.push({
          role: "assistant",
          content: "",
        }) - 1;

      if (this.sseSubscription) {
        this.sseSubscription.unsubscribe();
      }

      this.sseSubscription = RestApiClient.sse(`files/${this.file.id}/chat`, {
        prompt: prompt,
      }).subscribe({
        next: (data) => {
          this.loading = false;
          // Every chunk from backend corresponds to a line
          if (this.chatMessages[assistantMessageIndex].content !== "") {
            this.chatMessages[assistantMessageIndex].content += "\n";
          }
          this.chatMessages[assistantMessageIndex].content += data;
        },
        error: (error) => {
          console.error("SSE Error:", error);
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
    },
  },
  mounted() {
    this.chatMessages.push({
      role: "assistant",
      content: "Loading chat history...",
    });
    RestApiClient.getFileChat(this.file.id).then((response) => {
      this.chatMessages = response.history.map((message) => ({
        role: message.role,
        content: message.content,
      }));
    });
  },
  unmounted() {
    // Close the SSE connection when the component is destroyed
    if (this.sseSubscription) {
      this.sseSubscription.unsubscribe();
    }
  },
};
</script>

<style scoped>
.jumping-dots span {
  position: relative;
  margin-left: auto;
  margin-right: auto;
  animation: jump 1s infinite;
  display: inline-block;
}

.jumping-dots .dot-1 {
  background-color: rgb(var(--v-theme-primary));
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 3px;
  animation-delay: 200ms;
}

.jumping-dots .dot-2 {
  background-color: rgb(var(--v-theme-primary));
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 3px;
  animation-delay: 400ms;
}

.jumping-dots .dot-3 {
  background-color: rgb(var(--v-theme-primary));
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 3px;
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
</style>
