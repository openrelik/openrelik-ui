import { describe, it, expect } from "vitest";
import { computeWorkflowLayout } from "../workflowLayoutUtils";

describe("workflowLayoutUtils", () => {
  describe("computeWorkflowLayout", () => {
    it("should compute layout for a simple chain", () => {
      const workflowData = {
        tasks: [
          {
            uuid: "node-1",
            display_name: "Task 1",
            tasks: [{ uuid: "node-2", display_name: "Task 2" }],
          },
        ],
      };
      const result = computeWorkflowLayout(workflowData, new Map(), {
        startX: 100,
        startY: 100,
      });

      expect(result.nodes).toHaveLength(2);
      // edge-node-1-node-1 (implicit root) + edge-node-1-node-2
      expect(result.edges).toHaveLength(2);
      
      const n1 = result.nodes.find(n => n.id === "node-1");
      const n2 = result.nodes.find(n => n.id === "node-2");

      expect(n1.x).toBe(100);
      expect(n2.x).toBe(420); // 100 + 320
    });

    it("should ensure at least 10px gap between group and next node", () => {
      // Create a structure: Group (Node 1, Node 2) -> Node 3
      // Node 1 and Node 2 will be stacked.
      // Group Box will wrap them.
      // Node 3 is next.
      const workflowData = {
        tasks: [
          { uuid: "node-1", groupId: "g1", tasks: [] },
          { uuid: "node-2", groupId: "g1", tasks: [] },
          { uuid: "node-3", tasks: [] }
        ],
      };
      
      const result = computeWorkflowLayout(workflowData, new Map());
      const n1 = result.nodes.find(n => n.id === "node-1");
      const n2 = result.nodes.find(n => n.id === "node-2");
      const n3 = result.nodes.find(n => n.id === "node-3");

      expect(n1).toBeDefined();
      expect(n2).toBeDefined();
      expect(n3).toBeDefined();

      // Verify they are sequential vertically
      expect(n2.y).toBeGreaterThan(n1.y);
      expect(n3.y).toBeGreaterThan(n2.y);

      // Manual calc based on layout logic:
      // Node 1: Y
      // Node 2 (sibling): Y + 100 (node 1 height) + 40 (spacing)
      // Group Box Bottom approx: Node 2 Y + 120 (100 height + 20 bottom padding for ghost node space/padding)
      // Actually standard group box padding is 20px.
      // WorkflowGroupLayer logic: maxY = node.y + 100.
      // Group Box Bottom = maxY + 20 = node.y + 120.
      
      // Node 3 (next sibling of Node 2): 
      // previousSiblingY (bottom of Node 2 block) + Spacing (40).
      // gap = Node 3 Y (top-ish) - Group Bottom
      
      // Let's check pure Y diffs
      // Node 1 Y should be base.
      // Node 2 Y = Node 1 Y + 140.
      // Group Box Bottom = Node 2 Y + 100 (height) + 20 (padding) = Node 2 Y + 120.
      
      // Node 3 Y logic:
      // Block 2 height = 100.
      // currentSiblingY (at start of Node 3) = startY + 140 + 100 = startY + 240.
      // + Spacing 40 = 280.
      // Node 3 Y = 280 + 10 = 290. (approx, depends on centering logic)
      
      // Gap = Node 3 Y (290) - 10 (centering offset approx) - Group Bottom
      // Wait, let's just assert the gap is sufficient based on logic used in reasoning
      
 
      // Actually layout Y is center - 40. 
      // Let's rely on the layout utils returning Y as 'nodeY' which is used for translate.
      
      // Group Bottom (visual) = n2.y + 100 (height) + 20 (padding)
      const groupBottom = n2.y + 120;
      
      // Node 3 Top (visual) = n3.y
      const node3Top = n3.y;
      
      const gap = node3Top - groupBottom;
      expect(gap).toBeGreaterThanOrEqual(10);
    });

    it("should ensure gap between a chord and the next sibling node", () => {
       const workflowData = {
         tasks: [
           { 
             type: "chord",
             tasks: [{ uuid: "b1" }, { uuid: "b2" }], 
             callback: { uuid: "cb" }
           },
           { uuid: "next-node" }
         ]
       };
       // The chain: Chord -> Next Node.
       // Chord creates visual groups for branches. 
       // Next Node follows.
       
       const result = computeWorkflowLayout(workflowData, new Map());
       
       // Find 'next-node'
       const nextNode = result.nodes.find(n => n.id === "next-node");
       expect(nextNode).toBeDefined();
       
       // Find the bottom of the chord.
       // The chord consists of branch nodes and a callback node.
       // We need to find the lowest Y among them to check gap.
       const chordNodes = result.nodes.filter(n => ["b1", "b2", "cb"].includes(n.id));
       const maxChordY = Math.max(...chordNodes.map(n => n.y)); // Top of lowest node
       
       // Group box bottom? 
       // If branches are grouped, they have a box.
       // Callback is usually to the right.
       // But wait, checking vertical stacking.
       // "blockHeight" of chord is returned.
       // nextNode.y should be >= startY + chordHeight + spacing.
       
       // Let's just check the raw distance between the lowest chord component and the next node.
       // If spacing is 20, distance ~20+extras.
       // If spacing is 80, distance ~80+extras.
       
       const distance = nextNode.y - maxChordY;
       
       // 80 (spacing) + whatever layout offset logic
       // With 20px spacing, distance was likely around 30-40.
       // With 80px spacing, it should be > 100?
       // Let's assert a significant gap.
       expect(distance).toBeGreaterThan(60); 
    });

    it("should handle chord structures in layout", () => {
      const workflowData = {
        tasks: [
          {
            type: "chord",
            tasks: [
              { uuid: "branch-1", display_name: "Branch 1" },
              { uuid: "branch-2", display_name: "Branch 2" },
            ],
            callback: { uuid: "callback", display_name: "Callback" },
          },
        ],
      };
      
      const result = computeWorkflowLayout(workflowData, new Map());
      
      expect(result.nodes).toHaveLength(3);
      // 2 branches + incoming edges to callback from each branch tail
      expect(result.edges.length).toBeGreaterThanOrEqual(2);
      
      const callbackNode = result.nodes.find(n => n.id === "callback");
      expect(callbackNode).toBeDefined();
      expect(callbackNode.type).toBe("Callback");
    });

    it("should return rootHeight > 0 for non-empty workflow", () => {
        const workflowData = {
            tasks: [{ uuid: "node-1" }]
        }
        const result = computeWorkflowLayout(workflowData, new Map());
        expect(result.rootHeight).toBeGreaterThan(0);
    })

    it("should return rootHeight 0 if workflowData or tasks is missing", () => {
        expect(computeWorkflowLayout(null).rootHeight).toBe(0);
        expect(computeWorkflowLayout({}).rootHeight).toBe(0);
    });

    it("should handle null taskStatusMap", () => {
        const workflowData = {
            tasks: [{ uuid: "node-1", display_name: "Task" }]
        }
        const result = computeWorkflowLayout(workflowData, null);
        expect(result.nodes[0].data.display_name).toBe("Task");
    });

    describe("Chord Edge Cases", () => {
        it("should return early if chord has no branches", () => {
            const workflowData = {
                tasks: [{ type: "chord", tasks: [] }]
            }
            const result = computeWorkflowLayout(workflowData, new Map());
            expect(result.nodes).toHaveLength(0);
        });

        it("should handle chord with missing tasks property", () => {
            const workflowData = {
                tasks: [{ type: "chord" }] // tasks property is missing
            }
            const result = computeWorkflowLayout(workflowData, new Map());
            expect(result.nodes).toHaveLength(0);
        });

        it("should handle chord without callback", () => {
            const workflowData = {
                tasks: [
                    {
                        type: "chord",
                        tasks: [{ uuid: "t1" }]
                    }
                ]
            }
            const result = computeWorkflowLayout(workflowData, new Map());
            expect(result.nodes).toHaveLength(1);
            expect(result.nodes[0].id).toBe("t1");
        });

        it("should handle chord callback without uuid", () => {
            const workflowData = {
                tasks: [
                    {
                        type: "chord",
                        tasks: [{ uuid: "t1" }],
                        callback: { display_name: "No UUID" }
                    }
                ]
            }
            const result = computeWorkflowLayout(workflowData, new Map());
            // It will generate a node-X ID for the callback since uuid is missing
            const cb = result.nodes.find(n => n.type === "Callback");
            expect(cb).toBeDefined();
            expect(cb.id).toMatch(/^node-\d+$/);
        });
    });
  });
});
