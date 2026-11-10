---
name: agent-platform-inference
description: Connects to and performs inference with Google Cloud Agent Platform GenAI models, including First-Party Gemini models and Third-Party OpenMaaS models (Llama, DeepSeek, Qwen, etc.). Use when asked to perform inference, ask a model a question, run a test prompt, execute chat completions, or generate code for calling Gemini or OpenMaaS models, authenticate with GenAI SDK, OpenAI SDK, or legacy Agent Platform SDK, configure base URLs and global/regional endpoints, or troubleshoot 429 Resource Exhausted (DSQ), 400 User Validation, or 404 Not Found errors. Don't use for deploying models to endpoints or for running model evaluations.
metadata:
  version: 1.0.1
  category: AiAndMachineLearning
---

## Use this skill when

- Working on `agent-platform-inference` tasks: Connects to and performs inference with Google Cloud Agent Platform GenAI models, including First-Party Gemini models and Third-Party OpenMaaS models (Llama, DeepSeek, Qwen, etc.). Use when asked to perform inference, ask a model a question, run a test prompt, execute chat completions, or generate code for calling Gemini or OpenMaaS models, authenticate with GenAI SDK, OpenAI SDK, or legacy Agent Platform SDK, configure base URLs and global/regional endpoints, or troubleshoot 429 Resource Exhausted (DSQ), 400 User Validation, or 404 Not Found errors. Don't use for deploying models to endpoints or for running model evaluations.

## Do not use

- Do not use when the request is unrelated to `agent-platform-inference` or when a more specific domain skill applies.

## Instructions

Follow the workflow, rules, and verification steps detailed below for `agent-platform-inference`.

# Agent Platform GenAI Inference Skill

This skill provides instructions for authenticating and connecting to Google
Cloud Agent Platform to use Generative AI models. It covers:

*   **First-Party publisher models** (Gemini) — section 2.
*   **Third-Party publisher models** (OpenMaaS: Llama, DeepSeek, Qwen, etc.)
    — section 3.
*   **Custom endpoints** (any model on a numeric `projects/.../endpoints/<id>`
    resource — tuned Gemini models, OSS LLMs self-deployed from Model Garden
    via the `agent-platform-deploy` skill, and legacy custom models) —
    section 4.

## Attribution

**MUST READ**: Before executing any `gcloud`, REST API, or MCP command, you MUST
read [Usage Attribution](references/attribution.md). For commands executed
directly in the terminal (never in generated scripts, Terraform, or user code),
prefix `gcloud` with `CLOUDSDK_METRICS_REQUEST_ATTRIBUTION` and append the
attribution suffix to `User-Agent` headers:

```text
CLOUDSDK_METRICS_REQUEST_ATTRIBUTION="agent-skills/1.0 (skill:agent-platform-inference)"
User-Agent: <existing_user_agent> agent-skills/1.0 (skill:agent-platform-inference)
```

## Safety & Confirmation Tiers (CRITICAL)

Before executing any commands or scripts on behalf of the user, you must adhere
to the following safety tiers based on the action requested. (The skill is
read-only; other safety tiers are omitted):

