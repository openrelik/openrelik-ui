<!--
Copyright 2024 Google LLC

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
  <v-dialog v-model="showPromptModal" width="90%">
    <v-card width="90%" class="mx-auto pa-4">
      <v-card-title>Prompt</v-card-title>
      <v-card-text>
        {{ fileSummary.llm_model_prompt }}
      </v-card-text>
    </v-card>
  </v-dialog>
  <v-card
    variant="outlined"
    :class="
      $vuetify.theme.name === 'dark'
        ? 'ai-background-dark'
        : 'ai-background-light'
    "
  >
    <v-toolbar color="transparent" density="compact">
      <div class="ml-4" style="font-size: 18px">
        <v-icon size="small" class="mr-2">mdi-shimmer</v-icon>
        AI summary
      </div>
      <small class="ml-3" style="font-size: 0.7em"
        >(AI can make mistakes so always double-check)</small
      >
      <v-spacer></v-spacer>
      <span v-if="fileSummary.status_short === 'complete'" class="mr-4">
        <small>
          Generated with
          <strong>{{ fileSummary.llm_model_name }}</strong> via
          <strong>{{ fileSummary.llm_model_provider }}</strong> in
          {{ fileSummary.runtime }}s
        </small>
        <v-icon
          size="small"
          class="ml-2 text-none"
          title="Show prompt"
          @click="showPromptModal = true"
          >mdi-information-outline</v-icon
        >
      </span>
    </v-toolbar>
    <v-divider></v-divider>
    <v-skeleton-loader
      max-width="500px"
      color="transparent"
      v-if="fileSummary.status_short === 'in_progress'"
      loading
      type="paragraph"
    ></v-skeleton-loader>
    <v-card-text
      v-else
      class="markdown-body"
      v-html="toHtml(fileSummary.summary)"
    ></v-card-text>
  </v-card>
</template>

<script>
import DOMPurify from "dompurify";
import { marked } from "marked";
import RestApiClient from "@/RestApiClient";

export default {
  name: "FileSummary",
  props: {
    initialSummary: Object,
  },
  data() {
    return {
      fileSummary: this.initialSummary,
      polling: null,
      pollingInterval: 3000,
      showPromptModal: false,
    };
  },
  computed: {},
  methods: {
    getFileSummary() {
      RestApiClient.getFileSummary(
        this.fileSummary.file_id,
        this.fileSummary.id
      )
        .then((response) => {
          this.fileSummary = response;
        })
        .then(() => {
          if (this.fileSummary.status_short === "complete") {
            clearInterval(this.polling);
          }
        });
    },
    pollData() {
      this.polling = setInterval(() => {
        this.getFileSummary();
      }, this.pollingInterval);
    },
    toHtml(markdown) {
      return DOMPurify.sanitize(marked(markdown, { FORBID_TAGS: ["hr"] }));
    },
  },
  mounted() {
    if (this.fileSummary.status_short === "in_progress") {
      this.pollData();
    }
  },
  unmounted() {
    clearInterval(this.polling);
  },
};
</script>

<style scoped>
.ai-background-light {
  border: 1px solid transparent !important;
  background-image: linear-gradient(white, white),
    linear-gradient(
      90deg,
      #8ab4f8 0%,
      #81c995 20%,
      #f8c665 40%,
      #ec7764 60%,
      #b39ddb 80%,
      #8ab4f8 100%
    );
  background-origin: border-box;
  background-clip: content-box, border-box;
  background-size: 300% 100%;
  animation: borderBeamIridescent-subtle 15s linear infinite;
}

.ai-background-dark {
  border: 1px solid transparent !important;
  background-image: linear-gradient(#181818, #181818),
    linear-gradient(
      90deg,
      #6d8dc2 0%,
      #578564 20%,
      #a58545 40%,
      #944b40 60%,
      #7b6c97 80%,
      #5f7ba8 100%
    );
  background-origin: border-box;
  background-clip: content-box, border-box;
  background-size: 300% 100%;
  animation: borderBeamIridescent-subtle 15s linear infinite;
}

@keyframes borderBeamIridescent-subtle {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 100% 50%;
  }
}
</style>
