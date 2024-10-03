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
    <!-- Create new workflow template dialog -->
    <v-dialog v-model="showNewTemplateDialog" width="400">
      <v-card width="400" class="mx-auto">
        <v-card-title class="pt-4">New workflow template</v-card-title>
        <div class="pa-4">
          <v-form @submit.prevent @keyup.enter="createWorkflowTemplate()">
            <v-text-field
              v-model="newTemplateForm.displayName"
              variant="outlined"
              label="Template name"
              autofocus
            ></v-text-field>
          </v-form>
          <v-btn
            variant="text"
            color="primary"
            class="text-none"
            :disabled="!newTemplateForm.displayName"
            @click="createWorkflowTemplate()"
            >Create</v-btn
          >
          <v-btn
            variant="text"
            class="text-none ml-1"
            @click="showNewTemplateDialog = false"
            >Cancel</v-btn
          >
        </div>
      </v-card>
    </v-dialog>
    <!-- Rename workflow dialog -->
    <v-dialog v-model="showRenameWorkflowDialog" width="400">
      <v-card width="400" class="mx-auto">
        <v-card-title class="pt-4">Rename workflow</v-card-title>
        <div class="pa-4">
          <v-form @submit.prevent @keyup.enter="renameWorkflow()">
            <v-text-field
              v-model="newWorkflowNameForm.displayName"
              variant="outlined"
              label="Workflow name"
              autofocus
              @focus="$event.target.select()"
            ></v-text-field>
          </v-form>
          <v-btn
            variant="text"
            color="primary"
            class="text-none"
            :disabled="!newWorkflowNameForm.displayName"
            @click="renameWorkflow()"
            >Save</v-btn
          >
          <v-btn
            variant="text"
            class="text-none ml-1"
            @click="showRenameWorkflowDialog = false"
            >Cancel</v-btn
          >
        </div>
      </v-card>
    </v-dialog>

    <v-card
      variant="outlined"
      class="custom-border-color"
      :class="$vuetify.theme.name === 'dark' ? '' : 'light-background'"
    >
      <v-toolbar
        :color="$vuetify.theme.name === 'dark' ? '' : 'grey-lighten-4'"
        density="compact"
      >
        <v-toolbar-title style="font-size: 18px">
          <profile-picture
            :user="workflow.user"
            size="30"
            :title="workflow.user.display_name"
            class="mr-4"
          ></profile-picture>

          <v-hover v-slot="{ isHovering, props }">
            <span v-bind="props" @dblclick="showRenameWorkflowDialog = true">
              {{ workflow.display_name }}
              <v-btn
                v-if="showControls && isHovering"
                icon
                size="small"
                @click="showRenameWorkflowDialog = !showRenameWorkflowDialog"
                ><v-icon size="small">mdi-pencil</v-icon></v-btn
              >
            </span>
          </v-hover>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <div v-if="showControls" class="mr-2">
          <v-btn
            v-if="workflow.tasks && workflow.tasks.length"
            icon
            @click="showNewTemplateDialog = true"
            ><v-icon>mdi-content-save-outline</v-icon></v-btn
          >
          <v-btn
            v-if="workflow.tasks && workflow.tasks.length"
            icon
            @click="copyWorkflow(workflow)"
            ><v-icon>mdi-content-copy</v-icon></v-btn
          >
          <v-btn
            v-if="!workflow.tasks.length"
            icon
            @click="deleteWorkflow(workflow)"
            ><v-icon>mdi-trash-can-outline</v-icon></v-btn
          >
        </div>
      </v-toolbar>
      <v-divider></v-divider>
      <workflow-tree
        :workflow="workflow"
        @workflow-started="runWorkflow()"
      ></workflow-tree>
      <div v-if="!showControls" class="pa-4">
        <router-link
          style="text-decoration: none; color: inherit"
          :to="{ name: 'folder', params: { folderId: workflow.folder.id } }"
        >
          <v-icon color="info" class="mr-2 mt-n1">mdi-folder</v-icon> Results
        </router-link>
      </div>
    </v-card>
  </div>
