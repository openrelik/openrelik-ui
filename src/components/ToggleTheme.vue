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
  <v-list-item @click="toggleTheme">
    <template v-slot:prepend>
      <v-icon>mdi-brightness-6</v-icon>
    </template>
    <v-list-item-title>Toggle theme</v-list-item-title>
  </v-list-item>
</template>

<script setup>
import { useTheme } from "vuetify";

const theme = useTheme();
function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? "light" : "dark";
  localStorage.setItem("theme", theme.global.name.value);
}
</script>
