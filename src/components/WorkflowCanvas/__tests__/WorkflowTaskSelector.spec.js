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
import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import WorkflowTaskSelector from "../WorkflowTaskSelector.vue";

// Mock useThemeInfo
vi.mock("@/composables/useThemeInfo", () => ({
  useThemeInfo: () => ({
    isLightTheme: { value: true },
  }),
}));

describe("WorkflowTaskSelector.vue", () => {
  let wrapper;

  const mockTasks = [
    { task_name: "alpha_task", display_name: "Alpha Task", description: "First task" },
    { task_name: "beta_task", display_name: "Beta Task", description: "Second task" },
    { task_name: "gamma_task", display_name: "Gamma Task", description: "Third task" },
  ];

  const createWrapper = (props = {}) => {
    return mount(WorkflowTaskSelector, {
      props: {
        tasks: mockTasks,
        x: 100,
        y: 100,
        ...props,
      },
      attachTo: document.body, // Important for focus handling and global events
    });
  };

  afterEach(() => {
    if (wrapper) wrapper.unmount();
  });

  describe("Rendering", () => {
    it("renders correctly with given props", () => {
      wrapper = createWrapper();
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find(".task-selector").exists()).toBe(true);
      // Check position
      expect(wrapper.attributes("style")).toContain("left: 100px");
      expect(wrapper.attributes("style")).toContain("top: 100px");
    });

    it("renders list of tasks", () => {
      wrapper = createWrapper();
      const items = wrapper.findAll(".task-item");
      expect(items.length).toBe(3);
      expect(items[0].text()).toContain("Alpha Task");
    });

    it("sorts tasks alphabetically by display name", () => {
      const unsortedTasks = [
        { display_name: "Zebra" },
        { display_name: "Apple" },
      ];
      wrapper = createWrapper({ tasks: unsortedTasks });
      const items = wrapper.findAll(".task-name");
      expect(items[0].text()).toBe("Apple");
      expect(items[1].text()).toBe("Zebra");
    });

    it("uses default empty array if tasks prop is not provided", () => {
       wrapper = mount(WorkflowTaskSelector, {
          props: {
             x: 0,
             y: 0
             // tasks missing
          }
       });
       expect(wrapper.vm.tasks).toEqual([]);
    });

    it("autofocuses the search input on mount", async () => {
      wrapper = createWrapper();
      await wrapper.vm.$nextTick();
      const input = wrapper.find("input").element;
      expect(document.activeElement).toBe(input);
    });
  });

  describe("Filtering", () => {
    it("filters tasks based on search query", async () => {
      wrapper = createWrapper();
      const input = wrapper.find("input");
      await input.setValue("beta");
      
      const items = wrapper.findAll(".task-item");
      expect(items.length).toBe(1);
      expect(items[0].text()).toContain("Beta Task");
    });

    it("shows no results message when no matches found", async () => {
      wrapper = createWrapper();
      const input = wrapper.find("input");
      await input.setValue("xyz_non_existent");
      
      expect(wrapper.findAll(".task-item").length).toBe(0);
      expect(wrapper.find(".no-results").exists()).toBe(true);
      expect(wrapper.find(".no-results").text()).toBe("No tasks found");
    });
  });

  describe("Interaction", () => {
    it("emits select event when clicking a task", async () => {
      wrapper = createWrapper();
      const items = wrapper.findAll(".task-item");
      await items[0].trigger("click");
      
      expect(wrapper.emitted("select")).toBeTruthy();
      expect(wrapper.emitted("select")[0]).toEqual([mockTasks[0]]);
    });

    it("emits close event when pressing Escape", async () => {
      wrapper = createWrapper();
      await wrapper.trigger("keydown", { key: "Escape" }); 
      // Note: The component attaches listener to window. 
      // Vitest + standard trigger on component might not bubble to window transparently if not attached.
      // But let's try direct window dispatch for global listener.
      
      const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(escapeEvent);
      
      expect(wrapper.emitted("close")).toBeTruthy();
    });
  });

  describe("Keyboard Navigation", () => {
    it("navigates down with ArrowDown", async () => {
      wrapper = createWrapper();
      // Initial selection index is 0
      expect(wrapper.vm.selectedIndex).toBe(0);
      
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "ArrowDown" });
      
      expect(wrapper.vm.selectedIndex).toBe(1);
      const items = wrapper.findAll(".task-item");
      expect(items[1].classes()).toContain("selected");
    });

    it("navigates up with ArrowUp", async () => {
      wrapper = createWrapper();
      // move down first
      wrapper.vm.selectedIndex = 1;
      
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "ArrowUp" });
      
      expect(wrapper.vm.selectedIndex).toBe(0);
    });

    it("selects focused task with Enter", async () => {
      wrapper = createWrapper();
      // Select the first one (Alpha)
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "Enter" });
      
      expect(wrapper.emitted("select")).toBeTruthy();
      expect(wrapper.emitted("select")[0]).toEqual([mockTasks[0]]);
    });

    it("resets selection index when filter changes", async () => {
      wrapper = createWrapper();
      wrapper.vm.selectedIndex = 2;
      
      const input = wrapper.find("input");
      await input.setValue("beta");
      
      expect(wrapper.vm.selectedIndex).toBe(0);
    });
  });
  
  describe("Normalization", () => {
     it("handles Ref-unwrapping for tasks from store", () => {
        const complexTasks = [
           { _custom: { value: { task_name: "ref_task", display_name: "Ref Task" } } }
        ];
        
        // We pass it 'as is' pretending it came from a reactive source that Vue didn't auto-unwrap in props
        // Note: Props usually unwrap refs, but array elements might not if checking _custom implementation.
        // Let's trust the component logic specifically checks for _custom.value
        
        wrapper = createWrapper({ tasks: complexTasks });
        expect(wrapper.vm.filteredTasks[0].display_name).toBe("Ref Task");
     });
  });

  describe("Coverage Improvements", () => {
    describe("Sorting Fallbacks", () => {
      it("sorts by task_name if display_name is missing", () => {
         const tasks = [
           { task_name: "Zeta" }, 
           { task_name: "Alpha" }
         ];
         wrapper = createWrapper({ tasks });
         const filtered = wrapper.vm.filteredTasks;
         expect(filtered[0].task_name).toBe("Alpha");
         expect(filtered[1].task_name).toBe("Zeta");
      });
      
      it("handles missing names gracefully (empty string fallback)", () => {
         // This hits the || "" branch
         const tasks = [
           { other_prop: 1 }, 
           { task_name: "Alpha" }
         ];
         wrapper = createWrapper({ tasks });
         // "" comes before "Alpha" in alphabetical sort usually? 
         // "" vs "alpha". "".localeCompare("alpha") -> -1. So empty first.
         const filtered = wrapper.vm.filteredTasks;
         expect(filtered[0].other_prop).toBe(1);
      });
    });

    describe("Filtering Edge Cases", () => {
      it("filters by description if display_name doesn't match", async () => {
         const tasks = [{ display_name: "Foo", description: "TargetTerm" }];
         wrapper = createWrapper({ tasks });
         await wrapper.find("input").setValue("TargetTerm");
         expect(wrapper.findAll(".task-item").length).toBe(1);
      });

      it("filters by task_name if description doesn't match", async () => {
          const tasks = [{ task_name: "target_id", display_name: "Bar", description: "desc" }];
          wrapper = createWrapper({ tasks });
          await wrapper.find("input").setValue("target_id");
          expect(wrapper.findAll(".task-item").length).toBe(1);
      });
    });

    describe("Keyboard Boundaries & Logic", () => {
      it("does not navigate up from index 0", async () => {
         wrapper = createWrapper();
         expect(wrapper.vm.selectedIndex).toBe(0);
         await wrapper.find("input").trigger("keydown", { key: "ArrowUp" });
         expect(wrapper.vm.selectedIndex).toBe(0);
      });

      it("does not navigate down from last index", async () => {
         wrapper = createWrapper();
         // 3 mock tasks, max index 2
         wrapper.vm.selectedIndex = 2; 
         await wrapper.find("input").trigger("keydown", { key: "ArrowDown" });
         expect(wrapper.vm.selectedIndex).toBe(2);
      });

      it("ignores unrelated keys", async () => {
         wrapper = createWrapper();
         await wrapper.find("input").trigger("keydown", { key: "a" }); 
         expect(wrapper.vm.selectedIndex).toBe(0);
      });

      it("does nothing on Enter if no tasks exist", async () => {
         wrapper = createWrapper({ tasks: [] });
         await wrapper.find("input").trigger("keydown", { key: "Enter" });
         expect(wrapper.emitted("select")).toBeFalsy();
      });
    });

    describe("Ref Robustness", () => {
       it("ignores null refs in setItemRef", () => {
          wrapper = createWrapper();
          const initialLength = wrapper.vm.itemRefs.length;
          wrapper.vm.setItemRef(null);
          expect(wrapper.vm.itemRefs.length).toBe(initialLength);
       });

       it("handles scrollToSelected gracefully when ref is missing", async () => {
          wrapper = createWrapper();
          wrapper.vm.itemRefs = []; // forcefully empty refs
          wrapper.vm.selectedIndex = 0; 
          // Trigger watcher by re-assigning same val or just calling method
          wrapper.vm.scrollToSelected();
          // Validation: just ensuring no error is thrown
          await wrapper.vm.$nextTick();
          expect(true).toBe(true);
       });
    });
  });
  describe("Reactivity", () => {
    it("updates list when tasks prop changes", async () => {
      wrapper = createWrapper({ tasks: [] });
      expect(wrapper.findAll(".task-item").length).toBe(0);
      
      await wrapper.setProps({ tasks: mockTasks });
      expect(wrapper.findAll(".task-item").length).toBe(3);
    });

    it("resets selection index when tasks prop changes", async () => {
      wrapper = createWrapper({ tasks: mockTasks });
      wrapper.vm.selectedIndex = 2;
      
      const newTasks = [
        { task_name: "new_task", display_name: "New Task", description: "Desc" }
      ];
      await wrapper.setProps({ tasks: newTasks });
      
      expect(wrapper.vm.selectedIndex).toBe(0);
      expect(wrapper.findAll(".task-item").length).toBe(1);
    });
  });
});
