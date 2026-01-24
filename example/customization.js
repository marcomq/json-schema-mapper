import { renderObject, renderProperties } from "../src/renderer";
import { domRenderer } from "../src/dom-renderer";
import { h } from "../src/hyperscript";
import { setI18n } from "../src/i18n";
import { setConfig } from "../src/config";

// Apply global I18N overrides
setI18n({
  keys: {
    "Map_of_Route": "Routes"
  }
});

const {
  renderBoolean,
  renderOneOf,
  renderObject: templateRenderObject,
  renderHeadlessObject,
  renderFragment,
  renderAdditionalProperties
} = domRenderer;

setConfig({
  visibility: {
    customVisibility: (node, path) => {
      const description = node.description || "";
      const lowerPath = path.toLowerCase();
      
      if (lowerPath.includes(".input") && description.includes("Publisher only")) {
        return false;
      }
      if (lowerPath.includes(".output") && description.includes("Consumer only")) {
        return false;
      }
      return true;
    }
  }
});

export const tlsRenderer = {
  render: (node, path, elementId, dataPath) => {
    const requiredProp = node.properties?.["required"];
    
    // Fallback to standard object rendering if 'required' property is missing
    if (!requiredProp) {
      return renderObject(node, path, elementId, false, dataPath);
    }

    const otherProps = { ...node.properties };
    delete otherProps["required"];
    
    const requiredId = `${elementId}.required`;
    const checkbox = renderBoolean(requiredProp, requiredId, `data-toggle-target="${elementId}-options"`);
    const optionsContent = renderProperties(otherProps, elementId, dataPath);

    return h('fieldset', { className: 'border p-3 rounded mb-3 ui_tls', id: elementId },
      h('legend', { className: 'h6' }, node.title),
      checkbox,
      h('div', { id: `${elementId}-options`, style: 'display: none;', className: 'mt-3' }, optionsContent)
    );
  }
};

export const routesRenderer = {
  render: (node, _path, elementId, dataPath) => {
    const props = node.properties ? renderProperties(node.properties, elementId, dataPath) : renderFragment([]);
    // Hide title (null). Key generation is handled by getDefaultKey below.
    const ap = renderAdditionalProperties(node, elementId, { title: null });
    const oneOf = renderOneOf(node, elementId);
    const content = renderFragment([props, ap, oneOf]);
    return templateRenderObject(node, elementId, content);
  },
  getDefaultKey: (index) => `Route ${index + 1}`,
  renderAdditionalPropertyRow: (valueHtml, defaultKey, uniqueId) => {
    const keyInputAttrs = {
      type: 'text',
      className: 'form-control form-control-sm fw-bold ap-key js_ap-key',
      placeholder: 'Route name',
      value: defaultKey,
    };
    if (uniqueId) keyInputAttrs.id = uniqueId;
    
    const labelAttrs = { className: 'form-label fw-bold mb-0 text-nowrap' };
    if (uniqueId) labelAttrs.for = uniqueId;

    return h('div', { className: 'mb-4 border rounded shadow-sm ap-row js_ap-row' },
      h('div', { className: 'd-flex align-items-center justify-content-between p-3 bg-light border-bottom rounded-top' },
        h('div', { className: 'd-flex align-items-center gap-2 flex-grow-1', style: 'max-width: 70%;' },
          h('label', labelAttrs, 'Route Name:'),
          h('input', keyInputAttrs)
        ),
        h('button', { type: 'button', className: 'btn btn-sm btn-outline-danger btn-remove-ap js_btn-remove-ap' }, 'Remove Route')
      ),
      h('div', { className: 'p-3 flex-grow-1' }, valueHtml)
    );
  }
};

export const CUSTOM_RENDERERS = {
  "tls": tlsRenderer,
  "routes": routesRenderer,
  "output.mode": { render: () => document.createDocumentFragment() },
  "value": {
    render: (node, path, elementId, dataPath) => {
      // Only render "Value" headless if it is part of the Routes list
      if (elementId.startsWith("Routes.")) {
        const props = node.properties ? renderProperties(node.properties, elementId, dataPath) : renderFragment([]);
        const ap = renderAdditionalProperties(node, elementId);
        const oneOf = renderOneOf(node, elementId);
        const content = renderFragment([props, ap, oneOf]);
        return renderHeadlessObject(elementId, content);
      }
      // Fallback for other "Value" nodes
      return renderObject(node, path, elementId, false, dataPath);
    }
  }
};