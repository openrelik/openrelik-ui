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
    <!-- Chat Assistant panel -->
    <v-navigation-drawer
      v-if="canChat && !isSqlFormat"
      :width="sidePanelWidth"
      color="background"
      permanent
      location="right"
      v-model="showChat"
    >
      <v-divider></v-divider>
      <v-card
        variant="flat"
        class="d-flex flex-column"
        style="height: calc(100vh - 65px)"
      >
        <v-toolbar color="transparent">
          <v-toolbar-title style="font-size: 18px">
            <v-icon size="small" class="mr-2">mdi-star-four-points</v-icon>
            Assistant
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-icon
            @click="sidePanelWidth = sidePanelWidth > 450 ? 450 : 650"
            variant="text"
            size="small"
            :icon="
              sidePanelWidth > 450 ? 'mdi-arrow-collapse' : 'mdi-arrow-expand'
            "
            class="mr-5"
          >
          </v-icon>

          <v-icon
            @click.stop="showChat = false"
            variant="text"
            size="small"
            icon="mdi-close"
            class="mr-5"
          >
          </v-icon>
        </v-toolbar>
        <file-chat :file="file"></file-chat>
      </v-card>
    </v-navigation-drawer>

    <!-- Breadcrumbs navigation -->
    <v-breadcrumbs density="compact" class="ml-n4 mt-n3">
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
      <v-icon
        v-if="!showChat && canChat"
        variant="text"
        icon="mdi-star-four-points"
        size="small"
        @click.stop="showChat = !showChat"
      ></v-icon>
    </v-breadcrumbs>

    <!-- Display name -->
    <div style="display: flex; align-items: center">
      <v-icon class="mr-2 ml-n1">mdi-file-outline</v-icon>
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

    <!-- Main content with tab navigation -->

    <div v-else class="mt-2">
      <!-- Tabs -->
      <v-tabs v-model="activeTab" class="mb-2">
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
        <!-- Tab 1 Content -->
        <v-tabs-window-item
          value="0"
          :transition="false"
          :reverse-transition="false"
        >
          <!-- Unsupported file message -->
          <div
            v-if="
              (file.filesize > fileSizeLimit || !isTextFormat) && !isSqlFormat
            "
            style="font-family: monospace; font-size: 0.9em"
            class="mt-2"
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

          <!-- AI summary -->
          <div v-if="canGenerateSummary" class="mt-2">
            <file-summary
              v-for="summary in file.summaries"
              :initial-summary="summary"
            ></file-summary>
          </div>

          <!-- File content -->
          <v-card
            v-if="isTextFormat && file.filesize < fileSizeLimit"
            variant="flat"
            :style="{
              height: `calc(100vh - 215px - ${AIisEnabled ? '80' : '25'}px)`,
            }"
            style="background: transparent"
            class="mt-4"
          >
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

          <!-- SQL viewer -->
          <v-card
            v-if="isSqlFormat"
            class="custom-border-color mt-2"
            variant="outlined"
            :style="{
              height: `calc(100vh - 220px - ${AIisEnabled ? '75' : '10'}px)`,
            }"
          >
            <v-toolbar color="transparent" density="compact">
              <v-icon class="mx-4">mdi-database</v-icon>
              <v-tabs v-model="activeSqlTab">
                <v-tab class="text-none" :value="0">Query</v-tab>
                <v-tab class="text-none" :value="1">Tables & Schemas</v-tab>
              </v-tabs>
            </v-toolbar>
            <v-divider></v-divider>

            <v-tabs-window v-model="activeSqlTab">
              <v-tabs-window-item
                :value="0"
                :transition="false"
                :reverse-transition="false"
              >
                <div
                  :style="{
                    height: `calc(100vh - 220px - ${
                      AIisEnabled ? '130' : '60'
                    }px)`,
                  }"
                  style="overflow: auto"
                >
                  <v-text-field
                    v-if="AIisEnabled"
                    v-model="naturalLanguageQuery"
                    class="ma-3 mt-5"
                    label="Ask a question about the data in this database"
                    variant="outlined"
                    density="compact"
                    append-inner-icon="mdi-send"
                    hide-details
                    :disabled="sqlIsGenerating"
                    @click:append-inner="generateSQLQuery()"
                    @keyup.enter="generateSQLQuery()"
                  >
                  </v-text-field>
                  <v-textarea
                    v-model="sqlQuery"
                    class="ma-3 mt-5"
                    label="SQL query"
                    rows="1"
                    variant="outlined"
                    auto-grow
                    autofocus
                    hide-details
                    :loading="sqlIsGenerating"
                    :disabled="sqlIsGenerating"
                  ></v-textarea>
                  <div class="ma-3">
                    <v-btn
                      variant="flat"
                      size="small"
                      color="info"
                      class="text-none"
                      prepend-icon="mdi-play"
                      :disabled="!sqlQuery || sqlIsGenerating"
                      @click="runSQLQuery()"
                      >Run</v-btn
                    >
                    <v-menu v-if="Object.keys(sqlSchemas).length">
                      <template v-slot:activator="{ props }">
                        <v-btn
                          variant="outlined"
                          size="small"
                          class="text-none ml-2 custom-border-color"
                          append-icon="mdi-chevron-down"
                          v-bind="props"
                          prepend-icon="mdi-table"
                          >Sample data sets
                        </v-btn>
                      </template>
                      <v-card>
                        <v-list class="pa-0">
                          <v-list-item
                            v-for="(value, key, index) in sqlSchemas"
                            :key="index"
                            :title="key"
                            :value="value"
                            prepend-icon="mdi-table"
                            @click="
                              sqlQuery = `SELECT * FROM ${key} USING SAMPLE 10 ROWS;`;
                              runSQLQuery();
                            "
                          >
                          </v-list-item>
                        </v-list>
                      </v-card>
                    </v-menu>
                  </div>
                  <v-divider></v-divider>

                  <v-alert
                    v-if="sqlError"
                    color="error"
                    variant="tonal"
                    class="mt-3 mx-2"
                    >{{ sqlError }}
                  </v-alert>

                  <v-data-table
                    v-if="!sqlError"
                    :items="sqlResult"
                    class="text-none"
                    density="compact"
                    hover
                    :loading="sqlQueryIsRunning"
                  ></v-data-table>
                </div>
              </v-tabs-window-item>

              <v-tabs-window-item
                :value="1"
                :transition="false"
                :reverse-transition="false"
              >
                <div
                  :style="{
                    height: `calc(100vh - 200px - ${
                      AIisEnabled ? '145' : '80'
                    }px)`,
                  }"
                >
                  <sql-tables :schemas="sqlSchemas"></sql-tables>
                </div>
              </v-tabs-window-item>
            </v-tabs-window>
          </v-card>
        </v-tabs-window-item>

        <!-- Tab 2 Details -->
        <v-tabs-window-item
          value="1"
          :transition="false"
          :reverse-transition="false"
        >
          <v-card
            variant="outlined"
            class="custom-border-color mt-2"
            max-width="800"
          >
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
import SqlTables from "@/components/SqlTables.vue";
import settings from "@/settings";
import { useUserSettings } from "@/composables/useUserSettings";

