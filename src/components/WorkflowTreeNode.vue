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
  <li>
    <span
      class="node-content"
      :class="$vuetify.theme.name === 'dark' ? '' : 'white-background'"
    >
      <v-menu
        v-if="celeryTask.status_short"
        activator="parent"
        location="bottom"
        :close-on-content-click="false"
      >
        <v-card width="600px" class="pa-4 mt-2">
          <task-result-default
            :worker="workflow"
            :task="celeryTask"
          ></task-result-default>
        </v-card>
      </v-menu>
      <template v-if="node.isRoot">
        <div
          v-for="file in workflow.files"
          :key="file.id"
          :class="file.is_deleted ? 'red-text' : ''"
          style="font-size: 0.9em"
        >
          <v-icon size="small" class="mr-1" style="margin-top: -3px"
            >mdi-file-outline</v-icon
          >
          {{ file.display_name }}
        </div>
      </template>
      <template v-else>
        <task-status-icon
          class="mr-1"
          :task-status="celeryTask.status_short"
        ></task-status-icon>
        {{ node.display_name }}
        <span v-if="celeryTask.runtime">
          <br /><small
            >Runtime: {{ celeryTask.runtime.toFixed(1) }} seconds</small
          >
        </span>

        <v-icon
          v-if="!workflow.tasks.length"
          size="small"
          color="grey-lighten-1"
          >mdi-plus</v-icon
        >
      </template>

      <workflow-task-dropdown
        v-if="!workflow.tasks.length"
        @add-task="addTask($event, node)"
        @remove-task="removeTask(node)"
      ></workflow-task-dropdown>
    </span>
    <ul v-if="node.tasks && node.tasks.length">
      <tree-node
        v-for="task in node.tasks"
        :node="task"
        :workflow="workflow"
        :add-task="addTask"
        :remove-task="removeTask"
      ></tree-node>
    </ul>
  </li>
</template>

<script>
import WorkflowTaskDropdown from "./WorkflowTaskDropdown";
import TaskStatusIcon from "./TaskStatusIcon";
import TaskResultDefault from "@/components/TaskResultDefault.vue";

export default {
  name: "treeNode",
  props: {
    node: Object,
    workflow: Object,
    addTask: Function,
    removeTask: Function,
  },
  components: {
    WorkflowTaskDropdown,
    TaskStatusIcon,
    TaskResultDefault,
  },
  data() {
    return {};
  },
  computed: {
    celeryTask() {
      return (
        this.workflow.tasks.filter((task) => task.uuid === this.node.uuid)[0] ||
        {}
      );
    },
    nodeIcon() {
      return this.celeryTask.status_short === "PROGRESS"
        ? "mdi-chart-box-outline"
        : "mdi-information-outline";
    },
  },
};
</script>

<style scoped>
.white-background {
  background-color: white;
}
.red-text {
  color: red;
}
</style>
