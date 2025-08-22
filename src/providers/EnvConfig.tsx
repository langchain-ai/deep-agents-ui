"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { EnvConfigDialog } from "@/app/components/EnvConfigDialog/EnvConfigDialog";

interface EnvConfig {
  DEPLOYMENT_URL: string;
  ASSISTANT_ID: string;
  LANGSMITH_API_KEY: string;
}

export const ENV_CONFIG_KEYS = {
  DEPLOYMENT_URL: "DEPLOYMENT_URL",
  ASSISTANT_ID: "ASSISTANT_ID",
  LANGSMITH_API_KEY: "LANGSMITH_API_KEY",
} as const satisfies Record<keyof EnvConfig, keyof EnvConfig>;

interface EnvConfigContextType {
  config: EnvConfig | null;
  isConfigured: boolean;
  showSettings: boolean;
  configVersion: number;
  openSettings: () => void;
  closeSettings: () => void;
  updateConfig: (newConfig: EnvConfig) => void;
}

const EnvConfigContext = createContext<EnvConfigContextType | undefined>(
  undefined,
);

const REQUIRED_KEYS: Array<keyof EnvConfig> = [
  "DEPLOYMENT_URL",
  "ASSISTANT_ID",
];

const OPTIONAL_KEYS: Array<keyof EnvConfig> = ["LANGSMITH_API_KEY"];

const ENV_KEYS: Array<keyof EnvConfig> = [...REQUIRED_KEYS, ...OPTIONAL_KEYS];

export const EnvConfigProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<EnvConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [configVersion, setConfigVersion] = useState(0);

  const checkConfiguration = useCallback(() => {
    const loadedConfig: Partial<EnvConfig> = {};
    let allConfigured = true;
    ENV_KEYS.forEach((key) => {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        loadedConfig[key] = storedValue;
      }
    });
    REQUIRED_KEYS.forEach((key) => {
      const storedValue = localStorage.getItem(key);
      if (!storedValue) {
        allConfigured = false;
      }
    });
    if (allConfigured) {
      setConfig(loadedConfig as EnvConfig);
      setIsConfigured(true);
    } else {
      setIsConfigured(false);
    }
    setIsChecking(false);
  }, []);

  useEffect(() => {
    checkConfiguration();
  }, [checkConfiguration]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && ENV_KEYS.includes(e.key as keyof EnvConfig)) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          checkConfiguration();
        }, 100);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [checkConfiguration]);

  const updateConfig = useCallback((newConfig: EnvConfig) => {
    ENV_KEYS.forEach((key) => {
      localStorage.setItem(key, newConfig[key]);
    });
    setConfig(newConfig);
    setIsConfigured(true);
    setConfigVersion((prev) => prev + 1);
  }, []);

  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);

  const contextValue = useMemo(
    () => ({
      config,
      isConfigured,
      showSettings,
      configVersion,
      openSettings,
      closeSettings,
      updateConfig,
    }),
    [
      config,
      isConfigured,
      showSettings,
      configVersion,
      openSettings,
      closeSettings,
      updateConfig,
    ],
  );

  if (isChecking) {
    return null;
  }

  return (
    <EnvConfigContext.Provider value={contextValue}>
      {children}
      <EnvConfigDialog
        isOpen={!isConfigured || showSettings}
        onClose={isConfigured ? closeSettings : undefined}
        isSettings={isConfigured && showSettings}
      />
    </EnvConfigContext.Provider>
  );
};

export const useEnvConfig = () => {
  const context = useContext(EnvConfigContext);
  if (!context) {
    throw new Error("useEnvConfig must be used within an EnvConfigProvider");
  }
  return context;
};
