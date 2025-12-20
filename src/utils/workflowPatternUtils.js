/**
 * Utilities to generate workflow patterns.
 * These return raw node and edge configurations.
 */

export const generateChainTemplate = (count = 3, startId = 2) => {
  const nodes = [];
  const edges = [];
  let nextId = startId;
  let prevId = "node-1";

  for (let i = 0; i < count; i++) {
    const id = `node-${nextId++}`;
    nodes.push({
      id,
      x: 100 + (i + 1) * 200,
      y: 300,
      label: `Chain ${nextId - 1}`,
      type: "Task",
      data: {
        uuid: crypto.randomUUID().replaceAll("-", ""),
      }
    });
    edges.push({
      id: `edge-${prevId}-${id}`,
      from: prevId,
      to: id
    });
    prevId = id;
  }
  return { nodes, edges, nextId };
};

export const generateGroupTemplate = (count = 3, startId = 2) => {
  const nodes = [];
  const edges = [];
  let nextId = startId;
  const parentId = `node-${nextId++}`;
  const groupId = `group-${Date.now()}`;

  nodes.push({
    id: parentId,
    x: 100,
    y: 300,
    label: `Parent ${nextId - 1}`,
    type: "Task",
    data: {
      uuid: crypto.randomUUID().replaceAll("-", ""),
    }
  });
  edges.push({
    id: `edge-node-1-${parentId}`,
    from: "node-1",
    to: parentId
  });

  for (let i = 0; i < count; i++) {
    const childId = `node-${nextId++}`;
    nodes.push({
      id: childId,
      x: 400,
      y: 100 + i * 120,
      label: `Worker ${nextId - 1}`,
      type: "Task",
      groupId,
      data: {
        uuid: crypto.randomUUID().replaceAll("-", ""),
      }
    });
    edges.push({
      id: `edge-${parentId}-${childId}`,
      from: parentId,
      to: childId
    });
  }
  return { nodes, edges, nextId };
};

export const generateChordTemplate = (count = 3, startId = 2) => {
  const nodes = [];
  const edges = [];
  let nextId = startId;
  const callbackId = `node-${nextId++}`;
  const groupId = `group-${Date.now()}`;

  nodes.push({
    id: callbackId,
    x: 600,
    y: 300,
    label: `Callback ${nextId - 1}`,
    type: "Callback",
    data: {
      uuid: crypto.randomUUID().replaceAll("-", ""),
    }
  });

  for (let i = 0; i < count; i++) {
    const taskId = `node-${nextId++}`;
    nodes.push({
      id: taskId,
      x: 200,
      y: 100 + i * 120,
      label: `Task ${nextId - 1}`,
      type: "Task",
      groupId,
      data: {
        uuid: crypto.randomUUID().replaceAll("-", ""),
      }
    });
    edges.push({
      id: `edge-${taskId}-${callbackId}`,
      from: taskId,
      to: callbackId
    });
    // For chord template, we usually connect node-1 to these tasks
    edges.push({
      id: `edge-node-1-${taskId}`,
      from: "node-1",
      to: taskId
    });
  }
  return { nodes, edges, nextId };
};

export const generateGroupCallback = (groupNodes, taskData = null, startId) => {
  if (!groupNodes || groupNodes.length === 0) return null;

  // Determine position for new callback node (right of group, centered vertically)
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  groupNodes.forEach((n) => {
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  });

  // Mid Y point
  const midY = (minY + maxY) / 2;
  const callbackX = maxX + 400; // Far enough to the right

  const callbackId = `node-${startId}`;
  const label = taskData ? taskData.display_name : `Callback ${startId}`;

  const newNode = {
    id: callbackId,
    x: callbackX,
    y: midY,
    label,
    type: "Callback",
    data: {
      uuid: crypto.randomUUID().replaceAll("-", ""),
      ...(taskData || {}),
    },
  };

  const edges = groupNodes.map((n) => ({
    id: `edge-${n.id}-${callbackId}`,
    from: n.id,
    to: callbackId,
  }));

  return { node: newNode, edges, nextId: startId + 1 };
};