1.  **Tier R: Read-only / Inference (`client.models.generate_content`,
    `client.chat.completions.create`, `client.completions.create`,
    `client.embeddings.create`)**
    *   Requires **interactive confirmation** with 'Yes'/ 'No' options before
        executing model inference on behalf of the user, to prevent unexpected
        cost or quota consumption.
    *   **Required Fields in Confirmation Card**: The confirmation prompt must
        clearly explain the proposed inference execution and explicitly list all
        of the following parameters:
        *   **Project ID**: The Google Cloud project ID or number (e.g.
            `123456789012`, `my-project`).
        *   **Region / Location**: The target region (e.g. `us-central1`,
            `global`).
        *   **Model ID**: The exact model ID (e.g. `gemini-2.5-flash`,
            `deepseek-ai/deepseek-v3.2-maas`).
        *   **SDK**: The SDK choice (e.g. `Google GenAI SDK (google-genai)`,
            `OpenAI SDK`).
        *   **Input Prompt** (or **Input Image** / **Input Media**): The prompt
            text or media URI.
        *   Any additional generation parameters (e.g. `max_output_tokens`,
            `response_schema`) if specified.
        Natural-language paraphrases without explicitly listing these
        parameters are NOT sufficient.
    *   **Same-turn restriction**: Do not execute the inference scripts or
        commands in the same turn as presenting the confirmation prompt. Stop
        and wait for the user's reply; only execute after explicit 'Yes' /
        approval.
    *   **Gold Standard Example**:
        > I will perform model inference with the following parameters. Please
        > confirm this information before I proceed:
        > * **Project ID**: `my-project`
        > * **Region**: `us-central1`
        > * **Model ID**: `gemini-2.5-pro`
        > * **SDK**: Google GenAI SDK (`google-genai`)
        > * **Input Prompt**: "Summarize the plot of Hamlet in 3 sentences"
        >
        > Do you confirm? [Yes/No]
    *   **Post-Execution Response Grounding (CRITICAL)**:
        After receiving explicit user approval and executing the inference call
        via the SDK, the response returning the generated text **MUST
        explicitly confirm the execution parameters** alongside the model's
        output. Never return a bare model response alone. Always include:
        *   **Model ID**: The exact model ID used (e.g. `gemini-2.5-pro`
            or `<MODEL_ID>`).
        *   **SDK**: The SDK used (e.g. `Google GenAI SDK (google-genai)`
            or `OpenAI SDK`).
        *   **Project ID**: The Google Cloud project ID/number used.
        *   **Region**: The region or endpoint location used (e.g. `global`
            or `us-central1`).
        *   **Generated Output**: The model's complete generated answer.

## Phase 0: Environment Setup

**CRITICAL**: Before running any of the Python sample scripts in the `scripts/`
directory (e.g., `scripts/openmaas_openai_sdk.py`), you MUST ensure the
environment is correctly initialized by following these steps:

1.  **Google Cloud Authentication**: Authenticate with your Google Cloud
    credentials and configure active Application Default Credentials (ADC) for
    Agent Platform access:

    ```bash
    gcloud auth login
    gcloud auth application-default login
    ```

2.  **Enable API** (if not already enabled):

    ```bash
    gcloud services enable aiplatform.googleapis.com
    ```

3.  **Python Dependencies**: The scripts import `vertexai` (from
    `google-cloud-aiplatform`), `google-genai`, and `openai`. Do **not** create
    a virtual environment — it starts empty and hides packages the environment
    already provides, forcing a redundant install. Probe, and install only what
    is missing:

    ```bash
    python3 -c "import vertexai, google.genai, openai" \
      || pip install -r scripts/requirements.txt
    ```

    `scripts/requirements.txt` is a fallback for an environment that does not
    already provide these SDKs; do not install it on top of a working
    environment.

4.  **Verify Setup (Optional)**: Run all sample scripts at once to verify the
    environment is working end-to-end:

    ```bash
    ./scripts/verify_all.sh
    ```

5.  **Execution**: Run the scripts with a plain `python3 scripts/...`. There is
    no environment to activate first.

> [!IMPORTANT] **CRITICAL: Model IDs & Availability** * **Gemini Models**: See
> [Gemini Models][gemini-models-docs] for valid Model IDs and Regions. *
> **OpenMaaS Models**: See
> [Use Open Models on Agent Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/maas/use-open-models)
> for Llama, DeepSeek, Qwen, etc. * **Incomplete Lists**: The Model IDs listed
> in this skill are **examples only** and may be incomplete or outdated. *
> **Action**: Always verify the Model ID and Region using the links above before
> generating code.
>
> \[gemini-models-docs]:
> https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/migrate
>

## Parameter Grounding & Clarification Protocol (CRITICAL)

Before preparing code or presenting a Tier R confirmation card, you MUST ensure
all necessary parameters are grounded:

1.  **Missing Model ID, Model Family, or SDK (CRITICAL)**:
    *   If the user has **NOT** specified which model or model family to use
        (e.g., "run a test prompt", "ask a generative AI model to...", "ask
        DeepSeek a question" without model version), or has not specified the
        SDK preference:
    *   **NEVER** guess, volunteer, or default to a model (such as
        `gemini-2.5-flash`, `gemini-2.5-pro`, or `deepseek-v3.2-maas`).
        Proposing a defaulted model in a confirmation card without asking
        violates parameter grounding.
    *   **YOU MUST STOP AND ASK THE USER**: "Which model (or model family,
        such as Gemini, Llama, DeepSeek, or Qwen) and SDK preference (such as
        Google GenAI SDK or OpenAI SDK) would you like to use?" and ask for the
        target region and project ID if not specified.
    *   Only after the user specifies the model (and any missing SDK preference)
        should you proceed to prepare the execution and present the Tier R
        confirmation prompt.

