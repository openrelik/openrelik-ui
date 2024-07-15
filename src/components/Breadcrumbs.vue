<template>
  <!-- Recursive case: If there's a parent, render this component for the parent -->
  <breadcrumbs v-if="folder && folder.parent" :folder="folder.parent" />
  <v-breadcrumbs-divider v-if="folder && folder.parent"></v-breadcrumbs-divider>
  <!-- Base case: Display the current item -->
  <v-breadcrumbs-item
    v-if="folder"
    :to="{
      name: 'folder',
      params: { folderId: folder.id },
    }"
  >
    {{ folder.display_name }}
  </v-breadcrumbs-item>
</template>

<script>
export default {
  name: "breadcrumb",
  props: {
    folder: {
      required: true,
    },
  },
};
</script>
