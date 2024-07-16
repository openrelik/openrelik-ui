/*
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
*/

// Plugins
import { registerPlugins } from "@/plugins";

// Components
import App from "./App.vue";

// Composables
import { createApp } from "vue";

// EventBus
import eventBus from "./plugins/eventbus";

// DayJS for time functions
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const app = createApp(App);

// Global filters
app.config.globalProperties.$filters = {
  formatBytes(num) {
    var exponent;
    var unit;
    var neg = num < 0;
    var units = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    if (neg) {
      num = -num;
    }

    if (num < 1) {
      return (neg ? "-" : "") + num + " B";
    }

    exponent = Math.min(
      Math.floor(Math.log(num) / Math.log(1000)),
      units.length - 1
    );
    num = (num / Math.pow(1000, exponent)).toFixed(2) * 1;
    unit = units[exponent];

    return (neg ? "-" : "") + num + unit;
  },
  formatTime(datetimeString) {
    return dayjs.utc(datetimeString).format();
  },
};

registerPlugins(app);

app.use(eventBus);
app.mount("#app");
