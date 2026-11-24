// MobileDashboard.tsx
import React, { useEffect, useState } from "react";
import { History, RefreshCcw, Clock, X, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo_icon from "../assets/AiEarn-DgztSla5.png";
import NaveBar from "./NaveBar";
import Header from "./Header";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import FullLoader from "@/pages/FullLoader";
import { formatUnits, getAddress, maxUint256, parseUnits } from "viem";
import AIEarn from "../pages/ReturnOfInvestement";
import {
  STAKING_ADDRESS,
  STAKING_ABI,
  USDT_ADDRESS,
  USDT_ABI,
} from "@/Helper/constant";

/** ----- Config ----- */
const TELEGRAM_URL = "https://t.me/+xGWOTC_-MZo0NjMx";

/** ----- Shared ROI helper ----- */
const getRatePct = (amount: number): number => {
  if (amount > 1000) return 3.0; // > 1000 USDT = 3% daily
  if (amount >= 1) return 1.5;   // <= 1000 USDT = 1.5% daily
  return 0;
};

/** ----- Countdown helper (next 4:00 AM local) ----- */
const two = (n: number) => String(n).padStart(2, "0");
const next4pm = (): Date => {
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

/** ----- Responsive YouTube Embed ----- */
const ResponsiveYouTube: React.FC<{
  src: string;
  title?: string;
}> = ({ src, title = "YouTube video" }) => {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
      style={{ paddingTop: "56.25%" }} // 16:9
    >
      <iframe
        className="absolute inset-0 h-full w-full"
        src={src}
        title={title}
        frameBorder={0}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
};

/** ----- Inline Modal Component ----- */
type TPModelProps = {
  tpAmount: number;
  setTpAmount: (v: number) => void;
  onClose: () => void;
  address?: `0x${string}`;
  fetch: () => Promise<void> | void;
  selfInvestment: number;
};

const TPModal: React.FC<TPModelProps> = ({
  tpAmount,
  setTpAmount,
  onClose,
  address,
  fetch,
  selfInvestment,
}) => {
  const principal = tpAmount || 0;
  const ratePct = getRatePct(principal + selfInvestment);
  const rate = ratePct / 100;
  const [showLoader, setShowLoader] = useState(false);

  const daily = (principal + selfInvestment) * rate;

  const isBelowMin = principal < 1;
  const canContinue = !isBelowMin;

  const increment = () => setTpAmount((principal || 0) + 1);
  const decrement = () => setTpAmount(Math.max(0, (principal || 0) - 1));

  const tokenAddr = USDT_ADDRESS as `0x${string}`;
  const stakingAddr = STAKING_ADDRESS as `0x${string}`;
  const decimals = 18;

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const buyHashPower = async () => {
    if (!canContinue) {
      toast.error("Minimum amount is 1");
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
      const amount = parseUnits(String(tpAmount), decimals);

      // 1) Check USDT allowance for AiBotXStaking
      const currentAllowance = (await publicClient.readContract({
        address: tokenAddr,
        abi: USDT_ABI,
        functionName: "allowance",
        args: [userAddr, stakingAddr],
      })) as bigint;

      // 2) Approve if allowance is insufficient
      if (currentAllowance < amount) {
        const approveHash = await writeContractAsync({
          address: tokenAddr,
          abi: USDT_ABI,
          functionName: "approve",
          args: [stakingAddr, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // 3) Deposit directly into AiBotXStaking.sol
      const depositHash = await writeContractAsync({
        address: stakingAddr,
        abi: STAKING_ABI,
        functionName: "deposit",
        args: [amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      setTpAmount(0);
      onClose();
      await fetch();
      toast.success("Deposit confirmed on-chain!");
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
      {showLoader ? <FullLoader /> : null}
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

            {/* Daily Earn (dynamic) */}
            <div className="bg-[#1B263B] rounded-xl p-4 border border-gray-600 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300 text-sm">Daily Earn:</span>
                <span className="text-blue-400 font-semibold text-sm">
                  ${daily.toFixed(2)} {ratePct > 0 && <>(+{ratePct.toFixed(1)}%)</>}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-300">History</span>
                <div className="text-gray-400 text-xs mt-1">
                  Settlement time: <span className="text-purple-400">4:00 AM daily</span>
                </div>
              </div>
            </div>

            {/* Amount / Quantity */}
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
                A minimum contribution of $100 is required to qualify for Working Income.
              </p>
            </div>

            {/* Boost Total (principal) */}
            <div className="bg-[#1B263B] rounded-xl p-4 border border-gray-600 text-center mb-4">
              <div className="text-gray-300 text-sm mb-2">Your HP total:</div>
              <div className="flex justify-center items-baseline">
                <span className="text-white font-bold text-2xl">
                  ${Number(principal + selfInvestment).toFixed(2)}
                </span>
                <span className="text-gray-400 text-sm ml-2">USD</span>
              </div>
            </div>

            {/* Estimated Returns */}
            <div className="bg-[#1B263B] rounded-xl p-4 border border-gray-600 mb-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-gray-400 text-xs">Daily</div>
                  <div className="text-white font-bold text-sm">${daily.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs">Profit</div>
                  <div className="text-blue-400 font-bold text-sm">
                    ${Number(principal) * 3}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-600/20 text-purple-200 border border-purple-500/40">
                  Applied Rate: {ratePct > 0 ? `${ratePct.toFixed(1)}% / day` : "—"}
                </span>
              </div>
            </div>

            {/* Continue */}
            <button
              disabled={!canContinue || showLoader}
              onClick={buyHashPower}
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

/** ----- Promo Banner Component ----- */
const PromoBanner: React.FC<{ onCta?: () => void }> = ({ onCta }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-purple-700 to-purple-500 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        {/* Left sticker */}
        <div className="hidden xs:flex flex-col">
          <div className="bg-[#111827] text-white text-[11px] font-bold px-2 py-1 rounded-md rotate-[-2deg] shadow">
            WEEKEND
          </div>
          <div className="bg-white text-[#111827] text-[11px] font-extrabold px-2 py-1 rounded-md -mt-1 rotate-[2deg] shadow">
            EARN FAST
          </div>
        </div>

        {/* Center headline */}
        <div className="flex-1 text-center">
          <div className="text-white text-xl font-extrabold tracking-tight">
            Earn <span className="text-white/90">UPTO</span> <span className="text-white">30%</span>
          </div>
          <div className="text-white/80 text-xs mt-0.5">Limited-time amplified bonus program</div>
        </div>

        {/* Right CTA */}
        <button
          onClick={onCta}
          className="shrink-0 bg-white text-[#0F192D] font-extrabold text-xs px-3 py-2 rounded-lg border border-white/30 hover:bg-white/90 transition"
        >
          LET&apos;S GO
        </button>
      </div>
    </div>
  );
};

/** ----- Main Page ----- */
const MobileDashboard: React.FC = () => {
  const [selfInvestment, setSelfInvestment] = useState(0);
  const [dailyPct, setDailyPct] = useState(0);
  const [dailyEarn, setDailyEarn] = useState(0);
  const [balance, setBalance] = useState(0);
  const [tpAmount, setTpAmount] = useState<number>(0);
  const [showBuyTpModal, setShowBuyTpModal] = useState(false);
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const navigate = useNavigate();
  const [strongTeamBusiness, setStrongTeamBusiness] = useState(0);
  const [otherTeamBusiness, setOtherTeamBusiness] = useState(0);
  const [change, setChange] = useState(false);
  const [remaining, setRemaining] = useState(0);

  // Countdown to 4 AM
  const [settlementCountdown, setSettlementCountdown] = useState<string>(() =>
    formatDiff(next4pm().getTime() - Date.now())
  );
  useEffect(() => {
    const id = setInterval(() => {
      const diff = next4pm().getTime() - Date.now();
      setSettlementCountdown(formatDiff(diff));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (address && publicClient) {
      void fetchDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, publicClient]);

  const fetchDashboard = async () => {
    if (!address || !publicClient) return;

    try {
      const d = (await publicClient.readContract({
        address: STAKING_ADDRESS as `0x${string}`,
        abi: STAKING_ABI,
        functionName: "getDashboardData",
        args: [getAddress(address)],
      })) as {
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

      setBalance(Number(formatUnits(d.balance, 18)));
      setSelfInvestment(Number(formatUnits(d.activeInvestment, 18)));
      setDailyEarn(Number(formatUnits(d.dailyEarn, 18)));
      setDailyPct(Number(d.dailyRateBps) / 100);
      setStrongTeamBusiness(Number(formatUnits(d.strongBusiness, 18)));
      setOtherTeamBusiness(Number(formatUnits(d.otherBusiness, 18)));
      setRemaining(Number(formatUnits(d.remaining3xCap, 18)));
      setChange((v) => !v);
    } catch (e) {
      console.error("Failed to fetch on-chain dashboard data:", e);
    }
  };

  return (
    <>
      <Header />
      <div
        className="mx-auto bg-[#0F192D] min-h-screen text-white font-sans p-4 space-y-6 pb-32"
        style={{ paddingTop: 0 }}
      >
        {/* Promo Banner */}
        <PromoBanner onCta={() => setShowBuyTpModal(true)} />

        {/* Earnings Bar */}
        <div className="flex items-center justify-between bg-[#F5F5FA] text-black rounded-xl px-3 py-2 mb-6">
          <p className="text-sm">
            You Earned:{" "}
            <span className="text-green-600 font-semibold">
              {Number(balance).toFixed(2)}
            </span>
          </p>
          <button
            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-semibold"
            onClick={() => navigate("/withdraw")}
          >
            Withdraw →
          </button>
        </div>

        {/* Earn Section */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-500 rounded-2xl p-4 mb-6 relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-white text-2xl font-bold mb-1">AI Trading BOT</h2>
              <p className="text-white text-opacity-90 text-sm">
                High yield investment opportunity
              </p>
            </div>
            <button
              className="bg-[#0F192D] text-white px-4 py-2 rounded-full text-sm font-bold"
              onClick={() => setShowBuyTpModal(true)}
            >
              LET&apos;S GO
            </button>
          </div>

          {/* HP Card */}
          <div className="relative rounded-2xl mb-4 p-[1px] bg-gradient-to-br from-fuchsia-500/60 via-purple-500/60 to-cyan-500/60 shadow-[0_12px_60px_rgba(168,85,247,.25)]">
            <div className="relative text-center p-4 rounded-2xl bg-[#0B1224]/90 backdrop-blur-xl border border-white/10 overflow-hidden">
              {/* ambient neon glows */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-16 -right-16 w-56 h-56 bg-fuchsia-500/25 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-cyan-500/25 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_40%,rgba(255,255,255,.06)_100%)]" />
              </div>

              {/* Title */}
              <h2 className="relative z-10 text-white text-sm flex items-center justify-center gap-2 mb-3">
                <span className="tracking-wide">HP (Hash Power)</span>
                <RefreshCcw
                  size={14}
                  className="text-blue-200 opacity-90 cursor-pointer"
                  onClick={() => void fetchDashboard()}
                />
              </h2>

              {/* Self Investment */}
              <div className="relative z-10 flex items-center justify-center gap-2 mb-3">
                <img
                  src={Logo_icon}
                  alt="Boost Icon"
                  className="w-9 h-11 object-cover drop-shadow-[0_6px_20px_rgba(59,130,246,.45)]"
                />
                <span className="text-5xl font-extrabold text-white drop-shadow">
                  {Number(selfInvestment).toFixed(2)}
                </span>
              </div>

              {/* Earnable chip */}
              <div className="relative z-10 mb-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold
        bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-300/30 text-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Remaining Income : {Number(remaining).toFixed(2)}$
                </span>
              </div>

              <p className="relative z-10 text-xs text-white/80 mb-4">Your Active Investment</p>

              {/* Stats grid */}
              <div className="relative z-10 grid grid-cols-2 gap-3 mb-4">
                {/* Daily Earn */}
                <div className="rounded-xl p-[1px] bg-gradient-to-br from-emerald-400/60 to-cyan-400/60">
                  <div className="rounded-[11px] px-3 py-2 bg-gradient-to-br from-emerald-600/25 to-cyan-700/25 ring-1 ring-white/15 shadow-lg">
                    <p className="text-[11px] text-white/85">
                      Daily Earn{" "}
                      <span className="text-white font-semibold">
                        {dailyPct >= 0 ? Number(dailyPct).toFixed(2) : 0}%
                      </span>
                    </p>
                    <p className="text-base font-bold mt-0.5">
                      $ {Number(dailyEarn).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Total Team Business */}
                <div className="rounded-xl p-[1px] bg-gradient-to-br from-amber-400/70 via-orange-500/60 to-yellow-400/70">
                  <div className="rounded-[11px] px-3 py-2 bg-gradient-to-br from-amber-700/25 via-orange-700/25 to-yellow-700/25 ring-1 ring-white/15 shadow-lg">
                    <p className="text-[11px] text-white/85">Total Team Business</p>
                    <p className="text-base font-bold mt-0.5">
                      $ {Number(strongTeamBusiness + otherTeamBusiness).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Strong Team */}
                <div className="rounded-xl p-[1px] bg-gradient-to-br from-indigo-400/70 via-violet-500/60 to-purple-500/70">
                  <div className="rounded-[11px] px-3 py-2 bg-gradient-to-br from-indigo-700/25 via-violet-700/25 to-purple-700/25 ring-1 ring-white/15 shadow-lg">
                    <p className="text-[11px] text-white/85">Strong Team</p>
                    <p className="text-base font-bold mt-0.5">
                      $ {Number(strongTeamBusiness).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Other Team */}
                <div className="rounded-xl p-[1px] bg-gradient-to-br from-fuchsia-400/70 via-rose-500/60 to-pink-500/70">
                  <div className="rounded-[11px] px-3 py-2 bg-gradient-to-br from-fuchsia-700/25 via-rose-700/25 to-pink-700/25 ring-1 ring-white/15 shadow-lg">
                    <p className="text-[11px] text-white/85">Other Team</p>
                    <p className="text-base font-bold mt-0.5">
                      $ {Number(otherTeamBusiness).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Business (highlighted) */}
              <div className="relative z-10 rounded-xl p-[1px] bg-[conic-gradient(at_10%_10%,_#60a5fa_0deg,_#a78bfa_120deg,_#22d3ee_240deg,_#60a5fa_360deg)] shadow-[0_8px_40px_rgba(99,102,241,.25)] mb-5">
                <div className="rounded-[11px] px-3 py-3 text-center bg-[#0B1224]/60 backdrop-blur ring-1 ring-white/15">
                  <p className="text-[11px] text-white/80">Total Business (Self + Team)</p>
                  <p className="text-lg font-extrabold mt-0.5">
                    $ {Number(selfInvestment + strongTeamBusiness + otherTeamBusiness).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* History Button */}
              <div className="relative z-10 flex justify-center">
                <button
                  className="group flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-full 
                  bg-gradient-to-r from-purple-600 to-blue-600 text-white 
                  hover:from-purple-500 hover:to-blue-500 transition
                  shadow-[0_10px_30px_rgba(59,130,246,.25)] ring-1 ring-white/20"
                  onClick={() => navigate("/statement")}
                >
                  <History size={16} className="text-white transition-transform group-hover:translate-x-0.5" />
                  <span>View History</span>
                </button>
              </div>
            </div>
          </div>

          {/* Settlement Time (live countdown) */}
          <div className="flex items-center justify-between bg-[#0F192D] bg-opacity-30 rounded-xl px-3 py-2 mb-4">
            <div className="flex items-center">
              <Clock size={16} className="mr-2 text-white text-opacity-80" />
              <span className="text-white text-opacity-80">Settlement time:</span>
            </div>
            <span className="text-white font-semibold">{settlementCountdown}</span>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              className="flex-1 bg-[#0F192D] text-white py-3 rounded-xl text-center font-bold text-sm hover:bg-opacity-90 transition-colors"
              onClick={() => setShowBuyTpModal(true)}
            >
              Buy Hash Power
            </button>
            <button
              className="flex-1 bg-[#0F192D] text-white py-3 rounded-xl text-center font-bold text-sm hover:bg-opacity-90 transition-colors"
              onClick={() => navigate("/friends")}
            >
              Refer & Earn
            </button>
          </div>
        </div>

        {/* ROI Section */}
        <AIEarn change={change} />

        {/* 🎬 Responsive YouTube Video */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResponsiveYouTube
            src="https://www.youtube.com/embed/NeWfFXDMXeU?si=-aZxkae4zpsxoSbP"
            title="How to join"
          />
          <ResponsiveYouTube
            src="https://www.youtube.com/embed/0VAVifedBb8?si=51HlmRUEjRPh86Hr"
            title="AiEarn overview"
          />
          <ResponsiveYouTube
            src="https://www.youtube.com/embed/UJlonx7eE9A?si=xs-dhNXWOBxWmPal"
            title="AIearn Plan Details"
          />
          <ResponsiveYouTube
            src="https://www.youtube.com/embed/E5ujhZ--Ok0?si=04O8RGeurgzUPLZK"
            title="AIearn Rewards System"
          />
          <ResponsiveYouTube
            src="https://www.youtube.com/embed/uzjLy_ryoeQ?si=0DGU3NQQxQqOReWY"
            title="AIearn Income Proof"
          />
          <ResponsiveYouTube
            src="https://www.youtube.com/embed/wXzxPScuE7c?si=dIGzRB8JIcebJ8N2"
            title="AIearn Investment Guide"
          />
        </div>
      </div>

      {/* Floating Support Button (Telegram) */}
      {!showBuyTpModal ? (
        <button
          onClick={() => window.open(TELEGRAM_URL, "_blank")}
          className="fixed bottom-24 right-4 z-[600] flex items-center gap-2 rounded-full px-4 py-3 shadow-lg
                   bg-[#229ED9] text-white font-semibold hover:brightness-110 transition mb-5"
          aria-label="Support on Telegram"
          title="Support on Telegram"
        >
          <MessageCircle className="w-5 h-5" />
          Support
        </button>
      ) : null}

      {/* Buy HP Modal */}
      {showBuyTpModal && (
        <TPModal
          tpAmount={tpAmount}
          setTpAmount={setTpAmount}
          onClose={() => setShowBuyTpModal(false)}
          address={address}
          fetch={fetchDashboard}
          selfInvestment={selfInvestment}
        />
      )}

      <NaveBar />
    </>
  );
};

export default MobileDashboard;