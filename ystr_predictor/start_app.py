# c:\projects\DNA-utils-universal\ystr_predictor\start_app.py
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=9004, reload=True)