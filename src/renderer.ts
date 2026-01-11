import { FormNode } from "./parser";
import * as templates from "./templates";
import { Store } from "./state";
import { RenderContext, CustomRenderer } from "./types";
import { attachInteractivity } from "./events";

// Configuration for specific fields
const DEFAULT_CUSTOM_RENDERERS: Record<string, CustomRenderer<any>> = {
  "mode": {
    widget: "select",
    options: ["consumer", "subscriber"]
  }
};

// Global reference to the current rendering context to support legacy calls
let activeContext: RenderContext | null = null;

function isRenderContext(obj: any): obj is RenderContext {
  return obj && typeof obj === 'object' && 'store' in obj && 'config' in obj;
}

/**
 * Renders a form into the container based on the parsed schema tree.
 * @param rootNode - The root FormNode of the schema.
 * @param formContainer - The HTML element to render the form into.
 */
export function renderForm(rootNode: FormNode, formContainer: HTMLElement, store: Store<any>, config: any, customRenderers: Record<string, CustomRenderer<any>> = {}) {
  const context: RenderContext = {
    store,
    config,
    nodeRegistry: new Map(),
    dataPathRegistry: new Map(),
    elementIdToDataPath: new Map(),
    customRenderers: { ...DEFAULT_CUSTOM_RENDERERS, ...customRenderers },
    rootNode
  };

  const html = renderNode(context, rootNode, "", false, "") as unknown as string;
  formContainer.innerHTML = templates.renderFormWrapper(html);
  attachInteractivity(context, formContainer);
}

export function findCustomRenderer<T>(context: RenderContext, elementId: string): CustomRenderer<T> | undefined {
  const fullPathKey = elementId.toLowerCase();
  let maxMatchLen = -1;
  let bestMatch: CustomRenderer<T> | undefined;

  for (const key in context.customRenderers) {
    const lowerKey = key.toLowerCase();
    if (fullPathKey === lowerKey || fullPathKey.endsWith('.' + lowerKey)) {
      if (lowerKey.length > maxMatchLen) {
        bestMatch = context.customRenderers[key];
      }
    }
  }
  return bestMatch;
}

export function renderNode<T = any>(contextOrNode: RenderContext | FormNode, nodeOrPath: FormNode | string, pathOrHeadless: string | boolean = "", headlessOrDataPath: boolean | string = false, dataPath: string = ""): T {
  let context: RenderContext;
  let node: FormNode;
  let path: string;
  let headless: boolean;
  let dPath: string;

  if (isRenderContext(contextOrNode)) {
    context = contextOrNode;
    node = nodeOrPath as FormNode;
    path = pathOrHeadless as string;
    headless = headlessOrDataPath as boolean;
    dPath = dataPath;
  } else {
    if (!activeContext) throw new Error("RenderContext missing in renderNode and no active context found.");
    context = activeContext;
    node = contextOrNode as FormNode;
    path = nodeOrPath as string;
    headless = pathOrHeadless as boolean;
    dPath = headlessOrDataPath as string;
  }

  const prevContext = activeContext;
  activeContext = context;

  try {
  let segment = node.key;
  if (!segment) {
    // If no key (e.g. root or oneOf variant), use a prefixed title to avoid collision
    // and allow resolvePath to skip it.
    const safeTitle = node.title.replace(/[^a-zA-Z0-9]/g, '');
    segment = path ? `__var_${safeTitle}` : (safeTitle || 'root');
  }

  const elementId = path ? `${path}.${segment}` : segment;

  if (context.config.visibility.customVisibility && !context.config.visibility.customVisibility(node, elementId)) {
    return templates.renderFragment([]) as T;
  }

  if (context.config.visibility.hiddenPaths.includes(elementId) || context.config.visibility.hiddenKeys.includes(node.title)) {
    return templates.renderFragment([]) as T;
  }
  
  // Register node for potential lookups
  context.nodeRegistry.set(elementId, node);
  context.dataPathRegistry.set(dataPath, elementId);
  context.elementIdToDataPath.set(elementId, dataPath);

  // 1. Custom Renderers
  const renderer = findCustomRenderer<T>(context, elementId);

  if (renderer?.render) {
    return renderer.render(node, path, elementId, dataPath, context);
  }

  // 2. Widget Overrides
  if (renderer?.widget === 'select') {
    return templates.renderSelect(node, elementId, renderer.options || []) as T;
  }

  if (node.enum) {
    return templates.renderSelect(node, elementId, node.enum.map(String)) as T;
  }

  // 3. Standard Types
  switch (node.type) {
    case "string": return templates.renderString(node, elementId) as T;
    case "number":
    case "integer": {
      // Prevent "null" string in value attribute for number inputs which causes browser warnings
      const safeNode = node.defaultValue === null ? { ...node, defaultValue: "" } : node;
      return templates.renderNumber(safeNode, elementId) as T;
    }
    case "boolean": return templates.renderBoolean(node, elementId) as T;
    case "object": return renderObject(context, node, path, elementId, headless, dataPath) as T;
    case "array": return templates.renderArray(node, elementId) as T;
    case "null": return templates.renderNull(node) as T;
    default: return templates.renderUnsupported(node) as T;
  }
  } finally {
    activeContext = prevContext;
  }
}

