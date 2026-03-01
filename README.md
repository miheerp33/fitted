# 🌤️ Fitted — AI-Powered Weather Outfit Recommender

Hack Illinois 36-hour project: recommend daily outfits from your wardrobe using real-time weather and AI (Gemini Vision + Pro).

---

## How to run (detailed)

Follow these steps in order. You’ll need: a Supabase project, a Google AI (Gemini) API key, and an OpenWeatherMap API key.

---

### Step 1: Get your API keys

You need three things before editing any code.

#### 1a. Google AI (Gemini) API key

1. Go to **[Google AI Studio](https://aistudio.google.com/apikey)** and sign in.
2. Click **Create API key** (or use an existing project).
3. Copy the key (it looks like `AIza...`). You’ll add it to a **Modal secret** in the Modal setup step (AI inference runs on Modal, not in the backend).

#### 1b. OpenWeatherMap API key

1. Go to **[OpenWeatherMap](https://openweathermap.org/api)** and sign up (free).
2. In the dashboard, open **API keys** and copy your default key (or create one).
3. You’ll put this in the **backend** `.env` as `OPENWEATHER_API_KEY`.

#### 1c. Supabase (you’ll get URL and keys in Step 2)

You’ll copy these from the Supabase dashboard after creating the project.

---

### Step 2: Set up Supabase

#### 2a. Create a Supabase project

1. Go to **[supabase.com](https://supabase.com)** and sign in.
2. Click **New project**.
3. Pick an organization, name the project (e.g. `stylecast`), set a database password (save it somewhere safe), choose a region, then click **Create new project**.
4. Wait until the project is ready (green checkmark).

#### 2b. Create the database table and RLS

1. In the left sidebar, open **SQL Editor**.
2. Click **New query**.
3. Open the file `supabase/schema.sql` in this repo and copy its **entire** contents.
4. Paste into the Supabase SQL Editor and click **Run** (or press Cmd/Ctrl+Enter).
5. You should see “Success. No rows returned.” That means the `wardrobe_items` table and RLS policies are created.

#### 2c. Create the storage bucket for clothing images

1. In the left sidebar, open **Storage**.
2. Click **New bucket**.
3. **Name:** `wardrobe`.
4. Turn **Public bucket** **ON** (so the app can show image URLs).
5. Click **Create bucket**.

#### 2d. Add storage policies (so users can upload and everyone can read)

1. In **Storage**, click the **wardrobe** bucket.
2. Click **Policies** (or the shield icon).
3. Click **New policy** → **For full customization** (or “Create policy”).
4. **Policy name:** `Public read`.
   - **Allowed operation:** `SELECT` (read).
   - **Target roles:** leave default.
   - **USING expression:** `true`.
   - Save.
5. Add another policy: **New policy** → **For full customization**.
   - **Policy name:** `Authenticated upload`.
   - **Allowed operation:** `INSERT`.
   - **WITH CHECK expression:**  
     `(bucket_id = 'wardrobe') AND ((storage.foldername(name))[1] = (auth.uid())::text)`  
   - Save.

(If your Supabase UI uses “Policy definition” instead of expressions, equivalent: allow `INSERT` when the path starts with the user’s ID.)

#### 2e. Copy Supabase URL and keys

1. In the left sidebar, go to **Settings** (gear) → **API**.
2. Copy and save:
   - **Project URL** → use as `SUPABASE_URL` in the backend and `VITE_SUPABASE_URL` in the frontend.
   - **anon public** key → `SUPABASE_ANON_KEY` (backend) and `VITE_SUPABASE_ANON_KEY` (frontend).
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (backend only; keep this secret).

---

### Step 2.5: Set up Modal (AI inference)

All Gemini inference runs on [Modal](https://modal.com). The backend calls your deployed Modal app over HTTP.

1. **Install Modal and log in** (one-time):
   ```bash
   pip install modal
   modal token new
   ```

2. **Create the Gemini secret** (use the key from Step 1a):
   ```bash
   modal secret create stylecast-gemini GEMINI_API_KEY=your_gemini_api_key
   ```
   Optional: use a specific model, e.g. `GEMINI_MODEL=gemini-2.5-flash`.

3. **Deploy the Modal app**:
   ```bash
   cd modal_app
   modal deploy app.py
   ```
   Copy the URL Modal prints (e.g. `https://your-workspace--stylecast-ai-stylecast-api.modal.run`).

4. In **backend/.env** set:
   ```
   MODAL_AI_URL=https://your-workspace--stylecast-ai-stylecast-api.modal.run
   ```
   (Use your actual URL from step 3.)

See **modal_app/README.md** for more detail and for local dev with `modal serve`.

---

### Step 3: Run the backend

The backend is a Node.js (Express) server. It talks to Gemini, OpenWeatherMap, and Supabase.

1. Open a terminal and go to the project folder:
   ```bash
   cd /Users/davidkang/HackIllinois
   ```

2. Go into the backend folder and install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Create the environment file:
   ```bash
   cp .env.example .env
   ```

4. Open `backend/.env` in your editor and fill in every value (no quotes needed around values):

   | Variable | Where to get it |
   |----------|------------------|
   | `PORT` | Leave as `3001` (or another port if you prefer). |
   | `FRONTEND_URL` | Leave as `http://localhost:5173` for local dev. |
   | `MODAL_AI_URL` | From Step 2.5 (URL printed by `modal deploy`). |
   | `OPENWEATHER_API_KEY` | From Step 1b. |
   | `SUPABASE_URL` | From Step 2e (Project URL). |
   | `SUPABASE_ANON_KEY` | From Step 2e (anon public key). |
   | `SUPABASE_SERVICE_ROLE_KEY` | From Step 2e (service_role key). |

   Example (with fake values):
   ```
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   MODAL_AI_URL=https://your-workspace--stylecast-ai-stylecast-api.modal.run
   OPENWEATHER_API_KEY=abc123...
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

5. Start the backend:
   ```bash
   npm run dev
   ```
   You should see something like: `Fitted API running on http://localhost:3001`.

6. In another terminal, check that it’s up:
   ```bash
   curl http://localhost:3001/health
   ```
   You should get `{"ok":true}`. Leave this terminal running.

---

### Step 4: Run the frontend

The frontend is a React + Vite app. It will talk to your backend (and to Supabase for auth).

1. Open a **new** terminal (keep the backend running in the first one).

2. Go to the project folder and into the frontend:
   ```bash
   cd /Users/davidkang/HackIllinois
   cd frontend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create the environment file:
   ```bash
   cp .env.example .env
   ```

5. Open `frontend/.env` and set:

   | Variable | Value |
   |----------|--------|
   | `VITE_SUPABASE_URL` | Same as backend `SUPABASE_URL` (from Step 2e). |
   | `VITE_SUPABASE_ANON_KEY` | Same as backend `SUPABASE_ANON_KEY` (from Step 2e). |
   | `VITE_API_URL` | For local dev you can leave this **empty** or set to `http://localhost:3001`. The Vite dev server proxies `/api` to the backend when `VITE_API_URL` is not set. |

   Example:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   VITE_API_URL=http://localhost:3001
   ```

6. Start the frontend:
   ```bash
   npm run dev
   ```
   You should see something like: `Local: http://localhost:5173/`.

7. Open a browser and go to **http://localhost:5173**.

---

### Step 5: Use the app

1. **Sign up**
   - On the login page, click “Need an account? Sign up”.
   - Enter email and password (e.g. a test email) and click **Sign up**.
   - You should be redirected to the **Wardrobe** page.

2. **Add clothing**
   - Click **Add clothing photo** and choose a photo of a clothing item (e.g. a shirt or jacket).
   - Wait a few seconds. The app will send the image to the backend → Gemini Vision will tag it → the item will appear in your wardrobe with tags (type, style, warmth).
   - Add a few more items so the recommender has options.

3. **Get a recommendation**
   - Open **Today’s Outfit** in the nav.
   - Optionally enter a **City** (e.g. `Champaign`) or allow location so the app can use GPS.
   - Optionally choose an **Occasion** (e.g. Class, Casual).
   - Click **Get today’s outfit**.
   - You should see the current weather and a mood board with selected items and an AI explanation.

---

### Troubleshooting

- **“Supabase not configured”**  
  Frontend: make sure `frontend/.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and that you restarted `npm run dev` after changing `.env`.

- **“GEMINI_API_KEY not set” or “OPENWEATHER_API_KEY not set”**  
  Backend: check `backend/.env` and restart `npm run dev`.

- **Upload fails or “Storage upload failed”**  
  Supabase: confirm the `wardrobe` bucket exists, is public, and the “Authenticated upload” policy is added as in Step 2d.

- **401 on API calls**  
  Make sure you’re logged in. If you just signed up, refresh once; the app should then send the Supabase session token to the backend.

- **Recommendation fails with “No wardrobe items”**  
  Add at least a couple of clothing photos from the Wardrobe page first.

- **CORS or “Failed to fetch”**  
  Backend must be running on the port in `FRONTEND_URL` (e.g. `http://localhost:5173`). Restart the backend after changing `.env`.

---

## API keys (reference)

- **Google AI (Gemini):** [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **OpenWeatherMap:** [openweathermap.org/api](https://openweathermap.org/api) (free tier)
- **Supabase:** Project **Settings → API** in your Supabase dashboard

## Project structure

- `frontend/` — React + Vite + Tailwind (wardrobe UI, login, recommendation + mood board)
- `backend/` — Express API: upload → Gemini Vision → Supabase; recommend → weather + Gemini Pro; mood board prompt
- `supabase/schema.sql` — tables and RLS for `wardrobe_items`

## Features

- **Wardrobe:** Upload photos → AI tags (type, style, warmth, colors) → stored in Supabase
- **Today's outfit:** Weather (GPS or city) + optional occasion → Gemini picks items + explanation
- **Mood board:** Selected items on a generated-style background with AI explanation

---

## Pushing to your repository

1. **Create a new repo** on GitHub (or GitLab, etc.). Do **not** initialize it with a README (you already have one).

2. **In your project folder**, run (use your repo URL):
   ```bash
   cd /path/to/HackIllinois
   git init
   git add .
   git commit -m "Initial commit: Fitted app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name. Use the SSH URL if you prefer: `git@github.com:YOUR_USERNAME/YOUR_REPO.git`.

3. **`.env` files are in `.gitignore`** — they won’t be committed. Teammates (or you on another machine) copy `.env.example` to `.env` and fill in their own keys.

Good luck at Hack Illinois. 🚀
