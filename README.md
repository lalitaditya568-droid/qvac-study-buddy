\# QVAC Study Buddy



A small private AI study assistant powered by Tether's QVAC SDK.



QVAC Study Buddy runs an LLM directly on the user's computer. No OpenAI,

Gemini, Anthropic, or other cloud AI API is used for inference.



\## Features



\- On-device AI inference

\- No API key

\- No cloud AI inference

\- Simple browser interface

\- QVAC model downloads once and is cached locally

\- Study-focused responses

\- Runs locally on Windows



\## QVAC Functions Used



This application uses:



\- `loadModel()` to load the local QVAC model

\- `completion()` to generate the AI response

\- `unloadModel()` to release the model when the server shuts down



\## SDK Version



```text

@qvac/sdk 0.19.1