export function renderObject<T = any>(contextOrNode: RenderContext | FormNode, nodeOrPath: FormNode | string, pathOrId: string, idOrHeadless: string | boolean, headlessOrDataPath: boolean | string = false, dataPath: string = ""): T {
  let context: RenderContext;
  let node: FormNode;
  let elementId: string;
  let headless: boolean;
  let dPath: string;

  if (isRenderContext(contextOrNode)) {
    context = contextOrNode;
    node = nodeOrPath as FormNode;
    // _path is ignored in implementation but present in signature
    elementId = idOrHeadless as string;
    headless = headlessOrDataPath as boolean;
    dPath = dataPath;
  } else {
    if (!activeContext) throw new Error("RenderContext missing in renderObject");
    context = activeContext;
    node = contextOrNode as FormNode;
    elementId = pathOrId;
    headless = idOrHeadless as boolean;
    dPath = headlessOrDataPath as string;
  }

  const props = node.properties ? renderProperties<T>(context, node.properties, elementId, dataPath) : templates.renderFragment([]);
  const ap = templates.renderAdditionalProperties(node, elementId);
  const oneOf = templates.renderOneOf(node, elementId);
  
  const content = templates.renderFragment([props, ap, oneOf]);

  if (headless) {
    return templates.renderHeadlessObject(elementId, content) as T;
  }
  return templates.renderObject(node, elementId, content) as T;
}

export function renderProperties<T = any>(contextOrProps: RenderContext | { [key: string]: FormNode }, propsOrId: { [key: string]: FormNode } | string, idOrPath: string, path?: string): T {
  let context: RenderContext;
  let properties: { [key: string]: FormNode };
  let parentId: string;
  let parentDataPath: string;

  if (isRenderContext(contextOrProps)) {
    context = contextOrProps;
    properties = propsOrId as { [key: string]: FormNode };
    parentId = idOrPath;
    parentDataPath = path || "";
  } else {
    if (!activeContext) throw new Error("RenderContext missing in renderProperties");
    context = activeContext;
    properties = contextOrProps as { [key: string]: FormNode };
    parentId = propsOrId as string;
    parentDataPath = idOrPath;
  }

  const groups = context.config.layout.groups[parentId] || [];
  const groupedKeys = new Set(groups.flatMap((g: { keys: string[]; title?: string; className?: string; }) => g.keys));
 
  // Render groups
  const groupsHtml = templates.renderFragment(groups.map((group: { keys: string[]; title?: string; className?: string; }) => {
    const groupContent = templates.renderFragment(group.keys
      .map(key => properties[key] ? renderNode(context, properties[key], parentId, false, `${parentDataPath}/${key}`) : templates.renderFragment([]))
    );
    return templates.renderLayoutGroup(group.title, groupContent, group.className);
  }));

  // Filter out grouped keys for the remaining list
  const remainingKeys = Object.keys(properties).filter(k => !groupedKeys.has(k));

  const keys = remainingKeys.sort((a, b) => {
    const nodeA = properties[a];
    const nodeB = properties[b];
    
    // 1. Priority fields (e.g. name, id, enabled)
    const priority = context.config.sorting.perObjectPriority[parentId] || context.config.sorting.defaultPriority;
    const idxA = priority.indexOf(a.toLowerCase());
    const idxB = priority.indexOf(b.toLowerCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    // 2. Primitives before Objects/Arrays
    const isPrimitiveA = ['string', 'number', 'integer', 'boolean'].includes(nodeA.type);
    const isPrimitiveB = ['string', 'number', 'integer', 'boolean'].includes(nodeB.type);
    if (isPrimitiveA !== isPrimitiveB) {
      return isPrimitiveA ? -1 : 1;
    }

    // 3. Alphabetical
    return a.localeCompare(b);
  });

  const remainingHtml = templates.renderFragment(keys
    .map(key => renderNode(context, properties[key], parentId, false, `${parentDataPath}/${key}`))
  );

  return templates.renderFragment([groupsHtml, remainingHtml]) as T;
}

export function hydrateNodeWithData(node: FormNode, data: any): FormNode {
  if (data === undefined) return node;
  
  const newNode = { ...node };

  if (newNode.type === 'object' && newNode.properties && typeof data === 'object' && data !== null) {
    newNode.properties = { ...newNode.properties };
    for (const key in newNode.properties) {
      newNode.properties[key] = hydrateNodeWithData(newNode.properties[key], data[key]);
    }
  } else if (['string', 'number', 'integer', 'boolean'].includes(newNode.type)) {
    let isValid = true;
    if (newNode.enum && newNode.enum.length > 0) {
      if (!newNode.enum.includes(data)) {
        isValid = false;
      }
    }
    if (isValid) {
      newNode.defaultValue = data;
    }
  }
  
  return newNode;
}
