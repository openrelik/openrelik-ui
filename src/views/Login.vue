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
