<template>
  <v-btn class="mr-3" icon @click="toggleTheme"
    ><v-icon>mdi-brightness-6</v-icon></v-btn
  >
</template>

<script setup>
import { useTheme } from "vuetify";

const theme = useTheme();
function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? "light" : "dark";
  localStorage.setItem("theme", theme.global.name.value);
}
</script>
