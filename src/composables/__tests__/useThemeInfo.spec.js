/*
Copyright 2025 Google LLC

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
