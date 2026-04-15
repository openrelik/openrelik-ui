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
  <v-dialog v-model="dialog" width="650">
    <v-card>
      <v-card-title>Add from external storage</v-card-title>
      <div class="pa-4">
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          density="compact"
          closable
          class="mb-4"
          @click:close="errorMessage = ''"
          >{{ errorMessage }}</v-alert
        >

        <v-form @submit.prevent @keyup.enter="submit()">
          <v-select
            v-model="form.datastoreName"
            :items="datastores"
            item-title="name"
            item-value="name"
            label="External storage *"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
            @update:model-value="onDatastoreSelected"
          />
          <div
            v-if="datastores.length === 0 && !isLoadingDatastores"
            class="text-caption text-medium-emphasis mb-3"
          >
            No external storages configured. Add one via Settings → External Storages.
          </div>

          <!-- File browser -->
          <div
            v-if="form.datastoreName"
            class="browser-container mb-3"
          >
            <!-- Breadcrumbs -->
            <div class="browser-breadcrumbs d-flex align-center flex-wrap pa-2">
              <span
                class="breadcrumb-item text-caption"
                :class="{ 'text-primary': true }"
                style="cursor: pointer"
                @click="browseTo('')"
              >{{ form.datastoreName }}</span>
              <template v-for="(segment, index) in breadcrumbSegments" :key="index">
                <v-icon size="x-small" class="mx-1">mdi-chevron-right</v-icon>
                <span
                  class="breadcrumb-item text-caption"
                  :class="index === breadcrumbSegments.length - 1 ? 'text-medium-emphasis' : 'text-primary'"
                  :style="index < breadcrumbSegments.length - 1 ? 'cursor: pointer' : ''"
                  @click="index < breadcrumbSegments.length - 1 && browseTo(segment.path)"
                >{{ segment.name }}</span>
              </template>
            </div>

            <v-divider />

            <!-- Item list -->
            <div class="browser-list" style="min-height: 200px; max-height: 280px; overflow-y: auto">
              <div
                v-if="browserLoading"
                class="d-flex justify-center align-center"
                style="height: 200px"
              >
                <v-progress-circular indeterminate size="24" />
              </div>
              <div
                v-else-if="browserError"
                class="pa-3 text-caption text-error"
              >{{ browserError }}</div>
              <div
                v-else-if="browserItems.length === 0"
                class="pa-3 text-caption text-medium-emphasis"
              >Empty directory</div>
              <v-list v-else density="compact" class="pa-0">
                <v-list-item
                  v-for="item in browserItems"
                  :key="item.name"
                  :class="[
                    'browser-item',
                    item.type === 'file' && selectedFile && selectedFile.name === item.name && selectedFile.path === resolvedItemPath(item)
                      ? 'browser-item--selected'
                      : ''
                  ]"
                  :title="item.name"
                  :subtitle="item.type === 'file' && item.size !== null ? formatBytes(item.size) : undefined"
                  :prepend-icon="item.type === 'directory' ? 'mdi-folder' : 'mdi-file-outline'"
                  :prepend-icon-color="item.type === 'directory' ? 'info' : undefined"
                  style="cursor: pointer"
                  @click="onItemClick(item)"
                />
              </v-list>
            </div>
          </div>

          <div v-if="selectedFile" class="text-caption text-medium-emphasis mb-3">
            Selected: <strong>{{ selectedFile.path }}</strong>
          </div>

          <v-text-field
            v-model="form.displayName"
            label="Display name (optional)"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
          />
          <v-text-field
            v-model="form.extension"
            label="Extension (optional)"
            variant="outlined"
            density="compact"
            class="mb-4"
            hide-details
            placeholder="e.g. .img"
          />
        </v-form>

        <v-btn
          variant="flat"
          color="primary"
          class="text-none mr-2"
          :disabled="!form.datastoreName || !selectedFile || isSubmitting"
          :loading="isSubmitting"
          @click="submit()"
          >Add file</v-btn
        >
        <v-btn variant="text" class="text-none" @click="dialog = false"
          >Cancel</v-btn
        >
      </div>
    </v-card>
  </v-dialog>
