import React, { useRef } from 'react';
import { animate } from 'animejs';
import {
  Sliders,
  RotateCcw,
  Sparkles,
  Sun,
  CloudRain,
  Waves,
  Crosshair,
  Compass,
  Anchor,
  Radio,
  Cpu,
  Thermometer,
  Droplets,
  Activity,
  Volume2
} from 'lucide-react';
import { EnvironmentalInputs, PresetEnvironment, SystemStatus } from '../types';
import { PRESET_ENVIRONMENTS } from '../data/presets';
import { AnimeCounter } from './animations/AnimeCounter';

interface EnvironmentalCardProps {
  inputs: EnvironmentalInputs;
  onChangeInputs: (newInputs: EnvironmentalInputs) => void;
  status: SystemStatus;
  onToggleHardwareMode: () => void;
  onResetToDefaults: () => void;
}

export const EnvironmentalCard: React.FC<EnvironmentalCardProps> = ({
  inputs,
  onChangeInputs,
  status,
  onToggleHardwareMode,
  onResetToDefaults,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const updateField = (field: keyof EnvironmentalInputs, value: number) => {
    onChangeInputs({
      ...inputs,
      [field]: value,
    });
  };

  const applyPreset = (preset: PresetEnvironment, btnId: string) => {
    onChangeInputs(preset.values);

    const btn = document.getElementById(btnId);
    if (btn) {
      animate(btn, {
        scale: [1, 1.08, 0.96, 1],
        duration: 350,
        ease: 'outElastic(1, .5)',
      });
    }
  };

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sun':
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case 'CloudRain':
        return <CloudRain className="w-3.5 h-3.5 text-blue-500" />;
      case 'Waves':
        return <Waves className="w-3.5 h-3.5 text-sky-500" />;
      case 'Crosshair':
        return <Crosshair className="w-3.5 h-3.5 text-amber-600" />;
      case 'Compass':
        return <Compass className="w-3.5 h-3.5 text-indigo-500" />;
      case 'Anchor':
        return <Anchor className="w-3.5 h-3.5 text-slate-700" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  return (
    <div
      ref={cardRef}
      id="environmental-conditions-card"
      className="glass-panel p-4 flex flex-col h-full overflow-hidden text-[#112D4E]"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#3F72AF]">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-['Plus_Jakarta_Sans',sans-serif] uppercase tracking-wider text-[#112D4E]">
              Environmental State
            </h2>
            <p className="text-[11px] font-mono text-[#3F72AF]">
              {status.hardwareMode ? 'Live CTD Hardware Telemetry' : 'Simulated Oceanographic Profile'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Hardware mode toggle badge */}
          <button
            id="toggle-hardware-mode-btn"
            onClick={onToggleHardwareMode}
            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all border cursor-pointer ${
              status.hardwareMode
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold shadow-xs'
                : 'bg-[#F9F7F7] hover:bg-[#DBE2EF]/60 text-[#112D4E] border-[#DBE2EF]'
            }`}
          >
            {status.hardwareMode ? 'Hardware Telemetry' : 'Simulation Mode'}
          </button>

          {/* Reset Defaults button */}
          <button
            id="reset-env-defaults-btn"
            onClick={onResetToDefaults}
            title="Reset to ocean baseline"
            className="p-1.5 rounded-lg bg-[#F9F7F7] hover:bg-[#DBE2EF]/60 text-[#3F72AF] hover:text-[#112D4E] border border-[#DBE2EF] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preset Quick Chips Carousel */}
      <div className="py-2.5 border-b border-[#DBE2EF]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#3F72AF] font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#3F72AF]" /> Empirical Ocean Profiles
          </span>
          <span className="text-[10px] font-mono text-[#112D4E]/60">Click to load</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {PRESET_ENVIRONMENTS.map((preset, idx) => (
            <button
              key={preset.name}
              id={`preset-env-btn-${idx}`}
              onClick={() => applyPreset(preset, `preset-env-btn-${idx}`)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F9F7F7] hover:bg-[#DBE2EF] border border-[#DBE2EF] text-[#112D4E] hover:text-[#112D4E] text-xs font-mono whitespace-nowrap transition-all cursor-pointer group shrink-0 shadow-2xs"
            >
              {getPresetIcon(preset.iconName)}
              <span className="group-hover:font-semibold">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Parameter Sliders */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-3.5 pr-1 text-xs font-mono">
        {/* 1. Depth Slider */}
        <div className="space-y-1 bg-[#F9F7F7] p-2.5 rounded-xl border border-[#DBE2EF]">
          <div className="flex items-center justify-between">
            <label className="text-[#112D4E] flex items-center gap-1.5 font-semibold">
              <Anchor className="w-3.5 h-3.5 text-[#3F72AF]" /> Water Depth (z)
            </label>
            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#DBE2EF] shadow-2xs">
              <span className="font-bold text-[#112D4E]">
                <AnimeCounter value={inputs.depth} />
              </span>
              <span className="text-[#3F72AF] text-[10px]">m</span>
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={200}
            step={1}
            value={inputs.depth}
            onChange={(e) => updateField('depth', Number(e.target.value))}
            className="w-full accent-[#3F72AF] cursor-pointer h-1.5 bg-[#DBE2EF] rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-[#112D4E]/60">
            <span>1 m (Surface)</span>
            <span>100 m</span>
            <span>200 m (Abyssal)</span>
          </div>
        </div>

        {/* 2. Turbidity Slider */}
        <div className="space-y-1 bg-[#F9F7F7] p-2.5 rounded-xl border border-[#DBE2EF]">
          <div className="flex items-center justify-between">
            <label className="text-[#112D4E] flex items-center gap-1.5 font-semibold">
              <Waves className="w-3.5 h-3.5 text-amber-500" /> Turbidity & Solids
            </label>
            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#DBE2EF] shadow-2xs">
              <span className="font-bold text-amber-600">
                <AnimeCounter value={inputs.turbidity} />
              </span>
              <span className="text-[#3F72AF] text-[10px]">NTU</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={inputs.turbidity}
            onChange={(e) => updateField('turbidity', Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#DBE2EF] rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-[#112D4E]/60">
            <span>0 NTU (Pristine)</span>
            <span>50 NTU</span>
            <span>100 NTU (Muddy)</span>
          </div>
        </div>

        {/* 3. Temperature Slider */}
        <div className="space-y-1 bg-[#F9F7F7] p-2.5 rounded-xl border border-[#DBE2EF]">
          <div className="flex items-center justify-between">
            <label className="text-[#112D4E] flex items-center gap-1.5 font-semibold">
              <Thermometer className="w-3.5 h-3.5 text-rose-500" /> Temperature (T)
            </label>
            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#DBE2EF] shadow-2xs">
              <span className="font-bold text-rose-600">
                <AnimeCounter value={inputs.temperature} decimals={1} />
              </span>
              <span className="text-[#3F72AF] text-[10px]">°C</span>
            </div>
          </div>
          <input
            type="range"
            min={-2}
            max={45}
            step={0.5}
            value={inputs.temperature}
            onChange={(e) => updateField('temperature', Math.min(45, Math.max(-2, Number(e.target.value))))}
            className="w-full accent-rose-500 cursor-pointer h-1.5 bg-[#DBE2EF] rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-[#112D4E]/60">
            <span>-2 °C (Arctic)</span>
            <span>20 °C</span>
            <span>45 °C (Tropical)</span>
          </div>
        </div>

        {/* 4. Salinity Slider */}
        <div className="space-y-1 bg-[#F9F7F7] p-2.5 rounded-xl border border-[#DBE2EF]">
          <div className="flex items-center justify-between">
            <label className="text-[#112D4E] flex items-center gap-1.5 font-semibold">
              <Droplets className="w-3.5 h-3.5 text-[#3F72AF]" /> Salinity (S)
            </label>
            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#DBE2EF] shadow-2xs">
              <span className="font-bold text-[#3F72AF]">
                <AnimeCounter value={inputs.salinity} decimals={1} />
              </span>
              <span className="text-[#3F72AF] text-[10px]">PSU</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={45}
            step={0.5}
            value={inputs.salinity}
            onChange={(e) => updateField('salinity', Number(e.target.value))}
            className="w-full accent-[#3F72AF] cursor-pointer h-1.5 bg-[#DBE2EF] rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-[#112D4E]/60">
            <span>0 PSU (Fresh)</span>
            <span>35 PSU (Ocean)</span>
            <span>45 PSU (Brine)</span>
          </div>
        </div>

        {/* 5. Resolution vs Penetration Priority Slider (PB0 / ADC1 CH8) */}
        <div className="space-y-1 bg-[#F9F7F7] p-2.5 rounded-xl border border-[#DBE2EF]">
          <div className="flex items-center justify-between">
            <label className="text-[#112D4E] flex items-center gap-1.5 font-semibold">
              <Crosshair className="w-3.5 h-3.5 text-[#3F72AF]" /> Res / Pen Priority
            </label>
            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#DBE2EF] shadow-2xs">
              <span className="font-bold text-[#3F72AF]">
                <AnimeCounter value={inputs.resPen} decimals={2} />
              </span>
              <span className="text-[#3F72AF] text-[10px]">Ratio</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={inputs.resPen}
            onChange={(e) => updateField('resPen', Number(e.target.value))}
            className="w-full accent-[#3F72AF] cursor-pointer h-1.5 bg-[#DBE2EF] rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-[#112D4E]/60">
            <span>0.0 (Max Res)</span>
            <span>0.5 (Balanced)</span>
            <span>1.0 (Deep Pen)</span>
          </div>
        </div>
      </div>

      {/* Bottom Live Hardware Feedback */}
      <div className="pt-2.5 border-t border-[#DBE2EF] flex items-center justify-between text-[11px] font-mono text-[#3F72AF]">
        <span className="flex items-center gap-1">
          <Radio className="w-3 h-3 text-[#3F72AF]" />
          <span>ADC Sampling: 100 Hz</span>
        </span>
        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
          <Cpu className="w-3 h-3" />
          <span>DMA Linked</span>
        </span>
      </div>
    </div>
  );
};
