// Trade.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { History, RefreshCcw, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { formatUnits, getAddress, maxUint256, parseUnits } from "viem";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import Header from "@/components/Header";
import NaveBar from "@/components/NaveBar";
import Logo_icon from "@/assets/AiEarn-DgztSla5.png";
import FullLoader from "@/pages/FullLoader";
import {
  STAKING_ADDRESS,
  STAKING_ABI,
  USDT_ADDRESS,
  USDT_ABI,
} from "@/Helper/constant";

/* ------------------------- Settlement countdown (4 AM) -------------------- */
const two = (n: number) => String(n).padStart(2, "0");
const next4am = (): Date => {
  const now = new Date();
  const target = new Date();
  target.setHours(4, 0, 0, 0);
  if (now.getTime() >= target.getTime()) target.setDate(target.getDate() + 1);
  return target;
};
const formatDiff = (ms: number) => {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${hh}h ${two(mm)}m ${two(ss)}s`;
};

const getRatePct = (amount: number): number => {
  if (amount > 1000) return 3.0;
  if (amount >= 1) return 1.5;
  return 0;
};

/* --------------------------------- Types ---------------------------------- */
type PackageStatus = "ACTIVE" | "CLOSED";

type OnChainPackageTuple = {
  amount: bigint;
  startTime: bigint;
  roiEarned: bigint;
  isCompleted: boolean;
};

type PackageDoc = {
  id: string;
  walletAddress: string;
  amount: number;
  startAt: number;
  roiEarned: number;
  status: PackageStatus;
};

const n2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "0.00");

/** 3× cap helper */
const threeX = (amt: number) => amt * 3;

/** ROI-progress based percentage (NOT time based) */
const roiProgressPct = (earned: number, cap: number) => {
  const pct = cap > 0 ? (earned / cap) * 100 : 0;
  return Math.max(0, Math.min(100, Math.round(pct)));
};

/* ------------------------ Inline On-Chain Deposit Modal ------------------- */
type BuyHpModalProps = {
  tpAmount: number;
  setTpAmount: (v: number) => void;
  onClose: () => void;
  address?: `0x${string}`;
  onSuccess: () => Promise<void> | void;
  selfInvestment: number;
};

const BuyHpModal: React.FC<BuyHpModalProps> = ({
  tpAmount,
  setTpAmount,
  onClose,
  address,
  onSuccess,
  selfInvestment,
}) => {
  const principal = tpAmount || 0;
  const ratePct = getRatePct(principal + selfInvestment);
  const rate = ratePct / 100;
  const [showLoader, setShowLoader] = useState(false);

  const daily = (principal + selfInvestment) * rate;
  const isBelowMin = principal < 1;

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const handleDeposit = async () => {
    if (isBelowMin) {
      toast.error("Minimum amount is 1 USDT");
      return;
    }
    if (!address) {
      toast.error("Connect wallet to continue.");
      return;
    }
    if (!publicClient) {
      toast.error("Network client not ready. Try again.");
      return;
    }

    try {
      setShowLoader(true);
      const userAddr = getAddress(address);
      const tokenAddr = USDT_ADDRESS as `0x${string}`;
      const stakingAddr = STAKING_ADDRESS as `0x${string}`;
      const amountWei = parseUnits(String(principal), 18);

      const currentAllowance = (await publicClient.readContract({
        address: tokenAddr,
        abi: USDT_ABI,
        functionName: "allowance",
        args: [userAddr, stakingAddr],
      })) as bigint;

      if (currentAllowance < amountWei) {
        const approveHash = await writeContractAsync({
          address: tokenAddr,
          abi: USDT_ABI,
          functionName: "approve",
          args: [stakingAddr, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const depositHash = await writeContractAsync({
        address: stakingAddr,
        abi: STAKING_ABI,
        functionName: "deposit",
        args: [amountWei],
      });
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      setTpAmount(0);
      onClose();
      await onSuccess();
      toast.success("Hash Power deposit confirmed on-chain!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.shortMessage || err?.message || "Deposit failed");
    } finally {
      setShowLoader(false);
    }
  };

  return (
    <>
      {showLoader ? <FullLoader /> : null}
      <AnimatePresence>
        <div className="fixed inset-0 z-[500] flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative bg-[#0F192D] text-white rounded-2xl p-6 border border-gray-700 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-xl"
          >
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

            <div className="bg-[#1B263B] rounded-xl p-4 border border-gray-600 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Estimated Daily Earn:</span>
                <span className="text-blue-400 font-semibold text-sm">
                  ${daily.toFixed(2)} {ratePct > 0 && <>(+{ratePct.toFixed(1)}%)</>}
                </span>
              </div>
            </div>

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
                  onClick={() => setTpAmount(Math.max(0, principal - 1))}
                  className="bg-gray-700 hover:bg-purple-600 w-10 h-10 rounded-lg flex items-center justify-center"
                  aria-label="Decrement"
                >
                  <span className="text-white font-bold">-</span>
                </button>
                <button
                  onClick={() => setTpAmount(principal + 1)}
                  className="bg-gray-700 hover:bg-blue-600 w-10 h-10 rounded-lg flex items-center justify-center"
                  aria-label="Increment"
                >
                  <span className="text-white font-bold">+</span>
                </button>
              </div>
            </div>

            <div className="bg-[#1B263B] rounded-xl p-4 border border-gray-600 mb-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-gray-400 text-xs">Daily</div>
                  <div className="text-white font-bold text-sm">${daily.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs">3× Cap</div>
                  <div className="text-blue-400 font-bold text-sm">
                    ${(principal * 3).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled={isBelowMin || showLoader}
              onClick={handleDeposit}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 rounded-xl hover:from-purple-500 hover:to-blue-500 transition disabled:opacity-50"
            >
              {showLoader ? "Processing..." : "Buy Hash Power"}
            </button>
          </motion.div>
        </div>
      </AnimatePresence>
    </>
  );
};

/* -------------------------------- Trade Page ------------------------------- */
const Trade: React.FC = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const navigate = useNavigate();

  const [tpAmount, setTpAmount] = useState<number>(0);
  const [showBuyTpModal, setShowBuyTpModal] = useState(false);

  const [settlementCountdown, setSettlementCountdown] = useState<string>(() =>
    formatDiff(next4am().getTime() - Date.now())
  );
  useEffect(() => {
    const id = setInterval(() => {
      const diff = next4am().getTime() - Date.now();
      setSettlementCountdown(formatDiff(diff));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const [activePkgs, setActivePkgs] = useState<PackageDoc[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(false);

  const fetchPackages = useCallback(async () => {
    if (!address || !publicClient) {
      setActivePkgs([]);
      return;
    }
    try {
      setLoadingPkgs(true);
      const userAddr = getAddress(address);

      const [rawList] = (await publicClient.readContract({
        address: STAKING_ADDRESS as `0x${string}`,
        abi: STAKING_ABI,
        functionName: "getUserPackagesPaginated",
        args: [userAddr, 0n, 100n],
      })) as readonly [OnChainPackageTuple[], bigint];

      const normalizedActive: PackageDoc[] = (rawList || [])
        .filter((pkg) => !pkg.isCompleted)
        .map((pkg, index) => {
          const amount = Number(formatUnits(pkg.amount || 0n, 18));
          const roiEarned = Number(formatUnits(pkg.roiEarned || 0n, 18));
          return {
            id: `${userAddr}_${index}`,
            walletAddress: userAddr,
            amount,
            startAt: Number(pkg.startTime || 0n) * 1000,
            roiEarned,
            status: "ACTIVE",
          };
        });

      setActivePkgs(normalizedActive);
    } catch (e) {
      console.error("Failed to load on-chain packages:", e);
      toast.error("Failed to load on-chain packages");
    } finally {
      setLoadingPkgs(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    void fetchPackages();
  }, [fetchPackages]);

  const selfInvestment = useMemo(
    () => activePkgs.reduce((s, p) => s + (p.amount || 0), 0),
    [activePkgs]
  );

  const overallPct = useMemo(() => {
    if (!activePkgs.length) return 0;
    let totalCap = 0;
    let totalEarned = 0;
    for (const p of activePkgs) {
      const cap = threeX(p.amount);
      totalCap += cap;
      totalEarned += Math.min(p.roiEarned, cap);
    }
    return roiProgressPct(totalEarned, totalCap);
  }, [activePkgs]);

  return (
    <>
      <Header />
      <div className="max-w-sm mx-auto px-4 pb-24">
        <div className="rounded-2xl p-0.5 bg-gradient-to-r from-[#8d13c2] to-[#ae015b] mb-6 shadow-[0_8px_30px_rgba(141,19,194,0.25)]">
          <div className="rounded-[15px] bg-[#0F192D] p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-white text-xl font-bold leading-tight">
                  AI Earn • Trading Power
                </h2>
                <p className="text-white/80 text-xs">
                  Grow your Hash Power, unlock referral & rank income.
                </p>
              </div>
              <button
                className="bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-full text-sm font-bold border border-white/10 transition"
                onClick={() => setShowBuyTpModal(true)}
              >
                Buy HP
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[10px] text-indigo-200/80 flex items-center justify-center gap-1 mb-1">
                  <span>HP</span>
                  <RefreshCcw
                    size={12}
                    className="text-blue-300 cursor-pointer"
                    onClick={() => void fetchPackages()}
                  />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <img
                    src={Logo_icon}
                    alt="HP"
                    className="w-6 h-7 object-contain"
                  />
                  <span className="text-2xl font-extrabold text-white">
                    {loadingPkgs ? "…" : n2(selfInvestment)}
                  </span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[10px] text-indigo-200/80 mb-1">ROI Progress</div>
                <div className="text-2xl font-extrabold text-white">{overallPct}%</div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[10px] text-indigo-200/80 flex items-center justify-center gap-1 mb-1">
                  <Clock size={12} className="text-white/70" />
                  <span>Settlement</span>
                </div>
                <div className="text-xs font-semibold text-indigo-100">
                  {settlementCountdown}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                className="flex-1 bg-white/10 hover:bg-white/15 text-white py-2.5 rounded-xl text-center font-bold text-sm border border-white/10 transition"
                onClick={() => setShowBuyTpModal(true)}
              >
                Add Hash Power
              </button>
              <button
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition"
                onClick={() => navigate("/statement")}
              >
                <History size={16} />
                History
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/80 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-indigo-300">Active Packages</h4>
            <span className="text-[11px] text-gray-400">
              {activePkgs.length} active
            </span>
          </div>

          {loadingPkgs ? (
            <div className="space-y-3">
              <div className="animate-pulse bg-gray-800 rounded-lg h-24 border border-white/10" />
              <div className="animate-pulse bg-gray-800 rounded-lg h-24 border border-white/10" />
            </div>
          ) : activePkgs.length === 0 ? (
            <div className="text-sm text-gray-400">No active packages.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activePkgs.map((p) => {
                const cap = threeX(p.amount);
                const earned = Math.min(p.roiEarned, cap);
                const pct = roiProgressPct(earned, cap);
                const remaining = Math.max(0, cap - earned);

                return (
                  <div
                    key={p.id}
                    className="rounded-lg p-3 border border-white/10 bg-[#0c162a]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="text-gray-400">Amount</div>
                        <div className="font-semibold text-white">
                          ${n2(p.amount)}
                        </div>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-emerald-400/30 text-emerald-300 bg-emerald-500/10">
                        {p.status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-gray-900 rounded-md p-2 border border-white/10">
                        <div className="text-gray-400">Earned</div>
                        <div className="font-medium text-emerald-300">
                          ${n2(earned)}
                        </div>
                      </div>
                      <div className="bg-gray-900 rounded-md p-2 border border-white/10">
                        <div className="text-gray-400">3× Cap</div>
                        <div className="font-medium text-white/90">
                          ${n2(cap)}
                        </div>
                      </div>
                      <div className="bg-gray-900 rounded-md p-2 border border-white/10">
                        <div className="text-gray-400">Remaining</div>
                        <div className="font-medium text-indigo-300">
                          ${n2(remaining)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-400 to-sky-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-gray-400">
                        {pct}% of 3× cap reached
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showBuyTpModal && (
          <BuyHpModal
            tpAmount={tpAmount}
            setTpAmount={setTpAmount}
            onClose={() => setShowBuyTpModal(false)}
            address={address}
            onSuccess={fetchPackages}
            selfInvestment={selfInvestment}
          />
        )}
      </div>
      <NaveBar />
    </>
  );
};

export default Trade;