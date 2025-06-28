import "./style.css";

// ======= Configuration =======
const WS_URL = "ws://localhost:8765";
const VAD_THRESHOLD = 0.015; // Voice activity detection threshold
const HANGOVER_FRAMES = 3; // Number of extra frames to send after speech ends
const FRAME_BUFFER_SIZE = 20; // How many pre-speech frames to buffer

// ======= State =======
let socket = null;
let audioContext = null;
let processor = null;
let source = null;
let isRecording = false;
let vadState = false; // True when in “speech” segment
let hangover = 0; // Remaining silent frames to send after speech
const frameBuffer = []; // Circular buffer for pre-speech frames

// ======= UI Elements =======
const partialTextEl = document.getElementById("partialText");
const statusEl = document.getElementById("status");
const startStopBtn = document.getElementById("startStopBtn");

// ======= Utility Functions =======

/**
 * Compute root-mean-square energy of a frame to detect speech.
 */
function isSpeech(frame) {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    sum += frame[i] * frame[i];
  }
  const rms = Math.sqrt(sum / frame.length);
  return rms > VAD_THRESHOLD;
}

/**
 * Convert Float32 PCM [-1..1] samples to 16-bit PCM.
 */
function floatTo16BitPCM(input) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

// ======= Core Recording Logic =======

async function startRecording() {
  try {
    // Open WebSocket to Vosk server
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      statusEl.textContent = "Status: Connected and recording...";
      startStopBtn.textContent = "Stop Recording";
      isRecording = true;
    };

    socket.onerror = (e) => {
      statusEl.textContent = "Error: Unable to connect to server.";
      console.error("WebSocket error", e);
    };

    socket.onclose = () => {
      statusEl.textContent = "Status: Disconnected.";
      stopAudio();
      isRecording = false;
      startStopBtn.textContent = "Start Recording";
    };

    // Handle partial and final transcripts
    socket.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.text) {
        // Final text: append to container
        const div = document.createElement("div");
        div.textContent = msg.text;
        div.style.marginBottom = "10px";
        div.style.fontSize = "1.3rem";
        div.style.color = "#111";
        document.getElementById("finalContainer").appendChild(div);
        partialTextEl.textContent = "";
      } else if (msg.partial) {
        // Partial interim result
        partialTextEl.textContent = msg.partial;
      }
    };

    // Set up audio capture at 48 kHz cuz its more compatible
    audioContext = new window.AudioContext({
      sampleRate: 48000,
    });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    source = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);

    // Connect nodes: microphone → processor → speakers (silent)
    source.connect(processor);
    processor.connect(audioContext.destination);

    // On each audio frame...
    processor.onaudioprocess = (e) => {
      if (!isRecording) return;
      const input = e.inputBuffer.getChannelData(0);
      const speech = isSpeech(input);

      // Maintain circular frame buffer
      frameBuffer.push(input.slice());
      if (frameBuffer.length > FRAME_BUFFER_SIZE) frameBuffer.shift();

      if (speech) {
        if (!vadState) {
          // Speech just started: flush buffered frames
          vadState = true;
          for (const buf of frameBuffer) {
            socket.send(floatTo16BitPCM(buf).buffer);
          }
          frameBuffer.length = 0;
        }
        // Send current speech frame
        socket.send(floatTo16BitPCM(input).buffer);
        hangover = HANGOVER_FRAMES;
      } else if (vadState && hangover > 0) {
        // In hangover: keep sending a few more frames
        socket.send(floatTo16BitPCM(input).buffer);
        hangover--;
      } else if (vadState && hangover === 0) {
        // Speech ended: signal end-of-file to Vosk
        socket.send(JSON.stringify({ eof: 1 }));
        vadState = false;
      }
    };
  } catch (err) {
    statusEl.textContent = "Error: Could not access microphone or server.";
    console.error(err);
  }
}

/**
 * Tear down audio nodes and context.
 */
function stopAudio() {
  if (processor) {
    processor.disconnect();
    processor = null;
  }
  if (source) {
    source.disconnect();
    source = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

function stopRecording() {
  if (socket) {
    socket.close();
    socket = null;
  }
  stopAudio();
  isRecording = false;
  statusEl.textContent = "Status: Idle";
  startStopBtn.textContent = "Start Recording";
}

// ======= Event Listeners =======

// Start/stop toggle
startStopBtn.addEventListener("click", () => {
  isRecording ? stopRecording() : startRecording();
});

// Apply user settings for VAD threshold and hangover
document.getElementById("applySettings").addEventListener("click", () => {
  const newThreshold = parseFloat(
    document.getElementById("vadThresholdInput").value,
    0.015
  );
  const newHangover = parseInt(
    document.getElementById("hangoverInput").value,
    10
  );

  if (!isNaN(newThreshold)) {
    window.VAD_THRESHOLD = newThreshold;
  }
  if (!isNaN(newHangover)) {
    window.HANGOVER_FRAMES = newHangover;
  }
  alert("Settings updated.");
});
