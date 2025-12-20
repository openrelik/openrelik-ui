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
  <!-- New folder dialog -->
  <v-dialog v-model="showNewFolderDialog" width="400">
    <v-card width="400" class="mx-auto">
      <v-card-title>New folder</v-card-title>
      <div class="pa-4">
        <v-form @submit.prevent @keyup.enter="createFolder()">
          <v-text-field
            v-model="newFolderForm.name"
            variant="outlined"
            label="Folder name"
            autofocus
          ></v-text-field>
        </v-form>

        <v-btn
          variant="text"
          color="primary"
          class="text-none"
          :disabled="!newFolderForm.name"
          @click="createFolder()"
          >Create</v-btn
        >
        <v-btn
          variant="text"
          class="text-none"
          @click="showNewFolderDialog = false"
          >Cancel</v-btn
        >
      </div>
    </v-card>
  </v-dialog>

  <!-- Rename folder dialog -->
  <v-dialog v-model="showRenameFolderDialog" width="400">
    <v-card width="400" class="mx-auto">
      <v-card-title class="pt-4">Rename folder</v-card-title>
      <div class="pa-4">
        <v-form
          @submit.prevent
          @keyup.enter="renameFolder(newFolderNameForm.displayName)"
        >
          <v-text-field
            v-model="newFolderNameForm.displayName"
            variant="outlined"
            label="Folder name"
            autofocus
            @focus="$event.target.select()"
          ></v-text-field>
        </v-form>
        <v-btn
          variant="text"
          color="primary"
          class="text-none"
          :disabled="!newFolderNameForm.displayName"
          @click="renameFolder(newFolderNameForm.displayName)"
          >Save</v-btn
        >
        <v-btn
          variant="text"
          class="text-none ml-1"
          @click="showRenameFolderDialog = false"
          >Cancel</v-btn
        >
      </div>
    </v-card>
  </v-dialog>

  <!-- Upload files dialog -->
  <v-dialog v-model="showUpload" width="800" persistent>
    <v-card width="800" class="mx-auto">
      <div class="pa-4">
        <upload-file
          v-if="showUpload"
          :folder-id="folderId"
          @file-uploaded="updateFilesArray($event)"
          @file-upload-error="showUploadError($event)"
          @close-dialog="this.showUpload = false"
        ></upload-file>
      </div>
    </v-card>
  </v-dialog>

  <!-- Share folder dialog -->
  <v-dialog v-model="showSharingDialog" width="400">
    <v-card width="500" class="mx-auto">
      <v-card-title class="mt-1">Share folder</v-card-title>
      <div class="pa-4">
        <v-row no-gutters>
          <v-col cols="8" class="pr-3">
            <v-autocomplete
              v-model="selectedUsers"
              :items="searchUserResult"
              density="compact"
              variant="outlined"
              placeholder="Add people"
              item-title="display_name"
              item-value="username"
              return-object
              chips
              closable-chips
              multiple
              no-filter
              hide-no-data
              clear-on-select
              @update:search="searchUsers($event)"
            >
              <template v-slot:chip="{ props, item }">
                <v-chip
                  v-bind="props"
                  :prepend-avatar="
                    item.raw.profile_picture_url
                      ? item.raw.profile_picture_url
                      : ''
                  "
                  :prepend-icon="
                    item.raw.profile_picture_url ? '' : 'mdi-account'
                  "
                ></v-chip>
              </template>
              <template v-slot:item="{ props, item }">
                <v-list-item
                  v-bind="props"
                  :prepend-avatar="
                    item.raw.profile_picture_url
                      ? item.raw.profile_picture_url
                      : '/user-placeholder.png'
                  "
                  :title="item.raw.display_name"
                  :subtitle="item.raw.username"
                ></v-list-item>
              </template>
            </v-autocomplete>
          </v-col>
          <v-col cols="4">
            <v-select
              v-model="selectedUsersRole"
              variant="outlined"
              density="compact"
              :disabled="!selectedUsers.length"
              :items="['Editor', 'Viewer']"
            ></v-select>
          </v-col>
        </v-row>

        <v-row no-gutters>
          <v-col cols="8" class="pr-3">
            <v-autocomplete
              v-model="selectedGroups"
              :items="appStore.groups"
              variant="outlined"
              density="compact"
              placeholder="Add groups"
              item-title="name"
              item-value="id"
              return-object
              chips
              closable-chips
              multiple
              no-filter
              hide-no-data
              clear-on-select
              hide-details
            >
              <template v-slot:chip="{ props, item }">
                <v-chip
                  v-bind="props"
                  prepend-icon="mdi-account-multiple"
                ></v-chip>
              </template>
              <template v-slot:item="{ props, item }">
                <v-list-item
                  v-bind="props"
                  prepend-icon="mdi-account-multiple"
                  :title="item.raw.name"
                  :subtitle="item.raw.description"
                ></v-list-item>
              </template>
            </v-autocomplete>
          </v-col>
          <v-col cols="4">
            <v-select
              v-model="selectedGroupsRole"
              variant="outlined"
              density="compact"
              :disabled="!selectedGroups.length"
              :items="['Editor', 'Viewer']"
            ></v-select>
          </v-col>
        </v-row>

        <div>
          <h4>People with access</h4>
          <v-table>
            <tbody>
              <tr v-for="user_role in folder.user_roles" :key="user_role.id">
                <td>
                  <v-avatar
                    v-if="user_role.user.profile_picture_url"
                    size="x-small"
                    class="mr-1"
                  >
                    <v-img
                      :src="user_role.user.profile_picture_url"
                      referrerpolicy="no-referrer"
                      alt="Profile Picture"
                    />
                  </v-avatar>
                  <v-avatar size="x-small" class="mr-1" v-else>
                    <v-img
                      src="/user-placeholder.png"
                      referrerpolicy="no-referrer"
                      alt="Profile Picture"
                    />
                  </v-avatar>
                  {{ user_role.user.display_name }}
                </td>
                <td>{{ user_role.role }}</td>
                <td class="text-right">
                  <v-btn
                    v-if="user_role.role != 'Owner'"
                    size="small"
                    variant="tonal"
                    class="text-none"
                    @click="deleteUserRole(user_role.id)"
                    >Remove access</v-btn
                  >
                </td>
              </tr>
              <tr v-for="group_role in folder.group_roles" :key="group_role.id">
                <td>
                  <v-icon class="mr-1"> mdi-account-multiple </v-icon>
                  {{ group_role.group.name }}
                </td>
                <td>{{ group_role.role }}</td>
                <td class="text-right">
                  <v-btn
                    size="small"
                    variant="tonal"
                    class="text-none"
                    @click="deleteGroupRole(group_role.id)"
                    >Remove access</v-btn
                  >
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <v-card-actions class="mt-2">
          <v-btn
            variant="text"
            color="primary"
            class="text-none"
            @click="shareFolder()"
            >Save</v-btn
          >
          <v-btn
            variant="text"
            class="text-none"
            @click="showSharingDialog = false"
            >Cancel</v-btn
          >
        </v-card-actions>
      </div>
    </v-card>
  </v-dialog>

  <!-- Workflow info dialog -->
  <v-dialog v-model="showWorkflowInfoDialog" width="50vh">
    <v-card class="mx-auto pb-5" width="50vh" max-height="50vh">
      <v-toolbar color="transparent" density="compact">
        <v-toolbar-title style="font-size: 18px">
          Workflow information
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-icon
          size="small"
          class="mr-4"
          @click="showWorkflowInfoDialog = false"
          >mdi-close</v-icon
        >
      </v-toolbar>

      <v-card variant="outlined" class="mx-4 custom-border-color">
        <v-table density="compact">
          <tbody>
            <tr>
              <td>ID</td>
              <td>{{ currentWorkflow.id }}</td>
            </tr>
            <tr>
              <td>Number of tasks</td>
              <td>{{ currentWorkflow.tasks.length }}</td>
            </tr>
            <tr v-if="currentWorkflow.template">
              <td>Created from template</td>
              <td>{{ currentWorkflow.template.display_name }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </v-card>
  </v-dialog>

  <!-- Workflow report dialog -->
  <v-dialog v-model="showWorkflowReportDialog" width="800">
    <v-card width="800" class="mx-auto">
      <v-toolbar color="transparent" density="compact">
        <v-toolbar-title>Workflow report</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-icon
          size="small"
          class="mr-4"
          @click="showWorkflowReportDialog = false"
          >mdi-close</v-icon
        >
      </v-toolbar>
      <v-divider></v-divider>
      <div class="px-4 pb-4" style="max-height: 600px; overflow-y: auto">
        <workflow-report :markdown="workflowReportMarkdown"></workflow-report>
      </div>
    </v-card>
  </v-dialog>

  <!-- Create new workflow template dialog -->
  <v-dialog v-model="showNewTemplateDialog" width="400">
    <v-card width="400" class="mx-auto">
      <v-card-title class="pt-4">New workflow template</v-card-title>
      <div class="pa-4">
        <v-form @submit.prevent @keyup.enter="saveWorkflowAsTemplate()">
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
          @click="saveWorkflowAsTemplate()"
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

  <!-- Breadcrumbs -->
  <v-breadcrumbs density="compact" class="ml-n4 mt-n3">
    <small>
      <v-breadcrumbs-item :to="{ name: 'home' }"> Home </v-breadcrumbs-item>
      <v-breadcrumbs-divider
        v-if="folder && folder.parent"
      ></v-breadcrumbs-divider>
      <breadcrumbs :folder="folder.parent"></breadcrumbs>
      <v-breadcrumbs-divider></v-breadcrumbs-divider>
      <v-breadcrumbs-item>
        <span style="opacity: 0.5">{{ folder.display_name }}</span>
      </v-breadcrumbs-item>
    </small>
  </v-breadcrumbs>

  <!-- Folder -->
  <span style="display: flex; align-items: center">
    <v-icon
      v-if="folder.workflows && folder.workflows.length"
      class="mr-3"
      color="blue-grey"
    >
      mdi-folder-play</v-icon
    >
    <v-icon
      v-else-if="folder.user && folder.user.id !== currentUser.id"
      class="mr-3"
      color="info"
    >
      mdi-folder-account</v-icon
    >
    <v-icon v-else class="mr-3" color="info">mdi-folder</v-icon>

    <v-hover v-if="!folder.is_deleted" v-slot="{ isHovering, props }">
      <h3 v-bind="props" @dblclick="showRenameFolderDialog = true">
        {{ folder.display_name }}
        <v-icon
          v-if="isHovering"
          size="x-small"
          @click="showRenameFolderDialog = !showRenameFolderDialog"
          >mdi-pencil</v-icon
        >
      </h3>
    </v-hover>
    <h2 v-else>{{ folder.display_name }}</h2>
  </span>

  <div v-if="folder.is_deleted">
    <v-alert
      type="error"
      text="This folder has been deleted"
      icon="mdi-alert"
    ></v-alert>
  </div>
  <div v-if="no_access" class="mt-2">You don't have access to this folder.</div>
  <div v-else>
    <!-- Button row -->
    <div class="mt-3">
      <v-btn
        v-if="!isWorkflowFolder && canEdit"
        variant="outlined"
        class="text-none custom-border-color"
        prepend-icon="mdi-folder-plus-outline"
        @click="showNewFolderDialog = true"
        >New subfolder</v-btn
      >
      <v-btn
        v-if="!isWorkflowFolder && canEdit"
        variant="outlined"
        class="text-none mx-2 custom-border-color"
        prepend-icon="mdi-upload"
        @click="showUpload = !showUpload"
        >Upload files</v-btn
      >
      <v-menu v-if="files.length && canEdit">
        <template v-slot:activator="{ props }">
          <v-btn
            :variant="selectedFiles.length ? 'flat' : 'outlined'"
            :color="selectedFiles.length ? 'info' : 'default'"
            :class="selectedFiles.length ? '' : 'custom-border-color'"
            class="text-none mr-2"
            prepend-icon="mdi-plus"
            append-icon="mdi-chevron-down"
            v-bind="props"
            >Create workflow
          </v-btn>
        </template>
        <v-card width="400">
          <v-card-text v-if="!selectedFiles.length">
            Select some files to create a workflow from.
          </v-card-text>
          <v-list v-else>
            <v-list-item @click="createWorkflow()">
              <v-list-item-title>
                <v-icon size="small" style="margin-top: -3px" class="mr-1"
                  >mdi-plus</v-icon
                >
                <strong>New workflow</strong></v-list-item-title
              >
            </v-list-item>
            <div v-if="appStore.workflowTemplates.length">
              <v-divider></v-divider>
              <v-list-subheader
                v-if="appStore.workflowTemplates.length"
                class="mt-2"
                >Templates</v-list-subheader
              >

              <v-list-item
                @click="createWorkflow(template.id)"
                v-for="template in appStore.workflowTemplates"
                :key="template.id"
              >
                <v-list-item-title>
                  <v-icon>mdi-plus</v-icon> {{ template.display_name }}
                </v-list-item-title>
              </v-list-item>
            </div>
          </v-list>
        </v-card>
      </v-menu>
      <v-btn
        v-if="canEdit"
        variant="outlined"
        class="text-none mr-2 custom-border-color"
        prepend-icon="mdi-account-plus-outline"
        @click="showSharingDialog = !showSharingDialog"
        >Share</v-btn
      >
      <v-btn
        v-if="systemConfig && systemConfig.agents_enabled"
        variant="outlined"
        class="text-none mr-2 custom-border-color"
        :to="{ name: 'investigation', params: { folderId: folderId } }"
        prepend-icon="mdi-star-four-points"
        >Investigate</v-btn
      >
    </div>

    <div class="mt-4">
      <v-card
        v-if="isWorkflowFolder && settings.WorkflowEditor === 'new'"
        variant="flat"
        class="workflow-card custom-border-color d-flex flex-column"
        :class="{
          'full-screen-canvas': isFullScreen,
          'grid-bg': showGrid,
          'light-theme': isLightTheme,
        }"
        :style="containerStyle"
      >
        <v-toolbar
          :color="$vuetify.theme.name === 'dark' ? '' : 'grey-lighten-4'"
          density="compact"
        >
          <v-toolbar-title style="font-size: 18px">
            <profile-picture
              :user="currentWorkflow.user"
              size="25"
              :title="currentWorkflow.user.display_name"
              class="mr-3"
            ></profile-picture>
            <v-hover v-slot="{ isHovering, props }">
              <span
                v-bind="props"
                @dblclick="showRenameWorkflowDialog = true"
                :class="{ 'pulsate-text': isGeneratingName }"
              >
                {{
                  isGeneratingName
                    ? "Generating workflow name..."
                    : storeWorkflow && storeWorkflow.id === currentWorkflow.id
                    ? storeWorkflow.display_name
                    : currentWorkflow.display_name
                }}
                <v-icon
                  v-if="isHovering"
                  @click="showRenameWorkflowDialog = true"
                  size="x-small"
                  >mdi-pencil</v-icon
                >
              </span>
            </v-hover>
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <div :class="isFullScreen ? 'mr-5' : 'mr-1'">
            <v-btn
              v-if="!hasChords"
              variant="outlined"
              rounded="pill"
              size="small"
              :color="isLightTheme ? 'grey-darken-3' : 'white'"
              text="Switch back to the old editor"
              class="text-none mr-4"
              @click="toggleLegacyView(true)"
            ></v-btn>
            <v-icon
              size="small"
              @click="showWorkflowInfoDialog = true"
              class="mr-2"
              >mdi-information-outline</v-icon
            >
            <v-btn
              icon
              variant="text"
              :color="isLightTheme ? 'grey-darken-3' : 'white'"
              title="Save workflow as template"
              @click="showNewTemplateDialog = true"
              :disabled="!currentWorkflow.tasks.length"
            >
              <v-icon>mdi-content-save-outline</v-icon>
            </v-btn>
            <v-btn
              icon
              variant="text"
              :color="isLightTheme ? 'grey-darken-3' : 'white'"
              @click="$refs.canvas.zoomToFit()"
              title="Zoom to fit"
            >
              <v-icon>mdi-fit-to-screen-outline</v-icon>
            </v-btn>
            <v-btn
              icon
              variant="text"
              :color="isLightTheme ? 'grey-darken-3' : 'white'"
              @click="showGrid = !showGrid"
              :title="showGrid ? 'Hide grid' : 'Show grid'"
            >
              <v-icon>{{ showGrid ? "mdi-grid" : "mdi-grid-off" }}</v-icon>
            </v-btn>
            <v-btn
              icon
              variant="text"
              :color="isLightTheme ? 'grey-darken-3' : 'white'"
              @click="toggleFullScreen"
              :title="isFullScreen ? 'Exit full screen' : 'Full screen'"
            >
              <v-icon>{{
                isFullScreen ? "mdi-fullscreen-exit" : "mdi-fullscreen"
              }}</v-icon>
            </v-btn>
          </div>
        </v-toolbar>
        <v-divider></v-divider>

        <workflow-canvas
          ref="canvas"
          :folder="folder"
          :workflow="folder.workflows[0]"
          @content-resize="handleContentResize"
          @workflow-updated="refreshFileListing()"
          @workflow-renamed="renameFolderFromWorkflow($event)"
        ></workflow-canvas>

        <v-divider></v-divider>

        <v-card-actions
          :class="
            $vuetify.theme.name === 'dark'
              ? 'bg-grey-darken-4'
              : 'bg-grey-lighten-4'
          "
          class="py-4"
        >
          <v-btn
            v-if="!currentWorkflow.tasks.length"
            prepend-icon="mdi-play"
            color="info"
            class="text-none ml-2 pr-3"
            variant="flat"
            text="Run this workflow"
            :disabled="readOnly"
            @click="runWorkflowAndRefresh()"
          ></v-btn>
          <v-btn
            v-if="!currentWorkflow.tasks.length"
            prepend-icon="mdi-trash-can-outline"
            variant="flat"
            class="text-none custom-border-color ml-2"
            text="Cancel"
            title="Delete this workflow and folder and go back to the folder list"
            @click="deleteWorkflow()"
          ></v-btn>
          <v-btn
            v-if="currentWorkflow.tasks.length"
            prepend-icon="mdi-content-copy"
            variant="flat"
            class="text-none custom-border-color ml-2"
            text="Copy workflow"
            title="Copy this workflow and remix it"
            @click="copyWorkflowAndRedirect()"
          ></v-btn>
          <v-btn
            v-if="currentWorkflow.tasks.length"
            prepend-icon="mdi-file-document-outline"
            variant="flat"
            class="text-none custom-border-color ml-2"
            text="Generate report"
            title="Generate a report for this workflow"
            :loading="isGeneratingReport"
            @click="generateReport()"
          ></v-btn>
        </v-card-actions>
      </v-card>

      <workflow
        v-if="
          isWorkflowFolder &&
          settings.WorkflowEditor === 'old' &&
          currentWorkflow
        "
        :key="currentWorkflow.id"
        :initial-workflow="currentWorkflow"
        :show-controls="true"
        @workflow-updated="refreshFileListing()"
        @workflow-deleted="deleteWorkflow()"
        @workflow-renamed="renameFolderFromWorkflow($event)"
      >
        <template v-slot:toolbar-actions>
          <v-btn
            variant="outlined"
            rounded="pill"
            size="small"
            text="Try the new editor"
            title="Try the new and improved editor"
            class="text-none mr-4"
            @click="toggleLegacyView(false)"
          ></v-btn>
        </template>
      </workflow>

      <div class="mt-4">
        <v-card-title
          v-if="isWorkflowFolder && files.length"
          class="ml-n4 mt-3"
        >
          Workflow results
        </v-card-title>

        <folder-list
          :items="items"
          :is-loading="isLoading"
          :folder="folder"
          @file-deleted="removeFile($event)"
          @folder-deleted="removeFolder($event)"
          @selected-files="selectedFiles = $event"
        ></folder-list>
      </div>
    </div>
  </div>
