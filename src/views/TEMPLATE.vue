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
  <v-container fluid style="margin-top: 10vh">
    <v-card flat class="mx-auto" max-width="700" color="transparent">
      <template v-slot:title>
        <h2>{{ title }}</h2>
      </template>
      <template v-slot:subtitle>
        {{ subtitle }}
      </template>
      <template v-slot:text>
        <code>
          {{ text }}
        </code>
      </template>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: "TEAMPLATE",
  components: {},
  data() {
    return {
      title: "Title of the page",
      subtitle: "Subtitle of the page.",
      text: "Placeholder",
    };
  },
};
</script>
