# Array Looping in Transform Templates

## Overview

The Transform Node now supports looping over arrays in templates, enabling powerful data transformation capabilities for use cases like RSS feeds, API responses, and data aggregation.

## Syntax

### Basic Loop
```
{{#each arrayPath}}
  Content with {{this}} or {{property}}
{{/each}}
```

### Special Variables
- `{{this}}` - Current item in the loop
- `{{this.property}}` - Access property of current item
- `{{property}}` - Direct property access (shorthand)
- `{{@index}}` - Current index (0-based)
- `{{@index1}}` - Current index (1-based)

## Examples

### Example 1: RSS Feed Processing

**Input Data:**
```json
{
  "channel": {
    "title": "Tech News",
    "item": [
      {
        "title": "New JavaScript Features",
        "link": "https://example.com/js-features",
        "description": "Learn about the latest ES2024 features",
        "pubDate": "2024-01-15"
      },
      {
        "title": "Web Performance Tips",
        "link": "https://example.com/performance",
        "description": "Optimize your website for speed",
        "pubDate": "2024-01-14"
      }
    ]
  }
}
```

**Template:**
```html
<h1>{{channel.title}}</h1>
<ul class="feed-items">
{{#each channel.item}}
  <li class="feed-item">
    <h2><a href="{{link}}">{{title}}</a></h2>
    <p>{{description}}</p>
    <small>Published: {{pubDate}}</small>
  </li>
{{/each}}
</ul>
```

**Output:**
```html
<h1>Tech News</h1>
<ul class="feed-items">
  <li class="feed-item">
    <h2><a href="https://example.com/js-features">New JavaScript Features</a></h2>
    <p>Learn about the latest ES2024 features</p>
    <small>Published: 2024-01-15</small>
  </li>
  <li class="feed-item">
    <h2><a href="https://example.com/performance">Web Performance Tips</a></h2>
    <p>Optimize your website for speed</p>
    <small>Published: 2024-01-14</small>
  </li>
</ul>
```

### Example 2: Product List with Index

**Input Data:**
```json
{
  "products": [
    { "name": "Laptop", "price": 999, "stock": 5 },
    { "name": "Mouse", "price": 29, "stock": 50 },
    { "name": "Keyboard", "price": 79, "stock": 20 }
  ]
}
```

**Template:**
```
Product Inventory:
{{#each products}}
{{@index1}}. {{name}} - ${{price}} ({{stock}} in stock)
{{/each}}
```

**Output:**
```
Product Inventory:
1. Laptop - $999 (5 in stock)
2. Mouse - $29 (50 in stock)
3. Keyboard - $79 (20 in stock)
```

### Example 3: User List with Nested Properties

**Input Data:**
```json
{
  "users": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "profile": {
        "role": "Admin",
        "department": "IT"
      }
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "profile": {
        "role": "Developer",
        "department": "Engineering"
      }
    }
  ]
}
```

**Template:**
```
Team Directory:
{{#each users}}
- {{name}} ({{email}})
  Role: {{profile.role}}
  Department: {{profile.department}}
{{/each}}
```

**Output:**
```
Team Directory:
- John Doe (john@example.com)
  Role: Admin
  Department: IT
- Jane Smith (jane@example.com)
  Role: Developer
  Department: Engineering
```

### Example 4: Simple Array of Strings

**Input Data:**
```json
{
  "tags": ["javascript", "nodejs", "svelte", "api"]
}
```

**Template:**
```html
<div class="tags">
{{#each tags}}
  <span class="tag">{{this}}</span>
{{/each}}
</div>
```

**Output:**
```html
<div class="tags">
  <span class="tag">javascript</span>
  <span class="tag">nodejs</span>
  <span class="tag">svelte</span>
  <span class="tag">api</span>
</div>
```

### Example 5: CSV Generation

