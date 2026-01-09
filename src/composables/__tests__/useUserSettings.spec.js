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

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick } from "vue";

const SETTINGS_KEY = "openrelik-user-settings";

const originalLocalStorage = global.localStorage;

describe("useUserSettings", () => {
  beforeEach(() => {
    vi.resetModules();
    
    // Ensure localStorage exists and works
    const store = {};
    const mockStorage = {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value.toString();
        }),
        clear: vi.fn(() => {
            for (const key in store) delete store[key];
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
    };


    Object.defineProperty(global, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true
    });

    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalLocalStorage) {
        Object.defineProperty(global, 'localStorage', {
            value: originalLocalStorage,
            writable: true,
            configurable: true
        });
    } else {
        // If it didn't exist, maybe delete it? But safe to leave or restore undefined if configurable.
        // For happy-dom/jsdom it usually exists.
    }
  });

  it("should initialize with default settings when localStorage is empty", async () => {
    const { useUserSettings } = await import("../useUserSettings");
    const { settings } = useUserSettings();

    expect(settings.AIEnabled).toBe(true);
    expect(settings.AIFileSummaries).toBe(true);
    expect(settings.AIFileChat).toBe(true);
    expect(settings.WorkflowEditor).toBe("old");
    expect(settings.WorkflowChordCreation).toBe(false);
  });

  it("should initialize with saved settings from localStorage", async () => {
    const savedSettings = {
      AIEnabled: false,
      AIFileSummaries: false,
      WorkflowEditor: "old",
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(savedSettings));

    const { useUserSettings } = await import("../useUserSettings");
    const { settings } = useUserSettings();

    expect(settings.AIEnabled).toBe(false);
    expect(settings.AIFileSummaries).toBe(false);
    expect(settings.AIFileChat).toBe(true); // Default value for missing key
    expect(settings.WorkflowEditor).toBe("old");
  });

  it("should persist changes to localStorage", async () => {
    const { useUserSettings } = await import("../useUserSettings");
    const { settings } = useUserSettings();

    settings.AIEnabled = false;

    await nextTick();
    
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)).AIEnabled).toBe(false);
  });

  it("should merge new default settings with existing saved settings", async () => {
    // Simulate old settings that don't have WorkflowChordCreation
    const oldSettings = {
      AIEnabled: true,
      AIFileSummaries: true,
      AIFileChat: true,
      WorkflowEditor: "new",
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(oldSettings));

    const { useUserSettings } = await import("../useUserSettings");
    const { settings } = useUserSettings();

    expect(settings.WorkflowChordCreation).toBe(false);
    expect(settings.AIEnabled).toBe(true);
  });
});
