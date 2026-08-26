# 🌊 AquaChirp — Software-Defined Sonar Transmitter & Acoustic Edge Intelligence Platform

[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![STM32](https://img.shields.io/badge/Hardware-STM32F103RB-03234B?logo=stmicroelectronics&logoColor=white)](https://www.st.com/)
[![WebSerial](https://img.shields.io/badge/Protocol-WebSerial_API-0284C7?logo=googlechrome&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

**AquaChirp** is an autonomous, software-defined sonar (SDS) transmission and telemetry dashboard. It couples real-time physical ocean acoustics modeling (Mackenzie sound speed, Francois-Garrison chemical absorption) with STM32 embedded edge microcontrollers via the browser's native **WebSerial API** to dynamically synthesize optimized acoustic chirps, Barker codes, and windowed pulses in under **8 milliseconds**.

---

## 🌟 Key Capabilities

- **⚡ Real-Time Adaptive Waveform Synthesis**: Dynamically optimizes center frequency ($f_c$), chirp bandwidth ($B$), pulse length ($\tau$), and windowing envelopes based on environmental telemetry.
- **🛰️ STM32 Hardware In-the-Loop (HIL)**: Connects directly to an **STM32 Nucleo-F103RB** over USB CDC USART (115,200 baud) with circular DMA streaming.
- **🔬 Quad DSP Visualizer Suite**:
  - Continuous traveling waveform oscilloscope ($60\text{ FPS}$ hardware-accelerated vector canvas).
  - 32-bin real-time FFT spectrum analyzer with peak frequency tracking.
  - Interactive waterfall spectrogram history.
  - Matched filter pulse compression & autocorrelation sidelobe analyzer ($\text{PSLR} > 22.3\text{ dB}$).
- **🎯 360° Tactical Sonar Radar**: Polar acoustic beamforming display with multipath ray-tracing reflection visualization.
- **🎛️ Dual Operating Modes**:
  - **Live Hardware Mode**: Driven by physical ADC potentiometers and ADC loopback from the STM32.
  - **Simulation / Demo Mode**: Built-in hydrodynamic physics generator simulating varied oceanic conditions (Littoral Turbid, Deep Arctic Trench, Coastal Thermocline).

---

## 📐 Acoustic Physics & Mathematical Rigor

### 1. Mackenzie (1981) Nine-Term Sound Speed Equation
$$c(T, S, D) = 1448.96 + 4.591T - 0.05304T^2 + 2.374\times 10^{-4}T^3 + 1.340(S - 35) + 1.630\times 10^{-2}D + 1.675\times 10^{-7}D^2 - 1.025\times 10^{-2}T(S - 35) - 7.139\times 10^{-13}TD^3$$
*where $T$ is temperature in $^\circ\text{C}$, $S$ is salinity in $\text{PSU}$, and $D$ is depth in meters.*

### 2. Francois-Garrison Multi-Frequency Chemical Absorption
$$\alpha(f) = A_1 P_1 \frac{f_1 f^2}{f_1^2 + f^2} + A_2 P_2 \frac{f_2 f^2}{f_2^2 + f^2} + A_3 P_3 f^2 \quad [\text{dB/km}]$$
*Accounts for Boric Acid relaxation ($f_1 \approx 1\text{ kHz}$), Magnesium Sulfate relaxation ($f_2 \approx 100\text{ kHz}$), and pure water viscous attenuation.*

### 3. Range Resolution & Pulse Compression Gain
$$\Delta R = \frac{c}{2B}, \qquad G_p = 10 \log_{10}(B \cdot \tau) \quad [\text{dB}]$$

---

## 🔌 STM32 Hardware Architecture & Pinout

Designed for **STM32F103RBT6 (Nucleo-F103RB)** operating at $64\text{ MHz}$ core clock with Timer 3 PWM DAC DMA:

| Pin | Function / Peripheral | Physical Connection | Description |
| :--- | :--- | :--- | :--- |
| **PA0** | `ADC1_IN0` | Potentiometer 1 | Water Depth Sensor ($0 - 200\text{ m}$) |
| **PA1** | `ADC1_IN1` | Potentiometer 2 | Water Turbidity / Suspended Solids ($0 - 100\%$) |
| **PA4** | `ADC1_IN4` | Potentiometer 3 | Ocean Temperature ($5 - 35^\circ\text{C}$) |
| **PB0** | `ADC1_IN8` | Potentiometer 4 | Resolution vs. Penetration Tuning Knob |
| **PC0** | `ADC1_IN10` | Potentiometer 5 | Water Salinity ($0 - 40\text{ PSU}$) |
| **PA6** | `TIM3_CH1` (PWM DMA) | Analog Low-Pass Filter | Sonar Waveform Output ($100\text{ kHz}$ carrier) |
| **PC1** | `ADC2_IN11` | Transducer Loopback | Real-time Self-Monitor ADC ($64\text{ samples}$) |
| **PB5** | `GPIO Output` | Analog MUX Select | Dynamic Hardware Filter Adaptation ($10\text{nF} / 100\text{nF}$) |
| **PB6** | `GPIO Output` | Analog MUX Enable | Transducer Bridge Output Enable |
| **PA2 / PA3** | `USART2 TX / RX` | ST-LINK USB VCP | Telemetry Serial Stream @ $115,200\text{ baud}$ |
| **PC13** | `GPIO Output` | User LED | DMA Loop Heartbeat Indicator |

---

## 📡 Serial Telemetry Protocol (JSON over USB CDC)

The STM32 transmits line-delimited JSON frames at $10\text{ Hz}$ over Virtual COM Port:

```json
{
  "depth": 65.0,
  "turbidity": 0.42,
  "temperature": 21.0,
  "res_pen": 0.50,
  "salinity": 34.5,
  "sound_speed": 1522.4,
  "absorption": 1.20,
  "ph": 8.1,
  "snr": 18.5,
  "center_freq": 2400.0,
  "bandwidth": 1522.4,
  "duration": 16.3,
  "amplitude": 0.61,
  "waveform_type": 1,
  "window_type": 0,
  "probe_active": 0,
  "probe_winner": 1,
  "probe_f1": 2160.0,
  "probe_f2": 2400.0,
  "probe_f3": 2640.0,
  "probe_s1": 45.2,
  "probe_s2": 68.4,
  "probe_s3": 51.1,
  "adc_samples": [320, 345, 390, 420, 380, 310, 260, 240, 280, 320]
}
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- Google Chrome, Microsoft Edge, or any Chromium browser supporting the **WebSerial API**

### 1. Clone the Repository
```bash
git clone https://github.com/D-Tharun/aquachirp-sonar-transmitter.git
cd aquachirp-sonar-transmitter
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production Deployment
```bash
npm run build
```

---

## 🚢 Continuous Deployment & Hosting

This repository is configured for zero-configuration 1-click deployment on **Vercel** or **Netlify**:

1. Push this repository to GitHub.
2. Link the repository to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. The platform will automatically build and deploy the application on every `git push` or merged Pull Request.
4. Access the live HTTPS dashboard and click **CONNECT USB** to link your physical STM32 hardware!

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
