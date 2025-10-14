/**
 * Tests for Enhanced Template Processor
 * Testing Framework: Mocha with Chai
 */

import { expect } from 'chai';
import { processTemplate, getValueByPath, validateTemplate } from './template-processor.js';

describe('Template Processor', () => {
	describe('getValueByPath', () => {
		it('should get simple property', () => {
			const obj = { name: 'John' };
			expect(getValueByPath(obj, 'name')).to.equal('John');
		});

		it('should get nested property', () => {
			const obj = { user: { name: 'John', age: 30 } };
			expect(getValueByPath(obj, 'user.name')).to.equal('John');
		});

		it('should get array element', () => {
			const obj = { items: ['a', 'b', 'c'] };
			expect(getValueByPath(obj, 'items[0]')).to.equal('a');
		});

		it('should get nested array property', () => {
			const obj = { users: [{ name: 'John' }, { name: 'Jane' }] };
			expect(getValueByPath(obj, 'users[0].name')).to.equal('John');
		});

		it('should return undefined for missing path', () => {
			const obj = { name: 'John' };
			expect(getValueByPath(obj, 'missing')).to.be.undefined;
		});

		it('should return object itself for "this"', () => {
			const obj = { name: 'John' };
			expect(getValueByPath(obj, 'this')).to.deep.equal(obj);
		});

		it('should return object itself for empty path', () => {
			const obj = { name: 'John' };
			expect(getValueByPath(obj, '')).to.deep.equal(obj);
		});
	});

	describe('processTemplate - Simple Variables', () => {
		it('should replace simple variable', () => {
			const template = 'Hello {{name}}!';
			const data = { name: 'John' };
			expect(processTemplate(template, data)).to.equal('Hello John!');
		});

		it('should replace multiple variables', () => {
			const template = '{{greeting}} {{name}}!';
			const data = { greeting: 'Hello', name: 'John' };
			expect(processTemplate(template, data)).to.equal('Hello John!');
		});

		it('should replace nested property', () => {
			const template = 'User: {{user.name}}';
			const data = { user: { name: 'John' } };
			expect(processTemplate(template, data)).to.equal('User: John');
		});

		it('should replace array element', () => {
			const template = 'First: {{items[0]}}';
			const data = { items: ['apple', 'banana'] };
			expect(processTemplate(template, data)).to.equal('First: apple');
		});

		it('should keep original for missing variable', () => {
			const template = 'Hello {{missing}}!';
			const data = { name: 'John' };
			expect(processTemplate(template, data)).to.equal('Hello {{missing}}!');
		});

		it('should handle object values as JSON', () => {
			const template = 'Data: {{user}}';
			const data = { user: { name: 'John', age: 30 } };
			const result = processTemplate(template, data);
			expect(result).to.include('"name": "John"');
			expect(result).to.include('"age": 30');
		});

		it('should handle empty template', () => {
			expect(processTemplate('', {})).to.equal('');
		});

		it('should handle template with no variables', () => {
			const template = 'Hello World!';
			expect(processTemplate(template, {})).to.equal('Hello World!');
		});
	});

	describe('processTemplate - Array Loops', () => {
		it('should loop over simple array', () => {
			const template = '{{#each items}}<li>{{this}}</li>{{/each}}';
			const data = { items: ['apple', 'banana', 'cherry'] };
			const result = processTemplate(template, data);
			expect(result).to.equal('<li>apple</li><li>banana</li><li>cherry</li>');
		});

		it('should loop over array of objects', () => {
			const template = '{{#each users}}<div>{{name}}</div>{{/each}}';
			const data = {
				users: [
					{ name: 'John', age: 30 },
					{ name: 'Jane', age: 25 }
				]
			};
			const result = processTemplate(template, data);
			expect(result).to.equal('<div>John</div><div>Jane</div>');
		});

		it('should access nested properties in loop', () => {
			const template = '{{#each items}}{{title}}: {{link}}\n{{/each}}';
			const data = {
				items: [
					{ title: 'Article 1', link: 'http://example.com/1' },
					{ title: 'Article 2', link: 'http://example.com/2' }
				]
			};
			const result = processTemplate(template, data);
			expect(result).to.equal('Article 1: http://example.com/1\nArticle 2: http://example.com/2\n');
		});

		it('should support @index in loops', () => {
			const template = '{{#each items}}{{@index}}: {{this}}\n{{/each}}';
			const data = { items: ['a', 'b', 'c'] };
			const result = processTemplate(template, data);
			expect(result).to.equal('0: a\n1: b\n2: c\n');
		});

		it('should support @index1 (1-based) in loops', () => {
			const template = '{{#each items}}{{@index1}}. {{this}}\n{{/each}}';
			const data = { items: ['a', 'b', 'c'] };
			const result = processTemplate(template, data);
			expect(result).to.equal('1. a\n2. b\n3. c\n');
		});

		it('should support this.property syntax', () => {
			const template = '{{#each users}}{{this.name}} ({{this.age}})\n{{/each}}';
			const data = {
				users: [
					{ name: 'John', age: 30 },
					{ name: 'Jane', age: 25 }
				]
			};
			const result = processTemplate(template, data);
			expect(result).to.equal('John (30)\nJane (25)\n');
		});

		it('should handle empty array', () => {
			const template = '{{#each items}}<li>{{this}}</li>{{/each}}';
			const data = { items: [] };
			const result = processTemplate(template, data);
			expect(result).to.equal('<!-- Empty array -->');
		});

		it('should handle non-array path', () => {
			const template = '{{#each notArray}}<li>{{this}}</li>{{/each}}';
			const data = { notArray: 'string' };
			const result = processTemplate(template, data);
			expect(result).to.include('Error');
			expect(result).to.include('not an array');
		});

		it('should handle nested array path', () => {
			const template = '{{#each feed.items}}{{title}}\n{{/each}}';
			const data = {
				feed: {
					items: [
						{ title: 'Item 1' },
						{ title: 'Item 2' }
					]
				}
			};
			const result = processTemplate(template, data);
			expect(result).to.equal('Item 1\nItem 2\n');
		});

		it('should handle multiline loop content', () => {
			const template = `{{#each items}}
<article>
  <h2>{{title}}</h2>
  <p>{{description}}</p>
</article>
{{/each}}`;
			const data = {
				items: [
					{ title: 'Title 1', description: 'Desc 1' },
					{ title: 'Title 2', description: 'Desc 2' }
				]
			};
			const result = processTemplate(template, data);
			expect(result).to.include('<h2>Title 1</h2>');
			expect(result).to.include('<p>Desc 1</p>');
			expect(result).to.include('<h2>Title 2</h2>');
		});
	});

	describe('processTemplate - RSS Feed Example', () => {
		it('should process RSS feed template', () => {
			const template = `RSS Feed Items:
{{#each channel.item}}
- {{title}}
  Link: {{link}}
  Published: {{pubDate}}
{{/each}}`;

			const data = {
				channel: {
					item: [
						{
							title: 'First Article',
							link: 'https://example.com/article1',
							pubDate: '2024-01-01'
						},
						{
							title: 'Second Article',
							link: 'https://example.com/article2',
							pubDate: '2024-01-02'
						}
					]
				}
			};

			const result = processTemplate(template, data);
			expect(result).to.include('First Article');
			expect(result).to.include('https://example.com/article1');
			expect(result).to.include('Second Article');
			expect(result).to.include('2024-01-02');
		});

		it('should process HTML list from RSS', () => {
			const template = `<ul>
{{#each items}}
  <li><a href="{{link}}">{{title}}</a></li>
{{/each}}
</ul>`;

			const data = {
				items: [
					{ title: 'Article 1', link: '/article1' },
					{ title: 'Article 2', link: '/article2' },
					{ title: 'Article 3', link: '/article3' }
				]
			};

			const result = processTemplate(template, data);
			expect(result).to.include('<a href="/article1">Article 1</a>');
			expect(result).to.include('<a href="/article2">Article 2</a>');
			expect(result).to.include('<a href="/article3">Article 3</a>');
		});
	});

	describe('processTemplate - Combined Features', () => {
		it('should handle variables outside and inside loops', () => {
			const template = `Title: {{title}}
Items:
{{#each items}}
- {{name}}
{{/each}}
Footer: {{footer}}`;

			const data = {
				title: 'My List',
				items: [
					{ name: 'Item 1' },
					{ name: 'Item 2' }
				],
				footer: 'End'
			};

			const result = processTemplate(template, data);
			expect(result).to.include('Title: My List');
			expect(result).to.include('- Item 1');
			expect(result).to.include('- Item 2');
			expect(result).to.include('Footer: End');
		});

		it('should handle multiple loops', () => {
			const template = `Users:
{{#each users}}{{name}} {{/each}}
Products:
{{#each products}}{{title}} {{/each}}`;

			const data = {
				users: [{ name: 'John' }, { name: 'Jane' }],
				products: [{ title: 'A' }, { title: 'B' }]
			};

			const result = processTemplate(template, data);
			expect(result).to.include('John');
			expect(result).to.include('Jane');
			expect(result).to.include('A');
			expect(result).to.include('B');
		});
	});

	describe('validateTemplate', () => {
		it('should validate correct template', () => {
			const template = '{{#each items}}{{name}}{{/each}}';
			const result = validateTemplate(template);
			expect(result.valid).to.be.true;
			expect(result.errors).to.be.empty;
		});

		it('should detect unbalanced loop tags - missing close', () => {
			const template = '{{#each items}}{{name}}';
			const result = validateTemplate(template);
			expect(result.valid).to.be.false;
			expect(result.errors[0]).to.include('Unbalanced');
		});

		it('should detect unbalanced loop tags - missing open', () => {
			const template = '{{name}}{{/each}}';
			const result = validateTemplate(template);
			expect(result.valid).to.be.false;
			expect(result.errors[0]).to.include('Unbalanced');
		});

		it('should detect nested loops', () => {
			const template = '{{#each outer}}{{#each inner}}{{name}}{{/each}}{{/each}}';
			const result = validateTemplate(template);
			expect(result.valid).to.be.false;
			expect(result.errors[0]).to.include('Nested loops');
		});

		it('should validate empty template', () => {
			const result = validateTemplate('');
			expect(result.valid).to.be.true;
		});

		it('should validate template without loops', () => {
			const template = 'Hello {{name}}!';
			const result = validateTemplate(template);
			expect(result.valid).to.be.true;
		});
	});
});