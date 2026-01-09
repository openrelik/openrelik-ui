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
  <div class="mb-3">
    <div
      class="d-flex align-center cursor-pointer text-caption text-medium-emphasis"
      @click="isExpanded = !isExpanded"
      role="button"
      :aria-expanded="isExpanded"
    >
      <v-icon
        :icon="isExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"
        size="small"
        class="mr-1"
      />
      <span>Thought process</span>
    </div>

    <v-expand-transition>
      <div v-if="isExpanded">
        <v-sheet
          border
          rounded="lg"
          color="transparent"
          class="markdown-body pa-3 mt-2 text-caption text-medium-emphasis"
          style="max-height: 250px; overflow-y: auto"
          v-html="toHtml(text)"
        ></v-sheet>
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup>
import { ref } from "vue";
import DOMPurify from "dompurify";
import { marked } from "marked";

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
});

const isExpanded = ref(false);

const toHtml = (markdown) => {
  return DOMPurify.sanitize(marked(markdown, { FORBID_TAGS: ["hr"] }));
};
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
