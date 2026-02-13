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

import { reactive, watch } from "vue";

const SETTINGS_KEY = "openrelik-user-settings";

const defaultSettings = {
  AIEnabled: true,
  AIFileSummaries: true,
  AIFileChat: true,
  AIWorkflowName: true,
  WorkflowEditor: "old",
  WorkflowChordCreation: false,
};

let savedSettings = null;
try {
  savedSettings = localStorage.getItem(SETTINGS_KEY);
} catch (error) {
  // LocalStorage not available or failed
}

const initialSettings = savedSettings
  ? { ...defaultSettings, ...JSON.parse(savedSettings) }
  : defaultSettings;

const settings = reactive(initialSettings);

watch(
  settings,
  (newSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  },
  { deep: true }
);

export function useUserSettings() {
  return {
    settings,
  };
}
