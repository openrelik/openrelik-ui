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
