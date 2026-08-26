import React from 'react';
import {
  Cpu,
  Zap,
  Activity,
  Usb,
  Layers,
  Terminal,
  TreeDeciduous,
  ShieldCheck,
  Compass,
  Waves,
} from 'lucide-react';
import { TabType, SystemStatus, TransmitterParameters } from '../types';

interface TopNavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  status: SystemStatus;
  params: TransmitterParameters;
  onOpenSerialModal: () => void;
  onToggleDemoMode: () => void;
  onManualPing?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  setActiveTab,
  status,
  onOpenSerialModal,
}) => {
  const isSelfMonConnected = status.selfMonitorStatus === 'connected';

  const NAV_ITEMS: Array<{
    id: TabType;
    shortLabel: string;
    fullLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', shortLabel: 'Transmitter', fullLabel: 'Live Transmitter', icon: Layers },
    { id: 'decision_engine', shortLabel: 'Decision', fullLabel: 'Decision Engine', icon: TreeDeciduous },
    { id: 'signal_analysis', shortLabel: 'Signals', fullLabel: 'Signal Analysis', icon: Activity },
    { id: 'physics_health', shortLabel: 'Physics', fullLabel: 'Physics & Health', icon: Compass },
    { id: 'system_story', shortLabel: 'Pipeline', fullLabel: 'Pipeline Story', icon: Zap },
    { id: 'packet_inspector', shortLabel: 'Console', fullLabel: 'Serial Console', icon: Terminal },
  ];

  return (
    <div className="sticky top-3 z-40 px-2 sm:px-4 lg:px-6 max-w-[1920px] w-full mx-auto pointer-events-auto">
      <header
        id="aquachirp-top-navbar"
        className="rounded-2xl border border-[#DBE2EF] bg-[#F9F7F7] text-[#112D4E] py-2 px-3 sm:px-4 shadow-[0_4px_20px_-2px_rgba(17,45,78,0.06)]"
      >
        <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-2.5">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-start shrink-0">
            <div className="flex items-center gap-2.5">
              {/* Oceanic Slate Blue Icon Box */}
              <div className="w-8 h-8 rounded-lg bg-[#DBE2EF] border border-[#3F72AF]/30 flex items-center justify-center text-[#3F72AF] shadow-2xs shrink-0">
                <Waves className="w-4 h-4 text-[#3F72AF]" />
              </div>

              <div className="flex flex-col">
                <span className="text-[#112D4E] font-extrabold text-base tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                  AquaChirp
                </span>
                <span className="text-[10px] font-mono text-[#3F72AF] -mt-0.5 font-medium whitespace-nowrap hidden sm:inline">
                  Software-Defined Sonar
                </span>
              </div>
            </div>

            {/* Mobile Quick Action Button */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={onOpenSerialModal}
                className="px-2.5 py-1 rounded-lg bg-[#3F72AF] hover:bg-[#112D4E] text-white font-bold text-xs font-mono transition-colors shadow-xs"
              >
                {status.isConnected ? 'USB Open' : 'Connect USB'}
              </button>
            </div>
          </div>

          {/* Center: Segmented Navigation Container */}
          <nav
            id="aquachirp-nav-tabs"
            className="bg-white p-0.5 rounded-xl border border-[#DBE2EF] flex items-center gap-0.5 overflow-x-auto custom-scrollbar w-full lg:w-auto justify-start lg:justify-center shadow-2xs shrink-0"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#3F72AF] text-white font-bold shadow-xs'
                      : 'text-[#112D4E]/80 hover:text-[#112D4E] hover:bg-[#DBE2EF]/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#3F72AF]'}`} />
                  <span className="hidden 2xl:inline">{item.fullLabel}</span>
                  <span className="inline 2xl:hidden">{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Technical Capsule Status Box & Connect USB */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {/* Compact Status Capsule */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-[#DBE2EF] text-[11px] font-mono text-[#112D4E] shadow-2xs tabular-nums select-none shrink-0">
              <span className="flex items-center gap-1 text-[#3F72AF] font-semibold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3F72AF] animate-pulse shrink-0" />
                <span className="text-[#112D4E]/70">Link:</span>
                <strong className="text-[#112D4E]">OK</strong>
              </span>
              <span className="text-[#DBE2EF]">|</span>
              <span className="flex items-center gap-1 text-amber-600 font-medium shrink-0">
                <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                <span>DMA</span>
              </span>
              <span className="text-[#DBE2EF]">|</span>
              <span className="flex items-center gap-1 text-[#3F72AF] font-medium shrink-0">
                <Cpu className="w-3 h-3 text-[#3F72AF] shrink-0" />
                <span>{status.isCpuSleeping ? 'Sleep (96%)' : 'Active'}</span>
              </span>
              <span className="text-[#DBE2EF] hidden xl:inline">|</span>
              <span className={`hidden xl:flex items-center gap-1 font-medium shrink-0 ${isSelfMonConnected ? 'text-emerald-700' : 'text-rose-600'}`}>
                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{isSelfMonConnected ? '3.3V' : 'ERR'}</span>
              </span>
            </div>

            {/* Connect USB Button */}
            <button
              id="btn-connect-usb"
              onClick={onOpenSerialModal}
              className="bg-[#3F72AF] hover:bg-[#112D4E] text-white font-bold text-xs px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer font-mono shrink-0"
            >
              <Usb className="w-3.5 h-3.5 text-[#DBE2EF]" />
              <span>{status.isConnected ? 'USB Open' : 'Connect USB'}</span>
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};
