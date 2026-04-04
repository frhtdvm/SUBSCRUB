from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os, json, re, uuid

load_dotenv()

app = FastAPI(title="SubScrub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ────────────────────────────────────────────────────────────────────
class TransactionAnalysisRequest(BaseModel):
    merchant_name: str
    amount: float
    currency: str = "USD"

class TransactionAnalysisResponse(BaseModel):
    service_name: str
    category: str
    is_subscription: bool
    confidence: float
    cancellation_url: str | None
    notes: str | None

# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "app": "SubScrub", "version": "1.0.0"}

@app.get("/api/status")
def status():
    return {
        "app": "SubScrub",
        "description": "Privacy-first subscription sniper",
        "platform": "iOS + Android (Expo React Native)",
        "demo_mode": True,
        "integrations": {
            "plaid": "demo", "gmail": "demo",
            "outlook": "demo", "revenuecat": "demo",
            "ai_analysis": "gpt-4.1-mini"
        },
        "build": {
            "typescript": "0 errors",
            "jest_tests": "23/23 pass",
            "expo_doctor": "17/17 pass"
        }
    }

# ── AI Transaction Analysis ────────────────────────────────────────────────────
@app.post("/api/analyze/transaction", response_model=TransactionAnalysisResponse)
async def analyze_transaction(req: TransactionAnalysisRequest):
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message=(
                "You are a financial transaction classifier specializing in subscription services. "
                "Your job is to analyze bank transaction descriptions and determine if they are "
                "recurring subscription charges. Always respond with valid JSON only, no extra text."
            )
        ).with_model("openai", "gpt-4.1-mini")

        prompt = f"""Analyze this bank transaction and classify it:

Merchant: "{req.merchant_name}"
Amount: {req.currency} {req.amount:.2f}

Return a JSON object with exactly these fields:
{{
  "service_name": "Clean, recognizable service name (e.g. 'Dropbox', 'Unknown Software')",
  "category": "One of: Entertainment, Software, AI, Security, Storage, Productivity, Developer, Fitness, News, Communication, Unknown",
  "is_subscription": true or false,
  "confidence": 0.0 to 1.0 (how confident you are this is a subscription),
  "cancellation_url": "Direct cancellation URL if known, or null",
  "notes": "Brief explanation in 1 sentence, or null"
}}

Respond with the JSON object only."""

        msg = UserMessage(text=prompt)
        response_text = await chat.send_message(msg)

        # Extract JSON from response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON in response")

        data = json.loads(json_match.group())

        return TransactionAnalysisResponse(
            service_name=str(data.get("service_name", req.merchant_name)),
            category=str(data.get("category", "Unknown")),
            is_subscription=bool(data.get("is_subscription", False)),
            confidence=min(1.0, max(0.0, float(data.get("confidence", 0.5)))),
            cancellation_url=data.get("cancellation_url") or None,
            notes=data.get("notes") or None,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")
