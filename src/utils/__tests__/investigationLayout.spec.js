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
import { Graph } from "../investigationGraphUtils";
import { calculateLayout } from "../investigationLayout";

describe("investigationLayout", () => {
  it("should handle empty graph", () => {
    const graph = new Graph();
    const result = calculateLayout(graph);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.width).toBe(0);
  });

  it("should layout a single node", () => {
    const graph = new Graph();
    graph.addNode("root", { label: "Root" });

    const result = calculateLayout(graph);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].x).toBe(0);
    expect(result.nodes[0].y).toBe(0);
  });

  it("should layout a parent with children", () => {
    const graph = new Graph();
    graph.addNode("root", { label: "Root" });
    graph.addNode("child1", { label: "Child 1" });
    graph.addNode("child2", { label: "Child 2" });
    graph.addEdge("root", "child1");
    graph.addEdge("root", "child2");

    const result = calculateLayout(graph);
    
    expect(result.nodes).toHaveLength(3);
    const root = result.nodes.find(n => n.id === "root");
    const child1 = result.nodes.find(n => n.id === "child1");
    const child2 = result.nodes.find(n => n.id === "child2");
    expect(root.x).toBe(0);
    expect(child1.x).toBeGreaterThan(0);
    expect(child2.x).toBe(child1.x);
    expect(child1.y).not.toBe(child2.y);
    expect(root.y).toBeGreaterThanOrEqual(Math.min(child1.y, child2.y));
    expect(root.y).toBeLessThanOrEqual(Math.max(child1.y, child2.y));
    expect(result.edges).toHaveLength(2);
  });
});
