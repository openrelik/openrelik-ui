/*
Copyright 2025 Google LLC

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
      expect(result.edges).toHaveLength(2);
      
      const n1 = result.nodes.find(n => n.id === "node-1");
      const n2 = result.nodes.find(n => n.id === "node-2");

      expect(n1.x).toBe(100);
      expect(n2.x).toBe(420);
    });

    it("should ensure at least 10px gap between group and next node", () => {
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
       
       const result = computeWorkflowLayout(workflowData, new Map());
       
       const nextNode = result.nodes.find(n => n.id === "next-node");
       expect(nextNode).toBeDefined();
       
       // Find the bottom of the chord.
       const chordNodes = result.nodes.filter(n => ["b1", "b2", "cb"].includes(n.id));
       const maxChordY = Math.max(...chordNodes.map(n => n.y)); // Top of lowest node
       const distance = nextNode.y - maxChordY;
       
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
