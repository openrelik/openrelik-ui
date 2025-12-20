import { computed } from "vue";
import { useTheme } from "vuetify";

/**
 * Composable to provide easy access to theme-related information.
 * 
 * @returns {Object} { isLight, theme }
 */
export function useThemeInfo() {
  const theme = useTheme();
  
  const isLightTheme = computed(() => theme.global.name.value === "light");
  
  return {
    isLightTheme,
    theme,
  };
}
