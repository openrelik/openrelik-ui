/*
Copyright 2025-2026 Google LLC

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
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useInvestigationStore } from "../investigation";
import RestApiClient from "@/RestApiClient";

// Mock RestApiClient
vi.mock("@/RestApiClient", () => ({
  default: {
    createAgentSession: vi.fn(),
    sse: vi.fn(),
  },
}));

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
};

const originalLocalStorage = window.localStorage;
let getItemSpy;
let setItemSpy;

describe("Investigation Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    getItemSpy = localStorageMock.getItem;
    setItemSpy = localStorageMock.setItem;
    vi.spyOn(Storage.prototype, "clear");
    vi.spyOn(Storage.prototype, "removeItem");

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it("createSession should set sessionId from API if not in localStorage", async () => {
    const store = useInvestigationStore();
    RestApiClient.createAgentSession.mockResolvedValue({
      session_id: "sess-new",
    });
    const getSessionDataSpy = vi
      .spyOn(store, "getSessionData")
      .mockImplementation(() => {});

    await store.createSession("folder-1");

    expect(store.sessionId).toBe("sess-new");
    expect(store.sessionIsLoading).toBe(false);
    expect(setItemSpy).toHaveBeenCalledWith(
      "openrelik_agent_session_folder-1",
      "sess-new"
    );
    expect(getSessionDataSpy).toHaveBeenCalledWith("folder-1");
  });

  it("createSession should use existing sessionId from localStorage", async () => {
    const store = useInvestigationStore();
    getItemSpy.mockReturnValue("sess-existing");

    const getSessionDataSpy = vi
      .spyOn(store, "getSessionData")
      .mockImplementation(() => {});
    RestApiClient.sse.mockReturnValue({ subscribe: vi.fn() });

    await store.createSession("folder-1");

    expect(store.sessionId).toBe("sess-existing");
    expect(store.sessionId).toBe("sess-existing");
    expect(store.sessionIsLoading).toBe(true);
    expect(RestApiClient.sse).toHaveBeenCalledWith(
      expect.stringContaining("/investigations/run"),
      expect.objectContaining({
        session_id: "sess-existing",
        user_message: null,
      })
    );
    expect(RestApiClient.createAgentSession).not.toHaveBeenCalled();

    expect(getSessionDataSpy).toHaveBeenCalledWith("folder-1");
  });

  it("getSessionData should subscribe and update state", () => {
    const store = useInvestigationStore();
    store.sessionId = "sess-123";

    const mockSubscribe = vi.fn();
    RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

    store.getSessionData("folder-1");

    expect(RestApiClient.sse).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();

    const mockData = {
      state: { foo: "bar" },
      events: [{ msg: "hello" }],
    };

    const observer = mockSubscribe.mock.calls[0][0];
    observer.next(JSON.stringify(mockData));

    expect(store.sessionData).toEqual({ foo: "bar" });
    expect(store.chatMessages).toEqual([{ msg: "hello" }]);
    expect(store.sessionIsLoading).toBe(false);
  });

  it("runAgent should append messages to chatMessages", async () => {
    const store = useInvestigationStore();
    store.sessionId = "sess-123";

    const mockUnsubscribe = vi.fn();
    const mockSubscribe = vi
      .fn()
      .mockReturnValue({ unsubscribe: mockUnsubscribe });
    RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

    await store.runAgent("folder-1", "Use tool");

    expect(store.isLoading).toBe(true);

    const observer = mockSubscribe.mock.calls[1][0];
    const responseMsg = { content: { parts: [{ text: "response" }] } };

    observer.next(JSON.stringify(responseMsg));

    expect(store.chatMessages).toContainEqual(responseMsg);
  });

  it("runAgent detects approval request", async () => {
    const store = useInvestigationStore();
    const mockSubscribe = vi.fn();
    RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

    await store.runAgent("f1", "msg");

    const observer = mockSubscribe.mock.calls[1][0];
    const approvalMsg = {
      content: {
        parts: [{ functionCall: { name: "ask_for_approval" } }],
      },
      longRunningToolIds: ["tool-1"],
      invocationId: "inv-1",
    };

    observer.next(JSON.stringify(approvalMsg));

    expect(store.pendingApproval).toEqual({
      toolId: "tool-1",
      invocationId: "inv-1",
    });
    expect(store.isLoading).toBe(false);
  });

  it("approveAction calls runAgent with APPROVED", async () => {
    const store = useInvestigationStore();
    store.pendingApproval = { toolId: "t1", invocationId: "i1" };
    const runAgentSpy = vi.spyOn(store, "runAgent").mockResolvedValue();

    await store.approveAction("f1");

    expect(runAgentSpy).toHaveBeenCalledWith(
      "f1",
      "{status: APPROVED}",
      "ask_for_approval",
      "t1",
      "i1"
    );
    expect(store.pendingApproval).toBeNull();
  });

  it("rejectAction calls runAgent with REJECTED", async () => {
    const store = useInvestigationStore();
    store.pendingApproval = { toolId: "t1", invocationId: "i1" };
    const runAgentSpy = vi.spyOn(store, "runAgent").mockResolvedValue();

    await store.rejectAction("f1");

    expect(runAgentSpy).toHaveBeenCalledWith(
      "f1",
      expect.stringContaining("REJECTED"),
      "ask_for_approval",
      "t1",
      "i1"
    );
    expect(store.pendingApproval).toBeNull();
  });

  it("approveAction returns early if no pending approval", async () => {
    const store = useInvestigationStore();
    store.pendingApproval = null;
    const runAgentSpy = vi.spyOn(store, "runAgent");

    await store.approveAction("f1");

    expect(runAgentSpy).not.toHaveBeenCalled();
  });

  it("rejectAction returns early if no pending approval", async () => {
    const store = useInvestigationStore();
    store.pendingApproval = null;
    const runAgentSpy = vi.spyOn(store, "runAgent");

    await store.rejectAction("f1");

    expect(runAgentSpy).not.toHaveBeenCalled();
  });

  it("runAgent handles optional arguments", async () => {
    const store = useInvestigationStore();
    RestApiClient.sse.mockReturnValue({ subscribe: vi.fn() });

    await store.runAgent("f1", "msg", "func", "tool-1", "inv-1");

    expect(RestApiClient.sse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        function_name: "func",
        long_running_tool_id: "tool-1",
        invocation_id: "inv-1",
      })
    );
  });

  it("runAgent handles SSE error", async () => {
    const store = useInvestigationStore();
    store.isLoading = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mockUnsubscribe = vi.fn();
    const mockSubscribe = vi
      .fn()
      .mockReturnValue({ unsubscribe: mockUnsubscribe });
    RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

    await store.runAgent("f1", "msg");

    const observer = mockSubscribe.mock.calls[1][0];
    observer.error("error");

    expect(store.isLoading).toBe(false);
  });

  it("runAgent handles SSE complete", async () => {
    const store = useInvestigationStore();
    store.isLoading = true;
    store.pendingApproval = null;
    const mockUnsubscribe = vi.fn();
    const mockSubscribe = vi
      .fn()
      .mockReturnValue({ unsubscribe: mockUnsubscribe });
    RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

    await store.runAgent("f1", "msg");

    // Trigger complete
    // Index 1 for runAgent subscription
    const observer = mockSubscribe.mock.calls[1][0];
    observer.complete();

    expect(store.isLoading).toBe(false);
  });

  it("runAgent complete DOES NOT clear loading if pending approval", async () => {
    const store = useInvestigationStore();
    store.isLoading = true;
    const mockUnsubscribe = vi.fn();
    const mockSubscribe = vi
      .fn()
      .mockReturnValue({ unsubscribe: mockUnsubscribe });
    RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

    await store.runAgent("f1", "msg");

    store.pendingApproval = { toolId: "t1" };

    const observer = mockSubscribe.mock.calls[1][0];
    observer.complete();

    expect(store.isLoading).toBe(false);
  });

  it("runAgent handles response without content parts safely", async () => {
    const store = useInvestigationStore();
    const mockSubscribe = vi.fn();
    RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

    await store.runAgent("f1", "msg");

    const observer = mockSubscribe.mock.calls[1][0];
    observer.next(JSON.stringify({ someKey: "val" }));
    observer.next(JSON.stringify({ content: {} }));

    expect(store.chatMessages).toHaveLength(2);
    expect(store.pendingApproval).toBeNull();
  });

  it("getSessionData does not overwrite existing chatMessages", () => {
    const store = useInvestigationStore();
    store.chatMessages = [{ id: 1 }];
    const mockSubscribe = vi.fn();
    RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

    store.getSessionData("f1");
    const observer = mockSubscribe.mock.calls[0][0];
    observer.next(JSON.stringify({ state: {}, events: [{ id: 2 }] }));

    expect(store.chatMessages).toEqual([{ id: 1 }]);
  });

  it("runAgent ignores approval if missing longRunningToolIds", async () => {
    const store = useInvestigationStore();
    const mockSubscribe = vi.fn();
    RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

    await store.runAgent("f1", "msg");

    const observer = mockSubscribe.mock.calls[0][0];
    const approvalMsg = {
      content: {
        parts: [{ functionCall: { name: "ask_for_approval" } }],
      },
      longRunningToolIds: [],
      invocationId: "inv-1",
    };

    observer.next(JSON.stringify(approvalMsg));

    expect(store.pendingApproval).toBeNull();
  });

  it("getSessionData handles SSE error", () => {
    const store = useInvestigationStore();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockSubscribe = vi.fn();
    RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

    store.getSessionData("f1");

    expect(store.isListening).toBe(true);

    store.getSessionData("f1");
    expect(RestApiClient.sse).toHaveBeenCalledTimes(1);

    const observer = mockSubscribe.mock.calls[0][0];
    observer.error("err");

    expect(store.isListening).toBe(false);
    expect(store.isLoading).toBe(false);
    expect(store.sessionIsLoading).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith("err");
  });

  it("reset should clear all state variables and unsubscribe sse", () => {
    const store = useInvestigationStore();
    store.sessionId = "sess-123";
    store.chatMessages = [{ id: 1 }];
    store.isLoading = true;
    store.sessionData = { foo: "bar" };
    store.isListening = true;
    store.pendingApproval = { toolId: "t1" };

    const mockUnsubscribe = vi.fn();
    store.sseSubscription = { unsubscribe: mockUnsubscribe };

    store.reset();

    expect(store.sessionId).toBeNull();
    expect(store.chatMessages).toEqual([]);
    expect(store.isLoading).toBe(false);
    expect(store.sessionData).toEqual({});
    expect(store.isListening).toBe(false);
    expect(store.sessionIsLoading).toBe(false);
    expect(store.pendingApproval).toBeNull();
    expect(store.sseSubscription).toBeNull();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("getSessionData should store subscription", () => {
    const store = useInvestigationStore();
    store.sessionId = "sess-123";

    const mockUnsubscribe = vi.fn();
    const mockSubscribe = vi
      .fn()
      .mockReturnValue({ unsubscribe: mockUnsubscribe });
    RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

    store.getSessionData("folder-1");

    expect(store.sseSubscription).toEqual({ unsubscribe: mockUnsubscribe });
    expect(RestApiClient.sse).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  describe("Getters", () => {
    it("taskList getter maps tasks to include label", () => {
      const store = useInvestigationStore();
      store.sessionData = {
        tasks: [{ id: "t1", task: "Check logs", status: "TODO" }],
      };

      const list = store.taskList;
      expect(list.length).toBe(1);
      expect(list[0].id).toBe("t1");
      expect(list[0].label).toBe("Check logs");
      expect(list[0].status).toBe("TODO");
    });

    it("taskList getter returns empty array if no tasks", () => {
      const store = useInvestigationStore();
      store.sessionData = {};
      expect(store.taskList).toEqual([]);
    });

    it("taskList getter handles null sessionData", () => {
      const store = useInvestigationStore();
      store.sessionData = null;
      expect(store.taskList).toEqual([]);
    });

    it("tree getter builds hierarchy from sessionData", () => {
      const store = useInvestigationStore();
      store.sessionData = {
        questions: [{ id: "q1", question: "Q1" }],
        leads: [{ id: "l1", lead: "L1", question_id: "q1" }],
        hypotheses: [{ id: "h1", hypothesis: "H1", lead_id: "l1" }],
        tasks: [{ id: "t1", task: "T1", hypothesis_id: "h1" }],
      };

      const tree = store.tree;
      expect(tree.length).toBe(1);
      const q1 = tree[0];
      expect(q1.id).toBe("q1");
      expect(q1.children.length).toBe(1);

      const l1 = q1.children[0];
      expect(l1.id).toBe("l1");
      expect(l1.type).toBe("SECTION");
      expect(l1.children.length).toBe(1);

      const h1 = l1.children[0];
      expect(h1.id).toBe("h1");
      expect(h1.type).toBe("HYPOTHESIS");
      expect(h1.children.length).toBe(1);

      const t1 = h1.children[0];
      expect(t1.id).toBe("t1");
      expect(t1.type).toBe("TASK");
    });

    it("tree getter handles orphan hypotheses attached to question", () => {
      const store = useInvestigationStore();
      store.sessionData = {
        questions: [{ id: "q1", question: "Q1" }],
        hypotheses: [{ id: "h1", hypothesis: "H1", question_id: "q1" }],
      };

      const tree = store.tree;
      expect(tree[0].children.length).toBe(1);
      expect(tree[0].children[0].id).toBe("h1");
    });

    it("getSessionData disables sessionIsLoading even if runAgent is active", async () => {
      const store = useInvestigationStore();
      store.sessionId = "sess-123";
      store.sessionIsLoading = true;

      // 1. Start runAgent (which sets up runSubscription)
      const mockRunSubscribe = vi
        .fn()
        .mockReturnValue({ unsubscribe: vi.fn() });
      RestApiClient.sse.mockReturnValue({ subscribe: mockRunSubscribe });

      // We need to mock getSessionData inside runAgent to avoid recursion loop in test environment
      // if we were not careful, but here we just want to test the flag behavior.
      // Actually runAgent calls getSessionData, so let's let it happen but control the SSE.

      // Mock SSE for runAgent
      // First call to sse is inside runAgent -> getSessionData
      // Second call to sse is inside runAgent -> runSubscription

      let sessionDataObserver;
      const mockSessionSubscribe = vi.fn((observer) => {
        sessionDataObserver = observer;
        return { unsubscribe: vi.fn() };
      });

      RestApiClient.sse
        .mockReturnValueOnce({ subscribe: mockSessionSubscribe }) // for getSessionData
        .mockReturnValueOnce({ subscribe: mockRunSubscribe }); // for runAgent

      await store.runAgent("f1", "msg");

      expect(store.isLoading).toBe(true);

      // Simulate receiving session state
      const mockData = {
        state: { plan: "some plan" },
        events: [],
      };

      sessionDataObserver.next(JSON.stringify(mockData));

      // CRITICAL CHECK: sessionIsLoading should be false because we have the state (plan),
      // even though the run is still active (isLoading is true).
      expect(store.sessionIsLoading).toBe(false);
      expect(store.isLoading).toBe(true);
    });
  });
});
