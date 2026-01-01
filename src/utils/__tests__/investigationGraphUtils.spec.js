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
});
