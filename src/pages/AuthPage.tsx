import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  useAccount,
  useConfig,
  useDisconnect,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { readContract } from "wagmi/actions";
import { getAddress, isAddress } from "viem";
import { createAppKit } from "@reown/appkit";
import { bsc } from "@reown/appkit/networks";
import { wagmiAdapter, projectId } from "../config/index";
import { STAKING_ABI, STAKING_ADDRESS } from "../Helper/constant";
import logo from "../assets/logo-icon.png";

type AuthAction = "LOGIN" | "REGISTER";

const BrandMark: React.FC = () => {
  return (
    <div className="relative mb-3">
      <motion.div
        className="absolute -inset-1 rounded-2xl blur-lg"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(168,85,247,.55), rgba(59,130,246,.55), rgba(56,189,248,.55), rgba(168,85,247,.55))",
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
      />
      <div className="relative w-16 h-16 rounded-2xl bg-[#0b1325]/70 backdrop-blur-xl border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,.35)] overflow-hidden">
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
        />
        <motion.img
          src={logo}
          alt="AI Earn"
          className="absolute inset-0 m-auto w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,.55)]"
          initial={{ scale: 0.95 }}
          animate={{ scale: [0.95, 1, 0.95] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute -bottom-6 left-0 right-0 h-12 bg-gradient-to-t from-fuchsia-500/15 to-transparent" />
      </div>
    </div>
  );
};

// Reown AppKit instance
let appKit: any = null;

const initializeAppKit = () => {
  if (typeof window !== "undefined" && !appKit) {
    appKit = createAppKit({
      adapters: [wagmiAdapter],
      projectId,
      networks: [bsc],
      defaultNetwork: bsc,
      features: {
        analytics: true,
        email: false,
        socials: false,
        emailShowWallets: false,
      },
      themeMode: "dark",
    });
  }
  return appKit;
};

const AuthPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const config = useConfig();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const [referral, setReferral] = useState("");
  const [loader, setLoader] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pendingAuth, setPendingAuth] = useState(false);
  const [registerTxHash, setRegisterTxHash] = useState<`0x${string}` | undefined>(undefined);

  const { isLoading: isConfirmingRegister, isSuccess: isRegisterConfirmed } =
    useWaitForTransactionReceipt({
      hash: registerTxHash,
    });

  useEffect(() => {
    initializeAppKit();
    disconnect();
  }, [disconnect]);

  useEffect(() => {
    if (id) setReferral(id);
  }, [id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setMousePosition({ x: (e.clientX - cx) / cx, y: (e.clientY - cy) / cy });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  useEffect(() => {
    if (pendingAuth && isConnected && address) {
      void continueAuth(address);
    }
  }, [pendingAuth, isConnected, address]);

  useEffect(() => {
    if (isRegisterConfirmed && registerTxHash) {
      toast.success("On-chain registration confirmed!");
      setRegisterTxHash(undefined);
      setLoader(false);
      setStatus("");
      navigate("/dashboard");
    }
  }, [isRegisterConfirmed, registerTxHash, navigate]);

  const openReownConnectModal = () => {
    if (appKit) {
      appKit.open();
    } else {
      console.error("Reown AppKit not initialized");
      toast.error("Wallet connection not available. Please refresh the page.");
    }
  };

  // Read user tuple directly from AiBotXStaking.sol
  // users(address) returns:
  // [0] exists (bool), [1] isBlocked (bool), [2] userId (uint256), [3] sponsor (address), ...
  const checkOnChainUser = async (
    wallet: string
  ): Promise<{ exist: boolean; isBlocked: boolean; userId?: bigint; sponsor?: string }> => {
    const checksumWallet = getAddress(wallet);
    const rawUser = (await readContract(config, {
      address: STAKING_ADDRESS as `0x${string}`,
      abi: STAKING_ABI,
      functionName: "users",
      args: [checksumWallet],
    })) as readonly [
      boolean,
      boolean,
      bigint,
      string,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      number
    ];

    return {
      exist: Boolean(rawUser[0]),
      isBlocked: Boolean(rawUser[1]),
      userId: rawUser[2],
      sponsor: rawUser[3],
    };
  };

  // Resolve referral input (0x address, numeric userId like "100001" or "AI100001", or fallback to contract owner)
  const resolveSponsorAddress = async (refInput: string): Promise<`0x${string}`> => {
    const trimmed = refInput.trim();
    if (!trimmed) {
      const ownerAddr = (await readContract(config, {
        address: STAKING_ADDRESS as `0x${string}`,
        abi: STAKING_ABI,
        functionName: "owner",
      })) as string;
      return getAddress(ownerAddr);
    }

    if (isAddress(trimmed)) {
      return getAddress(trimmed);
    }

    const numericStr = trimmed.replace(/^AI/i, "");
    if (/^\d+$/.test(numericStr)) {
      const mappedAddr = (await readContract(config, {
        address: STAKING_ADDRESS as `0x${string}`,
        abi: STAKING_ABI,
        functionName: "idToAddress",
        args: [BigInt(numericStr)],
      })) as string;

      if (mappedAddr && mappedAddr !== "0x0000000000000000000000000000000000000000") {
        return getAddress(mappedAddr);
      }
    }

    throw new Error("Invalid referral wallet address or user ID.");
  };

  const continueAuth = async (wallet: string) => {
    try {
      setLoader(true);
      setStatus("Checking on-chain account...");

      const userState = await checkOnChainUser(wallet);

      if (userState.exist && userState.isBlocked) {
        toast.error(
          "Your account is blocked on-chain. You cannot access the platform without being unblocked."
        );
        disconnect();
        return;
      }

      if (userState.exist) {
        const action: AuthAction = "LOGIN";
        setStatus(`On-chain account found (${action}). Opening dashboard...`);
        localStorage.setItem("connectedWallet", getAddress(wallet));
        toast.success("Wallet verified on-chain");
        navigate("/dashboard");
        return;
      }

      const action: AuthAction = "REGISTER";
      setStatus(`No account found (${action}). Resolving sponsor...`);
      await registerOnChain(wallet);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.shortMessage || e?.message || "On-chain authentication failed. Try again.");
    } finally {
      setPendingAuth(false);
      if (!registerTxHash) {
        setLoader(false);
        setStatus("");
      }
    }
  };

  const handleConnectRegisterLogin = async () => {
    setStatus("");
    if (!isConnected || !address) {
      setPendingAuth(true);
      openReownConnectModal();
      return;
    }
    await continueAuth(address);
  };

  const registerOnChain = async (wallet: string) => {
    const sponsorAddr = await resolveSponsorAddress(referral);

    if (sponsorAddr.toLowerCase() === wallet.toLowerCase()) {
      toast.error("You cannot use your own wallet as sponsor.");
      return;
    }

    const sponsorState = await checkOnChainUser(sponsorAddr);
    if (!sponsorState.exist) {
      toast.error("Sponsor wallet is not registered on-chain.");
      return;
    }

    setStatus("Confirm registration transaction in your wallet...");
    const hash = await writeContractAsync({
      address: STAKING_ADDRESS as `0x${string}`,
      abi: STAKING_ABI,
      functionName: "register",
      args: [sponsorAddr],
    });

    setRegisterTxHash(hash);
    localStorage.setItem("connectedWallet", getAddress(wallet));
    setStatus("Waiting for block confirmation...");
  };

  const busy = loader || isConfirmingRegister;

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-purple-950 text-white p-4 font-sans overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 blur-3xl rounded-full" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <motion.div
        className="w-full max-w-sm bg-white/10 backdrop-blur-lg rounded-3xl p-6 flex flex-col items-center shadow-2xl border border-cyan-500/20 relative z-10"
        style={{
          transform: `perspective(1000px) rotateX(${mousePosition.y * 2}deg) rotateY(${mousePosition.x * 2}deg)`,
        }}
        whileHover={{ scale: 1.03, transition: { duration: 0.22 } }}
      >
        <BrandMark />

        <motion.h2
          className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-purple-400 bg-clip-text text-transparent mb-2 text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Welcome Back
        </motion.h2>

        <motion.p
          className="text-purple-200 text-sm mb-2 block font-medium"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          Connect your wallet to get started
        </motion.p>

        <motion.button
          onClick={handleConnectRegisterLogin}
          disabled={busy}
          className={`w-full ${
            busy ? "bg-purple-700/70" : "bg-purple-600 hover:bg-purple-700"
          } text-white py-4 rounded-xl font-semibold mb-5 transition-all duration-300 shadow-lg hover:shadow-purple-500/40 active:scale-95 relative overflow-hidden`}
          whileHover={{ scale: busy ? 1 : 1.05 }}
          whileTap={{ scale: busy ? 1 : 0.95 }}
        >
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="relative z-10">
            {busy ? "Processing..." : isConnected ? "Continue" : "Connect Wallet & Login"}
          </span>
        </motion.button>

        <motion.div
          className="w-full mb-4"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          <label className="text-purple-200 text-sm mb-2 block font-medium">
            Referral Wallet or User ID
          </label>
          <input
            type="text"
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
            placeholder="0x... or 100001 (optional for root)"
            className="w-full bg-cyan-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 backdrop-blur-sm text-base"
          />
        </motion.div>

        {status && (
          <motion.p
            className="text-center mt-3 text-cyan-200 font-medium text-sm bg-cyan-900/20 px-4 py-2 rounded-lg w-full"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22 }}
          >
            {status}
          </motion.p>
        )}

        <motion.p
          className="text-purple-300/50 text-xs mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.12 }}
        >
          On-chain authentication powered by AiBotXStaking
        </motion.p>
      </motion.div>
    </div>
  );
};

export default AuthPage;