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
  <v-dialog v-model="dialog" width="700">
    <v-card>
      <v-toolbar color="transparent" density="compact">
        <v-btn icon variant="flat" @click="dialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>External storages</v-toolbar-title>
        <v-spacer />
        <v-btn
          variant="text"
          class="text-none mr-2"
          prepend-icon="mdi-plus"
          @click="showCreateForm = !showCreateForm"
          >Add storage</v-btn
        >
      </v-toolbar>
      <v-divider />

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        density="compact"
        closable
        class="ma-4"
        @click:close="errorMessage = ''"
        >{{ errorMessage }}</v-alert
      >

      <!-- Create form -->
      <v-expand-transition>
        <div v-if="showCreateForm" class="pa-4 pb-0">
          <v-card variant="outlined" class="pa-4 mb-2">
            <v-row dense>
              <v-col cols="4">
                <v-text-field
                  v-model="createForm.name"
                  label="Name *"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model="createForm.mountPoint"
                  label="Mount point *"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model="createForm.description"
                  label="Description"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>
            <div class="mt-3">
              <v-btn
                variant="flat"
                color="primary"
                class="text-none mr-2"
                :disabled="!createForm.name || !createForm.mountPoint"
                @click="createDatastore()"
                >Create</v-btn
              >
              <v-btn
                variant="text"
                class="text-none"
                @click="showCreateForm = false; resetCreateForm()"
                >Cancel</v-btn
              >
            </div>
          </v-card>
        </div>
      </v-expand-transition>

      <!-- Datastores table -->
      <v-table density="compact" class="ma-4">
        <thead>
          <tr>
            <th>Name</th>
            <th>Mount point</th>
            <th>Description</th>
            <th style="width: 96px">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="4" class="text-center py-4">Loading...</td>
          </tr>
          <tr v-else-if="!datastores.length">
            <td colspan="4" class="text-center py-4">
              No external storages configured.
            </td>
          </tr>
          <tr v-for="ds in datastores" :key="ds.name">
            <td>{{ ds.name }}</td>
            <td>
              <span v-if="editingName !== ds.name">{{ ds.mount_point }}</span>
              <v-text-field
                v-else
                v-model="editForm.mountPoint"
                variant="underlined"
                density="compact"
                hide-details
                style="min-width: 180px"
              />
            </td>
            <td>
              <span v-if="editingName !== ds.name">{{ ds.description }}</span>
              <v-text-field
                v-else
                v-model="editForm.description"
                variant="underlined"
                density="compact"
                hide-details
                style="min-width: 160px"
              />
            </td>
            <td>
              <template v-if="editingName !== ds.name">
                <v-btn
                  icon
                  variant="flat"
                  size="small"
                  @click="startEdit(ds)"
                >
                  <v-icon size="small">mdi-pencil-outline</v-icon>
                </v-btn>
                <v-btn
                  icon
                  variant="flat"
                  size="small"
                  @click="deleteDatastore(ds.name)"
                >
                  <v-icon size="small">mdi-trash-can-outline</v-icon>
                </v-btn>
              </template>
              <template v-else>
                <v-btn
                  icon
                  variant="flat"
                  size="small"
                  @click="saveEdit(ds.name)"
                >
                  <v-icon size="small">mdi-check</v-icon>
                </v-btn>
                <v-btn
                  icon
                  variant="flat"
                  size="small"
                  @click="editingName = null"
                >
                  <v-icon size="small">mdi-close</v-icon>
                </v-btn>
              </template>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-dialog>
</template>

<script>
import RestApiClient from "@/RestApiClient";

export default {
  name: "ExternalStorageManager",
  data() {
    return {
      dialog: false,
      datastores: [],
      isLoading: false,
      errorMessage: "",
      showCreateForm: false,
      createForm: { name: "", mountPoint: "", description: "" },
      editingName: null,
      editForm: { mountPoint: "", description: "" },
    };
  },
  methods: {
    open() {
      this.dialog = true;
      this.loadDatastores();
    },
    loadDatastores() {
      this.isLoading = true;
      RestApiClient.getDatastores()
        .then((data) => {
          this.datastores = data;
        })
        .catch(() => {
          this.errorMessage = "Failed to load datastores.";
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    resetCreateForm() {
      this.createForm = { name: "", mountPoint: "", description: "" };
    },
    createDatastore() {
      const { name, mountPoint, description } = this.createForm;
      RestApiClient.createDatastore(name, mountPoint, description)
        .then((ds) => {
          this.datastores.push(ds);
          this.showCreateForm = false;
          this.resetCreateForm();
        })
        .catch((err) => {
          this.errorMessage =
            err?.response?.data?.detail || "Failed to create datastore.";
        });
    },
    startEdit(ds) {
      this.editingName = ds.name;
      this.editForm = {
        mountPoint: ds.mount_point,
        description: ds.description || "",
      };
    },
    saveEdit(name) {
      const requestBody = {
        mount_point: this.editForm.mountPoint,
        description: this.editForm.description,
      };
      RestApiClient.updateDatastore(name, requestBody)
        .then((updated) => {
          const idx = this.datastores.findIndex((d) => d.name === name);
          if (idx !== -1) this.datastores[idx] = updated;
          this.editingName = null;
        })
        .catch((err) => {
          this.errorMessage =
            err?.response?.data?.detail || "Failed to update datastore.";
        });
    },
    deleteDatastore(name) {
      if (!confirm(`Delete external storage "${name}"?`)) return;
      RestApiClient.deleteDatastore(name)
        .then(() => {
          this.datastores = this.datastores.filter((d) => d.name !== name);
        })
        .catch((err) => {
          const status = err?.response?.status;
          if (status === 409) {
            this.errorMessage = `Cannot delete "${name}": files are still linked to this storage.`;
          } else {
            this.errorMessage =
              err?.response?.data?.detail || "Failed to delete datastore.";
          }
        });
    },
  },
  expose: ["open"],
};
</script>
