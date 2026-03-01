#Fitted — AI-Powered Weather Outfit Recommender

Hack Illinois 36-hour project: recommend daily outfits from your wardrobe using real-time weather and AI (Gemini Vision + Pro).


[User] → React Frontend (Vite + Tailwind)
              ↓
         Express Backend (Node)
              ↓
    ┌─────────┼─────────┬──────────────────┐
    ↓         ↓         ↓                  ↓
Supabase   OpenWeather  Modal (Gemini)   Supabase
(Auth+DB)  (weather)    (Vision + Pro)   (Storage)

