import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import InvestigationChatPane from "../InvestigationChatPane.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const vuetify = createVuetify({
  components,
  directives,
});

describe("InvestigationChatPane.vue", () => {
  it("renders user messages with info color", async () => {
    const wrapper = mount(InvestigationChatPane, {
      global: {
        plugins: [vuetify],
        provide: {
            "agent-fullscreen": {
                isFullscreen: { value: false },
                toggleFullscreen: () => {}
            }
        }
      },
    });

    // Simulate sending a message
    const textarea = wrapper.find("textarea");
    await textarea.setValue("Hello Investigation");
    await textarea.trigger("keydown.enter");

    // Check for user message sheet
    const userSheets = wrapper.findAll(".v-sheet").filter(s => s.text().includes("Hello Investigation"));
    expect(userSheets.length).toBe(1);
    expect(userSheets[0].attributes("class")).toContain("bg-info");
  });
});
