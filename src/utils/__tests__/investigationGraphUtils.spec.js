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
import { describe, it, expect } from 'vitest';
import { Graph } from '../investigationGraphUtils';

describe('investigationGraphUtils', () => {
  it('should add nodes correctly', () => {
    const graph = new Graph();
    graph.addNode('1', { label: 'Node 1' });
    expect(graph.getNode('1')).toEqual({ id: '1', label: 'Node 1' });
  });

  it('should add edges and track children', () => {
    const graph = new Graph();
    graph.addNode('parent', { label: 'Parent' });
    graph.addNode('child', { label: 'Child' });
    graph.addEdge('parent', 'child');

    const children = graph.getChildren('parent');
    expect(children).toHaveLength(1);
    expect(children[0].id).toBe('child');
    
    // Check root tracking
    // 'parent' should be a root, 'child' should not
    expect(graph.roots.has('parent')).toBe(true);
    expect(graph.roots.has('child')).toBe(false);
  });

  it('should convert to tree structure', () => {
    const graph = new Graph();
    // Q -> L -> H -> T
    graph.addNode('q1', { type: 'QUESTION' });
    graph.addNode('l1', { type: 'SECTION' }); // Lead
    graph.addNode('h1', { type: 'HYPOTHESIS' });
    graph.addNode('t1', { type: 'TASK' });

    graph.addEdge('q1', 'l1');
    graph.addEdge('l1', 'h1');
    graph.addEdge('h1', 't1');

    const tree = graph.toTree();
    expect(tree).toHaveLength(1); // One root (q1)
    
    const root = tree[0];
    expect(root.id).toBe('q1');
    expect(root.children).toHaveLength(1);
    expect(root.children[0].id).toBe('l1');
    expect(root.children[0].children[0].id).toBe('h1');
    expect(root.children[0].children[0].children[0].id).toBe('t1');
  });

  it('should handle orphans (multiple roots)', () => {
    const graph = new Graph();
    graph.addNode('q1', { type: 'QUESTION' });
    graph.addNode('h_orphan', { type: 'HYPOTHESIS' });

    const tree = graph.toTree();
    expect(tree).toHaveLength(2);
  });

  it('should track parents', () => {
    const graph = new Graph();
    graph.addEdge('parent', 'child');
    
    const parents = graph.getParents('child');
    expect(parents).toHaveLength(1);
    expect(parents[0].id).toBe('parent');
  });

  it('should merge data when adding existing node', () => {
    const graph = new Graph();
    graph.addNode('1', { label: 'Initial' });
    graph.addNode('1', { type: 'UPDATED' });
    
    expect(graph.getNode('1')).toEqual({ id: '1', label: 'Initial', type: 'UPDATED' });
  });

  it('should create implicit nodes when adding edge', () => {
    const graph = new Graph();
    // Implicitly add 'a' and 'b'
    graph.addEdge('a', 'b');
    
    expect(graph.getNode('a')).toBeDefined();
    expect(graph.getNode('b')).toBeDefined();
    expect(graph.edges.get('a').has('b')).toBe(true);
  });

  it('should return empty arrays for unknown nodes in getters', () => {
    const graph = new Graph();
    expect(graph.getParents('unknown')).toEqual([]);
    expect(graph.getChildren('unknown')).toEqual([]);
  });

  it('should convert to tree from specific root', () => {
    const graph = new Graph();
    graph.addEdge('root', 'child');
    graph.addEdge('other', 'child2');
    
    const tree = graph.toTree('root');
    // specific root returns object, not array
    expect(tree.id).toBe('root');
    expect(tree.children[0].id).toBe('child');
  });
});
