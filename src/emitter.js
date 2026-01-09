// src/emitter.js

/**
 * Transforms a single UI IR node into jsonform item.
 * @param {Object} uiNode
 * @returns {Object} jsonform definition object
 */
function transformNode(uiNode) {
  const formItem = {
    key: uiNode.key,
    title: uiNode.label,
    required: uiNode.required,
  };

  if (uiNode.description) {
    formItem.description = uiNode.description;
  }

  // Map Generic Widget Types to jsonform types
  switch (uiNode.widgetType) {
    case "Text":
      formItem.type = "text";
      break;
    case "Number":
      formItem.type = "number";
      break;
    case "Checkbox":
      formItem.type = "checkbox";
      break;
    case "Select":
      formItem.type = "select";
      // jsonform expects titleMap or enum options
      if (uiNode.options.choices) {
        formItem.titleMap = uiNode.options.choices.map((c) => ({
          name: c.label,
          value: c.value,
        }));
      }
      break;
    case "Group":
      formItem.type = "fieldset";
      formItem.items = uiNode.children.map(transformNode);
      break;
    case "List":
      formItem.type = "array";
      // jsonform automatically handles array items based on schema,
      // but we can provide specific UI hints for the items here.
      if (uiNode.children.length > 0) {
        formItem.items = uiNode.children.map(transformNode);
      }
      break;
    case "Map":
      // Complex Case: Mapping a Dictionary to a Form.
      // Strategy: Render as an array of objects with a 'key' input.
      formItem.type = "array";
      formItem.title = `${uiNode.label} (Dictionary)`;
      
      // We construct a composite item for the map entry
      const valueChild = uiNode.children[0]; // The value schema
      
      // We inject a "Key" field manually for the map entry
      const keyField = {
        key: `${uiNode.key}[].key`, // Virtual key path
        title: "Key",
        type: "text",
        required: true
      };

      const valueField = transformNode(valueChild);
      // Adjust the value field key to be relative to the array item
      valueField.title = "Value"; 

      formItem.items = [
        {
          type: "fieldset",
          items: [keyField, valueField]
        }
      ];
      break;
    default:
      formItem.type = "text"; // Fallback
  }

  // Clean up undefined keys
  Object.keys(formItem).forEach(
    (key) => formItem[key] === undefined && delete formItem[key]
  );

  return formItem;
}

/**
 * Generates the final jsonform configuration.
 * @param {Object} uiIR - The root UI IR node
 * @returns {Object} The jsonform object { schema, form }
 */
function emit(uiIR) {
  // jsonform requires two things:
  // 1. The Schema (we use the normalized one, passed through or referenced)
  // 2. The Form Definition (which we generated)
  
  // Since the root is usually a container, we return the items array
  let formDef = [];
  
  if (uiIR.widgetType === 'Group' || uiIR.widgetType === 'Map') {
      formDef = uiIR.children.map(transformNode);
  } else {
      formDef = [transformNode(uiIR)];
  }

  return formDef;
}

module.exports = { emit };