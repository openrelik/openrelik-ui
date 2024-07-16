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
  <v-container fluid style="margin-top: 12vh">
    <v-card flat class="mx-auto" max-width="700">
      <template v-slot:title>
        <h2>Login</h2>
      </template>
      <template v-slot:text>
        <code>
          Greetings and welcome to this Digital Forensics Artifact Workflow
          System. Designed for streamlined analysis and management of digital
          evidence, it provides a robust backend for artifact management and
          processing.
        </code>
        <br /><br />
        <v-btn variant="outlined" prepend-icon="mdi-google" :href="loginUrl">
          Login with Google
        </v-btn>
      </template>
    </v-card>
  </v-container>
</template>

<script>
import settings from "@/settings";

export default {
  name: "Login",
  computed: {
    loginUrl() {
      return settings.apiServerUrl + "/login";
    },
  },
};
</script>
