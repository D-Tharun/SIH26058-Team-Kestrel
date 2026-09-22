

#include "main.h"
#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdint.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

#define PWM_MAX                 639U
#define PWM_MID                 320U
#define PWM_SWING_MAX           280U

#define SAMPLE_RATE_HZ          100000U
#define WAVE_BUF_SIZE           512U
#define WAVE_HALF               256U

#define SINE_LUT_SIZE           1024U
#define WINDOW_LUT_SIZE         256U

#define MIN_FREQ_HZ             500.0f
#define MAX_FREQ_HZ             9000.0f

#define SENSOR_PERIOD_MS        100U
#define TELEMETRY_PERIOD_MS     100U

#define TELEMETRY_ADC_SAMPLES   64U

#define PHASE_TWO_PI            4294967296.0

typedef struct
{
    uint32_t inc_start;
    uint32_t inc_end;
    uint32_t pulse_samples;
    uint16_t swing;
    uint8_t mod_type;
    uint8_t window_type;
} wave_cfg_t;

UART_HandleTypeDef huart2;
ADC_HandleTypeDef hadc1;
ADC_HandleTypeDef hadc2;
TIM_HandleTypeDef htim3;
DMA_HandleTypeDef hdma_tim3_ch1_trig;

static volatile uint16_t wave_buf[WAVE_BUF_SIZE];

static int16_t sine_lut[SINE_LUT_SIZE];
static uint16_t window_lut[3][WINDOW_LUT_SIZE];

static volatile uint32_t phase_acc_q32 = 0U;
static volatile uint32_t pulse_sample = 0U;

static volatile wave_cfg_t active_cfg;
static wave_cfg_t pending_cfg;
static volatile uint8_t config_pending = 0U;

typedef struct
{
    float depth;
    float turbidity;
    float temperature;
    float res_pen;
    float salinity;

    float sound_speed;
    float absorption;
    float snr;
    float center_freq;
    float bandwidth;
    float duration;
    float amplitude;

    int mod_type;
    int window_type;

    float probe_freqs[3];
    float probe_snr[3];
    int probe_winner;
    int probe_active;
} env_params_t;

static env_params_t env;

static volatile uint16_t pot_adc[5] = {0};

static uint16_t mon_samples[TELEMETRY_ADC_SAMPLES];
static uint16_t mon_min = 4095U;
static uint16_t mon_max = 0U;
static uint32_t mon_sum = 0U;

static char uart_buf[4096];

void SystemClock_Config(void);

static void MX_GPIO_Init(void);
static void MX_USART2_UART_Init(void);
static void MX_ADC1_Init(void);
static void MX_ADC2_Init(void);
static void MX_TIM3_Init(void);
static void MX_DMA_Init(void);

static float clampf_local(float x, float lo, float hi);

static void init_luts(void);
static uint32_t hz_to_phase_inc(float hz);
static uint16_t window_q15(uint8_t type, uint32_t n);

static uint16_t read_adc_channel(uint32_t channel);
static void read_pots(void);
static void compute_environment(void);

static void set_mux_filter(int heavy);

static void commit_wave_config(void);
static void apply_pending_config_if_ready(void);

static void generate_wave_half(uint16_t *buf, uint16_t count);
static void initialize_wave_buffer(void);

static void read_self_monitor(void);
static void send_dashboard(void);

static float clampf_local(float x, float lo, float hi)
{
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}

static uint32_t hz_to_phase_inc(float hz)
{
    double inc =
        ((double)hz * PHASE_TWO_PI) /
        (double)SAMPLE_RATE_HZ;

    if (inc <= 0.0)
        return 0U;

    if (inc >= 4294967295.0)
        return 0xFFFFFFFFU;

    return (uint32_t)(inc + 0.5);
}

