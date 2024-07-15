<template>
  <v-container fluid style="margin-top: 10vh">
    <v-card flat class="mx-auto" max-width="700" color="transparent">
      <template v-slot:title>
        <h2>{{ title }}</h2>
      </template>
      <template v-slot:subtitle>
        {{ subtitle }}
      </template>
      <template v-slot:text>
        <code>
          {{ text }}
        </code>
      </template>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: "TEAMPLATE",
  components: {},
  data() {
    return {
      title: "Title of the page",
      subtitle: "Subtitle of the page.",
      text: "Placeholder",
    };
  },
};
</script>
