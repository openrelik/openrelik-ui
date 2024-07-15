/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
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
