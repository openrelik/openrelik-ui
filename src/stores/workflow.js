import { defineStore } from "pinia";
import { useAppStore } from "./app";
import { useUserSettings } from "@/composables/useUserSettings";
import RestApiClient from "@/RestApiClient";
import {
  buildTaskTree,
  flattenTasks,
  getIdealPlacement,
} from "@/utils/workflowGraphUtils";
import { computeWorkflowLayout } from "@/utils/workflowLayoutUtils";

export const useWorkflowStore = defineStore("workflow", {
  state: () => ({
    nodes: [],
    edges: [],
    nextId: 1,
    readOnly: false,
    workflow: null,
    saveTimeout: null,
    isGeneratingName: false,
  }),
  // Getters for computed state
  getters: {
    /**
     * Generates the spec_json for the current workflow state.
     * Reconstructs the tree structure from nodes and edges, ensuring correct order.
     *
     * @param {Object} state - The Pinia state object.
     * @returns {string} The formatted JSON string of the workflow spec.
     */
    specJson: (state) => {
      // Start traversal from the static Input Node
      const rootTasks = buildTaskTree("node-1", null, state.edges, state.nodes);

      return JSON.stringify(
        {
          workflow: {
            type: "chain",
            isRoot: true,
            tasks: rootTasks,
          },
        },
        null,
        4
      );
    },
    /**
     * Checks if there are any tasks currently being processed.
     *
     * @param {Object} state - The Pinia state object.
     * @returns {boolean} True if any task is in a non-terminal state.
     */
    hasActiveTasks: (state) => {
      if (!state.workflow || !state.workflow.tasks) return false;
      return state.workflow.tasks.some((task) =>
        ["STARTED", "PROGRESS", "RECEIVED", "PENDING", "REGISTERED"].includes(
          task.status_short
        )
      );
    },
  },
  actions: {
    /**
     * Adds a new node to the workflow.
     *
     * @param {number} x - The x-coordinate of the node.
     * @param {number} y - The y-coordinate of the node.
     * @param {string} [label='Task'] - The display label for the node.
     * @param {string} [type='default'] - The type of the node.
     * @param {string|null} [groupId=null] - The ID of the group the node belongs to.
     * @returns {string} The ID of the newly created node.
     */
    addNode(x, y, label = "Task", type = "default", groupId = null) {
      const id = `node-${this.nextId++}`;
      // Only append ID for generic labels to keep them unique/numbered
      // But keep specific task names clean
      const genericLabels = ["Task", "Chain", "Worker", "Parent", "Callback"];
      const finalLabel = genericLabels.includes(label.split(" ")[0])
        ? `${label} ${this.nextId - 1}`
        : label;

      this.nodes.push({
        id,
        x,
        y,
        label: finalLabel,
        type,
        groupId, // Optional group ID
        data: {
          uuid: crypto.randomUUID().replaceAll("-", ""),
        },
      });
      return id;
    },

    /**
     * Adds a directed edge between two nodes.
     *
     * @param {string} from - The ID of the source node.
     * @param {string} to - The ID of the target node.
     */
    addEdge(from, to) {
      const edgeId = `edge-${from}-${to}`;
      // Prevent duplicate edges
      if (this.edges.some((e) => e.id === edgeId)) {
        return;
      }
      this.edges.push({
        id: edgeId,
        from,
        to,
      });
    },

    /**
     * Updates the position of a specific node.
     *
     * @param {string} id - The ID of the node to update.
     * @param {number} x - The new x-coordinate.
     * @param {number} y - The new y-coordinate.
     */
    updateNodePosition(id, x, y) {
      const node = this.nodes.find((n) => n.id === id);
      if (node) {
        node.x = x;
        node.y = y;
        // Visual update might affect order in spec_json
        this.triggerDebouncedSave();
      }
    },

    /**
     * Moves an entire group of nodes by a given delta.
     *
     * @param {string} groupId - The ID of the group to move.
     * @param {number} dx - The change in x-coordinate.
     * @param {number} dy - The change in y-coordinate.
     */
    moveGroup(groupId, dx, dy) {
      this.nodes.forEach((node) => {
        if (node.groupId === groupId) {
          node.x += dx;
          node.y += dy;
        }
      });
      // Moving a group changes visual position but not structure/spec_json usually?
      // Actually spec_json order relies on Y position. So we should save.
      this.triggerDebouncedSave();
    },

    /**
     * Adds a new node to an existing group, intelligently placing it and connecting it
     * to the group's parent and callback (if present).
     *
     * @param {string} groupId - The ID of the group to add the node to.
     */
    addNodeToGroup(groupId, taskData = null) {
      const groupNodes = this.nodes.filter((n) => n.groupId === groupId);
      if (groupNodes.length === 0) return;

      // Find common callback (node that group nodes connect to)
      // Only consider it a callback if it is of type 'Callback'
      const firstNodeId = groupNodes[0].id;
      const outgoingEdge = this.edges.find((e) => e.from === firstNodeId);

      let callbackId = null;
      if (outgoingEdge) {
        const targetNode = this.nodes.find((n) => n.id === outgoingEdge.to);
        if (targetNode && targetNode.type === "Callback") {
          callbackId = targetNode.id;
        }
      }

      // Find common parent (node that connects TO the group nodes)
      // We assume a group has a single parent for now (fan-out)
      const incomingEdge = this.edges.find((e) => e.to === firstNodeId);
      const parentId = incomingEdge ? incomingEdge.from : null;

      // 1. Add new node to the state (temporarily) so it exists for graph traversal
      // Use the same X position as existing group nodes to maintain proper chord detection
      // (findCommonCallback uses X position to determine the callback node)
      const groupX = groupNodes[0].x;
      const groupMaxY = Math.max(...groupNodes.map((n) => n.y));
      const label = taskData ? taskData.display_name : "Task";
      const newId = this.addNode(
        groupX,
        groupMaxY + 120, // Position below existing group nodes
        label,
        "default",
        groupId
      );

      // Merge Data if provided
      if (taskData) {
        const node = this.nodes.find((n) => n.id === newId);
        if (node) {
          Object.assign(node.data, taskData);
        }
      }

      // 2. Connect edges
      if (parentId) {
        this.addEdge(parentId, newId);
      }
      if (callbackId) {
        this.addEdge(newId, callbackId);
      }

      // 3. Trigger full layout recalculation
      // This ensures all subsequent nodes (siblings below this group) are pushed down
      try {
        const currentSpec = JSON.parse(this.specJson);
        const workflowData = currentSpec.workflow || currentSpec;

        // layoutWorkflow wipes store, so we need to pass current status map to preserve runtime data
        const taskStatusMap = new Map();
        this.nodes.forEach((n) => {
          if (n.data && n.data.uuid) {
            taskStatusMap.set(n.data.uuid, n.data);
          }
        });

        this.layoutWorkflow(workflowData, taskStatusMap);
      } catch (e) {
        console.error("Failed to re-layout after adding node to group:", e);
      }

      this.updateWorkflowData();
    },

    /**
     * Removes a node and its descendants from the workflow.
     * Also handles auto-repacking of groups if a member is removed.
     *
     * @param {string} nodeId - The ID of the node to remove.
     */
    removeNode(nodeId) {
      // Prevent deletion of the initial static node
      if (nodeId === "node-1") return;

      // Check if primary node is in a group (for auto-repack)
      const nodeToRemove = this.nodes.find((n) => n.id === nodeId);
      const removalGroupId = nodeToRemove ? nodeToRemove.groupId : null;
      const removalY = nodeToRemove ? nodeToRemove.y : null;

      // Find all descendants recursively
      const nodesToRemove = new Set([String(nodeId)]);
      const queue = [String(nodeId)];

      while (queue.length > 0) {
        const currentId = queue.shift();

        // Find edges outgoing from this node
        // We use String() coercion to handle potential type mismatches (e.g. number vs string IDs)
        const outgoingEdges = this.edges.filter(
          (e) => String(e.from) === currentId
        );

        outgoingEdges.forEach((edge) => {
          const targetId = String(edge.to);
          if (!nodesToRemove.has(targetId)) {
            nodesToRemove.add(targetId);
            queue.push(targetId);
          }
        });
      }

      // Remove all identified nodes
      this.nodes = this.nodes.filter((n) => !nodesToRemove.has(String(n.id)));

      // Remove all edges connected to any of these nodes
      this.edges = this.edges.filter(
        (e) =>
          !nodesToRemove.has(String(e.from)) && !nodesToRemove.has(String(e.to))
      );

      // Auto-repack: Shift lower siblings up
      if (removalGroupId) {
        let remainingGroupNodes = [];
        this.nodes.forEach((n) => {
          if (n.groupId === removalGroupId) {
            remainingGroupNodes.push(n);
            if (n.y > removalY) {
              n.y -= 120; // Shift up by one slot (100px height + 20px gap)
            }
          }
        });

        // Auto-ungroup: If only 1 node remains, remove the group
        if (remainingGroupNodes.length === 1) {
          remainingGroupNodes[0].groupId = null;
        }
      }
      this.updateWorkflowData();
    },

    /**
     * Resets the workflow to its initial state (completely empty).
     */
    clearWorkflow() {
      this.nodes = [];
      this.edges = [];
      this.nextId = 1;
    },

    /**
     * Adds the default Input Node to the workflow.
     */
    addInputNode() {
      if (!this.nodes.some((n) => n.id === "node-1")) {
        this.nodes.push({
          id: "node-1",
          type: "Input",
          label: "Input files",
          x: 30,
          y: 300,
          groupId: null,
          data: { files: [] },
        });
        this.nextId = 2;
      }
    },

    /**
     * Updates the task configuration for a specific node.
     *
     * @param {string} nodeId - The ID of the node to update.
     * @param {Object} formData - The configuration data from the form.
     */
    updateNodeTaskConfig({ nodeId, formData }) {
      const node = this.nodes.find((n) => n.id === nodeId);
      if (!node || !node.data || !node.data.task_config) return;

      // Loop through the task options in the object
      node.data.task_config = node.data.task_config.map((option) => {
        // Check if there's a corresponding value in the formData
        if (Object.prototype.hasOwnProperty.call(formData, option.name)) {
          // Return a new object with the updated value
          return { ...option, value: formData[option.name] };
        }
        return option;
      });
      this.triggerDebouncedSave();
    },

    /**
     * Appends a new node as a child of the specified parent.
     * Handles automatic grouping if the parent already has children.
     *
     * @param {string} parentId - The ID of the parent node.
     */
    appendNode(parentId, taskData = null) {
      const parent = this.nodes.find((n) => n.id === parentId);
      if (!parent) return;

      // Find existing children
      const childEdges = this.edges.filter((e) => e.from === parentId);
      const childIds = childEdges.map((e) => e.to);
      const children = this.nodes.filter((n) => childIds.includes(n.id));

      // Determine Group ID
      let groupId = null;
      if (children.length === 1) {
        // Second child being added -> Create new group
        groupId = `group-${Date.now()}`;
        // Assign to existing child
        children[0].groupId = groupId;
      } else if (children.length > 1) {
        // Third+ child -> Join existing group (assuming siblings share group)
        groupId = children[0].groupId;
      }

      // Add new node (temporarily without position)
      const newId = `node-${this.nextId++}`;
      const label = taskData
        ? taskData.display_name
        : `Task ${this.nextId - 1}`;

      const newNode = {
        id: newId,
        x: parent.x + 280, // Increased spacing from 250
        y: parent.y, // Placeholder
        label: label,
        type: "Task",
        groupId: groupId, // Assign group
        data: {
          uuid: crypto.randomUUID().replaceAll("-", ""),
          ...(taskData || {}),
        },
      };
      this.nodes.push(newNode);
      this.addEdge(parentId, newId);

      // Re-layout all children (existing + new)
      const allChildren = [...children, newNode];
      const count = allChildren.length;
      if (count > 0) {
        const spacing = 120; // 100px height + 20px gap

        // Align X to existing child if available (respect manual moves), else use default
        const targetX = children.length > 0 ? children[0].x : newNode.x;

        // Calculate starting Y using the ideal placement utility
        const startY = getIdealPlacement(
          parent,
          allChildren,
          this.nodes,
          spacing
        );

        allChildren.forEach((child, index) => {
          child.y = startY + index * spacing;
          child.x = targetX; // Force vertical alignment
        });
      }
      this.updateWorkflowData();
    },

    /**
     * Updates the status of nodes based on runtime workflow data.
     *
     * @param {Object} fullWorkflowData - The full workflow object containing task statuses.
     */
    updateWorkflowStatus(fullWorkflowData) {
      if (!fullWorkflowData || !fullWorkflowData.tasks) return;

      // Build map of new data using utility
      const taskMap = flattenTasks(fullWorkflowData.tasks);

      // Update existing nodes in place
      this.nodes.forEach((node) => {
        // If the node represents a task (has a uuid)
        if (node.data && node.data.uuid) {
          const newData = taskMap.get(node.data.uuid);
          if (newData) {
            // Merge new data into existing node data
            Object.assign(node.data, newData);
          }
        }
      });

      // Post-processing: Mark immediate children of failed tasks as SKIPPED
      this.markSkippedTasks();
    },

    /**
     * Internal helper to mark children of failed nodes as SKIPPED.
     */
    markSkippedTasks() {
      // Find all initial failed nodes to start propagation
      const queue = [];
      const visited = new Set();

      this.nodes.forEach((node) => {
        if (
          node.data &&
          (node.data.status_short === "FAILURE" ||
            node.data.status_short === "SKIPPED")
        ) {
          queue.push(node.id);
          visited.add(node.id);
        }
      });

      // Propagate SKIPPED status downwards
      while (queue.length > 0) {
        const parentId = queue.shift();

        // Find children
        const outgoingEdges = this.edges.filter((e) => e.from === parentId);
        outgoingEdges.forEach((edge) => {
          const childNode = this.nodes.find((n) => n.id === edge.to);

          if (childNode && childNode.data) {
            // If child is not already marked as skipped or failed, mark it
            if (
              !visited.has(childNode.id) &&
              childNode.data.status_short !== "FAILURE" &&
              childNode.data.status_short !== "SKIPPED"
            ) {
              childNode.data.status_short = "SKIPPED";
              queue.push(childNode.id);
              visited.add(childNode.id);
            } else if (
              !visited.has(childNode.id) &&
              (childNode.data.status_short === "FAILURE" ||
                childNode.data.status_short === "SKIPPED")
            ) {
              // If already failed/skipped, just continue propagation
              queue.push(childNode.id);
              visited.add(childNode.id);
            }
          }
        });
      }
    },

    /**
     * Lays out the workflow tasks on the canvas.
     *
     * @param {Object} workflowData - The workflow data containing tasks.
     * @param {Map} [taskStatusMap=null] - A map of task UUIDs to their status data.
     */
    layoutWorkflow(workflowData, taskStatusMap = null) {
      // Capture existing input node to preserve data (like files)
      const inputNode = this.nodes.find((n) => n.id === "node-1");

      const {
        nodes: taskNodes,
        edges: taskEdges,
        nextId,
        rootHeight,
      } = computeWorkflowLayout(workflowData, taskStatusMap, {
        initialNextId: this.nextId,
      });

      // Reconstruct nodes with preserved Input Node
      if (inputNode) {
        // Update input node position based on layout
        if (rootHeight > 0) {
          inputNode.y = 300 + rootHeight / 2 - 40;
        } else {
          inputNode.y = 300;
        }
        this.nodes = [inputNode, ...taskNodes];
      } else {
        this.nodes = taskNodes;
        this.addInputNode(); // Fallback to create it
      }

      this.edges = taskEdges;
      this.nextId = nextId;
    },

    /**
     * Updates the workflow data on the server.
     */
    async updateWorkflowData() {
      if (!this.workflow || this.readOnly) return;
      try {
        await RestApiClient.updateWorkflow(this.workflow, {
          spec_json: this.specJson,
        });
      } catch (error) {
        console.error("Failed to save workflow:", error);
      }
    },

    /**
     * Renames the current workflow.
     *
     * @param {string} newWorkflowName - The new display name for the workflow.
     */
    async renameWorkflow(newWorkflowName) {
      if (!newWorkflowName || !this.workflow) {
        return;
      }
      const requestBody = { display_name: newWorkflowName };
      try {
        await RestApiClient.updateWorkflow(this.workflow, requestBody);
        this.workflow.display_name = newWorkflowName;
      } catch (error) {
        console.error("Failed to rename workflow:", error);
        throw error;
      }
    },

    /**
     * Triggers a debounced save operation.
     * Useful for high-frequency events like dragging.
     */
    triggerDebouncedSave() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }
      this.saveTimeout = setTimeout(() => {
        this.updateWorkflowData();
        this.saveTimeout = null;
      }, 1000); // 1 second debounce
    },

    /**
     * Loads the workflow data from the server.
     *
     * @param {string} folderId - The ID of the folder containing the workflow.
     * @param {string} workflowId - The ID of the workflow to load.
     * @param {boolean} isPolling - Whether this is a polling request.
     */
    async loadWorkflowData(folderId, workflowId, isPolling = false) {
      // clearWorkflow resets to just the 'node-1' Input File
      if (!isPolling) {
        this.clearWorkflow();
      }

      let WORKFLOW_DATA = null;
      try {
        WORKFLOW_DATA = await RestApiClient.getWorkflow(folderId, workflowId);
      } catch (error) {
        console.error("Failed to load workflow data:", error);
        return;
      }

      this.workflow = WORKFLOW_DATA;

      // Add Input buffer node now that data is loaded
      if (!isPolling) {
        this.addInputNode();
      }

      // Populate Input Node with files if available
      if (WORKFLOW_DATA && WORKFLOW_DATA.files) {
        const inputNode = this.nodes.find((n) => n.id === "node-1");
        if (inputNode) {
          inputNode.data = { files: WORKFLOW_DATA.files };
        }
      }

      // Check if workflow has tasks to determine readonly state
      this.readOnly = false;
      if (WORKFLOW_DATA.tasks && WORKFLOW_DATA.tasks.length > 0) {
        this.readOnly = true;
      }

      let workflowData = WORKFLOW_DATA;
      if (WORKFLOW_DATA && WORKFLOW_DATA.spec_json) {
        try {
          const parsed = JSON.parse(WORKFLOW_DATA.spec_json);
          workflowData = parsed.workflow || parsed;
        } catch (e) {
          console.error("Failed to parse (mock) workflow spec JSON:", e);
        }
      }

      // Create lookup map for task status data
      const taskStatusMap = new Map();
      if (WORKFLOW_DATA && Array.isArray(WORKFLOW_DATA.tasks)) {
        WORKFLOW_DATA.tasks.forEach((t) => {
          if (t.uuid) {
            taskStatusMap.set(t.uuid, t);
          }
        });
      }

      // Layout the workflow
      if (isPolling) {
        this.updateWorkflowStatus(WORKFLOW_DATA);
      } else {
        this.layoutWorkflow(workflowData, taskStatusMap);
        this.markSkippedTasks();
      }
    },

    /**
     * Runs the workflow on the server.
     */
    async runWorkflow() {
      if (!this.workflow) return;
      try {
        const spec = JSON.parse(this.specJson);
        const folderId = this.workflow.folder.id;
        const workflowId = this.workflow.id;

        // Start the workflow run immediately
        const runPromise = RestApiClient.runWorkflow(this.workflow, spec);

        // Verify if we should generate a name for this workflow
        // This is a "fire and forget" action that runs in parallel
        this.generateAndSetWorkflowName();

        await runPromise;

        // Fetch the latest state to ensure all tasks and statuses are correct
        // We use isPolling=true to update efficiently without resetting the layout.
        await this.loadWorkflowData(folderId, workflowId, true);
      } catch (error) {
        console.error("Failed to run workflow:", error);
        throw error;
      }
    },

    /**
     * Creates a workflow template from the current workflow.
     *
     * @param {string} displayName - The display name for the template.
     */
    async createWorkflowTemplate(displayName) {
      if (!displayName) return;
      try {
        await RestApiClient.createWorkflowTemplate(
          displayName,
          this.workflow.id
        );
        const appStore = useAppStore();
        appStore.setWorkflowTemplates();
      } catch (error) {
        console.error("Failed to create workflow template:", error);
        throw error;
      }
    },

    /**
     * Generates a name for the workflow if it is currently 'Untitled workflow'.
     * This runs asynchronously and updates the name upon completion.
     */
    async generateAndSetWorkflowName() {
      const { settings: userSettings } = useUserSettings();
      if (
        !userSettings.AIEnabled ||
        !userSettings.AIWorkflowName ||
        !this.workflow ||
        this.workflow.display_name !== "Untitled workflow"
      )
        return;

      this.isGeneratingName = true;
      try {
        const response = await RestApiClient.generateWorkflowName(
          this.workflow
        );
        if (response && response.generated_name) {
          await this.renameWorkflow(response.generated_name);
        }
      } catch (error) {
        console.error("Failed to generate workflow name:", error);
      } finally {
        this.isGeneratingName = false;
      }
    },

    /**
     * Copies the current workflow.
     */
    async copyWorkflow() {
      if (!this.workflow) return;
      try {
        return await RestApiClient.copyWorkflow(this.workflow);
      } catch (error) {
        console.error("Failed to copy workflow:", error);
        throw error;
      }
    },
  },
});