static void init_luts(void)
{
    for (uint32_t i = 0U; i < SINE_LUT_SIZE; ++i) {
        float a =
            (2.0f * (float)M_PI * (float)i) /
            (float)SINE_LUT_SIZE;

        sine_lut[i] =
            (int16_t)lroundf(
                sinf(a) * 32767.0f);
    }

    for (uint32_t i = 0U; i < WINDOW_LUT_SIZE; ++i) {
        float n =
            (float)i /
            (float)(WINDOW_LUT_SIZE - 1U);

        float hamming =
            0.54f -
            0.46f *
            cosf(2.0f * (float)M_PI * n);

        float hann =
            0.50f -
            0.50f *
            cosf(2.0f * (float)M_PI * n);

        float blackman =
            0.42f -
            0.50f *
            cosf(2.0f * (float)M_PI * n) +
            0.08f *
            cosf(4.0f * (float)M_PI * n);

        hamming = clampf_local(hamming, 0.0f, 1.0f);
        hann = clampf_local(hann, 0.0f, 1.0f);
        blackman = clampf_local(blackman, 0.0f, 1.0f);

        window_lut[0][i] =
            (uint16_t)lroundf(hamming * 32767.0f);

        window_lut[1][i] =
            (uint16_t)lroundf(hann * 32767.0f);

        window_lut[2][i] =
            (uint16_t)lroundf(blackman * 32767.0f);
    }
}

static uint16_t read_adc_channel(uint32_t channel)
{
    ADC_ChannelConfTypeDef cfg = {0};

    cfg.Channel = channel;
    cfg.Rank = 1;
    cfg.SamplingTime = ADC_SAMPLETIME_55CYCLES_5;

    if (HAL_ADC_ConfigChannel(&hadc1, &cfg) != HAL_OK)
        return 0U;

    if (HAL_ADC_Start(&hadc1) != HAL_OK)
        return 0U;

    if (HAL_ADC_PollForConversion(&hadc1, 10U) != HAL_OK) {
        HAL_ADC_Stop(&hadc1);
        return 0U;
    }

    uint16_t val =
        (uint16_t)HAL_ADC_GetValue(&hadc1);

    HAL_ADC_Stop(&hadc1);

    return val;
}

static void read_pots(void)
{

    pot_adc[0] =
        read_adc_channel(ADC_CHANNEL_0);   

    pot_adc[1] =
        read_adc_channel(ADC_CHANNEL_1);   

    pot_adc[2] =
        read_adc_channel(ADC_CHANNEL_4);   

    pot_adc[3] =
        read_adc_channel(ADC_CHANNEL_8);   

    pot_adc[4] =
        read_adc_channel(ADC_CHANNEL_10);  

    env.depth =
        ((float)pot_adc[3] / 4095.0f) * 200.0f;

    env.turbidity =
        1.0f -
        ((float)pot_adc[1] / 4095.0f);

    env.temperature =
        5.0f +
        ((float)pot_adc[2] / 4095.0f) * 30.0f;

    env.res_pen =
        (float)pot_adc[0] / 4095.0f;

    env.salinity =
        ((float)pot_adc[4] / 4095.0f) * 40.0f;
}

