/*
Copyright 2025 Google LLC

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
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import WorkflowNode from "../WorkflowNode.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

/**
 * Mock useThemeInfo global composable
 */
vi.mock("@/composables/useThemeInfo", () => ({
  useThemeInfo: () => ({
    isLightTheme: { value: true }, // Mocking a ref
  }),
}));

global.visualViewport = {
  width: 1000,
  height: 1000,
  offsetLeft: 0,
  offsetTop: 0,
  pageLeft: 0,
  pageTop: 0,
  scale: 1,
  onresize: null,
  onscroll: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

const vuetify = createVuetify({
  components,
  directives,
});

describe("WorkflowNode.vue", () => {
  let wrapper;

  const mockNode = {
    id: "node-1",
    label: "Test Node",
    type: "TestType",
    x: 100,
    y: 100,
    groupId: null,
    data: {
      status_short: "PENDING",
      files: [],
      output_files: [],
      task_config: [],
      runtime: 1.5,
    },
  };

  const createWrapper = (props = {}) => {
    return mount(WorkflowNode, {
      global: {
        plugins: [vuetify],
      },
      props: {
        node: mockNode,
        scale: 1,
        edges: [],
        nodes: [],
        externalDragGroupId: null,
        readOnly: false,
        dragDisabled: false,
        activeOverviewNodeId: null,
        ...props,
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find(".title").text()).toContain("Test Node");
    expect(wrapper.attributes("style")).toContain(
      "transform: translate(100px, 100px)"
    );
  });

  describe("Classes & Styles", () => {
    it("applies light-theme class when theme is light", () => {
      // Mocked to returns true currently
      wrapper = createWrapper();
      expect(wrapper.classes()).toContain("light-theme");
    });

    it("applies distinct classes based on node status", async () => {
      const successNode = {
        ...mockNode,
        data: { ...mockNode.data, status_short: "SUCCESS" },
      };
      wrapper = createWrapper({ node: successNode });
      expect(wrapper.classes()).toContain("status-success");

      const failureNode = {
        ...mockNode,
        data: { ...mockNode.data, status_short: "FAILURE" },
      };
      await wrapper.setProps({ node: failureNode });
      expect(wrapper.classes()).toContain("status-failure");
    });

    it("applies input class if node type is Input", () => {
      wrapper = createWrapper({ node: { ...mockNode, type: "Input" } });
      expect(wrapper.classes()).toContain("input");
    });
  });

  describe("Interactions", () => {
    it("emits node-hover and node-leave events", async () => {
      wrapper = createWrapper();
      await wrapper.trigger("mouseenter");
      expect(wrapper.emitted("node-hover")).toBeTruthy();
      expect(wrapper.emitted("node-hover")[0]).toEqual([mockNode]);

      await wrapper.trigger("mouseleave");
      expect(wrapper.emitted("node-leave")).toBeTruthy();
      expect(wrapper.emitted("node-leave")[0]).toEqual([mockNode]);
    });

    it("emits add-node when handle is clicked", async () => {
      wrapper = createWrapper();
      const handle = wrapper.find(".output-handle");
      await handle.trigger("click");
      expect(wrapper.emitted("add-node")).toBeTruthy();
      expect(wrapper.emitted("add-node")[0]).toEqual([mockNode.id]);
    });

    it("emits remove-node when delete button is clicked", async () => {
      wrapper = createWrapper();
      const deleteBtn = wrapper.find(".delete-btn");
      await deleteBtn.trigger("click");
      expect(wrapper.emitted("remove-node")).toBeTruthy();
      expect(wrapper.emitted("remove-node")[0]).toEqual([mockNode.id]);
    });

    it("does not emit remove-node if readOnly is true", async () => {
      wrapper = createWrapper({ readOnly: true });
      const deleteBtn = wrapper.find(".delete-btn");
      expect(deleteBtn.exists()).toBe(false);
    });
  });

  describe("Computed Logic", () => {
    it("displays runtime badge correctly", () => {
      wrapper = createWrapper();
      expect(wrapper.find(".runtime-badge-on-node").text()).toBe("1.50s");

      const fastNode = { ...mockNode, data: { ...mockNode.data, runtime: 0.5 } };
      wrapper = createWrapper({ node: fastNode });
      expect(wrapper.find(".runtime-badge-on-node").text()).toBe("< 1s");
    });

    it("displays no-output badge correctly", () => {
      const successNoOutputNode = {
        ...mockNode,
        data: {
          ...mockNode.data,
          status_short: "SUCCESS",
          output_files: [],
        },
      };
      wrapper = createWrapper({ node: successNoOutputNode });
      expect(wrapper.find(".no-output-badge").exists()).toBe(true);

      const successWithOutput = {
        ...mockNode,
        data: {
          ...mockNode.data,
          status_short: "SUCCESS",
          output_files: ["file1"],
        },
      };
      wrapper = createWrapper({ node: successWithOutput });
      expect(wrapper.find(".no-output-badge").exists()).toBe(false);
    });

    it("displays alert badge for high priority reports", () => {
      const alertNode = {
        ...mockNode,
        data: {
          ...mockNode.data,
          file_reports: [{ priority: 40 }],
          status_short: "SUCCESS",
        },
      };
      wrapper = createWrapper({ node: alertNode });
      expect(wrapper.find(".alert-badge").exists()).toBe(true);
    });
  });

  describe("Dragging Logic", () => {
    it("starts drag on mousedown", async () => {
      wrapper = createWrapper();
      // Mock window addEventListener
      const addSpy = vi.spyOn(window, "addEventListener");

      await wrapper.trigger("mousedown", { clientX: 100, clientY: 100 });
      expect(wrapper.emitted("drag-start")).toBeTruthy();
      expect(addSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
    });

    it("updates position on mousemove", async () => {
      vi.useFakeTimers();
      wrapper = createWrapper();
      await wrapper.trigger("mousedown", { clientX: 100, clientY: 100 });

      // Trigger mousemove on window
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 120,
        clientY: 120,
      });
      window.dispatchEvent(moveEvent);

      vi.runAllTimers(); // Advance timers (including requestAnimationFrame)
      
      expect(wrapper.emitted("update:position")).toBeTruthy();
      // dx=20, dy=20, initial=100. Expected 120, 120
      expect(wrapper.emitted("update:position")[0][0]).toEqual({
        id: "node-1",
        x: 120,
        y: 120,
      });
      vi.useRealTimers();
    });

    it("ends drag on mouseup", async () => {
      wrapper = createWrapper();
      const removeSpy = vi.spyOn(window, "removeEventListener");
      await wrapper.trigger("mousedown", { clientX: 100, clientY: 100 });
      
      const upEvent = new MouseEvent("mouseup");
      window.dispatchEvent(upEvent);

      expect(wrapper.emitted("drag-end")).toBeTruthy();
      expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    });
  });

  describe("Grouping & Connection Logic", () => {
    it("hides output handle if connected to a group", () => {
      const node1 = { ...mockNode };
      const groupNode = { id: "node-2", groupId: "group-1" };
      const edge = { from: "node-1", to: "node-2" };
      
      wrapper = createWrapper({
        nodes: [node1, groupNode],
        edges: [edge]
      });
      
      // logic: !isConnectedToGroup. here it IS connected to group, so should be false -> hidden
      // The v-if is !isConnectedToGroup
      expect(wrapper.find(".output-handle").exists()).toBe(false);
    });
  });

  describe("Toggle Overview", () => {
    it("emits toggle-overview on click if success", async () => {
      const successNode = {
        ...mockNode,
        data: { ...mockNode.data, status_short: "SUCCESS" },
      };
      wrapper = createWrapper({ node: successNode });

      // Simulate click without move (drag)
      await wrapper.trigger("mousedown", { clientX: 100, clientY: 100 });
      const upEvent = new MouseEvent("mouseup");
      window.dispatchEvent(upEvent);

      expect(wrapper.emitted("toggle-overview")).toBeTruthy();
    });

    it("does NOT emit toggle-overview if moved (dragged)", async () => {
      const successNode = {
        ...mockNode,
        data: { ...mockNode.data, status_short: "SUCCESS" },
      };
      wrapper = createWrapper({ node: successNode });

      await wrapper.trigger("mousedown", { clientX: 100, clientY: 100 });
      
      // Simulate move
      const moveEvent = new MouseEvent("mousemove", { clientX: 150, clientY: 150 });
      window.dispatchEvent(moveEvent);

      const upEvent = new MouseEvent("mouseup");
      window.dispatchEvent(upEvent);

      expect(wrapper.emitted("toggle-overview")).toBeFalsy();
    });
  });

  describe("File Expansion", () => {
    it("shows only 3 files initially and expands on click", async () => {
      const manyFiles = Array.from({ length: 5 }, (_, i) => ({
        id: `file-${i}`,
        display_name: `File ${i}`,
      }));
      const nodeWithFiles = {
        ...mockNode,
        type: "Input",
        data: { ...mockNode.data, files: manyFiles },
      };
      wrapper = createWrapper({ node: nodeWithFiles });

      const files = wrapper.findAll(".filename");
      expect(files.length).toBe(3);
      expect(wrapper.find(".show-more-btn").text()).toContain("Show all (+2)");

      await wrapper.find(".show-more-btn").trigger("click");
      expect(wrapper.findAll(".filename").length).toBe(5);
      expect(wrapper.find(".show-more-btn").text()).toBe("Show less");
    });
  });

  describe("Task Configuration", () => {
    const configNode = {
      ...mockNode,
      data: {
        ...mockNode.data,
        status_short: null,
        task_config: [{ name: "param1", value: "test" }],
      },
    };

    it("shows config button if task has config", () => {
      wrapper = createWrapper({ node: configNode });
      expect(wrapper.find(".config-btn").exists()).toBe(true);
      expect(wrapper.find(".config-btn").classes()).toContain("is-configured");
    });

    it("opens config dialog on click", async () => {
      wrapper = createWrapper({ node: configNode });
      await wrapper.find(".config-btn").trigger("click");
      // v-dialog is mocked or stubbed usually, but component state should update
      expect(wrapper.vm.showTaskConfigForm).toBe(true);
    });

    it("emits update:node-config when form saves", async () => {
      wrapper = createWrapper({ node: configNode });
      wrapper.vm.showTaskConfigForm = true;
      
      // Directly invoke the method logic to verify emission
      const formData = { param1: "newValue" };
      wrapper.vm.saveTaskConfig(formData);
      
      expect(wrapper.emitted("update:node-config")).toBeTruthy();
      expect(wrapper.emitted("update:node-config")[0][0]).toEqual({
        nodeId: mockNode.id,
        formData,
      });
      expect(wrapper.vm.showTaskConfigForm).toBe(false);
    });

    it("hides config button if readOnly", () => {
      wrapper = createWrapper({ node: configNode, readOnly: true });
      expect(wrapper.find(".config-btn").exists()).toBe(false);
    });
  });

  describe("Complex Grouping Logic", () => {
    it("detects if node is connected to a group member (isConnectedToGroup)", () => {
       // Covered partially by previous test, but explicitly checking true case
      const node1 = { ...mockNode };
      const groupNode = { id: "node-2", groupId: "group-1" };
      const edge = { from: "node-1", to: "node-2" };
      
      wrapper = createWrapper({
        nodes: [node1, groupNode],
        edges: [edge]
      });
      
      expect(wrapper.vm.isConnectedToGroup).toBe(true);
    });

    it("detects if group connects to callback (isGroupConnectedToCallback)", () => {
      const nodeInGroup = { ...mockNode, groupId: "group-a" };
      const otherGroupNode = { id: "node-2", groupId: "group-a" };
      const callbackNode = { id: "cb-1", type: "Callback" };
      
      // invalid case first
      wrapper = createWrapper({ node: nodeInGroup, nodes: [nodeInGroup] });
      expect(wrapper.vm.isGroupConnectedToCallback).toBe(false);

      // valid case: other node in same group connects to callback
      const edgeToCb = { from: "node-2", to: "cb-1" };
      
      wrapper = createWrapper({
        node: nodeInGroup,
        nodes: [nodeInGroup, otherGroupNode, callbackNode],
        edges: [edgeToCb]
      });
      
      expect(wrapper.vm.isGroupConnectedToCallback).toBe(true);
      // If true, handle is hidden
       expect(wrapper.find(".output-handle").exists()).toBe(false);
    });
  });
});
