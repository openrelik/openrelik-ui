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
import {
  calculateTaskMenuWorldPosition,
  calculateOverviewScreenPosition,
  computeCollisionOffsets,
} from "../workflowCanvasUtils";

describe("workflowCanvasUtils", () => {
  describe("calculateTaskMenuWorldPosition", () => {
    const nodes = [
      { id: "node-1", x: 100, y: 100, type: "Input" },
      { id: "node-2", x: 400, y: 100, type: "Task", groupId: "group-1" },
      { id: "node-3", x: 400, y: 220, type: "Task", groupId: "group-1" },
    ];

    it("should return correct position for a parent node (Input type)", () => {
      const result = calculateTaskMenuWorldPosition({
        nodes,
        pendingParentId: "node-1",
      });
      // Input width = 200, gap = 25. 100 + 200 + 25 = 325
      expect(result).toEqual({ x: 325, y: 100 });
    });

    it("should return correct position for a parent node (Task type)", () => {
      const result = calculateTaskMenuWorldPosition({
        nodes,
        pendingParentId: "node-2",
      });
      // Task width = 180, gap = 25. 400 + 180 + 25 = 605
      expect(result).toEqual({ x: 605, y: 100 });
    });

    it("should return correct position for a group", () => {
      const result = calculateTaskMenuWorldPosition({
        nodes,
        pendingGroupId: "group-1",
      });
      // Common X = 400, Max Y = 220, gap = 100. 220 + 100 = 320
      expect(result).toEqual({ x: 400, y: 320 });
    });

    it("should correctly find maxY even if nodes are out of order", () => {
        const unordered = [
            { id: "n1", x: 100, y: 500, groupId: "g1" },
            { id: "n2", x: 100, y: 100, groupId: "g1" }
        ];
        const result = calculateTaskMenuWorldPosition({ nodes: unordered, pendingGroupId: "g1" });
        expect(result.y).toBe(600);
    });

    it("should return correct position for a callback group", () => {
      const result = calculateTaskMenuWorldPosition({
        nodes,
        pendingCallbackGroupId: "group-1",
      });
      // Max X = 400 + 180 = 580. Min Y = 100, Max Y = 220, Mid = 160. Gap X = 50. 580 + 50 = 630
      expect(result).toEqual({ x: 630, y: 160 });
    });

    it("should correctly find min/max in callback group with multiple nodes", () => {
        const unordered = [
            { id: "n1", x: 100, y: 500, groupId: "g1" },
            { id: "n2", x: 100, y: 100, groupId: "g1" },
            { id: "n3", x: 300, y: 300, groupId: "g1" }
        ];
        const result = calculateTaskMenuWorldPosition({ nodes: unordered, pendingCallbackGroupId: "g1" });
        // Max X = 300+180 = 480. Gap = 50 -> 530.
        // Min Y = 100, Max Y = 500. Mid = 300.
        expect(result).toEqual({ x: 530, y: 300 });
    });

    it("should return 0,0 if parent not found", () => {
      const result = calculateTaskMenuWorldPosition({
        nodes,
        pendingParentId: "non-existent",
      });
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("should return 0,0 if pendingGroupId nodes not found", () => {
      const result = calculateTaskMenuWorldPosition({
        nodes: [],
        pendingGroupId: "g1",
      });
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("should return 0,0 if pendingCallbackGroupId nodes not found", () => {
      const result = calculateTaskMenuWorldPosition({
        nodes: [],
        pendingCallbackGroupId: "g1",
      });
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("should return 0,0 if no pending IDs provided", () => {
      const result = calculateTaskMenuWorldPosition({ nodes: [] });
      expect(result).toEqual({ x: 0, y: 0 });
    });
  });

  describe("calculateOverviewScreenPosition", () => {
    const node = { x: 100, y: 100 };
    const rect = { left: 50, top: 50 };
    const viewportWidth = 1000;

    it("should position to the right if there is space", () => {
      const result = calculateOverviewScreenPosition({
        node,
        scale: 1,
        panX: 0,
        panY: 0,
        rect,
        viewportWidth,
      });
      // nodeScreenX = 100*1 + 0 + 50 = 150
      // rightX = 150 + 180 + 20 = 350
      // 350 + 500 <= 1000 is true
      expect(result).toEqual({ x: 350, y: 150 });
    });

    it("should handle null rect by using 0 offset", () => {
      const result = calculateOverviewScreenPosition({
        node,
        scale: 1,
        panX: 0,
        panY: 0,
        rect: null,
        viewportWidth: 1000,
      });
      // nodeScreenX = 100*1 + 0 + 0 = 100
      // rightX = 100 + 180 + 20 = 300
      expect(result).toEqual({ x: 300, y: 100 });
    });

    it("should position to the left if no space on right", () => {
      const result = calculateOverviewScreenPosition({
        node: { x: 800, y: 100 },
        scale: 1,
        panX: 0,
        panY: 0,
        rect,
        viewportWidth,
      });
      // nodeScreenX = 800 + 50 = 850
      // rightX = 850 + 180 + 20 = 1050 (out of bounds)
      // leftX = 850 - 20 - 500 = 330
      // 330 >= 0 is true
      expect(result).toEqual({ x: 330, y: 150 });
    });

    it("should position under if no space on right or left", () => {
      const result = calculateOverviewScreenPosition({
        node: { x: 200, y: 100 },
        scale: 1,
        panX: 0,
        panY: 0,
        rect,
        viewportWidth: 600, // Small viewport
      });
      // nodeScreenX = 200 + 50 = 250
      // rightX = 250 + 180 + 20 = 450 (450 + 500 > 600)
      // leftX = 250 - 20 - 500 = -270 (out of bounds)
      // underX = 250, underY = 150 + 150*1 + 20 = 320 (approx, depending on nodeScreenY)
      // nodeScreenY = 100 + 50 = 150
      // underY = 150 + 150*1 + 20 = 320
      expect(result).toEqual({ x: 250, y: 320 });
    });
  });

  describe("computeCollisionOffsets", () => {
    const nodes = [
      { id: "node-1", x: 100, y: 100, groupId: "group-1" },
      { id: "node-2", x: 100, y: 200, groupId: "group-1" },
      { id: "node-3", x: 100, y: 300, type: "Task" }, // Should be shifted
      { id: "node-4", x: 500, y: 300, type: "Task" }, // Different X, should NOT be shifted
    ];

    it("should shift nodes below expanded group that overlap in X", () => {
      const offsets = computeCollisionOffsets(nodes, "group-1");
      // gMaxY for group-1 is 200. gMaxX is 280. 
      // gMaxY (200) + 100 (node height) = 300.
      // expandedBottom = 300 + 120 + 20 = 440.
      // node-3 Y is 300.
      // shift = 440 + 40 - 300 = 180.
      expect(offsets["node-3"]).toBe(180);
      expect(offsets["node-4"]).toBeUndefined();
    });

    it("should find gMaxY even if nodes are out of order in computeCollisionOffsets", () => {
        const unordered = [
            { id: "g1-1", x: 100, y: 500, groupId: "g1" },
            { id: "g1-2", x: 100, y: 100, groupId: "g1" },
            { id: "target", x: 100, y: 600 }
        ];
        // gMaxY = 500.
        // bottom = 500 + 100 (height) = 600.
        // expandedBottom = 600 + 120 + 20 = 740.
        // shift = 740 + 40 - 600 = 180.
        const offsets = computeCollisionOffsets(unordered, "g1");
        expect(offsets["target"]).toBe(180);
    });

    it("should ensure pushed node does not overlap with expanded group", () => {
        const nodes = [
            { id: "g1", x: 100, y: 100, groupId: "group-1" },
            { id: "n1", x: 100, y: 220, type: "Task" } 
        ];
        // gMaxY = 100. bottom = 200.
        // expandedBottom = 200 + 120 + 20 = 340.
        
        const offsets = computeCollisionOffsets(nodes, "group-1");
        const shift = offsets["n1"];
        
        // New Y = old Y (220) + shift
        const newY = 220 + shift;
        
        // Check gap
        // Gap = newY - expandedBottom
        // Expect gap >= 40
        const gap = newY - 340;
        expect(gap).toBeGreaterThanOrEqual(40);
    });

    it("should return empty map if no nodes in active group", () => {
      const offsets = computeCollisionOffsets(nodes, "non-existent");
      expect(offsets).toEqual({});
    });

    it("should return empty map if no candidates found", () => {
      const smallNodes = [
        { id: "n1", x: 100, y: 100, groupId: "g1" },
        { id: "n2", x: 600, y: 100 } // Far away, no overlap
      ];
      const offsets = computeCollisionOffsets(smallNodes, "g1");
      expect(offsets).toEqual({});
    });

    it("should handle collision when node belongs to a group (targetId = groupId)", () => {
      const groupNodes = [
        { id: "g1-1", x: 100, y: 100, groupId: "g1" },
        { id: "target-1", x: 100, y: 195, groupId: "g2" }, // Ovlerlap in X, Y is near gMaxY
        { id: "target-2", x: 100, y: 220, groupId: "g2" }
      ];
      // gMaxY = 100+100 = 200. expandedBottom = 200+120+20=340.
      // target-1 Y (195) is in collision range.
      const offsets = computeCollisionOffsets(groupNodes, "g1");
      expect(offsets["target-1"]).toBeGreaterThan(0);
      expect(offsets["target-2"]).toBe(offsets["target-1"]);
    });

    it("should use maximum shift if multiple nodes in a group collide", () => {
        const mixNodes = [
            { id: 'g1', x: 100, y: 100, groupId: 'active' },
            { id: 't1', x: 100, y: 220, groupId: 'g2' },
            { id: 't2', x: 100, y: 210, groupId: 'g2' } // Higher up, requires MORE shift, valid candidate (>200)
        ];
        const offsets = computeCollisionOffsets(mixNodes, 'active');
        // gMaxY = 200. expandedBottom = 340.
        // t1 shift = 340 + 40 - 220 = 160.
        // t2 shift = 340 + 40 - 210 = 170.
        // The implementation pushes ALL overlapping nodes by the MAXIMUM required shift for any node in that group/cluster.
        // So both should be shifted by 170.
        expect(offsets['t1']).toBe(170);
        expect(offsets['t2']).toBe(170);
    });
  });
});