export default {
  name: "File",
  setup() {
    const { settings: userSettings } = useUserSettings();
    return { userSettings };
  },
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
    SqlTables,
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
      activeSqlTab: 0,
      showChat: true,
      sidePanelWidth: 450,
      sqlQuery: "",
      sqlResult: [],
      sqlError: "",
      sqlSchemas: {},
      sqlGenerateRequest: "",
      sqlIsGenerating: false,
      sqlQueryIsRunning: false,
      naturalLanguageQuery: "",
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
    isSqlFormat() {
      const magicText = this.file.magic_text.toLowerCase();
      const containsSqlDb =
        magicText.includes("sqlite") || magicText.includes("duckdb");
      return containsSqlDb;
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
    isFileCompatibleWithAI() {
      if (!this.systemConfig.active_llms.length) {
        return false;
      }
      // For SQL files, we can always generate a summary, ignoring the file size.
      if (this.isSqlFormat) {
        return true;
      }
      // For other text-based files, we must check the size limit.
      return this.isTextFormat && this.file.filesize < this.genAISizeLimit;
    },
    canGenerateSummary() {
      return (
        this.userSettings.AIEnabled &&
        this.userSettings.AIFileSummaries &&
        this.isFileCompatibleWithAI
      );
    },
    canChat() {
      return (
        this.userSettings.AIEnabled &&
        this.userSettings.AIFileChat &&
        this.isFileCompatibleWithAI
      );
    },
    AIisEnabled() {
      return (
        this.systemConfig.active_llms.length && this.userSettings.AIEnabled
      );
    },
    firstSQLTable() {
      const tableNames = Object.keys(this.sqlSchemas);
      return tableNames.length ? tableNames[0] : null;
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
          if (this.isSqlFormat) {
            RestApiClient.getSQLSchemas(this.fileId)
              .then((response) => {
                this.sqlSchemas = response.schemas;
                this.sqlQuery = this.firstSQLTable
                  ? `SELECT * FROM ${this.firstSQLTable} USING SAMPLE 10 ROWS;`
                  : "";
                this.runSQLQuery();
              })

              .catch((error) => {});
          }
        })
        .then(() => {
          this.getFileFolderRole();
        });
    },
    runSQLQuery() {
      if (!this.sqlQuery) {
        return;
      }
      this.sqlResult = [];
      this.sqlError = "";
      this.sqlQueryIsRunning = true;
      RestApiClient.runSQLQuery(this.file.id, this.sqlQuery)
        .then((response) => {
          this.sqlResult = response.result;
          this.sqlQueryIsRunning = false;
        })
        .catch((error) => {
          this.sqlError =
            error.response.data.detail || "Error running SQL query";
          this.sqlQueryIsRunning = false;
        });
    },
    generateSQLQuery() {
      if (!this.naturalLanguageQuery) {
        return;
      }
      this.sqlIsGenerating = true;
      this.sqlResult = [];
      this.sqlQuery = "";
      RestApiClient.generateSQLQuery(this.file.id, this.naturalLanguageQuery)
        .then((response) => {
          // Clean up the generated query by removing code block markers and newlines.
          // TODO: Remove when this is fixed in the backend.
          this.sqlQuery = response.generated_query
            .replace(/^```\w*\s*|\s*```$|\n/g, " ")
            .trim();
          this.sqlIsGenerating = false;
          this.runSQLQuery();
        })
        .catch((error) => {
          this.sqlIsGenerating = false;
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
