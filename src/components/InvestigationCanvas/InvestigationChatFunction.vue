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
  <div>
    <div class="d-flex align-center flex-wrap">
      <small>
        <v-icon class="mr-2 mt-n1" size="small" color="grey">
          mdi-tools
        </v-icon>
        <strong>{{ author }}</strong> is <strong>using tool</strong>
        {{ name }}
      </small>
      <div
        class="d-flex align-center cursor-pointer text-caption text-medium-emphasis ml-2"
        @click="isExpanded = !isExpanded"
        role="button"
        :aria-expanded="isExpanded"
      >
        <v-icon
          :icon="isExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"
          size="small"
          class="mr-1"
        />
        <span>Args</span>
      </div>
    </div>

    <v-expand-transition>
      <div v-if="isExpanded">
        <v-sheet
          border
          rounded="lg"
          color="transparent"
          class="pa-3 mt-2 text-caption text-medium-emphasis"
          style="
            max-height: 250px;
            overflow-y: auto;
            white-space: pre-wrap;
            font-family: monospace;
          "
          >{{ args }}</v-sheet
        >
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  args: {
    type: [String, Object],
    required: true,
  },
  author: {
    type: String,
    default: "Agent",
  },
});

const isExpanded = ref(false);
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
