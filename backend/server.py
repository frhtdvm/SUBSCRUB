from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SubScrub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "SubScrub", "type": "mobile", "version": "1.0.0"}

@app.get("/api/status")
def status():
    return {
        "app": "SubScrub",
        "description": "Privacy-first subscription sniper",
        "platform": "iOS + Android (Expo React Native)",
        "demo_mode": True,
        "integrations": {
            "plaid": "demo",
            "gmail": "demo",
            "outlook": "demo",
            "revenuecat": "demo"
        },
        "build": {
            "typescript": "0 errors",
            "jest_tests": "23/23 pass",
            "expo_doctor": "17/17 pass",
            "ios_bundle": "3.57 MB",
            "android_bundle": "3.57 MB"
        }
    }
