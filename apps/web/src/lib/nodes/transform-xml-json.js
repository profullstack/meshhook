import { XMLParser, XMLBuilder } from 'fast-xml-parser';

/**
 * Transform XML/JSON Node Implementation
 *
 * Auto-detects input format and converts between XML and JSON.
 * Useful for parsing RSS feeds and converting them to JSON for webhooks.
 *
 * @example XML to JSON
 * const node = new XmlJsonTransformNode();
 * const result = node.transform('<root><name>Alice</name></root>');
 * // Result: { root: { name: 'Alice' } }
 *
 * @example JSON to XML
 * const node = new XmlJsonTransformNode();
 * const result = node.transform({ root: { name: 'Alice' } });
 * // Result: '<root><name>Alice</name></root>'
 *
 * @example RSS Feed
 * const node = new XmlJsonTransformNode();
 * const rssXml = '<rss><channel><item><title>Post</title></item></channel></rss>';
 * const json = node.transform(rssXml);
 * // Result: { rss: { channel: { item: { title: 'Post' } } } }
 */

/**
 * Custom error class for XML/JSON transform errors
 */
export class TransformXmlJsonError extends Error {
  /**
   * Create a transform error
   * @param {string} message - Error message
   * @param {any} input - The input that caused the error
   */
  constructor(message, input) {
    super(message);
    this.name = 'TransformXmlJsonError';
    this.input = input;
    Error.captureStackTrace?.(this, TransformXmlJsonError);
  }
}

/**
 * XML/JSON Transform Node
 *
 * Automatically detects input format and converts between XML and JSON
 */
export class XmlJsonTransformNode {
  /**
   * Create an XML/JSON transform node
   * @param {Object} config - Node configuration
   * @param {boolean} config.ignoreAttributes - Ignore XML attributes (default: false)
   * @param {string} config.attributeNamePrefix - Prefix for attribute names (default: '@_')
   * @param {boolean} config.ignoreDeclaration - Ignore XML declaration (default: true)
   * @param {boolean} config.ignoreNameSpace - Ignore XML namespaces (default: false)
   * @param {boolean} config.parseAttributeValue - Parse attribute values (default: true)
   * @param {boolean} config.parseTagValue - Parse tag values (default: true)
   * @param {boolean} config.trimValues - Trim whitespace from values (default: true)
   * @param {Function} config.isArray - Function to determine if tag should be array
   * @param {string} config.format - Output format for XML ('pretty' or 'compact', default: 'compact')
   */
  constructor(config = {}) {
    // Parser options for XML to JSON
    this.parserOptions = {
      ignoreAttributes: config.ignoreAttributes ?? false,
      attributeNamePrefix: config.attributeNamePrefix ?? '@_',
      ignoreDeclaration: config.ignoreDeclaration ?? true,
      ignoreNameSpace: config.ignoreNameSpace ?? false,
      parseAttributeValue: config.parseAttributeValue ?? true,
      parseTagValue: config.parseTagValue ?? true,
      trimValues: config.trimValues ?? true,
    };

    // Only add isArray if it's a function
    if (typeof config.isArray === 'function') {
      this.parserOptions.isArray = config.isArray;
    }

    // Builder options for JSON to XML
    this.builderOptions = {
      ignoreAttributes: config.ignoreAttributes ?? false,
      attributeNamePrefix: config.attributeNamePrefix ?? '@_',
      format: config.format === 'pretty' || config.format === true,
      suppressEmptyNode: true,
      indentBy: '  ', // 2 spaces for indentation
    };

    this.parser = new XMLParser(this.parserOptions);
    this.builder = new XMLBuilder(this.builderOptions);
  }

  /**
   * Detect if input is XML string
   * @private
   * @param {any} input - Input to check
   * @returns {boolean} True if input appears to be XML
   */
  _isXml(input) {
    if (typeof input !== 'string') {
      return false;
    }

    const trimmed = input.trim();
    
    // Check for XML declaration or root element
    return (
      trimmed.startsWith('<?xml') ||
      (trimmed.startsWith('<') && trimmed.endsWith('>'))
    );
  }

