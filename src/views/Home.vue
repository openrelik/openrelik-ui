<template>
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

  <v-card variant="flat" color="transparent">
    <v-btn
      variant="outlined"
      class="text-none custom-border-color"
      prepend-icon="mdi-folder-plus-outline"
      @click="showNewFolderDialog = true"
      >New folder</v-btn
    >
  </v-card>
  <folder-list :items="folders" :is-home-view="true"></folder-list>
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
  },
  mounted() {
    RestApiClient.getRootFolders().then((response) => {
      this.folders = response;
    });
  },
};
</script>
