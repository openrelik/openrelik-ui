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
    <v-dialog v-model="showTaskConfigForm" width="600">
      <v-card width="600" class="mx-auto">
        <v-card-title>Config for {{ node.display_name }}</v-card-title>
        <v-card-text>
          <task-config-form
            :fields="node.task_config"
            @save="saveTaskConfig($event)"
            @cancel="showTaskConfigForm = false"
          ></task-config-form>
        </v-card-text>
      </v-card>
    </v-dialog>
    <span
      class="node-content"
      :class="
        $vuetify.theme.name === 'dark'
          ? 'dark-grey-background'
          : 'white-background'
      "
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
        <div class="py-1">
          <div
            v-for="file in workflow.files"
            :key="file.id"
            :class="file.is_deleted ? 'red-text' : ''"
            :title="file.display_name"
            style="font-size: 0.9em"
            class="file-container"
          >
            <v-icon
              v-if="file.data_type.startsWith('cloud:')"
              class="mr-2 mt-n1"
              >mdi-cloud-outline</v-icon
            >
            <v-icon v-else size="small" class="mr-1" style="margin-top: -3px"
              >mdi-file-outline</v-icon
            >
            <div class="truncate">{{ file.display_name }}</div>
          </div>
        </div>
      </template>
      <template v-else>
        <div>
          <task-status-icon
            class="mr-1"
            :task-status="celeryTask.status_short"
          ></task-status-icon>
          {{ node.display_name }}
          <div v-if="celeryTask.runtime">
            <small class="ml-1"
              >Runtime:
              <strong>{{ celeryTask.runtime.toFixed(1) }}</strong>
              seconds</small
            >
          </div>
          <div v-if="celeryTask.file_reports && celeryTask.file_reports.length">
            <small class="ml-1">
              Reports:
              <strong>{{ celeryTask.file_reports.length }}</strong> reports
            </small>
          </div>
          <div v-if="hasHighPriorityReports && hasHighPriorityReports.length">
            <small class="ml-1 red-text">
              <strong>{{ hasHighPriorityReports.length }}</strong> report(s)
              with high priority findings
            </small>
          </div>

          <span v-if="hasTaskConfig">
            <v-btn
              v-if="!Object.keys(celeryTask).length"
              icon
              variant="text"
              size="x-small"
              class="text-none"
              @click.stop="showTaskConfigForm = true"
            >
              <v-icon>mdi-cog-outline</v-icon>
            </v-btn>
          </span>

          <v-btn
            v-if="!workflow.tasks.length"
            icon
            variant="text"
            size="x-small"
            class="text-none ml-1"
          >
            <v-icon color="grey-lighten-1" size="x-large">mdi-plus</v-icon>
          </v-btn>
        </div>
        <div class="ml-1" v-for="option in node.task_config">
          <small
            v-if="
              option.hasOwnProperty('value') &&
              option.value !== null &&
              option.value !== undefined &&
              option.value !== ''
            "
          >
            <strong>{{ option.name }}: </strong>
            <span v-if="Array.isArray(option.value)">
              <div v-for="value in option.value">{{ value }}</div>
            </span>
            <span v-else>
              {{ option.value }}
            </span>
          </small>
        </div>
      </template>

      <workflow-task-dropdown
        v-if="!workflow.tasks.length"
        :isRootNode="node.isRoot"
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
        :update-workflow="updateWorkflow"
      ></tree-node>
    </ul>
  </li>
</template>

<script>
import WorkflowTaskDropdown from "./WorkflowTaskDropdown";
import TaskStatusIcon from "./TaskStatusIcon";
import TaskResultDefault from "@/components/TaskResultDefault.vue";
import TaskConfigForm from "./TaskConfigForm.vue";

export default {
  name: "treeNode",
  props: {
    node: Object,
    workflow: Object,
    addTask: Function,
    removeTask: Function,
    updateWorkflow: Function,
  },
  components: {
    WorkflowTaskDropdown,
    TaskStatusIcon,
    TaskResultDefault,
    TaskConfigForm: TaskConfigForm,
  },
  data() {
    return {
      showTaskConfigForm: false,
    };
  },
  computed: {
    celeryTask() {
      return (
        this.workflow.tasks.filter((task) => task.uuid === this.node.uuid)[0] ||
        {}
      );
    },
    hasTaskConfig() {
      return this.node.task_config && this.node.task_config.length;
    },
    hasTaskConfigWithValue() {
      return this.node.task_config.some((option) => {
        return (
          option.hasOwnProperty("value") &&
          option.value !== null &&
          option.value !== undefined &&
          option.value !== ""
        );
      });
    },
    hasHighPriorityReports() {
      if (
        !this.celeryTask.file_reports ||
        !this.celeryTask.file_reports.length
      ) {
        return false;
      }
      return this.celeryTask.file_reports.filter(
        (report) => report.priority >= 40
      );
    },
    nodeIcon() {
      return this.celeryTask.status_short === "PROGRESS"
        ? "mdi-chart-box-outline"
        : "mdi-information-outline";
    },
  },
  methods: {
    saveTaskConfig(formData) {
      // Loop through the task options in the object
      this.node.task_config.forEach((option) => {
        // Check if there's a corresponding value in the formData
        if (formData.hasOwnProperty(option.name)) {
          // Update the option with the value from the formData
          option.value = formData[option.name];
        }
      });
      this.updateWorkflow();
      this.showTaskConfigForm = false;
    },
  },
};
</script>

<style scoped>
.white-background {
  background-color: white;
}
.dark-grey-background {
  background-color: #181818;
}
.red-text {
  color: red;
}
.file-container {
  display: flex;
  align-items: center;
  width: 100%;
}
.truncate {
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
