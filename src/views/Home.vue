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

  <v-card variant="flat" color="transparent">
    <v-btn
      variant="outlined"
      class="text-none custom-border-color"
      prepend-icon="mdi-folder-plus-outline"
      @click="showNewFolderDialog = true"
      >New folder</v-btn
    >
  </v-card>
  <folder-list
    :items="folders"
    :is-home-view="true"
    @folder-deleted="removeFolder($event)"
  ></folder-list>
</template>

<script>
import RestApiClient from "@/RestApiClient";
import FolderList from "@/components/FolderList";
import UploadFile from "@/components/UploadFile";

export default {
  name: "home",
  components: {
    FolderList,
    UploadFile,
  },
  data() {
    return {
      folders: [],
      showNewFolderDialog: false,
      newFolderForm: {
        name: "",
      },
    };
  },
  computed: {},
  methods: {
    createFolder() {
      if (this.newFolderForm.name === "") {
        return;
      }
      RestApiClient.createFolder(this.newFolderForm.name).then((response) => {
        this.showNewFolderDialog = false;
        this.newFolderForm.name = "";
        this.folders.unshift(response);
        this.$router.push({
          name: "folder",
          params: { folderId: response.id },
        });
      });
    },
    removeFolder(folder_to_remove) {
      this.folders = this.folders.filter(
        (folder) => folder.id != folder_to_remove.id
      );
    },
  },

  mounted() {
    RestApiClient.getRootFolders().then((response) => {
      this.folders = response;
    });
  },
};
</script>
