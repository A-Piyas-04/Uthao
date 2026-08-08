import { createContext, useState, useCallback } from "react";
import { loginUser, registerUser } from "../api/authApi";
import { getDriverByUserId } from "../api/driverApi";

export const AuthContext = createContext(null);

const TOKEN_KEY = "uthao_token";
const USER_KEY = "uthao_user";
const DRIVER_ID_KEY = "uthao_driver_id";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  // driver-service's own Driver.id — every driver-service endpoint is keyed by
  // this, not by the identity-service userId. Null until resolved/onboarded.
  const [driverId, setDriverId] = useState(() => {
    const stored = localStorage.getItem(DRIVER_ID_KEY);
    return stored ? Number(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const persistAuth = useCallback((authResponse) => {
    const { token, userId, name, role } = authResponse;
    localStorage.setItem(TOKEN_KEY, token);
    const nextUser = { userId, name, role };
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    // Reset any driverId left over from a previous account in this browser.
    localStorage.removeItem(DRIVER_ID_KEY);
    setUser(nextUser);
    setDriverId(null);
    return nextUser;
  }, []);

  const resolveDriverId = useCallback(async (userId) => {
    try {
      const driver = await getDriverByUserId(userId);
      localStorage.setItem(DRIVER_ID_KEY, String(driver.id));
      setDriverId(driver.id);
      return driver.id;
    } catch {
      return null;
    }
  }, []);

  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      try {
        const data = await loginUser({ email, password });
        const nextUser = persistAuth(data);
        const resolvedDriverId =
          nextUser.role === "DRIVER" ? await resolveDriverId(nextUser.userId) : null;
        return { ...nextUser, driverId: resolvedDriverId };
      } finally {
        setLoading(false);
      }
    },
    [persistAuth, resolveDriverId]
  );

  const register = useCallback(
    async (name, email, password, role) => {
      setLoading(true);
      try {
        const data = await registerUser({ name, email, password, role });
        const nextUser = persistAuth(data);
        return { ...nextUser, driverId: null };
      } finally {
        setLoading(false);
      }
    },
    [persistAuth]
  );

  // Called once driver onboarding (POST /drivers + vehicle) succeeds.
  const completeDriverOnboarding = useCallback((newDriverId) => {
    localStorage.setItem(DRIVER_ID_KEY, String(newDriverId));
    setDriverId(newDriverId);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(DRIVER_ID_KEY);
    setUser(null);
    setDriverId(null);
  }, []);

  const value = {
    user,
    driverId,
    loading,
    login,
    register,
    logout,
    completeDriverOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
