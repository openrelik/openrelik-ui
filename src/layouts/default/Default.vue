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
  <v-app>
    <default-app-bar />
    <default-view />
  </v-app>
</template>

<script setup>
import { useTheme } from "vuetify";
import { useAppStore } from "@/stores/app";
import DefaultAppBar from "./AppBar.vue";
import DefaultView from "./View.vue";

// Set theme to user saved value
const theme = useTheme();
if (localStorage.getItem("theme")) {
  theme.change(localStorage.getItem("theme"));
} else {
  theme.change("light");
}

// Set system config and Celery tasks
const appStore = useAppStore();
appStore.setSystemConfig();
appStore.setRegisteredCeleryTasks();
appStore.setWorkflowTemplates();
appStore.setGroups();
</script>
