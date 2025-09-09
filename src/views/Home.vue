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
    <v-row align="center">
      <v-col cols="auto">
        <v-btn
          variant="outlined"
          class="text-none custom-border-color mt-2"
          style="height: 40px"
          prepend-icon="mdi-folder-plus-outline"
          @click="showNewFolderDialog = true"
          >New folder</v-btn
        >
      </v-col>
      <v-col cols="6">
        <v-text-field
          v-model="searchTerm"
          variant="outlined"
          density="compact"
          label="Search folders"
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
          class="mt-2"
          @keyup.enter="getFolders()"
        ></v-text-field>
      </v-col>
    </v-row>
    <br />
    <div v-if="folders.total_count">
      <folder-list-root
        :root-folders="folders"
        @folder-deleted="removeFolder($event)"
        @get-folders="getFolders($event.page, $event.itemsPerPage)"
      ></folder-list-root>
    </div>
  </v-card>
</template>

<script>
import RestApiClient from "@/RestApiClient";
import FolderListRoot from "@/components/FolderListRoot";
import UploadFile from "@/components/UploadFile";

export default {
  name: "home",
  components: {
    FolderListRoot,
    UploadFile,
  },
  data() {
    return {
      folders: [],
      showNewFolderDialog: false,
      newFolderForm: {
        name: "",
      },
      searchTerm: "",
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
        this.folders.folders.unshift(response);
        this.$router.push({
          name: "folder",
          params: { folderId: response.id },
        });
      });
    },
    removeFolder(folder_to_remove) {
      this.folders.folders = this.folders.folders.filter(
        (folder) => folder.id != folder_to_remove.id
      );
    },
    getFolders(page = null, itemsPerPage = null) {
      this.folders = {};
      if (this.searchTerm) {
        this.$router.push({ query: { q: this.searchTerm } });
      } else {
        this.$router.push({ query: {} });
      }
      RestApiClient.getAllFolders(this.searchTerm, page, itemsPerPage).then(
        (response) => {
          this.folders = response;
        }
      );
    },
  },
  watch: {
    searchTerm(newVal) {
      // Only call getFolders when the search term is cleared
      // AND a 'q' query parameter exists in the URL
      if (newVal === null && this.$route.query.q) {
        this.getFolders();
      }
    },
  },
  mounted() {
    if (this.$route.query.q) {
      this.searchTerm = this.$route.query.q;
    }
    this.getFolders();
    // If there is a URL parameter 'redirect' then redirect the user to it. This will
    // preserve any URL that the user clicked when not authenticated. When the user has
    // authenticated they will be redirected to the original location they were trying
    // to access. The 'redirect' parameter is set in the Login view.
    const redirect_url = sessionStorage.getItem("redirect_url");
    if (redirect_url) {
      this.$router.replace(redirect_url);
      sessionStorage.removeItem("redirect_url");
    }
  },
};
</script>
