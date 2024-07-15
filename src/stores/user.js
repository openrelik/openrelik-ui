// Utilities
import { defineStore } from "pinia";
import RestApiClient from "@/RestApiClient";

export const useUserStore = defineStore("user", {
  state: () => ({
    user: null,
  }),
  actions: {
    async setUser() {
      const response = await RestApiClient.getUser();
      this.user = response;
    },
  },
});
