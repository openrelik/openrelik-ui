<template>
  <div>
    <v-form @submit.prevent>
      <div v-if="showUploadProgress">
        <h3 class="ml-4">
          Uploading..
          {{ uploadProgressPercent.toFixed(0) + "%" }}
        </h3>
        <div class="pa-4">
          <v-progress-linear v-model="uploadProgressPercent" height="10">
          </v-progress-linear>
        </div>
      </div>
      <div v-else>
        <h3 class="mb-4">Upload files</h3>
        <v-file-input
          v-model="file"
          show-size
          prepend-icon=""
          prepend-inner-icon="mdi-upload"
          label="Choose files to upload"
          variant="outlined"
          hide-details
          density="compact"
          multiple
        ></v-file-input>
        <v-btn
          :disabled="!file"
          variant="text"
          type="submit"
          color="primary"
          class="text-none mt-3"
          @click="uploadInventoryFile()"
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
      file: null,
      uploadProgressPercent: 0,
      showUploadProgress: false,
    };
  },
  computed: {},
  methods: {
    uploadInventoryFile() {
      let formData = new FormData();
      for (const file of this.file) {
        formData.append("files", file);
      }
      formData.append("folder_id", this.folderId);

      let config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          this.uploadProgressPercent = progressEvent.progress * 100;
        },
      };
      this.showUploadProgress = true;

      RestApiClient.createFileProgress(formData, config).then((response) => {
        this.$emit("file-uploaded", response);
        this.file = null;
        this.showUploadProgress = false;
        this.progressPercent = 0;
      });
    },
  },
};
</script>
