import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useWorkflowPolling } from "../useWorkflowPolling";
import { ref, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useWorkflowStore } from "@/stores/workflow";

// Mock the store
vi.mock("@/stores/workflow", () => ({
  useWorkflowStore: vi.fn(),
}));

function withSetup(composable) {
  let result;
  const app = mount({
    setup() {
      result = composable();
      return () => {};
    },
  });
  return [result, app];
}

describe("useWorkflowPolling", () => {
  let mockStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockStore = {
      loadWorkflowData: vi.fn(),
    };
    useWorkflowStore.mockReturnValue(mockStore);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should start polling if isActive is true initially", () => {
    const folderId = ref("f1");
    const workflowId = ref("w1");
    const isActive = ref(true);

    withSetup(() => useWorkflowPolling({ folderId, workflowId, isActive }));

    vi.advanceTimersByTime(3000);
    expect(mockStore.loadWorkflowData).toHaveBeenCalledWith("f1", "w1", true);
  });

  it("should not start polling if isActive is false initially", () => {
    const folderId = ref("f1");
    const workflowId = ref("w1");
    const isActive = ref(false);

    withSetup(() => useWorkflowPolling({ folderId, workflowId, isActive }));

    vi.advanceTimersByTime(3000);
    expect(mockStore.loadWorkflowData).not.toHaveBeenCalled();
  });

  it("should start and stop polling when isActive changes", async () => {
    const folderId = ref("f1");
    const workflowId = ref("w1");
    const isActive = ref(false);

    const [result] = withSetup(() => useWorkflowPolling({ folderId, workflowId, isActive }));
    const { isPolling } = result;

    expect(isPolling.value).toBe(false);

    isActive.value = true;
    await nextTick();
    expect(isPolling.value).toBe(true);

    vi.advanceTimersByTime(3000);
    expect(mockStore.loadWorkflowData).toHaveBeenCalledTimes(1);

    isActive.value = false;
    await nextTick();
    expect(isPolling.value).toBe(false);

    vi.advanceTimersByTime(3000);
    expect(mockStore.loadWorkflowData).toHaveBeenCalledTimes(1); // No new calls
  });

  it("should stop polling on unmount", () => {
    const folderId = ref("f1");
    const workflowId = ref("w1");
    const isActive = ref(true);
    const clearSpy = vi.spyOn(global, "clearInterval");

    const [result, app] = withSetup(() => useWorkflowPolling({ folderId, workflowId, isActive }));
    
    // Polling should have started (setInterval called)
    // Now unmount to trigger onBeforeUnmount
    app.unmount();
    
    expect(clearSpy).toHaveBeenCalled();
  });

  it("should not call loadWorkflowData if ids are missing", () => {
    const folderId = ref(null);
    const workflowId = ref(null);
    const isActive = ref(true);

    withSetup(() => useWorkflowPolling({ folderId, workflowId, isActive }));

    vi.advanceTimersByTime(3000);
    expect(mockStore.loadWorkflowData).not.toHaveBeenCalled();
  });
});
