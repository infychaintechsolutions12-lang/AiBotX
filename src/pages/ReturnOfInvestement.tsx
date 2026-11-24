// ReturnOfInvestement.tsx (AIEarn)
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Zap, BarChart2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits, getAddress } from "viem";
import { STAKING_ADDRESS, STAKING_ABI } from "@/Helper/constant";

/* ------------------------------ Window typing ------------------------------ */
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TradingView?: any;
  }
}

/* ---------------------------- TradingView widget --------------------------- */
const TradingViewChart: React.FC<{
  symbol: string;
  interval?: string;
  theme?: "light" | "dark";
  height?: number | string;
}> = ({ symbol, interval = "60", theme = "dark", height = 460 }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useMemo(() => `tv_${Math.random().toString(36).slice(2)}`, []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.TradingView) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !window.TradingView || !containerRef.current || !symbol) return;
    containerRef.current.innerHTML = "";
    new window.TradingView.widget({
      symbol,
      interval,
      container_id: widgetId,
      autosize: true,
      theme,
      style: "1",
      timezone: "Etc/UTC",
      locale: "en",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      studies: ["RSI@tv-basicstudies"],
      withdateranges: true,
      save_image: false,
    });
  }, [ready, symbol, interval, theme, widgetId]);

  return (
    <div className="w-full" style={{ height }}>
      <div id={widgetId} ref={containerRef} className="w-full h-full" />
    </div>
  );
};

/* --------------------------------- Types ---------------------------------- */
type Ticker24h = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
};

type Candle = [
  number, string, string, string, string, string,
  number, string, number, string, string, string
];

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
  endAt: number;
  roiEarned: number;
  status: PackageStatus;
};

type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number;
  price_change_percentage_24h?: number | null;
};

/* ------------------------------ API helpers ------------------------------- */
const pairToBinance = (pair: string) => pair.replace("/", "").toUpperCase();

const fetchTicker24h = async (symbol: string): Promise<Ticker24h> => {
  const resp = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
  if (!resp.ok) throw new Error("Failed to fetch ticker");
  return resp.json();
};

const fetchKlines = async (symbol: string, interval = "1h", limit = 100): Promise<Candle[]> => {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Failed to fetch klines");
  return resp.json();
};

