/**
 * Container Utilities
 * 
 * Helper functions for working with loop container nodes in workflows.
 * Provides utilities for checking containment, validating edges, and managing
 * parent-child relationships between containers and nodes.
 */

/**
 * Check if a node is inside a container
 * @param {Object} node - Node to check
 * @param {Object} container - Container node
 * @returns {boolean}
 */
export function isNodeInContainer(node, container) {
	return node.data?.parentContainer === container.id;
}

/**
 * Get the bounding box of a container
 * @param {Object} container - Container node
 * @returns {Object} Bounds { x, y, width, height }
 */
export function getContainerBounds(container) {
	return {
		x: container.position.x,
		y: container.position.y,
		width: container.data.dimensions?.width || 600,
		height: container.data.dimensions?.height || 400
	};
}

/**
 * Check if a position is inside a container's bounds
 * @param {Object} position - Position { x, y }
 * @param {Object} container - Container node
 * @returns {boolean}
 */
export function isPositionInContainer(position, container) {
	const bounds = getContainerBounds(container);
	return (
		position.x >= bounds.x &&
		position.x <= bounds.x + bounds.width &&
		position.y >= bounds.y &&
		position.y <= bounds.y + bounds.height
	);
}

/**
 * Get all child nodes of a container
 * @param {Object} container - Container node
 * @param {Array} allNodes - All nodes in the workflow
 * @returns {Array} Child nodes
 */
export function getChildNodes(container, allNodes) {
	const childIds = container.data.childNodes || [];
	return allNodes.filter(node => childIds.includes(node.id));
}

/**
 * Get the parent container of a node
 * @param {Object} node - Node to check
 * @param {Array} allNodes - All nodes in the workflow
 * @returns {Object|null} Parent container or null
 */
export function getParentContainer(node, allNodes) {
	if (!node.data?.parentContainer) return null;
	return allNodes.find(n => n.id === node.data.parentContainer) || null;
}

/**
 * Check if an edge is valid for container nodes
 * @param {Object} edge - Edge to validate
 * @param {Array} nodes - All nodes in the workflow
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
export function validateContainerEdge(edge, nodes) {
	const sourceNode = nodes.find(n => n.id === edge.source);
	const targetNode = nodes.find(n => n.id === edge.target);
	
	if (!sourceNode || !targetNode) {
		return { valid: false, error: 'Source or target node not found' };
	}
	
	// Get parent containers
	const sourceContainer = getParentContainer(sourceNode, nodes);
	const targetContainer = getParentContainer(targetNode, nodes);
	
	// Rule 1: Cannot connect from inside a container to outside
	// (except if source is the container itself)
	if (sourceContainer && !targetContainer && !sourceNode.data?.isContainer) {
		return {
			valid: false,
			error: 'Cannot connect from inside a container to outside. Connect from the container output instead.'
		};
	}
	
	// Rule 2: Cannot connect from outside to inside a container
	// (except if target is the container itself)
	if (!sourceContainer && targetContainer && !targetNode.data?.isContainer) {
		return {
			valid: false,
			error: 'Cannot connect from outside to inside a container. Connect to the container input instead.'
		};
	}
	
	// Rule 3: Nodes in different containers cannot be connected
	if (sourceContainer && targetContainer && sourceContainer.id !== targetContainer.id) {
		return {
			valid: false,
			error: 'Cannot connect nodes in different containers'
		};
	}
	
	return { valid: true };
}

/**
 * Get the execution order of nodes inside a container
 * Uses topological sort to determine the correct execution sequence
 * @param {Object} container - Container node
 * @param {Array} allNodes - All nodes in the workflow
 * @param {Array} allEdges - All edges in the workflow
 * @returns {Array} Ordered array of node IDs
 */
export function getContainerExecutionOrder(container, allNodes, allEdges) {
	const childNodes = getChildNodes(container, allNodes);
	const childIds = new Set(childNodes.map(n => n.id));
	
	// Filter edges that are inside the container
	const internalEdges = allEdges.filter(edge =>
		childIds.has(edge.source) && childIds.has(edge.target)
	);
	
	// Topological sort
	return topologicalSort(childNodes, internalEdges);
}

/**
 * Topological sort for nodes based on edges
 * @param {Array} nodes - Nodes to sort
 * @param {Array} edges - Edges defining dependencies
 * @returns {Array} Sorted array of nodes
 */
function topologicalSort(nodes, edges) {
	// Build adjacency list and in-degree map
	const adjacencyList = new Map();
	const inDegree = new Map();
	
	// Initialize
	for (const node of nodes) {
		adjacencyList.set(node.id, []);
		inDegree.set(node.id, 0);
	}
	
	// Build graph
	for (const edge of edges) {
		adjacencyList.get(edge.source).push(edge.target);
		inDegree.set(edge.target, inDegree.get(edge.target) + 1);
	}
	
	// Find nodes with no incoming edges
	const queue = [];
	for (const [nodeId, degree] of inDegree.entries()) {
		if (degree === 0) {
			queue.push(nodeId);
		}
	}
	
	// Process queue
	const sorted = [];
	while (queue.length > 0) {
		const nodeId = queue.shift();
		sorted.push(nodes.find(n => n.id === nodeId));
		
		// Reduce in-degree for neighbors
		for (const neighborId of adjacencyList.get(nodeId)) {
			inDegree.set(neighborId, inDegree.get(neighborId) - 1);
			if (inDegree.get(neighborId) === 0) {
				queue.push(neighborId);
			}
		}
	}
	
	// Check for cycles
	if (sorted.length !== nodes.length) {
		throw new Error('Cycle detected in container nodes');
	}
	
	return sorted;
}

/**
 * Find all containers in a workflow
 * @param {Array} nodes - All nodes in the workflow
 * @returns {Array} Container nodes
 */
export function findContainers(nodes) {
	return nodes.filter(node => node.data?.isContainer);
}

/**
 * Check if a node is a container
 * @param {Object} node - Node to check
 * @returns {boolean}
 */
export function isContainer(node) {
	return node.data?.isContainer === true;
}

/**
 * Validate all container relationships in a workflow
 * @param {Array} nodes - All nodes in the workflow
 * @param {Array} edges - All edges in the workflow
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
export function validateContainerWorkflow(nodes, edges) {
	const errors = [];
	
	// Validate each container
	const containers = findContainers(nodes);
	for (const container of containers) {
		// Check that all child nodes exist
		const childIds = container.data.childNodes || [];
		for (const childId of childIds) {
			const childNode = nodes.find(n => n.id === childId);
			if (!childNode) {
				errors.push(`Container ${container.id} references non-existent child node ${childId}`);
			} else if (childNode.data?.parentContainer !== container.id) {
				errors.push(`Child node ${childId} does not reference parent container ${container.id}`);
			}
		}
	}
	
	// Validate each edge
	for (const edge of edges) {
		const validation = validateContainerEdge(edge, nodes);
		if (!validation.valid) {
			errors.push(`Edge ${edge.id}: ${validation.error}`);
		}
	}
	
	return {
		valid: errors.length === 0,
		errors
	};
}