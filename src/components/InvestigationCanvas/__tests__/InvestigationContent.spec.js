/*
Copyright 2025-2026 Google LLC

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
              },
            },
          }),
        ],
        provide: {
          "agent-fullscreen": {
            isFullscreen: { value: false },
          },
        },
      },
    });

    expect(wrapper.text()).toContain("Investigation Plan");
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
                sessionData: {
                  plan: "some plan",
                  questions: [{ id: "q1", question: "Q?", type: "QUESTION" }],
                  tasks: [
                    { id: "t1", hypothesis_id: "h1", task: "T?", type: "TASK" },
                  ],
                  hypotheses: [
                    {
                      id: "h1",
                      question_id: "q1",
                      hypothesis: "H",
                      type: "HYPOTHESIS",
                    },
                  ],
                },
              },
            },
            stubActions: false,
          }),
        ],
        provide: {
          "agent-fullscreen": {
            isFullscreen: { value: false },
          },
        },
      },
    });

    const tabs = wrapper.findAll(".custom-tab");

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
                  plan: "```markdown\n# Fenced Plan\n```",
                },
              },
            },
            stubActions: false,
          }),
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } },
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
              },
            },
          }),
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } },
      },
    });

    expect(wrapper.find(".v-progress-circular").exists()).toBe(true);
    expect(wrapper.findComponent({ name: "InvestigationForm" }).exists()).toBe(
      false
    );
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
              },
            },
            stubActions: false,
          }),
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } },
      },
    });

    const tabs = wrapper.findAll(".custom-tab");

    expect(tabs[2].classes()).toContain("disabled-tab");

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
                  questions: [{ id: "q1", question: "Q?", type: "QUESTION" }],
                  tasks: [{ id: "t1", task: "T?", type: "TASK" }],
                },
              },
            },
            stubActions: false,
          }),
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } },
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
              },
            },
            stubActions: false,
          }),
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } },
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
                  questions: [{ id: "q1", question: "Q?", type: "QUESTION" }],
                  tasks: [{ id: "t1", task: "T?", type: "TASK" }],
                },
              },
            },
            stubActions: false,
          }),
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } },
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

    expect(approveSpy).toHaveBeenCalledWith("123");
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

    wrapper.vm.reviewReason = "Needs more detail";
    await wrapper.vm.$nextTick();

    await wrapper.vm.submitReview();

    expect(rejectSpy).toHaveBeenCalledWith("123", "Needs more detail");
    expect(wrapper.vm.showReviewDialog).toBe(false);
    expect(wrapper.vm.reviewReason).toBe("");
  });

  it("shows progress circular when plan is being drafted", () => {
    const wrapper = mount(InvestigationContent, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                sessionData: { plan: null, context: "some context" },
              },
            },
          }),
        ],
        provide: { "agent-fullscreen": { isFullscreen: { value: false } } },
      },
    });

    expect(wrapper.find(".v-progress-circular").exists()).toBe(true);
    expect(wrapper.text()).toContain("Plan is being drafted...");
  });
});
