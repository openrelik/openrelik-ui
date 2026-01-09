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
import { describe, it, expect, vi, beforeEach } from "vitest";
import InvestigationGraph from "../InvestigationGraph.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { createTestingPinia } from "@pinia/testing";
import { useInvestigationStore } from "@/stores/investigation";

// Mock the layout utility
vi.mock("@/utils/investigationLayout", () => ({
    calculateLayout: vi.fn(),
    NODE_WIDTH: 200,
    NODE_HEIGHT: 100
}));

import { calculateLayout } from "@/utils/investigationLayout";

const vuetify = createVuetify({
  components,
  directives,
});

describe("InvestigationGraph.vue", () => {
    const mockGraph = {
        getParents: vi.fn().mockReturnValue([])
    };
    
    beforeEach(() => {
        vi.clearAllMocks();
        calculateLayout.mockReturnValue({
            nodes: [
                { id: "1", type: "QUESTION", x: 0, y: 0, label: "Q1" },
                { id: "2", type: "SECTION", x: 200, y: 0, label: "S1" }
            ],
            edges: [
                { id: "e1", from: "1", to: "2" }
            ],
            width: 1000,
            height: 1000
        });
        mockGraph.getParents.mockReturnValue([]);
    });

    const mountWrapper = () => {
        return mount(InvestigationGraph, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({
                        initialState: {
                            investigation: {
                                graph: mockGraph
                            }
                        }
                    })
                ],
                stubs: {
                    "transition-group": false
                }
            }
        });
    };

    it("renders nodes and edges", async () => {
        const wrapper = mountWrapper();
        const nodes = wrapper.findAllComponents({ name: "InvestigationGraphNode" });
        expect(nodes.length).toBe(2);
    });

    it("calculates edge path correctly", async () => {
        const wrapper = mountWrapper();
        await wrapper.vm.$nextTick();
        
        const path = wrapper.find("path");
        expect(path.attributes("d")).toContain("M");
    });

    it("handles pan interaction", async () => {
        const wrapper = mountWrapper();
        const container = wrapper.find(".investigation-graph-container");
        
        await container.trigger("mousedown", { clientX: 0, clientY: 0 });
        
        const moveEvent = new MouseEvent("mousemove", { clientX: 50, clientY: 50 });
        window.dispatchEvent(moveEvent);
        
        expect(wrapper.vm.pan).toEqual({ x: 50, y: 50 });
        
        const upEvent = new MouseEvent("mouseup");
        window.dispatchEvent(upEvent);
        
        expect(wrapper.vm.isDragging).toBe(false);
    });

    it("handles zoom interaction (buttons)", async () => {
        const wrapper = mountWrapper();
        const initialZoom = wrapper.vm.zoom;
        
        const zoomInBtn = wrapper.findAllComponents({ name: "VBtn" }).find(b => b.props("icon") === "mdi-plus");
        await zoomInBtn.trigger("click");
        
        expect(wrapper.vm.zoom).toBeGreaterThan(initialZoom);
        
        const zoomOutBtn = wrapper.findAllComponents({ name: "VBtn" }).find(b => b.props("icon") === "mdi-minus");
        await zoomOutBtn.trigger("click");
        
        expect(wrapper.vm.zoom).toBe(initialZoom);
    });

    it("handles mouse wheel zoom", async () => {
        const wrapper = mountWrapper();
        const initialZoom = wrapper.vm.zoom;
        const container = wrapper.find(".investigation-graph-container");
        
        await container.trigger("wheel", { 
            deltaY: -100,
            clientX: 500,
            clientY: 500,
            preventDefault: vi.fn()
        });
        
        expect(wrapper.vm.zoom).toBeGreaterThan(initialZoom);
    });

    it("toggles node expansion on click (SECTION/HYPOTHESIS)", async () => {
        const wrapper = mountWrapper();
        await wrapper.vm.$nextTick();
        
        const nodes = wrapper.findAllComponents({ name: "InvestigationGraphNode" });
        const sectionNode = nodes.find(n => n.props().node.type === "SECTION");
        
        expect(sectionNode.exists()).toBe(true);
        
        expect(wrapper.vm.expandedNodes.has("2")).toBe(false);
        
        sectionNode.vm.$emit("click", sectionNode.props().node);
        
        expect(wrapper.vm.expandedNodes.has("2")).toBe(true);
        expect(calculateLayout).toHaveBeenCalledTimes(2);
        
        sectionNode.vm.$emit("click", sectionNode.props().node);
        expect(wrapper.vm.expandedNodes.has("2")).toBe(false);
    });

    it("fits to screen", async () => {
        const wrapper = mountWrapper();
        await wrapper.vm.$nextTick();
        
        const fitBtn = wrapper.findAllComponents({ name: "VBtn" }).find(b => b.props("icon") === "mdi-fit-to-screen-outline");
        
        const container = wrapper.find(".investigation-graph-container").element;
        Object.defineProperty(container, 'clientWidth', { configurable: true, value: 800 });
        Object.defineProperty(container, 'clientHeight', { configurable: true, value: 600 });
        
        await fitBtn.trigger("click");
        
        expect(wrapper.vm.zoom).toBeLessThan(1);
    });

    it("handles node transitions with parent logic", async () => {
        vi.useFakeTimers();
        const wrapper = mountWrapper();
        await wrapper.vm.$nextTick();
        
        // Update layout to ADD a new node (3) that has parent (1).
        // And REMOVE node (2) that has parent (1).
        
        mockGraph.getParents.mockImplementation((id) => {
            if (id === "3") return [{ id: "1" }];
            if (id === "2") return [{ id: "1" }];
            return [];
        });
        
        // Update layout
        calculateLayout.mockReturnValue({
            nodes: [
                { id: "1", type: "QUESTION", x: 0, y: 0, label: "Q1" },
                { id: "3", type: "SECTION", x: 100, y: 100, label: "S2" }
            ],
            edges: [],
            width: 1000,
            height: 1000
        });
        
        const store = useInvestigationStore();
        const newGraph = { ...store.graph };
        newGraph.getParents = mockGraph.getParents;
        store.graph = newGraph;
        
        await wrapper.vm.$nextTick(); 
        
        vi.runAllTimers();
        
        const nodes = wrapper.findAllComponents({ name: "InvestigationGraphNode" });
        expect(nodes.length).toBe(2);
        const ids = nodes.map(n => n.props().node.id);
        expect(ids).toContain("1");
        expect(ids).toContain("3");
        
        vi.useRealTimers();
    });



    it("does not expand/collapse non-expandable nodes", async () => {
        const wrapper = mountWrapper();
        await wrapper.vm.$nextTick();
        
        const nodes = wrapper.findAllComponents({ name: "InvestigationGraphNode" });
        const questionNode = nodes.find(n => n.props().node.type === "QUESTION");
        
        expect(questionNode).toBeDefined();
        
        calculateLayout.mockClear();
        
        questionNode.vm.$emit("click", questionNode.props().node);
        
        expect(wrapper.vm.expandedNodes.has("1")).toBe(false);
        expect(calculateLayout).not.toHaveBeenCalled();
    });

    it("handles missing graph gracefully in performLayout and getParentNode", async () => {
        const wrapper = mountWrapper();
        const store = useInvestigationStore();
        
        // Set graph to null
        store.graph = null;
        await wrapper.vm.$nextTick();
        
        // performLayout should return early
        // We can check if graphSize is reset or unchanged (it retains last value because lines aren't reached)
        // Or simply that no error is thrown.
        expect(wrapper.vm.investigationStore.graph).toBeNull();
        
        const parent = wrapper.vm.getParentNode("1");
        expect(parent).toBeNull();
    });

    it("handles onMouseMove when not dragging", () => {
        const wrapper = mountWrapper();
        // Force isDragging false
        wrapper.vm.isDragging = false;
        
        const initialPan = { ...wrapper.vm.pan };
        
        // Call directly
        wrapper.vm.onMouseMove({ clientX: 100, clientY: 100 });
        
        expect(wrapper.vm.pan).toEqual(initialPan);
    });

    it("handles onWheel clamping and direction", async () => {
        const wrapper = mountWrapper();
        const container = wrapper.find(".investigation-graph-container").element;
         vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
            left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000
        });

        // 1. Zoom Out (DeltaY positive)
        wrapper.vm.zoom = 1;
        await wrapper.find(".investigation-graph-container").trigger("wheel", { 
            deltaY: 100, // Down
            clientX: 500, clientY: 500 
        });
        expect(wrapper.vm.zoom).toBeLessThan(1); // Should decrease

        // 2. Max Zoom Clamp
        wrapper.vm.zoom = 3;
        await wrapper.find(".investigation-graph-container").trigger("wheel", { 
            deltaY: -100, // Up (Zoom In)
            clientX: 500, clientY: 500 
        });
        expect(wrapper.vm.zoom).toBe(3); // Should not exceed 3

        // 3. Min Zoom Clamp
        wrapper.vm.zoom = 0.1;
        await wrapper.find(".investigation-graph-container").trigger("wheel", { 
            deltaY: 100, // Down (Zoom Out)
            clientX: 500, clientY: 500 
        });
        expect(wrapper.vm.zoom).toBe(0.1); // Should not go below 0.1
    });

    it("zoomIn and zoomOut clamp values", () => {
        const wrapper = mountWrapper();
        
        wrapper.vm.zoom = 2.95;
        wrapper.vm.zoomIn();
        expect(wrapper.vm.zoom).toBe(3);
        
        wrapper.vm.zoom = 0.15;
        wrapper.vm.zoomOut();
        expect(wrapper.vm.zoom).toBe(0.1);
    });

    it("fitToScreen handles empty nodes or missing container gracefully", async () => {
         const wrapper = mountWrapper();
         
         // 1. Empty nodes
         wrapper.vm.nodes = [];
         wrapper.vm.fitToScreen(); 
    });

    it("getEdgePath handles missing source or target", () => {
        const wrapper = mountWrapper();
        // Setup nodes
        wrapper.vm.nodes = [
             { id: "1", type: "QUESTION", x: 0, y: 0, label: "Q1" }
        ];
        
        const edge = { from: "1", to: "999" };
        const path = wrapper.vm.getEdgePath(edge);
        expect(path).toBe("");
        
        const edge2 = { from: "999", to: "1" };
        const path2 = wrapper.vm.getEdgePath(edge2);
        expect(path2).toBe("");
    });
    
    it("handles transition hooks with no parent found", () => {
        const wrapper = mountWrapper();
        // Use a plain object to mock the element to avoid jsdom/happy-dom style quirks
        const el = {
            getAttribute: vi.fn().mockReturnValue("999"),
            style: { transform: "", opacity: "" },
            get offsetHeight() { return 100; } // Mock layout trigger
        };
        
        // Mock getParentNode invocation context is correctly handled by wrapper
        
        // onBeforeEnter
        wrapper.vm.onBeforeEnter(el);
        // Should NOT change style because parent is null
        expect(el.style.transform).toBe("");
        expect(el.style.opacity).toBe("");
        
        // onLeave
         wrapper.vm.onLeave(el, vi.fn());
         // Should NOT apply transform based on parent, but WILL apply opacity 0
         expect(el.style.transform).toBe("");
         expect(el.style.opacity).toBe("0");
    });

    it("handles onEnter when target node is not found", () => {
        const wrapper = mountWrapper();
         const el = {
            getAttribute: vi.fn().mockReturnValue("999"), // 999 not in nodes
            style: { transform: "", opacity: "" },
            get offsetHeight() { return 100; }
        };
        
        // onEnter
        wrapper.vm.onEnter(el, vi.fn());
        
        // invalid target node => no transform set based on it
        expect(el.style.transform).toBe(""); 
        // But opacity should be set to 1
        expect(el.style.opacity).toBe("1");
    });

    it("handles onWheel when container is missing", async () => {
        const wrapper = mountWrapper();
        const preventDefault = vi.fn();
        
        await wrapper.unmount();
        
        wrapper.vm.onWheel({ preventDefault });
        
        expect(preventDefault).toHaveBeenCalled();
    });
});
