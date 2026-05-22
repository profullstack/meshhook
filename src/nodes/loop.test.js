/**
 * Loop Node Tests
 * Testing Framework: Mocha with Chai
 */

import { expect } from 'chai';
import { LoopNode, LoopError, createLoopNode } from './loop.js';

describe('Loop Node', () => {
	describe('Constructor', () => {
		it('should create a loop node with items expression', () => {
			const node = new LoopNode({ items: 'data.items[*]' });
			expect(node).to.be.instanceOf(LoopNode);
			expect(node.itemsExpression).to.equal('data.items[*]');
		});

		it('should throw error if items expression is missing', () => {
			expect(() => new LoopNode({})).to.throw(LoopError, 'items expression is required');
		});

		it('should throw error if items expression is empty', () => {
			expect(() => new LoopNode({ items: '' })).to.throw(LoopError, 'items expression is required');
		});

		it('should compile JMESPath expression on construction', () => {
			const node = new LoopNode({ items: 'items[*]' });
			expect(node.compiledExpression).to.not.be.null;
		});

		it('should capture compilation errors', () => {
			const node = new LoopNode({ items: 'invalid[[[' });
			expect(node.compilationError).to.not.be.null;
		});
	});

	describe('execute()', () => {
		it('should extract array from simple path', () => {
			const node = new LoopNode({ items: 'items' });
			const input = {
				items: ['a', 'b', 'c']
			};
			const result = node.execute(input);
			expect(result).to.deep.equal(['a', 'b', 'c']);
		});

		it('should extract array from nested path', () => {
			const node = new LoopNode({ items: 'data.items' });
			const input = {
				data: {
					items: [1, 2, 3]
				}
			};
			const result = node.execute(input);
			expect(result).to.deep.equal([1, 2, 3]);
		});

		it('should extract array using wildcard', () => {
			const node = new LoopNode({ items: 'users[*]' });
			const input = {
				users: [
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 }
				]
			};
			const result = node.execute(input);
			expect(result).to.deep.equal([
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 }
			]);
		});

		it('should project properties from array', () => {
			const node = new LoopNode({ items: 'users[*].name' });
			const input = {
				users: [
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 }
				]
			};
			const result = node.execute(input);
			expect(result).to.deep.equal(['Alice', 'Bob']);
		});

		it('should filter array with condition', () => {
			const node = new LoopNode({ items: 'items[?price > `10`]' });
			const input = {
				items: [
					{ name: 'A', price: 5 },
					{ name: 'B', price: 15 },
					{ name: 'C', price: 20 }
				]
			};
			const result = node.execute(input);
			expect(result).to.deep.equal([
				{ name: 'B', price: 15 },
				{ name: 'C', price: 20 }
			]);
		});

		it('should handle complex JMESPath expressions', () => {
			const node = new LoopNode({ items: 'data.orders[?status == `pending`].items[*]' });
			const input = {
				data: {
					orders: [
						{ status: 'pending', items: ['item1', 'item2'] },
						{ status: 'completed', items: ['item3'] },
						{ status: 'pending', items: ['item4'] }
					]
				}
			};
			const result = node.execute(input);
			expect(result).to.be.an('array');
		});

		it('should throw error if result is not an array', () => {
			const node = new LoopNode({ items: 'data.value' });
			const input = {
				data: { value: 'not an array' }
			};
			expect(() => node.execute(input)).to.throw(LoopError, 'must return an array');
		});

		it('should throw error if result is null', () => {
			const node = new LoopNode({ items: 'missing.path' });
			const input = { data: {} };
			expect(() => node.execute(input)).to.throw(LoopError, 'must return an array');
		});

		it('should handle empty array', () => {
			const node = new LoopNode({ items: 'items' });
			const input = { items: [] };
			const result = node.execute(input);
			expect(result).to.deep.equal([]);
		});

		it('should throw error if expression has compilation error', () => {
			const node = new LoopNode({ items: 'invalid[[[' });
			const input = { data: [] };
			expect(() => node.execute(input)).to.throw(LoopError);
		});
	});

	describe('validate()', () => {
		it('should validate correct expression', () => {
			const node = new LoopNode({ items: 'items[*]' });
			const result = node.validate();
			expect(result.valid).to.be.true;
			expect(result.errors).to.be.undefined;
		});

		it('should detect invalid JMESPath syntax', () => {
			const node = new LoopNode({ items: 'invalid[[[' });
			const result = node.validate();
			expect(result.valid).to.be.false;
			expect(result.errors).to.be.an('array').with.lengthOf.at.least(1);
		});

		it('should validate complex expressions', () => {
			const node = new LoopNode({ items: 'data.items[?active == `true`] | sort_by(@, &name)' });
			const result = node.validate();
			expect(result.valid).to.be.true;
		});
	});

	describe('preview()', () => {
		it('should preview with sample data', () => {
			const node = new LoopNode({ items: 'items[*]' });
			const sampleData = {
				items: [{ id: 1 }, { id: 2 }]
			};
			const result = node.preview(sampleData);
			expect(result).to.deep.equal([{ id: 1 }, { id: 2 }]);
		});

		it('should show first 5 items in preview', () => {
			const node = new LoopNode({ items: 'items' });
			const sampleData = {
				items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
			};
			const result = node.preview(sampleData);
			// Preview returns full array, UI will show first 5
			expect(result).to.have.lengthOf(10);
		});
	});

	describe('getMetadata()', () => {
		it('should return node metadata', () => {
			const node = new LoopNode({ items: 'items[*]' });
			const metadata = node.getMetadata();
			expect(metadata).to.deep.include({
				type: 'loop',
				itemsExpression: 'items[*]',
				valid: true
			});
		});

		it('should include validation status in metadata', () => {
			const node = new LoopNode({ items: 'invalid[[[' });
			const metadata = node.getMetadata();
			expect(metadata.valid).to.be.false;
		});
	});

	describe('createLoopNode()', () => {
		it('should create loop node using factory function', () => {
			const node = createLoopNode({ items: 'data.items[*]' });
			expect(node).to.be.instanceOf(LoopNode);
		});
	});

	describe('RSS Feed Example', () => {
		it('should extract RSS feed items', () => {
			const node = new LoopNode({ items: 'channel.item[*]' });
			const input = {
				channel: {
					title: 'Tech News',
					item: [
						{ title: 'Article 1', link: 'https://example.com/1' },
						{ title: 'Article 2', link: 'https://example.com/2' },
						{ title: 'Article 3', link: 'https://example.com/3' }
					]
				}
			};
			const result = node.execute(input);
			expect(result).to.have.lengthOf(3);
			expect(result[0]).to.deep.equal({ title: 'Article 1', link: 'https://example.com/1' });
		});

		it('should filter RSS items by date', () => {
			const node = new LoopNode({ items: 'channel.item[?pubDate > `2024-01-01`]' });
			const input = {
				channel: {
					item: [
						{ title: 'Old Article', pubDate: '2023-12-31' },
						{ title: 'New Article 1', pubDate: '2024-01-02' },
						{ title: 'New Article 2', pubDate: '2024-01-03' }
					]
				}
			};
			const result = node.execute(input);
			expect(result).to.have.lengthOf(2);
		});
	});

	describe('Edge Cases', () => {
		it('should handle deeply nested arrays', () => {
			const node = new LoopNode({ items: 'level1.level2.level3.items' });
			const input = {
				level1: {
					level2: {
						level3: {
							items: ['a', 'b', 'c']
						}
					}
				}
			};
			const result = node.execute(input);
			expect(result).to.deep.equal(['a', 'b', 'c']);
		});

		it('should handle array of primitives', () => {
			const node = new LoopNode({ items: 'numbers' });
			const input = { numbers: [1, 2, 3, 4, 5] };
			const result = node.execute(input);
			expect(result).to.deep.equal([1, 2, 3, 4, 5]);
		});

		it('should handle array of mixed types', () => {
			const node = new LoopNode({ items: 'mixed' });
			const input = { mixed: [1, 'two', { three: 3 }, [4], null] };
			const result = node.execute(input);
			expect(result).to.have.lengthOf(5);
		});
	});
});