</template>

<script>
import RestApiClient from "@/RestApiClient";

import WorkflowTree from "@/components/WorkflowTree";
import ProfilePicture from "./ProfilePicture.vue";
import { useAppStore } from "@/stores/app";

export default {
  name: "workflow",
  props: {
    initialWorkflow: Object,
    showControls: Boolean,
  },
  components: {
    WorkflowTree,
    ProfilePicture,
  },
  data() {
    return {
      appStore: useAppStore(),
      polling: null,
      workflow: this.initialWorkflow,
      showNewTemplateDialog: false,
      showRenameWorkflowDialog: false,
      newTemplateForm: {
        displayName: "",
      },
      newWorkflowNameForm: {
        displayName: "",
      },
      fastPolling: 3000,
      pollDataCount: 0,
      initialPollRetries: 2,
    };
  },
  computed: {
    hasActiveProcessingTask() {
      return this.workflow.tasks.some(
        (task) =>
          task.status_short === "STARTED" ||
          task.status_short === "PROGRESS" ||
          task.status_short === "RECEIVED"
      );
    },
  },
  methods: {
    getWorkflowSimple() {
      RestApiClient.getWorkflow(this.workflow.id).then((response) => {
        this.workflow = response;
      });
    },
    getWorkflow() {
      RestApiClient.getWorkflow(this.workflow.id)
        .then((response) => {
          this.workflow = response;
          this.pollDataCount++;
          this.$emit("workflow-updated");
        })
        .then(() => {
          if (
            !this.hasActiveProcessingTask &&
            this.pollDataCount > this.initialPollRetries
          ) {
            clearInterval(this.polling);
          }
        });
    },
    copyWorkflow() {
      RestApiClient.copyWorkflow(this.workflow)
        .then((response) => {
          this.$router.push({
            name: "folder",
            params: { folderId: response.folder.id },
          });
        })
        .catch((error) => {
          this.$eventBus.emit("showSnackbar", {
            message: error.response.data.detail,
            color: "error",
          });
        });
    },
    deleteWorkflow() {
      if (confirm("Are you sure you want to delete this workflow?")) {
        RestApiClient.deleteWorkflow(this.workflow)
          .then(() => {
            this.$emit("workflow-deleted", this.workflow);
          })
          .catch((error) => {
            this.$eventBus.emit("showSnackbar", {
              message: error.response.data.detail,
              color: "error",
            });
          });
      }
    },
    renameWorkflow() {
      const newName = this.newWorkflowNameForm.displayName;
      const requestBody = { display_name: newName };
      if (!newName) {
        return;
      }
      RestApiClient.updateWorkflow(this.workflow, requestBody).then(() => {
        this.workflow.display_name = newName;
        this.showRenameWorkflowDialog = false;
        this.$emit("workflow-renamed", newName);
      });
    },
    createWorkflowTemplate() {
      this.showNewTemplateDialog = false;
      if (this.newTemplateForm.displayName === "") {
        return;
      }
      RestApiClient.createWorkflowTemplate(
        this.newTemplateForm.displayName,
        this.workflow.id
      ).then(() => {
        this.appStore.setWorkflowTemplates();
        this.newTemplateForm.displayName = "";
      });
    },
    runWorkflow() {
      this.pollDataCount = 0;
      this.pollData(this.fastPolling);
    },
    pollData(polling_interval_ms) {
      this.getWorkflowSimple();
      this.polling = setInterval(() => {
        this.getWorkflow();
      }, polling_interval_ms);
    },
  },
  mounted() {
    this.pollData(this.fastPolling);
    this.newWorkflowNameForm.displayName = this.workflow.display_name;
  },
  unmounted() {
    clearInterval(this.polling);
  },
};
</script>

<style lang="scss" scoped>
.light-background {
  background-color: #fafafa;
}
</style>