**Input Data:**
```json
{
  "orders": [
    { "id": "ORD001", "customer": "Alice", "total": 150.00 },
    { "id": "ORD002", "customer": "Bob", "total": 75.50 },
    { "id": "ORD003", "customer": "Charlie", "total": 200.00 }
  ]
}
```

**Template:**
```
Order ID,Customer,Total
{{#each orders}}{{id}},{{customer}},{{total}}
{{/each}}
```

**Output:**
```
Order ID,Customer,Total
ORD001,Alice,150.00
ORD002,Bob,75.50
ORD003,Charlie,200.00
```

### Example 6: Markdown List Generation

**Input Data:**
```json
{
  "tasks": [
    { "title": "Review PR", "status": "done", "assignee": "John" },
    { "title": "Write tests", "status": "in-progress", "assignee": "Jane" },
    { "title": "Deploy to prod", "status": "pending", "assignee": "Bob" }
  ]
}
```

**Template:**
```markdown
# Task List

{{#each tasks}}
## {{@index1}}. {{title}}
- **Status:** {{status}}
- **Assignee:** {{assignee}}

{{/each}}
```

**Output:**
```markdown
# Task List

## 1. Review PR
- **Status:** done
- **Assignee:** John

## 2. Write tests
- **Status:** in-progress
- **Assignee:** Jane

## 3. Deploy to prod
- **Status:** pending
- **Assignee:** Bob
```

### Example 7: JSON Array Transformation

**Input Data:**
```json
{
  "events": [
    { "type": "login", "user": "alice", "timestamp": 1234567890 },
    { "type": "logout", "user": "alice", "timestamp": 1234567900 }
  ]
}
```

**Template:**
```json
{
  "processed_events": [
{{#each events}}    {
      "event_type": "{{type}}",
      "username": "{{user}}",
      "time": {{timestamp}}
    }{{@index1}}{{/each}}
  ]
}
```

## Multiple Loops in One Template

You can use multiple loops in the same template (non-nested):

**Input Data:**
```json
{
  "categories": [
    { "name": "Electronics" },
    { "name": "Books" }
  ],
  "featured": [
    { "title": "Special Offer 1" },
    { "title": "Special Offer 2" }
  ]
}
```

**Template:**
```html
<h2>Categories</h2>
<ul>
{{#each categories}}
  <li>{{name}}</li>
{{/each}}
</ul>

<h2>Featured Items</h2>
<ul>
{{#each featured}}
  <li>{{title}}</li>
{{/each}}
</ul>
```

## Best Practices

1. **Use descriptive array paths**: `{{#each users}}` is clearer than `{{#each data}}`
2. **Prefer direct property access**: Use `{{name}}` instead of `{{this.name}}` when possible
3. **Use @index1 for human-readable numbering**: Better for display purposes
4. **Keep loop content focused**: Each loop should have a single, clear purpose
5. **Test with empty arrays**: Ensure your template handles empty data gracefully

## Limitations

- **No nested loops**: Loops cannot be nested inside other loops
- **Balanced tags required**: Every `{{#each}}` must have a matching `{{/each}}`
- **Array paths only**: The path in `{{#each path}}` must resolve to an array

## Error Handling

If the path doesn't resolve to an array:
```
<!-- Error: path is not an array -->
```

If the array is empty:
```
<!-- Empty array -->
```

## Tips for RSS Feeds

When working with RSS feeds:

1. **Parse XML to JSON first**: Use the XML-to-JSON transform node before the template transform
2. **Check the structure**: RSS feeds typically have `channel.item` or `feed.entry`
3. **Handle missing fields**: Use conditional logic or default values
4. **Format dates**: Consider post-processing dates for better display

## Integration with Workflow

1. **HTTP Call Node** → Fetch RSS feed
2. **XML-to-JSON Transform** → Convert to JSON
3. **Transform Node with Loop** → Format output
4. **Webhook/Output** → Send formatted data

This enables powerful data transformation pipelines without custom code!