static void compute_environment(void)
{
    float T = env.temperature;
    float S = env.salinity;
    float D = env.depth;

    env.sound_speed =
          1448.96f
        + 4.591f * T
        - 0.05304f * T * T
        + 1.340f * (S - 35.0f)
        + 0.0163f * D
        + 1.675e-7f * D * D
        - 7.139e-13f * D * D * D;

    float two_way_km =
        (2.0f * D) / 1000.0f;

    float best_freq = 500.0f;
    const float max_loss_db = 25.0f;

    for (float f = 500.0f;
         f <= 10000.0f;
         f += 100.0f) {

        float f_kHz = f / 1000.0f;

        float alpha_boric =
            0.11f *
            (f_kHz * f_kHz) /
            (1.0f + f_kHz * f_kHz);

        float alpha_magnesia =
            0.002f *
            (f_kHz * f_kHz) /
            (4.0f + f_kHz * f_kHz);

        float alpha_water =
            0.00003f *
            f_kHz * f_kHz;

        float alpha_turbidity =
            env.turbidity *
            0.05f *
            f_kHz;

        float alpha_total =
            alpha_boric +
            alpha_magnesia +
            alpha_water +
            alpha_turbidity;

        float round_trip_loss =
            alpha_total *
            two_way_km;

        if (round_trip_loss < max_loss_db)
            best_freq = f;
    }

    {
        float f_kHz =
            best_freq / 1000.0f;

        float alpha_boric =
            0.11f *
            (f_kHz * f_kHz) /
            (1.0f + f_kHz * f_kHz);

        float alpha_magnesia =
            0.002f *
            (f_kHz * f_kHz) /
            (4.0f + f_kHz * f_kHz);

        float alpha_water =
            0.00003f *
            f_kHz * f_kHz;

        float alpha_turbidity =
            env.turbidity *
            0.05f *
            f_kHz;

        env.absorption =
            alpha_boric +
            alpha_magnesia +
            alpha_water +
            alpha_turbidity;
    }

    float penetration_freq =
        best_freq * 0.4f;

    env.center_freq =
        penetration_freq +
        (best_freq - penetration_freq) *
        env.res_pen;

    env.center_freq =
        clampf_local(
            env.center_freq,
            MIN_FREQ_HZ,
            MAX_FREQ_HZ);

    float range_factor =
        1.0f -
        (D / 250.0f);

    if (range_factor < 0.1f)
        range_factor = 0.1f;

    float turb_factor =
        1.0f -
        env.turbidity;

    env.snr =
        20.0f * range_factor +
        10.0f * turb_factor;

    if (env.snr < 0.0f)
        env.snr = 0.0f;

    const float desired_resolution = 0.5f;

    env.bandwidth =
        env.sound_speed /
        (2.0f * desired_resolution);

    env.bandwidth =
        clampf_local(
            env.bandwidth,
            500.0f,
            7000.0f);

    env.duration =
        5.0f +
        (D / 200.0f) * 35.0f;

    env.duration =
        clampf_local(
            env.duration,
            2.56f,
            20.0f);

    env.amplitude =
        0.4f +
        (D / 200.0f) * 0.4f +
        env.turbidity * 0.2f;

    env.amplitude =
        clampf_local(
            env.amplitude,
            0.25f,
            0.95f);

    if (env.turbidity < 0.3f &&
        D < 30.0f) {

        env.mod_type = 0; 

    } else if (env.turbidity > 0.6f) {

        env.mod_type = 1; 

    } else if (env.turbidity >= 0.3f &&
               env.turbidity <= 0.6f) {

        env.mod_type = 2; 

    } else {

        env.mod_type = 3; 
    }

    if (D > 80.0f)
        env.mod_type = 3;

    if (env.mod_type == 0) {
        env.window_type = 0; 
    } else if (env.snr > 15.0f) {
        env.window_type = 0;
    } else if (env.snr > 7.0f) {
        env.window_type = 1; 
    } else {
        env.window_type = 2; 
    }

    if (env.center_freq < 2000.0f)
        set_mux_filter(1);
    else
        set_mux_filter(0);

    env.probe_active = 0;
    env.probe_winner = 1;

    env.probe_freqs[0] =
        env.center_freq * 0.9f;

    env.probe_freqs[1] =
        env.center_freq;

    env.probe_freqs[2] =
        env.center_freq * 1.1f;

    env.probe_snr[0] = 0.0f;
    env.probe_snr[1] = 0.0f;
    env.probe_snr[2] = 0.0f;

    commit_wave_config();
}

static void set_mux_filter(int heavy)
{

    if (heavy) {
        HAL_GPIO_WritePin(
            GPIOB,
            GPIO_PIN_5,
            GPIO_PIN_RESET);
    } else {
        HAL_GPIO_WritePin(
            GPIOB,
            GPIO_PIN_5,
            GPIO_PIN_SET);
    }
}

