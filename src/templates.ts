import { FormNode } from "./parser";
import { getUiText } from "./i18n";

export interface TemplateRenderer<T> {
  renderFieldWrapper(node: FormNode, elementId: string, input: T, className?: string): T;
  renderFieldsetWrapper(node: FormNode, elementId: string, content: T, className?: string): T;
  renderString(node: FormNode, elementId: string): T;
  renderNumber(node: FormNode, elementId: string): T;
  renderBoolean(node: FormNode, elementId: string, attributes?: string): T;
  renderSelect(node: FormNode, elementId: string, options: string[]): T;
  renderObject(node: FormNode, elementId: string, content: T): T;
  renderAdditionalProperties(node: FormNode, elementId: string, options?: { title?: string | null, keyPattern?: string }): T;
  renderOneOf(node: FormNode, elementId: string): T;
  renderArray(node: FormNode, elementId: string): T;
  renderArrayItem(item: T): T;
  renderAdditionalPropertyRow(value: T, defaultKey?: string, uniqueId?: string): T;
  renderLayoutGroup(title: string | undefined, content: T, className?: string): T;
  renderFormWrapper(content: T): T;
  renderNull(node: FormNode): T;
  renderUnsupported(node: FormNode): T;
  renderHeadlessObject(elementId: string, content: T): T;
  renderSchemaError(error: any): T;
  renderFragment(elements: T[]): T;
}

