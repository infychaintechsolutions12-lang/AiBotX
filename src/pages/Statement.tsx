import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits, getAddress } from "viem";
import Header from "@/components/Header";
import NaveBar from "@/components/NaveBar";
import { STAKING_ADDRESS, STAKING_ABI } from "@/Helper/constant";

/* ------------------ Types ------------------ */
type StatementType =
  | "refferal_bonus"
  | "daily_earning"
  | "level_income"
  | "rank_income"
  | "all";

type TimeFilter = "daily" | "monthly" | "all";

type OnChainStatementTuple = {
  timestamp: bigint;
  amount: bigint;
  from: `0x${string}`;
  incomeType: string | number;
};

interface StatementData {
  _id: string;
  date: number;
  amount: number;
  type: string;
  from?: string;
  walletAddress: string;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const normalizeIncomeType = (raw: string | number): string => {
  if (typeof raw === "number") {
    const enumMap: Record<number, string> = {
      0: "daily_earning",
      1: "level_income",
      2: "refferal_bonus",
      3: "rank_income",
    };
    return enumMap[raw] ?? String(raw);
  }
  return String(raw || "daily_earning");
};

/* ------------------ On-Chain Fetch ------------------ */
const fetchOnChainStatements = async (
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  walletAddress: string,
  type?: StatementType,
  timeFilter?: TimeFilter
): Promise<StatementData[]> => {
  const userAddr = getAddress(walletAddress);

  const [rawList] = (await publicClient.readContract({
    address: STAKING_ADDRESS as `0x${string}`,
    abi: STAKING_ABI,
    functionName: "getUserStatementsPaginated",
    args: [userAddr, 0n, 200n],
  })) as readonly [OnChainStatementTuple[], bigint];

  const now = Date.now();
  let startDate = 0;
  if (timeFilter === "daily") {
    startDate = now - 24 * 60 * 60 * 1000;
  } else if (timeFilter === "monthly") {
    startDate = now - 30 * 24 * 60 * 60 * 1000;
  }

  const mapped: StatementData[] = (rawList || [])
    .map((item, idx) => {
      const dateMs = Number(item.timestamp || 0n) * 1000;
      const amountNum = Number(formatUnits(item.amount || 0n, 18));
      const normalizedType = normalizeIncomeType(item.incomeType);
      const fromAddr =
        item.from && item.from !== ZERO_ADDRESS ? item.from : "-";

      return {
        _id: `${userAddr}_${idx}`,
        date: dateMs,
        amount: Number.isFinite(amountNum) ? amountNum : 0,
        type: normalizedType,
        from: fromAddr,
        walletAddress: userAddr,
      };
    })
    .filter((item) => {
      if (type && type !== "all" && item.type !== type) {
        return false;
      }
      if (startDate > 0 && item.date < startDate) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.date - a.date);

  return mapped;
};

/* ------------------ Component ------------------ */
export default function Statement() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const walletAddress = address || "";

  const [statementFilter, setStatementFilter] = useState<StatementType>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("daily");
  const [statements, setStatements] = useState<StatementData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDisplayType = (type: string) => {
    const map: Record<string, string> = {
      refferal_bonus: "Referral Bonus",
      referral_bonus: "Referral Bonus",
      daily_earning: "Daily Income",
      level_income: "Level Income",
      rank_income: "Rank Reward",
      Self: "Self Income",
    };
    return map[type] || type;
  };

  useEffect(() => {
    if (!walletAddress || !publicClient) {
      setStatements([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchOnChainStatements(
          publicClient,
          walletAddress,
          statementFilter,
          timeFilter
        );
        const normalized = data.map((item) => ({
          ...item,
          date: typeof item.date === "number" ? item.date : +new Date(item.date),
          amount: Number(item.amount) || 0,
          from: item.from || "-",
        }));
        setStatements(normalized);
      } catch (e) {
        console.log(e);
        setError("Failed to load on-chain statements");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [walletAddress, publicClient, statementFilter, timeFilter]);

  const totalAmount = statements.reduce((sum, s) => sum + s.amount, 0);

  return (
    <>
      <Header />
      <div className="bg-[#0F192D] text-white px-4 py-2 max-w-md mx-auto min-h-screen space-y-6 pb-27">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Income Statement
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Track your on-chain earnings and rewards
          </p>
        </div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-4 text-center"
        >
          <p className="text-gray-200 text-sm">
            Total {timeFilter !== "all" ? timeFilter : ""} Earnings
          </p>
          <p className="text-3xl font-bold mt-2">${totalAmount.toFixed(2)}</p>
          <p className="text-gray-200 text-xs mt-1">
            {statements.length} transactions
          </p>
        </motion.div>

        {/* Type Filter */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-3">
          <div className="flex flex-wrap gap-2 justify-center">
            {(
              [
                "all",
                "refferal_bonus",
                "daily_earning",
                "level_income",
                "rank_income",
              ] as StatementType[]
            ).map((type) => (
              <motion.button
                key={type}
                onClick={() => setStatementFilter(type)}
                className={`text-xs px-3 py-2 rounded-full transition-all ${
                  statementFilter === type
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {type === "all"
                  ? "All"
                  : type === "refferal_bonus"
                    ? "Referral"
                    : type === "daily_earning"
                      ? "Daily ROI"
                      : type === "level_income"
                        ? "Level"
                        : "Rank"}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Time Filter */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-3">
          <div className="flex justify-between">
            {(["daily", "monthly", "all"] as TimeFilter[]).map((time) => (
              <motion.button
                key={time}
                onClick={() => setTimeFilter(time)}
                className={`text-xs px-3 py-2 rounded-full transition-all ${
                  timeFilter === time
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {time === "daily" ? "1D" : time === "monthly" ? "1M" : "All"}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Statements List */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-4 max-h-96 overflow-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="text-gray-400 mt-2">Loading statements...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-purple-400 hover:text-purple-300 text-sm"
              >
                Try Again
              </button>
            </div>
          ) : statements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No statements found</p>
              <p className="text-gray-500 text-sm mt-1">
                Your earnings will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {statements.map((s, idx) => (
                  <motion.div
                    key={s._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.02 }}
                    className="bg-gray-700 rounded-xl p-3 hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              s.type === "daily_earning"
                                ? "bg-green-500"
                                : s.type === "refferal_bonus" ||
                                    s.type === "referral_bonus"
                                  ? "bg-blue-500"
                                  : s.type === "level_income"
                                    ? "bg-yellow-500"
                                    : "bg-purple-500"
                            }`}
                          >
                            {getDisplayType(s.type)}
                          </span>
                          <span className="text-gray-300 text-xs">
                            {new Date(s.date).toLocaleDateString()}
                          </span>
                        </div>
                        {s.from && s.from !== "-" && (
                          <p className="text-gray-400 text-xs mt-1">
                            From: {s.from.slice(0, 6)}...{s.from.slice(-4)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">
                          +${s.amount.toFixed(2)}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {new Date(s.date).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      <NaveBar />
    </>
  );
}