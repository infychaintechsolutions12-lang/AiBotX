// src/pages/Introduction.tsx
import React, { useCallback } from "react";
import {
  ShieldCheck,
  Cpu,
  Wallet,
  Lock,
  Sparkles,
  TrendingUp,
  FileDown,
  Users,
  ExternalLink,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

import CertUK from "@/assets/4.png";
import TeamPhoto from "@/assets/JOHN ADAMS (1).png";
import CertAchievement from "@/assets/3.png";
import Header from "@/components/Header";
import NaveBar from "@/components/NaveBar";
import { STAKING_ADDRESS, USDT_ADDRESS } from "@/Helper/constant";

const BRAND = {
  name: "AiEarn",
  gradientFrom: "#8d13c2",
  gradientTo: "#ae015b",
  bg: "#0A1324",
};

// Drive / OneDrive share (replace if needed)
const ONEDRIVE_URL =
  "https://drive.google.com/file/d/1Xq1CU6rid5jw9xc0KPgIszMs7RNKCI_3/view?usp=sharing";

// Exchange logos (local assets)
import binance from "@/assets/binance.png";
import coinbase from "@/assets/coinbase.png";
import kraken from "@/assets/kraken.png";
import bybit from "@/assets/bybit.webp";
import okx from "@/assets/OKX_Logo.svg";
import kucoin from "@/assets/kucoin.png";
import htx from "@/assets/htx.jpeg";
import bitfinex from "@/assets/bitbex.png";
import gate from "@/assets/gate.webp";
import mexc from "@/assets/mexc.webp";
import bingx from "@/assets/bitbex.jpeg";
import bitstamp from "@/assets/bitstamp.png";

const EXCHANGES: { name: string; logo: string }[] = [
  { name: "Binance", logo: binance },
  { name: "Coinbase", logo: coinbase },
  { name: "Kraken", logo: kraken },
  { name: "Bybit", logo: bybit },
  { name: "OKX", logo: okx },
  { name: "KuCoin", logo: kucoin },
  { name: "HTX (Huobi)", logo: htx },
  { name: "Bitfinex", logo: bitfinex },
  { name: "Gate.io", logo: gate },
  { name: "MEXC", logo: mexc },
  { name: "Bitstamp", logo: bitstamp },
  { name: "BingX", logo: bingx },
];

// 11-Level ROI-on-ROI percentages from AiBotXStaking.sol (`levelIncomeBps`)
const LEVEL_INCOME_LADDERS = [
  { label: "Level 1", value: "7%" },
  { label: "Level 2", value: "6%" },
  { label: "Level 3", value: "5%" },
  { label: "Level 4", value: "4%" },
  { label: "Level 5", value: "3%" },
  { label: "Level 6", value: "2%" },
  { label: "Level 7", value: "1%" },
  { label: "Levels 8 – 9", value: "0.5%" },
  { label: "Levels 10 – 11", value: "0.25%" },
];

// Rank Income (Self >= $100). Daily reward for 100 days at each rank.
type RankRow = {
  r: number;
  strong: string;
  other: string;
  self: string;
  perDay: string;
  days: string;
};
const RANK_ROWS: RankRow[] = [
  { r: 1, strong: "5k", other: "5k", self: "≥ $100", perDay: "$5 / day", days: "100 days" },
  { r: 2, strong: "15k", other: "15k", self: "≥ $100", perDay: "$15 / day", days: "100 days" },
  { r: 3, strong: "40k", other: "40k", self: "≥ $100", perDay: "$40 / day", days: "100 days" },
  { r: 4, strong: "75k", other: "75k", self: "≥ $100", perDay: "$75 / day", days: "100 days" },
  { r: 5, strong: "150k", other: "150k", self: "≥ $100", perDay: "$150 / day", days: "100 days" },
  { r: 6, strong: "300k", other: "300k", self: "≥ $100", perDay: "$300 / day", days: "100 days" },
  { r: 7, strong: "700k", other: "700k", self: "≥ $100", perDay: "$700 / day", days: "100 days" },
  { r: 8, strong: "1.5M", other: "1.5M", self: "≥ $100", perDay: "$1,500 / day", days: "100 days" },
  { r: 9, strong: "4M", other: "4M", self: "≥ $100", perDay: "$4,000 / day", days: "100 days" },
  { r: 10, strong: "7.5M", other: "7.5M", self: "≥ $100", perDay: "$7,500 / day", days: "100 days" },
  { r: 11, strong: "25M", other: "25M", self: "≥ $100", perDay: "$25,000 / day", days: "100 days" },
];

const shortAddr = (addr: string) =>
  addr && addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

const Introduction: React.FC = () => {
  const openOneDriveExternally = useCallback((url: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    const openFallbacks = () => {
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) window.location.href = url;
    };

    try {
      const u = new URL(url);
      if (isAndroid) {
        const scheme = u.protocol.replace(":", "") || "https";
        const path = `${u.host}${u.pathname}${u.search}${u.hash}`;
        const intent = `intent://${path}#Intent;scheme=${scheme};package=com.android.chrome;end`;
        window.location.href = intent;
        setTimeout(openFallbacks, 700);
        return;
      }

      if (isIOS) {
        const chromeUrl = url
          .replace(/^https:\/\//i, "googlechromes://")
          .replace(/^http:\/\//i, "googlechrome://");
        const win = window.open(chromeUrl, "_blank");
        if (win) {
          setTimeout(() => {
            try {
              win.focus();
            } catch {
              // ignore focus error
            }
          }, 200);
          setTimeout(openFallbacks, 900);
          return;
        }
        window.location.href = chromeUrl;
        setTimeout(openFallbacks, 900);
        return;
      }

      openFallbacks();
    } catch {
      openFallbacks();
    }
  }, []);

  const handleDownloadClick = useCallback(() => {
    openOneDriveExternally(ONEDRIVE_URL);
  }, [openOneDriveExternally]);

  const openOneDriveInTab = useCallback(() => {
    const opened = window.open(ONEDRIVE_URL, "_self", "noopener,noreferrer");
    if (!opened) window.location.href = ONEDRIVE_URL;
  }, []);

  const copyValue = useCallback(async (value: string, label = "Link copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error("Unable to copy to clipboard.");
    }
  }, []);

  return (
    <>
      <Header />
      <div
        className="min-h-screen w-full pb-20"
        style={{ backgroundColor: BRAND.bg, color: "#fff" }}
      >
        <style>{`
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>

        <main className="max-w-md mx-auto px-4 pb-16">
          {/* Hero */}
          <section className="pt-5">
            <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold leading-snug">
                    {BRAND.name}: AI-Assisted Earning with Hash Power (HP)
                  </h1>
                  <p className="text-sm text-indigo-100/80 mt-2">
                    Acquire <span className="font-semibold">HP</span>, build your network, unlock ranks,
                    and claim working income — directly through the smart contract.
                  </p>
                </div>

                {/* Download / Open Drive */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <button
                    onClick={handleDownloadClick}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                               bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700
                               border border-white/10 shadow"
                    title="Open presentation in browser"
                    aria-label="Open presentation link"
                  >
                    <FileDown className="h-4 w-4" />
                    Download
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={openOneDriveInTab}
                      className="text-[10px] text-indigo-200/80 hover:text-white inline-flex items-center gap-1"
                      title="Open in tab"
                      aria-label="Open in tab"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </button>
                    <button
                      onClick={() => void copyValue(ONEDRIVE_URL, "Presentation link copied!")}
                      className="text-[10px] text-indigo-200/80 hover:text-white inline-flex items-center gap-1"
                      title="Copy link"
                      aria-label="Copy link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Exchanges (logo grid) */}
              <div className="mt-3 rounded-xl overflow-hidden border border-white/10 bg-[#0d1226] p-3">
                <div className="grid grid-cols-4 xs:grid-cols-4 sm:grid-cols-5 gap-4 place-items-center">
                  {EXCHANGES.map((ex) => (
                    <div key={ex.name} className="flex flex-col items-center gap-1">
                      <div className="h-11 w-11 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center">
                        <img
                          src={ex.logo}
                          alt={`${ex.name} logo`}
                          loading="lazy"
                          className="h-10 w-10 object-contain rounded-full"
                          onError={(e) => {
                            const el = e.currentTarget as HTMLImageElement;
                            el.src = binance;
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-indigo-200/80 text-center">
                        {ex.name}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-indigo-200/60 mt-3 text-center">
                  Exchange logos shown for ecosystem familiarity. {BRAND.name} is independent.
                </p>
              </div>
            </div>
          </section>

          {/* On-Chain Contract Addresses */}
          <section className="mt-5">
            <div className="rounded-2xl p-4 border border-white/10 bg-white/5 space-y-2.5">
              <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                On-Chain Smart Contracts
              </div>
              <div className="flex items-center justify-between bg-[#0d1226] border border-white/10 rounded-xl px-3 py-2 text-xs">
                <div>
                  <div className="text-indigo-200/70 text-[11px]">Staking Contract</div>
                  <div className="font-mono text-white">{shortAddr(STAKING_ADDRESS)}</div>
                </div>
                <button
                  onClick={() => void copyValue(STAKING_ADDRESS, "Staking address copied!")}
                  className="p-2 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200"
                  aria-label="Copy staking address"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-[#0d1226] border border-white/10 rounded-xl px-3 py-2 text-xs">
                <div>
                  <div className="text-indigo-200/70 text-[11px]">USDT Token</div>
                  <div className="font-mono text-white">{shortAddr(USDT_ADDRESS)}</div>
                </div>
                <button
                  onClick={() => void copyValue(USDT_ADDRESS, "USDT token address copied!")}
                  className="p-2 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200"
                  aria-label="Copy token address"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>

          {/* Program at a Glance */}
          <section className="mt-5">
            <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
              <h2 className="text-lg font-semibold">Program at a Glance</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 border border-white/10 bg-gradient-to-br from-indigo-600/15 to-purple-600/10">
                  <div className="text-[12px] text-indigo-200/80 font-semibold">
                    Hash Power (HP)
                  </div>
                  <p className="text-[13px] text-indigo-100/85 mt-1">
                    Deposit USDT to activate HP with a 3× earning cap.
                  </p>
                </div>

                <div className="rounded-xl p-3 border border-white/10 bg-gradient-to-br from-emerald-600/15 to-teal-600/10">
                  <div className="text-[12px] text-emerald-200/80 font-semibold">
                    Working Income
                  </div>
                  <p className="text-[13px] text-indigo-100/85 mt-1">
                    Referral, level, and rank rewards accrue in your working balance and can be claimed on-chain.
                  </p>
                </div>

                <div className="rounded-xl p-3 border border-white/10 bg-gradient-to-br from-pink-600/15 to-rose-600/10">
                  <div className="text-[12px] text-pink-200/80 font-semibold">
                    Referral & Level Income
                  </div>
                  <p className="text-[13px] text-indigo-100/85 mt-1">
                    11-level instant referral bonuses on deposits plus 11-level income on downline ROI settlements.
                  </p>
                </div>

                <div className="rounded-xl p-3 border border-white/10 bg-gradient-to-br from-amber-600/15 to-yellow-600/10">
                  <div className="text-[12px] text-amber-200/80 font-semibold">
                    Rank Income
                  </div>
                  <p className="text-[13px] text-indigo-100/85 mt-1">
                    Daily rank rewards for <span className="font-semibold">100 days</span> per unlocked rank (Self ≥ $100).
                  </p>
                </div>

                <div className="col-span-2 rounded-xl p-3 border border-white/10 bg-gradient-to-br from-blue-600/15 to-cyan-600/10">
                  <div className="flex items-center gap-2 text-[12px] text-blue-200/90 font-semibold">
                    <Users className="h-4 w-4" />
                    Rank Qualification Requirement
                  </div>
                  <p className="text-[13px] text-indigo-100/85 mt-1">
                    To qualify for Rank Income, maintain a{" "}
                    <span className="font-semibold">self-investment of $100 or more</span> alongside strong and other leg targets.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How it Works */}
          <section className="mt-6">
            <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                How {BRAND.name} Works
              </div>

              <div className="mt-3 space-y-4 text-[13px] text-indigo-100/85">
                <div>
                  <div className="text-[12px] text-indigo-200/80 font-semibold">
                    1) Connect & Register
                  </div>
                  <p className="mt-1">
                    Connect your wallet and register on-chain with your sponsor address or ID.
                  </p>
                </div>

                <div>
                  <div className="text-[12px] text-indigo-200/80 font-semibold">
                    2) Activate HP
                  </div>
                  <p className="mt-1">
                    Approve and deposit USDT to open a 3× package and earn daily ROI (1.5% up to $1,000; 3% above $1,000).
                  </p>
                </div>

                <div>
                  <div className="text-[12px] text-indigo-200/80 font-semibold">
                    3) Build Your 11-Level Network
                  </div>
                  <p className="mt-1">
                    Share your referral link to earn instant referral bonuses on deposits and level income when downlines settle ROI.
                  </p>
                </div>

                <div>
                  <div className="text-[12px] text-indigo-200/80 font-semibold">
                    4) Unlock Ranks & Claim
                  </div>
                  <p className="mt-1">
                    Meet <span className="font-semibold">strong/other leg</span> targets with{" "}
                    <span className="font-semibold">Self ≥ $100</span> to unlock daily rank rewards (100 days each).
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Level Income Structure */}
          <section className="mt-6">
            <h2 className="text-lg font-semibold">11-Level Income (On Downline ROI)</h2>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-1 gap-2 text-[13px]">
                {LEVEL_INCOME_LADDERS.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-lg border border-white/10 bg-[#0d1226] p-3 flex items-center justify-between"
                  >
                    <div className="text-[12px] text-indigo-200/80 font-semibold">{row.label}</div>
                    <div className="text-emerald-300 font-bold">{row.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-lg border border-blue-400/30 bg-blue-500/10 p-3">
                <div className="flex items-center gap-2 text-[12px] text-blue-200/90 font-semibold">
                  <Users className="h-4 w-4" />
                  Eligibility
                </div>
                <p className="text-[12px] text-indigo-100/85 mt-1">
                  Level income is distributed when downline daily ROI is settled, provided the upline has active investment and is not blocked.
                </p>
              </div>
            </div>
          </section>

          {/* Rank Rewards */}
          <section className="mt-6">
            <h2 className="text-lg font-semibold">Rank Income</h2>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-1 gap-2">
                {RANK_ROWS.map((x) => (
                  <div
                    key={x.r}
                    className="rounded-lg border border-white/10 bg-[#0d1226] p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[12px] text-indigo-200/80 font-semibold">
                        Rank {x.r}
                      </div>
                      <div className="text-[12px] text-indigo-200/80">
                        Strong: <span className="font-semibold">{x.strong}</span> • Other:{" "}
                        <span className="font-semibold">{x.other}</span> • Self:{" "}
                        <span className="font-semibold">{x.self}</span>
                      </div>
                    </div>
                    <div className="text-amber-300 font-bold text-right">
                      <div>{x.perDay}</div>
                      <div className="text-[11px] text-indigo-200/70">{x.days}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-indigo-200/70 mt-3">
                Rank rewards accrue for up to <span className="font-semibold">100 days</span> at the active rank, subject to the 3× package cap.
              </p>
            </div>
          </section>

          {/* Why Choose / Team */}
          <section className="mt-6">
            <h2 className="text-lg font-semibold">Why Choose {BRAND.name}?</h2>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="w-full bg-[#0b0f1f] flex items-center justify-center">
                <img
                  src={TeamPhoto}
                  alt="Team"
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              </div>

              <div className="p-4 space-y-3 text-[13px] text-indigo-100/85">
                <div className="flex gap-2">
                  <Sparkles className="h-4 w-4 text-pink-300 shrink-0" />
                  <p>
                    <span className="font-semibold">On-chain transparency</span> — HP, team levels, rank progress, and claimable balances are tracked directly on-chain.
                  </p>
                </div>
                <div className="flex gap-2">
                  <TrendingUp className="h-4 w-4 text-sky-300 shrink-0" />
                  <p>
                    <span className="font-semibold">Automated reward settlement</span> — daily ROI, 11-level bonuses, and rank rewards settle directly via smart contract calls.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Wallet className="h-4 w-4 text-emerald-300 shrink-0" />
                  <p>
                    <span className="font-semibold">Self-custody wallet flow</span> — connect your wallet to deposit, claim, reinvest, or withdraw directly.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Compliance & Certificates */}
          <section className="mt-6">
            <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Compliance & Certificates
              </div>

              <p className="mt-3 text-[13px] text-indigo-100/85">
                <span className="font-semibold">{BRAND.name}</span> prioritizes clarity and auditability.
                Certificates below reflect organization details and achievements; they are{" "}
                <span className="font-semibold">not</span> investment licenses.
              </p>

              <div className="mt-4 no-scrollbar overflow-x-auto">
                <div className="flex flex-col gap-4 min-w-full">
                  <figure className="m-auto shrink-0 w-full rounded-lg overflow-hidden border border-white/10 bg-[#0d1226]">
                    <div className="w-full h-44 bg-[#0b0f1f] flex items-center justify-center">
                      <img
                        src={CertUK}
                        alt="Certificate of Incorporation"
                        className="max-h-full w-auto object-contain"
                        loading="lazy"
                      />
                    </div>
                    <figcaption className="px-2 py-2 text-[11px] text-center text-indigo-200/80">
                      CERTIFICATE OF INCORPORATION
                    </figcaption>
                  </figure>

                  <figure className="m-auto shrink-0 w-full rounded-lg overflow-hidden border border-white/10 bg-[#0d1226]">
                    <div className="w-full h-44 bg-[#0b0f1f] flex items-center justify-center">
                      <img
                        src={CertAchievement}
                        alt="Certificate of Achievement"
                        className="max-h-full w-auto object-contain"
                        loading="lazy"
                      />
                    </div>
                    <figcaption className="px-2 py-2 text-[11px] text-center text-indigo-200/80">
                      CERTIFICATE OF ACHIEVEMENT
                    </figcaption>
                  </figure>
                </div>
              </div>
            </div>
          </section>

          {/* Security & Trust */}
          <section className="mt-6">
            <h2 className="text-lg font-semibold">Security & Trust</h2>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Wallet className="h-4 w-4 text-emerald-300" />
                  Asset Control
                </div>
                <p className="mt-2 text-[13px] text-indigo-100/85">
                  Interactions happen directly from your connected Web3 wallet to the smart contract.
                </p>
              </div>

              <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="h-4 w-4 text-sky-300" />
                  Encryption & Ops
                </div>
                <p className="mt-2 text-[13px] text-indigo-100/85">
                  End-to-end TLS 1.3, hardened infra, and verifiable on-chain state.
                </p>
              </div>
            </div>
          </section>
        </main>

        <div className="h-4" />
      </div>
      <NaveBar />
    </>
  );
};

export default Introduction;