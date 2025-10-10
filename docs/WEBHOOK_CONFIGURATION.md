# Webhook Configuration Guide

This guide explains how to configure webhook nodes in MeshHook workflows with field mapping and template syntax.

## Overview

Webhook nodes in MeshHook allow you to send HTTP requests to external services with dynamic data from your workflow. The configuration supports:

- **Full URL specification** (not just paths)
- **HTTP method selection** (POST, PUT, PATCH)
- **Custom headers** with template variables
- **Body templates** using `{{ }}` syntax for field mapping
- **JMESPath expressions** for complex data transformations

## Configuration Fields

### 1. Webhook URL
- **Required**: Yes
- **Type**: Text
- **Description**: The complete URL of the webhook endpoint
- **Example**: `https://api.example.com/webhook`

### 2. HTTP Method
- **Required**: Yes
- **Type**: Select (POST, PUT, PATCH)
- **Description**: The HTTP method to use for the request
- **Default**: POST

### 3. Headers
- **Required**: No
- **Type**: JSON (textarea)
- **Description**: Custom HTTP headers for the request. Supports template variables.
- **Example**:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{token}}",
  "X-Custom-Header": "{{customValue}}"
}
```

### 4. Body Template
- **Required**: Yes
- **Type**: JSON (textarea)
- **Description**: The request body template with field mappings using `{{ }}` syntax
- **Example**:
```json
{
  "title": "{{title}}",
  "content": "{{content}}",
  "timestamp": "{{timestamp}}",
  "user": {
    "name": "{{user.name}}",
    "email": "{{user.email}}"
  }
}
```

### 5. Description
- **Required**: No
- **Type**: Text
- **Description**: A human-readable description of what this webhook does

## Template Syntax

### Basic Variable Substitution

Use `{{ variableName }}` to insert values from the workflow data:

```json
{
  "message": "{{message}}",
  "count": "{{count}}"
}
```

### Nested Object Access

Access nested properties using dot notation:

```json
{
  "userName": "{{user.name}}",
  "userEmail": "{{user.email}}"
}
```

### Array Access

Access array elements by index:

```json
{
  "firstItem": "{{items[0]}}",
  "secondItem": "{{items[1]}}"
}
```

### JMESPath Expressions

Use JMESPath for complex data transformations:

```json
{
  "allNames": "{{items[*].name}}",
  "activeUsers": "{{users[?active==`true`].name}}",
  "totalPrice": "{{sum(items[*].price)}}"
}
```

## Example Configurations

### Example 1: RSS to Discord Webhook

**Scenario**: Send RSS feed items to a Discord channel

**Configuration**:
- **URL**: `https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN`
- **Method**: POST
- **Headers**:
```json
{
  "Content-Type": "application/json"
}
```
- **Body Template**:
```json
{
  "content": "New article published!",
  "embeds": [{
    "title": "{{title}}",
    "description": "{{description}}",
    "url": "{{link}}",
    "color": 5814783,
    "timestamp": "{{pubDate}}"
  }]
}
```

### Example 2: RSS to Slack Webhook

**Scenario**: Post RSS feed items to a Slack channel

**Configuration**:
- **URL**: `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`
- **Method**: POST
- **Headers**:
```json
{
  "Content-Type": "application/json"
}
```
- **Body Template**:
```json
{
  "text": "New article: {{title}}",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*{{title}}*\n{{description}}"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "<{{link}}|Read more>"
      }
    }
  ]
}
```

### Example 3: Custom API with Authentication

**Scenario**: Send data to a custom API with bearer token authentication

**Configuration**:
- **URL**: `https://api.myservice.com/v1/events`
- **Method**: POST
- **Headers**:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{secrets.apiToken}}",
  "X-Request-ID": "{{requestId}}"
}
```
- **Body Template**:
```json
{
  "event_type": "{{eventType}}",
  "data": {
    "user_id": "{{user.id}}",
    "action": "{{action}}",
    "metadata": "{{metadata}}"
  },
  "timestamp": "{{timestamp}}"
}
```

## Template Processing

The template processor uses the following rules:

1. **Variable Resolution**: Variables are resolved using JMESPath against the workflow data
2. **Missing Values**: If a variable is not found, it's replaced with an empty string
3. **Object Stringification**: If a variable resolves to an object, it's JSON stringified
4. **Error Handling**: If an expression is invalid, the original placeholder is preserved
5. **Whitespace**: Whitespace around variable names is automatically trimmed

## Validation

The system validates templates for:

- **Syntax Errors**: Unmatched `{{` or `}}` braces
- **Empty Expressions**: `{{}}` without content
- **Invalid JMESPath**: Malformed JMESPath expressions

Validation errors are displayed in the UI when configuring the webhook node.

## Best Practices

1. **Use Descriptive Names**: Give your webhook nodes clear, descriptive names
2. **Test Templates**: Use the workflow test feature to verify your templates work correctly
3. **Handle Missing Data**: Consider what happens if expected data is missing
4. **Secure Secrets**: Store API tokens and sensitive data in the secrets vault
5. **Document Complex Expressions**: Add comments in the description field for complex JMESPath expressions
6. **Validate JSON**: Ensure your body template is valid JSON before saving
7. **Use Type Coercion**: Remember that all template values are strings; the receiving API should handle type conversion

## Troubleshooting

### Template Not Replacing Values

**Problem**: Variables like `{{name}}` appear in the output instead of being replaced

**Solutions**:
- Verify the variable exists in the workflow data
- Check for typos in variable names (case-sensitive)
- Ensure the data structure matches your template path

### Invalid JSON Error

**Problem**: The webhook request fails with "Invalid JSON" error

**Solutions**:
- Validate your body template is valid JSON
- Check for trailing commas
- Ensure all strings are properly quoted
- Use a JSON validator tool

### JMESPath Expression Errors

**Problem**: Complex expressions don't work as expected

**Solutions**:
- Test your JMESPath expressions using an online JMESPath tester
- Simplify complex expressions into multiple steps
- Check the JMESPath documentation for correct syntax

## Related Documentation

- [JMESPath Tutorial](https://jmespath.org/tutorial.html)
- [JMESPath Specification](https://jmespath.org/specification.html)
- [Workflow Editor Guide](./docs/workflows.md)
- [Secrets Management](./docs/Security.md)

## API Reference

For programmatic access to template processing:

```javascript
import { 
  processTemplate, 
  processTemplateObject,
  validateTemplate,
  extractTemplateVariables 
} from '$lib/utils/template-processor.js';

// Process a simple template
const result = processTemplate('Hello {{name}}!', { name: 'World' });
// Result: "Hello World!"

// Process a template object
const body = processTemplateObject(
  { title: '{{title}}', count: '{{count}}' },
  { title: 'Test', count: 42 }
);
// Result: { title: 'Test', count: '42' }

// Validate a template
const validation = validateTemplate('Hello {{name}}!');
// Result: { valid: true, errors: [] }

// Extract variables
const vars = extractTemplateVariables('{{greeting}} {{name}}!');
// Result: ['greeting', 'name']