static void commit_wave_config(void)
{
    float fc =
        clampf_local(
            env.center_freq,
            MIN_FREQ_HZ,
            MAX_FREQ_HZ);

    float bw =
        clampf_local(
            env.bandwidth,
            500.0f,
            7000.0f);

    float f0 =
        fc -
        0.5f * bw;

    float f1 =
        fc +
        0.5f * bw;

    f0 =
        clampf_local(
            f0,
            MIN_FREQ_HZ,
            MAX_FREQ_HZ);

    f1 =
        clampf_local(
            f1,
            MIN_FREQ_HZ,
            MAX_FREQ_HZ);

    if (env.mod_type == 0 ||
        env.mod_type == 3) {

        f0 = fc;
        f1 = fc;
    }

    uint32_t pulse_samples =
        (uint32_t)lroundf(
            env.duration *
            0.001f *
            (float)SAMPLE_RATE_HZ);

    if (pulse_samples < 256U)
        pulse_samples = 256U;

    if (pulse_samples > 2000U)
        pulse_samples = 2000U;

    pending_cfg.inc_start =
        hz_to_phase_inc(f0);

    pending_cfg.inc_end =
        hz_to_phase_inc(f1);

    pending_cfg.pulse_samples =
        pulse_samples;

    pending_cfg.swing =
        (uint16_t)lroundf(
            PWM_SWING_MAX *
            env.amplitude);

    if (pending_cfg.swing < 1U)
        pending_cfg.swing = 1U;

    if (pending_cfg.swing > PWM_SWING_MAX)
        pending_cfg.swing = PWM_SWING_MAX;

    pending_cfg.mod_type =
        (uint8_t)env.mod_type;

    pending_cfg.window_type =
        (uint8_t)env.window_type;

    __disable_irq();
    config_pending = 1U;
    __enable_irq();
}

static void apply_pending_config_if_ready(void)
{
    if (!config_pending)
        return;

    active_cfg =
        pending_cfg;

    pulse_sample = 0U;

    __disable_irq();
    config_pending = 0U;
    __enable_irq();
}

static void generate_wave_half(uint16_t *buf,
                               uint16_t count)
{
    const uint32_t inc0 =
        active_cfg.inc_start;

    const uint32_t inc1 =
        active_cfg.inc_end;

    const uint32_t total =
        (active_cfg.pulse_samples > 1U)
        ? active_cfg.pulse_samples
        : 2U;

    const uint16_t swing =
        active_cfg.swing;

    const uint8_t mode =
        active_cfg.mod_type;

    const uint8_t win =
        active_cfg.window_type;

    uint32_t p =
        pulse_sample;

    for (uint16_t i = 0U;
         i < count;
         ++i) {

        uint32_t pos =
            (p < total) ? p : 0U;

        uint32_t n256 =
            (uint32_t)(
                ((uint64_t)pos * 255ULL) /
                (uint64_t)(total - 1U));

        if (n256 > 255U)
            n256 = 255U;

        uint32_t inc =
            inc0;

        if (mode == 1U) { 

            int64_t d =
                (int64_t)(uint64_t)inc1 -
                (int64_t)(uint64_t)inc0;

            inc =
                (uint32_t)(
                    (int64_t)inc0 +
                    (d * (int64_t)pos) /
                    (int64_t)(total - 1U));
        }
        else if (mode == 2U) { 

            uint64_t nn =
                (uint64_t)pos *
                (uint64_t)pos;

            uint64_t dd =
                (uint64_t)(total - 1U) *
                (uint64_t)(total - 1U);

            int64_t d =
                (int64_t)(uint64_t)inc1 -
                (int64_t)(uint64_t)inc0;

            if (dd != 0U) {
                inc =
                    (uint32_t)(
                        (int64_t)inc0 +
                        (((int64_t)d *
                          (int64_t)nn) /
                         (int64_t)dd));
            }
        }

        phase_acc_q32 += inc;

        uint16_t idx =
            (uint16_t)(
                phase_acc_q32 >>
                22U);

        int32_t sine =
            (int32_t)sine_lut[idx];

        uint16_t w =
            window_lut[win][n256];

        int32_t value =
            ((sine *
              (int32_t)swing) >>
             15);

        value =
            (value *
             (int32_t)w) >>
            15;

        if (mode == 3U) {

            uint32_t seg =
                (n256 * 13U) /
                256U;

            if (seg > 12U)
                seg = 12U;

            static const int8_t barker[13] =
                {1,1,1,1,1,-1,-1,
                 1,1,-1,1,-1,1};

            if (barker[seg] < 0)
                value = -value;
        }

        int32_t pwm =
            (int32_t)PWM_MID +
            value;

        if (pwm < 0)
            pwm = 0;

        if (pwm > (int32_t)PWM_MAX)
            pwm = PWM_MAX;

        buf[i] =
            (uint16_t)pwm;

        ++p;

        if (p >= total)
            p = 0U;
    }

    pulse_sample = p;
}

