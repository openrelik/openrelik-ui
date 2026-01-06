import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import InvestigationContent from "../InvestigationContent.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { createTestingPinia } from "@pinia/testing";
import { vi } from "vitest";
import { useInvestigationStore } from "@/stores/investigation";

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({
    params: { folderId: "123" },
  })),
}));

// Mock visualViewport for Vuetify 3 dialogs
global.visualViewport = {
  width: 1024,
  height: 768,
  offsetLeft: 0,
  offsetTop: 0,
  pageLeft: 0,
  pageTop: 0,
  scale: 1,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

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
                         // Provide enough data so taskList and graph are populated
                         sessionData: { 
                             plan: "some plan",
                             questions: [{ id: 'q1', question: 'Q?', type: 'QUESTION' }],
                             tasks: [{ id: 't1', hypothesis_id: 'h1', task: 'T?', type: 'TASK' }],
                             hypotheses: [{ id: 'h1', question_id: 'q1', hypothesis: 'H', type: 'HYPOTHESIS'}]
                         },
                    }
                },
                // Allow getters to run based on state
                stubActions: false, 
            })
        ],
        provide: {
            "agent-fullscreen": {
                isFullscreen: { value: false },
            }
        }
      },
    });

    const tabs = wrapper.findAll(".custom-tab");
    
    // Tasks tab should be enabled now
    await tabs[1].trigger("click");
    expect(wrapper.vm.tab).toBe("tasks");
    
    // Graph tab should be enabled now
    await tabs[2].trigger("click");
    expect(wrapper.vm.tab).toBe("graph");
    
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
                    }
                },
                stubActions: false,
            })
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } }
      },
    });
    
    expect(wrapper.text()).toContain("Fenced Plan");
    expect(wrapper.html()).not.toContain("```markdown");
  });

  it("shows loading spinner when restoring session", () => {
    const wrapper = mount(InvestigationContent, {
      global: {
        plugins: [
            vuetify,
            createTestingPinia({
                initialState: {
                    investigation: {
                        sessionIsLoading: true,
                        sessionData: {},
                    }
                }
            })
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } }
      },
    });

    expect(wrapper.find(".v-progress-circular").exists()).toBe(true);
    expect(wrapper.findComponent({ name: "InvestigationForm" }).exists()).toBe(false);
  });

  it("disables Tasks and Graph tabs when data is missing", async () => {
    const wrapper = mount(InvestigationContent, {
      global: {
        plugins: [
            vuetify,
            createTestingPinia({
                initialState: {
                    investigation: {
                        sessionData: { plan: "some plan" },
                        // No tasks or graph nodes
                    }
                },
                stubActions: false,
            })
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } }
      },
    });

    const tabs = wrapper.findAll(".custom-tab");
    
    // Plan tab enabled
    expect(tabs[0].classes()).not.toContain("disabled-tab");
    // Tasks tab disabled
    expect(tabs[1].classes()).toContain("disabled-tab");
    // Graph tab disabled
    expect(tabs[2].classes()).toContain("disabled-tab");
    
    // Click should not work
    await tabs[1].trigger("click");
    expect(wrapper.vm.tab).toBe("plan");
  });

  it("enables Tasks and Graph tabs when data is present", async () => {
    const wrapper = mount(InvestigationContent, {
      global: {
        plugins: [
            vuetify,
            createTestingPinia({
                initialState: {
                    investigation: {
                        sessionData: { 
                             plan: "some plan",
                             questions: [{ id: 'q1', question: 'Q?', type: 'QUESTION' }],
                             tasks: [{ id: 't1', task: 'T?', type: 'TASK' }], // Orphan task is fine for logic check
                             // Just need > 0 tasks and > 0 nodes
                        },
                    }
                },
                stubActions: false,
            })
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } }
      },
    });

    const tabs = wrapper.findAll(".custom-tab");
    
    expect(tabs[1].classes()).not.toContain("disabled-tab");
    expect(tabs[2].classes()).not.toContain("disabled-tab");
    
    await tabs[1].trigger("click");
    expect(wrapper.vm.tab).toBe("tasks");
  });

  it("hides task count when count is 0", async () => {
    const wrapper = mount(InvestigationContent, {
      global: {
        plugins: [
            vuetify,
            createTestingPinia({
                initialState: {
                    investigation: {
                        sessionData: { plan: "some plan", tasks: [] },
                    }
                },
                stubActions: false,
            })
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } }
      },
    });

    const tasksTab = wrapper.findAll(".custom-tab")[1];
    expect(tasksTab.text()).toBe("Tasks");
  });

  it("shows task count when count > 0", async () => {
      const wrapper = mount(InvestigationContent, {
      global: {
        plugins: [
            vuetify,
            createTestingPinia({
                initialState: {
                    investigation: {
                        sessionData: { 
                             plan: "some plan",
                             questions: [{ id: 'q1', question: 'Q?', type: 'QUESTION' }],
                             tasks: [{ id: 't1', task: 'T?', type: 'TASK' }],
                        },
                    }
                },
                stubActions: false,
            })
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } }
      },
    });

    const tasksTab = wrapper.findAll(".custom-tab")[1];
    expect(tasksTab.text()).toBe("Tasks (1)");
  });

  it("shows Review and Approve buttons when approval is pending", async () => {
    const wrapper = mount(InvestigationContent, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                // Ensure plan is rendered
                sessionData: { plan: "some plan" },
                pendingApproval: true,
              },
            },
            stubActions: false,
          }),
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } },
      },
    });

    const buttons = wrapper.findAll(".v-btn");
    const reviewBtn = buttons.find((b) => b.text().includes("Review"));
    const approveBtn = buttons.find((b) => b.text().includes("Approve"));

    expect(reviewBtn).toBeDefined();
    expect(approveBtn).toBeDefined();
  });

  it("calls approveAction when Approve button is clicked", async () => {
    const wrapper = mount(InvestigationContent, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                sessionData: { plan: "some plan" },
                pendingApproval: true,
              },
            },
            stubActions: false,
          }),
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } },
      },
    });

    const investigationStore = useInvestigationStore();
    const approveSpy = vi.spyOn(investigationStore, "approveAction");

    const buttons = wrapper.findAll(".v-btn");
    const approveBtn = buttons.find((b) => b.text().includes("Approve"));
    await approveBtn.trigger("click");

    expect(approveSpy).toHaveBeenCalledWith("123"); // "123" is mocked route param
  });

  it("opens review dialog when Review button is clicked and submits review", async () => {
    const wrapper = mount(InvestigationContent, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                sessionData: { plan: "some plan" },
                pendingApproval: true,
              },
            },
            stubActions: false,
          }),
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } },
      },
    });

    const investigationStore = useInvestigationStore();
    const rejectSpy = vi.spyOn(investigationStore, "rejectAction");

    const buttons = wrapper.findAll(".v-btn");
    const reviewBtn = buttons.find((b) => b.text().includes("Review"));
    await reviewBtn.trigger("click");

    expect(wrapper.vm.showReviewDialog).toBe(true);

    // Set review reason
    wrapper.vm.reviewReason = "Needs more detail";
    await wrapper.vm.$nextTick();
    
    // Call submit directly or find the button in dialog (dialogs can be tricky in test-utils sometimes due to teleport)
    // For simplicity with shallow/stubs, we can call the method or trigger the dialog button if reachable.
    // Since we are using real vuetify components in mount, dialog content might be teleported.
    // Let's call the method to verify logic.
    await wrapper.vm.submitReview();

    expect(rejectSpy).toHaveBeenCalledWith("123", "Needs more detail");
    expect(wrapper.vm.showReviewDialog).toBe(false);
    expect(wrapper.vm.reviewReason).toBe("");
  });
});
