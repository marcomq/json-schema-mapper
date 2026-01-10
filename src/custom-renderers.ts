import { CustomRenderer, renderObject, renderProperties } from "./renderer";
import * as templates from "./templates";

export const tlsRenderer: CustomRenderer = {
  render: (node, path, elementId) => {
    const requiredProp = node.properties?.["required"];
    
    // Fallback to standard object rendering if 'required' property is missing
    if (!requiredProp) {
      return renderObject(node, path, elementId);
    }

    const otherProps = { ...node.properties };
    delete otherProps["required"];
    
    const requiredId = `${elementId}.required`;
    const checkbox = templates.renderBoolean(requiredProp, requiredId, `data-toggle-target="${elementId}-options"`);
    const optionsHtml = renderProperties(otherProps, elementId);

    return `
      <fieldset class="border p-3 rounded mb-3 ui_tls" id="${elementId}">
          <legend class="h6">${node.title}</legend>
          ${checkbox}
          <div id="${elementId}-options" style="display: none;" class="mt-3">
              ${optionsHtml}
          </div>
      </fieldset>`;
  }
};

export const CUSTOM_RENDERERS: Record<string, CustomRenderer> = {
  "tls": tlsRenderer
};