# Fitted AI on Modal

All AI inference runs on Modal using **Qwen2-VL-7B-Instruct** on an A10G GPU.
No external AI API key is required — the model runs directly on Modal's infrastructure.

## Setup

1. **Install Modal and log in** (one-time):
   ```bash
   pip install modal
   modal token new
   ```
   Follow the prompts to log in (use the account that has your Modal credits).

2. **Deploy the app**:
   ```bash
   cd modal_app
   modal deploy app.py
   ```
   Modal will print a URL like:
   `https://your-workspace--stylecast-ai-stylecasts-web.modal.run`

3. **Set the URL in the backend**:
   In `backend/.env` set:
   ```
   MODAL_AI_URL=https://your-workspace--stylecast-ai-stylecasts-web.modal.run
   ```
   (Use the exact URL from step 2.)

## Local dev (optional)

Run the Modal app locally with a temporary URL:
```bash
modal serve app.py
```
Use the printed URL as `MODAL_AI_URL` in `backend/.env` while developing.

## Model

- **Model:** `Qwen/Qwen2-VL-7B-Instruct` — multimodal (vision + text), downloaded from HuggingFace Hub on first cold start
- **GPU:** A10G (24 GB VRAM)
- **Idle timeout:** 5 minutes (container stays warm between requests)

## Endpoints

- `POST /analyze_clothing` — body: `{ image_base64, mime_type }` → tags JSON
- `POST /recommend_outfit` — body: `{ weather_summary, wardrobe_items, occasion? }` → `{ selectedIds, explanation }`
- `POST /moodboard_prompt` — body: `{ outfit_items, weather_context }` → `{ prompt }`
