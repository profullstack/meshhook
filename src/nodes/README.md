# MeshHook Nodes Module

This module contains the node type implementations for the MeshHook workflow engine. Each node type represents a specific operation that can be performed in a workflow.

## Node Types

### Transform Node (`transform.js`)

Transforms data using JMESPath expressions for powerful JSON querying and manipulation.

**Features:**
- Full JMESPath expression support
- Expression validation
- Preview functionality
- Expression templates for common patterns

**Usage:**
```javascript
import { TransformNode } from './transform.js';

const node = new TransformNode({
  expression: 'users[?status == `active`].{name: name, email: email}'
});

const result = node.transform({
  users: [
    { name: 'Alice', email: 'alice@example.com', status: 'active' },
    { name: 'Bob', email: 'bob@example.com', status: 'inactive' }
  ]
});
// Result: [{ name: 'Alice', email: 'alice@example.com' }]
```

**Common Patterns:**
```javascript
// Extract property
'data.value'

// Map array
'items[*].price'

// Filter array
'users[?age > `25`]'

// Create projection
'{ fullName: name, userAge: age }'

// Aggregate
'sum(items[*].price)'
```

### HTTP Call Node (`http-call.js`)

Executes HTTP requests with comprehensive configuration, retry policies, response handling, and **template variable substitution** (similar to n8n).

**Features:**
- Full HTTP method support (GET, POST, PUT, DELETE, etc.)
- **Template Variables** - Use `{{variable}}` syntax in URL, headers, query params, and body
- **Input from previous nodes** - Receive and process data from previous workflow steps
- Custom headers and query parameters
- Request body serialization
- Configurable timeout
- Exponential backoff retry with jitter
- Multiple response types (JSON, text, blob)
- Request/response validation

**Template Variable Syntax:**
- Simple: `{{userId}}`, `{{token}}`
- Nested: `{{user.profile.name}}`, `{{settings.theme}}`
- Array access: `{{items[0]}}`, `{{users[1].name}}`
- Fallback: Keeps `{{variable}}` if not found in input data

**Usage with static configuration:**
```javascript
import { HttpCallNode } from './http-call.js';

const node = new HttpCallNode({
  url: 'https://api.example.com/users',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token123',
    'Content-Type': 'application/json'
  },
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  },
  timeout: 5000,
  retryPolicy: {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 30000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
  }
});

const result = await node.execute();
console.log(result.status, result.data);
```

**Usage with template variables (recommended):**
```javascript
// Configure node with template variables
const node = new HttpCallNode({
  url: 'https://api.example.com/users/{{userId}}/posts',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer {{token}}',
    'X-User-ID': '{{userId}}'
  },
  body: {
    title: '{{post.title}}',
    content: '{{post.content}}',
    tags: '{{post.tags}}'
  }
});

// Execute with input data from previous node
const inputData = {
  userId: 123,
  token: 'abc123xyz',
  post: {
    title: 'My Blog Post',
    content: 'This is the content...',
    tags: ['tech', 'nodejs']
  }
};

const result = await node.execute(inputData);
// URL becomes: https://api.example.com/users/123/posts
// Headers include: Authorization: Bearer abc123xyz
// Body becomes: { title: 'My Blog Post', content: '...', tags: [...] }
```

**Usage with input as body (no configured body):**
```javascript
// Node receives data from previous workflow step
const node = new HttpCallNode({
  url: 'https://api.example.com/process',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token123'
  }
  // No body configured - will use input data directly
});

// Input data from previous node
const inputData = {
  userId: 123,
  action: 'update',
  metadata: { source: 'workflow' }
};

// Input data is used as request body
const result = await node.execute(inputData);
console.log(result.status, result.data);
```

**Template Processing Rules:**
1. **With configured body + input**: Body templates are processed with input data
2. **Without configured body + input**: Input is used directly as body
3. **With configured body, no input**: Body is used as-is (templates remain unprocessed)
4. **URL & Headers**: Always processed with input data when available

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | required | Request URL |
| `method` | string | 'GET' | HTTP method |
| `headers` | object | {} | Request headers |
| `body` | any | undefined | Request body (optional if using input) |
| `queryParams` | object | undefined | URL query parameters |
| `timeout` | number | 30000 | Timeout in milliseconds |
| `responseType` | string | 'json' | Response type (json/text/blob) |
| `retryPolicy` | object | see below | Retry configuration |

