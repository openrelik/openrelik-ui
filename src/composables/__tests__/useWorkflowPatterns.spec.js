import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorkflowPatterns } from "../useWorkflowPatterns";
import { createPinia, setActivePinia } from "pinia";
import { useWorkflowStore } from "@/stores/workflow";
import { 
  generateChainTemplate, 
  generateGroupTemplate, 
  generateChordTemplate,
  generateGroupCallback 
} from "@/utils/workflowPatternUtils";

vi.mock("@/stores/workflow", () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock("@/utils/workflowPatternUtils", () => ({
  generateChainTemplate: vi.fn(),
  generateGroupTemplate: vi.fn(),
  generateChordTemplate: vi.fn(),
  generateGroupCallback: vi.fn(),
}));

describe("useWorkflowPatterns", () => {
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

  it("should apply chain template", () => {
    generateChainTemplate.mockReturnValue({
      nodes: [{ id: "n1" }],
      edges: [{ from: "i", to: "n1" }],
      nextId: 5,
    });

    const { createChain } = useWorkflowPatterns();
    createChain(3);

    expect(mockStore.clearWorkflow).toHaveBeenCalled();
    expect(mockStore.addInputNode).toHaveBeenCalled();
    expect(mockStore.nodes).toContainEqual({ id: "n1" });
    expect(mockStore.nextId).toBe(5);
    expect(mockStore.updateWorkflowData).toHaveBeenCalled();
  });

  it("should create group", () => {
    generateGroupTemplate.mockReturnValue({
      nodes: [{ id: "p1" }],
      edges: [],
      nextId: 2,
    });
    const { createGroup } = useWorkflowPatterns();
    createGroup();
    expect(generateGroupTemplate).toHaveBeenCalled();
  });

  it("should create chord", () => {
    generateChordTemplate.mockReturnValue({
      nodes: [{ id: "t1" }],
      edges: [],
      nextId: 2,
    });
    const { createChord } = useWorkflowPatterns();
    createChord();
    expect(generateChordTemplate).toHaveBeenCalled();
  });

  it("should add callback to group", () => {
    mockStore.nodes = [{ id: "n1", groupId: "g1" }];
    generateGroupCallback.mockReturnValue({
      node: { id: "cb1" },
      edges: [{ from: "n1", to: "cb1" }],
      nextId: 10,
    });

    const { addCallbackToGroup } = useWorkflowPatterns();
    addCallbackToGroup("g1");

    expect(mockStore.nodes).toContainEqual({ id: "cb1" });
    expect(mockStore.edges).toContainEqual({ from: "n1", to: "cb1" });
    expect(mockStore.nextId).toBe(10);
  });

  it("should return early if group not found", () => {
    mockStore.nodes = [];
    const { addCallbackToGroup } = useWorkflowPatterns();
    addCallbackToGroup("missing");
    expect(generateGroupCallback).not.toHaveBeenCalled();
  });
});
