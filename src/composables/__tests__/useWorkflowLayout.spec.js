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

    // 300 + 200/2 - 40 = 300 + 100 - 40 = 350
    expect(mockNodes[0].y).toBe(350);
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
