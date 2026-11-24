// NaveBar.tsx
import React from "react";
import { Home, Users, Repeat, BookOpen, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";

type Item = {
  label: string;
  to: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  centerAction?: boolean;
  useEnd?: boolean; // exact match
};

const items: Item[] = [
  { label: "Home", to: "/dashboard", icon: Home, useEnd: true },
  { label: "Friends", to: "/friends", icon: Users },
  { label: "Trade", to: "/trade", icon: Repeat, centerAction: true },
  { label: "Information", to: "/introduction", icon: BookOpen },
  { label: "Statement", to: "/statement", icon: FileText },
];

const NaveBar: React.FC = () => {
  const commonHoverTap = {
    whileTap: { scale: 0.9, rotateX: 10, rotateY: 5 },
    whileHover: { scale: 1.05, rotateX: 3, rotateY: 3 },
    transition: { type: "spring", stiffness: 300, damping: 20 },
  } as const;

  const makeClassName =
    (centerAction?: boolean) =>
      ({ isActive }: { isActive: boolean; isPending: boolean; isTransitioning?: boolean }) =>
        [
          "flex-1 flex flex-col items-center justify-center focus:outline-none",
          !centerAction ? "py-0" : "",
          isActive ? "text-purple-500" : "text-white",
        ].join(" ");

  const bar = (
    <div
      className="fixed left-0 right-0 flex justify-center z-[100]"
      // Keep it glued to screen bottom + safe area, regardless of dynamic toolbars
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
        // Avoid any inherited 3D contexts affecting it
        transform: "none",
        willChange: "transform",
      }}
    >
      <nav
        className="bg-[#0F192D] border border-gray-700 flex justify-between items-center w-full max-w-sm mx-auto py-3 rounded-full shadow-lg px-5"
        aria-label="Bottom Navigation"
      >
        {items.map(({ label, to, icon: Icon, centerAction, useEnd }) => (
          <NavLink key={label} to={to} end={useEnd} className={makeClassName(centerAction)}>
            {!centerAction ? (
              <motion.div className="flex flex-col items-center justify-center" {...commonHoverTap}>
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{label}</span>
              </motion.div>
            ) : (
              <motion.div className="flex flex-col items-center -mt-3" {...commonHoverTap}>
                <div className="bg-purple-600 p-4 rounded-full shadow-lg">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-white mt-1">{label}</span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  // Render to <body> so no ancestor transforms can move it
  return createPortal(bar, document.body);
};

export default NaveBar;
