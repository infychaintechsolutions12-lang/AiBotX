import {  Routes, Route } from "react-router-dom";
import "./App.css";

import MobileDashboard from "./components/MobileDashboard";
import AuthPage from "./pages/AuthPage";
import Friends from "./pages/Friend"; // import Friends component
import Trade from "./pages/Trade";
import Introduction from "./pages/Introduction";
import Statement from "./pages/Statement";
import {  Toaster } from "sonner";

import Withdraw from "./pages/Withdraw";

function App() {





  return (
    <>
        <div className="max-w-[500px] mx-auto min-h-screen bg-[#0F192D]">

          {/* Routes */}
          <Routes>
            {/* Public/Auth Pages */}
            <Route path="/" element={<AuthPage />} />
            <Route path="/:id" element={<AuthPage />} />
            <Route path="/dashboard" element={<MobileDashboard />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/introduction" element={<Introduction />} />
            <Route path="/statement" element={<Statement />} />
            <Route path="/withdraw" element={<Withdraw />} />
            {/* You can add more later */}
          </Routes>
        </div>
      
      <Toaster />
    </>
  );
}

export default App;


// // src/App.tsx
// import { useEffect, useMemo, useState } from "react";

// /** === Optional .env keys (Vite) ===
//  * VITE_APP_NAME=AiBotX
//  * VITE_RESUME_AT=2025-10-30T04:00:00+05:30
//  * VITE_SUPPORT_EMAIL=support@yourdomain.com
//  * VITE_TELEGRAM=https://t.me/yourchannel
//  * VITE_TWITTER=https://x.com/yourhandle
//  * VITE_STATUS_URL=https://status.yourdomain.com
//  */

// const APP_NAME = import.meta.env.VITE_APP_NAME || "AiBotX";
// const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "support@aibotx.us";
// const TELEGRAM_URL = import.meta.env.VITE_TELEGRAM || "";
// const TWITTER_URL = import.meta.env.VITE_TWITTER || "";
// const STATUS_URL = import.meta.env.VITE_STATUS_URL || "";

// const RESUME_AT = (() => {
//   const raw = import.meta.env.VITE_RESUME_AT;
//   if (!raw) return null;
//   const d = new Date(raw);
//   return isNaN(d.getTime()) ? null : d;
// })();

// type TLeft = { days: number; hours: number; minutes: number; seconds: number; msTotal: number };

// function diffLeft(to: Date): TLeft {
//   const now = new Date().getTime();
//   const end = to.getTime();
//   const ms = Math.max(0, end - now);
//   const days = Math.floor(ms / (1000 * 60 * 60 * 24));
//   const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
//   const minutes = Math.floor((ms / (1000 * 60)) % 60);
//   const seconds = Math.floor((ms / 1000) % 60);
//   return { days, hours, minutes, seconds, msTotal: ms };
// }


// export default function App() {
//   const [now, setNow] = useState(Date.now());
//   useEffect(() => {
//     const id = setInterval(() => setNow(Date.now()), 1000);
//     return () => clearInterval(id);
//   }, []);

//   const left = useMemo<TLeft | null>(() => (RESUME_AT ? diffLeft(RESUME_AT) : null), [now]);

//   // Optional progress bar: assumes a 6-hour maintenance window if RESUME_AT exists and no start provided.
//   const { progressPct, etaText } = useMemo(() => {
//     if (!RESUME_AT) return { progressPct: null as number | null, etaText: "" };
//     // Guess a 6h window ending at RESUME_AT for a nice progress feel.
//     const end = RESUME_AT.getTime();
//     const start = end - 6 * 60 * 60 * 1000;
//     const pct = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
//     const eta =
//       left && left.msTotal > 0
//         ? `${left.days}d ${left.hours}h ${left.minutes}m ${left.seconds}s`
//         : "Almost back—refresh";
//     return { progressPct: pct, etaText: eta };
//   }, [left, now]);

//   return (
//     <div className="relative min-h-screen bg-[#0b0f1a] text-white overflow-hidden selection:bg-white/10 selection:text-white">
//       {/* Subtle glow/aurora background */}
//       <div className="pointer-events-none absolute inset-0">
//         <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full blur-3xl opacity-30"
//           style={{ background: "radial-gradient(40% 40% at 50% 50%, #2d72ff, transparent 60%)" }} />
//         <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-25"
//           style={{ background: "radial-gradient(40% 40% at 50% 50%, #00d4ff, transparent 60%)" }} />
//         <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_35%)]" />
//       </div>

//       {/* Top bar */}
//       <header className="relative z-10 mx-auto w-full max-w-6xl px-6 py-6 flex items-center justify-between">
//         <div className="flex items-center gap-3">
//           <div className="h-9 w-9 rounded-xl bg-white/10 backdrop-blur-sm grid place-items-center ring-1 ring-white/10">
//             {/* Minimal spark icon */}
//             <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90">
//               <path fill="currentColor" d="M11 2l2 6h6l-5 3.5L16 18l-5-3.5L6 18l2-6.5L3 8h6z" />
//             </svg>
//           </div>
//           <div className="font-semibold tracking-wide">{APP_NAME}</div>
//         </div>
//         {STATUS_URL ? (
//           <a
//             href={STATUS_URL}
//             className="text-sm text-white/80 hover:text-white transition underline underline-offset-4"
//             target="_blank"
//             rel="noreferrer"
//           >
//             Status Page
//           </a>
//         ) : (
//           <span className="text-sm text-white/60">Maintenance Mode</span>
//         )}
//       </header>

//       {/* Main card */}
//       <main className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-24">
//         <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_60px_-15px_rgba(0,0,0,0.6)] p-8 md:p-12">
//           <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80">
//             <span className="h-2 w-2 rounded-full bg-yellow-300 animate-pulse" />
//             Scheduled Maintenance
//           </div>

//           <h1 className="text-3xl md:text-4xl font-bold leading-tight">
//             We’ll be right back.
//           </h1>
//           <p className="mt-3 text-white/80 max-w-2xl">
//             {APP_NAME} is undergoing routine updates to keep things fast, secure, and reliable.
//             Thanks for your patience—your experience is our priority.
//           </p>

//           {/* Countdown */}
//           {RESUME_AT && (
//             <>
//               <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
//                 <TimeBlock label="Days" value={left?.days ?? 0} />
//                 <TimeBlock label="Hours" value={left?.hours ?? 0} />
//                 <TimeBlock label="Minutes" value={left?.minutes ?? 0} />
//                 <TimeBlock label="Seconds" value={left?.seconds ?? 0} />
//               </div>

//               {/* Progress */}
//               {typeof progressPct === "number" && (
//                 <div className="mt-6">
//                   <div className="mb-2 flex items-center justify-between text-xs text-white/70">
//                     <span>Progress</span>
//                     <span>{etaText}</span>
//                   </div>
//                   <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
//                     <div
//                       className="h-full rounded-full bg-gradient-to-r from-[#2d72ff] to-[#00d4ff] transition-[width] duration-1000"
//                       style={{ width: `${progressPct}%` }}
//                     />
//                   </div>
//                   <p className="mt-2 text-xs text-white/60">
//                     Estimated return:&nbsp;
//                     <span className="text-white/80 font-medium">
//                       {RESUME_AT.toLocaleString()}
//                     </span>
//                   </p>
//                 </div>
//               )}
//             </>
//           )}

//           {/* Actions */}
//           <div className="mt-10 flex flex-wrap items-center gap-3">
//             {STATUS_URL && (
//               <a
//                 href={STATUS_URL}
//                 target="_blank"
//                 rel="noreferrer"
//                 className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2 text-sm font-medium shadow hover:opacity-90 transition"
//               >
//                 Check Status
//                 <svg width="16" height="16" viewBox="0 0 24 24">
//                   <path d="M14 3l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" />
//                   <path d="M21 10H3v4h18" fill="none" stroke="currentColor" strokeWidth="2" />
//                 </svg>
//               </a>
//             )}
//             <a
//               href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(APP_NAME + " Maintenance Support")}`}
//               className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
//             >
//               Contact Support
//               <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-90">
//                 <path fill="currentColor" d="M21 8V7l-3 2-2-1-3 2-2-1-3 2-2-1-3 2v1l3-2 2 1 3-2 2 1 3-2 2 1z" />
//                 <path fill="currentColor" d="M21 10v7H3v-7l9 5z" />
//               </svg>
//             </a>
//           </div>

//           {/* Socials */}
//           {(TELEGRAM_URL || TWITTER_URL) && (
//             <div className="mt-8 flex items-center gap-4 text-white/70">
//               {TELEGRAM_URL && (
//                 <a
//                   href={TELEGRAM_URL}
//                   target="_blank"
//                   rel="noreferrer"
//                   className="group inline-flex items-center gap-2 hover:text-white transition"
//                 >
//                   <TelegramIcon />
//                   <span className="text-sm">Telegram</span>
//                 </a>
//               )}
//               {TWITTER_URL && (
//                 <a
//                   href={TWITTER_URL}
//                   target="_blank"
//                   rel="noreferrer"
//                   className="group inline-flex items-center gap-2 hover:text-white transition"
//                 >
//                   <XIcon />
//                   <span className="text-sm">Updates on X</span>
//                 </a>
//               )}
//             </div>
//           )}
//         </section>

//         {/* Tips row */}
//         <section className="mt-6 grid gap-3 md:grid-cols-3">
//           <TipCard
//             title="Why maintenance?"
//             text="We roll out performance upgrades, fix bugs, and enhance security so everything runs buttery smooth."
//           />
//           <TipCard
//             title="Data is safe"
//             text="Your data remains secure. We only pause the interface; core systems are protected and monitored."
//           />
//           <TipCard
//             title="Need help?"
//             text={`Email us at ${SUPPORT_EMAIL} and we’ll assist you shortly.`}
//           />
//         </section>
//       </main>

//       {/* Footer */}
//       <footer className="relative z-10 mx-auto max-w-6xl px-6 pb-10 text-center text-xs text-white/50">
//         © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
//       </footer>
//     </div>
//   );
// }

// /** --- Small components --- */

// function TimeBlock({ label, value }: { label: string; value: number }) {
//   return (
//     <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
//       <div className="text-3xl font-bold tabular-nums tracking-tight">{String(value).padStart(2, "0")}</div>
//       <div className="mt-1 text-xs text-white/70">{label}</div>
//     </div>
//   );
// }

// function TipCard({ title, text }: { title: string; text: string }) {
//   return (
//     <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
//       <div className="mb-1 text-sm font-semibold">{title}</div>
//       <p className="text-sm text-white/70">{text}</p>
//     </div>
//   );
// }

// function TelegramIcon() {
//   return (
//     <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
//       <path d="M9.04 15.28l-.38 5.37c.54 0 .77-.23 1.04-.51l2.5-2.41 5.18 3.79c.95.53 1.62.25 1.88-.88l3.41-16C23.96 2.74 23.27 2 22.33 2.34L2.2 9.92C1.08 10.35 1.09 11.01 2 11.27l5.14 1.61 11.95-7.54c.56-.34 1.07-.15.65.19z" />
//     </svg>
//   );
// }

// function XIcon() {
//   return (
//     <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
//       <path d="M18.244 2H21l-6.47 7.39L22 22h-6.51l-5.09-6.58L4.54 22H2l7.08-8.09L2 2h6.63l4.66 6.11L18.244 2zm-1.12 18h1.88L8.52 4H6.6l10.524 16z" />
//     </svg>
//   );
// }
