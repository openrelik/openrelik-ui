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
  <v-dialog v-model="dialog" width="500">
    <v-card>
      <v-card-title>Mount external storage</v-card-title>
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
          />

          <v-text-field
            v-model="form.basePath"
            label="Base path (optional)"
            variant="outlined"
            density="compact"
            class="mb-4"
            hide-details
            placeholder="e.g. cases/2024"
            hint="Path within the storage to use as root. Leave empty for the storage root."
          />
        </v-form>

        <v-btn
          variant="flat"
          color="primary"
          class="text-none mr-2"
          :disabled="!form.datastoreName || isSubmitting"
          :loading="isSubmitting"
          @click="submit()"
          >Mount</v-btn
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
  name: "MountExternalStorageDialog",
  props: {
    folder: {
      type: Object,
      required: true,
    },
  },
  emits: ["mounted"],
  data() {
    return {
      dialog: false,
      datastores: [],
      errorMessage: "",
      isSubmitting: false,
      form: {
        datastoreName: null,
        basePath: "",
      },
    };
  },
  methods: {
    open() {
      this.dialog = true;
      this.errorMessage = "";
      this.form = {
        datastoreName: this.folder.external_storage_name || null,
        basePath: this.folder.external_base_path || "",
      };
      RestApiClient.getDatastores()
        .then((data) => {
          this.datastores = data;
        })
        .catch(() => {
          this.errorMessage = "Failed to load datastores.";
        });
    },
    submit() {
      if (!this.form.datastoreName) return;
      this.isSubmitting = true;
      this.errorMessage = "";
      RestApiClient.updateFolder(this.folder, {
        external_storage_name: this.form.datastoreName,
        external_base_path: this.form.basePath || null,
      })
        .then((updatedFolder) => {
          this.$emit("mounted", updatedFolder);
          this.dialog = false;
        })
        .catch((err) => {
          const detail = err?.response?.data?.detail;
          this.errorMessage = detail || "Failed to mount external storage.";
        })
        .finally(() => {
          this.isSubmitting = false;
        });
    },
  },
  expose: ["open"],
};
</script>
