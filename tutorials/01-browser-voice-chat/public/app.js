const TARGET_SAMPLE_RATE = 24_000;
const FRAME_SAMPLES = 1_920; // 80 ms at 24 kHz

const button = document.querySelector("#conversation-button");
const status = document.querySelector("#status");
const userTranscript = document.querySelector("#user-transcript");
const assistantTranscript = document.querySelector("#assistant-transcript");
const turnEvent = document.querySelector("#turn-event");

const state = {
  socket: null,
  stream: null,
  captureContext: null,
  playbackContext: null,
  captureNode: null,
  captureBuffer: new Int16Array(),
  playbackAt: 0,
  active: false,
  connecting: false,
  userText: "",
  assistantText: "",
  userTurnHasDelta: false,
  assistantTurnHasDelta: false,
};

function setStatus(message) {
  status.textContent = message;
}

function renderTranscripts() {
  userTranscript.textContent = state.userText || "—";
  assistantTranscript.textContent = state.assistantText || "—";
}

function appendTranscript(role, text, completed = false) {
  const key = role === "user" ? "userText" : "assistantText";
  const turnKey = role === "user" ? "userTurnHasDelta" : "assistantTurnHasDelta";
  state[key] += text;
  if (text) state[turnKey] = true;
  if (completed && state[key] && !state[key].endsWith("\n")) state[key] += "\n";
  if (completed) state[turnKey] = false;
  renderTranscripts();
}

function base64ToPcm(base64) {
  const binary = atob(base64);
  const pcm = new Int16Array(binary.length / 2);
  for (let index = 0; index < pcm.length; index += 1) {
    const low = binary.charCodeAt(index * 2);
    const high = binary.charCodeAt(index * 2 + 1);
    const unsigned = low | (high << 8);
    pcm[index] = unsigned >= 0x8000 ? unsigned - 0x10000 : unsigned;
  }
  return pcm;
}

function schedulePcm(pcm) {
  const buffer = state.playbackContext.createBuffer(1, pcm.length, TARGET_SAMPLE_RATE);
  const output = buffer.getChannelData(0);
  for (let index = 0; index < pcm.length; index += 1) {
    output[index] = pcm[index] / 32768;
  }

  const source = state.playbackContext.createBufferSource();
  source.buffer = buffer;
  source.connect(state.playbackContext.destination);

  const now = state.playbackContext.currentTime;
  state.playbackAt = Math.max(state.playbackAt, now + 0.025);
  source.start(state.playbackAt);
  state.playbackAt += buffer.duration;
}

function resample(input, sourceRate) {
  if (sourceRate === TARGET_SAMPLE_RATE) return input;
  const outputLength = Math.round(input.length * TARGET_SAMPLE_RATE / sourceRate);
  const output = new Float32Array(outputLength);
  const ratio = sourceRate / TARGET_SAMPLE_RATE;

  for (let index = 0; index < output.length; index += 1) {
    const position = index * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const mix = position - left;
    output[index] = input[left] * (1 - mix) + input[right] * mix;
  }
  return output;
}

function enqueueMicrophoneAudio(floatSamples, sourceRate) {
  if (!state.active || state.socket?.readyState !== WebSocket.OPEN) return;

  const samples = resample(floatSamples, sourceRate);
  const incoming = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    incoming[index] = clamped < 0 ? clamped * 32768 : clamped * 32767;
  }

  const combined = new Int16Array(state.captureBuffer.length + incoming.length);
  combined.set(state.captureBuffer);
  combined.set(incoming, state.captureBuffer.length);
  state.captureBuffer = combined;

  while (state.captureBuffer.length >= FRAME_SAMPLES) {
    const frame = state.captureBuffer.slice(0, FRAME_SAMPLES);
    state.captureBuffer = state.captureBuffer.slice(FRAME_SAMPLES);
    state.socket.send(frame.buffer);
  }
}

async function startAudio() {
  state.playbackContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE, latencyHint: "interactive" });
  await state.playbackContext.resume();

  state.stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });

  state.captureContext = new AudioContext({ latencyHint: "interactive" });
  await state.captureContext.audioWorklet.addModule("/pcm-worklet.js");
  const source = state.captureContext.createMediaStreamSource(state.stream);
  const mute = state.captureContext.createGain();
  mute.gain.value = 0;
  state.captureNode = new AudioWorkletNode(state.captureContext, "microphone-capture");
  state.captureNode.port.onmessage = (event) => {
    enqueueMicrophoneAudio(event.data, state.captureContext.sampleRate);
  };
  source.connect(state.captureNode);
  state.captureNode.connect(mute).connect(state.captureContext.destination);
}

