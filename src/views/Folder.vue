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
          @close-dialog="this.showUpload = false"
        ></upload-file>
      </div>
    </v-card>
  </v-dialog>

  <!-- Add cloud disk dialog -->
  <v-dialog v-if="isCloudEnabled" v-model="showAddCloudDisk" width="800">
    <v-card width="800" class="mx-auto">
      <v-card-text>
        <h3>Add cloud disk</h3>
        <v-list-subheader class="mb-4">
          <v-icon size="small" color="success" class="mt-n1"
            >mdi-check-circle-outline</v-icon
          >
          Connected to
          <strong>{{ systemConfig.active_cloud.display_name }}</strong>
          on project
          <strong>{{ systemConfig.active_cloud.project_name }}</strong> in zone
          <strong>{{ systemConfig.active_cloud.zone }}</strong>
        </v-list-subheader>
        <v-form @submit.prevent="addCloudDisk">
          <v-text-field
            v-model="newCloudDiskName"
            label="Enter cloud disk name"
            variant="outlined"
            required
          ></v-text-field>
          <v-btn
            :disabled="!newCloudDiskName"
            type="submit"
            color="primary"
            variant="text"
            class="text-none"
            >Add</v-btn
          >
          <v-btn
            variant="text"
            class="text-none"
            @click="
              newCloudDiskName = '';
              showAddCloudDisk = false;
            "
            >Cancel</v-btn
          >
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Share folder dialog -->
  <v-dialog v-model="showSharingDialog" width="400">
    <v-card width="500" class="mx-auto">
      <v-card-title class="mt-1">Share folder</v-card-title>
      <div class="pa-4">
        <v-row no-gutters="">
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

  <v-breadcrumbs density="compact" class="ml-n4 mt-n1">
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
    <v-icon class="mr-3" color="info">mdi-folder</v-icon>
    <v-hover v-if="!folder.is_deleted" v-slot="{ isHovering, props }">
      <h2 v-bind="props" @dblclick="showRenameFolderDialog = true">
        {{ folder.display_name }}
        <v-icon
          v-if="isHovering"
          size="x-small"
          @click="showRenameFolderDialog = !showRenameFolderDialog"
          >mdi-pencil</v-icon
        >
      </h2>
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
  <div v-if="no_access">You don't have access to this folder.</div>
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
      <v-btn
        v-if="!isWorkflowFolder && isCloudEnabled && canEdit"
        variant="outlined"
        class="text-none mr-2 custom-border-color"
        prepend-icon="mdi-cloud-plus-outline"
        @click="showAddCloudDisk = !showAddCloudDisk"
        >Add cloud disk</v-btn
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
    </div>

    <div class="mt-4">
      <workflow
        v-for="workflow in folder.workflows"
        :key="workflow.id"
        :initial-workflow="workflow"
        :show-controls="true"
        @workflow-updated="refreshFileListing()"
        @workflow-deleted="deleteWorkflow()"
        @workflow-renamed="renameFolder($event)"
      >
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
import RestApiClient from "@/RestApiClient";
import { useAppStore } from "@/stores/app";
import FolderList from "@/components/FolderList";
import UploadFile from "@/components/UploadFile";
import Breadcrumbs from "@/components/Breadcrumbs";
import Workflow from "@/components/Workflow.vue";
import _ from "lodash";

export default {
  name: "folder",
  components: {
    FolderList,
    UploadFile,
    Breadcrumbs,
    Workflow,
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
      selectedFiles: [],
      showUpload: false,
      showAddCloudDisk: false,
      showNewFolderDialog: false,
      showRenameFolderDialog: false,
      showSharingDialog: false,
      newCloudDiskName: "",
      newFolderForm: {
        name: "",
      },
      newFolderNameForm: {
        displayName: "",
      },
      isLoading: false,
      no_access: false,
      appStore: useAppStore(),
      selectedUsers: [],
      selectedUsersRole: "Editor",
      selectedGroups: [],
      selectedGroupsRole: "Editor",
      searchUserResult: [],
    };
  },
  computed: {
    systemConfig() {
      return this.appStore.systemConfig;
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
    isCloudEnabled() {
      if (!this.systemConfig) {
        return;
      }
      return Object.keys(this.systemConfig.active_cloud).length > 0;
    },
    canEdit() {
      return this.myRole.role === "Owner" || this.myRole.role === "Editor";
    },
    isOwner() {
      return this.myRole.role === "Owner";
    },
  },
  methods: {
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
    getMyFolderRole(folderID) {
      RestApiClient.getMyFolderRole(this.folderId).then((response) => {
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
    addCloudDisk() {
      RestApiClient.createCloudDiskFile(
        this.newCloudDiskName,
        this.folder.id
      ).then((response) => {
        this.refreshFileListing();
      });
      this.showAddCloudDisk = false;
      this.newCloudDiskName = "";
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
