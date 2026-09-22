# KESTREL — SIH 26058
## Complete Project Architecture Flow

**Project:** Development of a Low-Power, Real-Time Adaptive Software-Defined Sonar Transmitter Payload for Autonomous Underwater Vehicles (AUVs)

---

## 1. Complete Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│              CONTROLLED ENVIRONMENTAL INPUTS                       │
│                                                                     │
│  Depth │ Temperature │ Turbidity │ Salinity │ Resolution/Input     │
│                                                                     │
│  Current prototype: potentiometers used as input emulators         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DATA ACQUISITION                                │
│                                                                     │
│                 STM32 Nucleo F103RB + ADC                           │
│                                                                     │
│       Analog input voltages → Digital environmental values          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 ENVIRONMENT ANALYSIS / ESTIMATION                  │
│                                                                     │
│  Interpret the current environmental state and determine the       │
│  required acoustic operating condition.                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ADAPTIVE DECISION                              │
│                                                                     │
│  Environmental state → waveform selection → parameter selection    │
│                                                                     │
│  Parameters:                                                        │
│  • Centre / carrier frequency                                       │
│  • Bandwidth                                                        │
│  • Pulse duration                                                   │
│  • Amplitude / signal level                                         │
│  • Modulation / coding                                              │
│  • Digital window                                                   │
│  • PRF / timing parameters                                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
┌──────────────────────────┐       ┌──────────────────────────────────┐
│     PC DASHBOARD         │       │       WAVEFORM GENERATOR         │
│                          │       │                                  │
│ • Environmental values  │       │ • LUT / mathematical synthesis   │
│ • Selected waveform      │       │ • Phase accumulator               │
│ • Commanded parameters   │       │ • Waveform-specific generation   │
│ • Decision information   │       │ • Digital windowing              │
└──────────────────────────┘       └────────────────┬─────────────────┘
                                                    │
                                                    ▼
                                      ┌──────────────────────────────┐
                                      │       TIMER + DMA            │
                                      │                              │
                                      │ Timer → sample timing        │
                                      │ DMA   → sample transfer      │
                                      │                              │
                                      │ Reduces continuous CPU      │
                                      │ involvement during streaming │
                                      └───────────────┬──────────────┘
                                                      │
                                                      ▼
                                      ┌──────────────────────────────┐
                                      │        MCP4921 DAC           │
                                      │                              │
                                      │ Digital samples → analog     │
                                      │ voltage waveform              │
                                      └───────────────┬──────────────┘
                                                      │
                                                      ▼
                                      ┌──────────────────────────────┐
                                      │      ANALOG CONDITIONING     │
                                      │                              │
                                      │ • MCP6004 buffer/amplifier   │
                                      │ • Analog low-pass filter     │
                                      │ • Signal conditioning        │
                                      └───────────────┬──────────────┘
                                                      │
                                                      ▼
                                      ┌──────────────────────────────┐
                                      │       PHYSICAL OUTPUT        │
                                      │        WAVEFORM NODE         │
                                      └───────────────┬──────────────┘
                                                      │
                                                      ▼
                                      ┌──────────────────────────────┐
                                      │          VERIFY              │
                                      │                              │
                                      │ DSO time-domain measurement  │
                                      │ DSO FFT / spectrum analysis  │
                                      └───────────────┬──────────────┘
                                                      │
                                                      ▼
                                      ┌──────────────────────────────┐
                                      │     VALIDATION / FEEDBACK     │
                                      │                              │
                                      │ Compare commanded and        │
                                      │ measured waveform behaviour  │
                                      └───────────────┬──────────────┘
                                                      │
                                                      └──────► Next
                                                              input state
```

---

## 2. High-Level Architecture

```text
        ┌─────────┐
        │  SENSE  │
        └────┬────┘
             ↓
        ┌─────────┐
        │ ACQUIRE │
        └────┬────┘
             ↓
        ┌─────────┐
        │ ANALYSE │
        └────┬────┘
             ↓
        ┌─────────┐
        │  ADAPT  │
        └────┬────┘
             ↓
        ┌─────────┐
        │GENERATE │
        └────┬────┘
             ↓
        ┌─────────┐
        │   DAC   │
        └────┬────┘
             ↓
        ┌──────────────┐
        │   ANALOG     │
        │ CONDITIONING │
        └──────┬───────┘
               ↓
        ┌─────────┐
        │ VERIFY  │
        └────┬────┘
             ↓
          DSO + FFT
