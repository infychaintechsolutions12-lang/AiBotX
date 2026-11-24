import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Filter, Copy, Wallet, Users, Share2, Loader2, Check } from "lucide-react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { formatUnits, getAddress } from "viem";
import { toast } from "sonner";
import Header from "@/components/Header";
import NaveBar from "@/components/NaveBar";
import { STAKING_ADDRESS, STAKING_ABI } from "@/Helper/constant";

/* ----------------------------- Types & helpers ---------------------------- */
type TeamMember = {
  walletAddress: string;
  level: number;
  investment: number;
};

type ReferralRow = {
  wallet: string;
  investment: number;
  level: number;
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

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const maskWallet = (addr: string) => {
  if (!addr) return "";
  if (String(addr).length <= 8) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};

/* -------------------------------- Component ------------------------------- */
const Friends: React.FC = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");

  const [loading, setLoading] = useState(true);
  const [walletReferrals, setWalletReferrals] = useState<ReferralRow[]>([]);
  const [rankLabel, setRankLabel] = useState("Unranked");
  const [rankIncome, setRankIncome] = useState(0);
  const [workingIncome, setWorkingIncome] = useState(0);
  const [strongTeamBusiness, setStrongTeamBusiness] = useState(0);
  const [otherTeamBusiness, setOtherTeamBusiness] = useState(0);
  const [teamLevelCounts, setTeamLevelCounts] = useState<Record<string, number>>({});
  const [totalTeamMembers, setTotalTeamMembers] = useState(0);
  const [parentId, setParentId] = useState<string>("");

  const [claiming, setClaiming] = useState(false);

  const activeWallet = useMemo(
    () => address || sessionStorage.getItem("walletAddress") || "",
    [address]
  );

  const referralLink = useMemo(() => {
    const w = activeWallet || "";
    return `${window.location.origin}/${w}`;
  }, [activeWallet]);

  // 11-Level ROI-on-ROI percentages from AiBotXStaking.sol (`levelIncomeBps`)
  const referralLevels = [
    { level: 1, commission: "7%" },
    { level: 2, commission: "6%" },
    { level: 3, commission: "5%" },
    { level: 4, commission: "4%" },
    { level: 5, commission: "3%" },
    { level: 6, commission: "2%" },
    { level: 7, commission: "1%" },
    { level: 8, commission: "0.5%" },
    { level: 9, commission: "0.5%" },
    { level: 10, commission: "0.25%" },
    { level: 11, commission: "0.25%" },
  ];

  const copyToClipboard = (text: string, msg = "Copied!") => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  const copyWalletAddress = (w: string) => copyToClipboard(w, "Wallet address copied!");

  /* ------------------------------ Fetch on-chain data ----------------------------- */
  const fetchOnChainReferralData = useCallback(async () => {
    if (!activeWallet || !publicClient) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userAddr = getAddress(activeWallet);
      const stakingAddr = STAKING_ADDRESS as `0x${string}`;

      const [dashboard, userStruct, levelCountsArr] = await Promise.all([
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
          functionName: "getLevelTeamCounts",
          args: [userAddr],
        }) as Promise<readonly bigint[]>,
      ]);

      const rankNum = Number(dashboard.rank || 0);
      setRankLabel(rankNum > 0 ? `Rank ${rankNum}` : "Unranked");
      setRankIncome(Number(formatUnits(userStruct[12] || 0n, 18)));
      setWorkingIncome(Number(formatUnits(dashboard.workingBalance || 0n, 18)));
      setStrongTeamBusiness(Number(formatUnits(dashboard.strongBusiness || 0n, 18)));
      setOtherTeamBusiness(Number(formatUnits(dashboard.otherBusiness || 0n, 18)));
      setTotalTeamMembers(Number(dashboard.totalTeam || 0));

      const sponsorAddr = dashboard.sponsor;
      setParentId(sponsorAddr && sponsorAddr !== ZERO_ADDRESS ? sponsorAddr : "");

      const countsMap: Record<string, number> = {};
      const members: TeamMember[] = [];

      for (let lvl = 1; lvl <= 11; lvl++) {
        const count = Number(levelCountsArr[lvl - 1] || 0);
        countsMap[`level${lvl}`] = count;

        if (count > 0) {
          const [wallets, activeInvestments] = (await publicClient.readContract({
            address: stakingAddr,
            abi: STAKING_ABI,
            functionName: "getLevelTeamPaginated",
            args: [userAddr, lvl, 0n, 100n],
          })) as readonly [`0x${string}`[], bigint[], bigint];

          for (let i = 0; i < wallets.length; i++) {
            members.push({
              walletAddress: wallets[i],
              level: lvl,
              investment: Number(formatUnits(activeInvestments[i] || 0n, 18)),
            });
          }
        }
      }

      setTeamLevelCounts(countsMap);
      setWalletReferrals(
        members.map((m) => ({
          wallet: m.walletAddress,
          investment: m.investment,
          level: m.level,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch on-chain referrals:", err);
      toast.error("Could not load on-chain referral data");
    } finally {
      setLoading(false);
    }
  }, [activeWallet, publicClient]);

  useEffect(() => {
    void fetchOnChainReferralData();
  }, [fetchOnChainReferralData]);

  /* ---------------------------- Derived filters ---------------------------- */
  const filteredWallets = walletReferrals.filter((w) => {
    const q = searchTerm.toLowerCase().trim();
    const byText =
      !q ||
      w.wallet.toLowerCase().includes(q) ||
      String(w.investment).includes(q) ||
      String(w.level).includes(q);

    const byLevel = filterLevel === "all" ? true : String(w.level) === filterLevel;

    return byText && byLevel;
  });

  const filteredLevels = referralLevels.filter(
    (lvl) => filterLevel === "all" || lvl.level.toString() === filterLevel
  );

  /* -------------------------- On-chain Working Claim ------------------------ */
  const handleClaim = async () => {
    if (!activeWallet) return toast.error("Connect wallet first.");
    if (workingIncome <= 0) return toast.error("No working balance available to claim.");
    if (!publicClient) return toast.error("Network client not ready.");

    try {
      setClaiming(true);
      const txHash = await writeContractAsync({
        address: STAKING_ADDRESS as `0x${string}`,
        abi: STAKING_ABI,
        functionName: "claimWorkingBalance",
        args: [],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      toast.success("Working balance claimed into your balance!");
      await fetchOnChainReferralData();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.shortMessage || e?.message || "Claim failed");
    } finally {
      setClaiming(false);
    }
  };

  /* --------------------------------- Share --------------------------------- */
  const shareMessage = `Join me here: ${referralLink}`;
  const tryNativeShare = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((navigator as any).share) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (navigator as any).share({
          title: "Referral Invite",
          text: "Join my team and start earning bonuses.",
          url: referralLink,
        });
      } catch {
        // user cancelled or error
      }
      return true;
    }
    return false;
  };

  const openShare = async (platform: "whatsapp" | "telegram" | "facebook" | "instagram") => {
    const encodedText = encodeURIComponent(shareMessage);
    const encodedUrl = encodeURIComponent(referralLink);

    const usedNative = await tryNativeShare();
    if (usedNative) return;

    switch (platform) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodedText}`, "_blank");
        break;
      case "telegram":
        window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, "_blank");
        break;
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank");
        break;
      case "instagram":
        copyToClipboard(referralLink, "Link copied! Paste into Instagram DM/story.");
        break;
    }
  };

  /* ---------------------------------- UI ----------------------------------- */
  return (
    <>
      <Header />
      <div className="max-w-sm mx-auto bg-[#0F192D] min-h-screen text-white font-sans pb-20">
        {/* Title */}
        <div className="text-center mb-4 pt-4 px-4">
          <h1 className="text-2xl font-bold text-white mb-2">Referral Program</h1>
          <p className="text-gray-400 text-sm">Earn commissions from referrals</p>
        </div>

        {/* Referral Link + Share + Claim */}
        <div className="px-4 mt-4 mb-4">
          <div className="bg-[#1B263B] rounded-2xl p-4 border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Your Referral Link</h3>

            <div className="bg-[#0F192D] rounded-xl p-3 mb-3 border border-gray-600">
              <div className="flex items-center justify-between">
                <p className="text-gray-300 text-sm truncate mr-2 flex-1">{referralLink}</p>
                <button
                  onClick={() => copyToClipboard(referralLink, "Referral link copied!")}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors duration-200 ml-2"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(referralLink, "Referral link copied!")}
              className="w-full mb-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <Copy className="h-4 w-4" />
              <span>Copy Referral Link</span>
            </button>

            {/* Share Row */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <button
                onClick={() => openShare("whatsapp")}
                className="bg-[#0F192D] border border-gray-600 rounded-xl py-2 text-xs text-gray-200 hover:border-purple-500"
              >
                WhatsApp
              </button>
              <button
                onClick={() => openShare("telegram")}
                className="bg-[#0F192D] border border-gray-600 rounded-xl py-2 text-xs text-gray-200 hover:border-purple-500"
              >
                Telegram
              </button>
              <button
                onClick={() => openShare("facebook")}
                className="bg-[#0F192D] border border-gray-600 rounded-xl py-2 text-xs text-gray-200 hover:border-purple-500"
              >
                Facebook
              </button>
              <button
                onClick={() => openShare("instagram")}
                className="bg-[#0F192D] border border-gray-600 rounded-xl py-2 text-xs text-gray-200 hover:border-purple-500"
              >
                Instagram
              </button>
            </div>

            {/* Parent/Sponsor card */}
            <div className="bg-[#0F192D] rounded-xl p-3 mb-3 border border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Parent ID (Sponsor)</p>
                  <p className="text-white font-semibold text-sm">
                    {parentId ? maskWallet(parentId) : "—"}
                  </p>
                </div>
                {parentId ? (
                  <button
                    onClick={() => copyToClipboard(parentId, "Parent ID copied!")}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors duration-200"
                    aria-label="Copy parent id"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                This is your sponsor’s on-chain wallet address.
              </p>
            </div>

            {/* Working Balance + Claim */}
            <div className="bg-[#0F192D] rounded-xl p-3 mb-3 border border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Working Balance</p>
                  <p className="text-white font-semibold text-lg">
                    ${Number(workingIncome || 0).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={handleClaim}
                  disabled={claiming || workingIncome <= 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    claiming || workingIncome <= 0
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  }`}
                >
                  {claiming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  {claiming ? "Claiming..." : "Claim Balance"}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Includes referral, level, and rank earnings settled directly on-chain.
              </p>
            </div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="px-4 mb-4">
          <div className="flex space-x-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search wallet, investment, or level..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1B263B] border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="bg-[#1B263B] border border-gray-600 rounded-xl pl-10 pr-8 py-3 text-sm focus:outline-none focus:border-purple-500 appearance-none"
              >
                <option value="all">All Levels</option>
                {referralLevels.map((l) => (
                  <option key={l.level} value={l.level.toString()}>
                    Level {l.level}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Rank + Team summary */}
        <div className="grid grid-cols-2 gap-3 px-4 mb-4">
          <div className="bg-[#1B263B] rounded-xl p-4 text-center border border-gray-600">
            <p className="text-purple-400 text-sm font-semibold">Rank</p>
            <p className="text-white text-lg font-bold">{rankLabel}</p>
            <p className="text-xs text-gray-400 mt-1">
              Rank Income: <span className="text-white font-semibold">${rankIncome.toFixed(2)}</span>
            </p>
          </div>
          <div className="bg-[#1B263B] rounded-xl p-4 text-center border border-gray-600">
            <p className="text-purple-400 text-sm font-semibold flex items-center justify-center gap-1">
              <Users className="h-4 w-4" /> Team
            </p>
            <p className="text-white text-lg font-bold">{totalTeamMembers}</p>
            <p className="text-[11px] text-gray-400 mt-1">
              L1: {teamLevelCounts.level1 || 0} • L2: {teamLevelCounts.level2 || 0} • L3:{" "}
              {teamLevelCounts.level3 || 0}
            </p>
          </div>
        </div>

        {/* Wallet Referrals (Levels 1..11) */}
        <div className="px-4 space-y-4">
          <div className="bg-[#1B263B] rounded-2xl p-4 border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">
              Team Members (Levels 1–11)
            </h3>

            {loading && (
              <div className="space-y-3">
                <div className="h-14 rounded-xl bg-[#0F192D] border border-gray-700 animate-pulse" />
                <div className="h-14 rounded-xl bg-[#0F192D] border border-gray-700 animate-pulse" />
                <div className="h-14 rounded-xl bg-[#0F192D] border border-gray-700 animate-pulse" />
              </div>
            )}

            {!loading && filteredWallets.length === 0 && (
              <div className="text-center text-gray-400 text-sm">
                No team members match your filters.
              </div>
            )}

            {!loading && filteredWallets.length > 0 && (
              <div className="space-y-3">
                {filteredWallets.map((w, idx) => (
                  <div
                    key={`${w.wallet}_${w.level}_${idx}`}
                    className="flex items-center justify-between p-3 bg-[#0F192D] rounded-xl border border-gray-600"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-white text-sm font-medium">{maskWallet(w.wallet)}</span>
                          <button
                            onClick={() => copyWalletAddress(w.wallet)}
                            className="text-gray-400 hover:text-white"
                            aria-label="Copy wallet"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-400">
                          Active Investment:{" "}
                          <span className="text-white font-semibold">${w.investment.toFixed(2)}</span>
                          <span> • L{w.level}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commission Levels */}
          <div className="bg-[#1B263B] rounded-2xl p-4 border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">
              Level Income ({filterLevel === "all" ? "All" : `Level ${filterLevel}`})
            </h3>
            <div className="space-y-3 mb-4">
              {filteredLevels.map((item) => (
                <div
                  key={item.level}
                  className="flex items-center justify-between p-3 bg-[#0F192D] rounded-xl border border-gray-600"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{item.level}</span>
                    </div>
                    <div>
                      <span className="text-white text-sm font-medium">Level {item.level}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-purple-500/20 px-3 py-1 rounded-lg">
                      <span className="text-purple-300 font-semibold text-sm">{item.commission}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* More Incomes: Referral Bonus & Rank Income Conditions */}
            <div className="space-y-3">
              {/* Referral Bonus rules */}
              <div className="p-3 bg-[#0F192D] rounded-xl border border-gray-600">
                <p className="text-white text-sm font-semibold mb-2">Instant Referral Bonus</p>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-purple-300" /> Level 1:{" "}
                    <span className="font-semibold">5%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-purple-300" /> Level 2:{" "}
                    <span className="font-semibold">3%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-purple-300" /> Level 3:{" "}
                    <span className="font-semibold">2%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-purple-300" /> Levels 4-7:{" "}
                    <span className="font-semibold">1%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-purple-300" /> Levels 8-11:{" "}
                    <span className="font-semibold">0.5%</span>
                  </li>
                </ul>
              </div>

              {/* Rank Income Conditions */}
              <div className="p-3 bg-[#0F192D] rounded-xl border border-gray-600">
                <p className="text-white text-sm font-semibold mb-2">
                  Rank Income – Conditions & Reward
                </p>
                <div className="grid grid-cols-1 gap-2 text-[11px] text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>Rank 1</span>
                    <span>
                      Strong: 5k • Other: 5k • Self ≥ 100 • <br />
                      <span className="text-white font-semibold">$5 (100 days)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rank 2</span>
                    <span>
                      Strong: 15k • Other: 15k • Self ≥ 100 • <br />
                      <span className="text-white font-semibold">$15 (100 days)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rank 3</span>
                    <span>
                      Strong: 40k • Other: 40k • Self ≥ 100 • <br />
                      <span className="text-white font-semibold">$40 (100 days)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rank 4</span>
                    <span>
                      Strong: 75k • Other: 75k • Self ≥ 100 • <br />
                      <span className="text-white font-semibold">$75 (100 days)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rank 5</span>
                    <span>
                      Strong: 150k • Other: 150k • Self ≥ 100 • <br />
                      <span className="text-white font-semibold">$150 (100 days)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rank 6</span>
                    <span>
                      Strong: 300k • Other: 300k • Self ≥ 100 • <br />
                      <span className="text-white font-semibold">$300 (100 days)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rank 7</span>
                    <span>
                      Strong: 700k • Other: 700k • Self ≥ 100 • <br />
                      <span className="text-white font-semibold">$700 (100 days)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rank 8</span>
                    <span>
                      Strong: 1.5M • Other: 1.5M • Self ≥ 100 • <br />
                      <span className="text-white font-semibold">$1500 (100 days)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rank 9</span>
                    <span>
                      Strong: 4M • Other: 4M • Self ≥ 100 • <br />
                      <span className="text-white font-semibold">$4000 (100 days)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rank 10</span>
                    <span>
                      Strong: 7.5M • Other: 7.5M • Self ≥ 100 • <br />
                      <span className="text-white font-semibold">$7500 (100 days)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rank 11</span>
                    <span>
                      Strong: 25M • Other: 25M • Self ≥ 100 • <br />
                      <span className="text-white font-semibold">$25000 (100 days)</span>
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-gray-400">
                  <span>
                    Strong: {strongTeamBusiness.toFixed(2)} • Other:{" "}
                    {otherTeamBusiness.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <NaveBar />
    </>
  );
};

export default Friends;