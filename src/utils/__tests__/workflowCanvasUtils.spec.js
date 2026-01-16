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
      expect(result).toEqual({ x: 325, y: 100 });
    });

    it("should return correct position for a parent node (Task type)", () => {
      const result = calculateTaskMenuWorldPosition({
        nodes,
        pendingParentId: "node-2",
      });
      expect(result).toEqual({ x: 605, y: 100 });
    });

    it("should return correct position for a group", () => {
      const result = calculateTaskMenuWorldPosition({
        nodes,
        pendingGroupId: "group-1",
      });
      expect(result).toEqual({ x: 400, y: 320 });
    });

    it("should correctly find maxY even if nodes are out of order", () => {
      const unordered = [
        { id: "n1", x: 100, y: 500, groupId: "g1" },
        { id: "n2", x: 100, y: 100, groupId: "g1" },
      ];
      const result = calculateTaskMenuWorldPosition({
        nodes: unordered,
        pendingGroupId: "g1",
      });
      expect(result.y).toBe(600);
    });

    it("should return correct position for a callback group", () => {
      const result = calculateTaskMenuWorldPosition({
        nodes,
        pendingCallbackGroupId: "group-1",
      });
      expect(result).toEqual({ x: 630, y: 160 });
    });

    it("should correctly find min/max in callback group with multiple nodes", () => {
      const unordered = [
        { id: "n1", x: 100, y: 500, groupId: "g1" },
        { id: "n2", x: 100, y: 100, groupId: "g1" },
        { id: "n3", x: 300, y: 300, groupId: "g1" },
      ];
      const result = calculateTaskMenuWorldPosition({
        nodes: unordered,
        pendingCallbackGroupId: "g1",
      });
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
    const viewportHeight = 800;

    it("should position to the right if there is space", () => {
      const result = calculateOverviewScreenPosition({
        node,
        scale: 1,
        panX: 0,
        panY: 0,
        rect,
        viewportWidth,
        viewportHeight,
      });
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
        viewportHeight: 800,
      });
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
        viewportHeight,
      });
      expect(result).toEqual({ x: 330, y: 150 });
    });

    it("should position under if no space on right or left", () => {
      const result = calculateOverviewScreenPosition({
        node: { x: 200, y: 100 },
        scale: 1,
        panX: 0,
        panY: 0,
        rect,
        viewportWidth: 600,
        viewportHeight: 800,
      });
      expect(result).toEqual({ x: 90, y: 290 });
    });

    it("should clamp Y position when node is at bottom of screen", () => {
      const result = calculateOverviewScreenPosition({
        node: { x: 100, y: 600 },
        scale: 1,
        panX: 0,
        panY: 0,
        rect,
        viewportWidth,
        viewportHeight,
      });
      expect(result.y).toBe(290);
    });

    it("should clamp Y position when node is at top of screen", () => {
      const result = calculateOverviewScreenPosition({
        node: { x: 100, y: -100 },
        scale: 1,
        panX: 0,
        panY: 0,
        rect,
        viewportWidth,
        viewportHeight,
      });
      expect(result.y).toBe(10);
    });
  });

  describe("computeCollisionOffsets", () => {
    const nodes = [
      { id: "node-1", x: 100, y: 100, groupId: "group-1" },
      { id: "node-2", x: 100, y: 200, groupId: "group-1" },
      { id: "node-3", x: 100, y: 300, type: "Task" },
      { id: "node-4", x: 500, y: 300, type: "Task" },
    ];

    it("should shift nodes below expanded group that overlap in X", () => {
      const offsets = computeCollisionOffsets(nodes, "group-1");
      expect(offsets["node-3"]).toBe(190);
      expect(offsets["node-4"]).toBeUndefined();
    });

    it("should find gMaxY even if nodes are out of order in computeCollisionOffsets", () => {
      const unordered = [
        { id: "g1-1", x: 100, y: 500, groupId: "g1" },
        { id: "g1-2", x: 100, y: 100, groupId: "g1" },
        { id: "target", x: 100, y: 600 },
      ];
      const offsets = computeCollisionOffsets(unordered, "g1");
      expect(offsets["target"]).toBe(190);
    });

    it("should ensure pushed node does not overlap with expanded group", () => {
      const nodes = [
        { id: "g1", x: 100, y: 100, groupId: "group-1" },
        { id: "n1", x: 100, y: 220, type: "Task" },
      ];
      const offsets = computeCollisionOffsets(nodes, "group-1");
      const shift = offsets["n1"];
      const newY = 220 + shift;

      const gap = newY - 340;
      expect(gap).toBeGreaterThanOrEqual(50);
    });

    it("should return empty map if no nodes in active group", () => {
      const offsets = computeCollisionOffsets(nodes, "non-existent");
      expect(offsets).toEqual({});
    });

    it("should return empty map if no candidates found", () => {
      const smallNodes = [
        { id: "n1", x: 100, y: 100, groupId: "g1" },
        { id: "n2", x: 600, y: 100 },
      ];
      const offsets = computeCollisionOffsets(smallNodes, "g1");
      expect(offsets).toEqual({});
    });

    it("should handle collision when node belongs to a group (targetId = groupId)", () => {
      const groupNodes = [
        { id: "g1-1", x: 100, y: 100, groupId: "g1" },
        { id: "target-1", x: 100, y: 195, groupId: "g2" },
        { id: "target-2", x: 100, y: 220, groupId: "g2" },
      ];
      const offsets = computeCollisionOffsets(groupNodes, "g1");
      expect(offsets["target-1"]).toBeGreaterThan(0);
      expect(offsets["target-2"]).toBe(offsets["target-1"]);
    });

    it("should use maximum shift if multiple nodes in a group collide", () => {
      const mixNodes = [
        { id: "g1", x: 100, y: 100, groupId: "active" },
        { id: "t1", x: 100, y: 220, groupId: "g2" },
        { id: "t2", x: 100, y: 210, groupId: "g2" },
      ];
      const offsets = computeCollisionOffsets(mixNodes, "active");
      expect(offsets["t1"]).toBe(180);
      expect(offsets["t2"]).toBe(180);
    });
  });
});
