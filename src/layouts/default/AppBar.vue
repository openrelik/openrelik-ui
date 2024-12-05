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
  <v-app-bar flat class="pr-4" color="transparent">
    <v-app-bar-title class="ml-n1">
      <strong>{{ appName }}</strong>
    </v-app-bar-title>
    <template v-slot:prepend>
      <v-img
        :src="
          $vuetify.theme.name === 'dark'
            ? '/logo-dark-round.png'
            : '/logo-light-round.png'
        "
        width="30"
        height="30"
        class="ml-4 mr-3"
        style="cursor: pointer"
        @click="navigate('/')"
      >
      </v-img>
    </template>
    <template v-slot:append>
      <profile-menu size="30" />
      <system-menu />
    </template>
  </v-app-bar>
</template>

<script>
import { useAppStore } from "@/stores/app";
import settings from "@/settings";
import ProfileMenu from "@/components/ProfileMenu.vue";
import SystemMenu from "@/components/SystemMenu.vue";

export default {
  components: {
    ProfileMenu,
    SystemMenu,
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
      if (
        this.$route.name === "myFolders" ||
        this.$route.name === "sharedWithMe"
      ) {
        return;
      }
      this.$router.push(path);
    },
  },
};
</script>
