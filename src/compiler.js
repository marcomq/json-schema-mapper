// src/compiler.js
const rules = require("../rules.json");

/**
 * Checks if a schema node matches a rule's criteria.
 * @param {Object} schemaNode
 * @param {Object} matchCriteria
 * @returns {boolean}
 */
function matchesRule(schemaNode, matchCriteria) {
  for (const [key, value] of Object.entries(matchCriteria)) {
    if (key === "enum" && value === true) {
      if (!Array.isArray(schemaNode.enum)) return false;
    } else if (key === "additionalProperties" && value === true) {
      // Check if additionalProperties exists and is an object (schema)
      if (
        !schemaNode.additionalProperties ||
        typeof schemaNode.additionalProperties !== "object"
      )
        return false;
    } else if (schemaNode[key] !== value) {
      return false;
    }
  }
  return true;
}

/**
 * Finds the first matching rule for a schema node.
 * @param {Object} schemaNode
 * @returns {Object|null} The output definition from the rule
 */
function findMatchingWidget(schemaNode) {
  for (const rule of rules) {
    if (matchesRule(schemaNode, rule.match)) {
      return rule.output;
    }
  }
  return null; // No matching rule found
}

/**
 * Recursively compiles Schema IR into UI IR.
 * @param {Object} schemaNode - Current node in Schema IR
 * @param {string} keyPath - Dot notation path (e.g., "user.address.city")
 * @param {string} keyName - The specific property name
 * @param {string[]} requiredList - List of required fields from parent
 * @returns {Object} UI IR Node
 */
function compileNode(schemaNode, keyPath, keyName, requiredList = []) {
  const ruleOutput = findMatchingWidget(schemaNode);
  
  // Default fallback if no rule matches (e.g., hidden or unsupported)
  const widgetType = ruleOutput ? ruleOutput.widgetType : "Unknown";

  const uiNode = {
    id: `field_${keyPath.replace(/\./g, "_")}`,
    key: keyPath,
    label: schemaNode.title || keyName,
    widgetType: widgetType,
    required: requiredList.includes(keyName),
    description: schemaNode.description,
    children: [],
    options: {},
  };

  // Handle Enum Options
  if (schemaNode.enum) {
    uiNode.options.choices = schemaNode.enum.map((val) => ({
      label: val,
      value: val,
    }));
  }

  // RECURSION LOGIC

  // 1. Objects (Fixed Properties)
  if (widgetType === "Group" && schemaNode.properties) {
    Object.entries(schemaNode.properties).forEach(([propKey, propSchema]) => {
      const childPath = keyPath ? `${keyPath}.${propKey}` : propKey;
      const childNode = compileNode(
        propSchema,
        childPath,
        propKey,
        schemaNode.required
      );
      uiNode.children.push(childNode);
    });
  }

  // 2. Arrays (Lists)
  if (widgetType === "List" && schemaNode.items) {
    // For arrays, we define a template child.
    // In jsonform, array items usually share the same schema.
    const childNode = compileNode(
      schemaNode.items,
      `${keyPath}[]`, // Array indicator
      "item"
    );
    uiNode.children.push(childNode);
  }

  // 3. Maps (additionalProperties)
  if (widgetType === "Map" && schemaNode.additionalProperties) {
    // A map is a dynamic list of Key-Value pairs.
    // We create a virtual child representing the value schema.
    const valueNode = compileNode(
      schemaNode.additionalProperties,
      `${keyPath}[]`, // Treated as array of entries for UI representation
      "value"
    );
    uiNode.children.push(valueNode);
  }

  return uiNode;
}

/**
 * Main entry point for compilation.
 */
function compile(schemaIR) {
  return compileNode(schemaIR, "", "root");
}

module.exports = { compile };
