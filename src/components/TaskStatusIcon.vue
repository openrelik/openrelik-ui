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
