import React from 'react';
import clsx from 'clsx';

interface Soft3DRibbonCanvasProps {
  visible: boolean;
}

export const Soft3DRibbonCanvas: React.FC<Soft3DRibbonCanvasProps> = ({ visible }) => {
  return (
    <div
      className={clsx(
        'absolute inset-0 pointer-events-none overflow-hidden select-none z-0 transition-opacity duration-1000 ease-in-out',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      aria-hidden="true"
    >
      <style>{`
        @keyframes floatRibbon1 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1, 1);
          }
          50% {
            transform: translate3d(-25px, -14px, 0) scale(1.02, 1.05);
          }
        }
        @keyframes floatRibbon2 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1, 1);
          }
          50% {
            transform: translate3d(30px, 16px, 0) scale(0.98, 0.95);
          }
        }
        @keyframes floatRibbon3 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1, 1);
          }
          50% {
            transform: translate3d(-18px, 12px, 0) scale(1.01, 1.04);
          }
        }
        @keyframes floatRibbon4 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1, 1);
          }
          50% {
            transform: translate3d(20px, -10px, 0) scale(1.03, 0.97);
          }
        }
        .ribbon-wave-1 {
          animation: floatRibbon1 12s ease-in-out infinite;
          transform-origin: center center;
        }
        .ribbon-wave-2 {
          animation: floatRibbon2 15s ease-in-out infinite;
          transform-origin: center center;
        }
        .ribbon-wave-3 {
          animation: floatRibbon3 18s ease-in-out infinite;
          transform-origin: center center;
        }
        .ribbon-wave-4 {
          animation: floatRibbon4 14s ease-in-out infinite;
          transform-origin: center center;
        }
      `}</style>

      {/* Ambient soft glow orbs behind the 3D ribbons */}
      <div className="absolute top-[18%] -left-[10%] w-[550px] h-[380px] rounded-full bg-gradient-to-br from-[#EA580C]/10 to-[#F59E0B]/08 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[15%] -right-[8%] w-[600px] h-[400px] rounded-full bg-gradient-to-tl from-[#52796F]/12 to-[#84A98C]/08 blur-[110px] pointer-events-none" />
      <div className="absolute top-[45%] right-[25%] w-[450px] h-[320px] rounded-full bg-[#FED7AA]/15 blur-[90px] pointer-events-none" />

      {/* Horizontal 3D Wave Ribbons SVG */}
      <svg
        className="w-full h-full object-cover min-w-[1200px]"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Saffron & Amber Gradient with Highlight */}
          <linearGradient id="saffron3DRibbon" x1="0%" y1="30%" x2="100%" y2="70%">
            <stop offset="0%" stopColor="#EA580C" stopOpacity="0.25" />
            <stop offset="25%" stopColor="#F97316" stopOpacity="0.38" />
            <stop offset="50%" stopColor="#FDBA74" stopOpacity="0.45" />
            <stop offset="75%" stopColor="#F59E0B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#C2410C" stopOpacity="0.20" />
          </linearGradient>

          <linearGradient id="saffronEdgeHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#FFEDD5" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#EA580C" stopOpacity="0.2" />
          </linearGradient>

          {/* Sage & Forest Eucalyptus Gradient */}
          <linearGradient id="sage3DRibbon" x1="100%" y1="20%" x2="0%" y2="80%">
            <stop offset="0%" stopColor="#52796F" stopOpacity="0.20" />
            <stop offset="30%" stopColor="#6B9080" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#A4C3B2" stopOpacity="0.42" />
            <stop offset="80%" stopColor="#52796F" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#354F52" stopOpacity="0.15" />
          </linearGradient>

          <linearGradient id="sageEdgeHighlight" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#E8F5E9" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#52796F" stopOpacity="0.2" />
          </linearGradient>

          {/* Warm Champagne Gold Gradient */}
          <linearGradient id="champagne3DRibbon" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.18" />
            <stop offset="35%" stopColor="#FED7AA" stopOpacity="0.32" />
            <stop offset="65%" stopColor="#FEF3C7" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.15" />
          </linearGradient>

          {/* Terracotta Silk Ribbon Gradient */}
          <linearGradient id="terracotta3DRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C2410C" stopOpacity="0.16" />
            <stop offset="40%" stopColor="#FB923C" stopOpacity="0.26" />
            <stop offset="70%" stopColor="#FED7AA" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#EA580C" stopOpacity="0.12" />
          </linearGradient>

          {/* Soft 3D Drop Shadow Filters */}
          <filter id="ribbonShadowWarm" x="-10%" y="-20%" width="120%" height="150%">
            <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#9A3412" floodOpacity="0.09" />
          </filter>

          <filter id="ribbonShadowSage" x="-10%" y="-20%" width="120%" height="150%">
            <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#2D3B36" floodOpacity="0.09" />
          </filter>
        </defs>

        {/* ============================================================ */}
        {/* Ribbon 4: Background Terracotta Whisper Ribbon (Upper Drift) */}
        {/* ============================================================ */}
        <g className="ribbon-wave-4" filter="url(#ribbonShadowWarm)">
          <path
            d="
              M -120,260
              C 320,140 680,340 1080,210
              C 1480,80 1780,280 2060,200
              L 2060,248
              C 1780,328 1480,128 1080,258
              C 680,388 320,188 -120,308
              Z
            "
            fill="url(#terracotta3DRibbon)"
          />
          {/* Subtle Top Gloss Sheen */}
          <path
            d="
              M -120,260
              C 320,140 680,340 1080,210
              C 1480,80 1780,280 2060,200
            "
            fill="none"
            stroke="url(#saffronEdgeHighlight)"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </g>

        {/* ============================================================ */}
        {/* Ribbon 1: Hero Saffron-Amber 3D Wave Ribbon (Mid-Crossing)    */}
        {/* ============================================================ */}
        <g className="ribbon-wave-1" filter="url(#ribbonShadowWarm)">
          <path
            d="
              M -120,390
              C 280,250 640,490 1040,360
              C 1440,230 1740,440 2060,350
              L 2060,420
              C 1740,510 1440,300 1040,430
              C 640,560 280,320 -120,460
              Z
            "
            fill="url(#saffron3DRibbon)"
          />
          {/* Top Silk Edge Highlight */}
          <path
            d="
              M -120,390
              C 280,250 640,490 1040,360
              C 1440,230 1740,440 2060,350
            "
            fill="none"
            stroke="url(#saffronEdgeHighlight)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Bottom Accent Reflection */}
          <path
            d="
              M -120,460
              C 280,320 640,560 1040,430
              C 1440,300 1740,510 2060,420
            "
            fill="none"
            stroke="rgba(234, 88, 12, 0.25)"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>

        {/* ============================================================ */}
        {/* Ribbon 3: Warm Champagne Gold Wave Ribbon (Center Floating)   */}
        {/* ============================================================ */}
        <g className="ribbon-wave-3">
          <path
            d="
              M -120,530
              C 380,640 760,420 1180,560
              C 1580,700 1840,490 2060,540
              L 2060,588
              C 1840,538 1580,748 1180,608
              C 760,468 380,688 -120,578
              Z
            "
            fill="url(#champagne3DRibbon)"
          />
        </g>

        {/* ============================================================ */}
        {/* Ribbon 2: Sage & Eucalyptus 3D Wave Ribbon (Lower Midground)  */}
        {/* ============================================================ */}
        <g className="ribbon-wave-2" filter="url(#ribbonShadowSage)">
          <path
            d="
              M -120,680
              C 340,540 720,780 1120,640
              C 1520,500 1820,720 2060,630
              L 2060,755
              C 1820,845 1520,625 1120,765
              C 720,905 340,665 -120,805
              Z
            "
            fill="url(#sage3DRibbon)"
          />
          {/* Top Silk Edge Highlight */}
          <path
            d="
              M -120,680
              C 340,540 720,780 1120,640
              C 1520,500 1820,720 2060,630
            "
            fill="none"
            stroke="url(#sageEdgeHighlight)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Bottom Edge Accent */}
          <path
            d="
              M -120,805
              C 340,665 720,905 1120,765
              C 1520,625 1820,845 2060,755
            "
            fill="none"
            stroke="rgba(82, 121, 111, 0.25)"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>

        {/* ============================================================ */}
        {/* Ribbon 5: Subtle Lower Ambient Swirl                          */}
        {/* ============================================================ */}
        <g className="ribbon-wave-4">
          <path
            d="
              M -120,870
              C 400,960 820,790 1260,890
              C 1660,980 1890,830 2060,880
              L 2060,920
              C 1890,870 1660,1020 1260,930
              C 820,830 400,1000 -120,910
              Z
            "
            fill="url(#saffron3DRibbon)"
            opacity="0.6"
          />
        </g>
      </svg>
    </div>
  );
};
