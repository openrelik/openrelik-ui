<!--
Copyright 2025 Google LLC

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
  <v-card-text
    style="
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column-reverse;
    "
  >
    <!-- Loading indicator at the "bottom" (which appears at top due to column-reverse) -->
    <div v-if="loading" class="jumping-dots">
      <span class="dot-1"></span>
      <span class="dot-2"></span>
      <span class="dot-3"></span>
    </div>

    <div v-for="message in agentMessages.slice().reverse()" :key="message">
      <div v-if="message.content && message.content.parts">
        <div v-for="(part, index) in message.content.parts" :key="index">
          <div v-if="part.functionCall">
            <div class="mb-4">
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
            v-else-if="part.functionResponse && message.actions.transferToAgent"
          >
            <div class="mb-4">
              <small>
                <v-icon class="mr-2" size="small" color="grey">
                  mdi-account-switch
                </v-icon>
                <strong>{{ message.author }}</strong> delegated to
                <strong>{{ message.actions.transferToAgent }}</strong>
              </small>
            </div>
          </div>
          <div v-else-if="part.text">
            <v-alert class="mb-4">
              <v-icon class="mr-2 mt-n1" size="small" color="grey">
                mdi-robot
              </v-icon>
              <strong>{{ message.author }}</strong>
              <v-sheet
                style="font-size: 0.9em"
                class="markdown-body pa-2"
                v-html="toHtml(part.text)"
              ></v-sheet>
            </v-alert>
          </div>
        </div>
      </div>
      <div v-else-if="message.type === 'complete'">
        <div class="mb-4">
          <small>
            <v-icon class="mr-2 mt-n1" size="small" color="success">
              mdi-check-circle
            </v-icon>
            <strong>{{ message.message }}</strong>
          </small>
        </div>
      </div>
      <div v-else-if="message.error">
        <div class="mb-4">
          <small>
            <v-icon class="mr-2 mt-n1" size="small" color="error">
              mdi-alert-circle
            </v-icon>
            <strong>{{ message.error }}</strong>
          </small>
        </div>
      </div>
    </div>
  </v-card-text>
</template>

<script>
import RestApiClient from "@/RestApiClient";

import DOMPurify from "dompurify";
import { marked } from "marked";

export default {
  props: {
    folderId: {
      type: String,
      required: true,
    },
    prompt: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      agentMessages: [],
      loading: false,
    };
  },
  computed: {},
  methods: {
    toHtml(markdown) {
      return DOMPurify.sanitize(
        marked(markdown, { FORBID_TAGS: ["hr", "img", "a"] })
      );
    },
    runAgent() {
      const requestBody = {
        question_prompt: this.prompt,
        agent_name: "dfir_multi_agent",
      };
      this.agentMessages = [];
      this.loading = true;
      RestApiClient.sse(
        "folders/" + this.folderId + "/investigations/questions/run",
        requestBody
      ).subscribe({
        next: (data) => {
          this.loading = true;
          this.agentMessages.push(JSON.parse(data));
        },
        error: (err) => console.error(err),
        complete: () => {
          this.loading = false;
          console.log("done");
        },
      });
    },
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
  background-color: #acacac;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 3px;
  animation-delay: 200ms;
}

.jumping-dots .dot-2 {
  background-color: #acacac;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 3px;
  animation-delay: 400ms;
}

.jumping-dots .dot-3 {
  background-color: #acacac;
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