const htmlRenderer: TemplateRenderer<string> = {
  renderFieldWrapper: (node: FormNode, elementId: string, inputHtml: string, className: string = "mb-3"): string => {
    return `
    <div class="${className}">
      <label class="form-label" for="${elementId}">${node.title} ${node.required ? '<span class="text-danger">*</span>' : ''}</label>
      ${inputHtml}
      ${node.description ? `<div class="form-text">${node.description}</div>` : ''}
    </div>
  `;
  },

  renderFieldsetWrapper: (node: FormNode, elementId: string, contentHtml: string, className: string = ""): string => {
    return `
    <fieldset class="border p-3 rounded mb-3 ${className}" id="${elementId}">
      <legend class="h6">${node.title}</legend>
      ${node.description ? `<div class="form-text mb-3">${node.description}</div>` : ''}
      ${contentHtml}
    </fieldset>
  `;
  },

  renderString: (node: FormNode, elementId: string): string => {
    const required = node.required ? 'required' : '';
    const pattern = node.pattern ? `pattern="${node.pattern}"` : '';
    const minLength = node.minLength ? `minlength="${node.minLength}"` : '';
    const maxLength = node.maxLength ? `maxlength="${node.maxLength}"` : '';
    let inputType = 'text';

    if (node.format) {
      switch (node.format) {
        case 'email': inputType = 'email'; break;
        case 'uri': inputType = 'url'; break;
        case 'date': inputType = 'date'; break;
        case 'time': inputType = 'time'; break;
        case 'date-time': inputType = 'datetime-local'; break;
      }
    }
    
    const inputHtml = `<input type="${inputType}" class="form-control" id="${elementId}" value="${node.defaultValue || ''}" ${required} ${pattern} ${minLength} ${maxLength}>`;
    return htmlRenderer.renderFieldWrapper(node, elementId, inputHtml);
  },

  renderNumber: (node: FormNode, elementId: string): string => {
    const required = node.required ? 'required' : '';
    const min = node.minimum !== undefined ? `min="${node.minimum}"` : '';
    const max = node.maximum !== undefined ? `max="${node.maximum}"` : '';

    const val = node.defaultValue !== undefined ? node.defaultValue : '';
    const inputHtml = `<input type="number" class="form-control" id="${elementId}" value="${val}" ${required} ${min} ${max}>`;
    return htmlRenderer.renderFieldWrapper(node, elementId, inputHtml);
  },

  renderBoolean: (node: FormNode, elementId: string, attributes: string = ""): string => {
    const required = node.required ? 'required' : '';
    
    return `
    <div class="mb-3 form-check">
      <input type="checkbox" class="form-check-input" id="${elementId}" ${node.defaultValue ? 'checked' : ''} ${attributes} ${required}>
      <label class="form-check-label" for="${elementId}">${node.title} ${node.required ? '<span class="text-danger">*</span>' : ''}</label>
      ${node.description ? `<div class="form-text">${node.description}</div>` : ''}
    </div>
  `;
  },

  renderSelect: (node: FormNode, elementId: string, options: string[] = []): string => {
    const opts = options.map(o => {
      const selected = String(node.defaultValue) === o ? 'selected' : '';
      return `<option value="${o}" ${selected}>${o}</option>`;
    }).join('');
    const required = node.required ? 'required' : '';

    const selectHtml = `<select class="form-select" id="${elementId}" ${required}>${opts}</select>`;
    return htmlRenderer.renderFieldWrapper(node, elementId, selectHtml);
  },

  renderObject: (node: FormNode, elementId: string, contentHtml: string): string => {
    return htmlRenderer.renderFieldsetWrapper(node, elementId, contentHtml, "ui_obj");
  },

  renderAdditionalProperties: (node: FormNode, elementId: string, options?: { title?: string | null, keyPattern?: string }): string => {
    if (!node.additionalProperties) return "";
    const titleHtml = options?.title === null ? '' : `<h6>${options?.title ?? getUiText("additional_properties", "Additional Properties")}</h6>`;
    const keyPatternAttr = options?.keyPattern ? `data-key-pattern="${options.keyPattern}"` : '';

    return `
    <div class="additional-properties js_additional-properties mt-3 border-top pt-2">
      ${titleHtml}
      <div class="ap-items js_ap-items"></div>
      <button type="button" class="btn btn-sm btn-outline-secondary mt-2 btn-add-ap js_btn-add-ap" 
        data-id="${elementId}" ${keyPatternAttr}>
            ${getUiText("add_property", "Add Property")}
      </button>
    </div>
  `;
  },

  renderOneOf: (node: FormNode, elementId: string): string => {
    if (!node.oneOf || node.oneOf.length === 0) return "";

    // Try to find a "null" option to select by default
    let selectedIndex = node.oneOf.findIndex(opt => opt.type === 'null');
    if (selectedIndex === -1) {
      selectedIndex = node.oneOf.findIndex(opt => {
        const title = opt.title.toLowerCase();
        return title === 'null' || title === 'none';
      });
    }
    if (selectedIndex === -1) selectedIndex = 0;

    const options = node.oneOf.map((opt, idx) => {
      const selected = idx === selectedIndex ? 'selected' : '';
      return `<option value="${idx}" ${selected}>${opt.title}</option>`;
    }).join('');

    const selectHtml = `
      <select class="form-select mb-2 oneof-selector js_oneof-selector" id="${elementId}__selector" data-id="${elementId}">
        ${options}
      </select>
      <div class="oneof-container ps-3 border-start" id="${elementId}__oneof_content"></div>
    `;

    const wrapperNode = { ...node, title: getUiText("type_variant", "Type / Variant"), description: undefined, required: false };
    return htmlRenderer.renderFieldWrapper(wrapperNode, `${elementId}__selector`, selectHtml, "mt-3 border-top pt-3");
  },

  renderArray: (node: FormNode, elementId: string): string => {
    const contentHtml = `
      <div class="array-items js_array-items" id="${elementId}-items"></div>
      ${node.items ? `<button type="button" class="btn btn-sm btn-outline-primary mt-2 btn-add-array-item js_btn-add-array-item" data-id="${elementId}" data-target="${elementId}-items">${getUiText("add_item", "Add Item")}</button>` : ''}
    `;
    return htmlRenderer.renderFieldsetWrapper(node, elementId, contentHtml, "ui_arr");
  },

  renderArrayItem: (itemHtml: string): string => {
    return `
    <div class="d-flex gap-2 mb-2 align-items-start array-item-row js_array-item-row">
      <div class="flex-grow-1">
        ${itemHtml}
      </div>
      <button type="button" class="btn btn-sm btn-outline-danger btn-remove-item js_btn-remove-item" style="margin-top: 2rem;">${getUiText("remove", "Remove")}</button>
    </div>
  `;
  },

  renderAdditionalPropertyRow: (valueHtml: string, defaultKey: string = "", uniqueId: string = ""): string => {
    const idAttr = uniqueId ? `id="${uniqueId}"` : "";
    const forAttr = uniqueId ? `for="${uniqueId}"` : "";
    return `
    <div class="d-flex gap-2 mb-2 align-items-end ap-row js_ap-row">
      <div><label class="form-label small" ${forAttr}>Key</label><input type="text" class="form-control form-control-sm ap-key js_ap-key" placeholder="Key" value="${defaultKey}" ${idAttr}></div>
      <div class="flex-grow-1">${valueHtml}</div>
      <button type="button" class="btn btn-sm btn-outline-danger btn-remove-ap js_btn-remove-ap">X</button>
    </div>
  `;
  },

  renderLayoutGroup: (title: string | undefined, contentHtml: string, className: string = "d-flex gap-3"): string => {
    return `
    <div class="layout-group mb-3">
        ${title ? `<label class="form-label d-block fw-bold">${title}</label>` : ''}
        <div class="${className}">
            ${contentHtml}
        </div>
    </div>`;
  },

  renderFormWrapper: (html: string): string => {
    return `<form id="generated-form">${html}</form>`;
  },

  renderNull: (_node: FormNode): string => {
    return `<div class="ui_null text-muted fst-italic">null</div>`;
  },

  renderUnsupported: (node: FormNode): string => {
    return `<div class="alert alert-warning">${getUiText("unsupported_type", "Unsupported type")}: ${node.type}</div>`;
  },

  renderHeadlessObject: (elementId: string, contentHtml: string): string => {
    return `<div id="${elementId}" class="headless-object">${contentHtml}</div>`;
  },

  renderSchemaError: (error: any): string => {
    return `<div class="alert alert-danger">
    <strong>${getUiText("error_schema_load", "Error: Could not load or parse the schema.")}</strong>
    <br>
    <small>${String(error)}</small>
  </div>`;
  },

  renderFragment: (elements: string[]): string => {
    return elements.join('');
  }
};

