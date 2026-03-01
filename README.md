# Fitted — AI-Powered Weather Outfit Recommender

Hack Illinois 36-hour project: recommend daily outfits from your wardrobe using real-time weather and AI (Gemini Vision + Pro).

## Architecture

```
[User] → React Frontend (Vite + Tailwind)
                  ↓
         Express Backend (Node)
                  ↓
   ┌──────────┬──────────┬──────────────┐
   ↓          ↓          ↓              ↓
Supabase   OpenWeather  Modal       Supabase
(Auth+DB)  (Weather)   (Gemini)    (Storage)
                      Vision + Pro
```
