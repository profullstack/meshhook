/**
 * Tests for layout organizer
 * Using Mocha and Chai
 */

import { expect } from 'chai';
import { organizeCanvas, calculateBoundingBox } from './layout-organizer.js';

describe('Layout Organizer', () => {
	describe('organizeCanvas', () => {
		it('should handle empty nodes array', () => {
			const nodes = [];
			const edges = [];
			const result = organizeCanvas(nodes, edges);
			expect(result).to.deep.equal([]);
		});

		it('should handle null nodes', () => {
			const result = organizeCanvas(null, []);
			expect(result).to.be.null;
		});

		it('should organize single node', () => {
			const nodes = [
				{ id: 'node1', data: { label: 'Start' } }
			];
			const edges = [];
			const result = organizeCanvas(nodes, edges);
			
			expect(result).to.have.lengthOf(1);
			expect(result[0]).to.have.property('position');
			expect(result[0].position).to.have.property('x');
			expect(result[0].position).to.have.property('y');
		});

		it('should organize linear workflow (A -> B -> C)', () => {
			const nodes = [
				{ id: 'A', data: { label: 'Node A' } },
				{ id: 'B', data: { label: 'Node B' } },
				{ id: 'C', data: { label: 'Node C' } }
			];
			const edges = [
				{ source: 'A', target: 'B' },
				{ source: 'B', target: 'C' }
			];
			const result = organizeCanvas(nodes, edges);
			
			expect(result).to.have.lengthOf(3);
			
			// Node A should be leftmost
			const nodeA = result.find(n => n.id === 'A');
			const nodeB = result.find(n => n.id === 'B');
			const nodeC = result.find(n => n.id === 'C');
			
			expect(nodeA.position.x).to.be.lessThan(nodeB.position.x);
			expect(nodeB.position.x).to.be.lessThan(nodeC.position.x);
		});

		it('should organize branching workflow (A -> B, A -> C)', () => {
			const nodes = [
				{ id: 'A', data: { label: 'Node A' } },
				{ id: 'B', data: { label: 'Node B' } },
				{ id: 'C', data: { label: 'Node C' } }
			];
			const edges = [
				{ source: 'A', target: 'B' },
				{ source: 'A', target: 'C' }
			];
			const result = organizeCanvas(nodes, edges);
			
			expect(result).to.have.lengthOf(3);
			
			const nodeA = result.find(n => n.id === 'A');
			const nodeB = result.find(n => n.id === 'B');
			const nodeC = result.find(n => n.id === 'C');
			
			// A should be leftmost
			expect(nodeA.position.x).to.be.lessThan(nodeB.position.x);
			expect(nodeA.position.x).to.be.lessThan(nodeC.position.x);
			
			// B and C should be at same horizontal level
			expect(nodeB.position.x).to.equal(nodeC.position.x);
			
			// B and C should be at different vertical positions
			expect(nodeB.position.y).to.not.equal(nodeC.position.y);
		});

		it('should organize merging workflow (A -> C, B -> C)', () => {
			const nodes = [
				{ id: 'A', data: { label: 'Node A' } },
				{ id: 'B', data: { label: 'Node B' } },
				{ id: 'C', data: { label: 'Node C' } }
			];
			const edges = [
				{ source: 'A', target: 'C' },
				{ source: 'B', target: 'C' }
			];
			const result = organizeCanvas(nodes, edges);
			
			expect(result).to.have.lengthOf(3);
			
			const nodeA = result.find(n => n.id === 'A');
			const nodeB = result.find(n => n.id === 'B');
			const nodeC = result.find(n => n.id === 'C');
			
			// A and B should be at same horizontal level (both roots)
			expect(nodeA.position.x).to.equal(nodeB.position.x);
			
			// C should be to the right of A and B
			expect(nodeC.position.x).to.be.greaterThan(nodeA.position.x);
			expect(nodeC.position.x).to.be.greaterThan(nodeB.position.x);
		});

		it('should organize complex workflow with multiple levels', () => {
			const nodes = [
				{ id: 'A', data: { label: 'Start' } },
				{ id: 'B', data: { label: 'Process 1' } },
				{ id: 'C', data: { label: 'Process 2' } },
				{ id: 'D', data: { label: 'Merge' } },
				{ id: 'E', data: { label: 'End' } }
			];
			const edges = [
				{ source: 'A', target: 'B' },
				{ source: 'A', target: 'C' },
				{ source: 'B', target: 'D' },
				{ source: 'C', target: 'D' },
				{ source: 'D', target: 'E' }
			];
			const result = organizeCanvas(nodes, edges);
			
			expect(result).to.have.lengthOf(5);
			
			const nodeA = result.find(n => n.id === 'A');
			const nodeD = result.find(n => n.id === 'D');
			const nodeE = result.find(n => n.id === 'E');
			
			// Verify horizontal progression
			expect(nodeA.position.x).to.be.lessThan(nodeD.position.x);
			expect(nodeD.position.x).to.be.lessThan(nodeE.position.x);
		});

		it('should handle disconnected nodes', () => {
			const nodes = [
				{ id: 'A', data: { label: 'Node A' } },
				{ id: 'B', data: { label: 'Node B' } },
				{ id: 'C', data: { label: 'Node C' } }
			];
			const edges = [
				{ source: 'A', target: 'B' }
			];
			const result = organizeCanvas(nodes, edges);
			
			expect(result).to.have.lengthOf(3);
			
			// All nodes should have positions
			result.forEach(node => {
				expect(node).to.have.property('position');
				expect(node.position).to.have.property('x');
				expect(node.position).to.have.property('y');
			});
		});

		it('should handle circular references gracefully', () => {
			const nodes = [
				{ id: 'A', data: { label: 'Node A' } },
				{ id: 'B', data: { label: 'Node B' } },
				{ id: 'C', data: { label: 'Node C' } }
			];
			const edges = [
				{ source: 'A', target: 'B' },
				{ source: 'B', target: 'C' },
				{ source: 'C', target: 'A' } // Creates a cycle
			];
			const result = organizeCanvas(nodes, edges);
			
			expect(result).to.have.lengthOf(3);
			
			// All nodes should have valid positions
			result.forEach(node => {
				expect(node.position.x).to.be.a('number');
				expect(node.position.y).to.be.a('number');
				expect(node.position.x).to.be.at.least(0);
				expect(node.position.y).to.be.finite;
			});
		});

		it('should preserve node data and properties', () => {
			const nodes = [
				{ 
					id: 'A', 
					data: { label: 'Node A', config: { key: 'value' } },
					type: 'custom',
					extra: 'property'
				}
			];
			const edges = [];
			const result = organizeCanvas(nodes, edges);
			
			expect(result[0].id).to.equal('A');
			expect(result[0].data).to.deep.equal({ label: 'Node A', config: { key: 'value' } });
			expect(result[0].type).to.equal('custom');
			expect(result[0].extra).to.equal('property');
		});

		it('should space nodes appropriately', () => {
			const nodes = [
				{ id: 'A', data: { label: 'Node A' } },
				{ id: 'B', data: { label: 'Node B' } },
				{ id: 'C', data: { label: 'Node C' } }
			];
			const edges = [
				{ source: 'A', target: 'B' },
				{ source: 'A', target: 'C' }
			];
			const result = organizeCanvas(nodes, edges);
			
			const nodeB = result.find(n => n.id === 'B');
			const nodeC = result.find(n => n.id === 'C');
			
			// Vertical spacing should be consistent
			const verticalSpacing = Math.abs(nodeB.position.y - nodeC.position.y);
			expect(verticalSpacing).to.be.greaterThan(0);
			expect(verticalSpacing).to.equal(150); // VERTICAL_SPACING constant
		});
	});

	describe('calculateBoundingBox', () => {
		it('should handle empty nodes array', () => {
			const result = calculateBoundingBox([]);
			expect(result).to.deep.equal({ x: 0, y: 0, width: 0, height: 0 });
		});

		it('should handle null nodes', () => {
			const result = calculateBoundingBox(null);
			expect(result).to.deep.equal({ x: 0, y: 0, width: 0, height: 0 });
		});

		it('should calculate bounding box for single node', () => {
			const nodes = [
				{ id: 'A', position: { x: 100, y: 100 } }
			];
			const result = calculateBoundingBox(nodes);
			
			expect(result.x).to.equal(100);
			expect(result.y).to.equal(100);
			expect(result.width).to.be.greaterThan(0);
			expect(result.height).to.be.greaterThan(0);
		});

		it('should calculate bounding box for multiple nodes', () => {
			const nodes = [
				{ id: 'A', position: { x: 100, y: 100 } },
				{ id: 'B', position: { x: 300, y: 200 } },
				{ id: 'C', position: { x: 200, y: 150 } }
			];
			const result = calculateBoundingBox(nodes);
			
			expect(result.x).to.equal(100); // Minimum x
			expect(result.y).to.equal(100); // Minimum y
			expect(result.width).to.be.greaterThan(200); // Should span from 100 to at least 300
			expect(result.height).to.be.greaterThan(100); // Should span from 100 to at least 200
		});

		it('should handle nodes without positions', () => {
			const nodes = [
				{ id: 'A' },
				{ id: 'B', position: { x: 100, y: 100 } }
			];
			const result = calculateBoundingBox(nodes);
			
			// Should not throw and should return valid box
			expect(result).to.have.property('x');
			expect(result).to.have.property('y');
			expect(result).to.have.property('width');
			expect(result).to.have.property('height');
		});

		it('should handle negative positions', () => {
			const nodes = [
				{ id: 'A', position: { x: -100, y: -50 } },
				{ id: 'B', position: { x: 100, y: 50 } }
			];
			const result = calculateBoundingBox(nodes);
			
			expect(result.x).to.equal(-100);
			expect(result.y).to.equal(-50);
			expect(result.width).to.be.greaterThan(200);
			expect(result.height).to.be.greaterThan(100);
		});
	});
});