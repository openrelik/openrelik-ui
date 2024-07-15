<template>
  <!-- New folder dialog -->
  <v-dialog v-model="showNewFolderDialog" width="400">
    <v-card width="400" class="mx-auto">
      <v-card-title>New folder</v-card-title>
      <div class="pa-4">
        <v-form @submit.prevent="createFolder()" @keyup.enter="createFolder()">
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

  <!-- Folder -->
  <v-hover v-slot="{ isHovering, props }">
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

  <!-- Button row -->
  <div class="mt-3">
    <v-btn
      v-if="!isWorkflowFolder"
      variant="outlined"
      class="text-none custom-border-color"
      prepend-icon="mdi-folder-plus-outline"
      @click="showNewFolderDialog = true"
      >New folder</v-btn
    >
    <v-btn
      v-if="!isWorkflowFolder"
      variant="outlined"
      class="text-none mx-2 custom-border-color"
      prepend-icon="mdi-upload"
      @click="showUpload = !showUpload"
      >Upload files</v-btn
    >
    <v-menu v-if="files.length">
      <template v-slot:activator="{ props }">
        <v-btn
          :variant="selectedFiles.length ? 'flat' : 'outlined'"
          :color="selectedFiles.length ? 'info' : 'default'"
          :class="selectedFiles.length ? '' : 'custom-border-color'"
          class="text-none"
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
      <v-card-title v-if="isWorkflowFolder && files.length" class="ml-n4 mt-3">
        Workflow results
      </v-card-title>

      <folder-list
        :items="items"
        :is-loading="isLoading"
        :folder="folder"
        @file-deleted="removeFile($event)"
        @selected-files="selectedFiles = $event"
      ></folder-list>
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
      selectedFiles: [],
      showUpload: false,
      showNewFolderDialog: false,
      showRenameFolderDialog: false,
      newFolderForm: {
        name: "",
      },
      newFolderNameForm: {
        displayName: "",
      },
      isLoading: false,
      appStore: useAppStore(),
    };
  },
  computed: {
    items() {
      return this.folders.concat(this.files);
    },
    isWorkflowFolder() {
      if (!this.folder.workflows) {
        return;
      }
      return this.folder.workflows.length;
    },
  },
  methods: {
    removeFile(file_to_remove) {
      this.files = this.files.filter((file) => file.id != file_to_remove.id);
    },
    updateFilesArray(newFiles) {
      for (const file in newFiles) {
        this.files.unshift(newFiles[file]);
      }
      this.showUpload = false;
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
    refreshFileListing() {
      RestApiClient.getFiles(this.folderId).then((response) => {
        this.files = response;
      });
    },
    getFolder() {
      RestApiClient.getFolder(this.folderId).then((response) => {
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
