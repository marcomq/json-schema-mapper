import {
  h,
  renderObject,
  renderProperties,
  domRenderer,
  setI18n,
  setConfig,
  setCustomRenderers,
  generateDefaultData,
  renderNode,
} from "../src/index";

// Apply global I18N overrides
setI18n({
  keys: {
    Map_of_Route: "Routes", // Rename "Map of Route" to "Routes" in the UI
  },
});

// Configure global visibility rules
setConfig({
  visibility: {
    // Custom visibility logic based on node description and path
    customVisibility: (node, path) => {
      const description = node.description || "";
      const lowerPath = path.toLowerCase();

      if (
        lowerPath.includes(".input") &&
        description.includes("Publisher only")
      ) {
        return false;
      }
      if (
        lowerPath.includes(".output") &&
        description.includes("Consumer only")
      ) {
        return false;
      }
      return true;
    },
  },
  sorting: {
    defaultRenderLast: ["middlewares"],
    defaultPriority: [
      "input",
      "output",
      "name",
      "id",
      "title",
      "type",
      "enabled",
      "active",
      "url",
      "brokers",
      "username",
      "password",
      "topic",
      "group",
      "key",
      "value",
      "required",
    ],
  },
});

// Override renderFieldWrapper for compact layout
const originalRenderFieldWrapper = domRenderer.renderFieldWrapper;
domRenderer.renderFieldWrapper = (
  node,
  elementId,
  inputElement,
  wrapperClass,
) => {
  // Apply compact style only for simple types
  if (
    ["string", "number", "integer", "boolean"].includes(node.type) ||
    node.enum
  ) {
    const label = node.title
      ? h(
          "label",
          { className: "col-sm-3 col-form-label small", for: elementId },
          node.title,
          node.required ? h("span", { className: "text-danger" }, "*") : "",
        )
      : null;
    const desc = node.description
      ? h("span", { className: "form-text" }, node.description)
      : null;
    const errorPlaceholder = h("div", { "data-validation-for": elementId });

    return h(
      "div",
      { className: "row mb-2", "data-element-id": elementId },
      label,
      h("div", { className: "col-sm-9" }, inputElement,
        h("div", { className: "small text-muted" }, desc || "")
       ),
      h("div", { className: "col-12" }, errorPlaceholder),
    );
  }
  return originalRenderFieldWrapper(
    node,
    elementId,
    inputElement,
    wrapperClass,
  );
};

/**
 * Custom renderer for TLS configuration.
 * It renders a checkbox for the 'required' property and toggles the visibility of other properties.
 */
export const tlsRenderer = {
  render: (node, path, elementId, dataPath, context) => {
    const requiredProp = node.properties?.["required"];

    // Fallback to standard object rendering if 'required' property is missing
    if (!requiredProp) {
      return renderObject(context, node, path, elementId, false, dataPath);
    }

    const otherProps = { ...node.properties };
    delete otherProps["required"];

    const requiredId = `${elementId}.required`;
    const checkbox = domRenderer.renderBoolean(
      requiredProp,
      requiredId,
      `data-toggle-target="${elementId}-options"`,
    );
    const optionsContent = renderProperties(
      context,
      otherProps,
      elementId,
      dataPath,
    );

    return h(
      "fieldset",
      { className: "border p-3 rounded mb-3 ui_tls", id: elementId },
      h("legend", { className: "h6" }, node.title),
      checkbox,
      h(
        "div",
        {
          id: `${elementId}-options`,
          style: "display: none;",
          className: "mt-3",
        },
        optionsContent,
      ),
    );
  },
};

/**
 * Custom renderer for Routes (Map/Dictionary).
 * It handles dynamic keys for additional properties and provides a custom UI for adding/removing routes.
 */
export const routesRenderer = {
  render: (node, path, elementId, dataPath, context) => {
    return renderObject(context, node, path, elementId, false, dataPath, {
      additionalProperties: { title: null }
    });
  },
  getDefaultKey: (index) => `Route ${index + 1}`,
  renderAdditionalPropertyRow: (valueHtml, defaultKey, uniqueId) => {
    const keyInputAttrs = {
      type: "text",
      className: "form-control form-control-sm fw-bold ap-key js_ap-key",
      placeholder: "Route name",
      value: defaultKey,
    };
    if (uniqueId) keyInputAttrs.id = uniqueId;

    const labelAttrs = { className: "form-label fw-bold mb-0 text-nowrap" };
    if (uniqueId) labelAttrs.for = uniqueId;

    return h(
      "div",
      { className: "mb-4 border rounded shadow-sm ap-row js_ap-row" },
      h(
        "div",
        {
          className:
            "d-flex align-items-center justify-content-between p-3 bg-light border-bottom rounded-top",
        },
        h(
          "div",
          {
            className: "d-flex align-items-center gap-2 flex-grow-1",
            style: "max-width: 70%;",
          },
          h("label", labelAttrs, "Route Name:"),
          h("input", keyInputAttrs),
        ),
        h(
          "button",
          {
            type: "button",
            className:
              "btn btn-sm btn-outline-danger btn-remove-ap js_btn-remove-ap",
          },
          "Remove Route",
        ),
      ),
      h("div", { className: "p-3 flex-grow-1" }, valueHtml),
    );
  },
};

