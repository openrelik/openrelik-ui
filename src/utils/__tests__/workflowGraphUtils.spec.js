import { describe, it, expect } from "vitest";
import {
  getDescendants,
  findCommonCallback,
  buildTaskTree,
  flattenTasks,
  findTails,
  getIdealPlacement,
} from "../workflowGraphUtils";

describe("workflowGraphUtils", () => {
  describe("getDescendants", () => {
    const edges = [
      { from: "node-1", to: "node-2" },
      { from: "node-2", to: "node-3" },
      { from: "node-3", to: "node-4" },
      { from: "node-2", to: "node-5" },
    ];

    it("should return all descendants for a node", () => {
      const result = getDescendants("node-1", edges);
      expect(result).toEqual(new Set(["node-2", "node-3", "node-4", "node-5"]));
    });

    it("should handle cycles safely", () => {
      const cyclicEdges = [
        { from: "node-1", to: "node-2" },
        { from: "node-2", to: "node-1" },
      ];
      const result = getDescendants("node-1", cyclicEdges);
      expect(result).toEqual(new Set(["node-2", "node-1"]));
    });

    it("should avoid cycles using the visited set", () => {
      const edges = [{ from: "n1", to: "n1" }];
      const visited = new Set();
      getDescendants("n1", edges, visited);
      expect(visited.has("n1")).toBe(true);
      expect(visited.size).toBe(1);
    });
  });

  describe("findCommonCallback", () => {
    const nodes = [
      { id: "n1", x: 100 },
      { id: "n2", x: 100 },
      { id: "cb", x: 500 },
      { id: "node-2", x: 400 },
      { id: "node-3", x: 400 },
      { id: "node-4", x: 700 },
    ];
    const edges = [
      { from: "node-1", to: "node-2" },
      { from: "node-1", to: "node-3" },
      { from: "node-2", to: "node-4" },
      { from: "node-3", to: "node-4" },
    ];

    it("should return null for less than 2 start nodes", () => {
      expect(findCommonCallback([{ id: "n1" }], [], [])).toBeNull();
    });

    it("should return null if first node has no descendants", () => {
      expect(findCommonCallback([{ id: "n1" }, { id: "n2" }], [], [])).toBeNull();
    });

    it("should return null if no common descendant exists", () => {
      const edgesNoCommon = [
        { from: "n1", to: "d1" },
        { from: "n2", to: "d2" },
      ];
      expect(findCommonCallback([{ id: "n1" }, { id: "n2" }], edgesNoCommon, nodes)).toBeNull();
    });

    it("should find the common descendant node", () => {
      const result = findCommonCallback(
        [{ id: "node-2" }, { id: "node-3" }],
        edges,
        nodes
      );
      expect(result.id).toBe("node-4");
    });

    it("should return null if no common descendant", () => {
      const edgesNoCommon = [
        { from: "node-2", to: "node-5" },
        { from: "node-3", to: "node-6" },
      ];
      const result = findCommonCallback(
        [{ id: "node-2" }, { id: "node-3" }],
        edgesNoCommon,
        nodes
      );
      expect(result).toBeNull();
    });

    it("should find common callback if it exists", () => {
      const edgesWithCommon = [
        { from: "n1", to: "cb" },
        { from: "n2", to: "cb" },
      ];
      const result = findCommonCallback([{ id: "n1" }, { id: "n2" }], edgesWithCommon, nodes);
      expect(result.id).toBe("cb");
    });
  });

  describe("buildTaskTree", () => {
    const nodes = [
      { id: "node-1", label: "Input" },
      { id: "node-2", label: "Task 2", data: { task_name: "t2", uuid: "uuid-2" } },
      { id: "node-3", label: "Task 3", data: { task_name: "t3", uuid: "uuid-3" } },
      { id: "node-4", label: "Callback", data: { task_name: "cb", uuid: "uuid-4" } },
    ];
    const edges = [
      { from: "node-1", to: "node-2" },
      { from: "node-1", to: "node-3" },
      { from: "node-2", to: "node-4" },
      { from: "node-3", to: "node-4" },
    ];

    it("should detect chords and build tree correctly", () => {
      const edgesWithRoot = [
        { from: "node-1", to: "node-2" },
        { from: "node-1", to: "node-3" },
        { from: "node-2", to: "node-4" },
        { from: "node-3", to: "node-4" },
      ];
      const tree = buildTaskTree("node-1", null, edgesWithRoot, nodes);
      expect(tree[0].type).toBe("chord");
      expect(tree[0].tasks).toHaveLength(2);
      expect(tree[0].callback.uuid).toBe("uuid-4");
    });

    it("should handle chord callback without data", () => {
      const bareNodes = [
        { id: "node-1" },
        { id: "node-2" },
        { id: "node-3" },
        { id: "node-4", label: "Bare Callback" } // No data
      ];
      const bareEdges = [
        { from: "node-1", to: "node-2" },
        { from: "node-1", to: "node-3" },
        { from: "node-2", to: "node-4" },
        { from: "node-3", to: "node-4" }
      ];
      const tree = buildTaskTree("node-1", null, bareEdges, bareNodes);
      expect(tree[0].callback.uuid).toBe("node-4");
      expect(tree[0].callback.display_name).toBe("Bare Callback");
      expect(tree[0].callback.task_name).toContain("placeholder");
    });

    it("should return empty array if parent has no edges", () => {
      expect(buildTaskTree("node-1", null, [], [])).toEqual([]);
    });

    it("should return empty array if all children are filtered out by stopAtId", () => {
      const edges = [{ from: "n1", to: "stop" }];
      const nodes = [{ id: "n1" }, { id: "stop" }];
      expect(buildTaskTree("n1", "stop", edges, nodes)).toEqual([]);
    });

    it("should correctly coerce stopAtId during comparison", () => {
      const edges = [{ from: "1", to: "2" }];
      const nodes = [{ id: "1" }, { id: "2" }];
      expect(buildTaskTree("1", 2, edges, nodes)).toEqual([]); // 2 as number
    });

    it("should set chordCallback to null if it matches stopAtId", () => {
      const stopNodes = [
        { id: "p1" },
        { id: "c1", x: 100 },
        { id: "c2", x: 100 },
        { id: "stop", x: 500 }
      ];
      const stopEdges = [
        { from: "p1", to: "c1" },
        { from: "p1", to: "c2" },
        { from: "c1", to: "stop" },
        { from: "c2", to: "stop" }
      ];
      // chord detected as 'stop', but we tell it to stop at 'stop'
      const tree = buildTaskTree("p1", "stop", stopEdges, stopNodes);
      expect(tree).toHaveLength(2); // Should be regular tasks, not a chord
      expect(tree[0].type).toBe("task");
    });

    it("should map regular children if no chord detected", () => {
      const regularNodes = [
        { id: "p1" },
        { id: "c1", label: "Solo" }
      ];
      const regularEdges = [{ from: "p1", to: "c1" }];
      const tree = buildTaskTree("p1", null, regularEdges, regularNodes);
      expect(tree).toHaveLength(1);
      expect(tree[0].display_name).toBe("Solo");
    });
  });

  describe("flattenTasks", () => {
    it("should flatten nested tasks into a Map", () => {
      const tasks = [
        {
          uuid: "1",
          tasks: [
            { uuid: "2", tasks: [] },
            { type: "chord", tasks: [{ uuid: "3" }], callback: { uuid: "4" } },
          ],
        },
      ];
      const map = flattenTasks(tasks);
      expect(map.has("1")).toBe(true);
      expect(map.has("4")).toBe(true);
    });

    it("should return empty map if tasks is null", () => {
      expect(flattenTasks(null).size).toBe(0);
    });

    it("should handle chord without callback", () => {
      const chord = {
        type: "chord",
        tasks: [{ uuid: "t1" }],
      };
      const map = flattenTasks([chord]);
      expect(map.has("t1")).toBe(true);
    });
  });

  describe("findTails", () => {
    it("should return leaf node IDs", () => {
      const task = {
        uuid: "1",
        tasks: [
          { uuid: "2", tasks: [] },
          { uuid: "3", tasks: [] },
        ],
      };
      expect(findTails(task)).toEqual(["2", "3"]);
    });

    it("should handle chords", () => {
        const task = {
            type: "chord",
            tasks: [{uuid: "2"}],
            callback: {uuid: "3", tasks: []}
        }
        expect(findTails(task)).toEqual(["3"]);
    })

    it("should return tails of chord branches if callback missing", () => {
      const chord = {
        type: "chord",
        tasks: [{ uuid: "t1" }, { uuid: "t2" }],
      };
      expect(findTails(chord)).toEqual(["t1", "t2"]);
    });
  });

  describe("getIdealPlacement", () => {
    const parent = { x: 100, y: 300 };
    const allNodes = [
        { id: "node-10", x: 380, y: 300 } // Obstacle at target X (100+280=380)
    ];
    
    it("should shift Y if an obstacle exists at target position", () => {
        const siblings = [{ id: "new-node", x: 380 }];
        const resultY = getIdealPlacement(parent, siblings, allNodes, 120);
        // Obstacle at 300, bottom 400. shift = 400 + 50 = 450
        expect(resultY).toBe(450);
    });

    it("should use siblings[0].x for targetX if multiple siblings exist", () => {
        const p = { x: 100, y: 100 };
        const s = [{ id: "n1", x: 500, y: 100 }, { id: "n2", x: 500, y: 220 }];
        const resultY = getIdealPlacement(p, s, [], 120);
        // targetX should be 500. startY = 100 - (240-120)/2 = 40? 
        // No, totalHeight = (2-1)*120 = 120. startY = 100 - 120/2 = 40.
        expect(resultY).toBe(40);
    });

    it("should handle obstacles within groups", () => {
      const parentG = { x: 100, y: 300 };
      const siblingsG = [{ id: "new-node", x: 380 }];
      const groupNodes = [
        { id: "g1", x: 380, y: 300, groupId: "group-obs" },
        { id: "g2", x: 380, y: 420, groupId: "group-obs" },
      ];
      const allWithGroup = [
        { id: "parent", x: 100, y: 300 },
        { id: "new-node", x: 380, y: 300 },
        ...groupNodes
      ];
      
      const startY = getIdealPlacement(parentG, siblingsG, allWithGroup, 120);
      // group min Y = 300, max Y = 420.
      // top = 300 - 20 = 280.
      // bottom = 420 + 240 = 660.
      // myBottom (300) > 280 and startY (300) < 660.
      // startY = 660 + 50 = 710.
      expect(startY).toBe(710);
    });
  });
});