```

---

## 3. Environmental Input Layer

The current prototype uses five controlled potentiometer inputs as environmental-condition emulators.

```text
Depth
Temperature
Turbidity
Salinity
Resolution / related input
       │
       ▼
Analog voltage
       │
       ▼
STM32 ADC
       │
       ▼
Digital input values
```

These potentiometers should be described as **controlled environmental inputs/emulators**, not as functioning underwater sensors.

---

## 4. Embedded Controller

### STM32 Nucleo F103RB

The STM32 performs the central embedded processing:

1. Reads the ADC inputs.
2. Interprets the current environmental state.
3. Selects the adaptive waveform mode.
4. Determines waveform parameters.
5. Generates waveform samples.
6. Controls real-time sample streaming.
7. Interfaces with the external DAC.
8. Provides system information to the monitoring/dashboard layer.

---

## 5. Adaptive Decision Layer

The core project relationship is:

```text
Changing environmental inputs
             ↓
     Environment analysis
             ↓
       Adaptive decision
             ↓
    Waveform + parameters
```

The waveform modes demonstrated in the prototype are:

```text
                 ┌───────────┐
                 │    CW     │
                 └───────────┘

                 ┌───────────┐
                 │    LFM    │
                 └───────────┘

                 ┌───────────┐
                 │ Geometric │
                 │   Sweep   │
                 └───────────┘

                 ┌───────────┐
                 │ Barker-13 │
                 └───────────┘
```

---

## 6. Waveform Generation

The waveform engine uses mathematical synthesis on the STM32.

### General generation chain

```text
Waveform parameters
       ↓
Mathematical synthesis
       ↓
LUT / phase control
       ↓
Digital waveform samples
       ↓
Waveform buffer
```

### CW

```text
Constant phase increment
        ↓
Constant instantaneous frequency
        ↓
CW waveform
```

### LFM

```text
Changing phase increment
        ↓
Changing instantaneous frequency
        ↓
LFM chirp
```

### Geometric Sweep

```text
Time-varying frequency
according to implemented sweep relationship
        ↓
Geometric sweep waveform
```

### Barker-13

```text
Carrier
  +
Barker phase/sign sequence
  ↓
Phase-coded waveform
```

---

## 7. Digital Windowing

Where configured:

```text
Generated waveform
        ↓
Digital window
        ↓
Windowed waveform samples
        ↓
DAC streaming
```

The demonstrated configurations include windowing such as Hamming and Blackman.

---

## 8. Timer + DMA Architecture

The timer and DMA are important to the real-time hardware architecture.

```text
                WAVEFORM BUFFER
                       │
                       ▼
                     DMA
                       │
                       ▼
                  MCP4921 DAC
                       │
                       ▼
                Analog waveform

Hardware Timer
      │
      └── controls sample-update timing
```

### Hardware Timer

Controls when waveform samples are updated.

### DMA

Moves waveform samples toward the DAC without requiring the CPU to manually handle every individual sample transfer.

### CPU

Handles control logic, parameter processing and waveform preparation while hardware peripherals handle the repetitive streaming operation.

---

## 9. DAC and Analog Signal Chain

```text
STM32 waveform data
        ↓
      DMA
        ↓
   MCP4921 DAC
        ↓
   Analog voltage
        ↓
 MCP6004 / buffer
        ↓
 Analog low-pass filter
        ↓
 Conditioned analog waveform
        ↓
 Physical output node
```

---

## 10. Physical Verification

The output is physically verified using a Digital Storage Oscilloscope.

### Time-domain verification

```text
Physical analog output
        ↓
        DSO
        ↓
• Waveform shape
• Period
• Local frequency
• Pulse behaviour
```

### Frequency-domain verification

```text
Physical analog output
        ↓
      DSO FFT
        ↓
• Dominant frequency
• Spectrum
• Frequency-domain behaviour
```

The terminology should distinguish between:

- **Commanded value** — requested by the controller.
- **Measured value** — observed on the DSO.

---

## 11. PC Dashboard

The dashboard is a monitoring/presentation layer.

```text
                 STM32
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
   PC Dashboard       Waveform Engine
          │                 │
          │                 ▼
          │              DMA/DAC
          │                 │
          ▼                 ▼
 Selected waveform      Physical output
 Parameters                  │
 Decision state               ▼
                          DSO / FFT
