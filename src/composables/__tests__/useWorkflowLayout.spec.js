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
import { useWorkflowLayout } from "../useWorkflowLayout";
import { createPinia, setActivePinia } from "pinia";
import { useWorkflowStore } from "@/stores/workflow";
import { computeWorkflowLayout } from "@/utils/workflowLayoutUtils";

vi.mock("@/stores/workflow", () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock("@/utils/workflowLayoutUtils", () => ({
  computeWorkflowLayout: vi.fn(),
}));

describe("useWorkflowLayout", () => {
  let mockStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockStore = {
      clearWorkflow: vi.fn(),
      addInputNode: vi.fn(),
      updateWorkflowData: vi.fn(),
      nodes: [],
      edges: [],
      nextId: 1,
    };
    useWorkflowStore.mockReturnValue(mockStore);
    vi.clearAllMocks();
  });

  it("should compute layout and update store", () => {
    const mockNodes = [{ id: "n1", y: 0 }];
    const mockEdges = [{ from: "i", to: "n1" }];
    computeWorkflowLayout.mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      nextId: 10,
      rootHeight: 0,
    });

    const { layout } = useWorkflowLayout();
    layout({ tasks: [] });

    expect(mockStore.nodes).toEqual(mockNodes);
    expect(mockStore.edges).toEqual(mockEdges);
    expect(mockStore.nextId).toBe(10);
  });

  it("should center input node if rootHeight > 0", () => {
    const mockNodes = [
      { id: "node-1", y: 300 },
      { id: "n2", y: 100 }
    ];
    computeWorkflowLayout.mockReturnValue({
      nodes: mockNodes,
      edges: [],
      nextId: 3,
      rootHeight: 200,
    });

    const { layout } = useWorkflowLayout();
    layout({ tasks: [] });

    expect(mockNodes[0].y).toBe(360);
  });

  it("should not center input node if centerInputNode is false", () => {
    const mockNodes = [
      { id: "node-1", y: 300 }
    ];
    computeWorkflowLayout.mockReturnValue({
      nodes: mockNodes,
      edges: [],
      nextId: 2,
      rootHeight: 200,
    });

    const { layout } = useWorkflowLayout();
    layout({ tasks: [] }, null, false);

    expect(mockNodes[0].y).toBe(300);
  });
});
