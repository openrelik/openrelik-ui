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
    <v-snackbar v-model="showError" color="error" location="top">
      {{ error }}
    </v-snackbar>
    <v-card flat class="mx-auto" max-width="400">
      <template v-slot:prepend>
        <v-img src="/logo-light-transparent.png" width="40" height="40">
        </v-img>
      </template>
      <template v-slot:title>
        <h2>OpenRelik</h2>
      </template>
      <template v-slot:text>
        <v-sheet v-if="authMethods.includes('local')" class="mt-2">
          <v-form @submit.prevent="">
            <v-text-field
              v-model="username"
              label="Username"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              class="mb-3"
              required
              hide-details
            ></v-text-field>
            <v-text-field
              v-model="password"
              label="Password"
              variant="outlined"
              prepend-inner-icon="mdi-lock"
              type="password"
              class="mb-3"
              required
              hide-details
            ></v-text-field>
            <v-btn
              type="submit"
              variant="flat"
              size="large"
              class="text-none"
              block
              color="info"
              @click="submitUsernamePassword"
            >
              Login
            </v-btn>
          </v-form>
        </v-sheet>

        <br />

        <div
          v-if="
            authMethods.includes('local') &&
            authMethods.filter((item) => item !== 'local').length
          "
        >
          <div class="text-center mt-5">Or sign in with</div>
          <br />
        </div>

        <v-btn
          v-for="authMethod in authMethods.filter((item) => item !== 'local')"
          :key="authMethod"
          variant="outlined"
          :prepend-icon="getAuthIcon(authMethod)"
          :href="loginUrl + '/' + authMethod"
          class="text-none mb-3"
          size="large"
          block
        >
          {{ $filters.capitalizeFirstLetter(authMethod) }}
        </v-btn>
      </template>
    </v-card>
  </v-container>
</template>

<script>
import settings from "@/settings";
import axios from "axios";

export default {
  name: "Login",
  data: () => ({
    username: "",
    password: "",
    showError: false,
    error: "",
  }),
  computed: {
    loginUrl() {
      return settings.apiServerUrl + "/login";
    },
    authMethods() {
      return settings.authMethods;
    },
  },
  methods: {
    async submitUsernamePassword() {
      if (!this.username || !this.password) {
        return;
      }
      try {
        const formData = new FormData();
        formData.append("username", this.username);
        formData.append("password", this.password);
        const response = await axios.post(
          settings.apiServerUrl + "/auth/local",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            withCredentials: true,
          }
        );
        if (response.status === 200) {
          window.location.href = "/";
        }
      } catch (err) {
        this.error = err.response?.data?.detail || "An error occurred.";
        this.showError = true;
        this.password = "";
      }
    },
    getAuthIcon(authMethod) {
      const iconMap = {
        google: "mdi-google",
      };
      return iconMap[authMethod] || "mdi-account";
    },
  },
};
</script>
