/**
 * Container Utilities Tests
 * Testing Framework: Vitest
 */

import { describe, it, expect } from 'vitest';
import {
	isNodeInContainer,
	getContainerBounds,
	isPositionInContainer,
	getChildNodes,
	getParentContainer,
	validateContainerEdge,
	getContainerExecutionOrder,
	findContainers,
	isContainer,
	validateContainerWorkflow
} from './container-utils.js';

describe('Container Utilities', () => {
	describe('isNodeInContainer', () => {
		it('should return true if node has parentContainer matching container id', () => {
			const node = { id: 'child-1', data: { parentContainer: 'loop-1' } };
			const container = { id: 'loop-1' };
			
			expect(isNodeInContainer(node, container)).toBe(true);
		});
		
		it('should return false if node has different parentContainer', () => {
			const node = { id: 'child-1', data: { parentContainer: 'loop-2' } };
			const container = { id: 'loop-1' };
			
			expect(isNodeInContainer(node, container)).toBe(false);
		});
		
		it('should return false if node has no parentContainer', () => {
			const node = { id: 'child-1', data: {} };
			const container = { id: 'loop-1' };
			
			expect(isNodeInContainer(node, container)).toBe(false);
		});
	});
	
	describe('getContainerBounds', () => {
		it('should return bounds with default dimensions', () => {
			const container = {
				id: 'loop-1',
				position: { x: 100, y: 200 },
				data: {}
			};
			
			const bounds = getContainerBounds(container);
			
			expect(bounds).toEqual({
				x: 100,
				y: 200,
				width: 600,
				height: 400
			});
		});
		
		it('should return bounds with custom dimensions', () => {
			const container = {
				id: 'loop-1',
				position: { x: 100, y: 200 },
				data: {
					dimensions: { width: 800, height: 600 }
				}
			};
			
			const bounds = getContainerBounds(container);
			
			expect(bounds).toEqual({
				x: 100,
				y: 200,
				width: 800,
				height: 600
			});
		});
	});
	
	describe('isPositionInContainer', () => {
		const container = {
			id: 'loop-1',
			position: { x: 100, y: 200 },
			data: { dimensions: { width: 600, height: 400 } }
		};
		
		it('should return true for position inside container', () => {
			expect(isPositionInContainer({ x: 300, y: 400 }, container)).toBe(true);
		});
		
		it('should return false for position outside container (left)', () => {
			expect(isPositionInContainer({ x: 50, y: 400 }, container)).toBe(false);
		});
		
		it('should return false for position outside container (right)', () => {
			expect(isPositionInContainer({ x: 750, y: 400 }, container)).toBe(false);
		});
		
		it('should return false for position outside container (above)', () => {
			expect(isPositionInContainer({ x: 300, y: 150 }, container)).toBe(false);
		});
		
		it('should return false for position outside container (below)', () => {
			expect(isPositionInContainer({ x: 300, y: 650 }, container)).toBe(false);
		});
		
		it('should return true for position on container edge', () => {
			expect(isPositionInContainer({ x: 100, y: 200 }, container)).toBe(true);
			expect(isPositionInContainer({ x: 700, y: 600 }, container)).toBe(true);
		});
	});
	
	describe('getChildNodes', () => {
		it('should return child nodes by ID', () => {
			const container = {
				id: 'loop-1',
				data: { childNodes: ['webhook-1', 'transform-1'] }
			};
			const allNodes = [
				{ id: 'http-1' },
				{ id: 'webhook-1' },
				{ id: 'transform-1' },
				{ id: 'output-1' }
			];
			
			const children = getChildNodes(container, allNodes);
			
			expect(children).toHaveLength(2);
			expect(children.map(n => n.id)).toEqual(['webhook-1', 'transform-1']);
		});
		
		it('should return empty array if no childNodes', () => {
			const container = { id: 'loop-1', data: {} };
			const allNodes = [{ id: 'http-1' }];
			
			const children = getChildNodes(container, allNodes);
			
			expect(children).toEqual([]);
		});
	});
	
	describe('getParentContainer', () => {
		it('should return parent container', () => {
			const node = { id: 'webhook-1', data: { parentContainer: 'loop-1' } };
			const allNodes = [
				{ id: 'loop-1', data: { isContainer: true } },
				{ id: 'webhook-1', data: { parentContainer: 'loop-1' } }
			];
			
			const parent = getParentContainer(node, allNodes);
			
			expect(parent).toBeDefined();
			expect(parent.id).toBe('loop-1');
		});
		
		it('should return null if no parent', () => {
			const node = { id: 'webhook-1', data: {} };
			const allNodes = [{ id: 'webhook-1' }];
			
			const parent = getParentContainer(node, allNodes);
			
			expect(parent).toBeNull();
		});
	});
	
	describe('validateContainerEdge', () => {
		const nodes = [
			{ id: 'http-1', data: {} },
			{ id: 'loop-1', data: { isContainer: true, childNodes: ['webhook-1'] } },
			{ id: 'webhook-1', data: { parentContainer: 'loop-1' } },
			{ id: 'output-1', data: {} }
		];
		
		it('should allow edge from outside to container', () => {
			const edge = { source: 'http-1', target: 'loop-1' };
			const result = validateContainerEdge(edge, nodes);
			
			expect(result.valid).toBe(true);
		});
		
		it('should allow edge from container to outside', () => {
			const edge = { source: 'loop-1', target: 'output-1' };
			const result = validateContainerEdge(edge, nodes);
			
			expect(result.valid).toBe(true);
		});
		
		it('should reject edge from inside container to outside', () => {
			const edge = { source: 'webhook-1', target: 'output-1' };
			const result = validateContainerEdge(edge, nodes);
			
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Cannot connect from inside a container to outside');
		});
		
		it('should reject edge from outside to inside container', () => {
			const edge = { source: 'http-1', target: 'webhook-1' };
			const result = validateContainerEdge(edge, nodes);
			
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Cannot connect from outside to inside a container');
		});
	});
	
	describe('getContainerExecutionOrder', () => {
		it('should return nodes in topological order', () => {
			const container = {
				id: 'loop-1',
				data: { childNodes: ['webhook-1', 'transform-1', 'http-2'] }
			};
			const allNodes = [
				{ id: 'loop-1' },
				{ id: 'webhook-1' },
				{ id: 'transform-1' },
				{ id: 'http-2' }
			];
			const allEdges = [
				{ source: 'webhook-1', target: 'transform-1' },
				{ source: 'transform-1', target: 'http-2' }
			];
			
			const order = getContainerExecutionOrder(container, allNodes, allEdges);
			
			expect(order).toHaveLength(3);
			expect(order[0].id).toBe('webhook-1');
			expect(order[1].id).toBe('transform-1');
			expect(order[2].id).toBe('http-2');
		});
		
		it('should handle nodes with no connections', () => {
			const container = {
				id: 'loop-1',
				data: { childNodes: ['webhook-1', 'transform-1'] }
			};
			const allNodes = [
				{ id: 'loop-1' },
				{ id: 'webhook-1' },
				{ id: 'transform-1' }
			];
			const allEdges = [];
			
			const order = getContainerExecutionOrder(container, allNodes, allEdges);
			
			expect(order).toHaveLength(2);
		});
	});
	
	describe('findContainers', () => {
		it('should find all container nodes', () => {
			const nodes = [
				{ id: 'http-1', data: {} },
				{ id: 'loop-1', data: { isContainer: true } },
				{ id: 'webhook-1', data: {} },
				{ id: 'loop-2', data: { isContainer: true } }
			];
			
			const containers = findContainers(nodes);
			
			expect(containers).toHaveLength(2);
			expect(containers.map(c => c.id)).toEqual(['loop-1', 'loop-2']);
		});
	});
	
	describe('isContainer', () => {
		it('should return true for container nodes', () => {
			const node = { id: 'loop-1', data: { isContainer: true } };
			expect(isContainer(node)).toBe(true);
		});
		
		it('should return false for non-container nodes', () => {
			const node = { id: 'webhook-1', data: {} };
			expect(isContainer(node)).toBe(false);
		});
	});
	
	describe('validateContainerWorkflow', () => {
		it('should validate correct container workflow', () => {
			const nodes = [
				{ id: 'loop-1', data: { isContainer: true, childNodes: ['webhook-1'] } },
				{ id: 'webhook-1', data: { parentContainer: 'loop-1' } }
			];
			const edges = [];
			
			const result = validateContainerWorkflow(nodes, edges);
			
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});
		
		it('should detect missing child nodes', () => {
			const nodes = [
				{ id: 'loop-1', data: { isContainer: true, childNodes: ['webhook-1', 'missing-1'] } },
				{ id: 'webhook-1', data: { parentContainer: 'loop-1' } }
			];
			const edges = [];
			
			const result = validateContainerWorkflow(nodes, edges);
			
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toContain('non-existent child node');
		});
		
		it('should detect mismatched parent references', () => {
			const nodes = [
				{ id: 'loop-1', data: { isContainer: true, childNodes: ['webhook-1'] } },
				{ id: 'webhook-1', data: { parentContainer: 'loop-2' } }
			];
			const edges = [];
			
			const result = validateContainerWorkflow(nodes, edges);
			
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain('does not reference parent container');
		});
	});
});