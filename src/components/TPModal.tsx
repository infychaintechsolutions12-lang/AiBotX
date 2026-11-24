// src/components/TPModal.tsx
import React, { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePublicClient, useWriteContract } from "wagmi";
import { parseUnits, maxUint256, getAddress } from "viem";
import { toast } from "sonner";
import {
  STAKING_ADDRESS,
  STAKING_ABI,
  USDT_ADDRESS,
  USDT_ABI,
} from "@/Helper/constant";

/* ------------------------------- Config ----------------------------------- */
const MIN_PURCHASE = 1; // $1 minimum (matches AiBotXStaking MIN_AMOUNT = 1e18)
const DEFAULT_TOKEN_DECIMALS = 18;

/* ------------------------------- Helpers ---------------------------------- */
const getRatePct = (amount: number): number => {
  if (amount > 1000) return 3.0;
  if (amount >= MIN_PURCHASE) return 1.5;
  return 0;
};

const FullLoader: React.FC = () => (
  <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
    <div className="h-10 w-10 rounded-full border-2 border-white/40 border-t-white animate-spin" />
  </div>
);

/* --------------------------------- Props ---------------------------------- */
type TPModalProps = {
  tpAmount: number;
  setTpAmount: (v: number) => void;
  onClose: () => void;
  address: `0x${string}` | string;
  fetch?: () => Promise<void> | void;

  // optional overrides
  tokenAddress?: `0x${string}`;
  stakingAddress?: `0x${string}`;
  tokenDecimals?: number;
};

/* -------------------------------- Component ------------------------------- */
const TPModal: React.FC<TPModalProps> = ({
  tpAmount,
  setTpAmount,
  onClose,
  address,
  fetch,
  tokenAddress = USDT_ADDRESS as `0x${string}`,
  stakingAddress = STAKING_ADDRESS as `0x${string}`,
  tokenDecimals = Number(DEFAULT_TOKEN_DECIMALS),
}) => {
  const principal = Number(tpAmount) || 0;
  const ratePct = getRatePct(principal);
  const rate = ratePct / 100;

  const daily = principal * rate;

  const isBelowMin = principal < MIN_PURCHASE;
  const canContinue = !isBelowMin && !!address;

  const increment = () => setTpAmount((principal || 0) + 1);
  const decrement = () => setTpAmount(Math.max(0, (principal || 0) - 1));

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [showLoader, setShowLoader] = useState(false);

  /* ----------------------------- Approve → Deposit ------------------------- */
  const buyHashPower = async () => {
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }
    if (!publicClient) {
      toast.error("Network client not ready. Try again.");
      return;
    }
    if (principal < MIN_PURCHASE) {
      toast.error(`Minimum purchase is $${MIN_PURCHASE}.`);
      return;
    }

    try {
      setShowLoader(true);

      const userAddr = getAddress(address);
      const amount = parseUnits(String(principal), tokenDecimals);

      // 1. Check current USDT allowance for AiBotXStaking
      const currentAllowance = (await publicClient.readContract({
        address: tokenAddress,
        abi: USDT_ABI,
        functionName: "allowance",
        args: [userAddr, stakingAddress],
      })) as bigint;

      // 2. Request approval if allowance is lower than deposit amount
      if (currentAllowance < amount) {
        const approveHash = await writeContractAsync({
          address: tokenAddress,
          abi: USDT_ABI,
          functionName: "approve",
          args: [stakingAddress, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // 3. Call deposit(amount) on AiBotXStaking.sol
      const depositHash = await writeContractAsync({
        address: stakingAddress,
        abi: STAKING_ABI,
        functionName: "deposit",
        args: [amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      toast.success("Deposit confirmed on-chain!");
      setTpAmount(0);
      onClose();
      await fetch?.();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.shortMessage ||
        err?.message ||
        "Transaction failed. Please try again.";
      toast.error(msg);
    } finally {
      setShowLoader(false);
    }
  };

  return (
    <>
      {showLoader && <FullLoader />}

      <AnimatePresence>
        <div className="fixed inset-0 z-[500] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {/* Modal */}
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative bg-[#0F192D] text-white rounded-2xl p-6 border border-gray-700 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Buy Hash Power</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Daily Earn */}
            <div className="bg-[#1B263B] rounded-xl p-4 border border-gray-600 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300 text-sm">Daily Earn:</span>
                <span className="text-blue-400 font-semibold text-sm">
                  ${daily.toFixed(2)} {ratePct > 0 && <>(+{ratePct.toFixed(1)}%)</>}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-300">On-Chain Settlement</span>
                <div className="text-gray-400 text-xs mt-1">
                  Settled directly via <span className="text-purple-400">AiBotXStaking</span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="bg-[#1B263B] rounded-xl p-4 border border-gray-600 text-center mb-4">
              <div className="flex justify-center items-center space-x-3 mb-3">
                <div className="bg-[#0F192D] px-4 py-2 rounded-lg border border-purple-500 min-w-[110px]">
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={principal === 0 ? "" : principal}
                    onChange={(e) => setTpAmount(Number(e.target.value))}
                    className="w-full bg-transparent text-white font-bold text-xl text-center outline-none"
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
                <span className="text-gray-300 font-semibold text-lg">$</span>
              </div>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={decrement}
                  className="bg-gray-700 hover:bg-purple-600 w-10 h-10 rounded-lg flex items-center justify-center"
                  aria-label="Decrement"
                >
                  <span className="text-white font-bold">-</span>
                </button>
                <button
                  onClick={increment}
                  className="bg-gray-700 hover:bg-blue-600 w-10 h-10 rounded-lg flex items-center justify-center"
                  aria-label="Increment"
                >
                  <span className="text-white font-bold">+</span>
                </button>
              </div>

              <p className="mt-3 text-xs text-white/70">
                A minimum self-investment of $100 is required to qualify for Rank Income.
              </p>
            </div>

            {/* Boost Total */}
            <div className="bg-[#1B263B] rounded-xl p-4 border border-gray-600 text-center mb-4">
              <div className="text-gray-300 text-sm mb-2">Your HP total:</div>
              <div className="flex justify-center items-baseline">
                <span className="text-white font-bold text-2xl">
                  ${principal.toFixed(2)}
                </span>
                <span className="text-gray-400 text-sm ml-2">USD</span>
              </div>
            </div>

            {/* Estimated Returns */}
            <div className="bg-[#1B263B] rounded-xl p-4 border border-gray-600 mb-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-gray-400 text-xs">Daily</div>
                  <div className="text-white font-bold text-sm">
                    ${daily.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs">3× Cap</div>
                  <div className="text-blue-400 font-bold text-sm">
                    ${(principal * 3).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-600/20 text-purple-200 border border-purple-500/40">
                  Applied Rate: {ratePct > 0 ? `${ratePct.toFixed(1)}% / day` : "—"}
                </span>
              </div>
            </div>

            {/* Action */}
            <button
              className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${
                canContinue && !showLoader
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                  : "bg-gray-600 cursor-not-allowed"
              }`}
              disabled={!canContinue || showLoader}
              onClick={buyHashPower}
            >
              {showLoader ? "Processing..." : "Continue"}
            </button>
          </motion.div>
        </div>
      </AnimatePresence>
    </>
  );
};

export default TPModal;