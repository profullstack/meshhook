import { XmlJsonTransformNode } from '../src/nodes/transform-xml-json.js';

// Example 1: Extract XML from http-call response
console.log('Example 1: HTTP Response with XML in data field');
console.log('='.repeat(50));

const httpResponse = {
  status: 200,
  headers: {
    'content-type': 'application/xml',
    'content-length': '150',
  },
  data: `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Tech News</title>
    <item>
      <title>New JavaScript Features</title>
      <link>https://example.com/js-features</link>
    </item>
  </channel>
</rss>`,
};

const node1 = new XmlJsonTransformNode({ sourcePath: 'data' });
const result1 = node1.transform(httpResponse);
console.log('Input:', JSON.stringify(httpResponse, null, 2));
console.log('\nOutput:', JSON.stringify(result1, null, 2));

// Example 2: Deeply nested path
console.log('\n\nExample 2: Deeply Nested Path');
console.log('='.repeat(50));

const nestedData = {
  response: {
    body: {
      content: '<user><name>Alice</name><email>alice@example.com</email></user>',
    },
  },
};

const node2 = new XmlJsonTransformNode({ sourcePath: 'response.body.content' });
const result2 = node2.transform(nestedData);
console.log('Input:', JSON.stringify(nestedData, null, 2));
console.log('\nOutput:', JSON.stringify(result2, null, 2));

// Example 3: Array index in path
console.log('\n\nExample 3: Array Index in Path');
console.log('='.repeat(50));

const arrayData = {
  items: [
    { data: '<item><id>1</id><name>First</name></item>' },
    { data: '<item><id>2</id><name>Second</name></item>' },
  ],
};

const node3 = new XmlJsonTransformNode({ sourcePath: 'items[0].data' });
const result3 = node3.transform(arrayData);
console.log('Input:', JSON.stringify(arrayData, null, 2));
console.log('\nOutput:', JSON.stringify(result3, null, 2));

// Example 4: Without sourcePath (original behavior)
console.log('\n\nExample 4: Without sourcePath (Original Behavior)');
console.log('='.repeat(50));

const directXml = '<root><message>Hello World</message></root>';
const node4 = new XmlJsonTransformNode();
const result4 = node4.transform(directXml);
console.log('Input:', directXml);
console.log('\nOutput:', JSON.stringify(result4, null, 2));