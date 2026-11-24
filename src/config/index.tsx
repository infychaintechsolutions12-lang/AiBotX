// config/index.ts
import { cookieStorage, createStorage } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { bsc, } from "@reown/appkit/networks"; // 👈 Import hardhat here

export const projectId = import.meta.env.VITE_PROJECT_ID || "8f01d10d9bfdd018dca89381a668efc3";

// 👈 Add hardhat to the supported networks array
export const networks = [bsc,]; 

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  networks,
  projectId,
});

export const config = wagmiAdapter.wagmiConfig;