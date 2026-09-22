## SIH 26058 — Adaptive Software-Defined Sonar Transmitter Payload

This guide documents the **5-pot prototype input configuration** used for environmental-input emulation.

The five 10 kΩ potentiometers represent:

1. Resolution / Penetration preference
2. Turbidity
3. Temperature
4. Depth
5. Salinity

All five potentiometers are wired as voltage dividers between **3.3 V and GND**. The **wiper** of each potentiometer goes to one STM32 ADC input.

---

## 1. Five-Pot Wiring Summary

| Potentiometer | Parameter | Value | One outer pin | Wiper | Other outer pin |
|---|---|---:|---|---|---|
| POT1 | RES-PEN | 10 kΩ | 3.3 V | PA0 / A0 | GND |
| POT2 | TURBIDITY | 10 kΩ | 3.3 V | PA1 / A1 | GND |
| POT3 | TEMP | 10 kΩ | 3.3 V | PA4 / A2 | GND |
| POT4 | DEPTH | 10 kΩ | 3.3 V | PB0 / A3 | GND |
| POT5 | SALINITY | 10 kΩ | 3.3 V | PC0 / A5 | GND |

> **Important:** The two outer terminals of every potentiometer form the 3.3 V–GND voltage divider. The center terminal is the ADC wiper.

---

## 2. Standard Potentiometer Connection

Each 10 kΩ potentiometer is wired in the same basic way:

```text
                 3.3 V
                   |
             +-----+-----+
             |   10 kΩ  |
             |    POT   |
             +-----+-----+
                   |
                  GND

                 WIPER
                   |
                   +-------- STM32 ADC INPUT
```

The wiper voltage varies approximately from **0 V to 3.3 V** as the knob is rotated.

---

## 3. POT1 — Resolution / Penetration

**Purpose:** Emulates the resolution-versus-penetration preference.

```text
POT1 — 10 kΩ

Outer pin 1  -> 3.3 V
Wiper        -> PA0 / A0
Outer pin 2  -> GND
```

**Label:** `RES-PEN`

---

## 4. POT2 — Turbidity

**Purpose:** Emulates the water turbidity/environmental condition.

```text
POT2 — 10 kΩ

Outer pin 1  -> 3.3 V
Wiper        -> PA1 / A1
Outer pin 2  -> GND
```

**Label:** `TURBIDITY`

---

## 5. POT3 — Temperature

**Purpose:** Emulates the temperature input during 5-pot prototype mode.

```text
POT3 — 10 kΩ

Outer pin 1  -> 3.3 V
Wiper        -> PA4 / A2
Outer pin 2  -> GND
```

**Label:** `TEMP`

---

## 6. POT4 — Depth

**Purpose:** Emulates operating depth.

```text
POT4 — 10 kΩ

Outer pin 1  -> 3.3 V
Wiper        -> PB0 / A3
Outer pin 2  -> GND
```

**Label:** `DEPTH`

---

## 7. POT5 — Salinity

**Purpose:** Emulates salinity/TDS during prototype mode.

```text
POT5 — 10 kΩ

Outer pin 1  -> 3.3 V
Wiper        -> PC0 / A5
Outer pin 2  -> GND
```

**Label:** `SALINITY`

---

## 8. Complete Five-Pot Wiring

```text
                         STM32 NUCLEO
                    +------------------+
                    |                  |
3.3 V --------------+------------------+-------------------+
                    |                  |                   |
GND ----------------+------------------+---------------+   |
                    |                  |               |   |
PA0 / A0 -----------+------------------+-----------+   |   |
PA1 / A1 -----------+------------------+---------+ |   |   |
PA4 / A2 -----------+------------------+-------+ | |   |   |
PB0 / A3 -----------+------------------+-----+ | | |   |   |
PC0 / A5 -----------+------------------+---+ | | | |   |   |
                    +------------------+   | | | | |   |   |
                                           | | | | |   |   |
             POT1 RES-PEN                  | | | | |   |   |
        3.3 V ----+                        | | | | |   |   |
                  | 10 kΩ                   | | | | |   |   |
                  +--- WIPER --------------+ | | | |   |   |
                  |      -> PA0 / A0         | | | |   |   |
        GND ------+                          | | | |   |   |
                                             | | | |   |   |
             POT2 TURBIDITY                  | | | |   |   |
        3.3 V ----+                          | | | |   |   |
                  | 10 kΩ                    | | | |   |   |
                  +--- WIPER ----------------+ | | |   |   |
                  |      -> PA1 / A1          | | |   |   |
        GND ------+                            | | |   |   |
                                               | | |   |   |
             POT3 TEMP                         | | |   |   |
        3.3 V ----+                            | | |   |   |
                  | 10 kΩ                      | | |   |   |
                  +--- WIPER ------------------+ | |   |   |
                  |      -> PA4 / A2            | | |   |   |
        GND ------+                              | |   |   |
                                                 | |   |   |
             POT4 DEPTH                          | |   |   |
        3.3 V ----+                              | |   |   |
                  | 10 kΩ                        | |   |   |
                  +--- WIPER --------------------+ |   |   |
                  |      -> PB0 / A3              | |   |   |
        GND ------+                                |   |   |
                                                   |   |   |
             POT5 SALINITY                         |   |   |
        3.3 V ----+                                |   |   |
                  | 10 kΩ                          |   |   |
                  +--- WIPER ----------------------+   |   |
                  |      -> PC0 / A5                   |   |
        GND ------+                                    |
```

