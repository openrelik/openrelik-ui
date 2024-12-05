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
            label="Range (Look back period for data)"
            variant="outlined"
          ></v-select>
        </v-col>
        <v-col cols="12" sm="4">
          <v-select
            v-model="step"
            :items="stepOptions"
            label="Step (time interval between successive data points)"
            variant="outlined"
          ></v-select>
        </v-col>
        <v-col cols="12" sm="4">
          <v-select
            v-model="resolution"
            :items="resolutionOptions"
            label="Resolution (time interval between each data point)"
            variant="outlined"
          ></v-select>
        </v-col>
      </v-row>
    </v-form>
    <v-row>
      <v-col v-for="metric in metricNames" :key="metric.name" cols="12" sm="6">
        <range-chart
          :chart-name="metric.name"
          :metric-name="metric.metric"
          :aggregate="metric.aggregate"
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
      resolution: "5m",
      rangeOptions: [
        { title: "1 hour", value: 3600 },
        { title: "6 hours", value: 21600 },
        { title: "12 hours", value: 43200 },
        { title: "1 day", value: 86400 },
        { title: "30 day", value: 2592000 },
      ],
      stepOptions: [
        { title: "1 minute", value: 60 },
        { title: "5 minutes", value: 300 },
        { title: "15 minutes", value: 900 },
        { title: "1 hour", value: 3600 },
        { title: "12 hours", value: 43200 },
        { title: "1 day", value: 86400 },
      ],
      resolutionOptions: [
        { title: "1 minute", value: "1m" },
        { title: "5 minutes", value: "5m" },
        { title: "15 minutes", value: "15m" },
        { title: "1 hour", value: "1h" },
        { title: "6 hours", value: "6h" },
        { title: "12 hours", value: "12h" },
        { title: "1 day", value: "1d" },
      ],
      metricNames: [
        {
          name: "Total tasks",
          metric: "celery_task_received_total",
          aggregate: true,
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
};
</script>
