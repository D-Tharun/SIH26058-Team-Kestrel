import React, { useState } from 'react';
import { SerialLogMessage, SystemStatus } from '../types';
import { serialService } from '../utils/serialConnection';
import {
  Terminal,
  Usb,
  Trash2,
  Download,
  X,
} from 'lucide-react';

interface SerialModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SystemStatus;
  logs: SerialLogMessage[];
  onClearLogs: () => void;
  onConnectHardware: (baud: number) => Promise<void>;
  onDisconnectHardware: () => Promise<void>;
}

export const SerialModal: React.FC<SerialModalProps> = ({
  isOpen,
  onClose,
  status,
  logs,
  onClearLogs,
  onConnectHardware,
  onDisconnectHardware,
}) => {
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsConnecting(true);
    await onConnectHardware(baudRate);
    setIsConnecting(false);
  };

  const handleExportLogs = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aquachirp_stm32_telemetry_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="serial-connection-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in"
    >
      <div className="bg-white border border-[#DBE2EF] rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-[0_20px_50px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden text-[#112D4E] font-mono">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#DBE2EF] flex items-center justify-between bg-[#F9F7F7]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#DBE2EF] border border-[#3F72AF]/30 text-[#3F72AF]">
              <Usb className="w-5 h-5 text-[#3F72AF]" />
            </div>
            <div>
              <h2 className="text-base font-bold font-['Plus_Jakarta_Sans',sans-serif] uppercase tracking-wider text-[#112D4E]">
                STM32 USB CDC / UART Serial Terminal
              </h2>
              <p className="text-[11px] text-[#3F72AF]">
                Software-Defined Sonar Transmitter Telemetry & Control Bridge (WebSerial)
              </p>
            </div>
          </div>

          <button
            id="close-serial-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#112D4E]/70 hover:text-[#112D4E] hover:bg-[#DBE2EF] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Config / Connection Bar */}
        <div className="px-5 py-3 border-b border-[#DBE2EF] bg-[#F9F7F7] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Baud Rate Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="baud-rate-select" className="text-[#3F72AF]">
                Baud Rate:
              </label>
              <select
                id="baud-rate-select"
                value={baudRate}
                onChange={(e) => setBaudRate(parseInt(e.target.value, 10))}
                disabled={status.isConnected}
                className="bg-white border border-[#DBE2EF] rounded-lg px-2.5 py-1 text-[#112D4E] font-bold focus:outline-none focus:border-[#3F72AF] shadow-2xs"
              >
                <option value={115200}>115,200 bps (Standard)</option>
                <option value={230400}>230,400 bps</option>
                <option value={460800}>460,800 bps</option>
                <option value={921600}>921,600 bps (High Speed)</option>
                <option value={2000000}>2,000,000 bps (2 Mbps DMA)</option>
              </select>
            </div>

            {/* Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shadow-2xs ${
                status.isConnected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-[#DBE2EF] border-[#3F72AF]/30 text-[#112D4E]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status.isConnected ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span>{status.isConnected ? 'PORT OPEN' : 'DISCONNECTED'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!status.isConnected ? (
              <button
                id="btn-open-serial-port"
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#3F72AF] hover:bg-[#112D4E] text-white font-bold transition-all shadow-xs cursor-pointer font-mono text-xs"
              >
                <Usb className="w-4 h-4" />
                <span>{isConnecting ? 'Requesting Port...' : 'Open Serial Port'}</span>
              </button>
            ) : (
              <button
                id="btn-close-serial-port"
                onClick={onDisconnectHardware}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-xs cursor-pointer font-mono text-xs"
              >
                <Usb className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            )}

            <button
              onClick={handleExportLogs}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F9F7F7] hover:bg-[#DBE2EF] border border-[#DBE2EF] text-[#112D4E] cursor-pointer shadow-2xs"
              title="Download Telemetry JSON"
            >
              <Download className="w-3.5 h-3.5 text-[#3F72AF]" />
              <span>Export</span>
            </button>

            <button
              onClick={onClearLogs}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F9F7F7] hover:bg-[#DBE2EF] border border-[#DBE2EF] text-[#112D4E] cursor-pointer shadow-2xs"
              title="Clear Log History"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#3F72AF]" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Live Hex & Telemetry Log Stream */}
        <div className="flex-1 p-4 bg-[#07172C]/75 backdrop-blur-xl overflow-y-auto space-y-1.5 font-mono text-xs min-h-[380px] custom-scrollbar border-y border-white/20 shadow-inner">
          {logs.length === 0 ? (
            <div className="text-slate-400 text-center py-20 flex flex-col items-center justify-center gap-2">
              <Terminal className="w-8 h-8 text-slate-500 opacity-60" />
              <p>No serial packets received yet.</p>
              <p className="text-[11px] text-slate-500">
                Plug in an STM32 Nucleo/Discovery board and click &ldquo;Open Serial Port&rdquo;.
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2.5 hover:bg-white/5 p-1.5 rounded transition-colors text-slate-200"
              >
                <span className="text-slate-400 text-[11px] shrink-0">{log.timestamp}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                    log.direction === 'rx'
                      ? 'bg-blue-500/20 text-[#38BDF8] border border-blue-400/30'
                      : log.direction === 'tx'
                      ? 'bg-amber-500/20 text-[#FBBF24] border border-amber-400/30'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {log.direction}
                </span>
                <span className="text-white text-xs">{log.summary}</span>
                {log.rawHex && (
                  <span className="text-slate-400 text-[11px] ml-auto hidden sm:inline truncate max-w-[280px]">
                    {log.rawHex}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 border-t border-white/50 bg-white/45 backdrop-blur-md flex items-center justify-between text-[11px] text-[#3F72AF]">
          <span>Protocol: STM32 DMA Circular Frame (64 Bytes CRC-16)</span>
          <span>Logged Frames: {logs.length}</span>
        </div>
      </div>
    </div>
  );
};
