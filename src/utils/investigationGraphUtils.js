/**
 * generic Graph class for managing the investigation DAG.
 */
export class Graph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map(); // Adjacency list: parentId -> Set of childIds
    this.reverseEdges = new Map(); // Adjacency list: childId -> Set of parentIds
    this.roots = new Set(); // Ids of root nodes
  }

  /**
   * Adds a node to the graph.
   * @param {string} id - Unique identifier for the node.
   * @param {Object} data - Data associated with the node.
   */
  addNode(id, data = {}) {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, ...data });
      this.edges.set(id, new Set());
      this.reverseEdges.set(id, new Set());
      this.roots.add(id); // Initially a root until added as a child
    } else {
      // Merge data if node already exists (e.g. forward declaration)
      const existing = this.nodes.get(id);
      this.nodes.set(id, { ...existing, ...data });
    }
  }

  /**
   * Adds a directed edge from parent to child.
   * @param {string} parentId
   * @param {string} childId
   */
  addEdge(parentId, childId) {
    if (!this.nodes.has(parentId)) {
      this.addNode(parentId);
    }
    if (!this.nodes.has(childId)) {
      this.addNode(childId);
    }

    this.edges.get(parentId).add(childId);
    this.reverseEdges.get(childId).add(parentId);
    this.roots.delete(childId); // No longer a root
  }

  /**
   * Get parents of a node.
   * @param {string} id
   * @returns {Array<Object>}
   */
  getParents(id) {
    if (!this.reverseEdges.has(id)) return [];
    return Array.from(this.reverseEdges.get(id)).map((parentId) =>
      this.nodes.get(parentId)
    );
  }

  /**
   * Get a node by ID.
   * @param {string} id
   * @returns {Object|undefined}
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Get children of a node.
   * @param {string} id
   * @returns {Array<Object>}
   */
  getChildren(id) {
    if (!this.edges.has(id)) return [];
    return Array.from(this.edges.get(id)).map((childId) =>
      this.nodes.get(childId)
    );
  }

  /**
   * Converts the graph (or a subgraph) to a recursive tree structure suitable for UI rendering.
   * @param {string} [rootId] - Optional root ID to start from. If omitted, returns forest of all roots.
   * @returns {Object|Array<Object>}
   */
  toTree(rootId = null) {
    const buildTree = (id) => {
      const node = this.nodes.get(id);
      const childrenIds = this.edges.get(id) || new Set();
      const children = Array.from(childrenIds).map(buildTree);
      
      return {
        ...node,
        children: children.length > 0 ? children : undefined,
      };
    };

    if (rootId) {
      return buildTree(rootId);
    }

    // Return array of all root trees
    return Array.from(this.roots).map(buildTree);
  }
}
