<template>
  <v-card variant="outlined" class="mt-4 custom-border-color">
    <v-toolbar
      :color="$vuetify.theme.name === 'dark' ? '' : 'grey-lighten-4'"
      density="compact"
    >
      <v-toolbar-title style="font-size: 18px">
        <v-icon size="small" class="mr-2">mdi-shimmer</v-icon>
        Generated summary
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