</template>

<script>
import RestApiClient from "@/RestApiClient";

export default {
  name: "AddExternalFileDialog",
  props: {
    folderId: {
      type: String,
      required: true,
    },
  },
  emits: ["file-added"],
  data() {
    return {
      dialog: false,
      datastores: [],
      isLoadingDatastores: false,
      errorMessage: "",
      isSubmitting: false,
      browserItems: [],
      browserPath: "",
      browserLoading: false,
      browserError: "",
      selectedFile: null,
      form: {
        datastoreName: null,
        displayName: "",
        extension: "",
      },
    };
  },
  computed: {
    breadcrumbSegments() {
      if (!this.browserPath) return [];
      const parts = this.browserPath.split("/").filter(Boolean);
      return parts.map((name, index) => ({
        name,
        path: parts.slice(0, index + 1).join("/"),
      }));
    },
  },
  methods: {
    open() {
      this.dialog = true;
      this.errorMessage = "";
      this.browserItems = [];
      this.browserPath = "";
      this.browserError = "";
      this.selectedFile = null;
      this.form = {
        datastoreName: null,
        displayName: "",
        extension: "",
      };
      this.isLoadingDatastores = true;
      RestApiClient.getDatastores()
        .then((data) => {
          this.datastores = data;
        })
        .catch(() => {
          this.errorMessage = "Failed to load datastores.";
        })
        .finally(() => {
          this.isLoadingDatastores = false;
        });
    },
    onDatastoreSelected() {
      this.browserPath = "";
      this.browserItems = [];
      this.browserError = "";
      this.selectedFile = null;
      this.browseTo("");
    },
    browseTo(path) {
      this.browserPath = path;
      this.browserLoading = true;
      this.browserError = "";
      this.selectedFile = null;
      RestApiClient.browseDatastore(this.form.datastoreName, path)
        .then((data) => {
          this.browserPath = data.current_path || path;
          this.browserItems = data.items || [];
        })
        .catch(() => {
          this.browserError = "Failed to load directory contents.";
          this.browserItems = [];
        })
        .finally(() => {
          this.browserLoading = false;
        });
    },
    resolvedItemPath(item) {
      return this.browserPath ? this.browserPath + "/" + item.name : item.name;
    },
    onItemClick(item) {
      if (item.type === "directory") {
        this.browseTo(this.resolvedItemPath(item));
      } else {
        const filePath = this.resolvedItemPath(item);
        this.selectedFile = { name: item.name, path: filePath, size: item.size };
      }
    },
    formatBytes(bytes) {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    },
    submit() {
      if (!this.form.datastoreName || !this.selectedFile) return;
      this.isSubmitting = true;
      this.errorMessage = "";
      RestApiClient.registerExternalFile(
        this.form.datastoreName,
        this.folderId,
        this.selectedFile.path,
        this.form.displayName || undefined,
        this.form.extension || undefined,
      )
        .then((file) => {
          this.$emit("file-added", file);
          this.dialog = false;
        })
        .catch((err) => {
          const status = err?.response?.status;
          const detail = err?.response?.data?.detail;
          if (status === 404) {
            this.errorMessage = `File not found at path "${this.selectedFile.path}" in the selected storage.`;
          } else if (status === 400) {
            this.errorMessage =
              detail ||
              "Invalid path (check for directory traversal or directory paths).";
          } else {
            this.errorMessage = detail || "Failed to register external file.";
          }
        })
        .finally(() => {
          this.isSubmitting = false;
        });
    },
  },
  expose: ["open"],
};
</script>

<style scoped>
.browser-container {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
}

.browser-breadcrumbs {
  background-color: rgba(var(--v-theme-surface-variant), 0.4);
}

.browser-item--selected {
  background-color: rgba(var(--v-theme-primary), 0.12);
}
</style>
