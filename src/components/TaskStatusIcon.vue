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
  <span>
    <v-icon v-if="taskStatus === 'SUCCESS'" color="success"
      >mdi-check-circle-outline
    </v-icon>
    <v-icon
      v-if="
        taskStatus === 'STARTED' ||
        taskStatus === 'RECEIVED' ||
        taskStatus === null
      "
      color="grey-lighten-1"
      >mdi-history
    </v-icon>
    <v-icon v-if="taskStatus === 'FAILURE'" color="error"
      >mdi-alert-outline
    </v-icon>

    <v-progress-circular
      v-if="taskStatus === 'PROGRESS'"
      indeterminate
      size="19"
      width="2"
      color="warning"
      style="margin-left: 2px"
    ></v-progress-circular>
  </span>
</template>

<script>
export default {
  name: "TaskProgressIcon",
  props: { taskStatus: String },
};
</script>

<style scoped></style>