</template>

<script>
import _ from "lodash";
import { mapActions, mapState } from "pinia";

import RestApiClient from "@/RestApiClient";
import { useAppStore } from "@/stores/app";
import { useUserStore } from "@/stores/user";
import { useWorkflowStore } from "@/stores/workflow";
import { useUserSettings } from "@/composables/useUserSettings";
import { useThemeInfo } from "@/composables/useThemeInfo";

import Breadcrumbs from "@/components/Breadcrumbs";
import FolderList from "@/components/FolderList";
import ProfilePicture from "@/components/ProfilePicture.vue";
import UploadFile from "@/components/UploadFile";
import Workflow from "@/components/Workflow.vue";
import WorkflowCanvas from "@/components/WorkflowCanvas/WorkflowCanvas.vue";
import WorkflowReport from "@/components/WorkflowReport.vue";

export default {
  components: {
    Breadcrumbs,
    FolderList,
    ProfilePicture,
    UploadFile,
    Workflow,
    WorkflowCanvas,
    WorkflowReport,
  },
  setup() {
    const { isLightTheme } = useThemeInfo();
    const { settings } = useUserSettings();
    return { isLightTheme, settings };
  },
  props: {
    folderId: String,
  },
  data() {
    return {
      folder: {},
      folders: [],
      files: [],
      myRole: { role: "" },
      isFullScreen: false,
      workflowHeight: 350,
      showGrid: true,
      selectedFiles: [],
      showUpload: false,
      showNewFolderDialog: false,
      showRenameFolderDialog: false,
      showSharingDialog: false,
      showWorkflowInfoDialog: false,
      showNewTemplateDialog: false,
      showRenameWorkflowDialog: false,
      showWorkflowReportDialog: false,

      workflowReportMarkdown: "",
      isGeneratingReport: false,
      newFolderForm: {
        name: "",
      },
      newFolderNameForm: {
        displayName: "",
      },
      newTemplateForm: {
        displayName: "",
      },
      newWorkflowNameForm: {
        displayName: "",
      },
      isLoading: false,
      no_access: false,
      appStore: useAppStore(),
      userStore: useUserStore(),
      selectedUsers: [],
      selectedUsersRole: "Editor",
      selectedGroups: [],
      selectedGroupsRole: "Editor",
      searchUserResult: [],
    };
  },
  computed: {
    ...mapState(useWorkflowStore, {
      readOnly: "readOnly",
      storeSpecJson: "specJson",
      storeWorkflow: "workflow",
      isGeneratingName: "isGeneratingName",
    }),
    systemConfig() {
      return this.appStore.systemConfig;
    },
    currentUser() {
      return this.userStore.user;
    },
    currentWorkflow() {
      return this.folder.workflows ? this.folder.workflows[0] : null;
    },
    items() {
      return this.folders.concat(this.files);
    },
    isWorkflowFolder() {
      if (!this.folder.workflows) {
        return;
      }
      return this.folder.workflows.length;
    },
    canEdit() {
      return this.myRole.role === "Owner" || this.myRole.role === "Editor";
    },
    isOwner() {
      return this.myRole.role === "Owner";
    },
    hasChords() {
      let jsonStr = null;
      // Prefer store data if it matches current workflow
      if (
        this.storeWorkflow &&
        this.currentWorkflow &&
        this.storeWorkflow.id === this.currentWorkflow.id &&
        this.storeSpecJson
      ) {
        jsonStr = this.storeSpecJson;
      } else if (this.currentWorkflow && this.currentWorkflow.spec_json) {
        jsonStr = this.currentWorkflow.spec_json;
      }

      if (!jsonStr) return false;
      return jsonStr.toLowerCase().includes('"type": "chord"');
    },
    containerStyle() {
      if (this.isFullScreen) {
        return {
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 2000,
        };
      }
      return {
        height: `${Math.max(this.workflowHeight, 550)}px`,
        maxHeight: "70vh",
        minHeight: "550px",
        transition: "height 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)",
      };
    },
  },
  methods: {
    ...mapActions(useWorkflowStore, {
      clearWorkflow: "clearWorkflow",
      loadWorkflowData: "loadWorkflowData",
      runWorkflow: "runWorkflow",
      copyWorkflow: "copyWorkflow",
      createWorkflowTemplate: "createWorkflowTemplate",
      renameWorkflowFromStore: "renameWorkflow",
    }),
    searchUsers: _.debounce(function (query) {
      RestApiClient.searchUsers(query).then((response) => {
        this.searchUserResult = response;
      });
    }, 300),
    removeFolder(folder_to_remove) {
      this.folders = this.folders.filter(
        (folder) => folder.id != folder_to_remove.id
      );
    },
    removeFile(file_to_remove) {
      this.files = this.files.filter((file) => file.id != file_to_remove.id);
    },
    updateFilesArray() {
      RestApiClient.getFiles(this.folderId).then((response) => {
        this.files = response;
      });
    },
    toggleFullScreen() {
      this.isFullScreen = !this.isFullScreen;
      this.$nextTick(() => {
        if (this.$refs.canvas) {
          this.$refs.canvas.zoomToFit();
        }
      });
    },
    async toggleLegacyView(showLegacy) {
      if (this.currentWorkflow) {
        // Fetch fresh data before switching to ensure state is consistent
        await this.loadWorkflowData(this.folderId, this.currentWorkflow.id);
        // Refresh local folder data with the updated workflow from store
        if (
          this.storeWorkflow &&
          this.folder.workflows &&
          this.folder.workflows[0]
        ) {
          Object.assign(this.folder.workflows[0], this.storeWorkflow);
        }
      }
      this.settings.WorkflowEditor = showLegacy ? "old" : "new";
    },
    createFolder() {
      if (this.newFolderForm.name === "") {
        return;
      }
      RestApiClient.createFolder(this.newFolderForm.name, this.folderId).then(
        (response) => {
          this.showNewFolderDialog = false;
          this.newFolderForm.name = "";
          this.isLoading = true;
          this.$router.push({
            name: "folder",
            params: { folderId: response.id },
          });
        }
      );
    },
    renameFolder(newName) {
      const requestBody = { display_name: newName };
      RestApiClient.updateFolder(this.folder, requestBody).then(() => {
        this.folder.display_name = newName;
        this.showRenameFolderDialog = false;
      });
    },
    renameFolderFromWorkflow(newName) {
      // Only rename the folder if it is untitled
      if (this.folder.display_name === "Untitled workflow") {
        this.renameFolder(newName);
        return;
      }
      return;
    },
    shareFolder() {
      RestApiClient.shareFolder(
        this.folder.id,
        this.selectedGroups,
        this.selectedGroupsRole,
        this.selectedUsers,
        this.selectedUsersRole
      ).then(() => {
        this.getFolder();
        this.selectedGroups = [];
        this.selectedUsers = [];
        this.selectedGroupsRole = "Editor";
        this.selectedUsersRole = "Editor";
        this.showSharingDialog = false;
      });
    },
    renameWorkflow() {
      this.renameWorkflowFromStore(this.newWorkflowNameForm.displayName);
      this.currentWorkflow.display_name = this.newWorkflowNameForm.displayName;
      this.showRenameWorkflowDialog = false;
      this.newWorkflowNameForm.displayName = "";
    },
    deleteUserRole(userRoleId) {
      RestApiClient.deleteUserRole(this.folder.id, userRoleId).then(() => {
        this.getFolder();
      });
    },
    deleteGroupRole(groupRoleId) {
      RestApiClient.deleteGroupRole(this.folder.id, groupRoleId).then(() => {
        this.getFolder();
      });
    },
    refreshFileListing() {
      RestApiClient.getFiles(this.folderId).then((response) => {
        this.files = response;
      });
    },
    getFolder() {
      this.isLoading = true;
      RestApiClient.getFolder(this.folderId)
        .then((response) => {
          this.folder = response;
          this.newFolderNameForm.displayName = this.folder.display_name;
          if (this.folder.workflows.length) {
            this.loadWorkflowData(this.folder.id, this.folder.workflows[0].id);
            this.newWorkflowNameForm.displayName =
              this.folder.workflows[0].display_name;
          }
          RestApiClient.getFiles(this.folderId).then((response) => {
            this.files = response;
          });
          RestApiClient.getFolders(this.folderId)
            .then((response) => {
              this.folders = response;
            })
            .then(() => {
              this.isLoading = false;
            });
        })
        .then(() => {
          this.getMyFolderRole(this.folderId);
        })
        .catch((error) => {
          if (error.status === 403) {
            this.isLoading = false;
            this.no_access = true;
          }
        });
    },
    getMyFolderRole(folderId) {
      RestApiClient.getMyFolderRole(folderId).then((response) => {
        this.myRole = response;
      });
    },
    createWorkflow(templateId = null) {
      RestApiClient.createWorkflow(
        this.selectedFiles.map((file) => file.id),
        this.folder.id,
        templateId
      ).then((response) => {
        this.$router.push({
          name: "folder",
          params: { folderId: response.folder.id },
        });
      });
    },
    deleteWorkflow() {
      RestApiClient.deleteFolder(this.folder).then(() => {
        this.$router.push({
          name: "folder",
          params: { folderId: this.folder.parent.id },
        });
      });
    },
    async copyWorkflowAndRedirect() {
      const response = await this.copyWorkflow();
      this.$router.push({
        name: "folder",
        params: { folderId: response.folder.id },
      });
    },
    async runWorkflowAndRefresh() {
      await this.runWorkflow();
      // Update local workflow state from store without triggering full reload/layout reset
      if (
        this.currentWorkflow &&
        this.storeWorkflow &&
        this.currentWorkflow.id === this.storeWorkflow.id
      ) {
        Object.assign(this.currentWorkflow, this.storeWorkflow);
      }
      this.refreshFileListing();
    },
    async generateReport() {
      if (!this.currentWorkflow) return;
      this.isGeneratingReport = true;
      try {
        const response = await RestApiClient.generateWorkflowReport(
          this.currentWorkflow.id
        );
        this.workflowReportMarkdown = response;
        this.showWorkflowReportDialog = true;
      } catch (error) {
        console.error("Failed to generate workflow report:", error);
        this.$eventBus.emit("showSnackbar", {
          message: "Failed to generate workflow report",
          color: "error",
        });
      } finally {
        this.isGeneratingReport = false;
      }
    },
    async saveWorkflowAsTemplate() {
      await this.createWorkflowTemplate(this.newTemplateForm.displayName);
      this.showNewTemplateDialog = false;
      this.newTemplateForm.displayName = "";
    },
    showUploadError(message) {
      this.showUpload = false;
      this.$eventBus.emit("showSnackbar", {
        message: message.message.detail + ": " + message.file.fileName,
        color: "error",
      });
    },
    handleContentResize(height) {
      // Add 60px to account for the toolbar and bottom button row
      this.workflowHeight = height + 60;
    },
  },
  mounted() {
    this.isLoading = true;
    this.getFolder();
    this.$eventBus.on("clear-selected-files", () => {
      this.selectedFiles = [];
    });
  },
  watch: {
    "$route.params": function () {
      this.getFolder();
    },
  },
};
</script>

<style>
.workflow-card {
  background-color: #0f172a; /* Default (Dark) */
  color: #e2e8f0;
}

.light-theme.workflow-card {
  background-color: #f5f5f5 !important;
  color: #0f172a !important;
}

.full-screen-canvas {
  position: fixed !important;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  width: 100vw !important;
  border-radius: 0 !important;
}

/* Background Grid Effect */
.grid-bg {
  /* Default (Dark) grid color */
  --grid-color: rgba(148, 163, 184, 0.05);

  background-size: 20px 20px;
  background-image: linear-gradient(
      to right,
      var(--grid-color) 1px,
      transparent 1px
    ),
    linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px);
}

.v-theme--light .grid-bg {
  /* Light theme grid color */
  --grid-color: rgba(0, 0, 0, 0.05);
}

.pulsate-text {
  animation: pulsate 2s infinite;
  font-style: italic;
  opacity: 0.8;
}

@keyframes pulsate {
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.5;
  }
}
</style>