2.  **Missing Project ID or Region**:
    *   If the user's project ID or region is not specified in the prompt or
        conversation context, **ASK** the user for the project ID and region
        (e.g. "Which project ID and region would you like to use?"). Do not
        silently assume a project or region.
    *   **OpenMaaS Locations**: OpenMaaS publisher models are hosted on `global`
        (e.g. `deepseek-ai/deepseek-v3.2-maas`,
        `meta/llama-3.3-70b-instruct-maas`) or regional endpoints such as
        `us-central1` (e.g. `deepseek-ai/deepseek-r1-0528-maas`).
        When configuring inference for OpenMaaS models, use the appropriate
        endpoint:

        *   Global: `https://aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/global/endpoints/openapi`
        *   Regional: `https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/endpoints/openapi`

        and explicitly reflect the region in the confirmation card and final
        response.

3.  **SDK Choice**:
    *   If the user specifies a model but does not specify an SDK, use the
        preferred SDK for that model family (GenAI SDK `google-genai` for
        Gemini, OpenAI SDK `openai` for OpenMaaS).

4.  **Sandbox Execution via Python (CRITICAL)**:
    *   When executing model inference in the sandbox via `run_command`,
        **ALWAYS** run Python code using the official SDKs (e.g., writing and
        running a Python script with `google-genai`, `openai`, or `vertexai`).
        Do not use raw curl commands for final inference execution.

## Workflow Decision Tree

1.  **Model Specified?**
    *   **No** (user omitted model name/family) -> **Ask the user** which model
        or model family, target region, and SDK preference they want to use.
    *   **Underspecified** (e.g., user said "DeepSeek" or "Llama" without
        version) -> **Ask the user** which specific model version they prefer
        (e.g., `deepseek-ai/deepseek-r1-0528-maas`,
        `deepseek-ai/deepseek-v3.2-maas`, `meta/llama-3.3-70b-instruct-maas`).
    *   **Yes** -> Proceed to Step 2.

2.  **Model Family & SDK Selection**:
    *   **Gemini** (e.g., `gemini-2.5-pro`, `gemini-2.5-flash`) -> Preferred:
        **GenAI SDK** (`google-genai`). Proceed to [1. Gemini Models].
    *   **OpenMaaS** (e.g., `deepseek-ai/*`, `meta/llama-*`, `qwen/*`) ->
        Preferred: **OpenAI SDK** (`openai`). Proceed to [2. OpenMaaS Models].
    *   **Custom Endpoint** (numeric endpoint ID
        `projects/.../endpoints/<id>`) -> Proceed to [4. Custom Endpoints].

3.  **Troubleshooting**: Is the user reporting an error (429 Resource Exhausted,
    400 User Validation, 404 Not Found, empty response due to token limits,
    etc.)?
    *   **Yes** -> Proceed to [5. Troubleshooting & Common Error Codes].
    *   **No** -> Present Tier R confirmation prompt with all required fields
        (Project ID, Region, Model ID, SDK, Input Prompt), wait for user
        confirmation, then execute via Python SDK.

## 0.5 Region Availability Check for Publisher Endpoints (Gemini + LoRA base)

> [!NOTE] **Skip this section** if either of these applies:
>
> - The user is calling a custom endpoint (§4) — a tuned Gemini model served on
>   a numeric `projects/.../endpoints/<id>`, a self-deployed OSS LLM (Llama,
>   DeepSeek, Qwen, Gemma, etc.), or a legacy custom model. Those requests hit
>   a specific endpoint resource whose region is fixed at deploy time; if the
>   caller-side region doesn't match, the endpoint lookup returns a clean 404
>   without incurring inference cost. Go to §4.
> - The user is calling an OpenMaaS publisher model (§2) — Llama, DeepSeek,
>   Qwen, etc. served via the global `openapi` base URL. These don't have
>   per-region availability restrictions in the same way first-party Gemini
>   does. Go to §2.
>
> **Apply this section** only if the user is calling a first-party managed
> Gemini model (`gemini-*`, via §1), including fine-tuned LoRA adapters on
> top of Gemini — these route through a publisher endpoint whose regional
> availability actually varies.