const fetchTopCoinsByMcap = async (count = 15): Promise<MarketCoin[]> => {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${count}&page=1&price_change_percentage=24h`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Failed to load market data");
  return resp.json();
};

/* -------------------------------- Helpers --------------------------------- */
const n = (v?: string | number, d = 4) => {
  if (v === undefined || v === null) return "-";
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (!Number.isFinite(num)) return "-";
  return num.toFixed(d);
};

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

interface AIEarnProps {
  change: boolean;
}

/* --------------------------------- Page ----------------------------------- */
const AIEarn: React.FC<AIEarnProps> = ({ change }) => {
  const [showTradePower, setShowTradePower] = useState(false);

  const [topPairs, setTopPairs] = useState<
    { pair: string; gainPct: number; rank: number; symbol: string }[]
  >([]);
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [marketsErr, setMarketsErr] = useState<string | null>(null);
  const [showAllPairs, setShowAllPairs] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [ticker, setTicker] = useState<Ticker24h | null>(null);
  const [klines, setKlines] = useState<Candle[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [activePkgs, setActivePkgs] = useState<PackageDoc[]>([]);
  const [closedPkgs, setClosedPkgs] = useState<PackageDoc[]>([]);
  const [loadingTradeTab, setLoadingTradeTab] = useState(false);
  const { address } = useAccount();
  const publicClient = usePublicClient();

  /* --------------------------- Load Market Ranking -------------------------- */
  const loadMarkets = useCallback(async () => {
    try {
      setMarketsLoading(true);
      setMarketsErr(null);
      const dataObj = await fetchTopCoinsByMcap(15);
      const data = dataObj.filter((obj) => obj.symbol !== "USDT");
      const mapped = data
        .filter((c: MarketCoin) => !!c.symbol && !!c.market_cap_rank)
        .sort((a, b) => (a.market_cap_rank ?? 9999) - (b.market_cap_rank ?? 9999))
        .map((c) => ({
          pair: `${c.symbol.toUpperCase()}/USDT`,
          gainPct: Number(c.price_change_percentage_24h ?? 0),
          rank: Number(c.market_cap_rank),
          symbol: c.symbol.toUpperCase(),
        }));
      setTopPairs(mapped);
    } catch (e) {
      console.log(e);
      setMarketsErr("Failed to load market ranking");
      setTopPairs([
        { pair: "BTC/USDT", gainPct: 0.8, rank: 1, symbol: "BTC" },
        { pair: "ETH/USDT", gainPct: 0.5, rank: 2, symbol: "ETH" },
        { pair: "BNB/USDT", gainPct: -0.2, rank: 3, symbol: "BNB" },
        { pair: "SOL/USDT", gainPct: 1.1, rank: 4, symbol: "SOL" },
        { pair: "XRP/USDT", gainPct: -0.3, rank: 5, symbol: "XRP" },
      ]);
    } finally {
      setMarketsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMarkets();
  }, [loadMarkets, change]);

  /* ---------------------------- Load Packages On-Chain ---------------------- */
  const fetchPackages = useCallback(async () => {
    if (!address || !publicClient) {
      setActivePkgs([]);
      setClosedPkgs([]);
      return;
    }

    try {
      setLoadingTradeTab(true);
      const userAddr = getAddress(address);

      const [rawList] = (await publicClient.readContract({
        address: STAKING_ADDRESS as `0x${string}`,
        abi: STAKING_ABI,
        functionName: "getUserPackagesPaginated",
        args: [userAddr, 0n, 100n],
      })) as readonly [OnChainPackageTuple[], bigint];

      const active: PackageDoc[] = [];
      const closed: PackageDoc[] = [];

      (rawList || []).forEach((pkg, idx) => {
        const amount = Number(formatUnits(pkg.amount || 0n, 18));
        const roiEarned = Number(formatUnits(pkg.roiEarned || 0n, 18));
        const startAt = Number(pkg.startTime || 0n) * 1000;
        const isCompleted = Boolean(pkg.isCompleted);

        const doc: PackageDoc = {
          id: `${userAddr}_${idx}`,
          walletAddress: userAddr,
          amount,
          startAt,
          endAt: startAt,
          roiEarned,
          status: isCompleted ? "CLOSED" : "ACTIVE",
        };

        if (isCompleted) {
          closed.push(doc);
        } else {
          active.push(doc);
        }
      });

      setActivePkgs(active);
      setClosedPkgs(closed);
    } catch (e) {
      console.error("Failed to fetch on-chain packages:", e);
    } finally {
      setLoadingTradeTab(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    void fetchPackages();
  }, [fetchPackages, change]);

  /* ------------------------------ Pair Modal -------------------------------- */
  const openPairModal = useCallback(async (pair: string) => {
    const symbol = pairToBinance(pair);
    setSelectedPair(pair);
    setModalOpen(true);
    setLoading(true);
    setErr(null);
    try {
      const [t, k] = await Promise.all([
        fetchTicker24h(symbol),
        fetchKlines(symbol, "1h", 120),
      ]);
      setTicker(t);
      setKlines(k);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setSelectedPair(null);
    setTicker(null);
    setKlines(null);
    setErr(null);
  };

  const roiProgressPct = (roiEarned: number, amount: number) => {
    const cap = Math.max(3 * amount, 0.0000001);
    const done = Math.min(Math.max(roiEarned, 0), cap);
    return Math.round((done / cap) * 100);
  };

  const roiRemaining = (roiEarned: number, amount: number) => {
    const cap = 3 * amount;
    return Math.max(cap - roiEarned, 0);
  };

  const tvSymbol = useMemo(
    () => (selectedPair ? `BINANCE:${pairToBinance(selectedPair)}` : ""),
    [selectedPair]
  );

  return (
    <div className="bg-[#0F192D] rounded-2xl text-white font-sans shadow-2xl transition-all duration-300 border border-white/5">
      {/* Header */}
      <div className="rounded-t-2xl p-5 md:p-6 bg-gradient-to-r from-indigo-600/20 via-violet-600/10 to-sky-500/10 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="font-semibold text-lg md:text-xl text-indigo-100">
              AI Earn • Live Insights
            </h2>
          </div>
          <div className="text-xs md:text-sm text-indigo-200/80">
            Powered by AI Signals & Market Ranking
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Bonus tiers matching AiBotXStaking.sol */}
        <div className="bg-gray-800/60 rounded-xl p-4 text-sm border border-gray-700/80 mb-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30">
          <h3 className="font-semibold text-lg mb-3 text-indigo-300">Daily Bonus Bands</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: "$1 – $1,000", value: "1.5% / day" },
              { label: "$1,000+", value: "3.0% / day" },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-gray-300">{item.label}</span>
                <span className="text-emerald-400 font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 mb-5 border-b border-gray-700/80">
          <button
            onClick={() => setShowTradePower(false)}
            className={`relative px-4 py-2 rounded-t-md flex items-center gap-2 text-sm font-semibold transition duration-300 ${
              !showTradePower ? "text-indigo-300" : "text-gray-400"
            }`}
          >
            <BarChart2 size={18} />
            AI BOT Status
            {!showTradePower && (
              <span className="absolute -bottom-[1px] left-0 w-full h-[2px] bg-indigo-400 rounded" />
            )}
          </button>
          <button
            onClick={() => setShowTradePower(true)}
            className={`relative px-4 py-2 rounded-t-md flex items-center gap-2 text-sm font-semibold transition duration-300 ${
              showTradePower ? "text-indigo-300" : "text-gray-400"
            }`}
          >
            <Zap size={18} />
            My Active Trade
            {showTradePower && (
              <span className="absolute -bottom-[1px] left-0 w-full h-[2px] bg-indigo-400 rounded" />
            )}
          </button>
        </div>

        {/* === AI Trading Status (GRID) — Top Market-Cap Pairs === */}
        {!showTradePower && (
          <div className="space-y-3">
            {marketsErr && (
              <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-400/30 rounded-lg p-3">
                {marketsErr}
              </div>
            )}

            {marketsLoading ? (
              <>
                <div className="h-10 rounded-lg bg-gray-800/80 border border-gray-700 animate-pulse" />
                <div className="h-10 rounded-lg bg-gray-800/80 border border-gray-700 animate-pulse" />
                <div className="h-10 rounded-lg bg-gray-800/80 border border-gray-700 animate-pulse" />
                <div className="h-10 rounded-lg bg-gray-800/80 border border-gray-700 animate-pulse" />
                <div className="h-10 rounded-lg bg-gray-800/80 border border-gray-700 animate-pulse" />
              </>
            ) : (
              <>
                {(showAllPairs ? topPairs : topPairs.slice(0, 5)).map((item, idx) => {
                  if (item.symbol !== "USDT") {
                    const isUp = item.gainPct >= 0;
                    const topBadge = idx === 0 && !showAllPairs ? "Top #1" : undefined;
                    return (
                      <button
                        key={`${item.pair}_${item.rank}`}
                        onClick={() => openPairModal(item.pair)}
                        className="group w-full text-left bg-gray-800/80 rounded-lg px-3 py-2 border border-gray-700 hover:border-indigo-400/30 hover:shadow-lg transition-all focus:outline-none"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                            <span className="truncate font-semibold text-white">
                              {item.pair}
                            </span>
                            <span className="text-[10px] text-indigo-300/80">#{item.rank}</span>
                            {topBadge && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-400/30 text-amber-300 bg-amber-500/10">
                                {topBadge}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm md:text-base font-bold ${
                                isUp ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {`${Number.isNaN(item.gainPct) ? "0.00" : item.gainPct.toFixed(2)}%`}
                            </span>
                            <span className="text-indigo-200/80 text-sm flex items-center">
                              View <ChevronRight className="ml-0.5 h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  }
                  return null;
                })}

                {topPairs.length > 5 && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setShowAllPairs((v) => !v)}
                      className="px-4 py-2 text-xs font-semibold rounded-full border border-indigo-400/30 text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 transition"
                    >
                      {showAllPairs ? "View less" : "View more"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* === My Active Trade (packages + closed) === */}
        {showTradePower && (
          <div className="space-y-5">
            {loadingTradeTab && (
              <div className="animate-pulse bg-gray-900/60 rounded-xl h-24 border border-white/10" />
            )}

            {!loadingTradeTab && (
              <div className="bg-gray-900/80 rounded-xl p-3 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-indigo-300">Active Packages</h4>
                  <span className="text-[11px] text-gray-400">{activePkgs.length} active</span>
                </div>

                {activePkgs.length === 0 ? (
                  <div className="text-sm text-gray-400">No active packages.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {activePkgs.map((p) => {
                      const cap = 3 * p.amount;
                      const pct = roiProgressPct(p.roiEarned, p.amount);
                      const remaining = roiRemaining(p.roiEarned, p.amount);
                      const reachedCap = p.roiEarned >= cap - 1e-9;

                      return (
                        <div
                          key={p.id}
                          className="rounded-lg p-2.5 border border-white/10 bg-[#0c162a]"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-[13px]">
                              <span className="text-gray-400 mr-1.5">Amount</span>
                              <span className="font-semibold text-white">
                                ${p.amount.toFixed(2)}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                reachedCap
                                  ? "border-amber-400/30 text-amber-300 bg-amber-500/10"
                                  : "border-emerald-400/30 text-emerald-300 bg-emerald-500/10"
                              }`}
                            >
                              {reachedCap ? "AT 3× CAP" : p.status}
                            </span>
                          </div>

                          <div className="mt-1.5 text-[11px] text-gray-300 flex flex-wrap gap-x-3 gap-y-1">
                            <span className="text-emerald-300 font-medium">
                              ROI Earned: ${Number(p?.roiEarned).toFixed(2)}
                            </span>
                            <span className="text-indigo-300">
                              3× Cap: ${cap.toFixed(2)}
                            </span>
                            <span className="text-gray-300">
                              Remaining to 3×: ${remaining.toFixed(2)}
                            </span>
                            <span className="text-gray-500">
                              Started: {fmtDate(p.startAt)}
                            </span>
                          </div>

                          <div className="mt-2">
                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-400 to-sky-400"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="mt-0.5 text-[10px] text-gray-400">
                              {pct}% towards 3×
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!loadingTradeTab && (
              <div className="bg-gray-900/80 rounded-xl p-3 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-indigo-300">Closed Packages</h4>
                  <span className="text-[11px] text-gray-400">{closedPkgs.length} closed</span>
                </div>

                {closedPkgs.length === 0 ? (
                  <div className="text-sm text-gray-400">No closed packages.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {closedPkgs.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg p-2.5 border border-white/10 bg-[#0c162a]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-[13px]">
                            <span className="text-gray-400 mr-1.5">Amount</span>
                            <span className="font-semibold text-white">
                              ${p.amount.toFixed(2)}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-rose-400/30 text-rose-300 bg-rose-500/10">
                            CLOSED
                          </span>
                        </div>

                        <div className="mt-1.5 text-[11px] text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
                          <span>
                            <span className="text-gray-500">Started:</span> {fmtDate(p.startAt)}
                          </span>
                        </div>

                        <div className="mt-1.5 text-[11px] text-gray-300 flex flex-wrap gap-x-3 gap-y-1">
                          <span className="text-emerald-400 font-semibold">
                            Total ROI: ${p.roiEarned.toFixed(2)}
                          </span>
                          <span className="truncate max-w-[60%]">
                            <span className="text-gray-500">Wallet:</span>{" "}
                            <span className="text-indigo-300">{p.walletAddress}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal with TradingView + Real Data */}
      <AnimatePresence>
        {modalOpen && selectedPair && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={closeModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative bg-[#0F192D] text-white rounded-2xl p-4 md:p-6 border border-white/10 w-[92vw] max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg md:text-xl font-bold">
                  {selectedPair} • TradingView
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs md:text-sm mb-3">
                <div className="bg-gray-900 rounded-lg p-3 border border-white/10">
                  <div className="text-gray-400">Last</div>
                  <div className="font-semibold text-white">
                    {ticker ? n(ticker.lastPrice, 6) : loading ? "…" : "-"}
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 border border-white/10">
                  <div className="text-gray-400">24h Change</div>
                  <div
                    className={`font-semibold ${
                      ticker && parseFloat(ticker.priceChangePercent) >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {ticker ? `${n(ticker.priceChangePercent, 2)}%` : loading ? "…" : "-"}
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 border border-white/10">
                  <div className="text-gray-400">High</div>
                  <div className="font-semibold text-white">
                    {ticker ? n(ticker.highPrice, 6) : loading ? "…" : "-"}
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 border border-white/10">
                  <div className="text-gray-400">Low</div>
                  <div className="font-semibold text-white">
                    {ticker ? n(ticker.lowPrice, 6) : loading ? "…" : "-"}
                  </div>
                </div>
              </div>

              <div className="bg-gray-950 rounded-xl border border-white/10 overflow-hidden">
                {err ? (
                  <div className="p-6 text-center text-rose-400 text-sm">{err}</div>
                ) : (
                  <TradingViewChart
                    symbol={tvSymbol}
                    interval="60"
                    theme="dark"
                    height={460}
                  />
                )}
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold mb-2">Recent 1h Candles (OHLC)</div>
                <div className="max-h-48 overflow-auto rounded-lg border border-white/10">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-900 text-gray-300 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2">Time</th>
                        <th className="text-right px-3 py-2">Open</th>
                        <th className="text-right px-3 py-2">High</th>
                        <th className="text-right px-3 py-2">Low</th>
                        <th className="text-right px-3 py-2">Close</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td className="px-3 py-2 text-gray-400" colSpan={5}>
                            Loading…
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        klines?.slice(-25).map((c, i) => {
                          const ts = new Date(c[0]).toLocaleString();
                          const open = parseFloat(c[1]);
                          const high = parseFloat(c[2]);
                          const low = parseFloat(c[3]);
                          const close = parseFloat(c[4]);
                          const up = close >= open;
                          return (
                            <tr key={`${c[0]}_${i}`} className="odd:bg-gray-900/60">
                              <td className="px-3 py-2 text-gray-300">{ts}</td>
                              <td className="px-3 py-2 text-right">{n(open, 6)}</td>
                              <td className="px-3 py-2 text-right">{n(high, 6)}</td>
                              <td className="px-3 py-2 text-right">{n(low, 6)}</td>
                              <td
                                className={`px-3 py-2 text-right ${
                                  up ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {n(close, 6)}
                              </td>
                            </tr>
                          );
                        })}
                      {!loading && !klines?.length && !err && (
                        <tr>
                          <td className="px-3 py-2 text-gray-400" colSpan={5}>
                            No data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIEarn;