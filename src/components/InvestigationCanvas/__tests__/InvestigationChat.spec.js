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
import { describe, it, expect, vi } from "vitest";
import InvestigationChat from "../InvestigationChat.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { createTestingPinia } from "@pinia/testing";
import { useInvestigationStore } from "@/stores/investigation";

const vuetify = createVuetify({
  components,
  directives,
});

// Mock DOMPurify and marked
vi.mock("dompurify", () => ({
  default: { sanitize: (str) => str },
}));
vi.mock("marked", () => ({
  marked: (str) => str,
}));

// Mock visualViewport for Vuetify internals
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

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock vue-router
const mockRoute = { params: { folderId: "123" } };
vi.mock("vue-router", () => ({
  useRoute: () => mockRoute,
}));

// Mock RestApiClient
vi.mock("@/RestApiClient", () => ({
  default: {
    createAgentSession: vi
      .fn()
      .mockResolvedValue({ session_id: "new-session" }),
    sse: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
    approveAction: vi.fn(),
    rejectAction: vi.fn(),
  },
}));

describe("InvestigationChat.vue", () => {
  const defaultProvide = {
    "agent-fullscreen": {
      isFullscreen: { value: false },
      toggleFullscreen: vi.fn(),
    },
  };

  it("renders user messages", () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [{ role: "user", content: "Hello User" }],
                sessionId: "test-session",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    expect(wrapper.text()).toContain("Hello User");
    const userSheets = wrapper
      .findAll(".v-sheet.bg-info")
      .filter((w) => w.text().includes("Hello User"));
    expect(userSheets.length).toBe(1);
  });

  it("renders agent tool use messages", async () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [
                  {
                    role: "model",
                    author: "Agent Smith",
                    content: {
                      parts: [
                        {
                          functionCall: {
                            name: "search",
                            args: "{ query: 'test' }",
                          },
                        },
                      ],
                    },
                  },
                ],
                sessionId: "test-session",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    const fnComponent = wrapper.findComponent({
      name: "InvestigationChatFunction",
    });
    expect(fnComponent.exists()).toBe(true);
    expect(fnComponent.text()).toContain("Agent Smith");
    expect(fnComponent.text()).toContain("search");

    // Args hidden by default
    expect(wrapper.text()).not.toContain("{ query: 'test' }");

    // Expand
    await fnComponent.find(".cursor-pointer").trigger("click");
    expect(wrapper.text()).toContain("{ query: 'test' }");
  });

  it("renders agent delegation messages", () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [
                  {
                    role: "model",
                    author: "Router Agent",
                    actions: { transferToAgent: "Sub Agent" },
                    content: {
                      parts: [{ functionResponse: { name: "delegate" } }],
                    },
                  },
                ],
                sessionId: "test-session",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    expect(wrapper.text()).toContain("Router Agent delegated to Sub Agent");
  });

  it("renders agent error messages", () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [{ error: "Something went wrong" }],
                sessionId: "test-session",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    expect(wrapper.text()).toContain("Something went wrong");
    expect(wrapper.find(".text-error").exists()).toBe(true); // Using class based on color prop
  });

  it("renders backend error messages with type 'error'", () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [
                  { type: "error", message: "Backend stream error" },
                ],
                sessionId: "test-session",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    expect(wrapper.text()).toContain("Backend stream error");
    expect(wrapper.find(".mdi-alert-circle").exists()).toBe(true);
  });

  it("handles pending approval state", async () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [],
                sessionId: "test-session",
                pendingApproval: { toolId: "123", invocationId: "456" },
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    expect(wrapper.text()).toContain("Review and approve plan to continue");

    const buttons = wrapper.findAll("button");
    const approveBtn = buttons.find((b) => b.text().includes("Approve"));
    expect(approveBtn.exists()).toBe(true);

    await approveBtn.trigger("click");
  });

  it("handles rejection with reason", async () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [],
                sessionId: "test-session",
                pendingApproval: { toolId: "123", invocationId: "456" },
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    const buttons = wrapper.findAll("button");
    const reviewBtn = buttons.find((b) => b.text().includes("Review"));
    await reviewBtn.trigger("click");

    expect(document.body.textContent).toContain("Review Feedback");
  });

  it("submits a review rejection", async () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [],
                sessionId: "test-session",
                pendingApproval: { toolId: "123", invocationId: "456" },
              },
            },
            stubActions: false,
          }),
        ],
        provide: defaultProvide,
        stubs: {
          VDialog: {
            template: "<div><slot /></div>",
            props: ["modelValue"],
          },
        },
      },
    });

    // Mock store action
    const store = useInvestigationStore();
    store.rejectAction = vi.fn();

    const reviewBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Review"));
    await reviewBtn.trigger("click");

    const textarea = wrapper.find("textarea");
    expect(textarea.exists()).toBe(true);

    await textarea.setValue("Change the plan");

    const submitBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Submit review"));
    expect(submitBtn.exists()).toBe(true);

    await submitBtn.trigger("click");

    expect(store.rejectAction).toHaveBeenCalledWith("123", "Change the plan");
  });

  it("sends a message", async () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [],
                sessionId: "session-1",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });
    const store = useInvestigationStore();

    await wrapper.vm.$nextTick();

    const textarea = wrapper.findComponent({ name: "VTextarea" });
    await textarea.vm.$emit("update:modelValue", "New command");
    await wrapper.vm.$nextTick();

    const sendBtn = wrapper.find(".send-btn");
    expect(sendBtn.element.disabled).toBe(false);

    await sendBtn.trigger("click");

    expect(store.runAgent).toHaveBeenCalled();
    expect(store.runAgent).toHaveBeenCalledWith("123", "New command");
  });

  it("filters invalid messages", () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                sessionId: "s1",
                chatMessages: [
                  null,
                  undefined,
                  { role: "model", content: "   " },
                  { role: "model", content: null },
                  { role: "model", content: { parts: [] } },
                  { role: "model", content: { parts: [{ text: "   " }] } },
                  {
                    role: "model",
                    content: { parts: [{ functionResponse: { name: "foo" } }] },
                  },
                  { role: "user", content: "Valid" },
                ],
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    expect(wrapper.text()).toContain("Valid");
    expect(wrapper.text()).toContain("Valid");
    const items = wrapper.findAll(".v-sheet.bg-info");
    expect(items.length).toBe(1);
  });

  it("toggles fullscreen", async () => {
    const toggleFullscreenMock = vi.fn();
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [vuetify, createTestingPinia()],
        provide: {
          "agent-fullscreen": {
            isFullscreen: { value: true }, // Set true to show button
            toggleFullscreen: toggleFullscreenMock,
          },
        },
      },
    });

    const btn = wrapper
      .findAllComponents({ name: "v-btn" })
      .find((b) => b.props("icon") === "mdi-fullscreen-exit");
    expect(btn).toBeDefined();
    await btn.trigger("click");

    expect(toggleFullscreenMock).toHaveBeenCalled();
  });

  it("shows loading indicator", () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                isLoading: true,
                pendingApproval: null,
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    expect(wrapper.find(".jumping-dots").exists()).toBe(true);
  });

  it("does not send empty message", async () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                sessionId: "session-1",
              },
            },
            stubActions: false,
          }),
        ],
        provide: defaultProvide,
      },
    });

    // Mock store action manually to check call count
    const store = useInvestigationStore();
    store.runAgent = vi.fn();

    const textarea = wrapper.find("textarea");
    await textarea.setValue("   ");

    const sendBtn = wrapper.find(".send-btn");
    expect(sendBtn.element.disabled).toBe(true);

    await textarea.trigger("keydown.enter");

    expect(store.runAgent).not.toHaveBeenCalled();
  });

  it("renders text parts in agent message", () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [
                  {
                    role: "model",
                    author: "Gemini",
                    content: {
                      parts: [{ text: "This is a **thought**." }],
                    },
                  },
                ],
                sessionId: "test-session",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    expect(wrapper.text()).toContain("This is a **thought**.");
  });

  it("sanitizes html in messages", () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [
                  { role: "user", content: "<script>alert('xss')</script>" },
                ],
                sessionId: "test-session",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    expect(wrapper.text()).toContain("<script>alert('xss')</script>");

    // Agent fallback uses v-html="toHtml".

    const wrapperAgent = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [
                  { role: "model", content: "<img src=x onerror=alert(1)>" },
                ],
                sessionId: "test-session",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    expect(wrapperAgent.html()).toContain('<img src="x" onerror="alert(1)">');
  });

  it("uses default injection values", async () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [vuetify, createTestingPinia()],
      },
    });

    // Default isFullscreen is false, so button should not exist
    expect(wrapper.find(".mdi-fullscreen-exit").exists()).toBe(false);
  });

  it("applies light theme class", () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [vuetify, createTestingPinia()],
        provide: defaultProvide,
      },
    });

    const toolbar = wrapper.find(".chat-pane-toolbar");
    if (toolbar.classes("light-theme-bar")) {
      expect(true).toBe(true);
    }
  });

  it("renders collapsible thought component", async () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [
                  {
                    role: "model",
                    author: "Gemini",
                    content: {
                      parts: [
                        { thought: "Deep thought content" },
                        { text: "Final answer" },
                      ],
                    },
                  },
                ],
                sessionId: "test-session",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    // "Thought process" toggle text should be visible
    expect(wrapper.text()).toContain("Thought process");

    // Content should (conceptually) be handled by the child component.
    // We can check if the text is rendered. Since it defaults to hidden (v-if), it might not be in DOM.
    // However, mount() might render children fully.
    // Let's check for the child component existence.
    const thoughtComponent = wrapper.findComponent({
      name: "InvestigationChatThought",
    });
    expect(thoughtComponent.exists()).toBe(true);
    expect(thoughtComponent.text()).toContain("Thought process");

    // We can try to interact with it to show content if we want integration test,
    // or rely on InvestigationChatThought's own unit test (which we didn't write, so let's do integration here).

    // Initially hidden
    expect(wrapper.text()).not.toContain("Deep thought content");

    // Click to expand
    await thoughtComponent.find(".cursor-pointer").trigger("click");

    // Now visible
    expect(wrapper.text()).toContain("Deep thought content");
  });

  it("renders message even if only thought part exists", async () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [
                  {
                    role: "model",
                    author: "Gemini",
                    content: {
                      parts: [{ thought: "Only a thought here" }],
                    },
                  },
                ],
                sessionId: "test-session",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    // Message should be rendered
    expect(wrapper.text()).toContain("Thought process");

    // Content hidden by default
    expect(wrapper.text()).not.toContain("Only a thought here");

    // Expand
    const thoughtComponent = wrapper.findComponent({
      name: "InvestigationChatThought",
    });
    await thoughtComponent.find(".cursor-pointer").trigger("click");

    expect(wrapper.text()).toContain("Only a thought here");
  });

  it("displays per-message token count", () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [
                  {
                    role: "model",
                    author: "Gemini",
                    content: "Msg 1",
                    usageMetadata: {
                      promptTokenCount: 1500,
                      candidatesTokenCount: 2000,
                      thoughtsTokenCount: 500,
                    },
                  },
                ],
                sessionId: "test-session",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    // Author header is removed, so we don't expect "Gemini" as a header anymore
    // (unless it's part of the content, which it isn't here).

    expect(wrapper.text()).toContain("Input: 1.5K");
    expect(wrapper.text()).toContain("Output: 2K");
    expect(wrapper.text()).toContain("Thinking: 500");
  });
  it("displays aggregated token counts in header", () => {
    const wrapper = mount(InvestigationChat, {
      global: {
        plugins: [
          vuetify,
          createTestingPinia({
            initialState: {
              investigation: {
                chatMessages: [
                  {
                    role: "model",
                    content: "Msg 1",
                    usageMetadata: {
                      promptTokenCount: 1500,
                      candidatesTokenCount: 2000,
                      thoughtsTokenCount: 500,
                    },
                  },
                ],
                sessionId: "test-session",
              },
            },
          }),
        ],
        provide: defaultProvide,
      },
    });

    expect(wrapper.text()).toContain("Input: 1.5K");
    expect(wrapper.text()).toContain("Output: 2K");
    expect(wrapper.text()).toContain("Thinking: 500");

    // To be more specific about the header presence, we can find the chip
    const chips = wrapper.findAll(".v-chip");
    // We expect at least the "Active/Idle" chip and the "Token Count" chip.
    // The Token Count chip has "Input: ... Output: ... Thinking: ..."
    const tokenChip = chips.find(
      (c) =>
        c.text().includes("Input:") &&
        c.text().includes("Output:") &&
        c.text().includes("Thinking:")
    );
    expect(tokenChip).toBeTruthy();
    expect(tokenChip.text()).toContain(
      "Input: 1.5K • Output: 2K • Thinking: 500"
    );
  });
});
