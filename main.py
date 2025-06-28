import json
import asyncio
import websockets
from vosk import Model, KaldiRecognizer

model = Model("model")
SAMPLE_RATE = 48000

async def transcribe(websocket):
    recognizer = KaldiRecognizer(model, SAMPLE_RATE)
    recognizer.SetWords(True)

    print("Client connected")
    try:
        async for message in websocket:
            print("Audio Chunk Received")
            if isinstance(message, bytes):
                if recognizer.AcceptWaveform(message):
                    result = recognizer.Result()
                    await websocket.send(result)
                else:
                    partial = recognizer.PartialResult()
                    await websocket.send(partial)
            elif isinstance(message, str):
                msg = json.loads(message)
                if msg.get("eof") == 1:
                    result = recognizer.FinalResult()
                    await websocket.send(result)
                    recognizer.Reset()
    except websockets.exceptions.ConnectionClosed:
        print("Connection closed")


async def main():
    async with websockets.serve(transcribe, "0.0.0.0", 8765):
        print("WebSocket server started on ws://0.0.0.0:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
