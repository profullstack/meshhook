/**
 * Auto-layout utility for organizing workflow nodes in a hierarchical structure
 * Uses a layered approach based on node dependencies (edges)
 */

const HORIZONTAL_SPACING = 250;
const VERTICAL_SPACING = 150;
const START_X = 100;
const START_Y = 100;

/**
 * Organize nodes in a hierarchical layout based on their connections
 * @param {Array} nodes - Array of workflow nodes
 * @param {Array} edges - Array of workflow edges
 * @returns {Array} - Nodes with updated positions
 */
export function organizeCanvas(nodes, edges) {
	if (!nodes || nodes.length === 0) {
		return nodes;
	}

	// Build adjacency maps
	const { incomingEdges, outgoingEdges } = buildAdjacencyMaps(nodes, edges);

	// Find root nodes (nodes with no incoming edges)
	const rootNodes = nodes.filter(node => !incomingEdges.has(node.id) || incomingEdges.get(node.id).length === 0);

	// If no root nodes found, use the first node as root
	if (rootNodes.length === 0) {
		rootNodes.push(nodes[0]);
	}

	// Assign layers to nodes using BFS
	const nodeLayers = assignLayers(rootNodes, outgoingEdges, nodes);

	// Group nodes by layer
	const layers = groupByLayers(nodeLayers);

	// Calculate positions for each layer
	const positionedNodes = calculatePositions(nodes, layers);

	return positionedNodes;
}

/**
 * Build adjacency maps for incoming and outgoing edges
 */
function buildAdjacencyMaps(nodes, edges) {
	const incomingEdges = new Map();
	const outgoingEdges = new Map();

	// Initialize maps
	nodes.forEach(node => {
		incomingEdges.set(node.id, []);
		outgoingEdges.set(node.id, []);
	});

	// Populate maps
	edges.forEach(edge => {
		if (incomingEdges.has(edge.target)) {
			incomingEdges.get(edge.target).push(edge.source);
		}
		if (outgoingEdges.has(edge.source)) {
			outgoingEdges.get(edge.source).push(edge.target);
		}
	});

	return { incomingEdges, outgoingEdges };
}

/**
 * Assign layer numbers to nodes using BFS
 */
function assignLayers(rootNodes, outgoingEdges, allNodes) {
	const nodeLayers = new Map();
	const visited = new Set();
	const queue = [];

	// Initialize with root nodes at layer 0
	rootNodes.forEach(node => {
		nodeLayers.set(node.id, 0);
		queue.push({ nodeId: node.id, layer: 0 });
		visited.add(node.id);
	});

	// BFS to assign layers
	while (queue.length > 0) {
		const { nodeId, layer } = queue.shift();
		const children = outgoingEdges.get(nodeId) || [];

		children.forEach(childId => {
			if (!visited.has(childId)) {
				visited.add(childId);
				nodeLayers.set(childId, layer + 1);
				queue.push({ nodeId: childId, layer: layer + 1 });
			} else {
				// Update layer if we found a longer path
				const currentLayer = nodeLayers.get(childId);
				if (layer + 1 > currentLayer) {
					nodeLayers.set(childId, layer + 1);
					queue.push({ nodeId: childId, layer: layer + 1 });
				}
			}
		});
	}

	// Assign remaining unvisited nodes to the last layer
	const maxLayer = Math.max(...Array.from(nodeLayers.values()), 0);
	allNodes.forEach(node => {
		if (!nodeLayers.has(node.id)) {
			nodeLayers.set(node.id, maxLayer + 1);
		}
	});

	return nodeLayers;
}

/**
 * Group nodes by their assigned layers
 */
function groupByLayers(nodeLayers) {
	const layers = new Map();

	nodeLayers.forEach((layer, nodeId) => {
		if (!layers.has(layer)) {
			layers.set(layer, []);
		}
		layers.get(layer).push(nodeId);
	});

	return layers;
}

/**
 * Calculate positions for nodes based on their layers
 */
function calculatePositions(nodes, layers) {
	const nodeMap = new Map(nodes.map(node => [node.id, node]));
	const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);

	// Create new array with new node objects to trigger Svelte reactivity
	const updatedNodes = nodes.map(node => {
		const layerNum = Array.from(layers.entries()).find(([_, nodeIds]) =>
			nodeIds.includes(node.id)
		)?.[0];
		
		if (layerNum === undefined) {
			return { ...node };
		}

		const nodesInLayer = layers.get(layerNum);
		const layerIndex = sortedLayers.indexOf(layerNum);
		const indexInLayer = nodesInLayer.indexOf(node.id);
		const layerHeight = nodesInLayer.length;

		// Calculate vertical position to center nodes in the layer
		const totalHeight = (layerHeight - 1) * VERTICAL_SPACING;
		const startY = START_Y - (totalHeight / 2);

		// Return new node object with updated position
		return {
			...node,
			position: {
				x: START_X + (layerIndex * HORIZONTAL_SPACING),
				y: startY + (indexInLayer * VERTICAL_SPACING)
			}
		};
	});

	return updatedNodes;
}

/**
 * Calculate the bounding box of all nodes
 * Useful for centering the view after layout
 */
export function calculateBoundingBox(nodes) {
	if (!nodes || nodes.length === 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	nodes.forEach(node => {
		const x = node.position?.x ?? 0;
		const y = node.position?.y ?? 0;
		
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x + 150); // Approximate node width
		maxY = Math.max(maxY, y + 80);  // Approximate node height
	});

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}