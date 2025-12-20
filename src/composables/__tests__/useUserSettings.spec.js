import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

const SETTINGS_KEY = "openrelik-user-settings";

describe("useUserSettings", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
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
