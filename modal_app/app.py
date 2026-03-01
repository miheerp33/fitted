"""
Fitted AI inference on Modal using Gemini 2.0 Flash via Google AI.
No GPU required — runs as a serverless CPU function.

Setup:       modal secret create stylecast-gemini GEMINI_API_KEY=...
Deploy:      modal deploy app.py
Serve local: modal serve app.py
"""
import base64
import json
import re

import modal

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "fastapi[standard]",
        "google-generativeai",
        "Pillow",
    )
)

app = modal.App("stylecast-ai", image=image)

_OUTERWEAR = {"jacket", "coat", "puffer", "parka", "blazer", "windbreaker", "overcoat", "trench", "vest", "hoodie", "hoody", "quarterzip", "quarter-zip", "quarter zip", "sweatshirt", "fleece", "zip-up", "zip up", "cardigan", "pullover"}
_BOTTOMS   = {"pants", "jeans", "shorts", "chinos", "trousers", "skirt", "joggers", "sweatpants", "leggings", "slacks", "denim", "cargo", "khaki", "corduroy"}
_SHOES     = {"shoe", "sneaker", "boot", "loafer", "sandal", "slipper", "heel", "oxford", "mule", "clog"}

def _categorize(item_type: str) -> str:
    t = item_type.lower()
    if any(k in t for k in _OUTERWEAR): return "outerwear"
    if any(k in t for k in _BOTTOMS):   return "bottom"
    if any(k in t for k in _SHOES):     return "shoes"
    return "top"

def _correct_warmth(category: str, warmth) -> int:
    """Sanity-correct warmthLevel based on category to fix mislabeled items."""
    try:
        w = int(warmth)
    except (TypeError, ValueError):
        w = 3
    if category == "outerwear": return max(w, 4)
    if category == "bottom":    return min(w, 3)
    if category == "shoes":     return min(w, 2)
    return max(1, min(w, 5))

def _target_warmth(weather_summary: str) -> float:
    """Convert temperature in weather summary to a target warmthLevel."""
    m = re.search(r'(\d+\.?\d*)°F', weather_summary)
    temp = float(m.group(1)) if m else 65.0
    if temp >= 90: return 1.0
    if temp >= 75: return 1.5
    if temp >= 60: return 2.5
    if temp >= 45: return 3.0
    if temp >= 30: return 3.5
    return 4.5

def _fix_outfit(selected_ids: list, slim_items: list, weather_summary: str, pinned_ids: list | None = None) -> list:
    """Guarantee the outfit always has exactly one top and one bottom. Pinned items are always included."""
    target = _target_warmth(weather_summary)
    temp_m = re.search(r'(\d+\.?\d*)°F', weather_summary)
    temp = float(temp_m.group(1)) if temp_m else 65.0

    id_to_item = {item["id"]: item for item in slim_items}
    by_cat: dict = {}
    for item in slim_items:
        by_cat.setdefault(item["category"], []).append(item)

    def best(items):
        return min(items, key=lambda x: abs(x["warmthLevel"] - target))

    # Start with pinned items so they are always in the outfit
    result: dict = {}
    for pid in (pinned_ids or []):
        item = id_to_item.get(pid)
        if item and item["category"] not in result:
            result[item["category"]] = item

    # Build per-category selection from model output, keeping only the first of each (don't overwrite pinned)
    for sid in selected_ids:
        item = id_to_item.get(sid)
        if item and item["category"] not in result:
            result[item["category"]] = item

    # Always ensure top and bottom
    if "top" not in result and by_cat.get("top"):
        result["top"] = best(by_cat["top"])
    if "bottom" not in result and by_cat.get("bottom"):
        result["bottom"] = best(by_cat["bottom"])

    # If we have outerwear (jacket, hoodie, quarter-zip, etc.), always include a top underneath (e.g. t-shirt)
    if "outerwear" in result and "top" not in result and by_cat.get("top"):
        result["top"] = best(by_cat["top"])

    # Remove outerwear in warm weather
    if temp >= 60 and "outerwear" in result:
        del result["outerwear"]

    return [item["id"] for item in result.values()]


