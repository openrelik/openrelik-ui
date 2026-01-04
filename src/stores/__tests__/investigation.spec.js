import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInvestigationStore } from '../investigation';
import RestApiClient from '@/RestApiClient';

// Mock RestApiClient
vi.mock('@/RestApiClient', () => ({
    default: {
        createAgentSession: vi.fn(),
        sse: vi.fn(),
    },
}));

// Mock localStorage using spies on the Storage prototype
// Mock localStorage using safe swap
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn(),
    removeItem: vi.fn(),
};

const originalLocalStorage = window.localStorage;
let getItemSpy;
let setItemSpy;
let clearSpy;
let removeItemSpy;

describe('Investigation Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        
        // Assign spies to variables for test usage
        getItemSpy = localStorageMock.getItem;
        setItemSpy = localStorageMock.setItem;
        clearSpy = localStorageMock.clear;
        removeItemSpy = localStorageMock.removeItem;
        
        // Swap global localStorage
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
            configurable: true 
        });
    });

    afterEach(() => {
        // Restore original
        Object.defineProperty(window, 'localStorage', {
            value: originalLocalStorage,
            writable: true,
            configurable: true
        });
    });

    // Actions
    it('createSession should set sessionId from API if not in localStorage', async () => {
        const store = useInvestigationStore();
        RestApiClient.createAgentSession.mockResolvedValue({ session_id: 'sess-new' });
        // Mock getSessionData to avoid side effects
        const getSessionDataSpy = vi.spyOn(store, 'getSessionData').mockImplementation(() => {});

        await store.createSession('folder-1');
        
        expect(store.sessionId).toBe('sess-new');
        expect(setItemSpy).toHaveBeenCalledWith('openrelik_agent_session_folder-1', 'sess-new');
        expect(getSessionDataSpy).toHaveBeenCalledWith('folder-1');
    });

    it('createSession should use existing sessionId from localStorage', async () => {
        const store = useInvestigationStore();
        // Setup existing session in our mock store
        getItemSpy.mockReturnValue('sess-existing');
        
        const getSessionDataSpy = vi.spyOn(store, 'getSessionData').mockImplementation(() => {});

        await store.createSession('folder-1');

        expect(store.sessionId).toBe('sess-existing');
        expect(RestApiClient.createAgentSession).not.toHaveBeenCalled();
        expect(getSessionDataSpy).toHaveBeenCalledWith('folder-1');
    });

    it('getSessionData should subscribe and update state', () => {
        const store = useInvestigationStore();
        store.sessionId = 'sess-123';
        
        const mockSubscribe = vi.fn();
        RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

        store.getSessionData('folder-1');

        expect(RestApiClient.sse).toHaveBeenCalled();
        expect(mockSubscribe).toHaveBeenCalled();

        // Simulate SSE update
        const observer = mockSubscribe.mock.calls[0][0];
        const mockData = { 
            state: { foo: 'bar' },
            events: [{ msg: 'hello' }] 
        };
        
        // Next expects stringified data per component logic
        observer.next(JSON.stringify(mockData));

        expect(store.sessionData).toEqual({ foo: 'bar' });
        expect(store.chatMessages).toEqual([{ msg: 'hello' }]);
    });
    
    it('runAgent should append messages to chatMessages', async () => {
        const store = useInvestigationStore();
        store.sessionId = 'sess-123';
        
        const mockSubscribe = vi.fn();
        RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });
        
        await store.runAgent('folder-1', 'Use tool');
        
        expect(store.isLoading).toBe(true);
        
        const observer = mockSubscribe.mock.calls[0][0];
        const responseMsg = { content: { parts: [{ text: 'response' }] } };
        
        observer.next(JSON.stringify(responseMsg));
        
        expect(store.chatMessages).toContainEqual(responseMsg);
    });
    
    it('runAgent detects approval request', async () => {
        const store = useInvestigationStore();
        const mockSubscribe = vi.fn();
        RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });
        
        await store.runAgent('f1', 'msg');
        
        const observer = mockSubscribe.mock.calls[0][0];
        const approvalMsg = {
            content: {
                parts: [{ functionCall: { name: 'ask_for_approval' } }]
            },
            longRunningToolIds: ['tool-1'],
            invocationId: 'inv-1'
        };
        
        observer.next(JSON.stringify(approvalMsg));
        
        expect(store.pendingApproval).toEqual({ toolId: 'tool-1', invocationId: 'inv-1' });
        expect(store.isLoading).toBe(false);
    });
    
    it('approveAction calls runAgent with APPROVED', async () => {
        const store = useInvestigationStore();
        store.pendingApproval = { toolId: 't1', invocationId: 'i1' };
        const runAgentSpy = vi.spyOn(store, 'runAgent').mockResolvedValue();
        
        await store.approveAction('f1');
        
        expect(runAgentSpy).toHaveBeenCalledWith(
            'f1', 
            "{status: APPROVED}", 
            "ask_for_approval", 
            't1', 
            'i1'
        );
        expect(store.pendingApproval).toBeNull();
    });

    it('rejectAction calls runAgent with REJECTED', async () => {
        const store = useInvestigationStore();
        store.pendingApproval = { toolId: 't1', invocationId: 'i1' };
        const runAgentSpy = vi.spyOn(store, 'runAgent').mockResolvedValue();
        
        await store.rejectAction('f1');
        
        expect(runAgentSpy).toHaveBeenCalledWith(
            'f1', 
            expect.stringContaining("REJECTED"), 
            "ask_for_approval", 
            't1', 
            'i1'
        );
        expect(store.pendingApproval).toBeNull();
    });

    it('approveAction returns early if no pending approval', async () => {
        const store = useInvestigationStore();
        store.pendingApproval = null;
        const runAgentSpy = vi.spyOn(store, 'runAgent');
        
        await store.approveAction('f1');
        
        expect(runAgentSpy).not.toHaveBeenCalled();
    });

    it('rejectAction returns early if no pending approval', async () => {
        const store = useInvestigationStore();
        store.pendingApproval = null;
        const runAgentSpy = vi.spyOn(store, 'runAgent');
        
        await store.rejectAction('f1');
        
        expect(runAgentSpy).not.toHaveBeenCalled();
    });

    it('runAgent handles optional arguments', async () => {
        const store = useInvestigationStore();
        RestApiClient.sse.mockReturnValue({ subscribe: vi.fn() });
        
        await store.runAgent('f1', 'msg', 'func', 'tool-1', 'inv-1');
        
        expect(RestApiClient.sse).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                function_name: 'func',
                long_running_tool_id: 'tool-1',
                invocation_id: 'inv-1'
            })
        );
    });

    it('runAgent handles SSE error', async () => {
        const store = useInvestigationStore();
        store.isLoading = true;
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const mockSubscribe = vi.fn();
        RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });
        
        await store.runAgent('f1', 'msg');
        
        // Trigger error
        const observer = mockSubscribe.mock.calls[0][0];
        observer.error('error');
        
        expect(store.isLoading).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('error');
    });

    it('runAgent handles SSE complete', async () => {
        const store = useInvestigationStore();
        store.isLoading = true;
        store.pendingApproval = null;
        const mockSubscribe = vi.fn();
        RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });
        
        await store.runAgent('f1', 'msg');
        
        // Trigger complete
        const observer = mockSubscribe.mock.calls[0][0];
        observer.complete();
        
        expect(store.isLoading).toBe(false);
    });

    it('runAgent complete DOES NOT clear loading if pending approval', async () => {
        const store = useInvestigationStore();
        store.isLoading = true;
        const mockSubscribe = vi.fn();
        RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });
        
        await store.runAgent('f1', 'msg');
        
        // Simulate setting pending approval (logic inside next usually does this)
        store.pendingApproval = { toolId: 't1' };
        
        // Trigger complete
        const observer = mockSubscribe.mock.calls[0][0];
        observer.complete();
        
        expect(store.isLoading).toBe(true);
    });

    it('runAgent handles response without content parts safely', async () => {
        const store = useInvestigationStore();
        const mockSubscribe = vi.fn();
        RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });
        
        await store.runAgent('f1', 'msg');
        
        const observer = mockSubscribe.mock.calls[0][0];
        // Message with no content or parts
        observer.next(JSON.stringify({ someKey: 'val' }));
        observer.next(JSON.stringify({ content: {} })); // no parts
        
        expect(store.chatMessages).toHaveLength(2);
        expect(store.pendingApproval).toBeNull();
    });

    it('getSessionData does not overwrite existing chatMessages', () => {
        const store = useInvestigationStore();
        store.chatMessages = [{ id: 1 }];
        const mockSubscribe = vi.fn();
        RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });
        
        store.getSessionData('f1');
        const observer = mockSubscribe.mock.calls[0][0];
        observer.next(JSON.stringify({ state: {}, events: [{ id: 2 }] }));
        
        expect(store.chatMessages).toEqual([{ id: 1 }]); // Should NOT be replaced
    });

    it('runAgent ignores approval if missing longRunningToolIds', async () => {
        const store = useInvestigationStore();
        const mockSubscribe = vi.fn();
        RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });
        
        await store.runAgent('f1', 'msg');
        
        const observer = mockSubscribe.mock.calls[0][0];
        const approvalMsg = {
            content: {
                parts: [{ functionCall: { name: 'ask_for_approval' } }]
            },
            longRunningToolIds: [], // Empty
            invocationId: 'inv-1'
        };
        
        observer.next(JSON.stringify(approvalMsg));
        
        expect(store.pendingApproval).toBeNull();
    });

    it('getSessionData handles SSE error', () => {
        const store = useInvestigationStore();
        // Do not set isListening=true initially, otherwise it returns early
        
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const mockSubscribe = vi.fn();
        RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });
        
        store.getSessionData('f1');
        
        expect(store.isListening).toBe(true);
        
        // Call again, should return early
        store.getSessionData('f1');
        // We can't easily assert "returns early", but we can assert we didn't subscribe again
        // mockSubscribe is created inside the mock sse call.
        // If sse was called again, mockSubscribe would need to be checked or RestApiClient.sse call count.
        expect(RestApiClient.sse).toHaveBeenCalledTimes(1);

        const observer = mockSubscribe.mock.calls[0][0];
        observer.error('err');
        
        expect(store.isListening).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('err');
    });

    // Getters
    describe('Getters', () => {
        it('graph getter constructs graph from sessionData', () => {
            const store = useInvestigationStore();
            store.sessionData = {
                questions: [{ id: 'q1', question: 'Why?' }],
                leads: [{ id: 'l1', lead: 'Lead', question_id: 'q1' }],
                hypotheses: [{ id: 'h1', hypothesis: 'Maybe', lead_id: 'l1' }],
                tasks: [{ id: 't1', task: 'Check', hypothesis_id: 'h1' }]
            };
            
            const graph = store.graph;
            expect(graph.nodes.size).toBe(4);
            expect(graph.nodes.get('q1').type).toBe('QUESTION');
            expect(graph.nodes.get('l1').type).toBe('SECTION');
            expect(graph.nodes.get('h1').type).toBe('HYPOTHESIS');
            expect(graph.nodes.get('t1').type).toBe('TASK');
            
            // Check edges
            // Graph implementation: addEdge(source, target)
            // q1 -> l1
            expect(graph.getParents('l1').map(p=>p.id)).toContain('q1');
            expect(graph.getParents('h1').map(p=>p.id)).toContain('l1');
            expect(graph.getParents('t1').map(p=>p.id)).toContain('h1');
        });

        it('tree getter returns forest', () => {
            const store = useInvestigationStore();
            store.sessionData = {
                questions: [{ id: 'q1', question: 'Q1' }],
                leads: [{ id: 'l1', lead: 'L1', question_id: 'q1' }]
            };
            
            const tree = store.tree;
            // Tree structure: Array/Map of roots depending on implementation. 
            // graph.toTree() returns array of root nodes with children populated.
            expect(tree.length).toBe(1);
            expect(tree[0].id).toBe('q1');
            expect(tree[0].children.length).toBe(1);
            expect(tree[0].children[0].id).toBe('l1');
        });
        
        it('taskList getter maps tasks to context', () => {
            const store = useInvestigationStore();
            store.sessionData = {
                questions: [{ id: 'q1', question: 'Q' }],
                leads: [{ id: 'l1', question_id: 'q1' }],
                hypotheses: [{ id: 'h1', lead_id: 'l1' }],
                tasks: [{ id: 't1', task: 'T', hypothesis_id: 'h1' }]
            };
            
            const list = store.taskList;
            expect(list.length).toBe(1);
            expect(list[0].id).toBe('t1');
            expect(list[0].hypothesis.id).toBe('h1');
            expect(list[0].lead.id).toBe('l1');
            expect(list[0].question.id).toBe('q1');
        });

        it('taskList handles orphan hypotheses (no lead)', () => {
            const store = useInvestigationStore();
             store.sessionData = {
                questions: [{ id: 'q1' }],
                hypotheses: [{ id: 'h1', question_id: 'q1' }], // Directly under question
                tasks: [{ id: 't1', hypothesis_id: 'h1' }]
            };
            
            const list = store.taskList;
            expect(list[0].lead).toBeUndefined(); // or null? Implementation line 88: let lead = null;
            expect(list[0].question.id).toBe('q1');
        });

        it('taskList handles orphan tasks (no hypothesis)', () => {
            const store = useInvestigationStore();
            store.sessionData = {
                tasks: [{ id: 't1', task: 'T' }] // Orphan task
            };
            const list = store.taskList;
            expect(list.length).toBe(1);
            expect(list[0].id).toBe('t1');
            expect(list[0].hypothesis).toBeUndefined();
            expect(list[0].lead).toBeNull();
            expect(list[0].question).toBeNull();
        });

        it('graph getter handles partial data and orphans', () => {
            const store = useInvestigationStore();
            store.sessionData = {
                // specific keys missing
                questions: [{ id: 'q1', question: 'Q' }],
                // leads missing
                hypotheses: [{ id: 'h1', hypothesis: 'H' }], // Orphan, no parent links
                tasks: [{ id: 't1', task: 'T' }] // Orphan task
            };
            
            const graph = store.graph;
            expect(graph.nodes.size).toBe(3);
            expect(graph.nodes.get('h1')).toBeDefined();
            // Verify no edges created for orphans
            expect(graph.getParents('h1')).toEqual([]);
            expect(graph.getParents('t1')).toEqual([]);
        });

        it('graph getter handles leads without question_id', () => {
            const store = useInvestigationStore();
            store.sessionData = {
                leads: [{ id: 'l1', lead: 'L' }] // No question_id
            };
            const graph = store.graph;
            expect(graph.nodes.has('l1')).toBe(true);
            expect(graph.getParents('l1')).toEqual([]);
        });

        it('graph getter handles null sessionData', () => {
            const store = useInvestigationStore();
            store.sessionData = null; // Enforce null
            
            const graph = store.graph;
            expect(graph).toBeDefined();
            expect(graph.nodes.size).toBe(0);
        });

        it('taskList getter returns empty if graph is missing (edge case)', () => {
            const store = useInvestigationStore();
            // Force graph getter to return null? 
            // Better: rely on state. It's a derived getter.
            // If sessionData is empty, graph is empty, taskList is empty.
            // If we want to hit `if (!graph) return []`, we mocked graph?
            // "graph" is a getter on the store. 
            // We can try to spy on the getter if possible or just rely on standard path.
            // Standard path always returns a graph instance (line 34: const graph = new Graph();).
            // So `if (!graph)` might be dead code unless graph instantiation fails or is mocked.
            // However, we can verify empty task list for empty graph.
            store.sessionData = {};
            expect(store.taskList).toEqual([]);
        });
    });
});