static void initialize_wave_buffer(void)
{
    phase_acc_q32 = 0U;
    pulse_sample = 0U;

    generate_wave_half(
        (uint16_t *)&wave_buf[0],
        WAVE_HALF);

    generate_wave_half(
        (uint16_t *)&wave_buf[WAVE_HALF],
        WAVE_HALF);
}

void HAL_TIM_PWM_PulseFinishedHalfCpltCallback(
    TIM_HandleTypeDef *htim)
{
    if (htim != NULL &&
        htim->Instance == TIM3) {

        apply_pending_config_if_ready();

        generate_wave_half(
            (uint16_t *)&wave_buf[0],
            WAVE_HALF);
    }
}

void HAL_TIM_PWM_PulseFinishedCallback(
    TIM_HandleTypeDef *htim)
{
    if (htim != NULL &&
        htim->Instance == TIM3) {

        apply_pending_config_if_ready();

        generate_wave_half(
            (uint16_t *)&wave_buf[WAVE_HALF],
            WAVE_HALF);
    }
}

static void read_self_monitor(void)
{
    mon_min = 4095U;
    mon_max = 0U;
    mon_sum = 0U;

    for (uint32_t i = 0U;
         i < TELEMETRY_ADC_SAMPLES;
         ++i) {

        ADC_ChannelConfTypeDef cfg = {0};

        cfg.Channel =
            ADC_CHANNEL_11; 

        cfg.Rank = 1;
        cfg.SamplingTime =
            ADC_SAMPLETIME_55CYCLES_5;

        if (HAL_ADC_ConfigChannel(
                &hadc2,
                &cfg) != HAL_OK) {

            mon_samples[i] = 0U;
            continue;
        }

        if (HAL_ADC_Start(
                &hadc2) != HAL_OK) {

            mon_samples[i] = 0U;
            continue;
        }

        if (HAL_ADC_PollForConversion(
                &hadc2,
                3U) != HAL_OK) {

            HAL_ADC_Stop(&hadc2);
            mon_samples[i] = 0U;
            continue;
        }

        uint16_t v =
            (uint16_t)HAL_ADC_GetValue(&hadc2);

        HAL_ADC_Stop(&hadc2);

        mon_samples[i] = v;

        if (v < mon_min)
            mon_min = v;

        if (v > mon_max)
            mon_max = v;

        mon_sum += v;
    }
}

