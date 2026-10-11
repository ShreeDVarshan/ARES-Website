from typing import Dict, List
from fastapi import WebSocket
import json


class ConnectionManager:
    def __init__(self):
        self._factory_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, factory_id: int):
        await websocket.accept()
        if factory_id not in self._factory_connections:
            self._factory_connections[factory_id] = []
        self._factory_connections[factory_id].append(websocket)

    def disconnect(self, websocket: WebSocket, factory_id: int):
        if factory_id in self._factory_connections:
            try:
                self._factory_connections[factory_id].remove(websocket)
            except ValueError:
                pass

    async def broadcast_to_factory(self, factory_id: int, message: dict):
        connections = list(self._factory_connections.get(factory_id, []))
        disconnected = []
        for ws in connections:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws, factory_id)

    def get_connection_count(self, factory_id: int) -> int:
        return len(self._factory_connections.get(factory_id, []))


ws_manager = ConnectionManager()
