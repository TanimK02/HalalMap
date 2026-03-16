import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api';

type Config = { enableDelivery: boolean };

const ConfigContext = createContext<Config | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config>({ enableDelivery: false });

  useEffect(() => {
    api
      .get<Config>('/config')
      .then((r) => setConfig({ enableDelivery: r.data?.enableDelivery ?? false }))
      .catch(() => setConfig({ enableDelivery: false }));
  }, []);

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useConfig(): Config {
  const ctx = useContext(ConfigContext);
  return ctx ?? { enableDelivery: false };
}
