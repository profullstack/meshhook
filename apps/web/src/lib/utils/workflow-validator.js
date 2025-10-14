/**
 * Workflow validation utilities
 * Validates DAG structure, node configurations, and connections
 */

import { validateContainerWorkflow } from './container-utils.js';

/**
 * Validate entire workflow
 * @param {Object} workflow - Workflow object with nodes and edges
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateWorkflow(workflow) {
	const errors = [];

	if (!workflow) {
		return { isValid: false, errors: ['Workflow is required'] };
	}

	const { nodes = [], edges = [] } = workflow;

	// Check if workflow has nodes
	if (nodes.length === 0) {
		errors.push('Workflow must have at least one node');
	}

	// Validate nodes
	const nodeErrors = validateNodes(nodes);
	errors.push(...nodeErrors);

	// Validate edges
	const edgeErrors = validateEdges(edges, nodes);
	errors.push(...edgeErrors);

	// Validate container relationships
	const containerValidation = validateContainerWorkflow(nodes, edges);
	if (!containerValidation.valid) {
		errors.push(...containerValidation.errors);
	}

	// Check for cycles
	const cycleErrors = detectCycles(nodes, edges);
	errors.push(...cycleErrors);

	// Check for disconnected nodes
	const disconnectedErrors = findDisconnectedNodes(nodes, edges);
	errors.push(...disconnectedErrors);

	// Check for trigger node
	const triggerErrors = validateTriggerNode(nodes, edges);
	errors.push(...triggerErrors);

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Validate individual nodes
 * @param {Array} nodes - Array of workflow nodes
 * @returns {Array} Array of error messages
 */
export function validateNodes(nodes) {
	const errors = [];
	const nodeIds = new Set();

	nodes.forEach((node, index) => {
		// Check for duplicate IDs
		if (nodeIds.has(node.id)) {
			errors.push(`Duplicate node ID: ${node.id}`);
		}
		nodeIds.add(node.id);

		// Check required fields
		if (!node.id) {
			errors.push(`Node at index ${index} is missing an ID`);
		}

		if (!node.type) {
			errors.push(`Node ${node.id || index} is missing a type`);
		}

		// Validate node configuration
		if (node.data?.config) {
			const configErrors = validateNodeConfig(node);
			errors.push(...configErrors);
		}
	});

	return errors;
}

/**
 * Validate node configuration based on type
 * @param {Object} node - Node object
 * @returns {Array} Array of error messages
 */
export function validateNodeConfig(node) {
	const errors = [];
	const { type, data } = node;
	const config = data?.config || {};

	switch (type) {
		case 'httpCall':
			if (!config.url) {
				errors.push(`Node ${node.id}: URL is required for HTTP Call`);
			} else if (!isValidUrl(config.url)) {
				errors.push(`Node ${node.id}: Invalid URL format`);
			}
			if (!config.method) {
				errors.push(`Node ${node.id}: HTTP method is required`);
			}
			break;

		case 'transform':
			if (!config.expression) {
				errors.push(`Node ${node.id}: JMESPath expression is required for Transform`);
			}
			break;

		case 'delay':
			if (!config.duration || config.duration < 0) {
				errors.push(`Node ${node.id}: Valid duration is required for Delay`);
			}
			break;

		case 'conditional':
			if (!config.condition) {
				errors.push(`Node ${node.id}: Condition is required for Conditional`);
			}
			break;

		case 'loopContainer':
		case 'loop':
			if (!config.items) {
				errors.push(`Node ${node.id}: Items expression is required for Loop`);
			}
			// Validate container-specific properties
			if (data?.isContainer) {
				if (!data.dimensions || !data.dimensions.width || !data.dimensions.height) {
					errors.push(`Node ${node.id}: Container dimensions are required`);
				}
				if (!Array.isArray(data.childNodes)) {
					errors.push(`Node ${node.id}: Container must have childNodes array`);
				}
			}
			break;
	}

	return errors;
}

