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
  <v-card
    variant="outlined"
    class="custom-border-color"
    :class="$vuetify.theme.name === 'dark' ? '' : 'light-background'"
  >
    <v-toolbar
      :color="$vuetify.theme.name === 'dark' ? '' : 'grey-lighten-4'"
      density="compact"
    >
      <v-toolbar-title style="font-size: 18px">
        {{ chartName }}
      </v-toolbar-title>
    </v-toolbar>
    <apexchart
      type="area"
      :options="chartOptions"
      :series="series"
      height="300px"
    ></apexchart>
  </v-card>
</template>

<script>
import RestApiClient from "@/RestApiClient";

export default {
  props: {
    chartName: String,
    metricName: String,
    aggregate: Boolean,
    range: {
      type: Number,
      default: 3600,
    },
    step: {
      type: Number,
      default: 60,
    },
    resolution: {
      type: String,
      default: "1m",
    },
  },
  data() {
    return {
      series: [],
      options: {
        chart: {
          zoom: {
            autoScaleYaxis: true,
          },
          toolbar: {
            show: false,
          },
        },
        grid: {
          show: true,
          xaxis: {
            lines: {
              show: true,
            },
          },
          yaxis: {
            lines: {
              show: true,
            },
          },
        },
        dataLabels: {
          enabled: false,
        },
        xaxis: {
          type: "datetime",
          labels: {
            format: "HH:mm:ss",
          },
        },
        yaxis: {
          decimalsInFloat: false,
        },
        tooltip: {
          x: {
            format: "yyyy-MM-dd HH:mm:ss",
          },
        },
        stroke: {
          show: true,
          curve: "smooth",
          width: 2,
        },
        fill: {
          type: "gradient",
        },
        legend: {
          show: true,
          position: "bottom",
          horizontalAlign: "left",
        },
      },
    };
  },
  computed: {
    chartOptions() {
      return {
        ...this.options,
        theme: {
          mode: this.$vuetify.theme.name === "dark" ? "dark" : "light",
        },
      };
    },
  },
  methods: {
    getTaskMetrics() {
      RestApiClient.getTaskMetrics(
        this.metricName,
        this.aggregate,
        this.range,
        this.step,
        this.resolution
      ).then((response) => {
        this.series = response;
      });
    },
  },
  mounted() {
    this.getTaskMetrics();
    this.$eventBus.on("refresh-chart-data", () => {
      this.getTaskMetrics();
    });
  },
  watch: {
    range: "getTaskMetrics",
    step: "getTaskMetrics",
    resolution: "getTaskMetrics",
  },
};
</script>

<style scoped></style>
