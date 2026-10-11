from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.websocket_manager import ws_manager
from app.core.security import decode_token

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{factory_id}")
async def websocket_endpoint(websocket: WebSocket, factory_id: int,
                              token: str = Query(...)):
    payload = decode_token(token)
    if not payload or payload.get("factory_id") != factory_id:
        await websocket.close(code=4001)
        return
    await ws_manager.connect(websocket, factory_id)
    try:
        import json
        await websocket.send_text(json.dumps({"type": "connected", "factory_id": factory_id}))
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, factory_id)
    except Exception:
        ws_manager.disconnect(websocket, factory_id)
