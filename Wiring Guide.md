# TEAM KESTREL — SIH26058
# WIRING GUIDE

## Project

**Team:** Kestrel  
**SIH Problem Statement:** 26058  
**System:** Adaptive Software-Defined Sonar Transmitter Payload for AUVs

This document is the hardware wiring reference for the SIH26058 prototype.

> **Important:** Use the verified project wiring and component datasheets as the electrical source of truth. Do not add or infer connections that are not documented.

---

# 1. STM32 POWER RAILS

| STM32 connection | Connect to |
|---|---|
| 3V3 | 3.3 V rail |
| GND | GND rail |

Keep the 3.3 V and GND rails clearly identified.

---

# 2. MCP6004

## Power

```text
MCP6004 Pin 4  → 3.3 V
MCP6004 Pin 11 → GND
```

Place a **100 nF decoupling capacitor** directly between the supply rails:

```text
Pin 4 / 3.3 V
      │
    100 nF
      │
Pin 11 / GND
```

## Channel A — Buffer 1

```text
FILT1 → Pin 3 (+)

Pin 1 (OUT) ───── Pin 2 (−)
```

Therefore:

```text
FILT1
  │
  ▼
Pin 3 (+)
Pin 1 (OUT)
  │
  └──────── Pin 2 (−)
```

The output of Channel A is the **BUFFER1** node.

## Channel B — Buffer 2

```text
FILT2 → Pin 5 (+)

Pin 7 (OUT) ───── Pin 6 (−)
```

The output of Channel B is:

```text
FINAL WAVE = MCP6004 Pin 7
```

## Unused Channel C

```text
Pin 10 (+) → GND
Pin 8 (OUT) ───── Pin 9 (−)
```

## Unused Channel D

```text
Pin 12 (+) → GND
Pin 14 (OUT) ───── Pin 13 (−)
```

---

# 3. CD4053B

## Power

```text
Pin 16 (VDD) → 3.3 V
Pin 8  (VSS) → GND
Pin 7  (VEE) → GND
Pin 6  (INH) → GND
```

Place a **100 nF decoupling capacitor** between:

```text
Pin 16 / 3.3 V
      │
    100 nF
      │
Pin 8 / GND
```

## Analog channel A

```text
Pin 14 (COM) ← FILT1
```

Filter paths:

```text
Pin 12 (AX) ── 100 nF ── GND

Pin 13 (AY) ── 10 nF ─── GND
```

## Filter selection

```text
Pin 11 (A) ← STM32 PB5 / D4
```

The firmware controls the selected filter path through PB5.

---

# 4. FIRST FILTER STAGE

The current prototype signal enters from the STM32 waveform output:

```text
STM32 PA6 / D12
       │
      1 kΩ
       │
     FILT1
```

The **FILT1** node connects to:

```text
FILT1
  ├────────→ CD4053B Pin 14 (COM)
  │
  └────────→ MCP6004 Pin 3 (+)
```

---

# 5. SECOND FILTER STAGE

The first MCP6004 buffer output feeds the second RC stage:

```text
MCP6004 Pin 1
     │
    1 kΩ
     │
   FILT2
     │
    10 nF
     │
    GND
```

The FILT2 node also connects to:

```text
FILT2 → MCP6004 Pin 5 (+)
```

MCP6004 Channel B is configured as a voltage follower:

```text
Pin 7 (OUT) ───── Pin 6 (−)
```

Therefore:

```text
MCP6004 Pin 7 = FINAL WAVE
```

---

# 6. FINAL WAVE SELF-MONITOR

The final waveform is monitored by the STM32:

```text
MCP6004 Pin 7
     │
    10 kΩ
     │
 WAVE_MON
     │
     ├────────→ STM32 PC1 / A4
     │
    1 nF
     │
    GND
```

The 10 kΩ resistor and 1 nF capacitor form the self-monitor interface.

---

# 7. COMPLETE CURRENT SIGNAL PATH

```text
STM32 PA6 / D12
       │
      1 kΩ
       │
     FILT1
       │
       ├──────────────→ CD4053B Pin 14
       │                     │
       │              ┌──────┴──────┐
       │              │             │
       │            100 nF        10 nF
       │              │             │
       │             GND           GND
       │
       ▼
MCP6004 Channel A
Pin 3 (+)
Pin 1 ↔ Pin 2
       │
       ▼
      1 kΩ
       │
     FILT2
       │
      10 nF
       │
      GND
       │
       ▼
MCP6004 Channel B
Pin 5 (+)
Pin 7 ↔ Pin 6
       │
       ▼
  FINAL WAVE
       │
       ├────────→ DSO
       │
       │
      10 kΩ
       │
    WAVE_MON
       │
       ├────────→ PC1 / A4
       │
      1 nF
       │
      GND
```

---

# 8. SENSOR INTERFACE CONNECTORS

The field-sensor architecture uses removable **3-pin connectors** so external sensors can be plugged into the prototype.

Use the following connector convention:

```text
Pin 1 → VCC
Pin 2 → GND
Pin 3 → SIGNAL
```

