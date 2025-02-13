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
  <v-card variant="outlined" class="mt-4 custom-border-color">
    <v-toolbar color="transparent" density="compact">
      <v-toolbar-title style="font-size: 18px">
        <v-icon size="small" class="mr-2">mdi-shimmer</v-icon>
        AI summary
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <span v-if="fileSummary.status_short === 'complete'" class="mr-4">
        <small>
          Generated with
          <strong>{{ fileSummary.llm_model_name }}</strong> via
          <strong>{{ fileSummary.llm_model_provider }}</strong> in
          {{ fileSummary.runtime }}s
        </small>
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
