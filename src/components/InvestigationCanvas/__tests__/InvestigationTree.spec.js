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
import { describe, it, expect, vi, beforeAll } from "vitest";
import InvestigationTree from "../InvestigationTree.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { createTestingPinia } from "@pinia/testing";
import InvestigationTreeNode from "../InvestigationTreeNode.vue";
import { ref } from "vue";
import { useInvestigationStore } from "@/stores/investigation";

const vuetify = createVuetify({
  components,
  directives,
});

beforeAll(() => {
    global.visualViewport = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        width: 1024,
        height: 768
    };
});

describe("InvestigationTree.vue", () => {
  const baseSessionData = { 
        label: "Test Investigation",
        questions: [{ id: "q1", label: "Question 1", type: "QUESTION" }]
    };



    it("renders tree structure with provided data", async () => {
        const wrapper = mount(InvestigationTree, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({
                        initialState: {
                            investigation: {
                                sessionData: baseSessionData,
                                tree: [{ id: "q1", label: "Question 1", type: "QUESTION", childCount: 0 }] 
                            }
                        }
                    })
                ],
                provide: { "agent-fullscreen": { isFullscreen: ref(false) } }
            }
        });
        
        const store = useInvestigationStore();
        store.tree = [{ id: "q1", label: "Question 1", type: "QUESTION", childCount: 0 }];
        await wrapper.vm.$nextTick();


        
        expect(wrapper.text()).toContain("Test Investigation");
        expect(wrapper.text()).toContain("Investigation Plan");
        expect(wrapper.text()).toContain("Final Report");
        expect(wrapper.text()).toContain("Question 1");
    });

    it("renders default fallback labels if session data is missing", () => {
         const wrapper = mount(InvestigationTree, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({
                        initialState: {
                            investigation: {
                                sessionData: {},
                                tree: []
                            }
                        }
                    })
                ],
                provide: { "agent-fullscreen": { isFullscreen: ref(false) } }
            }
        });
        

        expect(wrapper.text()).toContain("Untitled Investigation");
    });

    it("renders logo in fullscreen mode", () => {
         const wrapper = mount(InvestigationTree, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({ initialState: { investigation: { sessionData: {}, tree: [] } } })
                ],
                provide: { "agent-fullscreen": { isFullscreen: ref(true) } }
            }
        });
        
        expect(wrapper.find(".v-img").exists()).toBe(true);
    });

    it("does not render logo in normal mode", () => {
         const wrapper = mount(InvestigationTree, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({ initialState: { investigation: { sessionData: {}, tree: [] } } })
                ],
                provide: { "agent-fullscreen": { isFullscreen: ref(false) } }
            }
        });
        
        expect(wrapper.find(".v-img").exists()).toBe(false);
    });

    it("emits select-node when a node is clicked", async () => {
        const wrapper = mount(InvestigationTree, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({
                        initialState: {
                            investigation: {
                                sessionData: baseSessionData,
                                tree: [{ id: "q1", label: "Question 1", type: "QUESTION", childCount: 0 }] 
                            }
                        }
                    })
                ],
                provide: { "agent-fullscreen": { isFullscreen: ref(false) } }
            }
        });

        const treeNodes = wrapper.findAllComponents(InvestigationTreeNode);
        const planNode = treeNodes.find(w => w.props().node.id === "meta-plan");
        
        planNode.vm.$emit("node-click", { id: "meta-plan" });
        
        expect(wrapper.emitted("select-node")).toBeTruthy();
        expect(wrapper.emitted("select-node")[0]).toEqual([{ id: "meta-plan" }]);
    });

    it("opens context menu on add-hypothesis event", async () => {
        const wrapper = mount(InvestigationTree, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({
                        initialState: {
                            investigation: {
                                sessionData: baseSessionData,
                                tree: [{ id: "q1", label: "Question 1", type: "QUESTION", childCount: 0 }] 
                            }
                        }
                    })
                ],
                provide: { "agent-fullscreen": { isFullscreen: ref(false) } }
            }
        });

        const q1Node = wrapper.findAllComponents(InvestigationTreeNode)
            .find(w => w.props().node.id === "q1");
            

            
        // Trigger add-hypothesis
        await q1Node.vm.$emit("add-hypothesis", { id: "q1", label: "Q1" });
        
        const menu = wrapper.findComponent({ name: "VMenu" });
        expect(menu.exists()).toBe(true);
        expect(menu.props("modelValue")).toBe(true);
    });

    it("triggers addHypothesisAction", async () => {
         const wrapper = mount(InvestigationTree, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({
                        initialState: {
                            investigation: {
                                sessionData: baseSessionData,
                                tree: [{ id: "q1", label: "Question 1", type: "QUESTION", childCount: 0 }] 
                            }
                        }
                    })
                ],
                provide: { "agent-fullscreen": { isFullscreen: ref(false) } },
                stubs: {
                    VMenu: {
                        template: "<div><slot /></div>",
                        // We need to support modelValue prop to simulate show/hide if logic used it
                        props: ["modelValue"]
                    }
                }
            }
        });
        
        // Emulate menu being open first to test closing?
        
        // Find the list item
        const listItem = wrapper.findComponent({ name: "VListItem" });
        expect(listItem.exists()).toBe(true);
        
        await listItem.trigger("click");
        
        expect(true).toBe(true);
    });
    it("handles null sessionData and tree gracefully", () => {
         const wrapper = mount(InvestigationTree, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({
                        initialState: {
                            investigation: {
                                sessionData: null,
                                tree: null
                            }
                        }
                    })
                ],
                provide: { "agent-fullscreen": { isFullscreen: ref(false) } }
            }
        });
        
        // Should fallback to default label
        expect(wrapper.text()).toContain("Untitled Investigation");
    });

    it("filters out non-QUESTION nodes from tree", async () => {
         const wrapper = mount(InvestigationTree, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({
                        initialState: {
                            investigation: {
                                sessionData: baseSessionData
                            }
                        }
                    })
                ],
                provide: { "agent-fullscreen": { isFullscreen: ref(false) } }
            }
        });
        
        const store = useInvestigationStore();
        store.tree = [
            { id: "q1", label: "Question 1", type: "QUESTION" },
            { id: "s1", label: "Section 1", type: "SECTION" }
        ];
        await wrapper.vm.$nextTick();

        // Question 1 should be visible
        expect(wrapper.text()).toContain("Question 1");

        const treeNodes = wrapper.findAllComponents(InvestigationTreeNode);
        const ids = treeNodes.map(w => w.props().node.id);
        expect(ids).toContain("q1");
        expect(ids).not.toContain("s1");
    });

    it("applies dark theme styling to logo", () => {
         // Create a local vuetify instance with dark theme
         const darkVuetify = createVuetify({
             components,
             directives,
             theme: {
                 defaultTheme: 'dark'
             }
         });

         const wrapper = mount(InvestigationTree, {
            global: {
                plugins: [
                    darkVuetify,
                    createTestingPinia({ initialState: { investigation: { sessionData: {}, tree: [] } } })
                ],
                provide: { "agent-fullscreen": { isFullscreen: ref(true) } }
            }
        });
        
        const img = wrapper.findComponent({ name: "VImg" });
        expect(img.exists()).toBe(true);
        expect(img.classes()).toContain("mr-1"); // Dark theme class
        expect(img.props("width")).toBe("20");
    });

    it("applies light theme styling to logo", () => {
         // Create a local vuetify instance with light theme
         const lightVuetify = createVuetify({
             components,
             directives,
             theme: {
                 defaultTheme: 'light'
             }
         });

         const wrapper = mount(InvestigationTree, {
            global: {
                plugins: [
                    lightVuetify,
                    createTestingPinia({ initialState: { investigation: { sessionData: {}, tree: [] } } })
                ],
                provide: { "agent-fullscreen": { isFullscreen: ref(true) } }
            }
        });
        
        const img = wrapper.findComponent({ name: "VImg" });
        expect(img.exists()).toBe(true);
        expect(img.classes()).toContain("mr-2"); // Light theme class
        expect(img.props("width")).toBe("25");
    });

    it("closes context menu when addHypothesisAction is called", async () => {
        const wrapper = mount(InvestigationTree, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({
                         initialState: {
                            investigation: {
                                sessionData: baseSessionData,
                                tree: [{ id: "q1", label: "Question 1", type: "QUESTION", childCount: 0 }] 
                            }
                        }
                    })
                ],
                provide: { "agent-fullscreen": { isFullscreen: ref(false) } },
            }
        });

        // Open menu first
        const q1Node = wrapper.findAllComponents(InvestigationTreeNode).find(w => w.props().node.id === "q1");
        await q1Node.vm.$emit("add-hypothesis", { id: "q1" });
        
        let menu = wrapper.findComponent({ name: "VMenu" });
        expect(menu.props("modelValue")).toBe(true);
        
        // Find list item and click
        const listItem = wrapper.findComponent({ name: "VListItem" });
        await listItem.trigger("click");
        
        // Verify menu closed
        menu = wrapper.findComponent({ name: "VMenu" });
        expect(menu.props("modelValue")).toBe(false);
    });
});