static void send_dashboard(void)
{

    int len =
        snprintf(
            uart_buf,
            sizeof(uart_buf),

            "{"
            "\"depth\":%.1f,"
            "\"turbidity\":%.2f,"
            "\"temperature\":%.1f,"
            "\"res_pen\":%.2f,"
            "\"salinity\":%.1f,"
            "\"sound_speed\":%.1f,"
            "\"absorption\":%.2f,"
            "\"ph\":8.1,"
            "\"snr\":%.1f,"
            "\"center_freq\":%.1f,"
            "\"bandwidth\":%.1f,"
            "\"duration\":%.1f,"
            "\"amplitude\":%.2f,"
            "\"waveform_type\":%d,"
            "\"window_type\":%d,"
            "\"probe_active\":%d,"
            "\"probe_winner\":%d,"
            "\"probe_f1\":%.1f,"
            "\"probe_f2\":%.1f,"
            "\"probe_f3\":%.1f,"
            "\"probe_s1\":%.1f,"
            "\"probe_s2\":%.1f,"
            "\"probe_s3\":%.1f,"
            "\"adc_samples\":[",

            env.depth,
            env.turbidity,
            env.temperature,
            env.res_pen,
            env.salinity,
            env.sound_speed,
            env.absorption,
            env.snr,
            env.center_freq,
            env.bandwidth,
            env.duration,
            env.amplitude,
            env.mod_type,
            env.window_type,
            env.probe_active,
            env.probe_winner,
            env.probe_freqs[0],
            env.probe_freqs[1],
            env.probe_freqs[2],
            env.probe_snr[0],
            env.probe_snr[1],
            env.probe_snr[2]);

    if (len < 0)
        return;

    if ((size_t)len >= sizeof(uart_buf))
        return;

    for (uint32_t i = 0U;
         i < TELEMETRY_ADC_SAMPLES;
         ++i) {

        int remaining =
            (int)sizeof(uart_buf) -
            len -
            32;

        if (remaining <= 0)
            return;

        int wrote =
            snprintf(
                uart_buf + len,
                (size_t)remaining,
                "%u%s",
                (unsigned)mon_samples[i],
                (i == TELEMETRY_ADC_SAMPLES - 1U)
                    ? ""
                    : ",");

        if (wrote <= 0)
            return;

        if (wrote >= remaining)
            return;

        len += wrote;
    }

    int tail =
        snprintf(
            uart_buf + len,
            sizeof(uart_buf) - (size_t)len,
            "],"
            "\"adc2_min\":%u,"
            "\"adc2_max\":%u,"
            "\"adc2_mean\":%u"
            "}\n",
            (unsigned)mon_min,
            (unsigned)mon_max,
            (unsigned)(
                mon_sum /
                TELEMETRY_ADC_SAMPLES));

    if (tail <= 0)
        return;

    size_t total =
        (size_t)len +
        (size_t)tail;

    if (total >= sizeof(uart_buf))
        return;

    HAL_UART_Transmit(
        &huart2,
        (uint8_t *)uart_buf,
        (uint16_t)total,
        250U);
}

static void MX_GPIO_Init(void)
{
    GPIO_InitTypeDef gpio = {0};

    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_GPIOB_CLK_ENABLE();
    __HAL_RCC_GPIOC_CLK_ENABLE();
    __HAL_RCC_GPIOD_CLK_ENABLE();

    HAL_GPIO_WritePin(
        GPIOC,
        GPIO_PIN_13,
        GPIO_PIN_RESET);

    gpio.Pin = GPIO_PIN_13;
    gpio.Mode = GPIO_MODE_OUTPUT_PP;
    gpio.Pull = GPIO_NOPULL;
    gpio.Speed = GPIO_SPEED_FREQ_LOW;

    HAL_GPIO_Init(
        GPIOC,
        &gpio);

    HAL_GPIO_WritePin(
        GPIOB,
        GPIO_PIN_5,
        GPIO_PIN_SET);

    gpio.Pin = GPIO_PIN_5;

    HAL_GPIO_Init(
        GPIOB,
        &gpio);

    gpio.Pin =
        GPIO_PIN_0 |
        GPIO_PIN_1 |
        GPIO_PIN_4;

    gpio.Mode = GPIO_MODE_ANALOG;
    gpio.Pull = GPIO_NOPULL;

    HAL_GPIO_Init(
        GPIOA,
        &gpio);

    gpio.Pin = GPIO_PIN_0;

    HAL_GPIO_Init(
        GPIOB,
        &gpio);

    gpio.Pin = GPIO_PIN_0 |
               GPIO_PIN_1;

    HAL_GPIO_Init(
        GPIOC,
        &gpio);
}

static void MX_USART2_UART_Init(void)
{
    huart2.Instance =
        USART2;

    huart2.Init.BaudRate =
        115200;

    huart2.Init.WordLength =
        UART_WORDLENGTH_8B;

    huart2.Init.StopBits =
        UART_STOPBITS_1;

    huart2.Init.Parity =
        UART_PARITY_NONE;

    huart2.Init.Mode =
        UART_MODE_TX_RX;

    huart2.Init.HwFlowCtl =
        UART_HWCONTROL_NONE;

    huart2.Init.OverSampling =
        UART_OVERSAMPLING_16;

    if (HAL_UART_Init(&huart2) != HAL_OK)
        Error_Handler();
}

