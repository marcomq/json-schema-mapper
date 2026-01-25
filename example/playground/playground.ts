import { init, setConfig, resetConfig, resetI18n, adaptUiSchema } from '../../src/index';
import defaultSchema from '../schema.json';

// --- Default Examples ---
const EXAMPLES: Record<string, { schema: any, config: any, data: any }> = {
  default: {
    schema: defaultSchema,
    config: {},
    data: {}
  },
  simple: {
    schema: {
      type: "object",
      title: "User Profile",
      properties: {
        firstName: { type: "string", title: "First Name" },
        lastName: { type: "string", title: "Last Name" },
        age: { type: "integer", title: "Age", minimum: 0 },
        isActive: { type: "boolean", title: "Is Active" }
      },
      required: ["firstName", "lastName"]
    },
    config: {},
    data: { firstName: "John", isActive: true }
  },
  arrays: {
    schema: {
      type: "object",
      title: "Task List",
      properties: {
        title: { type: "string" },
        tags: { 
          type: "array", 
          items: { type: "string", enum: ["work", "home", "urgent"] } 
        },
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              done: { type: "boolean" }
            }
          }
        }
      }
    },
    config: {},
    data: {}
  }
};

// --- DOM Elements ---
const els = {
  schema: document.getElementById('input-schema') as HTMLTextAreaElement,
  config: document.getElementById('input-config') as HTMLTextAreaElement,
  data: document.getElementById('input-data') as HTMLTextAreaElement,
  output: document.getElementById('output-data') as HTMLElement,
  errors: document.getElementById('validation-errors') as HTMLElement,
  btnRender: document.getElementById('btn-render') as HTMLButtonElement,
  selector: document.getElementById('example-selector') as HTMLSelectElement,
};

// --- Logic ---

async function loadExample(key: string) {
  let ex = EXAMPLES[key];
  
  els.schema.value = JSON.stringify(ex.schema, null, 2);
  els.config.value = JSON.stringify(ex.config, null, 2);
  els.data.value = JSON.stringify(ex.data, null, 2);
  
  render();
}

async function render() {
  // 1. Reset Global State
  resetConfig();
  resetI18n();

  // 2. Parse Inputs
  let schema, config, initialData;
  try {
    schema = JSON.parse(els.schema.value);
    config = els.config.value ? JSON.parse(els.config.value) : {};
    initialData = els.data.value ? JSON.parse(els.data.value) : undefined;
  } catch (e) {
    alert("Invalid JSON in one of the editors.");
    return;
  }

  // 3. Apply Config
  if (config.uiSchema) {
    adaptUiSchema(config.uiSchema, schema.title || "root");
  }
  // Merge other config options if present
  setConfig(config);

  // 4. Initialize Form
  let form: any;
  const updateValidation = () => {
    if (!form) return;
    form.validate().then((errors: any) => {
      els.errors.textContent = errors ? JSON.stringify(errors, null, 2) : "Valid";
      els.errors.className = errors ? "alert alert-danger border" : "alert alert-success border";
    });
  };

  form = await init('form-container', schema, initialData, (newData) => {
    els.output.textContent = JSON.stringify(newData, null, 2);
    updateValidation();
  });
  updateValidation();
}

// --- Event Listeners ---
els.btnRender.addEventListener('click', render);

els.selector.addEventListener('change', (e) => {
  loadExample((e.target as HTMLSelectElement).value);
});

// Initial Load
loadExample('default');
