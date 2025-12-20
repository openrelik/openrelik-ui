import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorkflowCanvasView } from "../useWorkflowCanvasView";
import { ref, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { 
  calculateTaskMenuWorldPosition, 
  calculateOverviewScreenPosition 
} from "@/utils/workflowCanvasUtils";

vi.mock("@/utils/workflowCanvasUtils", () => ({
  calculateTaskMenuWorldPosition: vi.fn(),
  calculateOverviewScreenPosition: vi.fn(),
}));

function withSetup(composable) {
  let result;
  const app = mount({
    setup() {
      result = composable();
      return () => {};
    },
  });
  return [result, app];
}

describe("useWorkflowCanvasView", () => {
  let nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId;

  beforeEach(() => {
    nodes = ref([{ id: "n1", x: 100, y: 100 }]);
    container = ref({
      getBoundingClientRect: () => ({ left: 10, top: 10, width: 1000, height: 800 }),
      clientWidth: 1000,
      clientHeight: 800,
    });
    showTaskMenu = ref(false);
    pendingParentId = ref(null);
    pendingGroupId = ref(null);
    pendingCallbackGroupId = ref(null);
    activeOverviewNodeId = ref(null);
  });

  it("should initialize with default values", () => {
    const [view] = withSetup(() => useWorkflowCanvasView({ 
        nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId 
    }));
    expect(view.panX.value).toBe(0);
    expect(view.panY.value).toBe(0);
    expect(view.scale.value).toBe(1);
  });

  describe("Panning", () => {
    it("should start panning when space is pressed and mouse is down", () => {
      const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
      
      // Simulate space down
      view.handleKeyDown({ code: "Space", preventDefault: vi.fn(), target: { tagName: "BODY" } });
      expect(view.isSpacePressed.value).toBe(true);

      // Simulate mouse down
      view.handleMouseDown({ clientX: 100, clientY: 100, preventDefault: vi.fn() });
      expect(view.isPanning.value).toBe(true);

      // Simulate mouse move
      view.handleMouseMove({ clientX: 150, clientY: 120 });
      expect(view.panX.value).toBe(50);
      expect(view.panY.value).toBe(20);

      // Simulate mouse up
      view.handleMouseUp();
      expect(view.isPanning.value).toBe(false);
    });

    it("should not pan if isPanning is false", () => {
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        view.isPanning.value = false;
        view.handleMouseMove({ clientX: 150, clientY: 120 });
        expect(view.panX.value).toBe(0);
        expect(view.panY.value).toBe(0);
    });

    it("should ignore space key if target is input", () => {
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        view.handleKeyDown({ code: "Space", preventDefault: vi.fn(), target: { tagName: "INPUT" } });
        expect(view.isSpacePressed.value).toBe(false);
    });

    it("should ignore space key if target is textarea", () => {
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        view.handleKeyDown({ code: "Space", preventDefault: vi.fn(), target: { tagName: "TEXTAREA" } });
        expect(view.isSpacePressed.value).toBe(false);
    });

    it("should stop panning when space is released", () => {
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        view.isSpacePressed.value = true;
        view.isPanning.value = true;
        
        view.handleKeyUp({ code: "Space" });
        
        expect(view.isSpacePressed.value).toBe(false);
        expect(view.isPanning.value).toBe(false);
    });
  });

  describe("Zooming", () => {
    it("should zoom on wheel if ctrl/meta key is pressed", () => {
      const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
      
      const event = {
        ctrlKey: true,
        deltaY: -100,
        clientX: 500,
        clientY: 400,
        preventDefault: vi.fn(),
      };
      
      const oldScale = view.scale.value;
      view.handleWheel(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(view.scale.value).toBeGreaterThan(oldScale);
    });

    it("should zoom on wheel if meta key is pressed (Mac)", () => {
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        
        const event = {
          ctrlKey: false,
          metaKey: true,
          deltaY: -100,
          clientX: 500,
          clientY: 400,
          preventDefault: vi.fn(),
        };
        
        const oldScale = view.scale.value;
        view.handleWheel(event);
        
        expect(event.preventDefault).toHaveBeenCalled();
        expect(view.scale.value).toBeGreaterThan(oldScale);
    });

    it("should not zoom on wheel if ctrl/meta key is not pressed", () => {
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        const event = { ctrlKey: false, deltaY: -100, preventDefault: vi.fn() };
        view.handleWheel(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("Positions", () => {
    it("should compute taskMenuPosition when visible", async () => {
        calculateTaskMenuWorldPosition.mockReturnValue({ x: 100, y: 100 });
        showTaskMenu.value = true;
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        
        await nextTick();
        // worldX * scale + panX + rect.left = 100 * 1 + 0 + 10 = 110
        expect(view.taskMenuPosition.value.x).toBe(110);
    });

    it("should fallbackTaskMenuPosition if container rect is missing", async () => {
        container.value.getBoundingClientRect = null;
        calculateTaskMenuWorldPosition.mockReturnValue({ x: 100, y: 100 });
        showTaskMenu.value = true;
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        
        await nextTick();
        // Just world position + pan
        expect(view.taskMenuPosition.value.x).toBe(100);
    });

    it("should compute overviewPosition when active", async () => {
        activeOverviewNodeId.value = "n1";
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        
        calculateOverviewScreenPosition.mockReturnValue({ x: 500, y: 300 });
        await nextTick();
        expect(view.overviewPosition.value.x).toBe(500);
    });

    it("should return default overviewPosition if activeOverviewNodeId is null", () => {
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        expect(view.overviewPosition.value).toEqual({ x: 0, y: 0 });
    });

    it("should return default overviewPosition if activeOverviewNode is not found", () => {
        activeOverviewNodeId.value = "missing";
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        expect(view.overviewPosition.value).toEqual({ x: 0, y: 0 });
    });
  });

  describe("zoomToFit", () => {
    it("should calculate scale and pan to fit nodes", () => {
      nodes.value = [
        { id: "n1", x: 0, y: 0 },
        { id: "n2", x: 1000, y: 1000 }
      ];
      
      const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
      view.zoomToFit();
      
      expect(view.scale.value).toBeCloseTo(0.625, 2);
      expect(view.hasInitialZoom.value).toBe(true);
    });

    it("should return early if no nodes", () => {
        nodes.value = [];
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        view.zoomToFit();
        expect(view.hasInitialZoom.value).toBe(false);
    });

    it("should call onVisibilityUpdate if provided", () => {
        const onUpdateSpy = vi.fn();
        const [view] = withSetup(() => useWorkflowCanvasView({ 
            nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId,
            onVisibilityUpdate: onUpdateSpy 
        }));
        view.zoomToFit();
        expect(onUpdateSpy).toHaveBeenCalled();
    });

    it("should handle nodes with same width/height (point)", () => {
        nodes.value = [{ id: "n1", x: 100, y: 100 }];
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        view.zoomToFit();
        expect(view.scale.value).not.toBeNaN();
    });

    it("should return early if container has no dimensions", () => {
        container.value.clientWidth = 0;
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        view.zoomToFit();
        expect(view.hasInitialZoom.value).toBe(false);
    });

    it("should return early if viewport height is 0", () => {
        container.value.clientHeight = 0;
        const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        view.zoomToFit();
        expect(view.hasInitialZoom.value).toBe(false);
    });

    it("should handle mixed node positions for strict min/max logic", () => {
      // Create 3 nodes that force updates on specific branches
      // Node 1: Sets Initial Min/Max (0,0)
      // Node 2: Updates MaxX (100), MaxY (100) -> Min branches false
      // Node 3: Updates MinX (-100), MinY (-100) -> Max branches false
      nodes.value = [
        { id: "n1", x: 0, y: 0 },
        { id: "n2", x: 100, y: 100 },
        { id: "n3", x: -100, y: -100 }
      ];
      const [view] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
      view.zoomToFit();
      // Only verifying it runs without error and calculates valid scale
      expect(view.scale.value).not.toBeNaN();
    });
  });

  describe("Event Listeners", () => {
    it("should attach and detach listeners", () => {
        const addSpy = vi.spyOn(window, 'addEventListener');
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        
        const [view, app] = withSetup(() => useWorkflowCanvasView({ nodes, container, showTaskMenu, pendingParentId, pendingGroupId, pendingCallbackGroupId, activeOverviewNodeId }));
        
        expect(addSpy).toHaveBeenCalledWith("keydown", view.handleKeyDown);
        expect(addSpy).toHaveBeenCalledWith("keyup", view.handleKeyUp);
        
        app.unmount();
        
        expect(removeSpy).toHaveBeenCalledWith("keydown", view.handleKeyDown);
        expect(removeSpy).toHaveBeenCalledWith("keyup", view.handleKeyUp);
    });
  });
});
