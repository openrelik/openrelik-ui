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
  <v-snackbar
    v-model="snackbar.visible"
    :color="snackbar.color"
    :timeout="snackbar.timeout"
    location="top"
  >
    {{ snackbar.message }}
    <template v-slot:actions>
      <v-btn variant="text" class="text-none" @click="snackbar.visible = false">
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script>
export default {
  name: "AppSnackbar",

  data() {
    return {
      snackbar: {
        visible: false,
        message: "",
        color: "success",
        timeout: 3000,
      },
    };
  },
  methods: {
    showSnackbar(event) {
      this.snackbar = { ...this.snackbar, ...event };
      this.snackbar.visible = true;
    },
  },
  mounted() {
    this.$eventBus.on("showSnackbar", this.showSnackbar);
  },

  beforeUnmount() {
    this.$eventBus.off("showSnackbar", this.showSnackbar);
  },
};
</script>
