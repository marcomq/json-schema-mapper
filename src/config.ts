export const DEFAULT_CONFIG = {
  sorting: {
    defaultPriority: [
      'name', 'id', 'title', 'type', 'enabled', 'active', 'url', 'brokers',
      'username', 'password', 'topic', 'group', 'key', 'value', 'required'
    ],
    perObjectPriority: {} as Record<string, string[]>,
  },
  visibility: {
    hiddenPaths: [] as string[],
    hiddenKeys: [] as string[],
  },
  parser: {
    titleCandidates: [
      'type', 'name', 'kind', 'id', 'mode', 'strategy', 'action', 'method', 'service', 'provider'
    ]
  }
};

export let CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

export function setConfig(config: Partial<typeof DEFAULT_CONFIG>) {
  if (config.sorting) {
    CONFIG.sorting = { ...CONFIG.sorting, ...config.sorting };
  }
  if (config.visibility) {
    CONFIG.visibility = { ...CONFIG.visibility, ...config.visibility };
  }
  if (config.parser) {
    CONFIG.parser = { ...CONFIG.parser, ...config.parser };
  }
}