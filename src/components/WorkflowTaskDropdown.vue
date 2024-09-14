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
      <template v-if="!isRootNode">
        <v-divider class="mt-3"></v-divider>
        <v-list-item @click="removeTask" prepend-icon="mdi-trash-can-outline"
          >Remove task</v-list-item
        >
      </template>
    </v-list>
  </v-menu>
</template>

<script>
import { useAppStore } from "@/stores/app";

export default {
  name: "WorkflowTaskDropdown",
  props: { isRootNode: Boolean },
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
