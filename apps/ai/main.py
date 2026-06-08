from fastapi import FastAPI
from pydantic import BaseModel
import random

app = FastAPI(title="Tandoor AI Service")

class DemandForecastRequest(BaseModel):
    branch_id: str
    days: int = 7

class RecommendationRequest(BaseModel):
    user_id: str
    n: int = 5

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/forecast")
def forecast(req: DemandForecastRequest):
    """Predict daily order volume using a simple heuristic."""
    base = random.randint(50, 150)
    days = []
    for i in range(req.days):
        days.append({
            "day": f"Day {i+1}",
            "predicted_orders": base + random.randint(-20, 30),
            "confidence": 0.85,
        })
    return {"branch_id": req.branch_id, "forecast": days}

@app.post("/recommend")
def recommend(req: RecommendationRequest):
    """Product recommendations for a user."""
    items = [
        {"product_id": "prod-1", "name": "Classic Burger", "score": 0.92},
        {"product_id": "prod-2", "name": "Pepperoni Pizza", "score": 0.88},
        {"product_id": "prod-3", "name": "Chicken Wings", "score": 0.84},
        {"product_id": "prod-4", "name": "Loaded Fries", "score": 0.79},
        {"product_id": "prod-5", "name": "Milkshake", "score": 0.75},
    ]
    return {"user_id": req.user_id, "recommendations": items[:req.n]}

@app.post("/sentiment")
def sentiment(text: str):
    """Simple sentiment score for a review."""
    positive = ["good", "great", "excellent", "amazing", "love", "best"]
    negative = ["bad", "terrible", "worst", "hate", "slow", "cold"]
    score = 0.5
    lower = text.lower()
    for w in positive:
        if w in lower: score += 0.15
    for w in negative:
        if w in lower: score -= 0.15
    score = max(0, min(1, score))
    label = "positive" if score > 0.6 else "negative" if score < 0.4 else "neutral"
    return {"score": round(score, 2), "label": label}
