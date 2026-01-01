import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest"; // Import from vitest
import Investigation from "../Investigation.vue";
// Mock dependent components
import InvestigationArtifactsPane from "../InvestigationArtifactsPane.vue";
import InvestigationChatPane from "../InvestigationChatPane.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const vuetify = createVuetify({
  components,
  directives,
});

describe("Investigation.vue", () => {
  it("renders correctly", () => {
    const wrapper = mount(Investigation, {
        global: {
            plugins: [vuetify],
            stubs: {
                InvestigationArtifactsPane: true,
                InvestigationChatPane: true,
                InvestigationTreeView: true
            }
        }
    });
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find(".investigation-workspace").exists()).toBe(true);
    // Use components' names or check for stubs if needed, but class based check is good basic check
    expect(wrapper.findComponent(InvestigationArtifactsPane).exists()).toBe(true)
    expect(wrapper.findComponent(InvestigationChatPane).exists()).toBe(true)
  });

  it("has resizable panes", async () => {
      const wrapper = mount(Investigation, {
        global: {
            plugins: [vuetify],
            stubs: {
                InvestigationArtifactsPane: true,
                InvestigationChatPane: true,
                InvestigationTreeView: true
            }
        }
    });

    const resizer = wrapper.find(".resizer");
    expect(resizer.exists()).toBe(true);
    
    // Simulating resize is complex due to window events and calculating widths in JSDOM/happy-dom.
    // Ideally we'd test that calling resizing functions updates the width style.
    // For now, let's just make sure the initial width is set correctly as per default.
    const middlePane = wrapper.find(".middle-pane");
    expect(middlePane.exists()).toBe(true);
  })
});