**Execute Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `input` | any | undefined | Optional input data from previous node to use as request body. Takes precedence over configured body. |

**Retry Policy:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxAttempts` | number | 3 | Maximum retry attempts |
| `initialDelay` | number | 1000 | Initial delay in ms |
| `backoffMultiplier` | number | 2 | Exponential backoff multiplier |
| `maxDelay` | number | 30000 | Maximum delay in ms |
| `retryableStatusCodes` | array | [408, 429, 500, 502, 503, 504] | Status codes to retry |

## Testing

All node types include comprehensive test suites using Node.js native test runner.

Run tests:
```bash
# Test all nodes
node --test src/nodes/*.test.js

# Test individual nodes
node --test src/nodes/transform.test.js
node --test src/nodes/http-call.test.js
```

## Integration with Workers

These nodes are designed to be executed by the HTTP executor worker with data flowing between nodes:

```javascript
import { TransformNode } from './nodes/transform.js';
import { HttpCallNode } from './nodes/http-call.js';

// In worker execution with data flow
async function executeNode(nodeConfig, inputFromPreviousNode) {
  switch (nodeConfig.type) {
    case 'transform':
      const transformNode = new TransformNode(nodeConfig);
      return transformNode.transform(inputFromPreviousNode);
      
    case 'http_call':
      const httpNode = new HttpCallNode(nodeConfig);
      // Pass input from previous node (if any)
      return await httpNode.execute(inputFromPreviousNode);
      
    default:
      throw new Error(`Unknown node type: ${nodeConfig.type}`);
  }
}

// Example workflow: Transform → HTTP Call
const transformNode = new TransformNode({
  expression: 'users[*].{id: id, name: name}'
});

const httpNode = new HttpCallNode({
  url: 'https://api.example.com/batch-update',
  method: 'POST'
});

// Execute workflow
const webhookData = { users: [/* ... */] };
const transformedData = transformNode.transform(webhookData);
const result = await httpNode.execute(transformedData);
```

## Node Interface

All nodes implement a common interface:

```javascript
class Node {
  constructor(config) {
    // Initialize node with configuration
  }
  
  execute(input) {
    // Execute node operation
    // Returns: result data
  }
  
  validate() {
    // Validate node configuration
    // Returns: { valid: boolean, errors?: string[] }
  }
  
  getMetadata() {
    // Get node metadata
    // Returns: { type: string, ...config }
  }
}
```

## Error Handling

Each node type has its own error class for clear error identification:

- `TransformError` - Transform operation errors
- `HttpCallError` - HTTP request errors

All errors include relevant context for debugging:

```javascript
try {
  const result = await node.execute();
} catch (error) {
  if (error instanceof HttpCallError) {
    console.error('HTTP Error:', {
      status: error.statusCode,
      request: error.request,
      message: error.message
    });
  }
}
```

## Best Practices

1. **Validation**: Always validate node configuration before execution
2. **Error Handling**: Use try-catch blocks and handle specific error types
3. **Timeouts**: Set appropriate timeouts for HTTP calls
4. **Retry Policies**: Configure retry policies based on API characteristics
5. **Response Types**: Specify response type for better performance
6. **JMESPath**: Test expressions with preview before deployment

## Future Node Types

Planned node types for future implementation:

- **Branch Node**: Conditional logic and routing
- **Delay Node**: Scheduled execution and delays
- **Terminate Node**: Workflow termination
- **Loop Node**: Iteration over collections
- **Parallel Node**: Concurrent execution
- **Webhook Node**: Webhook triggers
- **Database Node**: Database operations

## Dependencies

- `jmespath` - JMESPath expression evaluation (Transform Node only)
- Native `fetch` API - HTTP requests (Node.js 18+)

## Performance Considerations

- Transform nodes compile expressions for better performance
- HTTP nodes use connection pooling via native fetch
- Retry policies include jitter to prevent thundering herd
- Response parsing is optimized based on content type

## Security Considerations

- Validate all user-provided URLs
- Sanitize headers and query parameters
- Use HTTPS for sensitive data
- Implement rate limiting for HTTP calls
- Validate JMESPath expressions before execution