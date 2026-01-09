// src/types.js

/**
 * @typedef {Object} SchemaIR
 * The Normalized Schema IR. This is a dereferenced JSON Schema.
 * @property {string} [type]
 * @property {Object.<string, SchemaIR>} [properties]
 * @property {SchemaIR} [items]
 * @property {SchemaIR|boolean} [additionalProperties]
 * @property {string[]} [required]
 * @property {any[]} [enum]
 * @property {string} [title]
 * @property {string} [description]
 */

/**
 * @typedef {Object} UI_IR_Node
 * The Framework-Agnostic UI Model.
 * @property {string} id - Unique identifier for the node
 * @property {string} widgetType - High-level widget type (e.g., 'Text', 'Select', 'Group', 'List', 'Map')
 * @property {string} key - Dot-notation path for data binding
 * @property {string} label - Human readable label
 * @property {boolean} required - Validation constraint
 * @property {UI_IR_Node[]} [children] - For container widgets
 * @property {Object} [options] - Widget specific options (e.g., select options)
 */

/**
 * @typedef {Object} MappingRule
 * Declarative rule for converting Schema -> UI
 * @property {string} id
 * @property {Object} match - JSON subset to match against schema
 * @property {Object} output - Definition of the UI widget to produce
 */

module.exports = {};
