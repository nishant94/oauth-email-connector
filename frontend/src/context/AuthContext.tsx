import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, AuthContextType, LoginRequest, RegisterRequest } from "../types";
import { apiService } from "../services/api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const userData = await apiService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.log("User not authenticated");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      setIsLoading(true);
      const { user: userData } = await apiService.register(data);
      setUser(userData);
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const { user: userData } = await apiService.loginWithCredentials(
        credentials,
      );
      setUser(userData);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Note: OAuth login removed - users must create local accounts first
  // Then they can connect providers for email sending in dashboard settings

  const connectProvider = (provider: "google" | "microsoft") => {
    const connectUrl =
      provider === "google"
        ? apiService.getGoogleConnectUrl()
        : apiService.getMicrosoftConnectUrl();

    // Redirect to OAuth provider connection
    window.location.href = connectUrl;
  };

  const disconnectProvider = async (provider: "google" | "microsoft") => {
    try {
      const { connectedProviders } = await apiService.disconnectProvider(
        provider,
      );
      if (user) {
        setUser({ ...user, connectedProviders });
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      // Redirect to login page
      window.location.href = "/login";
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await apiService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error("Failed to refresh user:", error);
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    loginWithCredentials,
    register,
    logout,
    refreshUser,
    connectProvider,
    disconnectProvider,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
