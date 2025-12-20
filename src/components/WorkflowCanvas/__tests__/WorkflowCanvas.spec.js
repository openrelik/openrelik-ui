import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import WorkflowCanvas from "../WorkflowCanvas.vue";
import { createTestingPinia } from "@pinia/testing";
import { useWorkflowStore } from "@/stores/workflow";


// Mock Child Components
const WorkflowGroupLayerStub = {
  name: "WorkflowGroupLayer",
  template: "<div class='group-layer-stub'></div>",
  props: ["nodes", "activeGroupId", "draggingGroupId"],
  emits: ["move-group", "group-hover", "group-leave", "add-node-to-group", "add-group-callback", "group-drag-start", "group-drag-end"]
};
const WorkflowEdgeLayerStub = { name: "WorkflowEdgeLayer", template: "<div class='edge-layer-stub'></div>" };
const WorkflowNodeStub = {
  name: "WorkflowNode",
  template: "<div class='workflow-node-stub' @click=\"$emit('toggle-overview', node.id)\"></div>",
  props: ["node", "activeOverviewNodeId"],
  emits: ["update:position", "add-node", "drag-start", "drag-end", "node-hover", "node-leave", "toggle-overview"]
};
const WorkflowTaskSelectorStub = {
  name: "WorkflowTaskSelector",
  template: "<div class='task-selector-stub' @click=\"$emit('select', {id:'t1'})\"></div>",
  emits: ["select", "close"]
};
const WorkflowTaskResultStub = {
  name: "WorkflowTaskResult",
  template: "<div class='task-result-stub'></div>",
  props: ["data"],
  emits: ["close"]
};

const mocks = vi.hoisted(() => ({
  zoomToFit: vi.fn(),
  layout: vi.fn(),
  createChain: vi.fn(),
  createGroup: vi.fn(),
  createChord: vi.fn(),
  addCallbackToGroup: vi.fn(),
  panX: { value: 0, __v_isRef: true },
  panY: { value: 0, __v_isRef: true },
  scale: { value: 1, __v_isRef: true },
  activeOverviewNode: { value: null, __v_isRef: true },
  handleMouseDown: vi.fn(),
}));

// Mock Composables using hoisted mocks
vi.mock("@/composables/useThemeInfo", async () => {
  const { ref } = await import("vue");
  return {
    useThemeInfo: () => ({ isLightTheme: ref(true) }),
  };
});

vi.mock("@/composables/useWorkflowLayout", () => ({
  useWorkflowLayout: () => ({ layout: mocks.layout }),
}));

vi.mock("@/composables/useWorkflowPatterns", () => ({
  useWorkflowPatterns: () => ({
    createChain: mocks.createChain,
    createGroup: mocks.createGroup,
    createChord: mocks.createChord,
    addCallbackToGroup: mocks.addCallbackToGroup
  }),
}));

vi.mock("@/RestApiClient", () => ({
    default: {
        getRegisteredCeleryTasks: vi.fn(() => Promise.resolve([])),
        getUser: vi.fn(() => Promise.resolve({})),
        getSystemConfig: vi.fn(() => Promise.resolve({})),
        // Add other methods as needed if component calls them
    }
}));

vi.mock("@/composables/useWorkflowCanvasView", async () => {
  const { ref } = await import("vue");
  return {
    useWorkflowCanvasView: () => ({
      panX: ref(0),
      panY: ref(0),
      scale: ref(1),
      isPanning: ref(false),
      isSpacePressed: ref(false),
      hasInitialZoom: ref(false),
      viewportStyle: ref({ transform: "scale(1)" }),
      taskMenuPosition: ref({ x: 0, y: 0 }),
      overviewPosition: ref({ x: 0, y: 0 }),
      activeOverviewNode: ref(null),
      handleWheel: vi.fn(),
      handleMouseDown: mocks.handleMouseDown,
      handleMouseMove: vi.fn(),
      handleMouseUp: vi.fn(),
      zoomToFit: mocks.zoomToFit,
    })
  };
});

