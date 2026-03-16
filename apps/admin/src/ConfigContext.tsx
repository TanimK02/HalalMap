import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from './api';

type Config = { enableDelivery: boolean };

const ConfigContext = createContext<Config>({ enableDelivery: false });

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
  return useContext(ConfigContext);
}