@app.cls(image=image, secrets=[modal.Secret.from_name("stylecast-gemini")])
class StylecastAPI:
    @modal.enter()
    def setup(self):
        import os
        import google.generativeai as genai

        genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    def _infer(self, parts: list, max_tokens: int = None, json_mode: bool = False) -> str:
        config = {}
        if max_tokens is not None:
            config["max_output_tokens"] = max_tokens
        if json_mode:
            config["response_mime_type"] = "application/json"
        response = self.model.generate_content(
            parts,
            generation_config=config or None,
        )
        return response.text

    def _parse_json(self, text: str) -> dict:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                return json.loads(match.group())
            raise

    @modal.asgi_app()
    def web(self):
        from fastapi import FastAPI, HTTPException
        from pydantic import BaseModel

        web_app = FastAPI(title="Fitted AI")

        class AnalyzeRequest(BaseModel):
            image_base64: str
            mime_type: str = "image/jpeg"

        STYLE_DESCRIPTIONS = {
            "gen-z-college": "Gen-Z College — oversized hoodies, baggy cargos or wide-leg jeans, chunky sneakers, muted/earthy tones, relaxed silhouettes",
            "frat-prep": "Frat / Preppy — polo shirts, chinos, boat shoes or loafers, pastel or classic colors, clean-cut and put-together",
            "alt-indie": "Alt / Indie — vintage or thrifted pieces, band tees, dark layering, chunky boots (e.g. Doc Martens), interesting textures and patterns",
            "streetwear": "Streetwear — graphic tees, joggers or baggy jeans, statement sneakers, caps, bold logos, urban edge",
            "smart-casual": "Smart Casual — fitted button-downs or henleys, dark jeans or chinos, clean leather sneakers or loafers, polished but relaxed",
            "athleisure": "Athleisure — athletic-inspired but stylish: fitted sweats, leggings, performance tops, sleek sneakers, put-together sport look",
            "classic": "Classic / Minimalist — neutral basics (black, white, navy, grey), tailored cuts, clean lines, timeless pieces that never go out of style",
        }

        class RecommendRequest(BaseModel):
            weather_summary: str
            wardrobe_items: list[dict]
            occasion: str | None = None
            location: str | None = None
            style: str | None = None
            recent_feedback: list[dict] | None = None
            pinned_ids: list[str] | None = None
            recent_liked_item_ids: list[str] | None = None

        class MoodboardRequest(BaseModel):
            outfit_items: list[dict]
            weather_context: str = ""

        @web_app.post("/analyze_clothing")
        def analyze_clothing(body: AnalyzeRequest):
            try:
                image_bytes = base64.b64decode(body.image_base64)
                parts = [
                    {"mime_type": body.mime_type, "data": image_bytes},
                    (
                        "Analyze this clothing item photo. Respond with ONLY a valid JSON object "
                        "(no markdown, no code block) with these exact keys:\n"
                        '- itemType: string (e.g. "crewneck sweater", "puffer jacket", "chinos")\n'
                        '- styleTags: array of strings (e.g. ["casual", "cozy", "minimal"])\n'
                        "- warmthLevel: integer 1-5 using this exact scale:\n"
                        "    1 = very light: tank tops, shorts, sandals, sleeveless items\n"
                        "    2 = light: t-shirts, polos, light pants, light dresses\n"
                        "    3 = medium: long-sleeve shirts, jeans, sweaters, light hoodies\n"
                        "    4 = warm: thick hoodies, sweatshirts, fleece, light jackets\n"
                        "    5 = heavy: winter coats, puffer jackets, parkas, heavy outerwear\n"
                        '- dominantColors: array of 1-3 color strings (e.g. ["navy", "white"])\n'
                        "Be concise and accurate."
                    ),
                ]
                text = self._infer(parts, json_mode=True)
                return self._parse_json(text)
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @web_app.post("/recommend_outfit")
        def recommend_outfit(body: RecommendRequest):
            try:
                style_desc = STYLE_DESCRIPTIONS.get(body.style, body.style) if body.style else None
                slim_items = []
                for item in body.wardrobe_items:
                    # Backend sends flat { id, itemType, styleTags, warmthLevel, dominantColors } or nested tags
                    tags = item.get("tags") or {}
                    item_type = item.get("itemType") or tags.get("itemType") or "unknown"
                    cat = item.get("category") or _categorize(item_type)
                    style_tags = item.get("styleTags") or tags.get("styleTags") or []
                    slim_items.append({
                        "id": item["id"],
                        "category": cat,
                        "itemType": item_type,
                        "styleTags": style_tags if isinstance(style_tags, list) else [],
                        "warmthLevel": _correct_warmth(cat, item.get("warmthLevel") or tags.get("warmthLevel")),
                        "dominantColors": item.get("dominantColors") or tags.get("dominantColors") or [],
                    })
                occasion = (body.occasion or "").strip().lower()
                occasion_rules = ""
                if occasion == "workout":
                    occasion_rules = (
                        "\n**OCCASION = WORKOUT. Follow strictly:**\n"
                        "- Prefer items with styleTags like 'athletic', 'sporty', 'workout', 'performance', 'activewear'.\n"
                        "- Do NOT choose: jeans, varsity jacket, quarter-zip, blazer, chinos, loafers, or anything casual/formal.\n"
                        "- Choose: athletic tops (tee, tank, performance shirt), athletic bottoms (joggers, shorts, leggings), sneakers if available.\n"
                        "- If the wardrobe has no athletic items, say so in the explanation and pick the closest (e.g. minimal tee + shorts).\n\n"
                    )
                elif occasion == "interview":
                    occasion_rules = (
                        "\n**OCCASION = INTERVIEW. Follow strictly:**\n"
                        "- Prefer items with styleTags like 'smart', 'formal', 'professional', 'classic'.\n"
                        "- Prefer: button-down, blazer, chinos, loafers, dress shoes. Avoid: graphic tees, hoodies, shorts, sandals.\n\n"
                    )
                elif occasion == "date":
                    occasion_rules = (
                        "\n**OCCASION = DATE.** Prefer slightly dressier, cohesive pieces; avoid gym-only or sloppy casual.\n\n"
                    )
                elif occasion == "class":
                    occasion_rules = (
                        "\n**OCCASION = CLASS.** Comfortable but put-together; casual or smart-casual is fine.\n\n"
                    )
                feedback_block = ""
                if body.recent_feedback and len(body.recent_feedback) > 0:
                    lines = [
                        "**Recent feedback from this user (avoid repeating these mistakes):**",
                    ]
                    for fb in body.recent_feedback[:6]:
                        occ = fb.get("occasion") or "general"
                        reason = fb.get("reason") or ""
                        if reason:
                            lines.append(f"- When occasion was '{occ}', they said: \"{reason}\"")
                    if len(lines) > 1:
                        feedback_block = "\n\n" + "\n".join(lines) + "\n\n"
                liked_block = ""
                if body.recent_liked_item_ids and len(body.recent_liked_item_ids) > 0:
                    liked_block = (
                        "\n**User liked outfits that included these item IDs — when they fit the weather and occasion, prefer including some of these:** "
                        + ", ".join(body.recent_liked_item_ids[:15])
                        + "\n\n"
                    )
                pinned_block = ""
                if body.pinned_ids and len(body.pinned_ids) > 0:
                    pinned_block = (
                        "\n**MUST INCLUDE (user pinned these):** The following item IDs MUST be in your selectedIds. "
                        f"Build the rest of the outfit around them: {body.pinned_ids}\n\n"
                    )
                prompt = (
                    "You are a personal stylist. Select a complete, weather-appropriate outfit.\n\n"
                    f"Weather: {body.weather_summary}\n"
                    + liked_block
                    + pinned_block
                    + feedback_block
                    + (f"Personal style: {style_desc}\n" if style_desc else "")
                    + (f"Occasion: {body.occasion}\n" if body.occasion else "")
                    + occasion_rules
                    + "\nwarmthLevel meanings:\n"
                    "  1 = very light (tank tops, shorts, sandals)\n"
                    "  2 = light (t-shirts, polos, light pants)\n"
                    "  3 = medium (long sleeves, jeans, sweaters)\n"
                    "  4 = warm (hoodies, fleece, light jackets)\n"
                    "  5 = heavy (coats, puffers, parkas)\n\n"
                    "Target warmthLevel by temperature — use the CLOSEST available item, don't skip an outfit:\n"
                    "  90°F+  → tops: 1,   bottoms: 1.   No outerwear.\n"
                    "  75–90°F → tops: 1-2, bottoms: 1-2. No outerwear.\n"
                    "  60–75°F → tops: 2-3, bottoms: 2-3. No outerwear.\n"
                    "  45–60°F → tops: 3,   bottoms: 3.   Outerwear: 4 optional.\n"
                    "  30–45°F → tops: 3-4, bottoms: 3.   Outerwear: 4-5 required.\n"
                    "  below 30°F → tops: 4, bottoms: 3.  Outerwear: 5 required.\n\n"
                    f"Wardrobe (each item has a category field):\n{json.dumps(slim_items, indent=2)}\n\n"
                    "Selection rules — follow exactly:\n"
                    "1. If an occasion was specified, it overrides: pick items that match the occasion first, then weather.\n"
                    "2. Choose exactly ONE item with category='top' (t-shirt, tee, long sleeve, etc. — this is the base layer).\n"
                    "3. Choose exactly ONE item with category='bottom'\n"
                    "4. Choose at most ONE item with category='outerwear', only if temp < 60°F (and if occasion allows outerwear). Jackets, hoodies, quarter-zips, and sweatshirts are outerwear — they go OVER a top. When you pick outerwear you MUST also pick a top to wear underneath.\n"
                    "5. Choose at most ONE item with category='shoes' if available\n"
                    "6. Do NOT select items outside these four categories\n"
                    "7. Use each item's styleTags to decide if it fits the occasion (e.g. athletic/sporty for workout).\n"
                    "8. Always return an outfit — if no perfect match exists, pick the closest and explain in explanation.\n\n"
                    "Respond with JSON:\n"
                    "- selectedIds: array of the chosen item IDs\n"
                    "- explanation: 1–2 sentences on why this outfit fits the occasion (if given) and the weather"
                )
                text = self._infer([prompt], json_mode=True)
                result = self._parse_json(text)
                result["selectedIds"] = _fix_outfit(
                    result.get("selectedIds", []),
                    slim_items,
                    body.weather_summary,
                    pinned_ids=body.pinned_ids or None,
                )
                return result
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @web_app.post("/moodboard_prompt")
        def moodboard_prompt(body: MoodboardRequest):
            try:
                styles = []
                colors = []
                for item in body.outfit_items:
                    tags = item.get("tags") or {}
                    styles.extend(tags.get("styleTags") or [])
                    colors.extend(tags.get("dominantColors") or [])
                style_str = ", ".join(styles) or "casual"
                color_str = ", ".join(list(dict.fromkeys(colors))[:3]) or "neutral"
                prompt = (
                    f"Generate a short, aesthetic image prompt (one sentence, under 15 words) "
                    f"for a mood board background. Style: {style_str}. Colors: {color_str}. "
                    f"Weather vibe: {body.weather_context or 'neutral'}. No text in the image. "
                    "Output ONLY the prompt, nothing else."
                )
                text = self._infer([prompt], max_tokens=200)
                return {"prompt": text.strip() or "minimal fashion mood board background"}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        return web_app
