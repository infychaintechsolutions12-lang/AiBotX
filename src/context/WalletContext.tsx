// src/context/WalletContext.tsx
import { createContext, useContext, type ReactNode } from "react";
import { useAccount } from "wagmi";

interface WalletContextType {
  address?: string;
  isConnected: boolean;
}

const WalletContext = createContext<WalletContextType>({
  address: undefined,
  isConnected: false,
});

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { address, isConnected } = useAccount();

  return (
    <WalletContext.Provider value={{ address, isConnected }}>
      {children}
    </WalletContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWallet = () => useContext(WalletContext);
