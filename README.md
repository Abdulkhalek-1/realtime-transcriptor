# Realtime Transcriptor

A real-time speech-to-text transcription system using a Python WebSocket server powered by [Vosk](https://alphacephei.com/vosk/), and a modern browser-based client using [Vite](https://vitejs.dev/) and vanilla JavaScript.

Supports Multiple languages based on the used model. Designed for low-latency and efficient bandwidth usage with silence detection on the client side.

---

## 🗂 Project Structure

```

./
├── client/                     # Vite-based client
│   ├── index.html              # Entry HTML file
│   ├── package.json            # Vite + dependencies
│   ├── package-lock.json
│   └── src/
│       ├── main.js             # App entrypoint
│       └── style.css           # App styling
├── main.py                     # Python WebSocket server (Vosk-based)
├── pyproject.toml              # Python dependency spec
├── uv.lock                     # Lock file (e.g., for uv or pip)
├── README.md

````

---

## ⚙️ Installation Guide

### 1. Clone the Repo

```bash
git clone https://github.com/Abdulkhalek-1/realtime-transcriptor.git
cd realtime-transcriptor
````

### 2. Install Python Dependencies

It's recommended to use uv:

```bash
pip install uv
uv sync
```

### 3. Download and Prepare Vosk Model

Models are **not included** due to their size. Download a suitable model for your language from the official Vosk models page:

* **Arabic (small):**
  [https://alphacephei.com/vosk/models/vosk-model-small-ar-0.22.zip](https://alphacephei.com/vosk/models/vosk-model-small-ar-0.22.zip)

* **English (small):**
  [https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip](https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip)

* **English (large, more accurate):**
  [https://alphacephei.com/vosk/models/vosk-model-en-us-0.42-gigaspeech.zip](https://alphacephei.com/vosk/models/vosk-model-en-us-0.42-gigaspeech.zip)

After downloading, extract the model zip to a folder named `model` inside your project root:

```bash
unzip ./<your-model-name>
mv ./<your-model-name> ./model
```

---

## 💻 Running the Server

```bash
uv run main.py
```

The server will start listening on WebSocket `ws://localhost:8765`.

---

## 🖥️ Running the Client (Vite App)

```bash
cd client
npm install
npm run dev
```

Open your browser at the URL printed by Vite (usually `http://localhost:5173`).

---

## 🔍 Why This Design?

### ❓ Why EOF Handling in Server?

The server calls `recognizer.FinalResult()` when a client disconnects to finalize the last transcribed sentence. This ensures no spoken words are lost due to streaming buffering.

### ❓ Why Silence Detection in Client?

To reduce bandwidth and improve transcription segmentation:

* The client detects silence by monitoring audio levels.
* When silence is detected for more than 1 second, the client disconnects and reconnects the WebSocket.
* This triggers the server to finalize and send the last transcription segment.
* This approach keeps server logic simple and offloads smart behavior to the client.

---

## 📄 License

MIT License — feel free to use and modify.

---

## 🙌 Acknowledgments

* [Vosk Speech Recognition](https://alphacephei.com/vosk/)
* [Vite](https://vitejs.dev/)
* [HTML5 Web Audio API](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs)