/**
 * Validate edges/connections
 * @param {Array} edges - Array of edges
 * @param {Array} nodes - Array of nodes
 * @returns {Array} Array of error messages
 */
export function validateEdges(edges, nodes) {
	const errors = [];
	const nodeIds = new Set(nodes.map((n) => n.id));

	edges.forEach((edge, index) => {
		// Check required fields
		if (!edge.source) {
			errors.push(`Edge at index ${index} is missing source`);
		}
		if (!edge.target) {
			errors.push(`Edge at index ${index} is missing target`);
		}

		// Check if source and target nodes exist
		if (edge.source && !nodeIds.has(edge.source)) {
			errors.push(`Edge ${edge.id || index}: Source node ${edge.source} does not exist`);
		}
		if (edge.target && !nodeIds.has(edge.target)) {
			errors.push(`Edge ${edge.id || index}: Target node ${edge.target} does not exist`);
		}

		// Check for self-loops
		if (edge.source === edge.target) {
			errors.push(`Edge ${edge.id || index}: Node cannot connect to itself`);
		}
	});

	return errors;
}

/**
 * Detect cycles in the workflow DAG
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @returns {Array} Array of error messages
 */
export function detectCycles(nodes, edges) {
	const errors = [];
	const adjacencyList = buildAdjacencyList(nodes, edges);
	const visited = new Set();
	const recursionStack = new Set();

	function hasCycle(nodeId, path = []) {
		if (recursionStack.has(nodeId)) {
			const cycle = [...path, nodeId].join(' → ');
			errors.push(`Cycle detected: ${cycle}`);
			return true;
		}

		if (visited.has(nodeId)) {
			return false;
		}

		visited.add(nodeId);
		recursionStack.add(nodeId);

		const neighbors = adjacencyList.get(nodeId) || [];
		for (const neighbor of neighbors) {
			if (hasCycle(neighbor, [...path, nodeId])) {
				return true;
			}
		}

		recursionStack.delete(nodeId);
		return false;
	}

	// Check each node for cycles
	for (const node of nodes) {
		if (!visited.has(node.id)) {
			hasCycle(node.id);
		}
	}

	return errors;
}

/**
 * Find disconnected nodes (nodes with no incoming or outgoing edges)
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @returns {Array} Array of error messages
 */
export function findDisconnectedNodes(nodes, edges) {
	const errors = [];

	if (nodes.length === 0) {
		return errors;
	}

	const connectedNodes = new Set();
	edges.forEach((edge) => {
		connectedNodes.add(edge.source);
		connectedNodes.add(edge.target);
	});

	// Allow single node workflows (trigger only)
	if (nodes.length === 1) {
		return errors;
	}

	nodes.forEach((node) => {
		if (!connectedNodes.has(node.id)) {
			errors.push(`Node ${node.id} (${node.data?.label || node.type}) is not connected`);
		}
	});

	return errors;
}

/**
 * Validate that workflow has at least one trigger node
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @returns {Array} Array of error messages
 */
export function validateTriggerNode(nodes, edges) {
	const errors = [];

	// Find nodes with no incoming edges (potential triggers)
	const nodesWithIncoming = new Set(edges.map((e) => e.target));
	const triggerNodes = nodes.filter((node) => !nodesWithIncoming.has(node.id));

	if (triggerNodes.length === 0 && nodes.length > 0) {
		errors.push('Workflow must have at least one trigger node (node with no incoming connections)');
	}

	return errors;
}

/**
 * Build adjacency list from nodes and edges
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @returns {Map} Adjacency list
 */
function buildAdjacencyList(nodes, edges) {
	const adjacencyList = new Map();

	// Initialize with all nodes
	nodes.forEach((node) => {
		adjacencyList.set(node.id, []);
	});

	// Add edges
	edges.forEach((edge) => {
		if (adjacencyList.has(edge.source)) {
			adjacencyList.get(edge.source).push(edge.target);
		}
	});

	return adjacencyList;
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}