Before responding to any inference request that names a specific region for a
first-party managed Gemini model (`gemini-*`) or a fine-tuned Gemini LoRA
adapter (identified by numeric endpoint ID + user-stated base model), you
**MUST** verify the model is actually available in that region by making a
live API call. Do not rely on Google Search, training-corpus knowledge, or
publisher documentation for availability claims — regional availability
changes frequently and grounded text can be stale or wrong.

Probe only the exact model and region the user asked about. Do not probe other
models as a "control" — you cannot infer anything about model A's availability
from model B's status, because a different model may itself be unavailable in
the reference region for unrelated reasons.

For first-party Gemini models, probe with a real `:generateContent` call using
a minimal valid payload:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    "https://${LOCATION_ID}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/google/${MODEL_ID}:generateContent" \
    -d "{\"contents\":{\"role\":\"user\",\"parts\":{\"text\":\"${PROBE_TEXT:-hi}\"}}}"
```

For inference against a fine-tuned Gemini LoRA adapter, probe the **base
model** in the target region using the same `:generateContent` call above with
`${MODEL_ID}` set to the base (e.g. `gemini-2.5-flash` if the adapter was
tuned on `gemini-2.5-flash`). The LoRA adapter cannot serve in a region where
its base model isn't available.

Interpret the probe result and act:

-   **200** — model is available in that region. Proceed with the SDK setup in
    §1.
-   **404** — model is not available in that region. STOP. Tell the user
    plainly that the model isn't offered in that region and list the regions
    where it is available (from
    [Gemini Models][gemini-models-docs] or `gcloud ai model-garden models list
    --filter="name~$MODEL_NAME"` without `--region`). Do not silently switch
    regions. Do not proceed to write inference code or SDK initialization for
    the unsupported region. Do not run additional "control" probes to
    double-check the 404 — the target-region probe is authoritative.
-   **Any other outcome** (permission denied, quota, transient failure, etc.)
    — do not conclude the model is available or unavailable. Explain the
    underlying cause in plain language (e.g. "your account doesn't have access
    to this project's Vertex AI API — enable it in the console or switch
    projects") and the concrete next action.

## 1. Gemini Models

For Gemini models (e.g., `gemini-2.5-pro`, `gemini-3-flash-preview`), the
**GenAI SDK** (`google-genai`) is the **PREFERRED** method. The legacy
`vertexai` SDK is still supported but GenAI SDK is recommended for new projects.

> [!IMPORTANT]
> **Preview Models (including Gemini 3.1)** are often **ONLY** available in the
> `global` region. Stable models are available in `us-central1` and other
> regions.

### Choosing the Right SDK

*   **Gemini Models**: **GenAI SDK** (`google-genai`) is **PREFERRED**. Use
    OpenAI SDK for compatibility, or Legacy SDK (`vertexai`) if needed.
*   **OpenMaaS Models**: **OpenAI SDK** is **HIGHLY RECOMMENDED**. Use GenAI SDK
    or Legacy SDK if you have specific infrastructure requirements.

### Installation

```bash
pip install google-genai
```

### Python Example (GenAI SDK - Preferred)

See [`scripts/gemini_genai_sdk.py`](scripts/gemini_genai_sdk.py) for the
complete code.

### Alternative: OpenAI SDK (Chat Completions)

Use the standard OpenAI SDK with the Agent Platform endpoint. This is great for
cross-compatibility.

See [`scripts/gemini_openai_sdk.py`](scripts/gemini_openai_sdk.py) for the
complete code.

### Legacy: Agent Platform SDK

The legacy `vertexai` SDK is still widely used but `google-genai` is preferred
for new Gemini projects.

See [`scripts/gemini_vertexai_sdk.py`](scripts/gemini_vertexai_sdk.py) for the
complete code.

**Documentation**:
[Google GenAI SDK](https://github.com/googleapis/python-genai)

**Documentation**:
[Agent Platform Gemini Models](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/google-models)

## 2. OpenMaaS Models (Llama, DeepSeek, Qwen, etc.)

For OpenMaaS (Model-as-a-Service) models, the **HIGHLY RECOMMENDED** approach is
to use the standard **OpenAI SDK** with a specific Vertex AI endpoint.

> [!WARNING] While `GenerativeModel` *can* support some OpenMaaS models, it is
> **discouraged**. Use the OpenAI SDK for best compatibility (especially for
> Chat Completions).

### Installation

```bash
pip install openai google-auth
```

### Authentication for OpenAI SDK

You **MUST** use a Google Cloud OAuth access token as the API key for the OpenAI
SDK.

```python
import subprocess

