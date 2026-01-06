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
        // Container rect: left=0, width=1000.
        vi.spyOn(container.element, "getBoundingClientRect").mockReturnValue({
            left: 0, top: 0, width: 1000, height: 600, right: 1000, bottom: 600
        });

        // Current Tree Width default: 280.
        
        // Start resize
        // First resizer (Tree Resizer)
        const resizers = wrapper.findAll(".resizer");
        const treeResizer = resizers[0]; 
        
        await treeResizer.trigger("mousedown");
        expect(wrapper.vm.resizingTarget).toBe("tree");
        
        // Resize to 300px
        const moveEvent = new MouseEvent("mousemove", { clientX: 300, clientY: 100 });
        document.dispatchEvent(moveEvent);
        
        expect(wrapper.vm.treePaneWidth).toBe(300);
        
        // Stop resize
        const upEvent = new MouseEvent("mouseup");
        document.dispatchEvent(upEvent);
        expect(wrapper.vm.resizingTarget).toBe(null);
    });

    it("handles chat pane resizing", async () => {
        const wrapper = mountWrapper();
        const container = wrapper.find(".investigation-workspace");
        
        // Fix initial width issue (clientWidth 0 -> 0)
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
        // Logic: newWidth = container.right - e.clientX
        // container.right = 1000.
        // Try e.clientX = 700 => newWidth = 300.
        // Constraint: maxChatWidth = 1000 - 280 (tree) - 300 (middle min) = 420.
        // 300 is valid.
        
        const moveEvent = new MouseEvent("mousemove", { clientX: 700, clientY: 100 });
        document.dispatchEvent(moveEvent);
        
        expect(wrapper.vm.chatPaneWidth).toBe(300);
        
        // Stop resize
        const upEvent = new MouseEvent("mouseup");
        document.dispatchEvent(upEvent);
        expect(wrapper.vm.resizingTarget).toBe(null);
    });

    it("handles resizer hover effect", async () => {
        const wrapper = mountWrapper();
        const resizers = wrapper.findAll(".resizer");
        const chatResizer = resizers[1]; // Right resizer has hover logic
        
        await chatResizer.trigger("mouseenter");
        expect(wrapper.vm.isResizerHovered).toBe(true);
        
        // Trigger mousemove for updateHandlePosition
        // Mock getBoundingClientRect
        // e.currentTarget is the resizer div
        vi.spyOn(chatResizer.element, "getBoundingClientRect").mockReturnValue({ top: 100 });
        
        await chatResizer.trigger("mousemove", { clientY: 150 });
        // handleTop = e.clientY (150) - rect.top (100) = 50.
        expect(wrapper.vm.handleTop).toBe(50);
        
        await chatResizer.trigger("mouseleave");
        expect(wrapper.vm.isResizerHovered).toBe(false);
        
        // Trigger unmount to cover onUnmounted -> stopResize
        wrapper.unmount();
    });

    it("handles hypothesis selection from tree", async () => {
        const wrapper = mountWrapper();
        
        const tv = wrapper.findComponent(".tree-view-stub"); 
        
        expect(tv.exists()).toBe(true);
        
        // Emit select-node with a hypothesis node
        tv.vm.$emit("select-node", { id: "hyp-123", type: "hypothesis" });
        
        expect(wrapper.vm.activeHypothesisId).toBe("hyp-123");
    });

    it("switches to plan tab when plan node is selected", async () => {
        // We need a mock for contentRef to verify setTab is called
        // Since we stub InvestigationContent, we can spy on a method if we attach it to the stub's vm,
        // but easier here is to mock the ref logic or just verify the side effect if we could.
        // However, the component calls `contentRef.value.setTab`. 
        // We can use a custom stub that exposes setTab.
        
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
