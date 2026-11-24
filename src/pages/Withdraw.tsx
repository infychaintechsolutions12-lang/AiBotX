// Withdraw.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiDollarSign,
  FiCopy,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiArrowUpRight,
  FiRefreshCw,
} from "react-icons/fi";
import { MdAccountBalanceWallet } from "react-icons/md";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { formatUnits, getAddress, parseUnits } from "viem";
import { toast } from "sonner";
import Header from "@/components/Header";
import NaveBar from "@/components/NaveBar";
import { STAKING_ADDRESS, STAKING_ABI } from "@/Helper/constant";

type HistoryItem = {
  id: string | number;
  amount: string;
  wallet: string;
  status: "Completed" | "Pending";
  date: string;
  type: "deposit" | "reinvest" | "withdraw";
};

type OnChainTxTuple = {
  timestamp: bigint;
  amount: bigint;
  txType: string | number;
};

type OnChainDashboardData = {
  userId: bigint;
  sponsor: `0x${string}`;
  balance: bigint;
  workingBalance: bigint;
  activeInvestment: bigint;
  dailyRateBps: bigint;
  dailyEarn: bigint;
  pendingRoi: bigint;
  pendingRank: bigint;
  strongBusiness: bigint;
  otherBusiness: bigint;
  remaining3xCap: bigint;
  directFriendsCount: bigint;
  totalTeam: bigint;
  rank: number;
  isBlocked: boolean;
};

const MIN_WITHDRAW = 1; // USDT minimum

const maskAddress = (addr = "") =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

const normalizeTxType = (raw: string | number): "deposit" | "reinvest" | "withdraw" => {
  if (typeof raw === "number") {
    if (raw === 0) return "deposit";
    if (raw === 1) return "reinvest";
    return "withdraw";
  }
  const lower = String(raw || "").toLowerCase();
  if (lower.includes("reinvest")) return "reinvest";
  if (lower.includes("withdraw")) return "withdraw";
  return "deposit";
};

const FullLoader: React.FC<{ label?: string }> = ({ label = "Processing…" }) => (
  <div
    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center"
    aria-busy="true"
    aria-live="polite"
  >
    <div className="flex flex-col items-center gap-3">
      <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
      <p className="text-white font-semibold">{label}</p>
    </div>
  </div>
);

type ActionType = "withdraw" | "reinvest" | null;

