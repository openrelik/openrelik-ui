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
  <v-menu>
    <template v-slot:activator="{ props }">
      <v-icon v-bind="props" class="ml-3">mdi-dots-vertical</v-icon>
    </template>
    <v-list width="200">
      <toggle-theme />
      <v-list-item :to="'/metrics'">
        <template v-slot:prepend>
          <v-icon size="small">mdi-chart-box</v-icon>
        </template>
        <v-list-item-title>Metrics</v-list-item-title>
      </v-list-item>
      <v-list-item @click="$refs.externalStorageManager.open()">
        <template v-slot:prepend>
          <v-icon size="small">mdi-database-arrow-right-outline</v-icon>
        </template>
        <v-list-item-title>External storages</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
  <external-storage-manager ref="externalStorageManager" />
</template>

<script>
import { useTheme } from "vuetify";
import ToggleTheme from "./ToggleTheme.vue";
import ExternalStorageManager from "./ExternalStorageManager.vue";

export default {
  data() {
    return {
      theme: useTheme(),
    };
  },
  components: {
    ToggleTheme,
    ExternalStorageManager,
  },
};
</script>
