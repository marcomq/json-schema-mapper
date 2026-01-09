// src/index.js
const { normalize } = require("./normalizer");
const { compile } = require("./compiler");
const { emit } = require("./emitter");

// 🔹 EXAMPLE INPUT SCHEMA (From Prompt)
const rawSchema = {
  type: "object",
  title: "Route Configuration",
  additionalProperties: {
    $ref: "#/$defs/Route",
  },
  $defs: {
    Route: {
      type: "object",
      properties: {
        distance: { type: "number" },
        name: { type: "string" },
      },
      required: ["distance"],
    },
  },
};

async function main() {
  console.log("--- 1. Input Schema ---");
  console.log(JSON.stringify(rawSchema, null, 2));

  // Step 1: Normalize
  const schemaIR = await normalize(rawSchema);
  console.log("\n--- 2. Schema IR (Normalized) ---");
  // Note: $defs are resolved into additionalProperties
  console.log(JSON.stringify(schemaIR, null, 2));

  // Step 2: Compile to UI IR
  const uiIR = compile(schemaIR);
  console.log("\n--- 3. UI IR (Framework Agnostic) ---");
  console.log(JSON.stringify(uiIR, null, 2));

  // Step 3: Emit jsonform config
  const jsonFormConfig = emit(uiIR);
  console.log("\n--- 4. Output (jsonform config) ---");
  console.log(JSON.stringify(jsonFormConfig, null, 2));
}

main().catch(console.error);