vi.mock("@/composables/useWorkflowPolling", () => ({
  useWorkflowPolling: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("WorkflowCanvas.vue", () => {
  let wrapper;
  let workflowStore;

  const mockFolder = { id: "f1", name: "Folder 1" };
  const mockWorkflow = { id: "w1", name: "Workflow 1" };
  const mockNodesData = [
     { id: "node-1", groupId: null, x: 0, y: 0, type: "Input", width: 100, height: 100 },
     { id: "node-2", groupId: "g1", x: 200, y: 0, type: "Task", width: 100, height: 100 }
  ];

  const createWrapper = (props = {}) => {
    return mount(WorkflowCanvas, {
      props: {
        folder: mockFolder,
        workflow: mockWorkflow,
        ...props,
      },
      global: {
        plugins: [
            createTestingPinia({ 
                createSpy: vi.fn,
                stubActions: false 
            })
        ],
        stubs: {
          WorkflowGroupLayer: WorkflowGroupLayerStub,
          WorkflowEdgeLayer: WorkflowEdgeLayerStub,
          WorkflowNode: WorkflowNodeStub,
          WorkflowTaskSelector: WorkflowTaskSelectorStub,
          WorkflowTaskResult: WorkflowTaskResultStub,
          Teleport: true 
        },
      },
      attachTo: document.body
    });
  };

  beforeEach(() => {
     vi.clearAllMocks();
     // Reset ref values in mocks if needed
     mocks.scale.value = 1;
  });

  afterEach(() => {
     if (wrapper) wrapper.unmount();
  });

  it("renders correctly", () => {
    wrapper = createWrapper();
    workflowStore = useWorkflowStore();
    workflowStore.nodes = mockNodesData;
    
    expect(wrapper.find(".canvas-container").exists()).toBe(true);
    expect(wrapper.findComponent(WorkflowGroupLayerStub).exists()).toBe(true);
  });

  it("exposes zoomToFit method", () => {
    wrapper = createWrapper();
    expect(typeof wrapper.vm.zoomToFit).toBe("function");
  });

  it("handles node interactions", async () => {
     wrapper = createWrapper();
     workflowStore = useWorkflowStore();
     workflowStore.nodes = mockNodesData;
     await wrapper.vm.$nextTick();
     
     // Mock actions (already spies)

     await wrapper.vm.handleNodeMove({ id: "node-2", x: 210, y: 10 });
     expect(workflowStore.moveGroup).toHaveBeenCalledWith("g1", 10, 10);
     
     await wrapper.vm.handleNodeMove({ id: "node-1", x: 50, y: 50 });
     expect(workflowStore.updateNodePosition).toHaveBeenCalledWith("node-1", 50, 50);
  });

  describe("Task Menu Interaction", () => {
     it("opens task menu on handleAddNode", async () => {
        wrapper = createWrapper();
        workflowStore = useWorkflowStore();
        workflowStore.nodes = mockNodesData;
        await wrapper.vm.$nextTick(); 
        
        wrapper.vm.handleAddNode("node-1");
        expect(wrapper.vm.showTaskMenu).toBe(true);
        expect(wrapper.vm.pendingParentId).toBe("node-1");
     });

     it("handles task selection (appendNode)", () => {
        wrapper = createWrapper();
        workflowStore = useWorkflowStore();
        
        wrapper.vm.showTaskMenu = true;
        wrapper.vm.pendingParentId = "node-1";
        
        const taskData = { name: " newTask" };
        wrapper.vm.handleSelectTask(taskData);
        
        expect(workflowStore.appendNode).toHaveBeenCalledWith("node-1", taskData);
        expect(wrapper.vm.showTaskMenu).toBe(false);
     });
     
     it("handles task selection (addNodeToGroup)", () => {
        wrapper = createWrapper();
        workflowStore = useWorkflowStore();
        
        wrapper.vm.showTaskMenu = true;
        wrapper.vm.pendingGroupId = "g1";
        const taskData = { name: "T" };
        wrapper.vm.handleSelectTask(taskData);
        
        expect(workflowStore.addNodeToGroup).toHaveBeenCalledWith("g1", taskData);
     });

     it("handles task selection (addCallbackToGroup)", () => {
         wrapper = createWrapper();
         wrapper.vm.showTaskMenu = true;
         wrapper.vm.pendingCallbackGroupId = "g1";
         const taskData = { name: "T" };
         wrapper.vm.handleSelectTask(taskData);
         
         expect(mocks.addCallbackToGroup).toHaveBeenCalledWith("g1", taskData);
     });
  });

  describe("Group Interactions", () => {
     it("handles dragging tracking", () => {
         wrapper = createWrapper();
         
         wrapper.vm.handleGroupDragStart("g1");
         expect(wrapper.vm.externalDragGroupId).toBe("g1");
         
         wrapper.vm.handleGroupDragEnd();
         expect(wrapper.vm.externalDragGroupId).toBeNull();
     });
     
     it("adds node to group request opens menu", async () => {
        wrapper = createWrapper();
        workflowStore = useWorkflowStore();
        workflowStore.nodes = mockNodesData;
        await wrapper.vm.$nextTick();
        
        wrapper.vm.handleAddNodeToGroup("g1");
        expect(wrapper.vm.showTaskMenu).toBe(true);
        expect(wrapper.vm.pendingGroupId).toBe("g1");
     });
  });

  describe("Hover Logic", () => {
     it("calculates offsets on hover", async () => {
         wrapper = createWrapper();
         workflowStore = useWorkflowStore();
         workflowStore.nodes = mockNodesData;
         await wrapper.vm.$nextTick();
         
         wrapper.vm.handleGroupHover("g1");
         expect(wrapper.vm.hoveredGroupId).toBe("g1");
         expect(wrapper.vm.hoverOffsets).toBeDefined();
     });
     
     it("ignores hover if readOnly", () => {
        wrapper = createWrapper();
        workflowStore = useWorkflowStore();
        workflowStore.readOnly = true;
        
        wrapper.vm.handleGroupHover("g1");
        expect(wrapper.vm.hoveredGroupId).toBeNull();
     });
  });

  describe("Overview & Resizing", () => {
      it("toggles overview", () => {
          wrapper = createWrapper();
          wrapper.vm.handleToggleOverview("node-1");
          expect(wrapper.vm.activeOverviewNodeId).toBe("node-1");
      });
      
      it("updates content height", async () => {
         wrapper = createWrapper();
         workflowStore = useWorkflowStore();
         workflowStore.nodes = [{id:"n1", x:0, y:1000, groupId:null}];
         await wrapper.vm.$nextTick();
         
         wrapper.vm.updateContentHeight();
         expect(wrapper.emitted("content-resize")).toBeTruthy();
      });
  });

  describe("Coverage Improvements", () => {
    describe("Watchers", () => {
        it("triggers updateContentHeight on hoverOffsets change", async () => {
             wrapper = createWrapper();
             workflowStore = useWorkflowStore();
             workflowStore.nodes = [{ id: "n1", y: 0 }];
             await wrapper.vm.$nextTick();
             
             // We can't spy on internal method easily, check side effect (emit)
             wrapper.vm.hoverOffsets = { "n1": 10 };
             await wrapper.vm.$nextTick();
             // updateContentHeight emits content-resize
             expect(wrapper.emitted("content-resize")).toBeTruthy();
        });

        it("triggers updateContentHeight on scale change", async () => {
             wrapper = createWrapper();
             workflowStore = useWorkflowStore();
             workflowStore.nodes = [{ id: "n1", y: 0 }];
             await wrapper.vm.$nextTick();

             // Mutate the mock ref value directly or via wrapper
             wrapper.vm.scale = 1.5;
             await wrapper.vm.$nextTick();
             expect(wrapper.emitted("content-resize")).toBeTruthy();
        });

        it("handles nodes change (default state)", async () => {
             wrapper = createWrapper();
             // Ensure container has size to allow zoom
             wrapper.vm.containerWidth = 500;
             wrapper.vm.containerHeight = 500;
             await wrapper.vm.$nextTick();
             
             workflowStore = useWorkflowStore();
             
             mocks.zoomToFit.mockClear();
             // Trigger nodes watcher
             workflowStore.nodes = [{ id: "node-1" }]; // Default single node
             await wrapper.vm.$nextTick();
             
             // Check timeout logic
             await new Promise(r => setTimeout(r, 100));
             expect(mocks.zoomToFit).toHaveBeenCalled();
        });

        it("handles nodes change (non-default)", async () => {
             wrapper = createWrapper();
             wrapper.vm.containerWidth = 500;
             wrapper.vm.containerHeight = 500;
             wrapper.vm.hasInitialZoom = false;
             await wrapper.vm.$nextTick();
             
             workflowStore = useWorkflowStore();
             mocks.zoomToFit.mockClear();

             workflowStore.nodes = [{ id: "n1" }, { id: "n2" }];
             await wrapper.vm.$nextTick();
             
             await new Promise(r => setTimeout(r, 100));
             expect(mocks.zoomToFit).toHaveBeenCalled();
        });
        
        it("triggers zoomToFit on container resize if initial zoom missing", async () => {
             wrapper = createWrapper();
             workflowStore = useWorkflowStore();
             workflowStore.nodes = [{id:"n1"}]; 
             await wrapper.vm.$nextTick();
             mocks.zoomToFit.mockClear(); 
             
             wrapper.vm.hasInitialZoom = false;
             wrapper.vm.containerWidth = 800; // Trigger watcher
             await wrapper.vm.$nextTick();
             
             expect(mocks.zoomToFit).toHaveBeenCalled();
        });
    });

    describe("UpdateContentHeight Logic", () => {
        it("calculates height correctly with expanded group", async () => {
            wrapper = createWrapper();
            workflowStore = useWorkflowStore();
            const nodeInGroup = { id: "n1", groupId: "g1", y: 100 };
            workflowStore.nodes = [nodeInGroup];
            await wrapper.vm.$nextTick();
            
            wrapper.vm.hoveredGroupId = "g1";
            await wrapper.vm.$nextTick();
            
            wrapper.vm.updateContentHeight();
            
            const emitted = wrapper.emitted("content-resize");
            expect(emitted).toBeTruthy();
            const height = emitted[emitted.length - 1][0];
            expect(height).toBeGreaterThan(400);
        });
        
        it("calculates height with simple nodes", async () => {
             wrapper = createWrapper();
             workflowStore = useWorkflowStore();
             workflowStore.nodes = [{ id: "n1", y: 500 }];
             await wrapper.vm.$nextTick();
             
             wrapper.vm.updateContentHeight();
             
             const emitted = wrapper.emitted("content-resize");
             expect(emitted).toBeTruthy();
             const height = emitted[emitted.length - 1][0];
             expect(height).toBeCloseTo(700, -1);
        });
    });

    describe("ResizeObserver Logic", () => {
         it("handles resize observer entries logic path", async () => {
            // Since mocking ResizeObserver callback is tricky with class syntax in global,
            // we can simulate the logic by calling a extracted method if it existed, 
            // OR we can trust the component's observer creation.
            // But we need coverage on the callback body.
            
            // To properly test the callback:
            // We can capture the callback passed to the constructor.
            let observerCallback;
            global.ResizeObserver = class {
                constructor(cb) { observerCallback = cb; }
                observe() {}
                disconnect() {}
            };
            
            const localWrapper = createWrapper();
            workflowStore = useWorkflowStore();
            workflowStore.nodes = [{id:"n1"}];
            await localWrapper.vm.$nextTick();
            mocks.zoomToFit.mockClear();
            
            // Trigger callback
            observerCallback([{ contentRect: { width: 123, height: 456 } }]);
            
            expect(localWrapper.vm.containerWidth).toBe(123);
            expect(localWrapper.vm.containerHeight).toBe(456);
            
            // Should trigger zoom logic via nextTick inside callback
            await localWrapper.vm.$nextTick(); 
            expect(mocks.zoomToFit).toHaveBeenCalled();
         });
    });
    
    describe("Mouse Event Delegates", () => {
       it("mouse down closes menu and clears overview", () => {
           wrapper = createWrapper();
           wrapper.vm.showTaskMenu = true;
           wrapper.vm.activeOverviewNodeId = "n1";
           wrapper.vm.handleMouseDown({});
           
           expect(wrapper.vm.showTaskMenu).toBe(false);
           expect(wrapper.vm.activeOverviewNodeId).toBeNull();
           expect(mocks.handleMouseDown).toHaveBeenCalled();
       });
    });
    describe("Refined Coverage", () => {
        it("computes visibleNodes correctly with offsets", async () => {
            wrapper = createWrapper();
            workflowStore = useWorkflowStore();
            workflowStore.nodes = [{ id: "n1", y: 0, groupId: "g1" }, { id: "n2", y: 0 }];
            await wrapper.vm.$nextTick();
            
            // Case 1: No offsets
            expect(wrapper.vm.visibleNodes).toHaveLength(2);
            expect(wrapper.vm.visibleNodes[0].y).toBe(0);
            
            // Case 2: With offsets
            wrapper.vm.hoverOffsets = { "n1": 50 };
            await wrapper.vm.$nextTick();
            
            const n1 = wrapper.vm.visibleNodes.find(n => n.id === "n1");
            const n2 = wrapper.vm.visibleNodes.find(n => n.id === "n2");
            
            expect(n1.y).toBe(50); // 0 + 50
            expect(n2.y).toBe(0);  // Unchanged
        });

        it("handleGroupLeave clears hover state after delay", async () => {
            wrapper = createWrapper();
            vi.useFakeTimers();
            wrapper.vm.hoveredGroupId = "g1";
            wrapper.vm.hoverOffsets = { "n1": 10 };
            
            wrapper.vm.handleGroupLeave();
            
            expect(wrapper.vm.hoveredGroupId).toBe("g1"); // Immediate check
            
            vi.advanceTimersByTime(150);
            
            expect(wrapper.vm.hoveredGroupId).toBeNull();
            expect(wrapper.vm.hoverOffsets).toEqual({});
            vi.useRealTimers();
        });

        it("handleGroupLeave cancels existing timeout", () => {
            wrapper = createWrapper();
            vi.useFakeTimers();
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
            
            wrapper.vm.hoverTimeout = 123;
            wrapper.vm.handleGroupLeave();
            
            expect(clearTimeoutSpy).toHaveBeenCalled();
            vi.useRealTimers();
        });

        it("handleGroupHover clears existing timeout", () => {
             wrapper = createWrapper();
             wrapper.vm.hoverTimeout = setTimeout(() => {}, 100);
             
             wrapper.vm.handleGroupHover("g2");
             
             expect(wrapper.vm.hoverTimeout).toBeNull();
        });

        it("handleNodeHover propagates to group hover", () => {
            wrapper = createWrapper();
            // Spy doesn't work for internal call, check state
            
            // Node in group
            wrapper.vm.handleNodeHover({ id: "n1", groupId: "g1" });
            expect(wrapper.vm.hoveredGroupId).toBe("g1");
            
            // Node not in group
            wrapper.vm.handleNodeHover({ id: "n2", groupId: null });
            // Should not change hoveredGroupId if it was null, or check it wasn't called (difficult)
            // Reset to null first
            wrapper.vm.hoveredGroupId = null;
            wrapper.vm.handleNodeHover({ id: "n2", groupId: null });
            expect(wrapper.vm.hoveredGroupId).toBeNull();
        });

        it("handleNodeLeave propagates to group leave", () => {
            wrapper = createWrapper();
            vi.useFakeTimers();
            
            // Node in group should trigger leave logic (setting timeout)
            wrapper.vm.handleNodeLeave({ id: "n1", groupId: "g1" });
            expect(wrapper.vm.hoverTimeout).not.toBeNull();
            
            // Clear
            wrapper.vm.handleGroupHover("g1"); // Clears timeout
            
            // Node not in group
            wrapper.vm.handleNodeLeave({ id: "n2", groupId: null });
            expect(wrapper.vm.hoverTimeout).toBeNull();
            
            vi.useRealTimers();
        });

        it("handleNodeDragStart logic", () => {
            wrapper = createWrapper();
            wrapper.vm.activeOverviewNodeId = "n1";
            
            // Dragging overview node
            wrapper.vm.handleNodeDragStart({ id: "n1", groupId: null });
            expect(wrapper.vm.activeOverviewNodeId).toBe("n1"); // Should NOT clear if it's the same node? 
            // Wait, logic says: if (node.id !== this.activeOverviewNodeId) { null }
            
            // Dragging other node
            wrapper.vm.handleNodeDragStart({ id: "n2", groupId: "g1" });
            expect(wrapper.vm.activeOverviewNodeId).toBeNull();
            expect(wrapper.vm.externalDragGroupId).toBe("g1");
        });
        
        it("handleNodeDragEnd logic", () => {
             wrapper = createWrapper();
             wrapper.vm.externalDragGroupId = "g1";
             wrapper.vm.handleNodeDragEnd();
             expect(wrapper.vm.externalDragGroupId).toBeNull();
        });

        it("handleGroupMove delegates to store", () => {
             wrapper = createWrapper();
             workflowStore = useWorkflowStore();
             
             wrapper.vm.handleGroupMove({ groupId: "g1", dx: 10, dy: 10 });
             expect(workflowStore.moveGroup).toHaveBeenCalledWith("g1", 10, 10);
        });
        
        it("handleToggleOverview toggles off if same node", () => {
             wrapper = createWrapper();
             wrapper.vm.activeOverviewNodeId = "n1";
             wrapper.vm.handleToggleOverview("n1");
             expect(wrapper.vm.activeOverviewNodeId).toBeNull();
        });

        it("handleAddGroupCallback sets state correctly", () => {
             wrapper = createWrapper();
             wrapper.vm.handleAddGroupCallback("g1");
             expect(wrapper.vm.pendingCallbackGroupId).toBe("g1");
             expect(wrapper.vm.showTaskMenu).toBe(true);
        });

        it("handleAddNode returns early if parent not found", async () => {
             wrapper = createWrapper();
             workflowStore = useWorkflowStore();
             workflowStore.nodes = [];
             await wrapper.vm.$nextTick();
             
             wrapper.vm.handleAddNode("fake-id");
             expect(wrapper.vm.showTaskMenu).toBe(false);
        });

        it("handleAddNodeToGroup returns early if group empty", async () => {
             wrapper = createWrapper();
             workflowStore = useWorkflowStore();
             workflowStore.nodes = [];
             await wrapper.vm.$nextTick();
             
             wrapper.vm.handleAddNodeToGroup("empty-group");
             expect(wrapper.vm.showTaskMenu).toBe(false);
        });

        it("triggers updateContentHeight on panY change", async () => {
             wrapper = createWrapper();
             workflowStore = useWorkflowStore();
             workflowStore.nodes = [{ id: "n1", y: 0 }];
             await wrapper.vm.$nextTick();
             
             wrapper.vm.panY = 100;
             await wrapper.vm.$nextTick();
             expect(wrapper.emitted("content-resize")).toBeTruthy();
        });

        it("handles nodes change (default state) with no container size", async () => {
             wrapper = createWrapper();
             workflowStore = useWorkflowStore();
             wrapper.vm.containerWidth = 0;
             wrapper.vm.containerHeight = 0;
             await wrapper.vm.$nextTick();
             
             mocks.zoomToFit.mockClear();
             workflowStore.nodes = [{ id: "node-1" }];
             await wrapper.vm.$nextTick();
             
             await new Promise(r => setTimeout(r, 100));
             expect(mocks.zoomToFit).toHaveBeenCalled();
        });

        it("binds template events correctly", () => {
             wrapper = createWrapper();
             const container = wrapper.find(".canvas-container");
             
             container.trigger("mousemove");
             expect(wrapper.vm.handleMouseMove).toHaveBeenCalled();
             
             container.trigger("mouseup");
             expect(wrapper.vm.handleMouseUp).toHaveBeenCalled();
             
             container.trigger("mouseleave");
             expect(wrapper.vm.handleMouseUp).toHaveBeenCalled();
             
             container.trigger("wheel");
             expect(wrapper.vm.handleWheel).toHaveBeenCalled();
             
             // Branch coverage for mousedown in template
             container.trigger("mousedown");
             expect(wrapper.vm.handleMouseDownNav).toHaveBeenCalled();
        });

        it("closes overview on child event", async () => {
             wrapper = createWrapper();
             wrapper.vm.activeOverviewNodeId = "n1";
             // Need to ensure activeOverviewNode computed returns something for v-if
             wrapper.vm.activeOverviewNode = { data: {} }; 
             await wrapper.vm.$nextTick();
             
             const overview = wrapper.findComponent(WorkflowTaskResultStub);
             expect(overview.exists()).toBe(true);
             
             overview.vm.$emit("close");
             expect(wrapper.vm.activeOverviewNodeId).toBeNull();
        });
    });

    describe("Workflow and Folder Renaming Sync", () => {
        it("emits workflow-renamed when workflow name changes from Untitled workflow", async () => {
            const mockFolder = { id: "f1", display_name: "Untitled workflow" };
            wrapper = createWrapper({ folder: mockFolder });
            workflowStore = useWorkflowStore();
            
            // Initial state
            workflowStore.workflow = { id: "w1", display_name: "Untitled workflow" };
            await wrapper.vm.$nextTick();
            
            // Change name
            workflowStore.workflow.display_name = "New Workflow Name";
            await wrapper.vm.$nextTick();
            
            expect(wrapper.emitted("workflow-renamed")).toBeTruthy();
            expect(wrapper.emitted("workflow-renamed")[0]).toEqual(["New Workflow Name"]);
        });

        it("does not emit workflow-renamed if folder is not Untitled workflow", async () => {
            const mockFolder = { id: "f1", display_name: "Custom Folder Name" };
            wrapper = createWrapper({ folder: mockFolder });
            workflowStore = useWorkflowStore();
            
            // Initial state
            workflowStore.workflow = { id: "w1", display_name: "Untitled workflow" };
            await wrapper.vm.$nextTick();
            
            // Change name
            workflowStore.workflow.display_name = "New Workflow Name";
            await wrapper.vm.$nextTick();
            
            expect(wrapper.emitted("workflow-renamed")).toBeFalsy();
        });

        it("does not emit workflow-renamed if name changes to Generating...", async () => {
            const mockFolder = { id: "f1", display_name: "Untitled workflow" };
            wrapper = createWrapper({ folder: mockFolder });
            workflowStore = useWorkflowStore();
            
            // Initial state
            workflowStore.workflow = { id: "w1", display_name: "Untitled workflow" };
            await wrapper.vm.$nextTick();
            
            // Change name to generating
            workflowStore.workflow.display_name = "Generating workflow name...";
            await wrapper.vm.$nextTick();
            
            expect(wrapper.emitted("workflow-renamed")).toBeFalsy();
        });
    });
  });
});
