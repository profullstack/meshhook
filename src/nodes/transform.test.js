import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TransformNode, TransformError } from './transform.js';

describe('TransformNode', () => {
  describe('TransformError', () => {
    it('should create transform error with message', () => {
      const error = new TransformError('Transform failed', 'invalid.path');
      assert.equal(error.name, 'TransformError');
      assert.equal(error.message, 'Transform failed');
      assert.equal(error.expression, 'invalid.path');
      assert.ok(error instanceof Error);
    });
  });

  describe('constructor', () => {
    it('should create transform node with expression', () => {
      const node = new TransformNode({ expression: 'data.value' });
      assert.equal(node.expression, 'data.value');
    });

    it('should throw error if expression is missing', () => {
      assert.throws(
        () => new TransformNode({}),
        /expression is required/
      );
    });
  });

  describe('transform', () => {
    it('should extract simple property', () => {
      const node = new TransformNode({ expression: 'name' });
      const input = { name: 'John', age: 30 };
      const result = node.transform(input);
      assert.equal(result, 'John');
    });

    it('should extract nested property', () => {
      const node = new TransformNode({ expression: 'user.profile.name' });
      const input = {
        user: {
          profile: {
            name: 'Jane',
            email: 'jane@example.com',
          },
        },
      };
      const result = node.transform(input);
      assert.equal(result, 'Jane');
    });

    it('should filter array elements', () => {
      const node = new TransformNode({
        expression: 'users[?age > `25`].name',
      });
      const input = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 20 },
          { name: 'Charlie', age: 35 },
        ],
      };
      const result = node.transform(input);
      assert.deepEqual(result, ['Alice', 'Charlie']);
    });

    it('should map array elements', () => {
      const node = new TransformNode({ expression: 'items[*].price' });
      const input = {
        items: [
          { name: 'Item 1', price: 10 },
          { name: 'Item 2', price: 20 },
          { name: 'Item 3', price: 30 },
        ],
      };
      const result = node.transform(input);
      assert.deepEqual(result, [10, 20, 30]);
    });

    it('should use pipe expressions', () => {
      const node = new TransformNode({
        expression: 'users[*].age | max(@)',
      });
      const input = {
        users: [{ age: 30 }, { age: 25 }, { age: 35 }],
      };
      const result = node.transform(input);
      assert.equal(result, 35);
    });

    it('should create object projections', () => {
      const node = new TransformNode({
        expression: '{ fullName: name, userAge: age }',
      });
      const input = { name: 'John Doe', age: 30, email: 'john@example.com' };
      const result = node.transform(input);
      assert.deepEqual(result, { fullName: 'John Doe', userAge: 30 });
    });

    it('should handle array slicing', () => {
      const node = new TransformNode({ expression: 'numbers[0:3]' });
      const input = { numbers: [1, 2, 3, 4, 5] };
      const result = node.transform(input);
      assert.deepEqual(result, [1, 2, 3]);
    });

    it('should use functions', () => {
      const node = new TransformNode({ expression: 'length(items)' });
      const input = { items: [1, 2, 3, 4, 5] };
      const result = node.transform(input);
      assert.equal(result, 5);
    });

    it('should handle null input', () => {
      const node = new TransformNode({ expression: 'data.value' });
      const result = node.transform(null);
      assert.equal(result, null);
    });

    it('should handle undefined properties', () => {
      const node = new TransformNode({ expression: 'missing.property' });
      const input = { existing: 'value' };
      const result = node.transform(input);
      assert.equal(result, null);
    });

    it('should throw error on invalid expression', () => {
      const node = new TransformNode({ expression: 'invalid[[[syntax' });
      assert.throws(
        () => node.transform({ data: 'value' }),
        TransformError
      );
    });
  });

  describe('validate', () => {
    it('should validate correct expression', () => {
      const node = new TransformNode({ expression: 'data.value' });
      const result = node.validate();
      assert.equal(result.valid, true);
      assert.equal(result.errors, undefined);
    });

    it('should detect invalid expression', () => {
      const node = new TransformNode({ expression: 'invalid[[[' });
      const result = node.validate();
      assert.equal(result.valid, false);
      assert.ok(Array.isArray(result.errors));
      assert.ok(result.errors.length > 0);
    });
  });

  describe('preview', () => {
    it('should preview transformation with sample data', () => {
      const node = new TransformNode({ expression: 'users[*].name' });
      const sampleData = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      };
      const result = node.preview(sampleData);
      assert.deepEqual(result, ['Alice', 'Bob']);
    });

    it('should handle preview errors gracefully', () => {
      const node = new TransformNode({ expression: 'invalid[[[' });
      assert.throws(
        () => node.preview({ data: 'value' }),
        TransformError
      );
    });
  });

  describe('complex transformations', () => {
    it('should handle complex nested transformations', () => {
      const node = new TransformNode({
        expression: `{
          totalPrice: sum(items[*].price),
          itemCount: length(items),
          avgPrice: avg(items[*].price),
          names: items[*].name
        }`,
      });
      const input = {
        items: [
          { name: 'Item 1', price: 10 },
          { name: 'Item 2', price: 20 },
          { name: 'Item 3', price: 30 },
        ],
      };
      const result = node.transform(input);
      assert.equal(result.totalPrice, 60);
      assert.equal(result.itemCount, 3);
      assert.equal(result.avgPrice, 20);
      assert.deepEqual(result.names, ['Item 1', 'Item 2', 'Item 3']);
    });

    it('should handle conditional expressions', () => {
      const node = new TransformNode({
        expression: 'users[?status == `active`].{name: name, email: email}',
      });
      const input = {
        users: [
          { name: 'Alice', email: 'alice@example.com', status: 'active' },
          { name: 'Bob', email: 'bob@example.com', status: 'inactive' },
          { name: 'Charlie', email: 'charlie@example.com', status: 'active' },
        ],
      };
      const result = node.transform(input);
      assert.equal(result.length, 2);
      assert.deepEqual(result[0], { name: 'Alice', email: 'alice@example.com' });
      assert.deepEqual(result[1], { name: 'Charlie', email: 'charlie@example.com' });
    });
  });

  describe('edge cases', () => {
    it('should handle empty arrays', () => {
      const node = new TransformNode({ expression: 'items[*].name' });
      const result = node.transform({ items: [] });
      assert.deepEqual(result, []);
    });

    it('should handle empty objects', () => {
      const node = new TransformNode({ expression: 'data' });
      const result = node.transform({});
      assert.equal(result, null);
    });

    it('should handle primitive values', () => {
      const node = new TransformNode({ expression: '@' });
      assert.equal(node.transform(42), 42);
      assert.equal(node.transform('hello'), 'hello');
      assert.equal(node.transform(true), true);
    });
  });
});