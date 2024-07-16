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
    <h2>{{ file.display_name }}</h2>
    <v-breadcrumbs density="compact" class="ml-n4 mb-2 mt-n1">
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
            color="info"
            class="text-none"
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
              <v-toolbar-title style="font-size: 18px">
                Basic properties
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
                <!-- Disabled until implemented
                <tr>
                  <td>SSDEEP</td>
                  <td></td>
                </tr>
                -->
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
            v-if="isTextFormat && file.summaries && !file.summaries.length"
            variant="outlined"
            class="text-none mt-4 custom-border-color"
            @click="generateFileSummary()"
          >
            <v-icon class="mr-2">mdi-shimmer</v-icon>
            Generate summary</v-btn
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
              </v-toolbar-title>
            </v-toolbar>
            <v-divider></v-divider>

            <div
              style="width: 100%; overflow: hidden"
              v-if="isTextFormat && file.filesize < fileSizeLimit"
            >
              <iframe
                :src="getIframeSrc()"
                frameborder="0"
                scrolling="yes"
                style="width: 100%; height: 65vh"
              ></iframe>
            </div>
            <div v-else>
              <v-card-text>
                <div style="font-family: monospace">
                  <strong v-if="file.filesize > fileSizeLimit">
                    The file you've selected is too large to preview
                  </strong>
                  <strong v-else>
                    This file type is not currently supported for preview
                  </strong>

                  <br />
                  <span
                    style="text-decoration: underline; cursor: pointer"
                    @click="downloadFileTab()"
                    >Download</span
                  >
                  the file to your computer.
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
          <workflow
            v-for="workflow in file.workflows"
            :key="workflow.id"
            :initial-workflow="workflow"
            :show-controls="false"
          ></workflow>
        </v-tabs-window-item>
      </v-tabs-window>
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
      file: null,
      fileContent: null,
      fileContentLoading: false,
      workflows: [],
      appStore: useAppStore(),
      activeTab: null,
      fileSizeLimit: 10485760,
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
      ];
      return textFileTypes.includes(this.file.magic_mime);
    },
  },

  methods: {
    getIframeSrc() {
      return (
        settings.apiServerUrl +
        "/api/v1/files/" +
        this.file.id +
        "/content?theme=" +
        this.$vuetify.theme.name
      );
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
  },
  mounted() {
    RestApiClient.getFile(this.fileId).then((response) => {
      this.file = response;
    });
    this.setActiveTab();
  },
};
</script>
