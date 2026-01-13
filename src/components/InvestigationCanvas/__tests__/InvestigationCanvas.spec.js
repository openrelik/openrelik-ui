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
import InvestigationCanvas from "../InvestigationCanvas.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { ref } from "vue";

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

describe("InvestigationCanvas.vue", () => {
    const mountWrapper = () => {
        return mount(InvestigationCanvas, {
            global: {
                plugins: [vuetify],
                stubs: {
                    InvestigationContent: { template: "<div class='content-pane-stub'></div>" },
                    InvestigationChat: { template: "<div class='chat-pane-stub'></div>" },
                    InvestigationTree: { template: "<div class='tree-view-stub'></div>", emits: ["select-node"] }
                },
                provide: {
                    "agent-fullscreen": { isFullscreen: ref(false) }
                }
            }
        });
    };

    it("renders layout correctly", () => {
        const wrapper = mountWrapper();
        expect(wrapper.find(".tree-pane").exists()).toBe(true);
        expect(wrapper.find(".middle-pane").exists()).toBe(true);
        expect(wrapper.find(".right-pane").exists()).toBe(true);
        expect(wrapper.find(".resizer").exists()).toBe(true);
    });

    it("handles tree pane resizing", async () => {
        const wrapper = mountWrapper();
        const container = wrapper.find(".investigation-workspace");
        
        // Mock getBoundingClientRect
        vi.spyOn(container.element, "getBoundingClientRect").mockReturnValue({
            left: 0, top: 0, width: 1000, height: 600, right: 1000, bottom: 600
        });

        // Start resize
        const resizers = wrapper.findAll(".resizer");
        const treeResizer = resizers[0]; 
        
        await treeResizer.trigger("mousedown");
        expect(wrapper.vm.resizingTarget).toBe("tree");
        
        // Resize to 300px
        const moveEvent = new MouseEvent("mousemove", { clientX: 300, clientY: 100 });
        document.dispatchEvent(moveEvent);
        
        expect(wrapper.vm.treePaneWidth).toBe(300);
        

        const upEvent = new MouseEvent("mouseup");
        document.dispatchEvent(upEvent);
        expect(wrapper.vm.resizingTarget).toBe(null);
    });

    it("handles chat pane resizing", async () => {
        const wrapper = mountWrapper();
        const container = wrapper.find(".investigation-workspace");
        
        // Manually set chat pane width to something valid after mount
        wrapper.vm.chatPaneWidth = 400; 
        
        vi.spyOn(container.element, "getBoundingClientRect").mockReturnValue({
            left: 0, top: 0, width: 1000, height: 600, right: 1000, bottom: 600
        });
        
        const resizers = wrapper.findAll(".resizer");
        const chatResizer = resizers[1];
        
        await chatResizer.trigger("mousedown");
        expect(wrapper.vm.resizingTarget).toBe("chat");
        
        // Resize chat pane.
        
        const moveEvent = new MouseEvent("mousemove", { clientX: 700, clientY: 100 });
        document.dispatchEvent(moveEvent);
        
        expect(wrapper.vm.chatPaneWidth).toBe(300);
        

        const upEvent = new MouseEvent("mouseup");
        document.dispatchEvent(upEvent);
        expect(wrapper.vm.resizingTarget).toBe(null);
    });

    it("handles resizer hover effect", async () => {
        const wrapper = mountWrapper();
        const resizers = wrapper.findAll(".resizer");
        const chatResizer = resizers[1];
        
        await chatResizer.trigger("mouseenter");
        expect(wrapper.vm.hoveredResizer).toBe("chat");
        
        // Mock getBoundingClientRect
        vi.spyOn(chatResizer.element, "getBoundingClientRect").mockReturnValue({ top: 100 });
        
        await chatResizer.trigger("mousemove", { clientY: 150 });
        // handleTop = e.clientY (150) - rect.top (100) = 50.
        expect(wrapper.vm.handleTop).toBe(50);
        
        await chatResizer.trigger("mouseleave");
        expect(wrapper.vm.hoveredResizer).toBe(null);
        

        wrapper.unmount();
    });

    it("handles hypothesis selection from tree", async () => {
        const wrapper = mountWrapper();
        
        const tv = wrapper.findComponent(".tree-view-stub"); 
        
        expect(tv.exists()).toBe(true);
        

        tv.vm.$emit("select-node", { id: "hyp-123", type: "hypothesis" });
        
        expect(wrapper.vm.activeHypothesisId).toBe("hyp-123");
    });

    it("switches to plan tab when plan node is selected", async () => {

        
        const setTabMock = vi.fn();
        const wrapper = mount(InvestigationCanvas, {
            global: {
                plugins: [vuetify],
                stubs: {
                    InvestigationContent: { 
                        template: "<div class='content-pane-stub'></div>",
                        methods: {
                            setTab: setTabMock
                        },
                        expose: ['setTab']
                    },
                    InvestigationChat: { template: "<div class='chat-pane-stub'></div>" },
                    InvestigationTree: { template: "<div class='tree-view-stub'></div>", emits: ["select-node"] }
                },
                provide: {
                    "agent-fullscreen": { isFullscreen: ref(false) }
                }
            }
        });

        const tv = wrapper.findComponent(".tree-view-stub");
        tv.vm.$emit("select-node", { id: "meta-plan", type: "MD_FILE" });
        
        expect(setTabMock).toHaveBeenCalledWith("plan");
    });
});