let currentRenderer: TemplateRenderer<any> = htmlRenderer;

export type Templates = TemplateRenderer<string>;

export function setTemplates<T>(renderer: TemplateRenderer<T>) {
  currentRenderer = renderer;
}

export function renderFieldWrapper(node: FormNode, elementId: string, input: any, className: string = "mb-3") { return currentRenderer.renderFieldWrapper(node, elementId, input, className); }
export function renderFieldsetWrapper(node: FormNode, elementId: string, content: any, className: string = "") { return currentRenderer.renderFieldsetWrapper(node, elementId, content, className); }
export function renderString(node: FormNode, elementId: string) { return currentRenderer.renderString(node, elementId); }
export function renderNumber(node: FormNode, elementId: string) { return currentRenderer.renderNumber(node, elementId); }
export function renderBoolean(node: FormNode, elementId: string, attributes: string = "") { return currentRenderer.renderBoolean(node, elementId, attributes); }
export function renderSelect(node: FormNode, elementId: string, options: string[] = []) { return currentRenderer.renderSelect(node, elementId, options); }
export function renderObject(node: FormNode, elementId: string, content: any) { return currentRenderer.renderObject(node, elementId, content); }
export function renderAdditionalProperties(node: FormNode, elementId: string, options?: { title?: string | null, keyPattern?: string }) { return currentRenderer.renderAdditionalProperties(node, elementId, options); }
export function renderOneOf(node: FormNode, elementId: string) { return currentRenderer.renderOneOf(node, elementId); }
export function renderArray(node: FormNode, elementId: string) { return currentRenderer.renderArray(node, elementId); }
export function renderArrayItem(item: any) { return currentRenderer.renderArrayItem(item); }
export function renderAdditionalPropertyRow(value: any, defaultKey: string = "", uniqueId: string = "") { return currentRenderer.renderAdditionalPropertyRow(value, defaultKey, uniqueId); }
export function renderLayoutGroup(title: string | undefined, content: any, className?: string) { return currentRenderer.renderLayoutGroup(title, content, className); }
export function renderFormWrapper(content: any) { return currentRenderer.renderFormWrapper(content); }
export function renderNull(node: FormNode) { return currentRenderer.renderNull(node); }
export function renderUnsupported(node: FormNode) { return currentRenderer.renderUnsupported(node); }
export function renderHeadlessObject(elementId: string, content: any) { return currentRenderer.renderHeadlessObject(elementId, content); }
export function renderSchemaError(error: any) { return currentRenderer.renderSchemaError(error); }
export function renderFragment(elements: any[]) { return currentRenderer.renderFragment(elements); }
