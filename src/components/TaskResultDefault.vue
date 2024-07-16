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
        <ul v-if="attributesToRender.includes(key)">
          <strong>{{ key }}:</strong>
          {{
            value
          }}
        </ul>
      </template>
      <ul>
        <strong>runtime:</strong>
        {{
          task.runtime.toFixed(1)
        }}
        seconds
      </ul>
      <ul>
        {{
          task.output_files
        }}
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
    </v-card-text>
  </div>

  <v-card-text v-if="task.status_short === 'FAILURE'">
    <strong>Error: </strong>{{ task.error_exception }} <br /><br />
    <code>
      {{ task.error_traceback }}
    </code>
  </v-card-text>
</template>

<script>
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
};
</script>
