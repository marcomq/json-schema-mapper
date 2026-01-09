# JSON Schema to UI Compiler

A framework-agnostic JavaScript library that converts standard JSON Schema (draft 2020-12) into a UI definition, specifically targeting `jsonform` compatibility.

## Architecture

This project implements a compiler-style pipeline to transform data schemas into form definitions:

1.  **Normalization (`src/normalizer.js`)**:
    -   Takes raw JSON Schema.
    -   Resolves all `$ref` pointers using `@apidevtools/json-schema-ref-parser`.
    -   Produces a "Schema IR" (Intermediate Representation).

2.  **Compilation (`src/compiler.js`)**:
    -   Traverses the Schema IR.
    -   Applies declarative rules from `rules.json`.
    -   Produces a "UI IR" (a generic, widget-oriented tree).

3.  **Emission (`src/emitter.js`)**:
    -   Takes the UI IR.
    -   Generates a specific configuration object for `jsonform`.

## Project Structure

```text
.
├── package.json
├── rules.json        # Declarative mapping rules (Schema Type -> Widget Type)
└── src
    ├── compiler.js   # Rule engine and UI IR generation
    ├── emitter.js    # Output generator (jsonform)
    ├── index.js      # Entry point / Example usage
    ├── normalizer.js # Schema dereferencing
    └── types.js      # JSDoc type definitions
```

## Installation

```bash
npm install
```

## Usage

Run the example transformation defined in `src/index.js`:

```bash
npm start
```
