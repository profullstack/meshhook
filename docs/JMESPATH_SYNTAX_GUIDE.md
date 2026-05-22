# JMESPath Syntax Guide

## Overview

JMESPath (JSON Matching Expression Paths) is a query language for JSON. It allows you to extract and transform elements from JSON documents.

## Basic Syntax

### Simple Property Access
```
property
```
**Example:**
```json
Input: {"name": "John", "age": 30}
Expression: name
Output: "John"
```

### Nested Property Access
```
parent.child
```
**Example:**
```json
Input: {"user": {"name": "John", "email": "john@example.com"}}
Expression: user.name
Output: "John"
```

### Array Access
```
array[0]
```
**Example:**
```json
Input: {"items": ["apple", "banana", "cherry"]}
Expression: items[0]
Output: "apple"
```

### Array Slicing
```
array[start:end]
```
**Example:**
```json
Input: {"items": [1, 2, 3, 4, 5]}
Expression: items[1:3]
Output: [2, 3]
```

### Wildcard (All Elements)
```
array[*]
```
**Example:**
```json
Input: {"users": [{"name": "John"}, {"name": "Jane"}]}
Expression: users[*].name
Output: ["John", "Jane"]
```

## Filtering

### Basic Filter
```
array[?condition]
```
**Example:**
```json
Input: {"items": [{"price": 10}, {"price": 20}, {"price": 30}]}
Expression: items[?price > `15`]
Output: [{"price": 20}, {"price": 30}]
```

### Multiple Conditions
```
array[?condition1 && condition2]
```
**Example:**
```json
Input: {"items": [{"name": "A", "price": 10}, {"name": "B", "price": 20}]}
Expression: items[?price > `5` && name == `B`]
Output: [{"name": "B", "price": 20}]
```

## Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equal | `status == 'success'` |
| `!=` | Not equal | `status != 'failed'` |
| `<` | Less than | `price < 100` |
| `<=` | Less than or equal | `age <= 18` |
| `>` | Greater than | `count > 0` |
| `>=` | Greater than or equal | `score >= 90` |

**Note:** String literals must use backticks: `` `string` ``

## Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `&&` | AND | `price > 10 && stock > 0` |
| `\|\|` | OR | `status == 'pending' \|\| status == 'processing'` |
| `!` | NOT | `!completed` |

## Functions

### `length()`
Get array or string length
```
length(items)
```

### `sort()`
Sort an array
```
sort(numbers)
```

### `sort_by()`
Sort by property
```
sort_by(users, &age)
```

### `max()` / `min()`
Get maximum/minimum value
```
max(prices)
min(scores)
```

### `sum()` / `avg()`
Calculate sum or average
```
sum(values)
avg(scores)
```

### `contains()`
Check if array contains value
```
contains(tags, 'important')
```

### `starts_with()` / `ends_with()`
String matching
```
starts_with(name, 'John')
ends_with(email, '@example.com')
```

### `to_string()` / `to_number()`
Type conversion
```
to_string(count)
to_number(price)
```

## Projections

### List Projection
```
array[*].property
```
**Example:**
```json
Input: {"users": [{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]}
Expression: users[*].name
Output: ["John", "Jane"]
```

### Object Projection
```
object.*.property
```
**Example:**
```json
Input: {"data": {"user1": {"name": "John"}, "user2": {"name": "Jane"}}}
Expression: data.*.name
Output: ["John", "Jane"]
```

## Pipe Expressions

Chain multiple expressions
```
expression1 | expression2
```
**Example:**
```json
Input: {"items": [{"price": 10}, {"price": 20}, {"price": 30}]}
Expression: items[*].price | max(@)
Output: 30
```

## Multi-Select

### List
```
[property1, property2]
```
**Example:**
```json
Input: {"name": "John", "age": 30, "email": "john@example.com"}
Expression: [name, age]
Output: ["John", 30]
```

### Hash (Object)
```
{key1: property1, key2: property2}
```
**Example:**
```json
Input: {"firstName": "John", "lastName": "Doe", "age": 30}
Expression: {fullName: firstName, years: age}
Output: {"fullName": "John", "years": 30}
```

## Common Use Cases

### Conditional Node Examples

#### Check Status
```
status == `success`
```

#### Check Multiple Conditions
```
status == `success` && code == `200`
```

#### Check if Value Exists
```
error == null
```

#### Check Array Length
```
length(items) > `0`
```

#### Check if Property Contains Value
```
contains(tags, `important`)
```

### Loop Node Examples

#### Get All Items
```
data.items[*]
```

#### Filter Items
```
items[?price > `10`]
```

#### Get Specific Properties
```
users[*].{name: name, email: email}
```

#### Sort and Filter
```
items[?stock > `0`] | sort_by(@, &price)
```

## Tips

1. **Use backticks for literals**: `` `string` ``, `` `123` ``
2. **Use @ for current node**: In pipes and functions
3. **Test expressions**: Use online JMESPath testers
4. **Start simple**: Build complex expressions step by step
5. **Check types**: Ensure comparisons use correct types

## Resources

- [JMESPath Official Site](https://jmespath.org/)
- [JMESPath Tutorial](https://jmespath.org/tutorial.html)
- [JMESPath Specification](https://jmespath.org/specification.html)
- [Online JMESPath Tester](https://jmespath.org/)

## Examples by Node Type

### Conditional Node

**Check if order is complete:**
```
status == `completed` && payment.received == `true`
```

**Check if user is admin:**
```
user.role == `admin`
```

**Check if array has items:**
```
length(items) > `0`
```

### Loop Node

**Loop over all products:**
```
products[*]
```

**Loop over active users:**
```
users[?active == `true`]
```

**Loop over expensive items:**
```
items[?price > `100`]
```

**Loop over sorted items:**
```
items | sort_by(@, &created_at)