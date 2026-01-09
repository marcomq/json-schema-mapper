import { FormNode, parseSchema } from "./parser";
import { renderForm } from "./renderer";

function readFormData(node: FormNode, path: string = ""): any {
  const elementId = path ? `${path}.${node.title}` : node.title;

  switch (node.type) {
    case "object":
      if (!node.properties) return {};
      const obj: { [key: string]: any } = {};
      for (const key in node.properties) {
        obj[key] = readFormData(node.properties[key], elementId);
      }
      return obj;

    case "number":
    case "integer":
      const numElement = document.getElementById(elementId) as HTMLInputElement;
      return numElement.valueAsNumber;

    case "boolean":
      const boolElement = document.getElementById(elementId) as HTMLInputElement;
      return boolElement.checked;

    case "string":
    default:
      const strElement = document.getElementById(elementId) as HTMLInputElement;
      return strElement.value;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const formContainer = document.getElementById("form-container");
  const jsonOutput = document.getElementById("json-output");

  if (!formContainer || !jsonOutput) {
    console.error("Required DOM elements not found.");
    return;
  }

  try {
    const rootNode = await parseSchema("/schema.json");
    renderForm(rootNode, formContainer);

    formContainer.addEventListener("input", () => {
      const data = readFormData(rootNode);
      jsonOutput.textContent = JSON.stringify(data, null, 2);
    });

    // Initial population
    const initialData = readFormData(rootNode);
    jsonOutput.textContent = JSON.stringify(initialData, null, 2);
    
  } catch (error) {
    formContainer.innerHTML = `<div class="alert alert-danger">
        <strong>Error:</strong> Could not load or parse the schema. See console for details.
      </div>`;
    console.error(error);
  }
});
