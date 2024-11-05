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
  <div>
    <div class="pa-4">
      <ul class="tree">
        <tree-node
          v-for="node in workflowSpec"
          :node="node"
          :workflow="workflow"
          :add-task="addTask"
          :remove-task="removeTask"
          :update-workflow="updateWorkflow"
        ></tree-node>
      </ul>

      <v-btn
        v-if="!workflow.tasks.length && workflowSpec.workflow.tasks.length"
        prepend-icon="mdi-play"
        variant="flat"
        color="info"
        class="text-none mt-4"
        @click="runWorkflow"
        >Run this workflow</v-btn
      >
    </div>
  </div>
</template>

<script>
import { v4 as uuidv4 } from "uuid";
import { useAppStore } from "@/stores/app";
import RestApiClient from "@/RestApiClient";

import TreeNode from "@/components/WorkflowTreeNode";
import WorkflowTaskDropdown from "@/components/WorkflowTaskDropdown";
import TaskResultDefault from "@/components/TaskResultDefault.vue";

import _ from "lodash";

export default {
  name: "WorkflowTree",
  props: {
    workflow: Object,
  },
  components: {
    WorkflowTaskDropdown,
    TaskResultDefault,
    TreeNode,
  },
  data() {
    return {
      workflowSpec: {
        workflow: {
          type: "chain",
          isRoot: true,
          tasks: [],
        },
      },
      appStore: useAppStore(),
      taskInfo: null,
    };
  },
  computed: {
    registeredCeleryTasks() {
      return this.appStore.registeredCeleryTasks;
    },
  },
  methods: {
    addTask(newTask, node) {
      // Clone the object to avoid circular JSON serialization.
      let clonedTask = _.cloneDeep(newTask);
      // HEX representation of the UUID4 (no hyphens)
      clonedTask.uuid = uuidv4().replaceAll("-", "");

      if (!clonedTask.tasks) {
        clonedTask.tasks = [];
      }
      node.tasks.push(clonedTask);
      this.updateWorkflow();
    },
    removeTask(node) {
      // Recursively remove the task from all tasks in the workflow spec.
      function findAndRemove(data, targetProperty, targetValue) {
        for (let i = 0; i < data.length; i++) {
          if (data[i][targetProperty] === targetValue) {
            data.splice(i, 1);
            return true;
          }
          if (Array.isArray(data[i].tasks)) {
            const result = findAndRemove(
              data[i].tasks,
              targetProperty,
              targetValue
            );
            if (result) {
              return true;
            }
          }
        }
        return false;
      }
      findAndRemove(this.workflowSpec.workflow.tasks, "uuid", node.uuid);
      this.updateWorkflow();
    },
    updateWorkflow() {
      let requestBody = { spec_json: JSON.stringify(this.workflowSpec) };
      RestApiClient.updateWorkflow(this.workflow, requestBody)
        .then((response) => {})
        .catch((error) => {
          console.error(error);
        });
    },
    runWorkflow() {
      RestApiClient.runWorkflow(this.workflow, this.workflowSpec)
        .then((response) => {
          this.$emit("workflow-started");
          this.$eventBus.emit("clear-selected-files");
          this.$router.push({
            name: "folder",
            params: { folderId: response.folder_id },
          });
        })
        .catch((error) => {
          console.error(error);
        });
    },
  },
  mounted() {
    if (this.workflow.spec_json) {
      this.workflowSpec = JSON.parse(this.workflow.spec_json);
    }
  },
};
</script>

<style lang="scss">
.tree {
  list-style: none;

  &,
  * {
    margin: 0;
    padding: 0;
  }

  li {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding-top: 0.5vh;
    padding-bottom: 0.5vh;
    position: relative;
    padding-left: 1vw;

    &::before {
      content: "";
      position: absolute;

      left: 0;
      top: 50%;
      border-top: 1px solid rgb(var(--v-theme-custom-border-color));
      width: 1vw;
    }

    &::after {
      content: "";

      position: absolute;
      left: 0;
      border-left: 1px solid rgb(var(--v-theme-custom-border-color));
    }
    &:only-child::after {
      border-left: 0;
    }

    &:last-of-type::after {
      height: 50%;
      top: 0;
    }

    &:first-of-type::after {
      height: 50%;
      bottom: 0;
    }

    &:not(:first-of-type):not(:last-of-type)::after {
      height: 100%;
    }
  }

  ul,
  ol {
    padding-left: 1vw;
    position: relative;

    &::before {
      content: "";
      position: absolute;

      left: 0;
      top: 50%;
      border-top: 1px solid rgb(var(--v-theme-custom-border-color));
      width: 1vw;
    }

    &:not(:first-of-type):not(:last-of-type)::after {
      height: 100%;
    }
  }

  ul,
  ol {
    padding-left: 1vw;
    position: relative;

    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      border-top: 1px solid rgb(var(--v-theme-custom-border-color));
      width: 1vw;
    }
  }

  span.node-content {
    border: 1px solid rgb(var(--v-theme-custom-border-color));
    text-align: left;
    padding: 0.5em 0.5em;
    border-radius: 4px;
    cursor: pointer;
    min-width: 100px;
    max-width: 300px;
  }
  span.node-content:hover {
    background-color: rgb(var(--v-theme-custom-hover-color));
  }

  > li {
    padding-left: 0;

    &::before,
    &::after {
      display: none;
    }
  }
}
</style>
