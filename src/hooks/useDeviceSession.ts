import { useEffect, useState } from "react";

type DeviceSession = { deviceId: string; sessionId: string };

const DEVICE_KEY = "swipe-device-id";

const createId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`);

export const useDeviceSession = (): DeviceSession | null => {
  const [identity, setIdentity] = useState<DeviceSession | null>(null);

  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(DEVICE_KEY) : null;
      const deviceId = stored || createId();
      if (!stored) {
        window.localStorage.setItem(DEVICE_KEY, deviceId);
      }
      const sessionId = createId();
      setIdentity({ deviceId, sessionId });
    } catch (err) {
      console.warn("Failed to initialize device/session id", err);
      setIdentity({ deviceId: createId(), sessionId: createId() });
    }
  }, []);

  return identity;
};

