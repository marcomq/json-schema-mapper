import { FormNode } from "./parser";
import { Store } from "./state";

export interface RenderContext {
  store: Store<any>;
  config: any;
  nodeRegistry: Map<string, FormNode>;
  dataPathRegistry: Map<string, string>;
  elementIdToDataPath: Map<string, string>;
  customRenderers: Record<string, CustomRenderer<any>>;
  rootNode: FormNode;
}

export interface CustomRenderer<T = any> {
  render?: (node: FormNode, path: string, elementId: string, dataPath: string, context: RenderContext) => T;
  widget?: string;
  options?: string[];
  getDefaultKey?: (index: number) => string;
  renderAdditionalPropertyRow?: (valueHtml: T, defaultKey: string, uniqueId: string) => T;
}