  /**
   * Detect if input is JSON (object or valid JSON string)
   * @private
   * @param {any} input - Input to check
   * @returns {boolean} True if input is JSON
   */
  _isJson(input) {
    // Already an object
    if (typeof input === 'object' && input !== null) {
      return true;
    }

    // Try to parse as JSON string
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          JSON.parse(trimmed);
          return true;
        } catch {
          return false;
        }
      }
    }

    return false;
  }

  /**
   * Transform input between XML and JSON formats
   *
   * @param {any} input - Input data (XML string, JSON object, or JSON string)
   * @returns {any} Transformed data (JSON object if input was XML, XML string if input was JSON)
   * @throws {TransformXmlJsonError} If transformation fails
   *
   * @example XML to JSON
   * const node = new XmlJsonTransformNode();
   * const result = node.transform('<user><name>Alice</name></user>');
   * // Result: { user: { name: 'Alice' } }
   *
   * @example JSON to XML
   * const node = new XmlJsonTransformNode();
   * const result = node.transform({ user: { name: 'Alice' } });
   * // Result: '<user><name>Alice</name></user>'
   */
  transform(input) {
    // Validate input
    if (input === null || input === undefined) {
      throw new TransformXmlJsonError(
        'Input cannot be null or undefined',
        input
      );
    }

    if (typeof input === 'string' && input.trim() === '') {
      throw new TransformXmlJsonError('Input cannot be empty string', input);
    }

    try {
      // Auto-detect format and transform
      if (this._isXml(input)) {
        return this._xmlToJson(input);
      } else if (this._isJson(input)) {
        return this._jsonToXml(input);
      } else {
        throw new TransformXmlJsonError(
          'Unable to detect input format. Input must be valid XML or JSON.',
          input
        );
      }
    } catch (error) {
      if (error instanceof TransformXmlJsonError) {
        throw error;
      }
      throw new TransformXmlJsonError(
        `Transform failed: ${error.message}`,
        input
      );
    }
  }

  /**
   * Convert XML string to JSON object
   * @private
   * @param {string} xml - XML string
   * @returns {Object} JSON object
   */
  _xmlToJson(xml) {
    try {
      return this.parser.parse(xml);
    } catch (error) {
      throw new TransformXmlJsonError(
        `XML parsing failed: ${error.message}`,
        xml
      );
    }
  }

  /**
   * Convert JSON to XML string
   * @private
   * @param {any} json - JSON object or string
   * @returns {string} XML string
   */
  _jsonToXml(json) {
    try {
      // Parse JSON string if needed
      const obj = typeof json === 'string' ? JSON.parse(json) : json;
      
      return this.builder.build(obj);
    } catch (error) {
      throw new TransformXmlJsonError(
        `JSON to XML conversion failed: ${error.message}`,
        json
      );
    }
  }

  /**
   * Validate the transform configuration
   *
   * @returns {Object} Validation result with valid flag and optional errors
   *
   * @example
   * const node = new XmlJsonTransformNode();
   * const result = node.validate();
   * // Result: { valid: true }
   */
  validate() {
    // Configuration is always valid since we have sensible defaults
    return {
      valid: true,
    };
  }

  /**
   * Preview transformation with sample data
   *
   * @param {any} sampleData - Sample data to preview transformation
   * @returns {any} Preview result
   * @throws {TransformXmlJsonError} If preview fails
   *
   * @example
   * const node = new XmlJsonTransformNode();
   * const preview = node.preview('<root><name>Test</name></root>');
   * // Result: { root: { name: 'Test' } }
   */
  preview(sampleData) {
    return this.transform(sampleData);
  }

  /**
   * Get node metadata
   *
   * @returns {Object} Node metadata
   */
  getMetadata() {
    return {
      type: 'transform-xml-json',
      description: 'Transform between XML and JSON formats',
      valid: this.validate().valid,
      options: {
        ignoreAttributes: this.parserOptions.ignoreAttributes,
        attributeNamePrefix: this.parserOptions.attributeNamePrefix,
      },
    };
  }
}

/**
 * Create an XML/JSON transform node
 *
 * @param {Object} config - Node configuration
 * @returns {XmlJsonTransformNode} New transform node instance
 */
export function createXmlJsonTransformNode(config) {
  return new XmlJsonTransformNode(config);
}

/**
 * Helper function to parse RSS feed XML to JSON
 *
 * @param {string} rssXml - RSS feed XML string
 * @returns {Object} Parsed RSS feed as JSON
 *
 * @example
 * const feed = parseRssFeed(rssXmlString);
 * console.log(feed.rss.channel.title);
 * console.log(feed.rss.channel.item); // Array of items
 */
export function parseRssFeed(rssXml) {
  const node = new XmlJsonTransformNode();
  return node.transform(rssXml);
}

/**
 * Helper function to parse Atom feed XML to JSON
 *
 * @param {string} atomXml - Atom feed XML string
 * @returns {Object} Parsed Atom feed as JSON
 *
 * @example
 * const feed = parseAtomFeed(atomXmlString);
 * console.log(feed.feed.title);
 * console.log(feed.feed.entry); // Array of entries
 */
export function parseAtomFeed(atomXml) {
  const node = new XmlJsonTransformNode();
  return node.transform(atomXml);
}

/**
 * Helper function to convert JSON to XML
 *
 * @param {Object} json - JSON object to convert
 * @param {Object} options - Optional configuration
 * @returns {string} XML string
 *
 * @example
 * const xml = jsonToXml({ root: { name: 'Alice' } });
 * // Result: '<root><name>Alice</name></root>'
 */
export function jsonToXml(json, options = {}) {
  const node = new XmlJsonTransformNode(options);
  return node.transform(json);
}

/**
 * Helper function to convert XML to JSON
 *
 * @param {string} xml - XML string to convert
 * @param {Object} options - Optional configuration
 * @returns {Object} JSON object
 *
 * @example
 * const json = xmlToJson('<root><name>Alice</name></root>');
 * // Result: { root: { name: 'Alice' } }
 */
export function xmlToJson(xml, options = {}) {
  const node = new XmlJsonTransformNode(options);
  return node.transform(xml);
}