import $RefParser from "@apidevtools/json-schema-ref-parser";
import { JSONSchema } from "json-schema-to-ts";

/**
 * A simplified representation of a schema property, designed for easy
 * consumption by the UI renderer.
 */
export interface FormNode {
  type: string; // e.g., 'string', 'number', 'boolean', 'object', 'array'
  title: string;
  description?: string;
  defaultValue?: any;
  properties?: { [key: string]: FormNode }; // For objects
  items?: FormNode; // For arrays
  // ... other properties we might need for rendering
}

/**
 * Parses a JSON schema from a given URL or object, dereferences all $refs,
 * and transforms it into a simplified tree of FormNode objects.
 *
 * @param schema - The JSON schema object or a URL/path to it.
 * @returns A promise that resolves to the root FormNode of the parsed schema.
 */
export async function parseSchema(schema: JSONSchema | string): Promise<FormNode> {
  try {
    // Dereference the schema to resolve all $ref pointers
    const dereferencedSchema = (await $RefParser.dereference(
      schema as any
    )) as JSONSchema;

    // Transform the raw schema into our simplified FormNode tree
    return transformSchemaToFormNode(dereferencedSchema);
  } catch (err) {
    console.error("Error parsing schema:", err);
    throw err;
  }
}

/**
 * Recursively transforms a JSON schema object into a FormNode tree.
 * @param schema - The schema object to transform.
 * @param title - The title for the current node.
 * @returns The transformed FormNode.
 */
function transformSchemaToFormNode(
  schema: JSONSchema,
  title: string = ""
): FormNode {
  // Base case and type checking
  if (typeof schema.type !== "string") {
    // Handle cases where type is an array or missing
    // For now, we'll simplify and just take the first type or default to 'string'
    const type = Array.isArray(schema.type) ? schema.type[0] : "string";
    // A more robust implementation would handle multiple types properly
    return { type, title: schema.title || title };
  }

  const node: FormNode = {
    type: schema.type,
    title: schema.title || title,
    description: schema.description,
    defaultValue: schema.default,
  };

  // Recurse for object properties
  if (schema.type === "object" && schema.properties) {
    node.properties = {};
    for (const key in schema.properties) {
      const propSchema = schema.properties[key] as JSONSchema;
      node.properties[key] = transformSchemaToFormNode(propSchema, key);
    }
  }

  // Recurse for array items
  if (schema.type === "array" && schema.items) {
    // Assuming schema.items is a single schema object
    if (typeof schema.items === "object" && !Array.isArray(schema.items)) {
      node.items = transformSchemaToFormNode(schema.items as JSONSchema, "Item");
    }
  }

  return node;
}
