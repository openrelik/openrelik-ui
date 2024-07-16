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
  <v-dialog v-model="showInfoDialog" width="auto">
    <v-card class="mx-auto">
      <v-card-text>
        <template v-for="(value, key) in sortedParserCount">
          <ul v-if="key !== 'total'">
            <strong>{{ value }}</strong>
            {{
              key
            }}
          </ul>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>

  <div v-if="task.status_short === 'PROGRESS'">
    <table>
      <thead>
        <tr style="text-align: left">
          <th width="100px">Tasks</th>
          <th width="70px">Active</th>
          <th width="300px"></th>
        </tr>
      </thead>
      <tr>
        <td>Queued</td>
        <td>{{ statusDetail.tasks.queued }}</td>
        <td>
          <v-progress-linear max="20" v-model="statusDetail.tasks.queued">
          </v-progress-linear>
        </td>
      </tr>

      <tr>
        <td>Processing</td>
        <td>{{ statusDetail.tasks.processing }}</td>
        <td>
          <v-progress-linear max="20" v-model="statusDetail.tasks.processing">
          </v-progress-linear>
        </td>
      </tr>

      <tr>
        <td>Merging</td>
        <td>{{ statusDetail.tasks.merging }}</td>
        <td>
          <v-progress-linear max="20" v-model="statusDetail.tasks.merging">
          </v-progress-linear>
        </td>
      </tr>

      <tr>
        <td>Abandoned</td>
        <td>{{ statusDetail.tasks.abandoned }}</td>
        <td>
          <v-progress-linear max="20" v-model="statusDetail.tasks.abandoned">
          </v-progress-linear>
        </td>
      </tr>
      <tr>
        <td>
          <strong>Total</strong>
        </td>
        <td>
          <strong>{{ statusDetail.tasks.total }}</strong>
        </td>
      </tr>
    </table>
  </div>

  <div v-if="task.status_short === 'SUCCESS'">
    <template v-for="(value, key) in result">
      <li v-if="key !== 'meta'">
        <strong>{{ key }}:</strong> {{ value }}
      </li>
    </template>
    <li>
      <strong>Total events:</strong>
      {{ result.meta.event_counters.total || 0 }}
    </li>
    <li>
      <strong>Parsers used:</strong>
      {{ Object.keys(result.meta.event_counters).length - 1 }}
      <v-icon size="x-small" @click="showInfoDialog = !showInfoDialog"
        >mdi-information-outline</v-icon
      >
    </li>
    <li>
      <strong>Runtime:</strong>
      {{ task.runtime.toFixed(1) }} seconds
    </li>

    <div v-if="result.meta">
      <template v-for="(value, key) in result.meta">
        <li v-if="key !== 'event_counters'">
          <strong>{{ key }}:</strong> {{ value }}
        </li>
      </template>
    </div>
  </div>

  <div v-if="task.status_short === 'FAILURE'">
    <br />
    <strong>Error:</strong> {{ task.error_exception }}
    <br />
    <br />
    <code>
      {{ task.error_traceback }}
    </code>
  </div>
</template>

<script>
import RestApiClient from "@/RestApiClient";

export default {
  name: "ProcessingResult",
  props: {
    item: Object,
    worker: Object,
    task: Object,
  },
  data() {
    return {
      showInfoDialog: false,
    };
  },
  computed: {
    statusDetail() {
      return JSON.parse(this.task.status_progress);
    },
    result() {
      return JSON.parse(this.task.result);
    },
    sortedParserCount() {
      const sortable = Object.fromEntries(
        Object.entries(this.result.meta.event_counters).sort(
          ([, a], [, b]) => b - a
        )
      );
      return sortable;
    },
  },
};
</script>
