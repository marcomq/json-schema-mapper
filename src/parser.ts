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
  additionalProperties?: boolean | FormNode;
  oneOf?: FormNode[];
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
    const parser = new $RefParser();
    // Parse first to get the raw structure and check for root $ref
    const parsedSchema = (await parser.parse(schema as any)) as JSONSchema;
    console.log(parsedSchema);
    const rootRef = parsedSchema.$ref;
    const rootAdditionalPropertiesRef = (parsedSchema.additionalProperties as any)?.$ref;

    console.log("a");
    // Dereference the schema to resolve all $ref pointers
    const dereferencedSchema = (await parser.dereference(schema as any)) as JSONSchema;
    console.log("b");
    let finalSchema = dereferencedSchema;

    // If the root schema had a $ref, resolve it manually from the dereferenced definitions
    if (rootRef && rootRef.startsWith("#/")) {
      console.log(1);
      const refPath = rootRef.substring(2).split("/");
      let definition: any = dereferencedSchema;
      for (const part of refPath) {
        definition = definition?.[part];
      }
      if (definition) {
        finalSchema = { ...dereferencedSchema, ...definition };
      }
    }

    // If the root schema had a $ref in additionalProperties, resolve it manually
    if (rootAdditionalPropertiesRef && rootAdditionalPropertiesRef.startsWith("#/")) {
      console.log(2);
      const refPath = rootAdditionalPropertiesRef.substring(2).split("/");
      let definition: any = dereferencedSchema;
      for (const part of refPath) {
        definition = definition?.[part];
      }
      if (definition) {
        finalSchema.additionalProperties = { ...(finalSchema.additionalProperties as object), ...definition };
      }
    }

    // Transform the raw schema into our simplified FormNode tree
    console.log("dereferencedSchema:", finalSchema);
    return transformSchemaToFormNode(finalSchema);
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
  title: string = "",
  depth: number = 0
): FormNode {
  if (depth > 16) {
    return { type: "string", title: title || "Max Depth Reached", description: "Maximum recursion depth exceeded." };
  }

  if (typeof schema === "boolean") {
    return { type: "boolean", title };
  }

  if (schema.allOf) {
    schema = mergeAllOf(schema);
  }
  if (typeof schema === "boolean") {
    return { type: "boolean", title };
  }

  // Base case and type checking
  let type = schema.type;
  if (!type) {
    // Infer type if missing
    if (schema.properties || schema.additionalProperties || schema.oneOf) {
      type = "object";
    } else {
      type = Array.isArray(schema.type) ? schema.type[0] : "string";
    }
  } else if (Array.isArray(type)) {
    type = type[0];
  }

  const node: FormNode = {
    type: type as string,
    title: schema.title || title,
    description: schema.description,
    defaultValue: schema.default,
  };

  // Handle oneOf
  if (schema.oneOf) {
    node.oneOf = schema.oneOf.map((sub: any, idx: number) => {
      const mergedSub = mergeAllOf(sub);
      return transformSchemaToFormNode(mergedSub, inferTitle(mergedSub, idx), depth + 1);
    });
  }

  // Recurse for object properties
  if (node.type === "object") {
    if (schema.properties) {
      node.properties = {};
      for (const key in schema.properties) {
        const propSchema = schema.properties[key] as JSONSchema;
        node.properties[key] = transformSchemaToFormNode(propSchema, key, depth + 1);
      }
    }
    if (schema.additionalProperties !== undefined) {
      if (typeof schema.additionalProperties === "boolean") {
        node.additionalProperties = schema.additionalProperties;
      } else {
        node.additionalProperties = transformSchemaToFormNode(
          schema.additionalProperties as JSONSchema,
          "Additional Property",
          depth + 1
        );
      }
    }
  }

  // Recurse for array items
  if (schema.type === "array" && schema.items) {
    // Assuming schema.items is a single schema object
    if (typeof schema.items === "object" && !Array.isArray(schema.items)) {
      node.items = transformSchemaToFormNode(schema.items as JSONSchema, "Item", depth + 1);
    }
  }

  return node;
}

function getConstOrEnum(schema: any): string | undefined {
  if (!schema) return undefined;
  if (schema.const) return String(schema.const);
  if (schema.enum && schema.enum.length === 1) return String(schema.enum[0]);
  
  if (schema.allOf) {
    for (const sub of schema.allOf) {
      const val = getConstOrEnum(sub);
      if (val) return val;
    }
  }
  return undefined;
}

function inferTitle(schema: any, index: number): string {
  if (schema.title) return schema.title;
  
  const directVal = getConstOrEnum(schema);
  if (directVal) return directVal;
  
  // Heuristic: If the object has exactly one property, use that property name as the title.
  if (schema.properties) {
    const keys = Object.keys(schema.properties);
    if (keys.length === 1) return keys[0];
  }

  const candidates = ['type', 'name', 'kind', 'id', 'mode', 'strategy', 'action', 'method', 'service', 'provider'];
  for (const key of candidates) {
    if (schema.properties?.[key]) {
      const val = getConstOrEnum(schema.properties[key]);
      if (val) return val;
      if (schema.properties[key].default) return String(schema.properties[key].default);
    }
  }

  // Fallback: Check ANY property for a const/single-enum string value
  if (schema.properties) {
    for (const key in schema.properties) {
      const val = getConstOrEnum(schema.properties[key]);
      if (val && val.length < 50) return val;
    }
  }
  
  return `Option ${index + 1}`;
}

function mergeAllOf(schema: JSONSchema): JSONSchema {
  const merged: any = { ...schema };
  delete merged.allOf;

  if (!schema.allOf) return schema;

  schema.allOf.forEach((subSchema: any) => {
    // Recursively merge nested allOfs to ensure we get all properties
    const flattenedSub = mergeAllOf(subSchema);

    if (!merged.title && flattenedSub.title) {
      merged.title = flattenedSub.title;
    }
    if (flattenedSub.type && !merged.type) {
      merged.type = flattenedSub.type;
    }
    if (flattenedSub.properties) {
      merged.properties = { ...merged.properties, ...flattenedSub.properties };
    }
    if (flattenedSub.required) {
      merged.required = [...(merged.required || []), ...flattenedSub.required];
    }
    if (flattenedSub.additionalProperties !== undefined) {
      merged.additionalProperties = flattenedSub.additionalProperties;
    }
    if (flattenedSub.oneOf) {
      merged.oneOf = flattenedSub.oneOf;
    }
  });

  return merged;
}