def get_gcp_access_token():
    return subprocess.check_output(
        ["gcloud", "auth", "print-access-token"]
    ).decode("utf-8").strip()
```

> [!NOTE] Google Cloud access tokens typically expire after 1 hour. The
> `get_gcp_access_token()` function above retrieves a *fresh* token at the time
> it is called. For long-running
> applications, you implement a refresh mechanism. See
> [Refresh the access token](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/migrate/openai/auth-and-credentials?hl=en#refresh_your_credentials)
> for details.

### Configuration (Base URL)

-   **Global Endpoint** (Recommended for most models requiring global
    availability):
    `https://aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/global/endpoints/openapi`
-   **Regional Endpoint**:
    `https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/endpoints/openapi`

### Python Example (OpenMaaS - Chat Completions)

See [`scripts/openmaas_openai_sdk.py`](scripts/openmaas_openai_sdk.py) for the
complete code.

> [!TIP] **Alternative: Environment Variables** You can set environment
> variables in your shell instead of updating the code.
>
> **Alternative: Environment Variables** You can set environment variables in
> your shell instead of updating the code.

```bash
export OPENAI_BASE_URL="https://aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/global/endpoints/openapi"
export OPENAI_API_KEY="$(gcloud auth application-default print-access-token)"
```
> Then initialize the client without arguments: `client = OpenAI()`

### Python Example (OpenMaaS - Completions API)

The following models support the legacy Completions API: `zai-org/glm-5-maas`,
`moonshotai/kimi-k2-thinking-maas`, `minimaxai/minimax-m2-maas`,
`deepseek-ai/deepseek-v3.1-maas`, and `deepseek-ai/deepseek-v3.2-maas`.

```python
response = client.completions.create(
    model="deepseek-ai/deepseek-v3.2-maas",
    prompt="Once upon a time",
    max_tokens=100
)
print(response.choices[0].text)
```

### Python Example (OpenMaaS - Embeddings)

```python
# Verify specific Embedding Model ID on Model Garden (e.g., intfloat/multilingual-e5-small)
response = client.embeddings.create(
    model="intfloat/multilingual-e5-large-maas",
    input="The quick brown fox jumps over the lazy dog",
)
print(response.data[0].embedding)
```

### Alternative: GenAI SDK

The `google-genai` SDK can also access OpenMaaS models via the `vertexai`
backend.

See [`scripts/openmaas_genai_sdk.py`](scripts/openmaas_genai_sdk.py) for the
complete code.

> [!IMPORTANT]
> **Model ID Format**: For GenAI SDK with OpenMaaS, you **MUST** use the full
> path: `publishers/PUBLISHER/models/MODEL` (e.g.,
> `publishers/zai-org/models/glm-5-maas`).

### Legacy: Agent Platform SDK (OpenMaaS)

For OpenMaaS, you can also use `GenerativeModel` (if supported).

See [`scripts/openmaas_vertexai_sdk.py`](scripts/openmaas_vertexai_sdk.py) for
the complete code.

> [!IMPORTANT] **Model ID Format**: For Agent Platform SDK with OpenMaaS, you
> **MUST** use the full path: `publishers/PUBLISHER/models/MODEL`.

### Model Reference & Availability

**Documentation**:
[Use Open Models on Agent Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/maas/use-open-models)

> [!TIP]
> **Self-Deployment for Control**: If you need **dedicated hardware**
> (GPUs/TPUs), **guaranteed capacity**, or **specific regional placement** not
> offered by MaaS, you can **Self-Deploy** these models to Agent Platform
> Endpoints. Search for the model in Model Garden and click "Deploy" to select
> your machine type. See the `agent-platform-deploy` skill for the deployment
> workflow, and **section 4 of this skill** for how to invoke the resulting
> self-deployed endpoint (use `/chat/completions` on the dedicated endpoint
> DNS, NOT the OpenMaaS publisher URL above).

> [!IMPORTANT] **Finding Inference Examples**: The list above is a starting
> point. For the **definitive** inference snippets (especially for Chat
> Completions payload structure): 1. Consult the
> [Use Open Models on Agent Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/maas/use-open-models)
> list. 2. Click the link for your specific model (e.g., "DeepSeek-V3") to visit
> its **Model Garden** page. 3. Look for the **"Sample Code"** or **"Use this
