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
  <v-container fluid>
    <v-form>
      <v-row>
        <v-col cols="12" sm="4">
          <v-select
            v-model="range"
            :items="rangeOptions"
            @update:modelValue="updateStepAndResolution()"
            label="Range (Look back period for data)"
            variant="outlined"
          ></v-select>
        </v-col>
        <v-col cols="12" sm="4">
          <v-select
            v-model="step"
            :items="stepOptions"
            @update:modelValue="updateStep()"
            label="Resolution (Time interval between data points)"
            variant="outlined"
          ></v-select>
        </v-col>
        <v-col cols="12" sm="4">
          <v-select
            v-model="refreshInterval"
            :items="autoRefreshOptions"
            @update:modelValue="resetRefreshInterval()"
            label="Refresh interval"
            variant="outlined"
          >
            <template v-slot:append>
              <v-btn
                icon
                variant="flat"
                @click="$eventBus.emit('refresh-chart-data')"
              >
                <v-icon>mdi-refresh</v-icon>
              </v-btn>
            </template>
          </v-select>
        </v-col>
      </v-row>
    </v-form>
    <v-row>
      <v-col v-for="chart in metricCharts" :key="chart.name" cols="12" sm="6">
        <range-chart
          :chart-name="chart.name"
          :metric-name="chart.metric"
          :aggregate="chart.aggregate"
          :range="range"
          :step="step"
          :resolution="resolution"
        ></range-chart>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import RangeChart from "@/components/RangeChart.vue";

export default {
  components: {
    RangeChart,
  },
  data() {
    return {
      range: 3600,
      step: 60,
      resolution: "1m",
      refreshInterval: null,
      refreshTimer: null,
      rangeOptions: [
        { title: "Last 5 minutes", value: 300 },
        { title: "Last hour", value: 3600 },
        { title: "Last 6 hours", value: 21600 },
        { title: "Last 12 hours", value: 43200 },
        { title: "Last 24 hours", value: 86400 },
        { title: "Last 30 days", value: 2592000 },
        { title: "Last 12 months", value: 31556926 },
      ],
      stepOptions: [
        { title: "15 seconds", value: 15 },
        { title: "1 minute", value: 60 },
        { title: "5 minutes", value: 300 },
        { title: "1 hour", value: 3600 },
        { title: "1 day", value: 86400 },
        { title: "1 week", value: 604800 },
      ],
      autoRefreshOptions: [
        { title: "No automatic refresh", value: null },
        { title: "15 seconds", value: 15000 },
        { title: "1 minute", value: 60000 },
        { title: "5 minutes", value: 300000 },
      ],
      metricCharts: [
        {
          name: "Total active tasks",
          metric: "celery_task_started_total",
          aggregate: true,
        },
        {
          name: "Total tasks in queue",
          metric: "celery_queue_length_total",
          aggregate: true,
        },
        {
          name: "Tasks in queue",
          metric: "celery_queue_length_total",
          aggregate: false,
        },
        {
          name: "Tasks recieved",
          metric: "celery_task_received_total",
          aggregate: false,
        },
        {
          name: "Successful tasks",
          metric: "celery_task_succeeded_total",
          aggregate: false,
        },
        {
          name: "Failed tasks",
          metric: "celery_task_failed_total",
          aggregate: false,
        },
        {
          name: "Tasks started",
          metric: "celery_task_started_total",
          aggregate: false,
        },
        {
          name: "Rejected tasks",
          metric: "celery_task_rejected_total",
          aggregate: false,
        },
        {
          name: "Revoked tasks",
          metric: "celery_task_revoked_total",
          aggregate: false,
        },
        {
          name: "Retried tasks",
          metric: "celery_task_retried_total",
          aggregate: false,
        },
      ],
    };
  },
  mounted() {
    this.resetRefreshInterval();
  },
  beforeUnmount() {
    clearInterval(this.refreshTimer);
  },
  methods: {
    updateStepAndResolution() {
      // Logic to calculate step and resolution based on range
      switch (this.range) {
        case 300: // 5 hour
          this.step = 15; // 1 minute
          this.resolution = "15s";
          break;
        case 3600: // 1 hour
          this.step = 60; // 1 minute
          this.resolution = "1m";
          break;
        case 21600: // 6 hours
          this.step = 300; // 5 minutes
          this.resolution = "5m";
          break;
        case 43200: // 12 hours
          this.step = 3600; // 1 hour
          this.resolution = "1h";
          break;
        case 86400: // 1 day
          this.step = 3600; // 1 minute
          this.resolution = "1h";
          break;
        case 2592000: // 30 days
          this.step = 86400; // 1 day
          this.resolution = "1d";
          break;
        case 31556926: // 30 days
          this.step = 604800; // 1 day
          this.resolution = "1w";
          break;
        default:
          this.step = 60; // Default to 1 minute
          this.resolution = "1m";
      }
      this.$nextTick(() => {
        this.$eventBus.emit("refresh-chart-data");
      });
    },
    updateStep() {
      this.$eventBus.emit("refresh-chart-data");
    },
    resetRefreshInterval() {
      clearInterval(this.refreshTimer);
      if (this.refreshInterval) {
        this.refreshTimer = setInterval(() => {
          this.$eventBus.emit("refresh-chart-data");
        }, this.refreshInterval);
      }
    },
  },
};
</script>
