import { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAccount, usePublicClient } from "wagmi";
import { getAddress } from "viem";
import { AppKitButton } from "@reown/appkit/react";
import { STAKING_ADDRESS, STAKING_ABI } from "../Helper/constant";

/** Inline Union Jack (UK) */
const UKFlagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 36 24" {...props}>
    <rect width="36" height="24" fill="#012169" />
    {/* White diagonals */}
    <path d="M0,0 L36,24 M36,0 L0,24" stroke="#fff" strokeWidth="6" />
    {/* Red diagonals */}
    <path d="M0,0 L36,24 M36,0 L0,24" stroke="#C8102E" strokeWidth="3" />
    {/* White cross */}
    <rect x="15" y="0" width="6" height="24" fill="#fff" />
    <rect x="0" y="9" width="36" height="6" fill="#fff" />
    {/* Red cross */}
    <rect x="16.5" y="0" width="3" height="24" fill="#C8102E" />
    <rect x="0" y="10.5" width="36" height="3" fill="#C8102E" />
  </svg>
);

const Header = () => {
  const { address, isConnecting, isReconnecting, isDisconnected, isConnected } =
    useAccount();
  const publicClient = usePublicClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [, setIsOnChainMember] = useState<boolean | null>(null);

  useEffect(() => {
    const isAuthRoute = pathname === "/" || /^\/0x[a-fA-F0-9]{40}$/.test(pathname);
    if (isAuthRoute) return;

    const timeout = setTimeout(() => {
      if (!isConnecting && !isReconnecting && isDisconnected) {
        navigate("/");
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [isConnecting, isReconnecting, isDisconnected, navigate, pathname]);

  useEffect(() => {
    let active = true;

    const checkUser = async () => {
      if (!isConnected || !address || !publicClient) {
        if (active) setIsOnChainMember(null);
        return;
      }

      try {
        const rawUser = (await publicClient.readContract({
          address: STAKING_ADDRESS as `0x${string}`,
          abi: STAKING_ABI,
          functionName: "users",
          args: [getAddress(address)],
        })) as readonly [boolean, ...unknown[]];

        if (active) {
          setIsOnChainMember(Boolean(rawUser?.[0]));
        }
      } catch {
        if (active) {
          setIsOnChainMember(null);
        }
      }
    };

    void checkUser();

    return () => {
      active = false;
    };
  }, [isConnected, address, publicClient]);

  return (
    <div className="flex items-center justify-between mb-4 text-white p-4">
      <div className="text-xl font-bold flex gap-3 items-center">
        <Link to={isConnected ? "/dashboard" : "/"}>
          <img src={logo} className="w-30" alt="Logo" />
        </Link>
        <button
          type="button"
          aria-label="English (UK)"
          title="English (UK)"
          onClick={() => {}}
          className="w-9 h-9 rounded-full bg-[#0F192D] border border-white/20 shadow 
                     hover:border-purple-400 focus:outline-none focus:ring-2 
                     focus:ring-purple-500/40 overflow-hidden flex items-center justify-center"
        >
          <UKFlagIcon className="w-7 h-5" />
        </button>
        
      </div>

      {/* Connect Wallet Button - Reown AppKit version */}
      <AppKitButton />
    </div>
  );
};

export default Header;