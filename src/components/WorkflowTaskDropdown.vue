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
  <v-menu
    activator="parent"
    :close-on-content-click="false"
    location="bottom"
    location-strategy="connected"
    v-model="showMenu"
  >
    <v-card width="800px">
      <v-card-text>
        <v-text-field
          v-model="search"
          variant="outlined"
          label="Search for tasks to run"
          append-inner-icon="mdi-magnify"
          width="100%"
          autofocus
        ></v-text-field>

        <v-data-table
          :items="sortedCeleryTasks"
          :headers="headers"
          :search.sync="search"
          density="comfortable"
          item-key="task_name"
          items-per-page="-1"
          height="300px"
          hide-default-footer
          hide-default-header
          hover
        >
          <template v-slot:item.actions="{ item }">
            <v-btn
              variant="flat"
              size="small"
              @click="addTask(item)"
              class="text-none"
              color="info"
            >
              <v-icon size="small"> mdi-plus </v-icon>
              Add task
            </v-btn>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
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
      headers: [
        { title: "", key: "display_name", sortable: false },
        { title: "", key: "description", sortable: false },
        { title: "", key: "actions", sortable: false, width: "140px" },
      ],
      search: "",
      showMenu: false,
    };
  },
  computed: {
    registeredCeleryTasks() {
      return this.appStore.registeredCeleryTasks;
    },
    sortedCeleryTasks() {
      // Create a copy of the array to avoid mutating the original
      return [...this.registeredCeleryTasks].sort((a, b) => {
        // Use localeCompare for case-insensitive sorting
        return a.display_name.localeCompare(b.display_name);
      });
    },
  },
  methods: {
    addTask(celery_task) {
      celery_task.type = "task";
      this.$emit("add-task", celery_task);
      this.showMenu = false;
    },
    removeTask() {
      this.$emit("remove-task");
    },
  },
};
</script>
