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
    <v-data-table
      :headers="isHomeView ? homeViewHeaders : headers"
      :items="items"
      :loading="isLoading"
      v-model="selectedFiles"
      disable-sort
      item-key="uuid"
      item-selectable="selectable"
      items-per-page="100"
      select-strategy="all"
      no-data-text="No files or folders to show"
      return-object
      style="background-color: transparent"
      @input="$emit('selected-files', selectedFiles)"
    >
      <!-- Prepend with ".." to navigate to parent folder -->
      <template v-slot:body.prepend v-if="folder">
        <tr>
          <td>
            <router-link
              v-if="folder.parent"
              style="text-decoration: none; color: inherit"
              :to="{ name: 'folder', params: { folderId: folder.parent.id } }"
            >
              <v-icon color="info" class="mr-2 mt-n1">mdi-folder</v-icon> ..
            </router-link>
            <router-link
              v-else
              style="text-decoration: none; color: inherit"
              :to="{ name: 'home' }"
            >
              <v-icon color="info" class="mr-2 mt-n1">mdi-folder</v-icon>
              ..
            </router-link>
          </td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </template>

      <!-- Display name -->
      <template v-slot:item.display_name="{ item: item }">
        <span v-if="item.filesize">
          <v-icon class="mr-2 mt-n1">mdi-file-outline</v-icon>
          <router-link
            style="text-decoration: none; color: inherit"
            :to="{ name: 'file', params: { fileId: item.id } }"
          >
            {{ item.display_name }}
          </router-link>
        </span>
        <span v-else>
          <!-- TODO: Consider different icon if it is a workflow folder. -->
          <v-icon v-if="!item.has_workflows" class="mr-3 mt-n1" color="info">
            mdi-folder</v-icon
          >
          <v-icon v-if="item.has_workflows" class="mr-3 mt-n1" color="info">
            mdi-folder</v-icon
          >

          <router-link
            style="text-decoration: none; color: inherit"
            :to="{ name: 'folder', params: { folderId: item.id } }"
          >
            {{ item.display_name }}
          </router-link>
        </span>
      </template>

      <!-- Time -->
      <template v-slot:item.filesize="{ item: file }">
        <span v-if="file.filesize" :title="file.filesize">{{
          $filters.formatBytes(file.filesize)
        }}</span>
      </template>

      <!-- Only show select box for files. -->
      <template
        v-slot:item.data-table-select="{ item, isSelected, toggleSelect }"
      >
        <v-checkbox-btn
          v-if="item && item.filesize"
          :model-value="isSelected({ value: item })"
          @update:model-value="toggleSelect({ value: item })"
        >
        </v-checkbox-btn>
      </template>

      <!-- Filesize -->
      <template v-slot:item.created_at="{ item }">
        <span :title="item.created_at">{{
          $filters.formatTime(item.created_at)
        }}</span>
      </template>

      <!-- Owner -->
      <template v-slot:item.user="{ item: file }">
        <v-avatar size="30" :title="file.user.name">
          <v-img
            :src="file.user.picture"
            referrerpolicy="no-referrer"
            alt="Profile Picture"
          ></v-img>
        </v-avatar>
      </template>

      <!-- Actions -->
      <template v-slot:item.actions="{ item }">
        <v-btn small icon flat @click="deleteInventoryItem(item)">
          <v-icon size="small"> mdi-trash-can-outline </v-icon>
        </v-btn>
      </template>
    </v-data-table>
  </div>
</template>

<script>
import RestApiClient from "@/RestApiClient";

export default {
  name: "FolderList",
  props: {
    items: Array,
    isLoading: Boolean,
    folder: Object,
    isHomeView: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      selectedFiles: [],
      headers: [
        { title: "Name", key: "display_name" },
        { title: "", key: "data-table-select" },
        { title: "Created", key: "created_at" },
        { title: "Size", key: "filesize" },
        { title: "Type", key: "magic_mime" },
        { title: "Owner", key: "user" },
        { title: "Actions", key: "actions", sortable: false, width: "140px" },
      ],
      homeViewHeaders: [
        { title: "Name", key: "display_name" },
        { title: "Created", key: "created_at" },
        { title: "Owner", key: "user" },
        { title: "Actions", key: "actions", sortable: false, width: "140px" },
      ],
    };
  },
  computed: {},
  methods: {
    deleteInventoryItem(item_to_delete) {
      if (item_to_delete.filesize) {
        if (confirm("Are you sure you want to delete this file?")) {
          RestApiClient.deleteFile(item_to_delete).then(() => {
            this.$emit("file-deleted", item_to_delete);
          });
        }
      } else {
        if (confirm("Are you sure you want to delete this folder?")) {
          RestApiClient.deleteFolder(item_to_delete).then(() => {
            this.$emit("folder-deleted", item_to_delete);
          });
        }
      }
    },
    selectItem(item, isSelected) {
      const index = this.selectedFiles.findIndex(
        (selectedItem) => selectedItem.uuid === item.uuid
      );

      if (index > -1) {
        this.selectedFiles.splice(index, 1);
      } else {
        this.selectedFiles.push(item);
      }
    },
  },
  mounted() {
    this.$eventBus.on("clear-selected-files", () => {
      this.selectedFiles = [];
    });
  },
};
</script>
