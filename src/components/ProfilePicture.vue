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
  <v-avatar
    :size="size"
    :color="avatarColor"
    :title="title"
    style="cursor: pointer"
  >
    <template v-if="user.profile_picture_url">
      <v-img
        :src="user.profile_picture_url"
        referrerpolicy="no-referrer"
        alt="Profile Picture"
      />
    </template>
    <template v-else>
      {{ user.username ? user.username.charAt(0).toUpperCase() : "" }}
    </template>
  </v-avatar>
</template>

<script>
export default {
  props: { user: Object, size: String, title: String },
  data() {
    return {};
  },
  computed: {
    avatarColor() {
      if (this.user.profile_picture_url) {
        return;
      }
      const uuid = this.user.uuid;
      let hash = 0;
      for (let i = 0; i < uuid.length; i++) {
        hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
      }
      const color = Math.floor(Math.abs(hash) % 16777215).toString(16);
      return "#" + "0".repeat(6 - color.length) + color;
    },
  },
  methods: {},
};
</script>

<style scoped></style>
