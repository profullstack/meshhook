/**
 * Tests for template processor
 * Using Mocha and Chai
 */

import { expect } from 'chai';
import {
	processTemplate,
	processTemplateObject,
	validateTemplate,
	extractTemplateVariables
} from './template-processor.js';

describe('Template Processor', () => {
	describe('processTemplate', () => {
		it('should replace simple variable placeholders', () => {
			const template = 'Hello {{name}}!';
			const data = { name: 'World' };
			const result = processTemplate(template, data);
			expect(result).to.equal('Hello World!');
		});

		it('should handle multiple placeholders', () => {
			const template = '{{greeting}} {{name}}, you have {{count}} messages';
			const data = { greeting: 'Hi', name: 'Alice', count: 5 };
			const result = processTemplate(template, data);
			expect(result).to.equal('Hi Alice, you have 5 messages');
		});

		it('should handle nested object paths', () => {
			const template = 'User: {{user.name}}, Email: {{user.email}}';
			const data = { user: { name: 'Bob', email: 'bob@example.com' } };
			const result = processTemplate(template, data);
			expect(result).to.equal('User: Bob, Email: bob@example.com');
		});

		it('should handle array access', () => {
			const template = 'First item: {{items[0]}}';
			const data = { items: ['apple', 'banana', 'cherry'] };
			const result = processTemplate(template, data);
			expect(result).to.equal('First item: apple');
		});

		it('should return empty string for undefined values', () => {
			const template = 'Value: {{missing}}';
			const data = {};
			const result = processTemplate(template, data);
			expect(result).to.equal('Value: ');
		});

		it('should handle JMESPath expressions', () => {
			const template = 'Names: {{items[*].name}}';
			const data = {
				items: [
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 }
				]
			};
			const result = processTemplate(template, data);
			expect(result).to.include('Alice');
			expect(result).to.include('Bob');
		});

		it('should stringify objects', () => {
			const template = 'Data: {{user}}';
			const data = { user: { name: 'Alice', age: 30 } };
			const result = processTemplate(template, data);
			expect(result).to.equal('Data: {"name":"Alice","age":30}');
		});

		it('should handle whitespace in expressions', () => {
			const template = 'Value: {{ name }}';
			const data = { name: 'Test' };
			const result = processTemplate(template, data);
			expect(result).to.equal('Value: Test');
		});

		it('should return original placeholder on error', () => {
			const template = 'Value: {{invalid..path}}';
			const data = { name: 'Test' };
			const result = processTemplate(template, data);
			expect(result).to.equal('Value: {{invalid..path}}');
		});

		it('should handle empty template', () => {
			const result = processTemplate('', {});
			expect(result).to.equal('');
		});

		it('should handle null template', () => {
			const result = processTemplate(null, {});
			expect(result).to.be.null;
		});
	});

	describe('processTemplateObject', () => {
		it('should process string templates', () => {
			const template = 'Hello {{name}}';
			const data = { name: 'World' };
			const result = processTemplateObject(template, data);
			expect(result).to.equal('Hello World');
		});

		it('should process JSON string templates', () => {
			const template = '{"title": "{{title}}", "count": "{{count}}"}';
			const data = { title: 'Test', count: 42 };
			const result = processTemplateObject(template, data);
			expect(result).to.deep.equal({ title: 'Test', count: '42' });
		});

		it('should process object templates', () => {
			const template = {
				title: '{{title}}',
				user: {
					name: '{{user.name}}',
					email: '{{user.email}}'
				}
			};
			const data = {
				title: 'Welcome',
				user: { name: 'Alice', email: 'alice@example.com' }
			};
			const result = processTemplateObject(template, data);
			expect(result).to.deep.equal({
				title: 'Welcome',
				user: {
					name: 'Alice',
					email: 'alice@example.com'
				}
			});
		});

		it('should process array templates', () => {
			const template = ['{{items[0]}}', '{{items[1]}}'];
			const data = { items: ['first', 'second'] };
			const result = processTemplateObject(template, data);
			expect(result).to.deep.equal(['first', 'second']);
		});

		it('should process nested structures', () => {
			const template = {
				users: [
					{ name: '{{users[0].name}}' },
					{ name: '{{users[1].name}}' }
				]
			};
			const data = {
				users: [
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 }
				]
			};
			const result = processTemplateObject(template, data);
			expect(result).to.deep.equal({
				users: [{ name: 'Alice' }, { name: 'Bob' }]
			});
		});
	});

	describe('validateTemplate', () => {
		it('should validate correct templates', () => {
			const template = 'Hello {{name}}!';
			const result = validateTemplate(template);
			expect(result.valid).to.be.true;
			expect(result.errors).to.be.empty;
		});

		it('should detect unmatched opening braces', () => {
			const template = 'Hello {{name!';
			const result = validateTemplate(template);
			expect(result.valid).to.be.false;
			expect(result.errors).to.have.lengthOf.at.least(1);
		});

		it('should detect unmatched closing braces', () => {
			const template = 'Hello name}}!';
			const result = validateTemplate(template);
			expect(result.valid).to.be.false;
			expect(result.errors).to.have.lengthOf.at.least(1);
		});

		it('should detect empty expressions', () => {
			const template = 'Hello {{}}!';
			const result = validateTemplate(template);
			expect(result.valid).to.be.false;
			expect(result.errors).to.include('Empty template expression found');
		});

		it('should detect invalid JMESPath syntax', () => {
			const template = 'Value: {{invalid..path}}';
			const result = validateTemplate(template);
			expect(result.valid).to.be.false;
			expect(result.errors.length).to.be.greaterThan(0);
		});

		it('should validate multiple expressions', () => {
			const template = '{{name}} - {{email}} - {{age}}';
			const result = validateTemplate(template);
			expect(result.valid).to.be.true;
		});

		it('should handle empty template', () => {
			const result = validateTemplate('');
			expect(result.valid).to.be.true;
		});

		it('should handle null template', () => {
			const result = validateTemplate(null);
			expect(result.valid).to.be.true;
		});
	});

	describe('extractTemplateVariables', () => {
		it('should extract single variable', () => {
			const template = 'Hello {{name}}!';
			const variables = extractTemplateVariables(template);
			expect(variables).to.deep.equal(['name']);
		});

		it('should extract multiple variables', () => {
			const template = '{{greeting}} {{name}}, you have {{count}} messages';
			const variables = extractTemplateVariables(template);
			expect(variables).to.deep.equal(['greeting', 'name', 'count']);
		});

		it('should extract nested paths', () => {
			const template = 'User: {{user.name}}, Email: {{user.email}}';
			const variables = extractTemplateVariables(template);
			expect(variables).to.deep.equal(['user.name', 'user.email']);
		});

		it('should extract JMESPath expressions', () => {
			const template = 'Items: {{items[*].name}}';
			const variables = extractTemplateVariables(template);
			expect(variables).to.deep.equal(['items[*].name']);
		});

		it('should trim whitespace from variables', () => {
			const template = 'Value: {{ name }}';
			const variables = extractTemplateVariables(template);
			expect(variables).to.deep.equal(['name']);
		});

		it('should return empty array for template without variables', () => {
			const template = 'Hello World!';
			const variables = extractTemplateVariables(template);
			expect(variables).to.be.empty;
		});

		it('should handle empty template', () => {
			const variables = extractTemplateVariables('');
			expect(variables).to.be.empty;
		});

		it('should handle null template', () => {
			const variables = extractTemplateVariables(null);
			expect(variables).to.be.empty;
		});
	});
});