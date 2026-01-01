/*
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
*/

// Utilities
import { defineStore } from "pinia";
import RestApiClient from "@/RestApiClient";

export const useInvestigationStore = defineStore("investigation", {
  state: () => ({
    sessionId: null,
    chatMessages: [],
    isLoading: false,
    sessionData: {},
    isListening: false,
  }),
  actions: {
    async createSession(folderId) {
      const response = await RestApiClient.createAgentSession(folderId);
      this.sessionId = response.session_id;
      this.getSessionData(folderId);
    },
    getSessionData(folderId) {
      if (this.isListening) return;
      this.isListening = true;
      RestApiClient.sse(
        "folders/" + folderId + "/investigations/" + this.sessionId
      ).subscribe({
        next: (data) => {
          data = JSON.parse(data);
          this.sessionData = data["state"];
        },
        error: (err) => {
          console.error(err);
          this.isListening = false;
        },
      });
    },
    async runAgent(folderId) {
      const requestBody = {
        session_id: this.sessionId,
        agent_name: "dfir_multi_agent",
      };
      
      this.isLoading = true;
      this.getSessionData(folderId);

      RestApiClient.sse(
        "folders/" + folderId + "/investigations/run",
        requestBody
      ).subscribe({
        next: (data) => {
          this.isLoading = true;
          this.chatMessages.push(JSON.parse(data));
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
          console.log("done");
        },
      });
    },
  },
});
