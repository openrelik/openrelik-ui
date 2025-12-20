import { describe, it, expect, vi } from "vitest";
import { useThemeInfo } from "../useThemeInfo";
import { ref } from "vue";

// Mock vuetify
vi.mock("vuetify", () => ({
  useTheme: vi.fn(),
}));

import { useTheme } from "vuetify";

describe("useThemeInfo", () => {
  it("should return true for isLightTheme when theme is light", () => {
    useTheme.mockReturnValue({
      global: {
        name: ref("light"),
      },
    });

    const { isLightTheme } = useThemeInfo();
    expect(isLightTheme.value).toBe(true);
  });

  it("should return false for isLightTheme when theme is dark", () => {
    useTheme.mockReturnValue({
      global: {
        name: ref("dark"),
      },
    });

    const { isLightTheme } = useThemeInfo();
    expect(isLightTheme.value).toBe(false);
  });
});
