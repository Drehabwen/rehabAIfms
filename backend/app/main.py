import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from .analyzer import FrontalSquatAnalyzer
from .models import PoseFrame, SessionEnd

app = FastAPI(title="rehabAIfms analysis API", version="2.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws/squat")
async def squat_analysis(websocket: WebSocket) -> None:
    await websocket.accept()
    analyzer = FrontalSquatAnalyzer()
    try:
        while True:
            payload = await websocket.receive_text()
            try:
                decoded = json.loads(payload)
                if decoded.get("type") == "session-end-v1":
                    session = SessionEnd.model_validate(decoded)
                    await websocket.send_text(analyzer.report(session).model_dump_json())
                    continue
                frame = PoseFrame.model_validate_json(payload)
                result = analyzer.analyze(frame)
                await websocket.send_text(result.model_dump_json())
            except ValidationError as error:
                await websocket.send_json({
                    "type": "analysis-error",
                    "code": "invalid-frame",
                    "detail": error.errors(include_url=False),
                })
    except WebSocketDisconnect:
        return
