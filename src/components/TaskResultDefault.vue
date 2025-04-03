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
  <div v-if="task.status_short === 'PROGRESS'">
    {{ statusProgress }}
  </div>
  <div variant="outlined" v-if="task.status_short === 'SUCCESS'">
    <v-card-text>
      <template v-for="(value, key) in result">
        <ul v-if="attributesToRender.includes(key) && value">
          <strong>{{ $filters.capitalizeFirstLetter(key) }}:</strong>
          {{
            value
          }}
        </ul>
      </template>
      <ul>
        <strong>Runtime:</strong>
        {{
          task.runtime.toFixed(1)
        }}
        seconds
      </ul>

      <template v-for="(value, key) in result.meta">
        <ul>
          <strong>{{ key }}: </strong>
          <span v-if="key == 'sketch'"
            ><a :href="value" target="_blank">{{ value }}</a></span
          >
          <span v-else> {{ value }} </span>
        </ul>
      </template>

      <v-card v-if="task.task_report" class="mt-2" variant="outlined">
        <v-card-text
          class="markdown-body"
          v-html="toHtml(task.task_report.markdown)"
        ></v-card-text>
      </v-card>

      <ul v-if="task.file_reports.length">
        <br />
        <strong>File reports ({{ task.file_reports.length }})</strong>
        <v-card class="mt-2" variant="outlined">
          <v-table density="compact">
            <thead>
              <tr>
                <th class="text-left">File</th>
                <th class="text-left">Summary</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="report in task.file_reports" :key="report.id">
                <td>
                  <router-link
                    style="color: inherit"
                    :to="{
                      name: 'fileContent',
                      params: { fileId: report.file.id },
                    }"
                  >
                    {{ report.file.display_name }}
                  </router-link>
                </td>
                <td :class="report.priority >= 40 ? 'text-red' : ''">
                  {{ report.summary }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </ul>

      <ul v-if="task.output_files.length">
        <br />
        <strong>Result files ({{ task.output_files.length }})</strong>

        <v-table class="mt-2">
          <thead></thead>
          <tr
            v-for="(file, index) in showAllFiles
              ? task.output_files
              : task.output_files.slice(0, 10)"
            :key="file.id"
          >
            <td>
              <router-link
                style="text-decoration: none; color: inherit"
                :to="{ name: 'file', params: { fileId: file.id } }"
              >
                <div class="truncate">
                  <v-icon class="mt-n1">mdi-file-outline</v-icon>
                  {{ file.display_name }}
                </div>
              </router-link>
            </td>
            <td>{{ $filters.formatBytes(file.filesize) }}</td>
            <td>
              <v-icon @click="downloadFileTab(file.id)">mdi-download</v-icon>
            </td>
          </tr>
        </v-table>
        <div
          v-if="task.output_files.length > 10"
          class="mt-2"
          style="text-decoration: underline; cursor: pointer"
          @click="showAllFiles = !showAllFiles"
        >
          {{
            showAllFiles
              ? "Show less"
              : `Show all ${task.output_files.length} files`
          }}
        </div>
      </ul>
    </v-card-text>
  </div>

  <v-card-text v-if="task.status_short === 'FAILURE'">
    <code>
      <h3>{{ task.error_exception }}</h3>
      <br />
      {{ task.error_traceback }}
    </code>
  </v-card-text>
</template>

<script>
import settings from "@/settings";
import DOMPurify from "dompurify";
import { marked } from "marked";

export default {
  name: "ProcessingResult",
  props: {
    item: Object,
    worker: Object,
    task: Object,
  },
  data() {
    return {
      attributesToRender: ["command"],
      showAllFiles: false,
    };
  },
  computed: {
    statusProgress() {
      return JSON.parse(this.task.status_progress);
    },
    result() {
      return JSON.parse(this.task.result);
    },
  },
  methods: {
    downloadFileTab(fileId) {
      const downloadUrl =
        settings.apiServerUrl + "/api/v1/files/" + fileId + "/download_stream";
      window.open(downloadUrl);
    },
    toHtml(markdown) {
      return DOMPurify.sanitize(marked(markdown));
    },
  },
};
</script>

<style scoped>
.truncate {
  max-width: 400px; /* Adjust the width as needed */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
