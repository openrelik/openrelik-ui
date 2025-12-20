import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive } from "vue";
import WorkflowGroupLayer from "../WorkflowGroupLayer.vue";

const mockSettings = reactive({
  WorkflowChordCreation: true,
});

vi.mock("@/composables/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: mockSettings,
  }),
}));

describe("WorkflowGroupLayer.vue", () => {
  let wrapper;

  const mockNodes = [
    { id: "node-1", groupId: "group-1", x: 100, y: 100 },
    { id: "node-2", groupId: "group-1", x: 400, y: 300 },
    { id: "node-3", groupId: "group-2", x: 600, y: 100 },
    { id: "node-no-group", groupId: null, x: 50, y: 50 },
  ];

  const mockEdges = [];

  const createWrapper = (props = {}) => {
    return mount(WorkflowGroupLayer, {
      props: {
        nodes: mockNodes,
        edges: mockEdges,
        scale: 1,
        activeGroupId: null,
        draggingGroupId: null,
        readOnly: false,
        ...props,
      },
    });
  };

  it("renders correctly", () => {
    wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
    // Should have 2 groups (group-1, group-2)
    const groups = wrapper.findAll(".group-wrapper");
    expect(groups.length).toBe(2);
  });

  it("uses default empty array for edges if not provided", () => {
    wrapper = mount(WorkflowGroupLayer, {
      props: {
        nodes: mockNodes,
        // edges not provided
      },
    });
    expect(wrapper.vm.edges).toEqual([]);
  });

  describe("Bounding Box Calculation", () => {
    it("calculates correct bounds for a group with multiple nodes", () => {
      wrapper = createWrapper();
      // Group 1:
      // Node 1: x=100, y=100. Width=180, Height=100.
      // Node 2: x=400, y=300. Width=180, Height=100.
      // MinX = 100, MinY = 100
      // MaxX = 400 + 180 = 580
      // MaxY = 300 + 100 = 400
      // Width = 580 - 100 + 40 (padding*2) = 520
      // Height = 400 - 100 + 40 = 340
      // Left = 100 - 20 = 80
      // Top = 100 - 20 = 80

      const group1Box = wrapper
        .findAll(".group-wrapper")[0]
        .find(".group-box");
      const style = group1Box.attributes("style");

      // We can't guarantee order of keys in groups object, so let's find checking ID logic or assume order if list is stable.
      // Usually Object.values() order is insertion order for strings.
      // Let's rely on computed property directly for robust test.
      const group1 = wrapper.vm.groups.find((g) => g.id === "group-1");
      expect(group1).toBeDefined();

      const layout = wrapper.vm.getGroupLayoutStyle(group1);
      expect(layout.left).toBe("80px");
      expect(layout.top).toBe("80px");
      expect(layout.width).toBe("520px");
      expect(layout.height).toBe("340px");
    });

    it("expands bounding box for ghost node when active (hovered)", () => {
      wrapper = createWrapper({ activeGroupId: "group-1" });
      const group1 = wrapper.vm.groups.find((g) => g.id === "group-1");
      
      const layout = wrapper.vm.getGroupLayoutStyle(group1);
      // Original Height = 340
      // Expanded: MaxY += 120 -> Height increases by 120 -> 460
      expect(layout.height).toBe("460px");
    });
    
    it("does NOT expand bounding box if readOnly", () => {
       wrapper = createWrapper({ activeGroupId: "group-1", readOnly: true });
       const group1 = wrapper.vm.groups.find((g) => g.id === "group-1");
       const layout = wrapper.vm.getGroupLayoutStyle(group1);
       expect(layout.height).toBe("340px");
    });
  });

  describe("Rendering Elements", () => {
    it("shows ghost node (add button) when active", async () => {
      wrapper = createWrapper({ activeGroupId: "group-1" });
      const groupWrapper = wrapper.findAll(".group-wrapper").find(el => {
         // rough check, assuming order or verify specific DOM structure presence
         return true; // effectively checking "any group has it" but we only activated group-1
      });
      // Actually let's just find globally, only one should appear for group-1
      const ghostNode = wrapper.find(".ghost-node");
      expect(ghostNode.exists()).toBe(true);
      expect(ghostNode.find(".plus-sign").text()).toBe("+");
    });

    it("hides ghost node when not active", () => {
      wrapper = createWrapper({ activeGroupId: null });
      expect(wrapper.find(".ghost-node").exists()).toBe(false);
    });

    it("shows right-side ghost node for chord creation if no outgoing edges", () => {
       wrapper = createWrapper({ activeGroupId: "group-1", edges: [] });
       const rightGhost = wrapper.find(".ghost-node.right");
       expect(rightGhost.exists()).toBe(true);
    });

    it("hides right-side ghost node if outgoing edges exist", () => {
       const outgoingEdge = { from: "node-1", to: "node-3" };
       wrapper = createWrapper({ activeGroupId: "group-1", edges: [outgoingEdge] });
       const rightGhost = wrapper.find(".ghost-node.right");
       expect(rightGhost.exists()).toBe(false);
    });

    it("hides right-side ghost node if WorkflowChordCreation setting is disabled", async () => {
      mockSettings.WorkflowChordCreation = false;
      wrapper = createWrapper({ activeGroupId: "group-1", edges: [] });
      const rightGhost = wrapper.find(".ghost-node.right");
      expect(rightGhost.exists()).toBe(false);
      
      // Reset for other tests
      mockSettings.WorkflowChordCreation = true;
    });
  });

  describe("Interaction", () => {
    it("emits group-hover and group-leave events", async () => {
      wrapper = createWrapper();
      const groupBox = wrapper.find(".group-box");
      
      await groupBox.trigger("mouseenter");
      expect(wrapper.emitted("group-hover")).toBeTruthy();
      
      await groupBox.trigger("mouseleave");
      expect(wrapper.emitted("group-leave")).toBeTruthy();
    });

    it("emits add-node-to-group when ghost node is clicked", async () => {
      wrapper = createWrapper({ activeGroupId: "group-1" });
      const ghostNode = wrapper.find(".ghost-node");
      await ghostNode.trigger("click");
      expect(wrapper.emitted("add-node-to-group")).toBeTruthy();
      expect(wrapper.emitted("add-node-to-group")[0]).toEqual(["group-1"]);
    });

    it("emits add-group-callback when right ghost node is clicked", async () => {
       wrapper = createWrapper({ activeGroupId: "group-1", edges: [] });
       const rightGhost = wrapper.find(".ghost-node.right");
       await rightGhost.trigger("click");
       expect(wrapper.emitted("add-group-callback")).toBeTruthy();
       expect(wrapper.emitted("add-group-callback")[0]).toEqual(["group-1"]);
    });

    it("emits group-hover/leave on ghost node hover", async () => {
       wrapper = createWrapper({ activeGroupId: "group-1" });
       const ghostNode = wrapper.find(".ghost-node");
       
       await ghostNode.trigger("mouseenter");
       expect(wrapper.emitted("group-hover")).toBeTruthy();
       expect(wrapper.emitted("group-hover").slice(-1)[0]).toEqual(["group-1"]);

       await ghostNode.trigger("mouseleave");
       expect(wrapper.emitted("group-leave")).toBeTruthy();
    });

    it("emits group-hover/leave on right ghost node hover", async () => {
       wrapper = createWrapper({ activeGroupId: "group-1", edges: [] });
       const rightGhost = wrapper.find(".ghost-node.right");
       
       await rightGhost.trigger("mouseenter");
       expect(wrapper.emitted("group-hover")).toBeTruthy();
       
       await rightGhost.trigger("mouseleave");
       expect(wrapper.emitted("group-leave")).toBeTruthy();
    });

    it("starts drag on mousedown", async () => {
       wrapper = createWrapper();
       const groupBox = wrapper.findAll(".group-box")[0]; // group-1
       const addSpy = vi.spyOn(window, "addEventListener");

       await groupBox.trigger("mousedown", { clientX: 100, clientY: 100 });
       expect(wrapper.emitted("group-drag-start")).toBeTruthy();
       expect(wrapper.emitted("group-drag-start")[0]).toEqual(["group-1"]);
       expect(addSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    });

    it("updates position on mousemove", async () => {
       wrapper = createWrapper();
       const groupBox = wrapper.findAll(".group-box")[0]; // group-1
       
       await groupBox.trigger("mousedown", { clientX: 100, clientY: 100 });
       
       const moveEvent = new MouseEvent("mousemove", { clientX: 120, clientY: 120 });
       window.dispatchEvent(moveEvent);
       
       expect(wrapper.emitted("move-group")).toBeTruthy();
       // dx = 20, dy = 20
       expect(wrapper.emitted("move-group")[0][0]).toEqual({
          groupId: "group-1",
          dx: 20,
          dy: 20
       });
    });
    
    it("ends drag on mouseup", async () => {
       wrapper = createWrapper();
       const groupBox = wrapper.findAll(".group-box")[0];
       const removeSpy = vi.spyOn(window, "removeEventListener");

       await groupBox.trigger("mousedown", { clientX: 100, clientY: 100 });
       
       const upEvent = new MouseEvent("mouseup");
       window.dispatchEvent(upEvent);
       
       expect(wrapper.emitted("group-drag-end")).toBeTruthy();
       expect(wrapper.emitted("group-drag-end")[0]).toEqual(["group-1"]);
       expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    });
  });
});
