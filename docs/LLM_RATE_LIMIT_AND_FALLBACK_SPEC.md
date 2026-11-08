# LLM Rate Limiting, Free-Tier Optimization & Fallback Router Specification

> **Technical Specification: Multi-Provider LLM Orchestration, Proactive Rate Limit Avoidance (RPM/TPM/RPD), Seamless Fallback Cascade, and Zero-Cost Operation.**

---

## 1. Problem Statement & Philosophy

Small businesses, MEIs, and families should be able to run OpenFamilyOffice **without mandatory monthly software or API subscriptions ($0/month operating cost)**.

Major AI providers offer generous free tiers:
* **Google Gemini API Free Tier**: ~15 RPM (Requests Per Minute), 1,000,000 TPM (Tokens Per Minute), 1,500 RPD (Requests Per Day) on models like Gemini 1.5/2.0 Flash.
* **Groq Free Tier**: ~30 RPM, 6,000 to 30,000 TPM, 14,400 RPD on models like Llama 3.3 70B and Qwen 2.5.
* **OpenRouter / Mistral Free Models**: Free community endpoints with rate limits.
* **Local LLM (Ollama / NexusLocal)**: 0 RPM/TPM/RPD limits, 100% free, runs offline on local hardware.

However, naive implementations fail because:
1. They hit hard **429 (Too Many Requests)** errors when a batch briefing or receipt analysis exceeds RPM or TPM limits.
2. They freeze the user interface while waiting for quotas to reset.
3. They lack automatic failover when a free provider experiences downtime or reaches daily limits (RPD).

**OpenFamilyOffice** implements an **Intelligent Multi-Provider Fallback Router** with **Proactive Rate-Limit Avoidance**.

---

## 2. Architecture: Sliding-Window Rate Limiter & Fallback Cascade

```mermaid
flowchart TD
    Request["Agent LLM Request<br/>(Family CFO / Receipt OCR / Risk Analysis)"] --> Context{"Task Context Priority"}
    
    Context -->|Interactive UI / User Waiting| InterQueue["Priority 1: Zero-Delay Path"]
    Context -->|Background Batch / Daily Briefing| BatchQueue["Priority 2: Managed Queue Path"]
    
    InterQueue --> Router["LLM Fallback Router & Rate Limiter"]
    BatchQueue --> Router
    
    subgraph RateLimiter["Proactive Sliding-Window Monitor (RPM / TPM / RPD)"]
        Check["Calculate Current Rolling Quota:<br/>RPM / TPM / RPD"]
        Threshold{"Is Provider Quota<br/>> 80% Threshold?"}
    end
    
    Router --> Check
    Check --> Threshold
    
    Threshold -->|No (< 80% Capacity)| ActiveProvider["Dispatch Call to Primary Provider<br/>(e.g., Google Gemini 2.0 Flash Free Tier)"]
    
    Threshold -->|Yes (Approaching Limit)| RoutingChoice{"Task Priority?"}
    
    RoutingChoice -->|Interactive UI| SeamlessSwitch["Seamlessly Switch to Next Healthy Free Provider<br/>(e.g., Groq Llama 3.3 70B or OpenRouter)"]
    RoutingChoice -->|Background Batch| AsyncThrottle["Non-Blocking Smooth Jitter Delay<br/>(Wait for rolling window to clear without freezing UI)"]
    
    ActiveProvider -->|200 OK| Response["Return Structured JSON Response"]
    SeamlessSwitch -->|200 OK| Response
    AsyncThrottle --> ActiveProvider
    
    ActiveProvider -->|429 / 5xx Error| CooldownTrigger["Mark Provider in 60s Cool-Down<br/>+ Instant Failover to Secondary Provider"]
    CooldownTrigger --> SeamlessSwitch
    
    SeamlessSwitch -->|All Cloud Fails| LocalFallback["Tier 0: Local Ollama / NexusLocal<br/>(Always Available, Offline, Zero Rate Limit)"]
    LocalFallback --> Response
```

---

## 3. Sliding Window Tracking (RPM, TPM, RPD)

Instead of relying on crude fixed-minute counters that reset on the clock (which suffer from the "boundary burst" problem), OpenFamilyOffice tracks a **rolling sliding window**:

* **Rolling RPM (60-second window)**:
  $$\text{RPM}_{\text{current}} = \left| \{ t \in \text{Timestamps} \mid \text{now} - t \le 60\text{s} \} \right|$$
* **Rolling TPM (60-second window)**:
  $$\text{TPM}_{\text{current}} = \sum_{t \in \text{Timestamps}, \text{now} - t \le 60\text{s}} \text{Tokens}(t)$$
* **Rolling RPD (24-hour calendar window)**:
  $$\text{RPD}_{\text{current}} = \left| \{ t \in \text{Timestamps} \mid \text{date}(t) = \text{today} \} \right|$$

### Proactive Switching Threshold (Default: 80%)
When a provider reaches **80% of its RPM, TPM, or RPD limit**:
* It is marked as `SATURATED`.
* New requests are proactively routed to the next provider *before* the API returns a `429 Too Many Requests` error.

---

## 4. The Free-Tier Provider Cascade Hierarchy

The system defines an ordered cascade of providers:

| Priority Tier | Provider & Model | Free Limits | Ideal Task Profile |
|---|---|---|---|
| **Tier 1 (Primary)** | **Google Gemini Flash (2.0 / 1.5)** | 15 RPM / 1M TPM / 1,500 RPD | Complex synthesis, receipt photo vision, weekly family briefing. |
| **Tier 2 (Secondary)** | **Groq (Llama 3.3 70B / Qwen 2.5)** | 30 RPM / 6k-30k TPM / 14,400 RPD | High-speed text reasoning, categorization, anomaly auditing. |
| **Tier 3 (Tertiary)** | **OpenRouter / Mistral Free Tier** | Varies by community endpoint | Backup conversational reasoning and translation. |
| **Tier 0 (Privacy & Offline)** | **Local Ollama (Qwen 2.5 / Llama 3.3)** | $\infty$ RPM / $\infty$ TPM / $\infty$ RPD | Highly sensitive bank statements, zero cloud leakage, offline mode. |

---

## 5. Differentiated Handling: Interactive vs. Background Tasks

### Path A: Interactive Calls (User Waiting)
* The user is chatting with the Family CFO or asking a question.
* **Target Latency**: $< 3$ seconds.
* **Rule**: NEVER delay or sleep. If the current provider is above 80% RPM or TPM, immediately switch to the next provider in the cascade.

### Path B: Background Batch Tasks (Weekly Briefings, News Synthesis, Receipt OCR Queue)
* Runs asynchronously or in a scheduled worker.
* **Target Latency**: Background completion.
* **Rule**: If all cloud free tiers are near capacity, the worker computes the exact sleep time:
  $$\text{Delay} = 60 - (\text{now} - \text{oldest\_request\_in\_window}) + 1.0\text{s}$$
* Executes smoothly in the background without burning through interactive allowances.

