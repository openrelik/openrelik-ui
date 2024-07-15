<template>
  <v-menu activator="parent">
    <v-list two-line>
      <v-list-item
        v-for="celery_task in registeredCeleryTasks"
        @click="addTask(celery_task)"
        prepend-icon="mdi-plus"
      >
        <v-list-item-title> {{ celery_task.display_name }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ celery_task.description }}
        </v-list-item-subtitle>
      </v-list-item>
      <v-divider class="mt-3"></v-divider>
      <v-list-item @click="removeTask" prepend-icon="mdi-trash-can-outline"
        >Remove task</v-list-item
      >
    </v-list>
  </v-menu>
</template>

<script>
import { useAppStore } from "@/stores/app";

export default {
  name: "WorkflowTaskDropdown",
  data() {
    return {
      appStore: useAppStore(),
    };
  },
  computed: {
    registeredCeleryTasks() {
      return this.appStore.registeredCeleryTasks;
    },
  },
  methods: {
    addTask(celery_task) {
      celery_task.type = "task";
      this.$emit("add-task", celery_task);
    },
    removeTask() {
      this.$emit("remove-task");
    },
  },
};
</script>
