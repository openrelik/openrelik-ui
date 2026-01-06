<template>
  <div class="d-flex justify-left align-center">
    <v-card width="600" class="pa-4 bg-transparent" flat>
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
