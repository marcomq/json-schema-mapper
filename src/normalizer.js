// src/normalizer.js
const $RefParser = require("@apidevtools/json-schema-ref-parser");

/**
 * Resolves all $refs in the schema to produce the Schema IR.
 * @param {Object} schema - Raw JSON Schema
 * @returns {Promise<Object>} - Normalized Schema IR
 */
async function normalize(schema) {
  try {
    // dereference: replaces $ref with the actual schema object
    const schemaIR = await $RefParser.dereference(schema);
    return schemaIR;
  } catch (err) {
    console.error("Schema Normalization Error:", err);
    throw err;
  }
}

module.exports = { normalize };
