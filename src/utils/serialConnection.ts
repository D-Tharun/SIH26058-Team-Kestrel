import { SerialLogMessage, SystemStatus } from '../types';

export interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

export type TelemetryCallback = (telemetryData: any, rawHex?: string) => void;

class SerialManager {
  private port: any = null;
  private reader: any = null;
  private isReading = false;
  private logCallbacks: ((log: SerialLogMessage) => void)[] = [];
  private telemetryCallbacks: TelemetryCallback[] = [];
  private packetIdCounter = 0;
  private textBuffer = '';

  public isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public onLog(cb: (log: SerialLogMessage) => void) {
    this.logCallbacks.push(cb);
    return () => {
      this.logCallbacks = this.logCallbacks.filter((c) => c !== cb);
    };
  }

  public onTelemetry(cb: TelemetryCallback) {
    this.telemetryCallbacks.push(cb);
    return () => {
      this.telemetryCallbacks = this.telemetryCallbacks.filter((c) => c !== cb);
    };
  }

  private dispatchLog(direction: 'rx' | 'tx' | 'sys', type: SerialLogMessage['type'], rawHex: string, summary: string) {
    const log: SerialLogMessage = {
      id: `pkt_${Date.now()}_${++this.packetIdCounter}`,
      timestamp: new Date().toLocaleTimeString() + '.' + String(Date.now() % 1000).padStart(3, '0'),
      direction,
      type,
      rawHex,
      summary,
    };
    this.logCallbacks.forEach((cb) => cb(log));
  }

  public async connectHardware(baudRate: number = 115200): Promise<{ success: boolean; message: string; portName?: string }> {
    if (!this.isWebSerialSupported()) {
      this.dispatchLog('sys', 'error', '00', 'WebSerial API not supported in this browser. Use Chrome, Edge, or Opera.');
      return { success: false, message: 'WebSerial is not supported in this browser environment.' };
    }

    try {
      // @ts-ignore
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate, dataBits: 8, stopBits: 1, parity: 'none' });

      this.dispatchLog('sys', 'ack', '0x7E 0x01', `STM32 Nucleo-F103RB Connected @ ${baudRate} baud 8N1`);
      this.textBuffer = '';
      this.startReading();

      return {
        success: true,
        message: `Connected to STM32 @ ${baudRate} bps`,
        portName: 'STM32 Nucleo-F103RB (USART2 CDC)',
      };
    } catch (err: any) {
      const msg = err?.message || 'User cancelled port selection';
      this.dispatchLog('sys', 'error', '0xFF', `Connection failed: ${msg}`);
      return { success: false, message: msg };
    }
  }

  public async disconnectHardware(): Promise<void> {
    this.isReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        // ignore
      }
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // ignore
      }
      this.port = null;
    }
    this.textBuffer = '';
    this.dispatchLog('sys', 'sys', '0x7E 0x00', 'STM32 Serial Link Terminated.');
  }

  private async startReading() {
    this.isReading = true;
    while (this.port && this.port.readable && this.isReading) {
      try {
        this.reader = this.port.readable.getReader();
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            this.handleIncomingBytes(value);
          }
        }
      } catch (err: any) {
        console.error('Serial read error:', err);
        break;
      } finally {
        if (this.reader) {
          try {
            this.reader.releaseLock();
          } catch {
            // ignore
          }
        }
      }
    }
  }

  private handleIncomingBytes(bytes: Uint8Array) {
    const textChunk = new TextDecoder().decode(bytes);
    this.textBuffer += textChunk;

    // Line-buffered frame parser: split by newline '\n'
    const lines = this.textBuffer.split('\n');
    // Keep incomplete trailing fragment in the buffer
    this.textBuffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const hexSnippet = Array.from(bytes.slice(0, 16))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      // Dispatch full telemetry log
      this.dispatchLog('rx', 'telemetry', hexSnippet, `RX: ${line.length > 80 ? line.slice(0, 80) + '...' : line}`);

      // Parse JSON from STM32 send_dashboard()
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          const json = JSON.parse(line);
          this.telemetryCallbacks.forEach((cb) => cb(json, hexSnippet));
        } catch (err) {
          console.warn('Malformed JSON packet from STM32:', line, err);
        }
      }
    }
  }

  public async sendCommand(cmd: string): Promise<boolean> {
    if (!this.port || !this.port.writable) {
      this.dispatchLog('tx', 'command', '', `[DEMO TX]: ${cmd}`);
      return true;
    }
    try {
      const writer = this.port.writable.getWriter();
      const encoder = new TextEncoder();
      const data = encoder.encode(cmd + '\n');
      await writer.write(data);
      writer.releaseLock();
      this.dispatchLog('tx', 'command', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '), `TX: ${cmd}`);
      return true;
    } catch (err: any) {
      this.dispatchLog('sys', 'error', '0xEE', `TX Failed: ${err.message}`);
      return false;
    }
  }
}

export const serialService = new SerialManager();
