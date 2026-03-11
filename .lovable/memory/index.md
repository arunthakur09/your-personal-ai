AI provider and model fallback config for Jarvis assistant

## AI Provider
- Uses **OpenRouter** with free models only (fallback chain)
- Models tried in order: llama-3.1-8b, mistral-7b, gemma-2-9b, qwen-2.5-7b, zephyr-7b (all :free variants)
- Secret: OPENROUTER_API_KEY stored in backend secrets
- Creator: Arun Thakur (admin email: arun8894194653@gmail.com)
