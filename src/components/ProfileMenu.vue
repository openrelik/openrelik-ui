<template>
  <v-dialog v-model="showApiKeysDialog" width="600">
    <v-card width="600" class="mx-auto">
      <v-toolbar color="transparent">
        <v-toolbar-title>API keys</v-toolbar-title>
        <v-btn
          variant="tonal"
          class="text-none mr-4"
          prepend-icon="mdi-plus"
          @click="showApiKeysForm = true"
          >Create API key</v-btn
        >
      </v-toolbar>

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
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            class="text-none"
            @click="showApiKeysForm = false"
            >Cancel</v-btn
          >
          <v-btn
            variant="text"
            color="primary"
            class="text-none"
            @click="createApiKey()"
            >Create</v-btn
          >
        </v-card-actions>
        <span v-if="!apiKeys.length">No API keys</span>
      </div>
      <div class="pa-4">
        <ul v-for="apiKey in apiKeys" :key="apiKey.id">
          {{
            apiKey.api_key
          }}
        </ul>
      </div>
    </v-card>
  </v-dialog>

  <v-menu>
    <template v-slot:activator="{ props }">
      <v-avatar :size="size" v-bind="props" style="cursor: pointer">
        <v-img
          :src="user.picture"
          referrerpolicy="no-referrer"
          alt="Profile Picture"
        ></v-img>
      </v-avatar>
    </template>
    <v-list>
      <v-list-item @click="logout()">
        <v-list-item-title>Logout</v-list-item-title>
      </v-list-item>
      <v-list-item @click="showApiKeysDialog = !showApiKeysDialog">
        <v-list-item-title>API keys</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
import axios from "axios";
import RestApiClient from "@/RestApiClient";
import settings from "@/settings";
import { useUserStore } from "@/stores/user";

export default {
  name: "ProfileMenu",
  props: {
    size: String,
  },
  data() {
    return {
      userStore: useUserStore(),
      apiKeys: [],
      newApiKey: {
        name: "",
      },
      showApiKeysDialog: false,
      showApiKeysForm: false,
    };
  },
  computed: {
    user() {
      return this.userStore.user;
    },
    logoutUrl() {
      return settings.apiServerUrl + "/logout";
    },
  },
  methods: {
    logout() {
      axios
        .delete(this.logoutUrl, { withCredentials: true })
        .then((response) => {
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
        this.showApiKeysForm = false;
        this.newApiKey.displayName = "";
      });
    },
  },
  mounted() {
    this.getApiKeys();
  },
};
</script>
