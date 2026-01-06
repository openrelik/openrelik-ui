/*
Copyright 2025-2026 Google LLC

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
export const getStatusIcon = (status) => {
  switch (status) {
    case "COMPLETED":
    case "PROVEN":
    case "SUPPORTS_PARENT":
      return "mdi-check-circle";
    case "FAILED":
    case "DISPROVEN":
    case "REFUTES_PARENT":
      return "mdi-close-circle";
    case "IN_PROGRESS":
    case "RUNNING":
      return "mdi-play-circle-outline";
    case "DATA_UNAVAILABLE":
      return "mdi-alert-circle-outline";
    case "PENDING":
      return "mdi-clock-outline";
    default:
      return "mdi-circle-outline";
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case "COMPLETED":
    case "PROVEN":
    case "SUPPORTS_PARENT":
      return "success";
    case "FAILED":
    case "DISPROVEN":
    case "REFUTES_PARENT":
      return "error";
    case "IN_PROGRESS":
    case "RUNNING":
      return "info";
    case "DATA_UNAVAILABLE":
      return "warning";
    default:
      return "grey";
  }
};
