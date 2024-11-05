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

export const useAppStore = defineStore("app", {
  state: () => ({
    systemConfig: null,
    activeLLM: null,
    registeredCeleryTasks: [],
    workflowTemplates: [],
    groups: [],
  }),
  actions: {
    async setSystemConfig() {
      const response = await RestApiClient.getSystemConfig();
      this.systemConfig = await response;
      const llmName =
        localStorage.getItem("llm") || this.systemConfig.active_llms[0].name;
      const llm = this.systemConfig.active_llms.filter(
        (llm) => llm.name === llmName
      )[0];
      this.activeLLM = llm;
    },
    async setRegisteredCeleryTasks() {
      const response = await RestApiClient.getRegisteredCeleryTasks();
      this.registeredCeleryTasks = await response;
    },
    async setActiveLLM(llm) {
      this.activeLLM = llm;
      localStorage.setItem("llm", llm.name);
    },
    async setWorkflowTemplates() {
      const response = await RestApiClient.getWorkflowTemplates();
      this.workflowTemplates = await response;
    },
    async setGroups() {
      const response = await RestApiClient.getAllGroups();
      this.groups = await response;
    },
  },
});
