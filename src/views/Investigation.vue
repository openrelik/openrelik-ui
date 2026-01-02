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
        class="ml-auto mr-3"
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
      <Investigation />
    </div>
  </div>
</template>

<script setup>
import Investigation from "@/components/Investigation/Investigation.vue";
import Breadcrumbs from "@/components/Breadcrumbs.vue";
import RestApiClient from "@/RestApiClient";
import { useRoute } from "vue-router";
import { useInvestigationStore } from "@/stores/investigation";
import { onMounted, onBeforeUnmount, ref, provide, computed } from "vue";

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
    event.preventDefault();
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

onMounted(async () => {
  // Prevent navigation if the session is loading, to warn the user about unsaved changes
  window.addEventListener("beforeunload", handleBeforeUnload);
  if (route.params.folderId) {
    try {
      folder.value = await RestApiClient.getFolder(route.params.folderId);

      const storageKey = `openrelik_agent_session_${route.params.folderId}`;
      if (localStorage.getItem(storageKey)) {
        investigationStore.createSession(route.params.folderId);
      }
    } catch (error) {
      console.error("Failed to load folder:", error);
    }
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>
