import { mount } from "@vue/test-utils";
import InvestigationTreeNode from "../InvestigationTreeNode.vue";
import { describe, it, expect } from "vitest";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const vuetify = createVuetify({
  components,
  directives,
});

describe("InvestigationTreeNode.vue", () => {
  const mountComponent = (props = {}) => {
      return mount(InvestigationTreeNode, {
        global: {
            plugins: [vuetify],
            stubs: {}
        },
        props: {
            depth: 0,
            activeId: null,
            ...props
        }
      });
  };
 
  const nodeTypes = [
      { type: "SECTION", icon: "mdi-lightbulb-outline", color: "grey" },
      { type: "MD_FILE", icon: "mdi-file-document-outline", color: "grey-darken-1" }, // default color
      { type: "OBSERVATION", icon: "mdi-eye-outline", color: "grey-darken-1" },
      { type: "QUESTION", icon: "mdi-help-circle-outline", color: "primary" },
      { type: "HYPOTHESIS", icon: "mdi-flask-outline", color: "amber" },
      { type: "TASK", icon: "mdi-clipboard-check-outline", color: "info" },
      { type: "FINDING", icon: "mdi-file-find-outline", color: "grey-darken-1" }
  ];

  it.each(nodeTypes)("renders correct icon and color for type $type", ({ type, icon, color }) => {
      const node = { id: "1", label: "Node", type };
      const wrapper = mountComponent({ node });

      const iconCmp = wrapper.findAllComponents({ name: "VIcon" }).find(w => w.attributes("class")?.includes("mr-2"));
      expect(iconCmp.exists()).toBe(true);
      expect(iconCmp.props("icon")).toBe(icon);
      expect(iconCmp.props("color")).toBe(color);
  });
  
  it("renders SECTION_HEADER correctly", () => {
      const node = { id: "1", label: "Header", type: "SECTION_HEADER" };
      const wrapper = mountComponent({ node });
      
      expect(wrapper.find(".section-header").exists()).toBe(true);
      expect(wrapper.text()).toContain("Header");
      expect(wrapper.find(".node-content").exists()).toBe(false);
  });

  // 2. Status Styling & Icons
  const allStatuses = [
      { status: "COMPLETED", className: "success", icon: "mdi-check-circle" },
      { status: "PROVEN", className: "success", icon: "mdi-check-circle" },
      { status: "SUPPORTS_PARENT", className: "success", icon: "mdi-check-circle" },
      
      { status: "FAILED", className: "error", icon: "mdi-close-circle" },
      { status: "DISPROVEN", className: "error", icon: "mdi-close-circle" },
      { status: "REFUTES_PARENT", className: "error", icon: "mdi-close-circle" },
      
      { status: "IN_PROGRESS", className: "info", icon: "mdi-play-circle-outline" },
      { status: "RUNNING", className: "info", icon: "mdi-play-circle-outline" },
      
      { status: "DATA_UNAVAILABLE", className: "warning", icon: "mdi-alert-circle-outline" },
      { status: "PENDING", className: "grey", icon: "mdi-clock-outline" },
      { status: "UNKNOWN", className: "grey", icon: "mdi-circle-outline" } 
  ];
  
  it.each(allStatuses)("applies correct status styling and icon for $status", ({ status, className, icon }) => {
      const node = { id: "1", label: "Node", type: "HYPOTHESIS", status };
      const wrapper = mountComponent({ node });

      if (icon) {
          const statusIcon = wrapper.findAllComponents({ name: "VIcon" }).find(w => w.attributes("class")?.includes("ml-1"));
          expect(statusIcon.exists()).toBe(true);
          expect(statusIcon.props("icon")).toBe(icon);
          expect(statusIcon.props("color")).toBe(className); // statusIconColor returns color name usually matching class logic simplistically in test mapping
      } else {
           const statusIcon = wrapper.findAllComponents({ name: "VIcon" }).find(w => w.attributes("class")?.includes("ml-1"));
           expect(statusIcon).toBeUndefined();
      }
      
      if (["DISPROVEN", "REFUTES_PARENT"].includes(status)) {
          expect(wrapper.find(".disproven").exists()).toBe(true);
      }
      if (["PROVEN", "SUPPORTS_PARENT"].includes(status)) {
           expect(wrapper.find(".proven").exists()).toBe(true);
      }
      if (status === "FAILED") {
          expect(wrapper.find(".failed").exists()).toBe(true);
      }
      if (status === "DATA_UNAVAILABLE") {
           expect(wrapper.find(".data-unavailable").exists()).toBe(true);
      }
  });

  it("emits node-click on content click", async () => {
      const node = { id: "1", label: "Click Me", type: "HYPOTHESIS" };
      const wrapper = mountComponent({ node });
      
      await wrapper.find(".node-content").trigger("click");
      expect(wrapper.emitted("node-click")).toBeTruthy();
      expect(wrapper.emitted("node-click")[0]).toEqual([node]);
  });
  
  it("does NOT emit node-click for unclickable types (SECTION)", async () => {
      const node = { id: "1", label: "Section", type: "SECTION" };
      const wrapper = mountComponent({ node });
      
      await wrapper.find(".node-content").trigger("click");
      expect(wrapper.emitted("node-click")).toBeFalsy();
      
  });

  it("toggles expansion even if node-click is not emitted", async () => {
       const child = { id: "c1", label: "Child", type: "HYPOTHESIS" };
       const node = { id: "1", label: "Section", type: "SECTION", children: [child] };
       const wrapper = mountComponent({ node });
       
       // Click content (not toggle icon directly, but handler is on content div)
       await wrapper.find(".node-content").trigger("click");
       
       // Should expand because handleNodeClick checks hasChildren
       expect(wrapper.text()).toContain("Child");
  });
  
  it("expands and collapses children", async () => {
      const child = { id: "c1", label: "Child", type: "TASK" };
      const node = { id: "1", label: "Parent", type: "HYPOTHESIS", children: [child] };
      const wrapper = mountComponent({ node });
      
      // Initially not expanded
      expect(wrapper.text()).not.toContain("Child");
      
      // Click toggle
      await wrapper.find(".toggle-icon").trigger("click");
      
      // Should show child
      expect(wrapper.text()).toContain("Child");
      
      // Check node-children container exists
      expect(wrapper.find(".node-children").exists()).toBe(true);
      
      // Click again to collapse
      await wrapper.find(".toggle-icon").trigger("click");
      expect(wrapper.text()).not.toContain("Child");
  });
  
  it("handles TASK findings (special children logic)", async () => {
      const finding = { id: "f1", label: "Found it", type: "FINDING" };
      const node = { 
          id: "1", 
          label: "Task", 
          type: "TASK", 
          findings: [finding]
      };
      const wrapper = mountComponent({ node });
      
      await wrapper.find(".toggle-icon").trigger("click");
      expect(wrapper.text()).toContain("Found it");
  });

  it("emits add-hypothesis on context menu", async () => {
      const node = { id: "1", label: "Question", type: "QUESTION" };
      const wrapper = mountComponent({ node });
      
      await wrapper.find(".node-content").trigger("contextmenu.prevent");
      expect(wrapper.emitted("add-hypothesis")).toBeTruthy();
      expect(wrapper.emitted("add-hypothesis")[0]).toEqual([node]);
  });
  
  it("does not emit add-hypothesis for other types", async () => {
       const node = { id: "1", label: "Task", type: "TASK" };
       const wrapper = mountComponent({ node });
       
       await wrapper.find(".node-content").trigger("contextmenu.prevent");
       expect(wrapper.emitted("add-hypothesis")).toBeFalsy();
  });

  it("applies active class", () => {
      const node = { id: "active-1", label: "Active", type: "HYPOTHESIS" };
      const wrapper = mountComponent({ node, activeId: "active-1" });
      
      expect(wrapper.find(".active-hypothesis").exists()).toBe(true);
  });
});