For the physical prototype, use common **3.3 V** and **GND** rails and route each wiper separately to its assigned ADC pin.

---

## 9. STM32 ADC Mapping

| Parameter | STM32 Pin | Prototype Input |
|---|---|---|
| Resolution / Penetration | PA0 / A0 | POT1 |
| Turbidity | PA1 / A1 | POT2 |
| Temperature | PA4 / A2 | POT3 |
| Depth | PB0 / A3 | POT4 |
| Salinity | PC0 / A5 | POT5 |

Other relevant STM32 connections:

| STM32 pin | Function |
|---|---|
| PA6 | Current prototype waveform input / PWM path |
| PB5 | CD4053 A control |
| PC1 | FINAL WAVE self-monitor |
| 3V3 | Potentiometer supply |
| GND | Common ground |

**No 5 V rail is used for the five-pot prototype inputs.**

---

## 10. Electrical Principle

```text
POT POSITION
     |
     v
ANALOG VOLTAGE (0–3.3 V)
     |
     v
STM32 ADC
     |
     v
DIGITAL VALUE
     |
     v
ENVIRONMENTAL PARAMETER
     |
     v
ADAPTIVE TRANSMITTER DECISION
```

Each potentiometer acts as a variable voltage divider:

```text
3.3 V
  |
 10 kΩ POT
  |
 WIPER ---------> STM32 ADC
  |
 GND
```

---

## 11. MCP4921 DAC Wiring

The MCP4921 is the external 12-bit DAC used in the DAC-based waveform-generation path.

```text
STM32 NUCLEO              MCP4921 DAC
+-----------+             +-----------+
| PA5       | ----------> | SCK       |
| PA7       | ----------> | SDI/MOSI  |
| PB6       | ----------> | CS        |
| 3.3 V     | ----------> | VDD       |
| GND       | ----------> | VSS       |
+-----------+             |           |
                          | VOUT -----> R1 (1 kΩ)
                          +-----------+
                                      |
                                      v
                                    FILT1
                                      |
                                      v
                                    CD4053B
```

### MCP4921 Pin Connections

| MCP4921 pin/function | Connection |
|---|---|
| VDD | 3.3 V |
| VSS | GND |
| SCK | STM32 PA5 / SPI clock |
| SDI | STM32 PA7 / SPI MOSI |
| CS | STM32 PB6 / chip select |
| VOUT | R1 (1 kΩ) → FILT1 → CD4053B signal path |

Use a common ground between the STM32 and MCP4921.

The DAC signal path is:

```text
STM32 SPI
   |
   v
MCP4921 (12-bit DAC)
   |
   v
VOUT
   |
   v
R1 = 1 kΩ
   |
   v
FILT1
   |
   v
CD4053B
   |
   v
MCP6004 buffer
   |
   v
FINAL WAVE
```

This is the external-DAC waveform-generation configuration and is separate from the five-pot environmental-input wiring.

---
---

## 12. Final Five-Pot Pin Map

```text
POT1 RES-PEN    : 3.3 V -> 10 kΩ POT -> WIPER -> PA0/A0 -> GND
POT2 TURBIDITY  : 3.3 V -> 10 kΩ POT -> WIPER -> PA1/A1 -> GND
POT3 TEMP       : 3.3 V -> 10 kΩ POT -> WIPER -> PA4/A2 -> GND
POT4 DEPTH      : 3.3 V -> 10 kΩ POT -> WIPER -> PB0/A3 -> GND
POT5 SALINITY   : 3.3 V -> 10 kΩ POT -> WIPER -> PC0/A5 -> GND
```

**This is the complete 5-pot environmental-emulation wiring configuration for the AquaChirp prototype.**
