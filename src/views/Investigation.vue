<!--
Copyright 2025-2026 Google LLC

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
  <div class="agent-workspace-view d-flex flex-column" :style="containerStyle">
    <!-- Breadcrumbs -->
    <div
      v-if="!isFullscreen"
      class="px-4 py-2 pb-4 flex-shrink-0 d-flex align-center"
      style="padding-top: 5px !important; min-height: 57px"
    >
      <v-breadcrumbs v-if="folder" density="compact" class="pa-0">
        <small>
          <v-breadcrumbs-item :to="{ name: 'home' }"> Home </v-breadcrumbs-item>
          <v-breadcrumbs-divider v-if="folder.parent"></v-breadcrumbs-divider>
          <breadcrumbs :folder="folder.parent"></breadcrumbs>
          <v-breadcrumbs-divider></v-breadcrumbs-divider>
          <v-breadcrumbs-item
            :to="{
              name: 'folder',
              params: { folderId: folder.id },
            }"
          >
            {{ folder.display_name }}
          </v-breadcrumbs-item>
          <v-breadcrumbs-divider></v-breadcrumbs-divider>
          <v-breadcrumbs-item>
            <span style="opacity: 0.5">Investigation</span>
          </v-breadcrumbs-item>
        </small>
      </v-breadcrumbs>

      <v-btn
        icon="mdi-fullscreen"
        variant="text"
        density="compact"
        class="ml-auto mr-1"
        @click="toggleFullscreen"
      ></v-btn>
    </div>

    <!-- Workspace -->
    <div
      class="flex-grow-1"
      :style="{
        minHeight: '0',
        marginTop: isFullscreen ? '0px' : '-8px',
      }"
    >
      <InvestigationCanvas />
    </div>
  </div>
</template>

<script setup>
import InvestigationCanvas from "@/components/InvestigationCanvas/InvestigationCanvas.vue";
import Breadcrumbs from "@/components/Breadcrumbs.vue";
import RestApiClient from "@/RestApiClient";
import { useRoute } from "vue-router";
import { useInvestigationStore } from "@/stores/investigation";
import { onMounted, onBeforeUnmount, ref, provide, computed, watch } from "vue";

const investigationStore = useInvestigationStore();

const route = useRoute();
const folder = ref(null);
const isFullscreen = ref(false);

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};

provide("agent-fullscreen", { isFullscreen, toggleFullscreen });

const handleBeforeUnload = (event) => {
  if (investigationStore.isLoading) {
    // event.preventDefault();
    event.returnValue = "";
  }
};

const containerStyle = computed(() => {
  if (isFullscreen.value) {
    return {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 2005,
      backgroundColor: "rgb(var(--v-theme-background))",
    };
  }
  return {
    position: "absolute",
    top: "65px",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    zIndex: 5,
    backgroundColor: "rgb(var(--v-theme-background))",
  };
});

onMounted(() => {
  window.addEventListener("beforeunload", handleBeforeUnload);
});

watch(
  () => route.params.folderId,
  async (newFolderId) => {
    if (newFolderId) {
      try {
        // Restore session immediately if possible
        const storageKey = `openrelik_agent_session_${newFolderId}`;
        if (localStorage.getItem(storageKey)) {
          investigationStore.createSession(newFolderId);
        }

        // Fetch folder details
        folder.value = await RestApiClient.getFolder(newFolderId);
      } catch (error) {
        console.error("Failed to load folder or session:", error);
      }
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  investigationStore.reset();
});
</script>
