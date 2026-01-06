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
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import WorkflowTaskResult from "../WorkflowTaskResult.vue";

// Mock dependencies
vi.mock("@/composables/useThemeInfo", () => ({
  useThemeInfo: () => ({
    isLightTheme: { value: true },
  }),
}));

vi.mock("@/settings", () => ({
  default: {
    apiServerUrl: "http://mock-api.com",
  },
}));

vi.mock("dompurify", () => ({
  default: {
    sanitize: (str) => str, // Mock sanitize to return string as-is
  },
}));

// Mock router-link since we are not using real router
const RouterLinkStub = {
  template: "<a><slot /></a>",
  props: ["to"],
};

describe("WorkflowTaskResult.vue", () => {
  let wrapper;

  const mockData = {
    display_name: "Mock Task",
    result: JSON.stringify({ command: "echo hello" }),
    runtime: 1.234,
    status_short: "SUCCESS",
    task_config: [
      { name: "option1", title: "Option 1", value: "value1" },
      { name: "option2", value: null }, // Should be filtered out
    ],
    output_files: [
      { id: "file-1", display_name: "output.txt", filesize: 1024 },
    ],
    file_reports: [
      { priority: 10, summary: "Info report", file: { id: "f1", display_name: "f1.txt" } },
      { priority: 50, summary: "Critical report", file: { id: "f2", display_name: "f2.txt" } },
    ],
    task_report: {
       markdown: "# Task Report\nSome details",
       priority: 0
    }
  };

  const createWrapper = (props = {}) => {
    return mount(WorkflowTaskResult, {
      props: {
        data: mockData,
        x: 100,
        y: 100,
        folderId: "folder-1",
        ...props,
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
          "v-icon": { template: "<span><slot /></span>" }, // Stub v-icon
          "v-btn": { template: "<button><slot /></button>" } // Stub v-btn
        },
      },
    });
  };

  it("renders correctly", () => {
    wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find(".title").text()).toBe("Mock Task");
    expect(wrapper.find(".runtime-badge").text()).toContain("1.23s");
    
    // Check position
    expect(wrapper.attributes("style")).toContain("left: 100px");
    expect(wrapper.attributes("style")).toContain("top: 100px");
  });

  it("renders command", () => {
    wrapper = createWrapper();
    expect(wrapper.find(".code-block").text()).toBe("echo hello");
  });

  it("renders formatted config filtering out nulls", () => {
    wrapper = createWrapper();
    const configItems = wrapper.findAll(".config-item");
    expect(configItems.length).toBe(1);
    expect(configItems[0].text()).toContain("Option 1");
    expect(configItems[0].text()).toContain("value1");
  });

  it("renders file reports correctly", () => {
    wrapper = createWrapper();
    const reports = wrapper.findAll(".report-item");
    expect(reports.length).toBe(2);
    
    // Low priority
    expect(reports[0].text()).toContain("Info report");
    
    // High priority
    const highPri = reports[1];
    expect(highPri.text()).toContain("Critical report");
    // Check for high-priority class logic if possible or just style
    // The v-icon stub prevents checking style prop easily without deep mount or better stub, 
    // but we can check the summary class
    expect(highPri.find(".report-summary").classes()).toContain("high-priority");
  });

  it("renders task report", () => {
     wrapper = createWrapper();
     const reportContent = wrapper.find(".report-content");
     expect(reportContent.exists()).toBe(true);
     expect(reportContent.html()).toContain("Task Report");
  });

  it("renders output files list", () => {
    wrapper = createWrapper();

    // 2 files in mockData: one in output_files, and file_reports appear in a separate section
    // wait, file-item class is used for output files. 
    // Reports share similar structure but are in .report-item (which also has .file-item class?)
    // Let's check specifically within output files section if possible, 
    // but the template uses "file-item" for outputs and "file-item report-item" for reports.
    
    const outputSection = wrapper.findAll(".section").filter(s => s.text().includes("Output Files"))[0];
    expect(outputSection.exists()).toBe(true);
    const outputFiles = outputSection.findAll(".file-item");
    expect(outputFiles.length).toBe(1);
    expect(outputFiles[0].text()).toContain("output.txt");
    expect(outputFiles[0].text()).toContain("1 KB"); // formatBytes check
  });

  it("renders metadata accurately", () => {
    const dataWithMeta = {
      ...mockData,
      result: JSON.stringify({
        command: "echo hello",
        meta: {
          sketch: "http://timesketch/1",
          other: "value",
        },
      }),
    };
    wrapper = createWrapper({ data: dataWithMeta });

    const metaSection = wrapper
      .findAll(".section")
      .filter((s) => s.text().includes("Metadata"))[0];
    expect(metaSection.exists()).toBe(true);

    const metaItems = metaSection.findAll(".config-item");
    expect(metaItems.length).toBe(2);

    // Check sketch link
    const sketchItem = metaItems.filter((i) => i.text().includes("sketch"))[0];
    expect(sketchItem.find("a").attributes("href")).toBe("http://timesketch/1");
    expect(sketchItem.find("a").text()).toBe("http://timesketch/1");

    // Check other meta
    const otherItem = metaItems.filter((i) => i.text().includes("other"))[0];
    expect(otherItem.text()).toContain("value");
  });

  it("handles error state rendering", () => {
     const errorData = {
        ...mockData,
        error_exception: "Something went wrong",
        error_traceback: "Stack trace here"
     };
     wrapper = createWrapper({ data: errorData });
     
     expect(wrapper.find(".error-text").text()).toBe("Something went wrong");
     expect(wrapper.find(".error-block").text()).toBe("Stack trace here");
     
     // Should NOT render normal sections like command or output files in error state (v-if / v-else)
     expect(wrapper.findAll(".section").length).toBe(2); // Only Exception and Traceback sections
     expect(wrapper.text()).not.toContain("Output Files");
  });

  it("emits close event", async () => {
    wrapper = createWrapper();
    await wrapper.find(".close-btn").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });
  
  describe("Computed Properties", () => {
     it("parses JSON result safely", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const data = { result: "invalid json" };
        wrapper = createWrapper({ data });
        expect(wrapper.vm.taskResult).toBeNull();
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
     });

     it("handles raw object result", () => {
        const data = { result: { command: "raw obj" } };
        wrapper = createWrapper({ data });
        expect(wrapper.vm.taskResult.command).toBe("raw obj");
     });
     
     it("formatted empty config", () => {
        const data = { task_config: null };
        wrapper = createWrapper({ data });
        expect(wrapper.vm.formattedConfig).toEqual([]);
     });
     
     it("status short fallback", () => {
        const data = { status_short: "RUNNING" };
        wrapper = createWrapper({ data });
        expect(wrapper.vm.status).toBe("RUNNING");
     });
  });

  describe("Methods", () => {
     it("formats bytes correctly", () => {
        wrapper = createWrapper();
        expect(wrapper.vm.formatBytes(0)).toBe("0 Bytes");
        expect(wrapper.vm.formatBytes(1024)).toBe("1 KB");
        expect(wrapper.vm.formatBytes(123456789)).toBe("117.74 MB");
     });

     it("generates correct download url", () => {
        wrapper = createWrapper();
        const url = wrapper.vm.getDownloadUrl("abc-123");
        expect(url).toBe("http://mock-api.com/api/v1/files/abc-123/download_stream");
     });
  });
});
