import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import InvestigationContent from "../InvestigationContent.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { createTestingPinia } from "@pinia/testing";

const vuetify = createVuetify({
  components,
  directives,
});

describe("InvestigationContent.vue", () => {
  it("renders default plan tab", () => {
     const wrapper = mount(InvestigationContent, {
      global: {
        plugins: [
            vuetify,
            createTestingPinia({
                initialState: {
                    investigation: {
                        sessionData: { plan: "## Plan Content" },
                        taskList: [],
                    }
                }
            })
        ],
        provide: {
            "agent-fullscreen": {
                isFullscreen: { value: false },
            }
        }
      },
    });

    expect(wrapper.text()).toContain("Investigation Plan");
    // Markdown content should be rendered
    expect(wrapper.html()).toContain("Plan Content");
  });

  it("switches tabs", async () => {
     const wrapper = mount(InvestigationContent, {
      global: {
        plugins: [
            vuetify,
            createTestingPinia({
                initialState: {
                    investigation: {
                        sessionData: { plan: "" },
                        taskList: [{ id: 1, label: "Task 1" }],
                    }
                }
            })
        ],
        provide: {
            "agent-fullscreen": {
                isFullscreen: { value: false },
            }
        }
      },
    });

    // Find tab buttons
    const tabs = wrapper.findAll(".custom-tab");
    // Click Tasks tab (index 1)
    await tabs[1].trigger("click");
    
    expect(wrapper.vm.tab).toBe("tasks");
    
    // Switch to Graph tab
    await tabs[2].trigger("click");
    expect(wrapper.vm.tab).toBe("graph");
    
    // Switch back to Plan tab
    await tabs[0].trigger("click");
    expect(wrapper.vm.tab).toBe("plan");
  });

  it("sanitizes and renders markdown plan with code fences", () => {
      const wrapper = mount(InvestigationContent, {
      global: {
        plugins: [
            vuetify,
            createTestingPinia({
                initialState: {
                    investigation: {
                        sessionData: { 
                            plan: "```markdown\n# Fenced Plan\n```" 
                        },
                        taskList: [],
                    }
                }
            })
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } }
      },
    });
    
    // It should strip the fences
    expect(wrapper.text()).toContain("Fenced Plan");
    expect(wrapper.html()).not.toContain("```markdown");
  });
});