static void MX_ADC1_Init(void)
{
    __HAL_RCC_ADC1_CLK_ENABLE();

    hadc1.Instance =
        ADC1;

    hadc1.Init.ScanConvMode =
        ADC_SCAN_DISABLE;

    hadc1.Init.ContinuousConvMode =
        DISABLE;

    hadc1.Init.DiscontinuousConvMode =
        DISABLE;

    hadc1.Init.ExternalTrigConv =
        ADC_SOFTWARE_START;

    hadc1.Init.DataAlign =
        ADC_DATAALIGN_RIGHT;

    hadc1.Init.NbrOfConversion =
        1U;

    if (HAL_ADC_Init(&hadc1) != HAL_OK)
        Error_Handler();
}

static void MX_ADC2_Init(void)
{
    __HAL_RCC_ADC2_CLK_ENABLE();

    hadc2.Instance =
        ADC2;

    hadc2.Init.ScanConvMode =
        DISABLE;

    hadc2.Init.ContinuousConvMode =
        DISABLE;

    hadc2.Init.DiscontinuousConvMode =
        DISABLE;

    hadc2.Init.ExternalTrigConv =
        ADC_EXTERNALTRIGCONV_T3_TRGO;

    hadc2.Init.DataAlign =
        ADC_DATAALIGN_RIGHT;

    hadc2.Init.NbrOfConversion =
        1U;

    if (HAL_ADC_Init(&hadc2) != HAL_OK)
        Error_Handler();
}

static void MX_DMA_Init(void)
{
    __HAL_RCC_DMA1_CLK_ENABLE();

    hdma_tim3_ch1_trig.Instance =
        DMA1_Channel6;

    hdma_tim3_ch1_trig.Init.Direction =
        DMA_MEMORY_TO_PERIPH;

    hdma_tim3_ch1_trig.Init.PeriphInc =
        DMA_PINC_DISABLE;

    hdma_tim3_ch1_trig.Init.MemInc =
        DMA_MINC_ENABLE;

    hdma_tim3_ch1_trig.Init.PeriphDataAlignment =
        DMA_PDATAALIGN_HALFWORD;

    hdma_tim3_ch1_trig.Init.MemDataAlignment =
        DMA_MDATAALIGN_HALFWORD;

    hdma_tim3_ch1_trig.Init.Mode =
        DMA_CIRCULAR;

    hdma_tim3_ch1_trig.Init.Priority =
        DMA_PRIORITY_HIGH;

    if (HAL_DMA_Init(
            &hdma_tim3_ch1_trig) != HAL_OK) {

        Error_Handler();
    }

    __HAL_LINKDMA(
        &htim3,
        hdma[TIM_DMA_ID_CC1],
        hdma_tim3_ch1_trig);

    HAL_NVIC_SetPriority(
        DMA1_Channel6_IRQn,
        0U,
        0U);

    HAL_NVIC_EnableIRQ(
        DMA1_Channel6_IRQn);
}

static void MX_TIM3_Init(void)
{
    TIM_OC_InitTypeDef oc = {0};
    TIM_MasterConfigTypeDef master = {0};

    htim3.Instance =
        TIM3;

    htim3.Init.Prescaler =
        0U;

    htim3.Init.CounterMode =
        TIM_COUNTERMODE_UP;

    htim3.Init.Period =
        PWM_MAX;

    htim3.Init.ClockDivision =
        TIM_CLOCKDIVISION_DIV1;

    htim3.Init.AutoReloadPreload =
        TIM_AUTORELOAD_PRELOAD_ENABLE;

    if (HAL_TIM_PWM_Init(&htim3) != HAL_OK)
        Error_Handler();

    oc.OCMode =
        TIM_OCMODE_PWM1;

    oc.Pulse =
        PWM_MID;

    oc.OCPolarity =
        TIM_OCPOLARITY_HIGH;

    oc.OCFastMode =
        TIM_OCFAST_DISABLE;

    if (HAL_TIM_PWM_ConfigChannel(
            &htim3,
            &oc,
            TIM_CHANNEL_1) != HAL_OK) {

        Error_Handler();
    }

    __HAL_RCC_GPIOA_CLK_ENABLE();

    GPIO_InitTypeDef gpio = {0};

    gpio.Pin =
        GPIO_PIN_6;

    gpio.Mode =
        GPIO_MODE_AF_PP;

    gpio.Speed =
        GPIO_SPEED_FREQ_HIGH;

    HAL_GPIO_Init(
        GPIOA,
        &gpio);

    master.MasterOutputTrigger =
        TIM_TRGO_UPDATE;

    master.MasterSlaveMode =
        TIM_MASTERSLAVEMODE_DISABLE;

    if (HAL_TIMEx_MasterConfigSynchronization(
            &htim3,
            &master) != HAL_OK) {

        Error_Handler();
    }
}

