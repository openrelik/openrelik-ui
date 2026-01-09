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
import { describe, it, expect, vi } from "vitest";
import {
  generateChainTemplate,
  generateGroupTemplate,
  generateChordTemplate,
  generateGroupCallback,
} from "../workflowPatternUtils";

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: () => "mock-uuid-" + Math.random().toString(36).substring(7),
});

describe("workflowPatternUtils", () => {
  describe("generateChainTemplate", () => {
    it("should generate a chain of nodes", () => {
      const { nodes, edges, nextId } = generateChainTemplate(3, 2);
      expect(nodes).toHaveLength(3);
      expect(edges).toHaveLength(3); // node-1 to node-2, node-2 to node-3, node-3 to node-4
      expect(nextId).toBe(5);
    });
  });

  describe("generateGroupTemplate", () => {
    it("should generate a parent and a group of children", () => {
      const { nodes, edges, nextId } = generateGroupTemplate(3, 2);
      expect(nodes).toHaveLength(4); // 1 parent + 3 children
      expect(edges).toHaveLength(4); // node-1 to parent, parent to 3 children
      expect(nextId).toBe(6);
      expect(nodes[1].groupId).toBeDefined();
    });
  });

  describe("generateChordTemplate", () => {
    it("should generate a chord (fans out from node-1, fans in to callback)", () => {
      const { nodes, edges, nextId } = generateChordTemplate(3, 2);
      expect(nodes).toHaveLength(4); // 1 callback + 3 tasks
      // 3 edges from node-1 to tasks, 3 edges from tasks to callback
      expect(edges).toHaveLength(6);
      expect(nextId).toBe(6);
    });
  });

  describe("generateGroupCallback", () => {
    it("should center callback to group nodes", () => {
      const groupNodes = [
        { x: 100, y: 100, id: "n1" },
        { x: 100, y: 300, id: "n2" },
      ];
      const result = generateGroupCallback(groupNodes, null, 10);
      expect(result.node.x).toBe(500); // 100 + 400
      expect(result.node.y).toBe(200); // (100 + 300) / 2
      expect(result.edges).toHaveLength(2);
      expect(result.nextId).toBe(11);
    });

    it("should return null if groupNodes is empty", () => {
      expect(generateGroupCallback(null)).toBeNull();
      expect(generateGroupCallback([])).toBeNull();
    });

    it("should respect taskData in generated callback", () => {
      const nodes = [{ x: 100, y: 100, id: "n1" }];
      const taskData = { display_name: "My Custom Callback", foo: "bar" };
      const result = generateGroupCallback(nodes, taskData, 5);
      expect(result.node.label).toBe("My Custom Callback");
      expect(result.node.data.foo).toBe("bar");
    });

    it("should correctly find min/max in multiple group nodes", () => {
        const nodes = [
            { id: "n1", x: 100, y: 500 },
            { id: "n2", x: 300, y: 100 },
            { id: "n3", x: 200, y: 300 }
        ];
        const result = generateGroupCallback(nodes, null, 1);
        // maxX = 300 -> callbackX = 700
        // minY = 100, maxY = 500 -> midY = 300
        expect(result.node.x).toBe(700);
        expect(result.node.y).toBe(300);
    });
  });
});
