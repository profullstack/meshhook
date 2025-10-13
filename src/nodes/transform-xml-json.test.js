import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { XmlJsonTransformNode, TransformXmlJsonError } from './transform-xml-json.js';

describe('XmlJsonTransformNode', () => {
  describe('Constructor', () => {
    it('should create a node with default config', () => {
      const node = new XmlJsonTransformNode();
      assert.ok(node);
      assert.equal(node.getMetadata().type, 'transform-xml-json');
    });

    it('should create a node with custom options', () => {
      const node = new XmlJsonTransformNode({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });
      assert.ok(node);
    });
  });

  describe('Auto-detection and transformation', () => {
    it('should detect XML input and convert to JSON', () => {
      const node = new XmlJsonTransformNode();
      const xmlInput = '<root><name>Alice</name><age>30</age></root>';
      
      const result = node.transform(xmlInput);
      
      assert.ok(result);
      assert.equal(typeof result, 'object');
      assert.equal(result.root.name, 'Alice');
      assert.equal(result.root.age, 30);
    });

    it('should detect JSON input and convert to XML', () => {
      const node = new XmlJsonTransformNode();
      const jsonInput = {
        root: {
          name: 'Alice',
          age: 30,
        },
      };
      
      const result = node.transform(jsonInput);
      
      assert.ok(result);
      assert.equal(typeof result, 'string');
      assert.ok(result.includes('<root>'));
      assert.ok(result.includes('<name>Alice</name>'));
      assert.ok(result.includes('<age>30</age>'));
    });

    it('should handle JSON string input and convert to XML', () => {
      const node = new XmlJsonTransformNode();
      const jsonString = JSON.stringify({
        root: {
          name: 'Bob',
          email: 'bob@example.com',
        },
      });
      
      const result = node.transform(jsonString);
      
      assert.ok(result);
      assert.equal(typeof result, 'string');
      assert.ok(result.includes('<root>'));
      assert.ok(result.includes('<name>Bob</name>'));
      assert.ok(result.includes('<email>bob@example.com</email>'));
    });

    it('should handle XML with attributes', () => {
      const node = new XmlJsonTransformNode();
      const xmlInput = '<user id="123" active="true"><name>Charlie</name></user>';
      
      const result = node.transform(xmlInput);
      
      assert.ok(result);
      assert.equal(typeof result, 'object');
      assert.equal(result.user.name, 'Charlie');
      // Attributes are included by default
      assert.ok(result.user['@_id'] || result.user.id);
    });

    it('should handle nested XML structures', () => {
      const node = new XmlJsonTransformNode();
      const xmlInput = `
        <company>
          <name>Acme Corp</name>
          <employees>
            <employee>
              <name>Alice</name>
              <role>Engineer</role>
            </employee>
            <employee>
              <name>Bob</name>
              <role>Designer</role>
            </employee>
          </employees>
        </company>
      `;
      
      const result = node.transform(xmlInput);
      
      assert.ok(result);
      assert.equal(result.company.name, 'Acme Corp');
      assert.ok(Array.isArray(result.company.employees.employee));
      assert.equal(result.company.employees.employee.length, 2);
      assert.equal(result.company.employees.employee[0].name, 'Alice');
    });

    it('should handle nested JSON to XML conversion', () => {
      const node = new XmlJsonTransformNode();
      const jsonInput = {
        company: {
          name: 'Acme Corp',
          employees: {
            employee: [
              { name: 'Alice', role: 'Engineer' },
              { name: 'Bob', role: 'Designer' },
            ],
          },
        },
      };
      
      const result = node.transform(jsonInput);
      
      assert.ok(result);
      assert.equal(typeof result, 'string');
      assert.ok(result.includes('<company>'));
      assert.ok(result.includes('<name>Acme Corp</name>'));
      assert.ok(result.includes('<employee>'));
      assert.ok(result.includes('<name>Alice</name>'));
      assert.ok(result.includes('<role>Engineer</role>'));
    });
  });

  describe('RSS Feed parsing', () => {
    it('should parse RSS feed XML to JSON', () => {
      const node = new XmlJsonTransformNode();
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Example Feed</title>
            <link>https://example.com</link>
            <description>An example RSS feed</description>
            <item>
              <title>First Post</title>
              <link>https://example.com/post1</link>
              <description>This is the first post</description>
              <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            </item>
            <item>
              <title>Second Post</title>
              <link>https://example.com/post2</link>
              <description>This is the second post</description>
              <pubDate>Tue, 02 Jan 2024 00:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`;
      
      const result = node.transform(rssXml);
      
      assert.ok(result);
      assert.equal(result.rss.channel.title, 'Example Feed');
      assert.ok(Array.isArray(result.rss.channel.item));
      assert.equal(result.rss.channel.item.length, 2);
      assert.equal(result.rss.channel.item[0].title, 'First Post');
    });

    it('should handle Atom feed XML to JSON', () => {
      const node = new XmlJsonTransformNode();
      const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Example Atom Feed</title>
          <link href="https://example.com"/>
          <updated>2024-01-01T00:00:00Z</updated>
          <entry>
            <title>First Entry</title>
            <link href="https://example.com/entry1"/>
            <id>entry1</id>
            <updated>2024-01-01T00:00:00Z</updated>
            <summary>First entry summary</summary>
          </entry>
        </feed>`;
      
      const result = node.transform(atomXml);
      
      assert.ok(result);
      assert.equal(result.feed.title, 'Example Atom Feed');
      assert.ok(result.feed.entry);
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid XML', () => {
      const node = new XmlJsonTransformNode();
      // Use truly malformed XML that will fail parsing
      const invalidXml = '<root><tag>value</tag';
      
      assert.throws(
        () => node.transform(invalidXml),
        TransformXmlJsonError
      );
    });

    it('should throw error for invalid JSON string', () => {
      const node = new XmlJsonTransformNode();
      const invalidJson = '{ invalid json }';
      
      assert.throws(
        () => node.transform(invalidJson),
        TransformXmlJsonError
      );
    });

    it('should handle empty input gracefully', () => {
      const node = new XmlJsonTransformNode();
      
      assert.throws(
        () => node.transform(''),
        TransformXmlJsonError
      );
    });

    it('should handle null input gracefully', () => {
      const node = new XmlJsonTransformNode();
      
      assert.throws(
        () => node.transform(null),
        TransformXmlJsonError
      );
    });

    it('should handle undefined input gracefully', () => {
      const node = new XmlJsonTransformNode();
      
      assert.throws(
        () => node.transform(undefined),
        TransformXmlJsonError
      );
    });
  });

  describe('Options and configuration', () => {
    it('should respect ignoreAttributes option', () => {
      const node = new XmlJsonTransformNode({
        ignoreAttributes: true,
      });
      const xmlInput = '<user id="123"><name>Alice</name></user>';
      
      const result = node.transform(xmlInput);
      
      assert.ok(result);
      assert.equal(result.user.name, 'Alice');
      // Attributes should be ignored
      assert.equal(result.user['@_id'], undefined);
      assert.equal(result.user.id, undefined);
    });

    it('should respect custom attribute prefix', () => {
      const node = new XmlJsonTransformNode({
        ignoreAttributes: false,
        attributeNamePrefix: '$',
        parseAttributeValue: false, // Keep as string
      });
      const xmlInput = '<user id="123"><name>Alice</name></user>';
      
      const result = node.transform(xmlInput);
      
      assert.ok(result);
      assert.equal(result.user.name, 'Alice');
      assert.equal(result.user.$id, '123');
    });

    it('should handle array mode for single elements', () => {
      const node = new XmlJsonTransformNode({
        isArray: (tagName) => tagName === 'item',
      });
      const xmlInput = '<root><item>Single Item</item></root>';
      
      const result = node.transform(xmlInput);
      
      assert.ok(result);
      // Single item should be treated as array when isArray returns true
      assert.ok(Array.isArray(result.root.item));
    });
  });

  describe('Validation', () => {
    it('should validate successfully for valid configuration', () => {
      const node = new XmlJsonTransformNode();
      const validation = node.validate();
      
      assert.ok(validation.valid);
      assert.equal(validation.errors, undefined);
    });
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const node = new XmlJsonTransformNode();
      const metadata = node.getMetadata();
      
      assert.equal(metadata.type, 'transform-xml-json');
      assert.equal(metadata.description, 'Transform between XML and JSON formats');
      assert.ok(metadata.valid);
    });
  });

  describe('Preview functionality', () => {
    it('should preview XML to JSON transformation', () => {
      const node = new XmlJsonTransformNode();
      const sampleXml = '<user><name>Test</name></user>';
      
      const preview = node.preview(sampleXml);
      
      assert.ok(preview);
      assert.equal(preview.user.name, 'Test');
    });

    it('should preview JSON to XML transformation', () => {
      const node = new XmlJsonTransformNode();
      const sampleJson = { user: { name: 'Test' } };
      
      const preview = node.preview(sampleJson);
      
      assert.ok(preview);
      assert.equal(typeof preview, 'string');
      assert.ok(preview.includes('<user>'));
    });
  });

  describe('Edge cases', () => {
    it('should handle XML with CDATA sections', () => {
      const node = new XmlJsonTransformNode();
      const xmlInput = '<root><content><![CDATA[<script>alert("test")</script>]]></content></root>';
      
      const result = node.transform(xmlInput);
      
      assert.ok(result);
      assert.ok(result.root.content);
    });

    it('should handle XML with namespaces', () => {
      const node = new XmlJsonTransformNode();
      const xmlInput = '<root xmlns:custom="http://example.com"><custom:element>Value</custom:element></root>';
      
      const result = node.transform(xmlInput);
      
      assert.ok(result);
      assert.ok(result.root);
    });

    it('should handle boolean values in JSON to XML', () => {
      const node = new XmlJsonTransformNode();
      const jsonInput = {
        user: {
          name: 'Alice',
          active: true,
          verified: false,
        },
      };
      
      const result = node.transform(jsonInput);
      
      assert.ok(result);
      assert.ok(result.includes('<active>true</active>'));
      assert.ok(result.includes('<verified>false</verified>'));
    });

    it('should handle numeric values in JSON to XML', () => {
      const node = new XmlJsonTransformNode();
      const jsonInput = {
        product: {
          name: 'Widget',
          price: 19.99,
          quantity: 100,
        },
      };
      
      const result = node.transform(jsonInput);
      
      assert.ok(result);
      assert.ok(result.includes('<price>19.99</price>'));
      assert.ok(result.includes('<quantity>100</quantity>'));
    });

    it('should handle arrays in JSON to XML', () => {
      const node = new XmlJsonTransformNode();
      const jsonInput = {
        users: {
          user: ['Alice', 'Bob', 'Charlie'],
        },
      };
      
      const result = node.transform(jsonInput);
      
      assert.ok(result);
      assert.ok(result.includes('<user>Alice</user>'));
      assert.ok(result.includes('<user>Bob</user>'));
      assert.ok(result.includes('<user>Charlie</user>'));
    });
  });
});