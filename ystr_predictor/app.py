# c:\projects\DNA-utils-universal\ystr_predictor\app.py
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
from typing import Dict
import logging
from pathlib import Path
from models.tree_predictor import TreeHaploPredictor

logging.basicConfig(level=logging.INFO)

Path("static").mkdir(exist_ok=True)
Path("models/saved").mkdir(exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

class Markers(BaseModel):
    markers: Dict[str, int]

predictor = TreeHaploPredictor()

try:
    predictor.load_model()
    logging.info("Model loaded successfully")
except Exception as e:
    logging.warning(f"Could not load model: {str(e)}")

@app.post("/api/predict")
async def predict(data: Markers):
    if not predictor.is_trained:
        raise HTTPException(status_code=400, detail="Model not trained")

    try:
        predictions = predictor.predict(pd.DataFrame([data.markers]))
        return predictions[0]
    except Exception as e:
        logging.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/train/csv")
async def train_from_csv(file: UploadFile):
    try:
        content = await file.read()
        with open("temp.csv", "wb") as f:
            f.write(content)
        
        df = pd.read_csv("temp.csv", sep=';', low_memory=False)
        
        def process_value(val):
            try:
                if pd.isna(val):
                    return None
                if isinstance(val, (int, float)):
                    return float(val)
                if '-' in str(val):
                    return float(str(val).split('-')[0])
                return float(val)
            except:
                return None

        # Обрабатываем только числовые маркеры
        for col in df.columns:
            if col != 'Haplogroup':
                df[col] = df[col].apply(process_value)

        df = df.dropna()
        X = df.drop('Haplogroup', axis=1)
        y = df['Haplogroup']

        logging.info(f"Data loaded: {len(df)} samples")
        logging.info(f"Markers: {', '.join(X.columns[:5])}...")
        logging.info(f"Unique haplogroups: {len(y.unique())}")

        # Обучаем дерево
        await predictor.train(X, y)
        predictor.save_model()

        return {
            "message": "Model trained successfully",
            "samples": len(df),
            "haplogroups": len(y.unique()),
            "markers": len(X.columns)
        }

    except Exception as e:
        logging.error(f"Training error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))