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
    <v-form @submit.prevent>
      <div v-if="showUploadProgress">
        <h3 class="ml-4">Uploading..</h3>
        <div class="pa-4">
          <template
            v-for="file in filesInProgress"
            :key="file.uniqueIdentifier"
          >
            <div class="mb-2">
              {{ file.fileName }} ({{ Math.ceil(file.progress) }}%)
            </div>
            <v-progress-linear v-model="file.progress" height="10">
            </v-progress-linear>
            <br />
          </template>
        </div>
      </div>
      <div v-else>
        <h3 class="mb-4">Upload files</h3>
        <v-file-input
          ref="fileInput"
          v-model="files"
          show-size
          prepend-icon=""
          prepend-inner-icon="mdi-upload"
          label="Choose files to upload"
          variant="outlined"
          hide-details
          multiple
        ></v-file-input>
        <v-btn
          :disabled="!files.length"
          variant="text"
          type="submit"
          color="primary"
          class="text-none mt-3"
          @click="uploadFiles"
          >Upload
        </v-btn>
        <v-btn
          variant="text"
          class="text-none mt-3"
          @click="$emit('close-dialog')"
          >Cancel
        </v-btn>
      </div>
    </v-form>
  </div>
</template>

<script>
import RestApiClient from "@/RestApiClient";
import settings from "@/settings.js";
import Resumable from "resumablejs";
import { v4 as uuidv4 } from "uuid";

export default {
  name: "UploadFile ",
  props: {
    folderId: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      files: [],
      filesInProgress: [],
      showUploadProgress: false,
      resumable: null,
    };
  },
  mounted() {
    const csrfToken = sessionStorage.getItem("csrfToken");
    const baseURL = settings.apiServerUrl + "/api/" + settings.apiServerVersion;
    this.resumable = new Resumable({
      target: baseURL + "/files/upload", // Your FastAPI endpoint
      query: { folder_id: this.folderId },
      chunkSize: 10 * 1024 * 1024, // 10MB chunks
      // Disable chunk integrity checks.
      // TODO: Implement check for already uploaded chunks to support resuming uploads.
      // This need a uniq identifier that is something else than a uuidv4() because
      // the identifier need to be reproducable between browser reloads.
      // Idea: Pre-create a File in the database and use the UUID or ID of that.
      testChunks: false,
      withCredentials: true,
      headers: { "X-CSRF-Token": csrfToken },
      generateUniqueIdentifier: (file, event) => {
        // TODO: Change this to support testChunks as described above.
        return uuidv4();
      },
    });

    this.resumable.on("fileAdded", (file) => {
      const fileProgressObject = {
        fileName: file.fileName,
        progress: file.progress() * 100,
        isComplete: file.isComplete(),
        uniqueIdentifier: file.uniqueIdentifier,
      };
      this.filesInProgress.push(fileProgressObject);
      this.showUploadProgress = true;
      this.resumable.upload();
    });

    this.resumable.on("fileProgress", (file) => {
      const fileProgressObject = {
        fileName: file.fileName,
        progress: file.progress() * 100,
        isComplete: file.isComplete(),
        uniqueIdentifier: file.uniqueIdentifier,
      };

      const index = this.filesInProgress.findIndex(
        (item) => item.uniqueIdentifier === file.uniqueIdentifier
      );

      if (index !== -1) {
        // Replace the existing object
        this.filesInProgress.splice(index, 1, fileProgressObject);
      } else {
        // Add the new object to the array
        this.filesInProgress.push(fileProgressObject);
      }
    });

    this.resumable.on("complete", (event) => {
      this.$emit("close-dialog");
      this.showUploadProgress = false;
    });

    this.resumable.on("fileSuccess", (file, message) => {
      this.$emit("file-uploaded");
    });

    this.resumable.on("fileError", (file, message) => {
      console.error("File upload error:", file.fileName, message);
    });

    this.resumable.assignBrowse(this.$refs.fileInput.$el);
  },
  methods: {
    uploadFiles() {
      this.resumable.addFiles(this.files);
    },
  },
};
</script>
