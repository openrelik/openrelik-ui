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
  <v-snackbar v-model="showSnackbar" :timeout="2000" location="top">
    {{ snackbarText }}
  </v-snackbar>
  <v-dialog v-model="showApiKeysDialog" width="600">
    <v-card width="600" class="mx-auto pa-4">
      <v-card-title class="ml-2">API keys</v-card-title>
      <v-card-text>
        This list shows your existing API keys. You can revoke an existing key
        at any time by deleting it from this list.

        <div>
          <v-btn
            variant="flat"
            color="info"
            class="text-none mt-5"
            prepend-icon="mdi-plus"
            @click="showApiKeysForm = true"
            >Create API key</v-btn
          >
        </div>
      </v-card-text>

      <div v-if="showApiKeysForm" class="pa-4">
        <v-form @submit.prevent="createApiKey()">
          <v-text-field
            v-model="newApiKey.displayName"
            variant="outlined"
            label="API key name"
            autofocus
          ></v-text-field>
        </v-form>
        <v-card-actions>
          <v-btn
            variant="text"
            color="primary"
            class="text-none"
            @click="createApiKey()"
            :disabled="!newApiKey.displayName"
            >Create</v-btn
          >
          <v-btn
            variant="text"
            class="text-none"
            @click="showApiKeysForm = false"
            >Cancel</v-btn
          >
        </v-card-actions>
      </div>
      <div v-if="apiKeys.length" class="pa-2">
        <v-table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="apiKey in apiKeys" :key="apiKey.id">
              <td>{{ apiKey.display_name }}</td>
              <td>
                <v-btn
                  size="small"
                  icon
                  variant="flat"
                  @click="deleteUserApiKey(apiKey.id)"
                >
                  <v-icon small>mdi-trash-can-outline</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showApiKeyContent" persistent width="600">
    <v-card width="600" class="mx-auto pa-4">
      <v-card-title class="ml-2">API key created</v-card-title>
      <v-card-text
        >⚠️ This is the only time your API key will be accessable. Please copy
        it to your clipboard now and store it in a secure location. You'll need
        it to access the API and won't be able to retrieve it again later.

        <v-btn
          prepend-icon="mdi-content-copy"
          class="text-none mt-7"
          color="info"
          variant="flat"
          block
          @click="copyToClipboard(apiKeyContent)"
          >Copy API key to clipboard</v-btn
        >
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-menu>
    <template v-slot:activator="{ props }">
      <profile-picture :user="user" :size="size" v-bind="props" />
    </template>
    <v-list width="200">
      <v-list-item @click="showApiKeysDialog = !showApiKeysDialog">
        <template v-slot:prepend>
          <v-icon size="small">mdi-key-outline</v-icon>
        </template>
        <v-list-item-title>API keys</v-list-item-title>
      </v-list-item>
      <v-list-item @click="logout()">
        <template v-slot:prepend>
          <v-icon size="small">mdi-logout</v-icon>
        </template>
        <v-list-item-title>Sign out</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
import axios from "axios";
import RestApiClient from "@/RestApiClient";
import settings from "@/settings";
import { useUserStore } from "@/stores/user";
import ProfilePicture from "./ProfilePicture.vue";

export default {
  name: "ProfileMenu",
  props: {
    size: String,
  },
  components: {
    ProfilePicture,
  },
  data() {
    return {
      userStore: useUserStore(),
      apiKeys: [],
      newApiKey: {
        displayName: "",
      },
      apiKeyContent: "",
      showApiKeysDialog: false,
      showApiKeysForm: false,
      showApiKeyContent: false,
      showSnackbar: false,
      snackbarText: "",
    };
  },
  computed: {
    user() {
      return this.userStore.user;
    },
    logoutUrl() {
      return settings.apiServerUrl + "/auth/logout";
    },
  },
  methods: {
    logout() {
      axios
        .delete(this.logoutUrl, { withCredentials: true })
        .then((response) => {
          sessionStorage.removeItem("csrfToken");
          window.location.href = "/";
        })
        .catch((error) => {
          console.log(error);
        });
    },
    getApiKeys() {
      RestApiClient.getUserApiKeys().then((response) => {
        this.apiKeys = response;
      });
    },
    createApiKey() {
      const expireMinutes = 10080; // 7 days
      RestApiClient.createUserApiKey(
        this.newApiKey.displayName,
        expireMinutes
      ).then((response) => {
        this.getApiKeys();
        this.showApiKeysForm = false;
        this.showApiKeysDialog = false;
        this.newApiKey.displayName = "";
        this.showApiKeyContent = true;
        this.apiKeyContent = response;
      });
    },
    deleteUserApiKey(id) {
      RestApiClient.deleteUserApiKey(id).then((response) => {
        this.getApiKeys();
      });
    },
    copyToClipboard(apiKey) {
      this.showSnackbar = false;
      this.snackbarText = "";
      navigator.clipboard
        .writeText(apiKey.token)
        .then(() => {
          this.snackbarText = `Copied "${apiKey.display_name}" to clipboard`;
          this.showSnackbar = true;
          this.apiKeyContent = "";
          this.showApiKeyContent = false;
        })
        .catch((err) => {
          console.error("Failed to copy to clipboard:", err);
        });
    },
  },
  mounted() {
    this.getApiKeys();
  },
};
</script>
