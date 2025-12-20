
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWorkflowStore } from '../workflow';
import { useAppStore } from '../app';
import RestApiClient from '@/RestApiClient';

// Mock App Store
vi.mock('../app', () => ({
    useAppStore: vi.fn(),
}));

// Mock RestApiClient
vi.mock('@/RestApiClient', () => ({
    default: {
        runWorkflow: vi.fn(),
        getWorkflow: vi.fn(),
        updateWorkflow: vi.fn(),
        createWorkflowTemplate: vi.fn(),
        copyWorkflow: vi.fn(),
    },
}));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
    randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substring(7),
});

describe('Workflow Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    const chordInputJson = {
        tasks: [
            {
                uuid: 'root-1',
                type: 'task',
                tasks: [
                    {
                        type: 'chord',
                        tasks: [
                            { uuid: 'branch-a', type: 'task' },
                            { uuid: 'branch-b', type: 'task' },
                        ],
                        callback: {
                            uuid: 'cb-1',
                            type: 'task',
                            tasks: [{ uuid: 'final-1', type: 'task' }],
                        },
                    },
                ],
            },
        ],
    };

    it('layoutWorkflow should correctly parse chord structure into nodes and edges', () => {
        const store = useWorkflowStore();
        store.addInputNode();
        store.layoutWorkflow(chordInputJson);

        // Verify Nodes
        const nodeIds = store.nodes.map((n) => n.id);
        expect(nodeIds).toContain('root-1');
        expect(nodeIds).toContain('branch-a');
        expect(nodeIds).toContain('branch-b');
        expect(nodeIds).toContain('cb-1');
        expect(nodeIds).toContain('final-1');

        // Verify Edges
        const edges = store.edges.map((e) => `${e.from}->${e.to}`);
        // Root -> Branches
        expect(edges).toContain('root-1->branch-a');
        expect(edges).toContain('root-1->branch-b');
        // Branches -> Callback
        expect(edges).toContain('branch-a->cb-1');
        expect(edges).toContain('branch-b->cb-1');
        // Callback -> Final
        expect(edges).toContain('cb-1->final-1');
    });

    it('specJson should correctly serialize nodes and edges back into chord structure', () => {
        const store = useWorkflowStore();
        // Manually construct the graph to ensure we test serialization independently of layout
        store.nodes = [
            { id: 'node-1', x: 0, y: 0, type: 'Input', data: {} },
            { id: 'root-1', x: 200, y: 0, type: 'Task', data: { uuid: 'root-1' } },
            { id: 'branch-a', x: 400, y: -100, type: 'Task', data: { uuid: 'branch-a' } },
            { id: 'branch-b', x: 400, y: 100, type: 'Task', data: { uuid: 'branch-b' } },
            { id: 'cb-1', x: 600, y: 0, type: 'Task', data: { uuid: 'cb-1' } },
            { id: 'final-1', x: 800, y: 0, type: 'Task', data: { uuid: 'final-1' } },
        ];
        store.edges = [
            { from: 'node-1', to: 'root-1' },
            { from: 'root-1', to: 'branch-a' },
            { from: 'root-1', to: 'branch-b' },
            { from: 'branch-a', to: 'cb-1' },
            { from: 'branch-b', to: 'cb-1' },
            { from: 'cb-1', to: 'final-1' },
        ];

        const json = JSON.parse(store.specJson);
        const workflowTasks = json.workflow.tasks;

        // Structure should be:
        // root-1 -> [ { type: 'chord', tasks: [...], callback: ... } ]

        expect(workflowTasks[0].uuid).toBe('root-1');

        // The next item in root-1's tasks should be the chord
        const chordItem = workflowTasks[0].tasks[0];
        expect(chordItem.type).toBe('chord');
        expect(chordItem.tasks).toHaveLength(2);
        expect(chordItem.callback).toBeDefined();
        expect(chordItem.callback.uuid).toBe('cb-1');

        // Verify branches
        const branchUuids = chordItem.tasks.map(t => t.uuid).sort();
        expect(branchUuids).toEqual(['branch-a', 'branch-b']);

        // Verify callback's children
        expect(chordItem.callback.tasks[0].uuid).toBe('final-1');
    });

    describe('Getters', () => {
        it('hasActiveTasks should return true if any task is active', () => {
            const store = useWorkflowStore();
            store.workflow = {
                tasks: [
                    { status_short: 'SUCCESS' },
                    { status_short: 'STARTED' }
                ]
            };
            expect(store.hasActiveTasks).toBe(true);
        });

        it('hasActiveTasks should return false if no tasks are active', () => {
            const store = useWorkflowStore();
            store.workflow = {
                tasks: [
                    { status_short: 'SUCCESS' },
                    { status_short: 'FAILURE' }
                ]
            };
            expect(store.hasActiveTasks).toBe(false);
        });

        it('hasActiveTasks should return false if no workflow set', () => {
            const store = useWorkflowStore();
            store.workflow = null;
            expect(store.hasActiveTasks).toBe(false);
        });

        it('hasActiveTasks should return false if workflow tasks is missing', () => {
            const store = useWorkflowStore();
            store.workflow = {};
            expect(store.hasActiveTasks).toBe(false);
        });
    });

    describe('Basic Actions', () => {
        it('addNode should add a node and increment nextId', () => {
            const store = useWorkflowStore();
            const id = store.addNode(100, 200, 'Test Task');
            expect(id).toBe('node-1');
            expect(store.nextId).toBe(2);
            expect(store.nodes).toHaveLength(1);
            expect(store.nodes[0]).toMatchObject({
                id: 'node-1',
                x: 100,
                y: 200,
                label: 'Test Task'
            });
        });

        it('addNode should append index for generic labels', () => {
            const store = useWorkflowStore();
            store.addNode(100, 100, 'Worker');
            expect(store.nodes[0].label).toBe('Worker 1');
            store.addNode(100, 100, 'Chain');
            expect(store.nodes[1].label).toBe('Chain 2');
        });

        it('addNode should NOT append index for custom labels', () => {
            const store = useWorkflowStore();
            const label = 'My Custom Task';
            store.addNode(100, 100, label);
            expect(store.nodes[0].label).toBe(label);
        });

        it('addEdge should add an edge', () => {
            const store = useWorkflowStore();
            store.addEdge('node-1', 'node-2');
            expect(store.edges).toHaveLength(1);
            expect(store.edges[0]).toEqual({
                id: 'edge-node-1-node-2',
                from: 'node-1',
                to: 'node-2'
            });
        });

        it('clearWorkflow should reset state', () => {
            const store = useWorkflowStore();
            store.addNode(100, 100);
            store.addEdge('node-1', 'node-2');
            store.clearWorkflow();
            expect(store.nodes).toHaveLength(0);
            expect(store.edges).toHaveLength(0);
            expect(store.nextId).toBe(1);
        });

        it('removeNode should handle diamond-shaped graphs in BFS', () => {
            const store = useWorkflowStore();
            // A -> B, A -> C, B -> D, C -> D
            store.nodes = [
                { id: 'A', x: 0, y: 0 },
                { id: 'B', x: 200, y: 0 },
                { id: 'C', x: 200, y: 200 },
                { id: 'D', x: 400, y: 100 }
            ];
            store.edges = [
                { from: 'A', to: 'B' },
                { from: 'A', to: 'C' },
                { from: 'B', to: 'D' },
                { from: 'C', to: 'D' }
            ];
            store.removeNode('A');
            expect(store.nodes).toHaveLength(0);
        });

        it('addInputNode should add the static input node', () => {
            const store = useWorkflowStore();
            store.addInputNode();
            expect(store.nodes).toHaveLength(1);
            expect(store.nodes[0].id).toBe('node-1');
            expect(store.nodes[0].type).toBe('Input');
            expect(store.nextId).toBe(2);
        });

        it('addInputNode should NOT add duplicate node-1', () => {
            const store = useWorkflowStore();
            store.addInputNode();
            store.addInputNode();
            expect(store.nodes).toHaveLength(1);
        });
    });

    describe('Node Manipulation', () => {
        it('updateNodePosition should update position and trigger save', () => {
            const store = useWorkflowStore();
            const id = store.addNode(100, 100);
            const saveSpy = vi.spyOn(store, 'triggerDebouncedSave').mockImplementation(() => {});
            
            store.updateNodePosition(id, 300, 400);
            
            expect(store.nodes[0].x).toBe(300);
            expect(store.nodes[0].y).toBe(400);
            expect(saveSpy).toHaveBeenCalled();
        });

        it('updateNodePosition should do nothing if node not found', () => {
            const store = useWorkflowStore();
            const saveSpy = vi.spyOn(store, 'triggerDebouncedSave').mockImplementation(() => {});
            store.updateNodePosition('non-existent', 100, 100);
            expect(saveSpy).not.toHaveBeenCalled();
        });

        it('moveGroup should shift all nodes in a group', () => {
            const store = useWorkflowStore();
            store.nodes = [
                { id: 'n1', x: 100, y: 100, groupId: 'g1' },
                { id: 'n2', x: 200, y: 200, groupId: 'g1' },
                { id: 'n3', x: 500, y: 500, groupId: 'g2' }
            ];
            
            store.moveGroup('g1', 50, -50);
            
            expect(store.nodes[0]).toMatchObject({ x: 150, y: 50 });
            expect(store.nodes[1]).toMatchObject({ x: 250, y: 150 });
            expect(store.nodes[2]).toMatchObject({ x: 500, y: 500 });
        });

        it('removeNode should remove node and its descendants', () => {
            const store = useWorkflowStore();
            // n1 -> n2 -> n3
            store.nodes = [
                { id: 'node-1', type: 'Input' },
                { id: 'n2' },
                { id: 'n3' },
                { id: 'n4' }
            ];
            store.edges = [
                { from: 'node-1', to: 'n2' },
                { from: 'n2', to: 'n3' }
            ];
            
            store.removeNode('n2');
            
            // Should remove n2 and n3
            expect(store.nodes.map(n => n.id)).toEqual(['node-1', 'n4']);
            expect(store.edges).toHaveLength(0);
        });

        it('removeNode should repack group correctly', () => {
            const store = useWorkflowStore();
            store.nodes = [
                { id: 'n1', y: 100, groupId: 'g1' },
                { id: 'n2', y: 220, groupId: 'g1' },
                { id: 'n3', y: 340, groupId: 'g1' }
            ];
            
            store.removeNode('n2');
            
            // n3 should shift up by 120
            const n3 = store.nodes.find(n => n.id === 'n3');
            expect(n3.y).toBe(340 - 120);
        });

        it('removeNode should return early if node not found', () => {
            const store = useWorkflowStore();
            store.nodes = [{ id: 'n1' }];
            store.removeNode('non-existent');
            expect(store.nodes).toHaveLength(1);
        });
    });

    describe('Complex Operations', () => {
        it('addNodeToGroup should return early if group is empty', () => {
            const store = useWorkflowStore();
            store.addNodeToGroup('non-existent');
            expect(store.nodes).toHaveLength(0);
        });

        it('addNodeToGroup should handle node with no outgoing edges', () => {
            const store = useWorkflowStore();
            store.addInputNode();
            store.nodes.push({ id: 'n1', x: 100, y: 100, groupId: 'g1', data: { uuid: 'n1' } });
            store.addEdge('node-1', 'n1');
            store.addNodeToGroup('g1');
            // node-1 + n1 + n2 (newly added)
            expect(store.nodes).toHaveLength(3);
            // node-1->n1
            // node-1->newId (shared parent node-1)
            // Expect 2 edges
            expect(store.edges).toHaveLength(2);
        });

        it('addNodeToGroup should handle outgoing edge to non-callback node', () => {
            const store = useWorkflowStore();
            store.addInputNode();
            store.nodes.push(
                { id: 'n1', x: 400, y: 100, groupId: 'g1', data: { uuid: 'n1' } },
                { id: 'n2', x: 700, y: 100, type: 'Task', data: { uuid: 'n2' } }
            );
            store.addEdge('node-1', 'n1');
            store.addEdge('n1', 'n2');
            store.addNodeToGroup('g1');
            // node-1->n1, n1->n2. 
            // node-1 -> newNode (shared parent)
            
            expect(store.edges).toHaveLength(3); 
        });

        it('addNodeToGroup should insert node and connect to parent/callback', () => {
            const store = useWorkflowStore();
            store.addInputNode();
            store.nodes.push(
                { id: 'parent', x: 100, y: 300, data: { uuid: 'parent' } },
                { id: 'n1', x: 400, y: 100, groupId: 'g1', data: { uuid: 'n1' } },
                { id: 'cb', x: 700, y: 300, type: 'Callback', data: { uuid: 'cb' } }
            );
            store.addEdge('node-1', 'parent');
            store.edges.push(
                { from: 'parent', to: 'n1' },
                { from: 'n1', to: 'cb' }
            );
            
            store.addNodeToGroup('g1');
            
            // Layout engine regenerates group IDs, so we can't search by 'g1'.
            // And it changes node IDs into their UUIDs.
            // We can find the new node by exclusion or by the fact it connects parent->node->cb.
            // n1 uuid is 'n1'.
            
            // Start of parent's children:
            // One is n1. One is newNode.
            // Find node with uuid 'n1'.
            const n1Node = store.nodes.find(n => n.data.uuid === 'n1');
            expect(n1Node).toBeDefined();
            
            // Find another node in same group as n1Node
            const newNode = store.nodes.find(n => n.groupId === n1Node.groupId && n.data.uuid !== 'n1');
            expect(newNode).toBeDefined();
            
            // Expected nodes: node-1, parent, n1, cb, newNode => 5
            expect(store.nodes).toHaveLength(5);
            
            // Edges:
            // node-1->parent
            // parent->n1
            // n1->cb
            // parent->newNode
            // newNode->cb
            // Total 5
            expect(store.edges).toHaveLength(5);
        });

        it('appendNode should handle multiple children and grouping', () => {
            const store = useWorkflowStore();
            store.addInputNode();
            
            // First child (targetX = newNode.x branch)
            store.appendNode('node-1');
            const c1 = store.nodes.find(n => n.label === 'Task 2');
            expect(c1.groupId).toBeNull();
            
            // Second child (Create group)
            store.appendNode('node-1');
            const c2 = store.nodes.find(n => n.label === 'Task 3');
            expect(c1.groupId).toBe(c2.groupId);
            expect(c1.groupId).not.toBeNull();
            
            // Third child (Join existing group)
            store.appendNode('node-1');
            const c3 = store.nodes.find(n => n.label === 'Task 4');
            expect(c3.groupId).toBe(c1.groupId);
        });

        it('addNodeToGroup should merge data if provided', () => {
            const store = useWorkflowStore();
            store.nodes = [{ id: 'n1', groupId: 'g1', x: 100, y: 100 }];
            const taskData = { display_name: 'Custom Task', foo: 'bar' };
            
            store.addNodeToGroup('g1', taskData);
            
            const newNode = store.nodes.find(n => n.label === 'Custom Task');
            expect(newNode.data.foo).toBe('bar');
        });

        it('updateNodeTaskConfig should map form data correctly', () => {
            const store = useWorkflowStore();
            const nodeId = store.addNode(100, 100);
            const node = store.nodes.find(n => n.id === nodeId);
            node.data.task_config = [
                { name: 'opt1', value: 'old' },
                { name: 'opt2', value: 123 }
            ];
            const saveSpy = vi.spyOn(store, 'triggerDebouncedSave').mockImplementation(() => {});

            store.updateNodeTaskConfig({
                nodeId,
                formData: { opt1: 'new', opt2: 456, ignored: 'foo' }
            });

            expect(node.data.task_config[0].value).toBe('new');
            expect(node.data.task_config[1].value).toBe(456);
            expect(saveSpy).toHaveBeenCalled();
        });

        it('updateNodeTaskConfig should return early if node or config missing', () => {
            const store = useWorkflowStore();
            const nodeId = store.addNode(100, 100);
            const node = store.nodes.find(n => n.id === nodeId);
            
            // Missing config
            store.updateNodeTaskConfig({ nodeId, formData: {} });
            
            // Missing node
            store.updateNodeTaskConfig({ nodeId: 'wrong', formData: {} });
            
            expect(node.data.task_config).toBeUndefined();
        });

        it('updateNodeTaskConfig should skip options not in formData', () => {
            const store = useWorkflowStore();
            const nodeId = store.addNode(100, 100);
            const node = store.nodes.find(n => n.id === nodeId);
            node.data.task_config = [{ name: 'opt1', value: 'keep' }];
            
            store.updateNodeTaskConfig({ nodeId, formData: { other: 1 } });
            
            expect(node.data.task_config[0].value).toBe('keep');
        });

        it('appendNode should return early if parent not found', () => {
            const store = useWorkflowStore();
            store.appendNode('non-existent');
            expect(store.nodes).toHaveLength(0);
        });

        it('appendNode should create a group when adding a second child', () => {
            const store = useWorkflowStore();
            const pId = store.addNode(100, 300);
            const c1Id = store.addNode(400, 300);
            store.addEdge(pId, c1Id);
            
            store.appendNode(pId, { display_name: 'Second Child' });
            
            expect(store.nodes).toHaveLength(3);
            const c1 = store.nodes.find(n => n.id === c1Id);
            const c2 = store.nodes.find(n => n.label === 'Second Child');
            
            expect(c1.groupId).toBeDefined();
            expect(c2.groupId).toBe(c1.groupId);
        });

        it('addNodeToGroup should recalculate layout and push siblings down', () => {
            const store = useWorkflowStore();
            store.addInputNode();
            // Setup: Parent -> Group(2 nodes)
            //        Parent -> Sibling (below group)
            
            // Note: addNode() creates data.uuid automatically
            const parent = store.addNode(100, 100, 'Parent');
            store.addEdge('node-1', parent); // Connect to root

            const g1 = store.addNode(300, 100, 'G1', 'default', 'group-1');
            const g2 = store.addNode(300, 220, 'G2', 'default', 'group-1');
            
            store.addEdge(parent, g1);
            store.addEdge(g1, g2); 
            
            // Sibling positioned below the group
            const siblingId = store.addNode(300, 400, 'Sibling');
            const siblingUuid = store.nodes.find(n => n.id === siblingId).data.uuid;
            store.addEdge(parent, siblingId);

            // Add 3rd node to group
            store.addNodeToGroup('group-1');
            
            // Find sibling by UUID (since IDs change to UUIDs after layout)
            const updatedSibling = store.nodes.find(n => n.data.uuid === siblingUuid);
            // Sibling must exist
            expect(updatedSibling).toBeDefined();

            // Sibling should move down
            // But we CAN verify that sibling Y is > initialSiblingY.
            // Initial 400.
            // Previous bad behavior: manual placement of new node at ~340 (overlapping 400).
            // Layout (Good) behavior: sibling pushed to ~590.
            expect(updatedSibling.y).toBeGreaterThan(400); 
        });
    });

    describe('Sync & Maintenance', () => {
        it('updateWorkflowStatus should merge task statuses into nodes', () => {
            const store = useWorkflowStore();
            store.nodes = [
                { id: 'n1', data: { uuid: 'u1', status: 'OLD' } }
            ];
            const mockTasks = [{ uuid: 'u1', status: 'NEW' }];
            
            store.updateWorkflowStatus({ tasks: mockTasks });
            
            expect(store.nodes[0].data.status).toBe('NEW');
        });

        it('updateWorkflowStatus should return early if data or tasks missing', () => {
            const store = useWorkflowStore();
            store.updateWorkflowStatus(null);
            store.updateWorkflowStatus({});
            expect(store.nodes).toHaveLength(0);
        });

        it('updateWorkflowStatus should skip nodes without UUID', () => {
            const store = useWorkflowStore();
            store.nodes = [{ id: 'n1', data: {} }];
            store.updateWorkflowStatus({ tasks: [{ uuid: 'u1' }] });
            expect(store.nodes[0].data.status).toBeUndefined();
        });

        it('updateWorkflowStatus should skip nodes if uuid not in map', () => {
            const store = useWorkflowStore();
            store.nodes = [{ id: 'n1', data: { uuid: 'u1', foo: 'bar' } }];
            store.updateWorkflowStatus({ tasks: [{ uuid: 'u2', foo: 'baz' }] });
            expect(store.nodes[0].data.foo).toBe('bar');
        });

        it('updateWorkflowData should call API with current specJson', async () => {
            const store = useWorkflowStore();
            store.workflow = { id: 'wf1' };
            store.nodes = [{ id: 'node-1', type: 'Input', data: {} }];
            
            await store.updateWorkflowData();
            
            expect(RestApiClient.updateWorkflow).toHaveBeenCalledWith(
                store.workflow,
                { spec_json: store.specJson }
            );
        });

        it('updateWorkflowData should return early if no workflow or readOnly', async () => {
            const store = useWorkflowStore();
            vi.clearAllMocks(); // Clear any calls from store initialization if any
            await store.updateWorkflowData();
            expect(RestApiClient.updateWorkflow).not.toHaveBeenCalled();

            store.workflow = { id: 1 };
            store.readOnly = true;
            await store.updateWorkflowData();
            expect(RestApiClient.updateWorkflow).not.toHaveBeenCalled();
        });

        it('updateWorkflowData should log error if API fails', async () => {
            const store = useWorkflowStore();
            store.workflow = { id: 1 };
            RestApiClient.updateWorkflow.mockRejectedValue(new Error('Save Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await store.updateWorkflowData();

            expect(consoleSpy).toHaveBeenCalledWith("Failed to save workflow:", expect.any(Error));
            consoleSpy.mockRestore();
        });

        it('triggerDebouncedSave should debounce API calls', () => {
            vi.useFakeTimers();
            const store = useWorkflowStore();
            store.workflow = { id: 'wf1' };
            const saveSpy = vi.spyOn(store, 'updateWorkflowData').mockResolvedValue();
            
            store.triggerDebouncedSave();
            store.triggerDebouncedSave();
            
            vi.runAllTimers();
            
            expect(saveSpy).toHaveBeenCalledTimes(1);
            vi.useRealTimers();
        });
    });

    describe('Data Loading', () => {
        it('loadWorkflowData should fetch and layout workflow', async () => {
            const store = useWorkflowStore();
            const mockWorkflow = {
                id: 'wf1',
                files: [{ id: 'f1' }],
                spec_json: JSON.stringify({ workflow: { tasks: [] } })
            };
            RestApiClient.getWorkflow.mockResolvedValue(mockWorkflow);
            const layoutSpy = vi.spyOn(store, 'layoutWorkflow').mockImplementation(() => {});

            await store.loadWorkflowData('folder1', 'wf1');

            expect(store.workflow).toEqual(mockWorkflow);
            expect(layoutSpy).toHaveBeenCalled();
            expect(store.nodes[0].id).toBe('node-1');
            expect(store.nodes[0].data.files).toEqual(mockWorkflow.files);
        });

        it('loadWorkflowData should update status when polling', async () => {
            const store = useWorkflowStore();
            const mockWorkflow = { id: 'wf1', tasks: [] };
            RestApiClient.getWorkflow.mockResolvedValue(mockWorkflow);
            const updateSpy = vi.spyOn(store, 'updateWorkflowStatus').mockImplementation(() => {});

            await store.loadWorkflowData('folder1', 'wf1', true);

            expect(updateSpy).toHaveBeenCalledWith(mockWorkflow);
        });

        it('loadWorkflowData should skip clearWorkflow and addInputNode when polling', async () => {
            const store = useWorkflowStore();
            const clearSpy = vi.spyOn(store, 'clearWorkflow');
            const addSpy = vi.spyOn(store, 'addInputNode');
            RestApiClient.getWorkflow.mockResolvedValue({ id: 'wf1' });

            await store.loadWorkflowData('f1', 'wf1', true);

            expect(clearSpy).not.toHaveBeenCalled();
            expect(addSpy).not.toHaveBeenCalled();
        });

        it('loadWorkflowData should handle workflow with missing spec_json or files', async () => {
            const store = useWorkflowStore();
            RestApiClient.getWorkflow.mockResolvedValue({ id: 'wf1' });
            await store.loadWorkflowData('f1', 'wf1');
            expect(store.nodes).toHaveLength(1);
            expect(store.nodes[0].data.files).toEqual([]);
        });

        it('loadWorkflowData should log error if API fails', async () => {
            const store = useWorkflowStore();
            RestApiClient.getWorkflow.mockRejectedValue(new Error('Load Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await store.loadWorkflowData('f1', 'wf1');

            expect(consoleSpy).toHaveBeenCalledWith("Failed to load workflow data:", expect.any(Error));
            consoleSpy.mockRestore();
        });

        it('loadWorkflowData should handle workflow without spec_json', async () => {
            const store = useWorkflowStore();
            const mockWorkflow = { id: 'wf1' };
            RestApiClient.getWorkflow.mockResolvedValue(mockWorkflow);
            const layoutSpy = vi.spyOn(store, 'layoutWorkflow').mockImplementation(() => {});

            await store.loadWorkflowData('f1', 'wf1');

            expect(layoutSpy).toHaveBeenCalledWith(mockWorkflow, expect.any(Map));
        });

        it('loadWorkflowData should handle files if inputNode is missing', async () => {
             const store = useWorkflowStore();
             RestApiClient.getWorkflow.mockResolvedValue({ 
                 id: 'wf1', 
                 files: [{ name: 'f1' }] 
             });
             // Mock addInputNode to do nothing and manually clear nodes
             vi.spyOn(store, 'addInputNode').mockImplementation(() => {});
             store.nodes = []; 
             
             await store.loadWorkflowData('f1', 'wf1');
             // Branch: if (WORKFLOW_DATA.files) { const inputNode = find...; if (inputNode) { ... } }
             // Since nodes is empty, find returns null
             expect(store.nodes).toHaveLength(0);
        });

        it('loadWorkflowData should handle spec_json without workflow property', async () => {
            const store = useWorkflowStore();
            const mockSpec = { some: 'other' };
            RestApiClient.getWorkflow.mockResolvedValue({ 
                id: 'wf1', 
                spec_json: JSON.stringify(mockSpec) 
            });
            const layoutSpy = vi.spyOn(store, 'layoutWorkflow');
            await store.loadWorkflowData('f1', 'wf1');
            expect(layoutSpy).toHaveBeenCalledWith(mockSpec, expect.any(Map));
        });

        it('loadWorkflowData should skip tasks without uuid in status map', async () => {
            const store = useWorkflowStore();
            RestApiClient.getWorkflow.mockResolvedValue({ 
                id: 'wf1', 
                tasks: [{ name: 'ghost' }] // No UUID
            });
            await store.loadWorkflowData('f1', 'wf1');
            // Check that it doesn't crash
            expect(store.workflow.id).toBe('wf1');
        });

        it('layoutWorkflow should create input node if missing', () => {
            const store = useWorkflowStore();
            store.nodes = []; // No input node
            const mockWorkflowData = { workflow: { tasks: [] } };
            
            store.layoutWorkflow(mockWorkflowData);
            
            expect(store.nodes).toHaveLength(1);
            expect(store.nodes[0].id).toBe('node-1');
            expect(store.nodes[0].type).toBe('Input');
        });

        it('layoutWorkflow should handle rootHeight 0', () => {
            const store = useWorkflowStore();
            store.addInputNode();
            store.layoutWorkflow({ tasks: [] });
            expect(store.nodes[0].y).toBe(300);
        });

        it('layoutWorkflow should create input node if missing', () => {
            const store = useWorkflowStore();
            store.nodes = [];
            store.layoutWorkflow({ tasks: [] });
            expect(store.nodes).toHaveLength(1);
            expect(store.nodes[0].id).toBe('node-1');
        });

        it('loadWorkflowData should set readOnly if tasks exist', async () => {
            const store = useWorkflowStore();
            const mockWorkflow = { id: 'wf1', tasks: [{ uuid: 't1' }] };
            RestApiClient.getWorkflow.mockResolvedValue(mockWorkflow);

            await store.loadWorkflowData('folder1', 'wf1');

            expect(store.readOnly).toBe(true);
        });

        it('loadWorkflowData should handle invalid spec_json gracefully', async () => {
            const store = useWorkflowStore();
            const mockWorkflow = { id: 'wf1', spec_json: 'invalid-json' };
            RestApiClient.getWorkflow.mockResolvedValue(mockWorkflow);
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await store.loadWorkflowData('folder1', 'wf1');

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse (mock) workflow spec JSON'), expect.anything());
            consoleSpy.mockRestore();
        });
    });

    describe('Misc Edge Cases', () => {
        it('appendNode should join existing group for third+ child', () => {
            const store = useWorkflowStore();
            const pId = 'p1';
            store.nodes = [
                { id: 'p1', x: 100, y: 300 },
                { id: 'c1', x: 400, y: 100, groupId: 'g1' },
                { id: 'c2', x: 400, y: 220, groupId: 'g1' }
            ];
            store.edges = [
                { from: 'p1', to: 'c1' },
                { from: 'p1', to: 'c2' }
            ];
            
            store.appendNode(pId, { display_name: 'Third Child' });
            
            const c3 = store.nodes.find(n => n.label === 'Third Child');
            expect(c3.groupId).toBe('g1');
        });

        it('removeNode should do nothing for node-1', () => {
            const store = useWorkflowStore();
            store.addInputNode();
            store.removeNode('node-1');
            expect(store.nodes).toHaveLength(1);
        });

        it('removeNode should ungroup if only one node remains', () => {
            const store = useWorkflowStore();
            store.nodes = [
                { id: 'n1', y: 100, groupId: 'g1' },
                { id: 'n2', y: 220, groupId: 'g1' }
            ];
            
            store.removeNode('n1');
            
            expect(store.nodes[0].groupId).toBeNull();
        });
    });
});

describe('Workflow Store - Run Workflow', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('runWorkflow should parse specJson and call API', async () => {
        const store = useWorkflowStore();
        const initialWorkflow = { id: 1, folder: { id: 2 } };
        store.workflow = initialWorkflow;

        // Setup a simple workflow state (Input node is usually added by default or we add it)
        store.addInputNode();

        // Spy on loadWorkflowData
        const loadSpy = vi.spyOn(store, 'loadWorkflowData').mockResolvedValue();

        RestApiClient.runWorkflow.mockResolvedValue({});

        await store.runWorkflow();

        expect(RestApiClient.runWorkflow).toHaveBeenCalledTimes(1);

        // We expect the first arg to be the workflow object
        // and the second arg to be the parsed specJson
        const expectedSpec = JSON.parse(store.specJson);

        expect(RestApiClient.runWorkflow).toHaveBeenCalledWith(
            initialWorkflow,
            expectedSpec
        );

        // Verify loadWorkflowData was called to refresh state
        expect(loadSpy).toHaveBeenCalledWith(2, 1, true);
    });

    it('runWorkflow should do nothing if no workflow set', async () => {
        const store = useWorkflowStore();
        store.workflow = null;
        await store.runWorkflow();
        expect(RestApiClient.runWorkflow).not.toHaveBeenCalled();
    });

    it('runWorkflow should log error if API fails', async () => {
        const store = useWorkflowStore();
        store.workflow = { id: 1, folder: { id: 2 } };
        RestApiClient.runWorkflow.mockRejectedValue(new Error('API Fail'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(store.runWorkflow()).rejects.toThrow('API Fail');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

describe('Workflow Store - Create Workflow Template', () => {
    let setWorkflowTemplatesSpy;

    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();

        // Setup App Stub
        setWorkflowTemplatesSpy = vi.fn();
        useAppStore.mockReturnValue({
            setWorkflowTemplates: setWorkflowTemplatesSpy,
        });
    });

    it('createWorkflowTemplate should call API and update app store', async () => {
        const store = useWorkflowStore();
        store.workflow = { id: 'wf-123' };

        RestApiClient.createWorkflowTemplate.mockResolvedValue({});

        await store.createWorkflowTemplate('My Template');

        expect(RestApiClient.createWorkflowTemplate).toHaveBeenCalledWith(
            'My Template',
            'wf-123'
        );
        expect(setWorkflowTemplatesSpy).toHaveBeenCalled();
    });

    it('createWorkflowTemplate should do nothing if displayName is empty', async () => {
        const store = useWorkflowStore();
        await store.createWorkflowTemplate('');
        expect(RestApiClient.createWorkflowTemplate).not.toHaveBeenCalled();
    });

    it('createWorkflowTemplate should throw error if API fails', async () => {
        const store = useWorkflowStore();
        store.workflow = { id: 'wf-123' };
        const error = new Error('API Error');
        RestApiClient.createWorkflowTemplate.mockRejectedValue(error);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        await expect(store.createWorkflowTemplate('My Template')).rejects.toThrow(error);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

describe('Workflow Store - Copy Workflow', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('copyWorkflow should call API with current workflow', async () => {
        const store = useWorkflowStore();
        const mockWorkflow = { id: 'wf-123', folder: { id: 'folder-1' } };
        store.workflow = mockWorkflow;

        RestApiClient.copyWorkflow.mockResolvedValue({ id: 'wf-new' });

        const result = await store.copyWorkflow();

        expect(RestApiClient.copyWorkflow).toHaveBeenCalledWith(mockWorkflow);
        expect(result).toEqual({ id: 'wf-new' });
    });

    it('copyWorkflow should do nothing if no workflow set', async () => {
        const store = useWorkflowStore();
        store.workflow = null;
        await store.copyWorkflow();
        expect(RestApiClient.copyWorkflow).not.toHaveBeenCalled();
    });

    it('copyWorkflow should throw error if API fails', async () => {
        const store = useWorkflowStore();
        store.workflow = { id: 'wf-123' };
        const error = new Error('API Error');
        RestApiClient.copyWorkflow.mockRejectedValue(error);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        await expect(store.copyWorkflow()).rejects.toThrow(error);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

describe('Workflow Store - Rename Workflow', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('renameWorkflow should call API and update local display_name', async () => {
        const store = useWorkflowStore();
        const mockWorkflow = { id: 'wf-123', folder: { id: 'folder-1' }, display_name: 'Old Name' };
        store.workflow = mockWorkflow;

        RestApiClient.updateWorkflow.mockResolvedValue({});

        await store.renameWorkflow('New Name');

        expect(RestApiClient.updateWorkflow).toHaveBeenCalledWith(
            mockWorkflow,
            { display_name: 'New Name' }
        );
        expect(store.workflow.display_name).toBe('New Name');
    });

    it('renameWorkflow should do nothing if no workflow or name provided', async () => {
        const store = useWorkflowStore();
        
        // No workflow
        await store.renameWorkflow('New Name');
        expect(RestApiClient.updateWorkflow).not.toHaveBeenCalled();

        // No name
        store.workflow = { id: 'wf-123' };
        await store.renameWorkflow('');
        expect(RestApiClient.updateWorkflow).not.toHaveBeenCalled();
    });

    it('renameWorkflow should throw error if API fails', async () => {
        const store = useWorkflowStore();
        store.workflow = { id: 'wf-123', display_name: 'Old Name' };
        const error = new Error('API Error');
        RestApiClient.updateWorkflow.mockRejectedValue(error);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        await expect(store.renameWorkflow('New Name')).rejects.toThrow(error);
        expect(store.workflow.display_name).toBe('Old Name');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
