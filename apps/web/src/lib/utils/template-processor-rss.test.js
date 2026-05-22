/**
 * RSS Feed Specific Tests for Template Processor
 * Testing Framework: Mocha with Chai
 * 
 * These tests verify that the template processor correctly handles
 * RSS feed data with multiple items, ensuring loops work as expected.
 */

import { expect } from 'chai';
import { processTemplate } from './template-processor.js';

describe('Template Processor - RSS Feed Scenarios', () => {
	describe('RSS Feed with Multiple Items', () => {
		const rssFeedData = {
			channel: {
				title: 'Tech News Feed',
				description: 'Latest technology news',
				item: [
					{
						title: 'JavaScript ES2024 Features Released',
						link: 'https://example.com/js-2024',
						description: 'New features in JavaScript ES2024',
						pubDate: '2024-01-15T10:00:00Z',
						guid: 'article-001'
					},
					{
						title: 'Node.js 20 LTS Announced',
						link: 'https://example.com/nodejs-20',
						description: 'Node.js 20 becomes LTS version',
						pubDate: '2024-01-14T15:30:00Z',
						guid: 'article-002'
					},
					{
						title: 'Web Performance Best Practices',
						link: 'https://example.com/web-perf',
						description: 'Optimize your website for speed',
						pubDate: '2024-01-13T09:15:00Z',
						guid: 'article-003'
					},
					{
						title: 'TypeScript 5.0 Released',
						link: 'https://example.com/ts-5',
						description: 'Major update to TypeScript',
						pubDate: '2024-01-12T14:20:00Z',
						guid: 'article-004'
					},
					{
						title: 'React 19 Beta Available',
						link: 'https://example.com/react-19',
						description: 'Try the new React features',
						pubDate: '2024-01-11T11:45:00Z',
						guid: 'article-005'
					}
				]
			}
		};

		it('should loop over all RSS items and generate HTML list', () => {
			const template = `<ul class="rss-feed">
{{#each channel.item}}  <li>
    <a href="{{link}}">{{title}}</a>
    <p>{{description}}</p>
    <time>{{pubDate}}</time>
  </li>
{{/each}}</ul>`;

			const result = processTemplate(template, rssFeedData);
			
			// Verify all 5 items are present
			expect(result).to.include('JavaScript ES2024 Features Released');
			expect(result).to.include('Node.js 20 LTS Announced');
			expect(result).to.include('Web Performance Best Practices');
			expect(result).to.include('TypeScript 5.0 Released');
			expect(result).to.include('React 19 Beta Available');
			
			// Verify links are correct
			expect(result).to.include('https://example.com/js-2024');
			expect(result).to.include('https://example.com/nodejs-20');
			expect(result).to.include('https://example.com/web-perf');
			expect(result).to.include('https://example.com/ts-5');
			expect(result).to.include('https://example.com/react-19');
			
			// Verify structure
			expect(result).to.include('<ul class="rss-feed">');
			expect(result).to.include('</ul>');
			
			// Count number of list items (should be 5)
			const liCount = (result.match(/<li>/g) || []).length;
			expect(liCount).to.equal(5);
		});

		it('should generate JSON array from RSS items', () => {
			const template = `{
  "articles": [
{{#each channel.item}}    {
      "id": "{{guid}}",
      "title": "{{title}}",
      "url": "{{link}}",
      "summary": "{{description}}",
      "published": "{{pubDate}}"
    }{{@index1}}{{/each}}
  ]
}`;

			const result = processTemplate(template, rssFeedData);
			
			// Parse to verify valid JSON structure
			const parsed = JSON.parse(result);
			expect(parsed.articles).to.be.an('array');
			expect(parsed.articles).to.have.lengthOf(5);
			
			// Verify first item
			expect(parsed.articles[0].id).to.equal('article-001');
			expect(parsed.articles[0].title).to.equal('JavaScript ES2024 Features Released');
			
			// Verify last item
			expect(parsed.articles[4].id).to.equal('article-005');
			expect(parsed.articles[4].title).to.equal('React 19 Beta Available');
		});

		it('should generate markdown list from RSS items with index', () => {
			const template = `# {{channel.title}}

{{channel.description}}

## Articles

{{#each channel.item}}{{@index1}}. **{{title}}**
   - Link: {{link}}
   - Published: {{pubDate}}
   - {{description}}

{{/each}}`;

			const result = processTemplate(template, rssFeedData);
			
			// Verify header
			expect(result).to.include('# Tech News Feed');
			expect(result).to.include('Latest technology news');
			
			// Verify numbered items (1-based)
			expect(result).to.include('1. **JavaScript ES2024 Features Released**');
			expect(result).to.include('2. **Node.js 20 LTS Announced**');
			expect(result).to.include('3. **Web Performance Best Practices**');
			expect(result).to.include('4. **TypeScript 5.0 Released**');
			expect(result).to.include('5. **React 19 Beta Available**');
		});

		it('should handle RSS feed with 20 items', () => {
			// Create RSS feed with 20 items
			const largeRssFeed = {
				channel: {
					title: 'Large Feed',
					item: Array.from({ length: 20 }, (_, i) => ({
						title: `Article ${i + 1}`,
						link: `https://example.com/article-${i + 1}`,
						description: `Description for article ${i + 1}`,
						pubDate: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`
					}))
				}
			};

			const template = `{{#each channel.item}}- {{title}} ({{link}})
{{/each}}`;

			const result = processTemplate(template, largeRssFeed);
			
			// Verify all 20 items are present
			for (let i = 1; i <= 20; i++) {
				expect(result).to.include(`Article ${i}`);
				expect(result).to.include(`https://example.com/article-${i}`);
			}
			
			// Count lines (should be 20)
			const lines = result.trim().split('\n');
			expect(lines).to.have.lengthOf(20);
		});

		it('should generate CSV from RSS items', () => {
			const template = `Title,Link,Description,Published
{{#each channel.item}}"{{title}}","{{link}}","{{description}}","{{pubDate}}"
{{/each}}`;

			const result = processTemplate(template, rssFeedData);
			
			// Verify CSV header
			expect(result).to.include('Title,Link,Description,Published');
			
			// Verify all rows are present
			const rows = result.trim().split('\n');
			expect(rows).to.have.lengthOf(6); // 1 header + 5 data rows
			
			// Verify first data row
			expect(rows[1]).to.include('JavaScript ES2024 Features Released');
			expect(rows[1]).to.include('https://example.com/js-2024');
		});

		it('should filter and transform RSS items', () => {
			// Template that shows only title and link
			const template = `{{#each channel.item}}{{title}}: {{link}}
{{/each}}`;

			const result = processTemplate(template, rssFeedData);
			
			// Verify simplified output
			expect(result).to.include('JavaScript ES2024 Features Released: https://example.com/js-2024');
			expect(result).to.include('Node.js 20 LTS Announced: https://example.com/nodejs-20');
			
			// Verify no descriptions are included
			expect(result).to.not.include('New features in JavaScript ES2024');
		});

		it('should handle nested loops with RSS categories', () => {
			const rssFeedWithCategories = {
				channel: {
					item: [
						{
							title: 'Article 1',
							link: 'https://example.com/1',
							categories: ['Tech', 'JavaScript', 'Web']
						},
						{
							title: 'Article 2',
							link: 'https://example.com/2',
							categories: ['Node.js', 'Backend']
						}
					]
				}
			};

			// Note: Nested loops are not supported, but we can access array elements
			const template = `{{#each channel.item}}- {{title}}
  Categories: {{categories[0]}}, {{categories[1]}}
{{/each}}`;

			const result = processTemplate(template, rssFeedWithCategories);
			
			expect(result).to.include('Article 1');
			expect(result).to.include('Categories: Tech, JavaScript');
			expect(result).to.include('Article 2');
			expect(result).to.include('Categories: Node.js, Backend');
		});
	});

	describe('Edge Cases for RSS Feeds', () => {
		it('should handle RSS feed with single item', () => {
			const singleItemFeed = {
				channel: {
					item: [
						{
							title: 'Single Article',
							link: 'https://example.com/single',
							description: 'Only one article'
						}
					]
				}
			};

			const template = `{{#each channel.item}}<article>{{title}}</article>{{/each}}`;
			const result = processTemplate(template, singleItemFeed);
			
			expect(result).to.equal('<article>Single Article</article>');
		});

		it('should handle RSS feed with empty items array', () => {
			const emptyFeed = {
				channel: {
					title: 'Empty Feed',
					item: []
				}
			};

			const template = `{{#each channel.item}}<article>{{title}}</article>{{/each}}`;
			const result = processTemplate(template, emptyFeed);
			
			expect(result).to.equal('<!-- Empty array -->');
		});

		it('should handle missing optional fields in RSS items', () => {
			const incompleteFeed = {
				channel: {
					item: [
						{
							title: 'Article with minimal data',
							link: 'https://example.com/minimal'
							// description and pubDate missing
						}
					]
				}
			};

			const template = `{{#each channel.item}}Title: {{title}}
Link: {{link}}
Description: {{description}}
Date: {{pubDate}}
{{/each}}`;

			const result = processTemplate(template, incompleteFeed);
			
			// Missing fields should remain as template variables
			expect(result).to.include('Title: Article with minimal data');
			expect(result).to.include('Link: https://example.com/minimal');
			expect(result).to.include('Description: {{description}}');
			expect(result).to.include('Date: {{pubDate}}');
		});
	});

	describe('Performance with Large RSS Feeds', () => {
		it('should handle 100 items efficiently', () => {
			const largeFeed = {
				channel: {
					item: Array.from({ length: 100 }, (_, i) => ({
						title: `Article ${i + 1}`,
						link: `https://example.com/${i + 1}`,
						description: `Description ${i + 1}`
					}))
				}
			};

			const template = `{{#each channel.item}}{{@index1}}. {{title}}
{{/each}}`;

			const startTime = Date.now();
			const result = processTemplate(template, largeFeed);
			const endTime = Date.now();
			
			// Should complete in reasonable time (< 100ms)
			expect(endTime - startTime).to.be.lessThan(100);
			
			// Verify all items processed
			const lines = result.trim().split('\n');
			expect(lines).to.have.lengthOf(100);
			
			// Verify first and last
			expect(lines[0]).to.equal('1. Article 1');
			expect(lines[99]).to.equal('100. Article 100');
		});
	});
});