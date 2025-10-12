import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TransformNode, TransformError } from './transform.js';

describe('TransformNode - Template Mode', () => {
  describe('constructor', () => {
    it('should create transform node with template', () => {
      const node = new TransformNode({ template: 'Hello {{name}}!' });
      assert.equal(node.template, 'Hello {{name}}!');
    });

    it('should throw error if both template and expression are missing', () => {
      assert.throws(
        () => new TransformNode({}),
        /Either template or expression is required/
      );
    });

    it('should accept both template and expression', () => {
      const node = new TransformNode({
        template: 'Hello {{name}}!',
        expression: 'data.value'
      });
      assert.equal(node.template, 'Hello {{name}}!');
      assert.equal(node.expression, 'data.value');
    });
  });

  describe('transform - template mode', () => {
    it('should transform data using simple template', () => {
      const node = new TransformNode({ template: 'Hello {{name}}!' });
      const result = node.transform({ name: 'Alice' });
      assert.equal(result, 'Hello Alice!');
    });

    it('should handle nested paths in templates', () => {
      const node = new TransformNode({
        template: 'Order #{{order.id}} for {{user.name}}'
      });
      const result = node.transform({
        order: { id: 123 },
        user: { name: 'Bob' }
      });
      assert.equal(result, 'Order #123 for Bob');
    });

    it('should handle array access in templates', () => {
      const node = new TransformNode({
        template: 'First item: {{items[0].name}}'
      });
      const result = node.transform({
        items: [{ name: 'Apple' }, { name: 'Banana' }]
      });
      assert.equal(result, 'First item: Apple');
    });

    it('should handle multiple variables in template', () => {
      const node = new TransformNode({
        template: '{{greeting}} {{name}}! You have {{count}} messages.'
      });
      const result = node.transform({
        greeting: 'Hello',
        name: 'Alice',
        count: 5
      });
      assert.equal(result, 'Hello Alice! You have 5 messages.');
    });

    it('should keep original placeholder if variable not found', () => {
      const node = new TransformNode({ template: 'Hello {{missing}}!' });
      const result = node.transform({ name: 'Alice' });
      assert.equal(result, 'Hello {{missing}}!');
    });

    it('should stringify objects in templates', () => {
      const node = new TransformNode({ template: 'Data: {{data}}' });
      const result = node.transform({ data: { key: 'value' } });
      assert.equal(result, 'Data: {"key":"value"}');
    });

    it('should handle null values', () => {
      const node = new TransformNode({ template: 'Value: {{value}}' });
      const result = node.transform({ value: null });
      assert.equal(result, 'Value: {{value}}');
    });

    it('should handle undefined values', () => {
      const node = new TransformNode({ template: 'Value: {{value}}' });
      const result = node.transform({});
      assert.equal(result, 'Value: {{value}}');
    });

    it('should handle boolean values', () => {
      const node = new TransformNode({ template: 'Active: {{active}}' });
      const result = node.transform({ active: true });
      assert.equal(result, 'Active: true');
    });

    it('should handle number values', () => {
      const node = new TransformNode({ template: 'Count: {{count}}' });
      const result = node.transform({ count: 42 });
      assert.equal(result, 'Count: 42');
    });

    it('should handle complex nested paths', () => {
      const node = new TransformNode({
        template: '{{user.profile.address.city}}'
      });
      const result = node.transform({
        user: {
          profile: {
            address: {
              city: 'San Francisco'
            }
          }
        }
      });
      assert.equal(result, 'San Francisco');
    });

    it('should handle array index with nested property', () => {
      const node = new TransformNode({
        template: '{{users[1].profile.name}}'
      });
      const result = node.transform({
        users: [
          { profile: { name: 'Alice' } },
          { profile: { name: 'Bob' } }
        ]
      });
      assert.equal(result, 'Bob');
    });

    it('should prefer template over expression when both provided', () => {
      const node = new TransformNode({
        template: 'Template: {{name}}',
        expression: 'data.value'
      });
      const result = node.transform({ name: 'Alice', data: { value: 'ignored' } });
      assert.equal(result, 'Template: Alice');
    });
  });

  describe('validate - template mode', () => {
    it('should validate correct template', () => {
      const node = new TransformNode({ template: 'Hello {{name}}!' });
      const result = node.validate();
      assert.equal(result.valid, true);
      assert.equal(result.errors, undefined);
    });

    it('should invalidate template with unbalanced braces - missing close', () => {
      const node = new TransformNode({ template: 'Hello {{name}!' });
      const result = node.validate();
      assert.equal(result.valid, false);
      assert.ok(result.errors);
      assert.ok(result.errors.some(e => e.includes('unbalanced')));
    });

    it('should invalidate template with unbalanced braces - missing open', () => {
      const node = new TransformNode({ template: 'Hello name}}!' });
      const result = node.validate();
      assert.equal(result.valid, false);
      assert.ok(result.errors);
      assert.ok(result.errors.some(e => e.includes('unbalanced')));
    });

    it('should invalidate template with empty variable names', () => {
      const node = new TransformNode({ template: 'Hello {{}}!' });
      const result = node.validate();
      assert.equal(result.valid, false);
      assert.ok(result.errors);
      assert.ok(result.errors.some(e => e.includes('empty')));
    });

    it('should validate template with whitespace in variable names', () => {
      const node = new TransformNode({ template: 'Hello {{ name }}!' });
      const result = node.validate();
      assert.equal(result.valid, true);
    });

    it('should validate template with multiple variables', () => {
      const node = new TransformNode({
        template: '{{a}} {{b}} {{c}}'
      });
      const result = node.validate();
      assert.equal(result.valid, true);
    });
  });

  describe('getMetadata - template mode', () => {
    it('should return node metadata for template mode', () => {
      const node = new TransformNode({ template: 'Hello {{name}}!' });
      const metadata = node.getMetadata();
      assert.equal(metadata.type, 'transform');
      assert.equal(metadata.mode, 'template');
      assert.equal(metadata.template, 'Hello {{name}}!');
      assert.equal(metadata.valid, true);
    });

    it('should return node metadata for expression mode', () => {
      const node = new TransformNode({ expression: 'data.value' });
      const metadata = node.getMetadata();
      assert.equal(metadata.type, 'transform');
      assert.equal(metadata.mode, 'expression');
      assert.equal(metadata.expression, 'data.value');
    });

    it('should indicate invalid template in metadata', () => {
      const node = new TransformNode({ template: 'Hello {{name}!' });
      const metadata = node.getMetadata();
      assert.equal(metadata.valid, false);
    });
  });

  describe('preview - template mode', () => {
    it('should preview template transformation', () => {
      const node = new TransformNode({ template: 'Hello {{name}}!' });
      const result = node.preview({ name: 'Alice' });
      assert.equal(result, 'Hello Alice!');
    });

    it('should preview with sample data', () => {
      const node = new TransformNode({
        template: 'Order #{{order.id}} - {{status}}'
      });
      const result = node.preview({
        order: { id: 123 },
        status: 'shipped'
      });
      assert.equal(result, 'Order #123 - shipped');
    });
  });
});