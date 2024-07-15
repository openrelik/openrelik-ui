<template>
  <v-app>
    <default-app-bar />
    <default-view></default-view>
  </v-app>
</template>

<script setup>
import { useTheme } from "vuetify";
import { useAppStore } from "@/stores/app";
import DefaultAppBar from "./AppBar.vue";
import DefaultView from "./View.vue";

// Set theme to user saved value
const theme = useTheme();
theme.global.name.value = localStorage.getItem("theme") || "light";

// Set system config and Celery tasks
const appStore = useAppStore();
appStore.setSystemConfig();
appStore.setRegisteredCeleryTasks();
appStore.setWorkflowTemplates();
</script>
