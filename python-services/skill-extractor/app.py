import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from gliner import GLiNER
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("skill-extractor")

app = FastAPI(title="Nexus Skill Extractor Service")

# Load model - fallback to a fast small model if env not set
MODEL_NAME = os.getenv("GLINER_MODEL", "urchade/gliner_medium-v2.1")
logger.info(f"Loading GLiNER2 model: {MODEL_NAME}")
# Use a global instance
try:
    model = GLiNER.from_pretrained(MODEL_NAME)
    logger.info("Model loaded successfully.")

except Exception as e:
    logger.error(f"Failed to load GLiNER model: {e}")
    # Fallback to a very small one if the specific medium one fails/OOMs
    model = GLiNER.from_pretrained("urchade/gliner_small-v2.1")

class ExtractionRequest(BaseModel):
    text: str

class SkillMention(BaseModel):
    text: str
    confidence: float
    start: int
    end: int
    label: str

class ExtractionResponse(BaseModel):
    skills: list[SkillMention]

# Strict engineering entity labels
LABELS = ["Programming Language", "Framework", "Software Tool", "Soft Skill", "Database", "Cloud Service", "Technology Concept"]

@app.post("/extract", response_model=ExtractionResponse)
def extract_skills(request: ExtractionRequest):
    logger.info(f"Extracting skills from text of length {len(request.text)}")
    entities = model.predict_entities(request.text, LABELS, threshold=0.5)
    
    skills = []
    for ent in entities:
        skills.append({
            "text": ent["text"],
            "confidence": ent["score"],
            "start": ent["start"],
            "end": ent["end"],
            "label": ent["label"]
        })
        
    return {"skills": skills}

@app.get("/health")
def health_check():
    return {"status": "ok", "model": MODEL_NAME}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from gliner import GLiNER
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("skill-extractor")

app = FastAPI(title="Nexus Skill Extractor Service")

# Load model - fallback to a fast small model if env not set
MODEL_NAME = os.getenv("GLINER_MODEL", "urchade/gliner_medium-v2.1")
logger.info(f"Loading GLiNER2 model: {MODEL_NAME}")
# Use a global instance
try:
    model = GLiNER.from_pretrained(MODEL_NAME)
    logger.info("Model loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load GLiNER model: {e}")
    # Fallback to a very small one if the specific medium one fails/OOMs
    model = GLiNER.from_pretrained("urchade/gliner_small-v2.1")

class ExtractionRequest(BaseModel):
    text: str

class SkillMention(BaseModel):
    text: str
    confidence: float
    start: int
    end: int
    label: str

class ExtractionResponse(BaseModel):
    skills: list[SkillMention]

# Strict engineering entity labels
LABELS = ["Programming Language", "Framework", "Software Tool", "Soft Skill", "Database", "Cloud Service", "Technology Concept"]

@app.post("/extract", response_model=ExtractionResponse)
def extract_skills(request: ExtractionRequest):
    logger.info(f"Extracting skills from text of length {len(request.text)}")
    entities = model.predict_entities(request.text, LABELS, threshold=0.5)
    
    skills = []
    for ent in entities:
        skills.append({
            "text": ent["text"],
            "confidence": ent["score"],
            "start": ent["start"],
            "end": ent["end"],
            "label": ent["label"]
        })
        
    return {"skills": skills}

@app.get("/health")
def health_check():
    return {"status": "ok", "model": MODEL_NAME}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