void SystemClock_Config(void)
{
    RCC_OscInitTypeDef osc = {0};
    RCC_ClkInitTypeDef clk = {0};

    osc.OscillatorType =
        RCC_OSCILLATORTYPE_HSI;

    osc.HSIState =
        RCC_HSI_ON;

    osc.HSICalibrationValue =
        RCC_HSICALIBRATION_DEFAULT;

    osc.PLL.PLLState =
        RCC_PLL_ON;

    osc.PLL.PLLSource =
        RCC_PLLSOURCE_HSI_DIV2;

    osc.PLL.PLLMUL =
        RCC_PLL_MUL16;

    if (HAL_RCC_OscConfig(&osc) != HAL_OK)
        Error_Handler();

    clk.ClockType =
        RCC_CLOCKTYPE_HCLK |
        RCC_CLOCKTYPE_SYSCLK |
        RCC_CLOCKTYPE_PCLK1 |
        RCC_CLOCKTYPE_PCLK2;

    clk.SYSCLKSource =
        RCC_SYSCLKSOURCE_PLLCLK;

    clk.AHBCLKDivider =
        RCC_SYSCLK_DIV1;

    clk.APB1CLKDivider =
        RCC_HCLK_DIV2;

    clk.APB2CLKDivider =
        RCC_HCLK_DIV1;

    if (HAL_RCC_ClockConfig(
            &clk,
            FLASH_LATENCY_2) != HAL_OK) {

        Error_Handler();
    }
}

int main(void)
{
    HAL_Init();
    SystemClock_Config();

    MX_GPIO_Init();
    MX_DMA_Init();
    MX_ADC1_Init();
    MX_ADC2_Init();
    MX_USART2_UART_Init();
    MX_TIM3_Init();

    if (HAL_ADCEx_Calibration_Start(
            &hadc1) != HAL_OK) {

        Error_Handler();
    }

    if (HAL_ADCEx_Calibration_Start(
            &hadc2) != HAL_OK) {

        Error_Handler();
    }

    init_luts();

    read_pots();
    compute_environment();

    active_cfg =
        pending_cfg;

    config_pending = 0U;

    initialize_wave_buffer();

    if (HAL_TIM_PWM_Start_DMA(
            &htim3,
            TIM_CHANNEL_1,
            (uint32_t *)wave_buf,
            WAVE_BUF_SIZE) != HAL_OK) {

        Error_Handler();
    }

    uint32_t last_sensor_tick =
        HAL_GetTick();

    uint32_t last_telemetry_tick =
        HAL_GetTick();

    uint32_t led_tick =
        HAL_GetTick();

    while (1) {

        uint32_t now =
            HAL_GetTick();

        if ((uint32_t)(
                now -
                last_sensor_tick) >=
            SENSOR_PERIOD_MS) {

            last_sensor_tick =
                now;

            read_pots();
            compute_environment();
        }

        if ((uint32_t)(
                now -
                last_telemetry_tick) >=
            TELEMETRY_PERIOD_MS) {

            last_telemetry_tick =
                now;

            read_self_monitor();
            send_dashboard();
        }

        if ((uint32_t)(
                now -
                led_tick) >=
            500U) {

            led_tick =
                now;

            HAL_GPIO_TogglePin(
                GPIOC,
                GPIO_PIN_13);
        }
    }
}

void Error_Handler(void)
{
    __disable_irq();

    while (1) {
    }
}