const Withdraw: React.FC = () => {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState<string>("");
  const [confirmAction, setConfirmAction] = useState<ActionType>(null);

  const [available, setAvailable] = useState<number>(0);
  const [withdrawn, setWithdrawn] = useState<number>(0);
  const [withdrawHistory, setWithdrawHistory] = useState<HistoryItem[]>([]);
  const [withdrawHistoryLoading, setWithdrawHistoryLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const connectedWalletMasked = useMemo(
    () => maskAddress(address || ""),
    [address]
  );

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    toast.success("Wallet address copied!");
  };

  const fetchOnChainState = useCallback(
    async (showRefreshToast = false) => {
      if (!address || !publicClient) {
        setAvailable(0);
        setWithdrawn(0);
        setWithdrawHistory([]);
        return;
      }

      try {
        setWithdrawHistoryLoading(true);
        const userAddr = getAddress(address);
        const stakingAddr = STAKING_ADDRESS as `0x${string}`;

        const [dashboard, userStruct, txResponse] = await Promise.all([
          publicClient.readContract({
            address: stakingAddr,
            abi: STAKING_ABI,
            functionName: "getDashboardData",
            args: [userAddr],
          }) as Promise<OnChainDashboardData>,
          publicClient.readContract({
            address: stakingAddr,
            abi: STAKING_ABI,
            functionName: "users",
            args: [userAddr],
          }) as Promise<
            readonly [
              boolean,
              boolean,
              bigint,
              `0x${string}`,
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
            ]
          >,
          publicClient.readContract({
            address: stakingAddr,
            abi: STAKING_ABI,
            functionName: "getUserTransactionsPaginated",
            args: [userAddr, 0n, 100n],
          }) as Promise<readonly [OnChainTxTuple[], bigint]>,
        ]);

        setAvailable(Number(formatUnits(dashboard.balance || 0n, 18)));
        setWithdrawn(Number(formatUnits(userStruct[13] || 0n, 18)));

        const [rawTxs] = txResponse;
        const mappedWithdraws: HistoryItem[] = (rawTxs || [])
          .map((tx, idx) => {
            const type = normalizeTxType(tx.txType);
            const tsMs = Number(tx.timestamp || 0n) * 1000;
            const amtNum = Number(formatUnits(tx.amount || 0n, 18));
            return {
              id: `${userAddr}_${idx}`,
              amount: `${amtNum.toFixed(2)} USDT`,
              wallet: maskAddress(userAddr),
              status: "Completed" as const,
              date: tsMs
                ? new Date(tsMs).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10),
              type,
              _ts: tsMs,
            };
          })
          .filter((item) => item.type === "withdraw")
          .sort((a, b) => b._ts - a._ts)
          .map(({ _ts: _ignored, ...rest }) => rest);

        setWithdrawHistory(mappedWithdraws);
        if (showRefreshToast) {
          toast.success("On-chain data refreshed");
        }
      } catch (err) {
        console.error("Failed to load on-chain withdraw data:", err);
        toast.error("Could not load on-chain balances or history");
      } finally {
        setWithdrawHistoryLoading(false);
      }
    },
    [address, publicClient]
  );

  useEffect(() => {
    void fetchOnChainState(false);
  }, [fetchOnChainState]);

  const validateAmount = () => {
    const v = Number(amount);
    if (!isConnected || !address) {
      toast.error("Connect your wallet first.");
      return false;
    }
    if (!v || v <= 0) {
      toast.error("Enter a valid amount.");
      return false;
    }
    if (v < MIN_WITHDRAW) {
      toast.error(`Minimum amount is ${MIN_WITHDRAW} USDT.`);
      return false;
    }
    if (v > available) {
      toast.error("Insufficient available balance.");
      return false;
    }
    return true;
  };

  const requestWithdraw = async () => {
    if (!validateAmount()) return;
    if (!publicClient) {
      toast.error("Network client not ready.");
      return;
    }

    try {
      setActionLoading(true);
      const requestedAmount = Number(amount);
      const amountWei = parseUnits(amount, 18);

      const txHash = await writeContractAsync({
        address: STAKING_ADDRESS as `0x${string}`,
        abi: STAKING_ABI,
        functionName: "withdraw",
        args: [amountWei],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      toast.success(
        `Withdrew ${requestedAmount.toFixed(2)} USDT directly to your wallet!`
      );
      setAmount("");
      setConfirmAction(null);
      await fetchOnChainState(false);
    } catch (err: any) {
      console.error("Withdraw error:", err);
      toast.error(err?.shortMessage || err?.message || "Withdrawal failed");
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const requestReinvest = async () => {
    if (!validateAmount()) return;
    if (!publicClient) {
      toast.error("Network client not ready.");
      return;
    }

    try {
      setActionLoading(true);
      const requestedAmount = Number(amount);
      const amountWei = parseUnits(amount, 18);

      const txHash = await writeContractAsync({
        address: STAKING_ADDRESS as `0x${string}`,
        abi: STAKING_ABI,
        functionName: "reinvest",
        args: [amountWei],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      toast.success(
        `Reinvested ${requestedAmount.toFixed(2)} USDT into a new package on-chain!`
      );
      setAmount("");
      setConfirmAction(null);
      await fetchOnChainState(false);
    } catch (err: any) {
      console.error("Reinvest error:", err);
      toast.error(err?.shortMessage || err?.message || "Reinvest failed");
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const canAct =
    isConnected &&
    !!address &&
    Number(amount) >= MIN_WITHDRAW &&
    Number(amount) <= available;

  const loaderLabel =
    confirmAction === "reinvest"
      ? "Processing reinvest on-chain…"
      : confirmAction === "withdraw"
        ? "Processing withdrawal on-chain…"
        : "Processing…";

  return (
    <>
      <Header />
      {actionLoading && <FullLoader label={loaderLabel} />}

      <div className="max-w-sm mx-auto bg-[#0F192D] min-h-screen text-white font-sans pb-27">
        {/* Header */}
        <div className="text-center mb-6 pt-4 px-4">
          <h1 className="text-2xl font-bold text-white mb-2">Withdraw / Reinvest</h1>
          <p className="text-gray-400 text-sm">
            Withdraw to wallet or reinvest into a new package
          </p>
        </div>

        {/* Balance Overview */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1B263B] rounded-xl p-3 text-center border border-gray-600">
              <p className="text-purple-400 text-xs font-semibold">Available</p>
              <p className="text-white font-bold">{available.toFixed(2)} USDT</p>
            </div>
            <div className="bg-[#1B263B] rounded-xl p-3 text-center border border-gray-600">
              <p className="text-green-400 text-xs font-semibold">Total Outflow</p>
              <p className="text-green-500 font-bold">{withdrawn.toFixed(2)} USDT</p>
            </div>
          </div>
        </div>

        {/* Read-only Connected Wallet */}
        <div className="px-4 mb-3">
          <div className="bg-[#1B263B] rounded-xl p-4 border border-gray-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MdAccountBalanceWallet className="text-gray-300" size={18} />
              <span className="text-sm text-gray-300">Withdraw to</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {isConnected ? connectedWalletMasked : "Not connected"}
              </span>
              {isConnected && (
                <button
                  onClick={copyAddress}
                  className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                >
                  <FiCopy size={14} /> Copy
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-4 space-y-3">
          <div className="bg-[#1B263B] rounded-xl p-4 border border-gray-600">
            <label className="block text-gray-300 text-sm mb-2">
              Enter Amount (USDT)
            </label>
            <div className="flex items-center space-x-3">
              <FiDollarSign className="text-gray-400" />
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-[#0F192D] border border-gray-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Min: {MIN_WITHDRAW.toFixed(2)} USDT • Max: {available.toFixed(2)} USDT
            </p>
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(((available * p) / 100).toFixed(2))}
                  className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-1 rounded text-xs"
                >
                  {p}%
                </button>
              ))}
            </div>
            {Number(amount) > 0 && Number(amount) < MIN_WITHDRAW && (
              <p className="text-red-400 text-xs mt-2">
                Minimum amount is {MIN_WITHDRAW} USDT.
              </p>
            )}
          </div>

         {/* Action buttons: Reinvest & Static Withdraw */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                canAct ? setConfirmAction("reinvest") : validateAmount()
              }
              disabled={!canAct}
              className={`w-full ${
                !canAct ? "opacity-50 cursor-not-allowed" : ""
              } bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl font-semibold transition-colors`}
            >
              Reinvest
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toast.info("Withdrawal is disabled.");
              }}
              aria-disabled="true"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold cursor-default select-none"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-[#1B263B] p-6 rounded-xl border border-gray-600 w-full max-w-sm">
              <h2 className="text-white text-lg font-bold mb-4">
                {confirmAction === "withdraw"
                  ? "Confirm Withdrawal"
                  : "Confirm Reinvest"}
              </h2>
              <p className="text-gray-300 text-sm mb-4">
                You are about to{" "}
                <span className="text-white font-semibold">
                  {confirmAction === "withdraw"
                    ? "withdraw"
                    : "reinvest into a new package"}
                </span>{" "}
                <span className="text-white font-semibold">
                  {Number(amount).toFixed(2)} USDT
                </span>
                {confirmAction === "withdraw" && (
                  <>
                    {" "}
                    to your wallet{" "}
                    <span className="text-white font-semibold">
                      {connectedWalletMasked}
                    </span>
                    .
                  </>
                )}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-3 py-1 rounded bg-gray-700 text-white text-sm flex items-center gap-1"
                >
                  <FiXCircle size={14} /> Cancel
                </button>
                <button
                  onClick={
                    confirmAction === "withdraw"
                      ? requestWithdraw
                      : requestReinvest
                  }
                  className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm flex items-center gap-1"
                >
                  <FiCheckCircle size={14} /> Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw History */}
        <div className="px-4 mt-8 mb-24">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center">
              <FiClock size={20} className="mr-3 text-purple-400" />
              Withdraw History
            </h2>
            <button
              onClick={() => void fetchOnChainState(true)}
              disabled={withdrawHistoryLoading}
              className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
            >
              <FiRefreshCw
                size={16}
                className={withdrawHistoryLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {withdrawHistoryLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`sk-${i}`}
                  className="h-20 rounded-2xl bg-gradient-to-r from-[#1B263B] to-[#2A3A57] border border-gray-700 animate-pulse"
                />
              ))}
            </div>
          ) : withdrawHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1B263B] flex items-center justify-center">
                <FiClock className="text-gray-500 text-2xl" />
              </div>
              <p className="text-gray-400 text-sm">No withdrawal history yet</p>
              <p className="text-gray-500 text-xs mt-1">
                Your on-chain withdrawals will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawHistory.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="bg-gradient-to-r from-[#1B263B] to-[#2A3A57] rounded-2xl p-4 border border-gray-700 hover:border-purple-500 transition-all duration-300 shadow-lg"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <FiArrowUpRight className="text-purple-400 w-4 h-4 sm:w-5 sm:h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-base sm:text-lg">
                          {tx.amount}
                        </p>
                        <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2 mt-1">
                          <p className="text-gray-400 text-xs">To: {tx.wallet}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400">
                        {tx.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-600">
                    <div>
                      <p className="text-gray-500 text-xs">Date</p>
                      <p className="text-gray-300 text-sm">{tx.date}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Type</p>
                      <p className="text-gray-300 text-sm">On-Chain Withdraw</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NaveBar />
    </>
  );
};

export default Withdraw;