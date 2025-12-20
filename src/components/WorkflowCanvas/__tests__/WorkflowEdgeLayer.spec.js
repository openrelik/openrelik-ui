import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import WorkflowEdgeLayer from "../WorkflowEdgeLayer.vue";

describe("WorkflowEdgeLayer.vue", () => {
  let wrapper;

  const mockNodes = [
    { id: "node-1", x: 100, y: 100, type: "Task", data: {} },
    { id: "node-2", x: 400, y: 200, type: "Task", data: {} },
    { id: "node-input", x: 50, y: 50, type: "Input", data: {} },
  ];

  const mockEdges = [{ id: "edge-1", from: "node-1", to: "node-2" }];

  const createWrapper = (props = {}) => {
    return mount(WorkflowEdgeLayer, {
      props: {
        nodes: mockNodes,
        edges: mockEdges,
        ...props,
      },
    });
  };

  it("renders correctly", () => {
    wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find("svg.edge-layer").exists()).toBe(true);
    expect(wrapper.find("#arrowhead").exists()).toBe(true);
  });

  describe("Path Generation", () => {
    it("renders paths for edges", () => {
      wrapper = createWrapper();
      const paths = wrapper.findAll("path");
      expect(paths.length).toBe(1);
    });

    it("does not render path if node is missing", async () => {
      const brokenEdges = [
        { id: "edge-broken", from: "node-1", to: "node-missing" },
      ];
      wrapper = createWrapper({ edges: brokenEdges });
      expect(wrapper.findAll("path").length).toBe(0);
    });

    it("calculates correct path coordinates for Task nodes", () => {
      wrapper = createWrapper();
      const path = wrapper.find("path");
      const d = path.attributes("d");

      // Node1 (Task) x=100, y=100. Width=180. StartX = 280, StartY = 150
      // Node2 (Task) x=400, y=200. EndX = 400 - 24 = 376, EndY = 250
      // Expected M 280 150 ... 376 250
      expect(d).toContain("M 280 150");
      expect(d).toContain("376 250");
    });

    it("calculates correct path coordinates for Input nodes", async () => {
      const inputEdges = [{ id: "edge-input", from: "node-input", to: "node-1" }];
      wrapper = createWrapper({ edges: inputEdges });
      
      const path = wrapper.find("path");
      const d = path.attributes("d");

      // NodeInput (Input) x=50, y=50. Width=200. StartX = 250, StartY = 100
      expect(d).toContain("M 250 100");
    });
  });

  describe("Reactivity", () => {
    it("updates paths when nodes move", async () => {
      wrapper = createWrapper();
      
      const newNodes = [
        { id: "node-1", x: 150, y: 150, type: "Task", data: {} }, // moved
        { id: "node-2", x: 400, y: 200, type: "Task", data: {} },
      ];
      
      await wrapper.setProps({ nodes: newNodes });
      const path = wrapper.find("path");
      const d = path.attributes("d");
      
      // New StartX = 150 + 180 = 330, StartY = 150 + 50 = 200
      expect(d).toContain("M 330 200");
    });

    it("updates paths when edges change", async () => {
      wrapper = createWrapper({ edges: [] });
      expect(wrapper.findAll("path").length).toBe(0);
      
      await wrapper.setProps({ edges: mockEdges });
      expect(wrapper.findAll("path").length).toBe(1);
    });
  });

  describe("Animation", () => {
    it("adds animated-edge class when start node status is PROGRESS", async () => {
      const progressNodes = [
         { id: "node-1", x: 100, y: 100, type: "Task", data: { status_short: "PROGRESS" } },
         { id: "node-2", x: 400, y: 200, type: "Task", data: {} },
      ];
      
      wrapper = createWrapper({ nodes: progressNodes });
      const path = wrapper.find("path");
      expect(path.classes()).toContain("animated-edge");
    });

    it("does NOT add animated-edge class when status is not PROGRESS", () => {
       wrapper = createWrapper(); // Default is undefined status
       const path = wrapper.find("path");
       expect(path.classes()).not.toContain("animated-edge");
    });
  });
});
