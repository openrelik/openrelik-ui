<!--
Copyright 2025 Google LLC

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
    <v-data-table-server
      :headers="headers"
      :items="rootFolders.folders"
      :items-length="rootFolders.total_count"
      :items-per-page="rootFolders.page_size"
      :loading="isLoading"
      :items-per-page-options="[10, 20, 40, 80, 100, 500]"
      item-key="uuid"
      disable-sort
      return-object
      style="background-color: transparent"
      @update:options="getFolders($event.page, $event.itemsPerPage)"
    >
      <!-- Display name -->
      <template v-slot:item.display_name="{ item: folder }">
        <v-icon
          v-if="folder.workflows.length"
          class="mr-3 mt-n1"
          color="blue-grey"
        >
          mdi-folder-play</v-icon
        >
        <v-icon
          v-else-if="folder.user.id !== currentUser.id"
          class="mr-3 mt-n1"
          color="info"
        >
          mdi-folder-account</v-icon
        >
        <v-icon v-else class="mr-3 mt-n1" color="info">mdi-folder</v-icon>

        <router-link
          style="text-decoration: none; color: inherit"
          :to="{ name: 'folder', params: { folderId: folder.id } }"
        >
          {{ folder.display_name }}
        </router-link>
      </template>

      <!-- Time -->
      <template v-slot:item.updated_at="{ item: folder }">
        <span :title="folder.updated_at">{{
          $filters.formatTime(folder.updated_at)
        }}</span>
      </template>

      <!-- Owner -->
      <template v-slot:item.user="{ item: folder }">
        <profile-picture
          :user="folder.user"
          :title="folder.user.display_name"
          size="30"
        />
      </template>

      <!-- Actions -->
      <template v-slot:item.actions="{ item: folder }">
        <v-btn
          v-if="folder.user.id === currentUser.id"
          icon
          variant="flat"
          size="small"
          @click="deleteFolder(folder)"
        >
          <v-icon size="small"> mdi-trash-can-outline </v-icon>
        </v-btn>
      </template>
    </v-data-table-server>
  </div>
</template>

<script>
import RestApiClient from "@/RestApiClient";
import ProfilePicture from "./ProfilePicture.vue";
import { useUserStore } from "@/stores/user";

export default {
  name: "FolderList",
  props: {
    rootFolders: Object,
    isLoading: Boolean,
  },
  components: {
    ProfilePicture,
  },
  data() {
    return {
      userStore: useUserStore(),
      currentPage: null,
      headers: [
        { title: "Name", key: "display_name" },
        { title: "Owner", key: "user" },
        { title: "Last modified", key: "updated_at" },
        { title: "Actions", key: "actions", sortable: false, width: "140px" },
      ],
    };
  },
  computed: {
    currentUser() {
      return this.userStore.user;
    },
  },
  methods: {
    getFolders(page, itemsPerPage) {
      if (!this.currentPage) {
        this.currentPage = page;
        return;
      }
      this.$emit("get-folders", { page, itemsPerPage });
    },
    deleteFolder(item_to_delete) {
      if (confirm("Are you sure you want to delete this folder?")) {
        RestApiClient.deleteFolder(item_to_delete).then(() => {
          this.$emit("folder-deleted", item_to_delete);
        });
      }
    },
  },
};
</script>
