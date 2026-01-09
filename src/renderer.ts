import { FormNode } from "./parser";

/**
 * Renders a form into the container based on the parsed schema tree.
 * @param rootNode - The root FormNode of the schema.
 * @param formContainer - The HTML element to render the form into.
 */
export function renderForm(rootNode: FormNode, formContainer: HTMLElement) {
  // Clear any existing content
  formContainer.innerHTML = "";
  
  const form = document.createElement("form");

  // Start rendering from the root
  const formElement = createFormElement(rootNode);
  if (formElement) {
    form.appendChild(formElement);
  }

  formContainer.appendChild(form);
}

/**
 * Creates an HTML element for a given FormNode.
 * This function will be called recursively for nested objects.
 * @param node - The FormNode to render.
 * @returns An HTMLElement representing the form field or group.
 */
function createFormElement(node: FormNode, path: string = ""): HTMLElement | null {
  if (!node.type) {
    return null;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "mb-3";

  const label = document.createElement("label");
  label.className = "form-label";
  label.textContent = node.title;

  const elementId = path ? `${path}.${node.title}` : node.title;
  let element: HTMLElement;

  switch (node.type) {
    case "string":
      element = document.createElement("input");
      (element as HTMLInputElement).type = "text";
      element.className = "form-control";
      element.id = elementId;
      if (node.defaultValue) {
        (element as HTMLInputElement).value = node.defaultValue;
      }
      if (node.description) {
        const desc = document.createElement("div");
        desc.className = "form-text";
        desc.textContent = node.description;
        wrapper.appendChild(desc);
      }
      wrapper.appendChild(label);
      wrapper.appendChild(element);
      break;

    case "number":
    case "integer":
      element = document.createElement("input");
      (element as HTMLInputElement).type = "number";
      element.className = "form-control";
      element.id = elementId;
      if (node.defaultValue) {
        (element as HTMLInputElement).value = node.defaultValue;
      }
      wrapper.appendChild(label);
      wrapper.appendChild(element);
      break;

    case "boolean":
      wrapper.className = "mb-3 form-check";
      element = document.createElement("input");
      (element as HTMLInputElement).type = "checkbox";
      element.className = "form-check-input";
      element.id = elementId;
      if (node.defaultValue) {
        (element as HTMLInputElement).checked = node.defaultValue;
      }
      label.className = "form-check-label";
      wrapper.appendChild(element);
      wrapper.appendChild(label);
      break;

    case "object":
      if (node.properties) {
        const fieldset = document.createElement("fieldset");
        fieldset.className = "border p-3 rounded";
        const legend = document.createElement("legend");
        legend.className = "h6";
        legend.textContent = node.title;
        fieldset.appendChild(legend);

        for (const key in node.properties) {
          const childElement = createFormElement(node.properties[key], elementId);
          if (childElement) {
            fieldset.appendChild(childElement);
          }
        }
        return fieldset;
      }
      return null; // No properties, render nothing.

    case "array":
      // For now, let's just show a placeholder for arrays.
      // A full implementation would require dynamic add/remove buttons.
      wrapper.innerHTML = `<label class="form-label">${node.title}</label>
        <div class="alert alert-info">Array rendering is not yet implemented.</div>`;
      break;

    default:
      wrapper.innerHTML = `<label class="form-label">${node.title}</label>
        <div class="alert alert-warning">Unsupported type: ${node.type}</div>`;
      break;
  }

  return wrapper;
}
