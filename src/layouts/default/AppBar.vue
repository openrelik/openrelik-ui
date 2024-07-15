<template>
  <v-toolbar flat class="pr-4" color="transparent">
    <v-app-bar-title class="ml-n1">
      <span>{{ appName }}</span>
    </v-app-bar-title>
    <template v-slot:prepend>
      <v-btn icon @click="navigate('/')">
        <v-icon>mdi-orbit</v-icon>
      </v-btn>
    </template>
    <template v-slot:append>
      <toggle-theme />
      <profile-menu />
    </template>
  </v-toolbar>
  <v-divider></v-divider>
</template>

<script>
import { useAppStore } from "@/stores/app";
import settings from "@/settings";
import ProfileMenu from "@/components/ProfileMenu.vue";
import ToggleTheme from "@/components/ToggleTheme.vue";

export default {
  components: {
    ProfileMenu,
    ToggleTheme,
  },
  data() {
    return {
      appStore: useAppStore(),
      appName: settings.appName,
    };
  },
  computed: {
    systemConfig() {
      return this.appStore.systemConfig;
    },
  },
  methods: {
    navigate(path) {
      this.$router.push(path);
    },
  },
};
</script>
