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
  <div class="d-flex justify-left align-center">
    <v-card width="900" class="pa-4 bg-transparent" flat>
      <v-card-title class="text-h6 pb-4"
        >Create Investigation Plan</v-card-title
      >
      <v-card-text>
        <p class="mb-6 text-body-2 text-medium-emphasis">
          To start the investigation, we first need to create a plan. Please add
          as much information as possible as context. The system will help you
          draft the plan in the next step.
        </p>
        <v-form @submit.prevent="handleSubmit">
          <v-textarea
            v-model="context"
            label="Context / Alert"
            placeholder="Describe what happened, alert details... etc."
            variant="outlined"
            auto-grow
            autofocus
            rows="10"
          ></v-textarea>
          <div class="d-flex justify-end mt-n2">
            <v-btn
              type="submit"
              class="text-none"
              variant="flat"
              color="info"
              text="Create plan"
              prepend-icon="mdi-play"
              :disabled="!isValid"
              :loading="loading"
            >
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["submit"]);

const context = ref("");

const isValid = computed(() => {
  return context.value.trim().length > 0;
});

const handleSubmit = () => {
  if (!isValid.value) return;

  emit("submit", {
    context: context.value,
  });
};
</script>
