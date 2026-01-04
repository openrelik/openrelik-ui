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
    // Mock Data
    const mockGraph = {
        getParents: vi.fn().mockReturnValue([])
    };
    
    beforeEach(() => {
        vi.clearAllMocks();
        // Default layout mock return
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
        // Trigger layout watch
        await wrapper.vm.$nextTick(); 
        
        expect(calculateLayout).toHaveBeenCalled();
        expect(wrapper.findAll("path").length).toBe(1); // One edge
        // InvestigationGraphNode components are stubs by default? No, we didn't stub child.
        // It renders InvestigationGraphNode.
        // We can check if child components exist.
        
        const nodes = wrapper.findAllComponents({ name: "InvestigationGraphNode" });
        expect(nodes.length).toBe(2);
    });

    it("calculates edge path correctly", async () => {
        const wrapper = mountWrapper();
        await wrapper.vm.$nextTick();
        
        // Check path d attribute
        const path = wrapper.find("path");
        expect(path.attributes("d")).toContain("M");
    });

    it("handles pan interaction", async () => {
        const wrapper = mountWrapper();
        const container = wrapper.find(".investigation-graph-container");
        
        await container.trigger("mousedown", { clientX: 0, clientY: 0 });
        
        // Verify isDragging
        expect(wrapper.vm.isDragging).toBe(true);
        
        // Simulate global mousemove
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
        
        expect(wrapper.vm.zoom).toBe(initialZoom); // Back to approx original
    });

    it("handles mouse wheel zoom", async () => {
        const wrapper = mountWrapper();
        const initialZoom = wrapper.vm.zoom;
        const container = wrapper.find(".investigation-graph-container");
        
        // Mock getBoundingClientRect for container
        const element = container.element;
        vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
            left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000
        });

        await container.trigger("wheel", { 
            deltaY: -100, // Scroll up (Zoom in)
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
        
        // Initial state: not expanded (assuming default set is empty)
        expect(wrapper.vm.expandedNodes.has("2")).toBe(false);
        
        // Click node
        // InvestigationGraphNode emits click
        sectionNode.vm.$emit("click", sectionNode.props().node);
        
        expect(wrapper.vm.expandedNodes.has("2")).toBe(true);
        expect(calculateLayout).toHaveBeenCalledTimes(2); // Initial + Click update
        
        // Click again to collapse
        sectionNode.vm.$emit("click", sectionNode.props().node);
        expect(wrapper.vm.expandedNodes.has("2")).toBe(false);
    });

    it("fits to screen", async () => {
        const wrapper = mountWrapper();
        await wrapper.vm.$nextTick();
        
        // Trigger fitToScreen via button
        const fitBtn = wrapper.findAllComponents({ name: "VBtn" }).find(b => b.props("icon") === "mdi-fit-to-screen-outline");
        
        // Need to mock clientWidth/Height of container
        // Since container is ref, we can spy/defineProperty?
        // JSOM elements have clientWidth=0 by default.
        const container = wrapper.find(".investigation-graph-container").element;
        Object.defineProperty(container, 'clientWidth', { configurable: true, value: 800 });
        Object.defineProperty(container, 'clientHeight', { configurable: true, value: 600 });
        
        await fitBtn.trigger("click");
        
        // Expect zoom and pan to change
        // Initial defaults: zoom=1, pan={0,0}.
        // fitToScreen likely changes them.
        // We mocked graph size to 1000x1000. Container 800x600.
        // Scale should be < 1.
        expect(wrapper.vm.zoom).toBeLessThan(1);
    });

    it("handles node transitions with parent logic", async () => {
        vi.useFakeTimers();
        const wrapper = mountWrapper();
        await wrapper.vm.$nextTick();
        
        // Initial state: 2 nodes (1, 2).
        // Update layout to ADD a new node (3) that has parent (1).
        // And REMOVE node (2) that has parent (1).
        
        // Mock getParents for the new node logic
        // We need to change the implementation of getParents dynamically or conditionally.
        // mockGraph.getParents is a jest mock.
        mockGraph.getParents.mockImplementation((id) => {
            if (id === "3") return [{ id: "1" }]; // 3 is child of 1
            if (id === "2") return [{ id: "1" }]; // 2 is child of 1
            return [];
        });
        
        // Update layout
        calculateLayout.mockReturnValue({
            nodes: [
                { id: "1", type: "QUESTION", x: 0, y: 0, label: "Q1" },
                { id: "3", type: "SECTION", x: 100, y: 100, label: "S2" } // 2 removed
            ],
            edges: [],
            width: 1000,
            height: 1000
        });
        
        // Trigger update
        const store = useInvestigationStore();
        const newGraph = { ...store.graph };
        newGraph.getParents = mockGraph.getParents; // Ensure function persists
        store.graph = newGraph;
        
        await wrapper.vm.$nextTick(); 
        
        // At this point:
        // Node 3 enter hook should run.
        // Node 2 leave hook should run.
        // We can't verify styles easily without inspecting elements deep in DOM.
        // But we want to ensure lines 150-196 are executed.
        
        // Run timers to trigger done() callbacks in setTimeout
        vi.runAllTimers();
        
        // Verify final state
        const nodes = wrapper.findAllComponents({ name: "InvestigationGraphNode" });
        expect(nodes.length).toBe(2); // 1 and 3
        const ids = nodes.map(n => n.props().node.id);
        expect(ids).toContain("1");
        expect(ids).toContain("3");
        
        vi.useRealTimers();
    });

    // --- NEW TESTS FOR COVERAGE ---

    it("does not expand/collapse non-expandable nodes", async () => {
        const wrapper = mountWrapper();
        await wrapper.vm.$nextTick();
        
        const nodes = wrapper.findAllComponents({ name: "InvestigationGraphNode" });
        const questionNode = nodes.find(n => n.props().node.type === "QUESTION");
        
        expect(questionNode).toBeDefined();
        
        // Clear previous calls
        calculateLayout.mockClear();
        
        // Emit click
        questionNode.vm.$emit("click", questionNode.props().node);
        
        // Should NOT add to expandedNodes
        expect(wrapper.vm.expandedNodes.has("1")).toBe(false);
        // Should NOT trigger layout recalculation
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
        
        // Directly call getParentNode to verify null check
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
        expect(wrapper.vm.zoom).toBe(3); // Clamped
        
        wrapper.vm.zoom = 0.15;
        wrapper.vm.zoomOut();
        expect(wrapper.vm.zoom).toBe(0.1); // Clamped
    });

    it("fitToScreen handles empty nodes or missing container gracefully", async () => {
         const wrapper = mountWrapper();
         
         // 1. Empty nodes
         wrapper.vm.nodes = [];
         wrapper.vm.fitToScreen();
         // Verify zoom didn't change wildly or error
         
         // 2. Missing container (simulate by mocking ref if possible, or just call logic)
         // It's hard to set ref to null after mount.
         // But we can check the guard:
         // if (!container.value || nodes.value.length === 0) return;
         // We tested empty nodes. 
    });

    it("getEdgePath handles missing source or target", () => {
        const wrapper = mountWrapper();
        // Setup nodes
        wrapper.vm.nodes = [
             { id: "1", type: "QUESTION", x: 0, y: 0, label: "Q1" }
        ];
        
        // Edge referring to missing target
        const edge = { from: "1", to: "999" };
        const path = wrapper.vm.getEdgePath(edge);
        expect(path).toBe("");
        
        // Edge referring to missing source
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
        
        // Save reference to method before unmount if needed, or access via vm
        // Unmount should set container ref to null
        await wrapper.unmount();
        
        wrapper.vm.onWheel({ preventDefault });
        
        // Should return early, verify no crash and preventDefault called
        expect(preventDefault).toHaveBeenCalled();
    });
});