// Helper to merge data into schema node
const mergeData = (schema, data) => {
  if (data === undefined) return schema;
  const newSchema = { ...schema };
  if (newSchema.type === 'object' && typeof data === 'object' && data !== null) {
    newSchema.defaultValue = data;
    if (newSchema.properties) {
      newSchema.properties = { ...newSchema.properties };
      for (const key in newSchema.properties) {
        newSchema.properties[key] = mergeData(newSchema.properties[key], data[key]);
      }
    }
  } else {
    newSchema.defaultValue = data;
  }
  return newSchema;
};


// Advanced Options Renderer (Collapse)
const advancedOptionsRenderer = {
  render: (node, path, elementId, dataPath, context) => {
    // Fallback for primitives (e.g. "static" endpoint which is a string, not an object)
    if (node.type !== 'object') {
      if (node.type === 'string') return domRenderer.renderString(node, elementId);
      if (node.type === 'boolean') return domRenderer.renderBoolean(node, elementId);
      if (node.type === 'number' || node.type === 'integer') {
        const safeNode = node.defaultValue === null ? { ...node, defaultValue: "" } : node;
        return domRenderer.renderNumber(safeNode, elementId);
      }
      return domRenderer.renderUnsupported(node);
    }

    const visibleProps = {};
    const advancedProps = {};
    const alwaysVisible = new Set([
      "queue",
      "group_id",
      "topic",
      "stream",
      "subject",
      "topic_arn",
      "collection",
      "queue_url",
      "endpoint_url",
    ]);

    if (node.properties) {
      Object.keys(node.properties).forEach((key) => {
        const prop = node.properties[key];
        if (prop.required || alwaysVisible.has(key)) {
          visibleProps[key] = prop;
        } else {
          advancedProps[key] = prop;
        }
      });
    }

    const visibleContent = renderProperties(
      context,
      visibleProps,
      elementId,
      dataPath,
    );

    let advancedContent = null;
    let toggleBtn = null;

    if (Object.keys(advancedProps).length > 0) {
      const optionsId = `${elementId}-options`;
      advancedContent = h(
        "div",
        {
          id: optionsId,
          style: "display: none;",
          className: "",
        },
        renderProperties(context, advancedProps, elementId, dataPath),
      );

      toggleBtn = h(
        "button",
        {
          type: "button",
          className: "btn btn-sm btn-link p-0 text-decoration-none mt-2",
          onclick: (e) => {
            const el = document.getElementById(optionsId);
            if (el) {
              const isHidden = el.style.display === "none";
              el.style.display = isHidden ? "block" : "none";
              e.target.textContent = isHidden
                ? "Hide"
                : "Show more...";
            }
          },
        },
        "Show more...",
      );
    }

    return h(
      "fieldset",
      { className: "border p-3 rounded mb-3 ui_obj", id: elementId },
      h("legend", { className: "h6" }, node.title),
      node.description
        ? h("div", { className: "form-text mb-3" }, node.description)
        : null,
      visibleContent,
      toggleBtn,
      advancedContent,
    );
  },
};

/**
 * Registry of custom renderers.
 */
export const CUSTOM_RENDERERS = {
  tls: tlsRenderer,
  routes: routesRenderer,
  "output.mode": { render: () => document.createDocumentFragment() },
  value: {
    render: (node, path, elementId, dataPath, context) => {
      // Only render "Value" headless if it is part of the Routes list
      if (elementId.startsWith("Routes.")) {
        const props = node.properties
          ? renderProperties(context, node.properties, elementId, dataPath)
          : domRenderer.renderFragment([]);
        const ap = domRenderer.renderAdditionalProperties(node, elementId);
        const oneOf = domRenderer.renderOneOf(node, elementId);
        const content = domRenderer.renderFragment([props, ap, oneOf]);
        return domRenderer.renderHeadlessObject(elementId, content);
      }
      // Fallback for other "Value" nodes
      return renderObject(context, node, path, elementId, false, dataPath);
    },
  },
};

// Add endpoint renderers
const endpointTypes = [
  "aws",
  "kafka",
  "nats",
  "file",
  "static",
  "memory",
  "amqp",
  "mongodb",
  "mqtt",
  "http",
  "ibmmq",
  "zeromq",
  "switch",
  "response",
  "custom",
];
endpointTypes.forEach((type) => {
  CUSTOM_RENDERERS[type] = advancedOptionsRenderer;
});

// 4. Apply the renderers
setCustomRenderers(CUSTOM_RENDERERS);
