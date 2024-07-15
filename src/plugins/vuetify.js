/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com
 */

// Styles
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

// Composables
import { createVuetify } from "vuetify";

const relikDark = {
  dark: true,
  colors: {
    // Background colors
    background: "#121212",
    "surface-light": "#181818", // card appbar
    "surface-bright": "#ccbfd6",
    "surface-variant": "#a3a3a3",

    // Font colors
    "on-background": "#cecece",
    "on-surface": "#cecece",
    "on-surface-light": "#cecece",

    // Base colors
    primary: "#2196F3",
    secondary: "#54B6B2",
    error: "#CF6679",
    info: "#5378be",
    success: "#4CAF50",
    warning: "#FB8C00",

    // Custom colors
    // Access in templates with rgb(var(--v-theme-workflow-line-color))
    "custom-hover-color": "#202020",
    "custom-border-color": "#333333",
  },
};

const relikLight = {
  dark: false,
  colors: {
    // Background colors
    background: "#FFFFFF",
    surface: "#FFFFFF",
    "surface-bright": "#FFFFFF",
    "surface-light": "#EEEEEE",
    "surface-variant": "#424242",

    // Base colors
    primary: "#1867C0",
    secondary: "#48A9A6",
    error: "#B00020",
    info: "#2196F3",
    success: "#4CAF50",
    warning: "#FB8C00",

    // Custom colors
    // Access in templates with rgb(var(--v-theme-workflow-line-color))
    "custom-hover-color": "#f8f8f8",
    "custom-border-color": "#d4d4d4",
  },
};

export default createVuetify({
  theme: {
    defaultTheme: "light",
    options: {
      customProperties: true,
    },
    themes: {
      dark: relikDark,
      light: relikLight,
    },
  },
});
