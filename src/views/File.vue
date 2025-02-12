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
  <div v-if="file">
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
    </v-breadcrumbs>

    <span style="display: flex; align-items: center">
      <v-icon class="mr-2">mdi-file-outline</v-icon>
      <h2>{{ file.display_name }}</h2>
    </span>

    <div v-if="file.is_deleted">
      <v-alert
        type="error"
        text="This file has been deleted"
        icon="mdi-alert"
        class="mt-3"
      ></v-alert>
    </div>

    <div v-else>
      <!-- Button row -->
      <div class="mt-3">
        <!-- Download -->
        <v-btn
          variant="outlined"
          class="text-none mr-2 custom-border-color"
          prepend-icon="mdi-download"
          @click="downloadFileTab()"
          >Download</v-btn
        >

        <!-- Create workflow -->
        <v-menu>
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
      </div>

      <!-- Tabs -->
      <div class="mt-4">
        <v-tabs v-model="activeTab">
          <v-tab
            v-for="tab in tabs"
            :key="tab.value"
            :value="tab.value"
            class="text-none"
            @click="updateRoute(tab.routeName)"
            >{{ tab.name }}</v-tab
          >
        </v-tabs>
        <v-tabs-window v-model="activeTab">
          <v-tabs-window-item
            :value="0"
            :transition="false"
            :reverse-transition="false"
          >
            <!-- Details -->
            <v-card variant="outlined" class="mt-4 custom-border-color">
              <v-toolbar
                :color="$vuetify.theme.name === 'dark' ? '' : 'grey-lighten-4'"
                density="compact"
              >
                <v-toolbar-title
                  style="font-size: 18px"
                  text="Basic properties"
                >
                </v-toolbar-title>
              </v-toolbar>
              <v-divider></v-divider>

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
          <v-tabs-window-item
            :value="1"
            :transition="false"
            :reverse-transition="false"
          >
            <!-- Content-->
            <v-btn
              v-if="
                systemConfig.active_llms.length &&
                isTextFormat &&
                file.summaries &&
                !file.summaries.length &&
                file.filesize < genAISizeLimit
              "
              variant="outlined"
              class="text-none mt-4 custom-border-color ai-background-color"
              @click="generateFileSummary()"
            >
              <v-icon class="mr-2">mdi-shimmer</v-icon>
              Generate AI summary</v-btn
            >
            <!-- File summary -->
            <file-summary
              v-for="summary in file.summaries"
              :initial-summary="summary"
            ></file-summary>
            <!-- File content iframe -->
            <v-card variant="outlined" class="mt-4 custom-border-color">
              <v-toolbar
                :color="$vuetify.theme.name === 'dark' ? '' : 'grey-lighten-4'"
                density="compact"
              >
                <v-toolbar-title style="font-size: 18px">
                  File content
                  <v-btn
                    v-if="allowedPreview"
                    variant="text"
                    size="small"
                    class="ml-3 text-none"
                    :text="showFilePreview ? 'Raw' : 'Preview'"
                    @click="showFilePreview = !showFilePreview"
                  >
                  </v-btn>
                </v-toolbar-title>
              </v-toolbar>
              <v-divider></v-divider>

              <div
                style="width: 100%; overflow: hidden"
                v-if="isTextFormat && file.filesize < fileSizeLimit"
              >
                <iframe
                  sandbox
                  :src="
                    getIframeSrc({ unsafe: allowedPreview && showFilePreview })
                  "
                  frameborder="0"
                  scrolling="yes"
                  style="width: 100%; height: 65vh"
                ></iframe>
              </div>
              <div v-else>
                <v-card-text>
                  <div style="font-family: monospace">
                    <strong v-if="file.filesize > fileSizeLimit">
                      The selected file exceeds the maximum size allowed for
                      preview.
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
                </v-card-text>
              </div>
            </v-card>
          </v-tabs-window-item>

          <!-- Workflows -->
          <v-tabs-window-item
            :value="2"
            :transition="false"
            :reverse-transition="false"
          >
            <v-card
              v-if="!file.workflows.length"
              variant="outlined"
              class="mt-4 custom-border-color"
            >
              <v-toolbar
                :color="$vuetify.theme.name === 'dark' ? '' : 'grey-lighten-4'"
                density="compact"
              >
                <v-toolbar-title style="font-size: 18px">
                  Workflows
                </v-toolbar-title>
              </v-toolbar>
              <v-divider></v-divider>
              <v-card-text style="font-family: monospace">
                <strong>
                  This file doesn't have any associated workflows yet.</strong
                >
                <br />
                Let's
                <span
                  style="text-decoration: underline; cursor: pointer"
                  @click="createWorkflow()"
                  >create one</span
                >
                to get started.
              </v-card-text>
            </v-card>

            <span style="font-family: monospace"></span>
            <workflow
              v-for="workflow in file.workflows"
              :key="workflow.id"
              :initial-workflow="workflow"
              :show-controls="false"
              class="mt-4"
            ></workflow>
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
  },
  data() {
    return {
      appStore: useAppStore(),
      file: null,
      fileContent: null,
      showFilePreview: true,
      fileContentLoading: false,
      workflows: [],
      fileSizeLimit: 10485760,
      genAISizeLimit: 1048576,
      activeTab: null,
      tabs: [
        {
          name: "Details",
          value: "0",
          routeName: "fileDetails",
          route: "details",
        },
        {
          name: "Content",
          value: "1",
          routeName: "fileContent",
          route: "content",
        },
        {
          name: "Workflows",
          value: "2",
          routeName: "fileWorkflows",
          route: "workflows",
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
        "text/plain",
        "text/html",
        "application/json",
        "text/csv",
        "application/javascript",
      ];
      return textFileTypes.includes(this.file.magic_mime);
    },
    allowedPreview() {
      // Render unescaped HTML content in sandboxed iframe if data_type is in server side
      // provided allowlist and magic_mime is text/html.
      return this.systemConfig.allowed_data_types_preview.includes(
        this.file.data_type
      );
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
    generateFileSummary() {
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
      RestApiClient.getFile(this.fileId).then((response) => {
        this.file = response;
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