```

The dashboard displays system state and commanded parameters; the physical analog waveform is generated by the embedded hardware and DAC/analog chain.

---

## 12. Complete Signal Path

```text
Environmental inputs
        ↓
STM32 ADC
        ↓
Environment analysis
        ↓
Adaptive decision
        ↓
Waveform selection
        ↓
Parameter generation
        ↓
Waveform synthesis
        ↓
Digital windowing
        ↓
Waveform buffer
        ↓
Hardware Timer + DMA
        ↓
MCP4921 DAC
        ↓
MCP6004 / analog conditioning
        ↓
Analog low-pass filter
        ↓
Physical waveform output
        ↓
DSO
   ┌────┴────┐
   ↓         ↓
Time       FFT
domain     spectrum
```

---

## 13. Closed Adaptive Loop

```text
        ┌───────────────────────────┐
        │ ENVIRONMENTAL INPUT       │
        │ Controlled / emulated     │
        └─────────────┬─────────────┘
                      ↓
        ┌───────────────────────────┐
        │ ACQUIRE                    │
        │ STM32 ADC                  │
        └─────────────┬─────────────┘
                      ↓
        ┌───────────────────────────┐
        │ ANALYSE                    │
        │ Environmental state        │
        └─────────────┬─────────────┘
                      ↓
        ┌───────────────────────────┐
        │ ADAPT                      │
        │ Waveform + parameters      │
        └─────────────┬─────────────┘
                      ↓
        ┌───────────────────────────┐
        │ GENERATE                   │
        │ Mathematical synthesis     │
        └─────────────┬─────────────┘
                      ↓
        ┌───────────────────────────┐
        │ DAC + ANALOG CONDITIONING │
        └─────────────┬─────────────┘
                      ↓
        ┌───────────────────────────┐
        │ PHYSICAL OUTPUT            │
        └─────────────┬─────────────┘
                      ↓
        ┌───────────────────────────┐
        │ VERIFY                     │
        │ DSO + FFT                  │
        └─────────────┬─────────────┘
                      │
                      └──────────────► Next environmental state
```

---

## 14. Power Architecture

The demonstrated power measurement applies to the **signal-generation electronics**.

```text
3.3 V supply
    ↓
Signal-generation electronics
    ↓
Measured current ≈ 2.4 mA
    ↓
Power ≈ 8 mW
```

This measurement does **not** represent:

- Total AUV payload power.
- Acoustic transmit power.
- Power consumption of a completed power amplifier.
- Transducer power.

The current prototype does not include the final power-amplifier and transducer stage.

---

## 15. Mechanical Payload Concept

The CAD concept provides a possible mechanical package for the electronics.

```text
        Streamlined cylindrical payload
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
 Sensor openings        Side access ports
        │                       │
        │                Potentiometer access
        │
        └───────────┬───────────┘
                    ↓
             Electronics/
             service region
```

The current CAD is a concept design and is not a final pressure-rated or waterproof housing.

---

## 16. Current Prototype Scope

### Demonstrated

- STM32 Nucleo F103RB
- Controlled environmental-input emulation
- Adaptive waveform selection
- CW
- LFM
- Geometric sweep
- Barker-13 implementation
- MCP4921 DAC
- Timer/DMA streaming architecture
- Analog conditioning
- Physical DSO verification
- FFT/spectrum observation
- Signal-generation power measurement
- Mechanical CAD concept

### Future Development

- Real environmental sensors
- Dedicated PCB
- Higher-frequency implementation
- Power amplifier
- Transducer integration
- Final waterproof / pressure-rated payload enclosure
- End-to-end underwater acoustic testing

---

## 17. Final One-Line Architecture

> **ENVIRONMENT INPUT → ADC → ANALYSE → ADAPT → WAVEFORM GENERATION → TIMER + DMA → MCP4921 DAC → ANALOG CONDITIONING → PHYSICAL OUTPUT → DSO / FFT VERIFY**

---

## 18. Five-Word Project Story

> **SENSE → ANALYSE → ADAPT → GENERATE → VERIFY**

This is the simplest high-level representation of the KESTREL adaptive sonar transmitter architecture.