async function requestClientSecret() {
  const response = await fetch("/session", { method: "POST" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || body.error || `Session request failed (${response.status})`);
  return body;
}

function handleServerEvent(event) {
  switch (event.type) {
    case "session.created":
    case "session.updated":
      setStatus("Listening — speak naturally");
      break;
    case "conversation.item.input_audio_transcription.delta":
      appendTranscript("user", event.delta || "");
      break;
    case "conversation.item.input_audio_transcription.completed":
      if (!state.userTurnHasDelta && event.transcript) appendTranscript("user", event.transcript);
      appendTranscript("user", "", true);
      break;
    case "response.output_audio_transcript.delta":
    case "response.output_text.delta":
      appendTranscript("assistant", event.delta || "");
      break;
    case "response.output_audio_transcript.done":
    case "response.output_text.done":
      if (state.assistantTurnHasDelta) appendTranscript("assistant", "", true);
      break;
    case "response.output_audio.delta":
      schedulePcm(base64ToPcm(event.delta));
      setStatus("Assistant speaking — you can interrupt");
      break;
    case "response.output_audio.done":
      setStatus("Listening — speak naturally");
      break;
    case "conversation.turn.event":
      turnEvent.textContent = JSON.stringify(event, null, 2);
      break;
    case "error":
      throw new Error(event.error?.message || "The realtime session returned an error.");
    case "session.end":
      stopConversation(false);
      break;
  }
}

async function createSession() {
  const payload = await requestClientSecret();
  const realtimeUrl = new URL(payload.session.realtime_url);
  realtimeUrl.searchParams.set("token", payload.value);

  state.socket = new WebSocket(realtimeUrl);
  state.socket.binaryType = "arraybuffer";

  state.socket.addEventListener("open", () => {
    state.active = true;
    state.connecting = false;
    button.disabled = false;
    button.textContent = "End conversation";
    state.socket.send(JSON.stringify({
      type: "session.update",
      event_id: crypto.randomUUID(),
      session: {
        audio: {
          input: { format: { type: "audio/pcm", rate: TARGET_SAMPLE_RATE } },
          output: { format: { type: "audio/pcm", rate: TARGET_SAMPLE_RATE } },
        },
        instructions: "",
        tools: [],
      },
    }));
    setStatus("Listening — speak naturally");
  });

  state.socket.addEventListener("message", (message) => {
    try {
      if (message.data instanceof ArrayBuffer) {
        schedulePcm(new Int16Array(message.data));
        return;
      }
      handleServerEvent(JSON.parse(message.data));
    } catch (error) {
      console.error(error);
      setStatus(error.message);
    }
  });

  state.socket.addEventListener("error", () => {
    setStatus("Realtime connection failed");
  });

  state.socket.addEventListener("close", () => {
    if (state.active || state.connecting) stopConversation(false);
  });
}

async function startConversation() {
  state.connecting = true;
  state.captureBuffer = new Int16Array();
  state.playbackAt = 0;
  state.userText = "";
  state.assistantText = "";
  state.userTurnHasDelta = false;
  state.assistantTurnHasDelta = false;
  renderTranscripts();
  button.disabled = true;
  setStatus("Requesting microphone access…");

  try {
    await startAudio();
    setStatus("Opening a realtime session…");
    await createSession();
  } catch (error) {
    console.error(error);
    setStatus(error.message || String(error));
    await stopConversation(false);
  }
}

async function stopConversation(notifyServer = true) {
  const socket = state.socket;
  state.active = false;
  state.connecting = false;
  state.socket = null;

  if (notifyServer && socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "session.close", event_id: crypto.randomUUID() }));
    setTimeout(() => socket.close(1000), 250);
  } else if (socket && socket.readyState < WebSocket.CLOSING) {
    socket.close(1000);
  }

  state.captureNode?.disconnect();
  state.stream?.getTracks().forEach((track) => track.stop());
  await state.captureContext?.close().catch(() => {});
  await state.playbackContext?.close().catch(() => {});
  state.stream = null;
  state.captureNode = null;
  state.captureContext = null;
  state.playbackContext = null;
  state.captureBuffer = new Int16Array();
  button.disabled = false;
  button.textContent = "Start conversation";
  setStatus("Ready");
}

button.addEventListener("click", () => {
  if (state.active || state.connecting) stopConversation();
  else startConversation();
});

window.addEventListener("beforeunload", () => {
  if (state.socket?.readyState === WebSocket.OPEN) {
    state.socket.send(JSON.stringify({ type: "session.close", event_id: crypto.randomUUID() }));
  }
});