## J1 — Temperature

```text
J1
Pin 1 → sensor supply
Pin 2 → GND
Pin 3 → temperature signal/data
```

Sensor:

**DS18B20**

The exact DS18B20 pull-up and signal wiring must follow the verified sensor-interface design and datasheet.

---

## J2 — Turbidity

```text
J2
Pin 1 → sensor supply
Pin 2 → GND
Pin 3 → analog signal
```

Sensor:

**SEN0189 Turbidity Sensor**

If the sensor output is above the STM32 ADC range, use the verified resistor-divider interface before the ADC input.

---

## J3 — TDS / Salinity

```text
J3
Pin 1 → sensor supply
Pin 2 → GND
Pin 3 → analog signal
```

Sensor:

**TDS / Salinity sensor**

Use the verified sensor-module supply and signal requirements from the corresponding datasheet.

---

# 9. SENSOR CONNECTOR CONCEPT

The physical architecture is:

```text
                 TEAM KESTREL
                 SIH26058
                     │
        ┌────────────┼────────────┐
        │            │            │
       J1           J2           J3
       │            │            │
     TEMP        TURBIDITY       TDS
       │            │            │
   DS18B20       SEN0189      TDS SENSOR
```

The connectors are intended to make the sensor interfaces removable and replaceable during prototype testing.

---

# 10. STM32 INTERFACE MAP

| STM32 pin | Function |
|---|---|
| PA6 / D12 | Current prototype waveform output |
| PB5 / D4 | CD4053 filter-select control |
| PC1 / A4 | FINAL WAVE self-monitor |
| 3V3 | Logic/sensor supply where applicable |
| GND | Common ground |

Sensor ADC assignments must follow the currently verified firmware and wiring documentation.

---

# 11. MCP4921 — ROADMAP / SEPARATE DAC ARCHITECTURE

The MCP4921 belongs to the **separate DAC-based architecture** and must not be confused with the current PA6/PWM prototype path unless that hardware and firmware are actually implemented.

When the MCP4921 architecture is used, the intended signal concept is:

```text
STM32 SPI
   │
   ▼
MCP4921
   │
  VOUT
   │
   ▼
R1 / Filter Input
   │
   ▼
FILT1
   │
   ▼
CD4053B
   │
   ▼
MCP6004
   │
   ▼
FINAL WAVE
```

MCP4921 SPI connections must be taken from the verified schematic/firmware for the specific hardware revision.

---

# 12. IMPORTANT HARDWARE EXCLUSIONS

The current wiring guide does **not** include:

```text
❌ Speaker
❌ BC547 speaker driver
❌ Unverified external circuitry
❌ Unverified power rails
```

Do not add these components to the prototype layout unless they are explicitly included in a later verified hardware revision.

---

# 13. WIRING VERIFICATION CHECKLIST

Before using the layout in a presentation or physical build, verify:

- [ ] STM32 3.3 V rail is connected
- [ ] Common GND is connected
- [ ] MCP6004 Pin 4 → 3.3 V
- [ ] MCP6004 Pin 11 → GND
- [ ] MCP6004 100 nF decoupling is actually connected
- [ ] MCP6004 Channel A is a follower
- [ ] MCP6004 Channel B is a follower
- [ ] Unused MCP6004 channels are terminated
- [ ] CD4053 Pin 16 → 3.3 V
- [ ] CD4053 Pin 8 → GND
- [ ] CD4053 Pin 7 → GND
- [ ] CD4053 Pin 6 → GND
- [ ] CD4053 100 nF decoupling is actually connected
- [ ] CD4053 Pin 14 → FILT1
- [ ] CD4053 Pin 12 → 100 nF → GND
- [ ] CD4053 Pin 13 → 10 nF → GND
- [ ] CD4053 Pin 11 → PB5 / D4
- [ ] PA6 → 1 kΩ → FILT1
- [ ] FILT1 → MCP6004 Pin 3
- [ ] MCP6004 Pin 1 → 1 kΩ → FILT2
- [ ] FILT2 → 10 nF → GND
- [ ] FILT2 → MCP6004 Pin 5
- [ ] MCP6004 Pin 7 → FINAL WAVE
- [ ] FINAL WAVE → 10 kΩ → WAVE_MON
- [ ] WAVE_MON → PC1 / A4
- [ ] WAVE_MON → 1 nF → GND
- [ ] Sensor connector pin assignments match the actual sensor datasheets
- [ ] No unverified component has been added

---

# 14. Reference Signal-Chain Summary

```text
PA6 / D12
   │
  1 kΩ
   │
 FILT1
   │
   ├── CD4053B
   │
   └── MCP6004 A
          │
         1 kΩ
          │
        FILT2
          │
        MCP6004 B
          │
          ▼
      FINAL WAVE
          │
          ├── DSO
          │
          └── PC1 self-monitor
```

---

## Team Kestrel — SIH26058

**Hardware Wiring Guide**

This document is intended to accompany the verified hardware layout, firmware pin map, component datasheets, and prototype documentation.
