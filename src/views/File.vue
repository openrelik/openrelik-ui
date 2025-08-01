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
  <div v-if="file" style="height: calc(100vh - 100px)" class="mt-n5">
    <v-breadcrumbs density="compact" class="ml-n4 mt-n1">
      <small>
        <v-breadcrumbs-item :to="{ name: 'home' }"> Home </v-breadcrumbs-item>
        <v-breadcrumbs-divider v-if="file.folder"></v-breadcrumbs-divider>
        <breadcrumbs :folder="file.folder"></breadcrumbs>
        <v-breadcrumbs-divider v-if="file.folder"></v-breadcrumbs-divider>
        <v-breadcrumbs-item style="opacity: 0.5">
          {{ file.display_name }}
        </v-breadcrumbs-item>
      </small>
      <v-spacer></v-spacer>

      <v-btn icon flat>
        <v-icon
          size="small"
          @click="fullscreen = !fullscreen"
          :icon="fullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
        ></v-icon>
      </v-btn>
      <v-btn icon flat>
        <v-icon
          size="small"
          @click="showChat = !showChat"
          icon="mdi-star-four-points"
        ></v-icon>
      </v-btn>
    </v-breadcrumbs>

    <!-- Display name -->
    <div
      v-if="!fullscreen"
      style="display: flex; align-items: center"
      class="mt-n2"
    >
      <v-icon class="mr-2">mdi-file-outline</v-icon>
      <h3>{{ file.display_name }}</h3>
    </div>

    <!-- Show if file is deleted -->
    <div v-if="file.is_deleted">
      <v-alert
        type="error"
        text="This file has been deleted"
        icon="mdi-alert"
        class="mt-3"
      ></v-alert>
    </div>

    <div v-else>
      <!-- Tabs -->
      <div class="mt-2">
        <v-tabs v-if="!fullscreen" v-model="activeTab" class="mb-4">
          <v-tab
            v-for="tab in tabs"
            :key="tab.value"
            :value="tab.value"
            class="text-none"
            @click="updateRoute(tab.routeName)"
            >{{ tab.name }}</v-tab
          >
          <!-- Button row -->
          <div class="mt-2 ml-5">
            <!-- Create workflow -->
            <v-menu v-if="canEdit">
              <template v-slot:activator="{ props }">
                <v-btn
                  variant="flat"
                  class="text-none mr-2 custom-border-color"
                  prepend-icon="mdi-plus"
                  append-icon="mdi-chevron-down"
                  v-bind="props"
                  >Create workflow
                </v-btn>
              </template>
              <v-card width="400">
                <v-list>
                  <v-list-item @click="createWorkflow()">
                    <v-list-item-title>
                      <v-icon size="small" style="margin-top: -3px" class="mr-1"
                        >mdi-plus</v-icon
                      >
                      <strong>New workflow</strong></v-list-item-title
                    >
                  </v-list-item>
                  <div v-if="appStore.workflowTemplates.length">
                    <v-divider></v-divider>
                    <v-list-subheader
                      v-if="appStore.workflowTemplates.length"
                      class="mt-2"
                      >Templates</v-list-subheader
                    >

                    <v-list-item
                      @click="createWorkflow(template.id)"
                      v-for="template in appStore.workflowTemplates"
                      :key="template.id"
                    >
                      <v-list-item-title>
                        <v-icon>mdi-plus</v-icon> {{ template.display_name }}
                      </v-list-item-title>
                    </v-list-item>
                  </div>
                </v-list>
              </v-card>
            </v-menu>
            <!-- Download -->
            <v-btn
              variant="outlined"
              class="text-none mr-2 custom-border-color"
              prepend-icon="mdi-download"
              @click="downloadFileTab()"
              >Download</v-btn
            >
          </div>
        </v-tabs>

        <v-tabs-window v-model="activeTab">
          <!-- Content-->
          <v-tabs-window-item
            :value="0"
            :transition="false"
            :reverse-transition="false"
          >
            <div
              v-if="file.filesize > fileSizeLimit || !isTextFormat"
              style="font-family: monospace; font-size: 0.9em"
              class="ml-4"
            >
              <strong v-if="file.filesize > fileSizeLimit">
                The selected file exceeds the maximum size allowed for preview.
              </strong>
              <strong v-else>
                This file format isn't currently supported for preview.
              </strong>
              <br />
              To examine the file, please
              <span
                style="text-decoration: underline; cursor: pointer"
                @click="downloadFileTab()"
                >download</span
              >
              it to your local machine.
            </div>

            <!-- File content iframe -->
            <v-row>
              <v-col :cols="showChat && canGenerateSummary ? 8 : 12">
                <v-card
                  v-if="isTextFormat && file.filesize < fileSizeLimit"
                  variant="outlined"
                  class="custom-border-color d-flex flex-column"
                  :style="{ height: `calc(100vh - ${headerHeight}px)` }"
                >
                  <!-- File summary -->
                  <div class="pt-4 px-4">
                    <file-summary
                      v-for="summary in file.summaries"
                      :initial-summary="summary"
                    ></file-summary>
                  </div>

                  <iframe
                    sandbox
                    :src="
                      getIframeSrc({
                        unsafe: allowedPreview && showFilePreview,
                      })
                    "
                    frameborder="0"
                    scrolling="yes"
                    style="width: 100%; height: 100%"
                  ></iframe>
                </v-card>
              </v-col>
              <v-col cols="4" v-show="showChat && canGenerateSummary">
                <v-card
                  variant="outlined"
                  class="custom-border-color d-flex flex-column"
                  :style="{ height: `calc(100vh - ${headerHeight}px)` }"
                >
                  <v-toolbar color="transparent" density="compact" height="60">
                    <v-toolbar-title style="font-size: 18px">
                      <v-icon size="small" class="mr-2"
                        >mdi-star-four-points</v-icon
                      >
                      Assistant
                    </v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-btn icon size="small" @click="showChat = false">
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </v-toolbar>
                  <!-- <v-divider></v-divider> -->
                  <file-chat :file="file"></file-chat>
                </v-card>
              </v-col>
            </v-row>
          </v-tabs-window-item>

          <!-- Details -->
          <v-tabs-window-item
            :value="1"
            :transition="false"
            :reverse-transition="false"
          >
            <v-card variant="outlined" class="custom-border-color">
              <v-table density="compact">
                <tbody>
                  <tr>
                    <td>MD5</td>
                    <td>{{ file.hash_md5 }}</td>
                  </tr>
                  <tr>
                    <td>SHA-1</td>
                    <td>{{ file.hash_sha1 }}</td>
                  </tr>
                  <tr>
                    <td>SHA-256</td>
                    <td>{{ file.hash_sha256 }}</td>
                  </tr>
                  <tr>
                    <td>Data type</td>
                    <td>{{ file.data_type }}</td>
                  </tr>
                  <tr>
                    <td>MIME type</td>
                    <td>{{ file.magic_mime }}</td>
                  </tr>
                  <tr>
                    <td>Magic</td>
                    <td>{{ file.magic_text }}</td>
                  </tr>
                  <tr>
                    <td>File size</td>
                    <td>
                      {{ $filters.formatBytes(file.filesize) }}
                      <small>({{ file.filesize }} bytes)</small>
                    </td>
                  </tr>
                  <tr v-if="file.source_file">
                    <td>Source File</td>
                    <td>
                      <router-link
                        style="color: inherit"
                        :to="{
                          name: 'file',
                          params: {
                            fileId: file.source_file.id,
                            folderId: file.source_file.folder_id,
                          },
                        }"
                      >
                        {{ file.source_file.display_name }}
                      </router-link>
                    </td>
                  </tr>
                  <tr v-if="file.original_path">
                    <td>Original Path</td>
                    <td>{{ file.original_path }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card>
          </v-tabs-window-item>
        </v-tabs-window>
      </div>
    </div>
  </div>
</template>

<script>
import { useAppStore } from "@/stores/app";
import RestApiClient from "@/RestApiClient";
import ProcessingResult from "@/components/ProcessingResult.vue";
import TaskResultDefault from "@/components/TaskResultDefault.vue";
import TaskStatusIcon from "@/components/TaskStatusIcon.vue";
import WorkflowTree from "@/components/WorkflowTree.vue";
import Breadcrumbs from "@/components/Breadcrumbs.vue";
import Workflow from "@/components/Workflow.vue";
import FileSummary from "@/components/FileSummary.vue";
import FileChat from "@/components/FileChat.vue";
import settings from "@/settings";

export default {
  name: "File",
  props: {
    fileId: String,
  },
  components: {
    ProcessingResult,
    TaskResultDefault,
    TaskStatusIcon,
    WorkflowTree,
    Breadcrumbs,
    Workflow,
    FileSummary,
    FileChat,
  },
  data() {
    return {
      appStore: useAppStore(),
      myRole: { role: "" },
      file: null,
      fileContent: null,
      showFilePreview: true,
      fileContentLoading: false,
      fileSizeLimit: 10485760,
      genAISizeLimit: 2097152,
      activeTab: null,
      fullscreen: false,
      showChat: true,
      tabs: [
        {
          name: "Content",
          value: "0",
          routeName: "fileContent",
          route: "content",
        },
        {
          name: "Details",
          value: "1",
          routeName: "fileDetails",
          route: "details",
        },
      ],
    };
  },
  computed: {
    systemConfig() {
      return this.appStore.systemConfig;
    },
    isTextFormat() {
      const textFileTypes = [
        "application/json",
        "application/javascript",
        "application/x-ndjson",
      ];

      // Check if magic_mime starts with "text/" or is included in the specific application file types
      return (
        this.file.magic_mime.startsWith("text/") ||
        textFileTypes.includes(this.file.magic_mime)
      );
    },
    allowedPreview() {
      // Render unescaped HTML content in sandboxed iframe if data_type is in server side
      // provided allowlist and magic_mime is text/html.
      return this.systemConfig.allowed_data_types_preview.includes(
        this.file.data_type
      );
    },
    canEdit() {
      return this.myRole.role === "Owner" || this.myRole.role === "Editor";
    },
    isOwner() {
      return this.myRole.role === "Owner";
    },
    canGenerateSummary() {
      return (
        this.systemConfig.active_llms.length &&
        this.isTextFormat &&
        this.file.filesize < this.genAISizeLimit
      );
    },
    AIisEnabled() {
      return (
        this.systemConfig.active_llms.length &&
        this.file.filesize < this.genAISizeLimit
      );
    },
    headerHeight() {
      return this.fullscreen ? 156 : 240;
    },
  },

  methods: {
    getIframeSrc(options = {}) {
      let url =
        settings.apiServerUrl +
        "/api/v1/files/" +
        this.file.id +
        "/content?theme=" +
        this.$vuetify.theme.name;

      if (options.unsafe) {
        url += "&unescaped=true";
      }

      return url;
    },
    getFileFolderRole() {
      RestApiClient.getMyFolderRole(this.file.folder.id).then((response) => {
        this.myRole = response;
      });
    },
    generateFileSummary() {
      if (!this.canGenerateSummary) {
        return;
      }
      if (this.file.summaries && this.file.summaries.length) {
        return;
      }
      RestApiClient.generateFileSummary(this.file.id).then((response) => {
        RestApiClient.getFile(this.fileId).then((response) => {
          this.file = response;
        });
      });
    },
    downloadFileBlob() {
      RestApiClient.downloadFileBlob(this.file.id).then((response) => {
        const disposition = response.headers.get("Content-Disposition");
        let fileName = disposition.split(/;(.+)/)[1].split(/=(.+)/)[1];
        fileName = fileName.replaceAll('"', "");
        const fileURL = window.URL.createObjectURL(new Blob([response.data]));
        const fileLink = document.createElement("a");
        fileLink.href = fileURL;
        fileLink.setAttribute("download", fileName);
        document.body.appendChild(fileLink);
        fileLink.click();
        fileLink.remove();
      });
    },
    downloadFileTab() {
      const downloadUrl =
        settings.apiServerUrl +
        "/api/v1/files/" +
        this.file.id +
        "/download_stream";
      window.open(downloadUrl);
    },
    updateRoute(routeName) {
      this.$router.replace({
        name: routeName,
        params: { fileId: this.file.id },
      });
    },
    setActiveTab() {
      const tabIndex = this.tabs.findIndex(
        (tab) => tab.routeName === this.$route.name
      );
      this.activeTab = tabIndex;
    },
    createWorkflow(templateId = null) {
      RestApiClient.createWorkflow(
        [this.file.id],
        this.file.folder.id,
        templateId
      ).then((response) => {
        this.$router.push({
          name: "folder",
          params: { folderId: response.folder.id },
        });
      });
    },
    fetchFileData() {
      RestApiClient.getFile(this.fileId)
        .then((response) => {
          this.file = response;
          this.generateFileSummary();
        })
        .then(() => {
          this.getFileFolderRole();
        });
    },
  },
  mounted() {
    this.fetchFileData();
    this.setActiveTab();
  },
  watch: {
    $route(to, from) {
      // Fetch new file data when fileId changes
      if (to.params.fileId !== from.params.fileId) {
        this.fetchFileData();
      }
    },
  },
};
</script>
