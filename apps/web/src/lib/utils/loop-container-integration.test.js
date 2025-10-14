/**
 * Loop Container Integration Tests
 * Tests the complete workflow execution with loop containers and child nodes
 * Testing Framework: Vitest
 */

import { describe, it, expect, vi } from 'vitest';
import { LoopNode } from '$lib/nodes/loop.js';

describe('Loop Container Integration', () => {
	describe('Loop Container with Webhook Child', () => {
		it('should execute webhook for each array item', async () => {
			// Setup: HTTP response with array
			const httpResponse = {
				status: 200,
				data: {
					items: [
						{ id: 1, name: 'Item 1' },
						{ id: 2, name: 'Item 2' },
						{ id: 3, name: 'Item 3' }
					]
				}
			};
			
			// Setup: Loop node configuration
			const loopNode = new LoopNode({
				items: 'data.items[*]',
				description: 'Loop over items'
			});
			
			// Extract array using execute (which calls extractArray internally)
			const arrayItems = loopNode.execute(httpResponse);
			
			expect(arrayItems).toHaveLength(3);
			expect(arrayItems[0]).toEqual({ id: 1, name: 'Item 1' });
			
			// Mock webhook execution
			const webhookResults = [];
			const mockWebhookExecute = vi.fn((item) => {
				webhookResults.push({ sent: true, item });
				return { success: true, item };
			});
			
			// Simulate loop execution
			const iterationResults = [];
			for (const item of arrayItems) {
				const result = mockWebhookExecute(item);
				iterationResults.push(result);
			}
			
			// Verify webhook was called for each item
			expect(mockWebhookExecute).toHaveBeenCalledTimes(3);
			expect(mockWebhookExecute).toHaveBeenNthCalledWith(1, { id: 1, name: 'Item 1' });
			expect(mockWebhookExecute).toHaveBeenNthCalledWith(2, { id: 2, name: 'Item 2' });
			expect(mockWebhookExecute).toHaveBeenNthCalledWith(3, { id: 3, name: 'Item 3' });
			
			// Verify results
			expect(iterationResults).toHaveLength(3);
			expect(iterationResults[0]).toEqual({ success: true, item: { id: 1, name: 'Item 1' } });
		});
		
		it('should handle empty array', async () => {
			const httpResponse = {
				status: 200,
				data: { items: [] }
			};
			
			const loopNode = new LoopNode({ items: 'data.items[*]', description: '' });
			const arrayItems = loopNode.execute(httpResponse);
			
			expect(arrayItems).toHaveLength(0);
			
			const mockWebhookExecute = vi.fn();
			
			for (const item of arrayItems) {
				mockWebhookExecute(item);
			}
			
			expect(mockWebhookExecute).not.toHaveBeenCalled();
		});
		
		it('should pass iteration results to next node', async () => {
			const httpResponse = {
				status: 200,
				data: {
					items: [
						{ id: 1, value: 10 },
						{ id: 2, value: 20 }
					]
				}
			};
			
			const loopNode = new LoopNode({ items: 'data.items[*]', description: '' });
			const arrayItems = loopNode.execute(httpResponse);
			
			// Mock webhook that transforms each item
			const mockWebhookExecute = vi.fn((item) => ({
				...item,
				processed: true,
				doubled: item.value * 2
			}));
			
			// Execute loop
			const iterationResults = [];
			for (const item of arrayItems) {
				const result = mockWebhookExecute(item);
				iterationResults.push(result);
			}
			
			// Verify aggregated results
			expect(iterationResults).toEqual([
				{ id: 1, value: 10, processed: true, doubled: 20 },
				{ id: 2, value: 20, processed: true, doubled: 40 }
			]);
		});
	});
	
	describe('Loop Container with Multiple Child Nodes', () => {
		it('should execute child nodes in sequence per iteration', async () => {
			const httpResponse = {
				status: 200,
				data: {
					users: [
						{ name: 'Alice', age: 30 },
						{ name: 'Bob', age: 25 }
					]
				}
			};
			
			const loopNode = new LoopNode({ items: 'data.users[*]', description: '' });
			const arrayItems = loopNode.execute(httpResponse);
			
			// Mock child nodes
			const mockWebhook = vi.fn((item) => ({ ...item, notified: true }));
			const mockTransform = vi.fn((item) => ({ ...item, transformed: true }));
			
			// Execute loop with multiple children
			const iterationResults = [];
			for (const item of arrayItems) {
				let output = item;
				output = mockWebhook(output);
				output = mockTransform(output);
				iterationResults.push(output);
			}
			
			// Verify execution order
			expect(mockWebhook).toHaveBeenCalledTimes(2);
			expect(mockTransform).toHaveBeenCalledTimes(2);
			
			// Verify webhook called before transform
			const webhookCall1 = mockWebhook.mock.calls[0][0];
			const transformCall1 = mockTransform.mock.calls[0][0];
			expect(webhookCall1).toEqual({ name: 'Alice', age: 30 });
			expect(transformCall1).toEqual({ name: 'Alice', age: 30, notified: true });
			
			// Verify final results
			expect(iterationResults).toEqual([
				{ name: 'Alice', age: 30, notified: true, transformed: true },
				{ name: 'Bob', age: 25, notified: true, transformed: true }
			]);
		});
	});
	
	describe('Loop Container Error Handling', () => {
		it('should handle child node execution errors', async () => {
			const httpResponse = {
				status: 200,
				data: {
					items: [
						{ id: 1, valid: true },
						{ id: 2, valid: false },
						{ id: 3, valid: true }
					]
				}
			};
			
			const loopNode = new LoopNode({ items: 'data.items[*]', description: '' });
			const arrayItems = loopNode.execute(httpResponse);
			
			// Mock webhook that fails on invalid items
			const mockWebhook = vi.fn((item) => {
				if (!item.valid) {
					throw new Error(`Invalid item: ${item.id}`);
				}
				return { ...item, processed: true };
			});
			
			// Execute loop with error handling
			const iterationResults = [];
			const errors = [];
			
			for (let i = 0; i < arrayItems.length; i++) {
				try {
					const result = mockWebhook(arrayItems[i]);
					iterationResults.push(result);
				} catch (error) {
					errors.push({ iteration: i, error: error.message });
				}
			}
			
			// Verify partial success
			expect(iterationResults).toHaveLength(2);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual({
				iteration: 1,
				error: 'Invalid item: 2'
			});
		});
	});
	
	describe('Loop Container with JMESPath Filtering', () => {
		it('should filter items before iteration', async () => {
			const httpResponse = {
				status: 200,
				data: {
					products: [
						{ name: 'A', price: 5, inStock: true },
						{ name: 'B', price: 15, inStock: true },
						{ name: 'C', price: 25, inStock: false },
						{ name: 'D', price: 30, inStock: true }
					]
				}
			};
			
			// Filter: price > 10 AND inStock
			const loopNode = new LoopNode({
				items: 'data.products[?price > `10` && inStock == `true`]',
				description: ''
			});
			
			const arrayItems = loopNode.execute(httpResponse);
			
			// Should only get B and D
			expect(arrayItems).toHaveLength(2);
			expect(arrayItems[0].name).toBe('B');
			expect(arrayItems[1].name).toBe('D');
			
			// Mock webhook
			const mockWebhook = vi.fn((item) => ({ sent: item.name }));
			
			// Execute
			const results = arrayItems.map(item => mockWebhook(item));
			
			expect(mockWebhook).toHaveBeenCalledTimes(2);
			expect(results).toEqual([
				{ sent: 'B' },
				{ sent: 'D' }
			]);
		});
	});
});