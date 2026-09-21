# Talk to Nemotron VoiceChat in a browser

In this tutorial, you will stream microphone audio to Nemotron VoiceChat through .wave and play its response while the conversation is still happening. You can speak over the model to interrupt it.

The example deliberately uses vanilla JavaScript and Node.js so the realtime protocol remains visible.

## What happens

```text
Browser microphone
  -> local Node server mints a short-lived client secret
  -> browser opens a .wave WebSocket
  -> mono PCM16 audio streams at 24 kHz
  -> response audio and transcripts stream back
  -> browser schedules PCM playback immediately
```

Your long-lived API key is only read by the local Node server. The browser receives a short-lived client secret that is scoped to one realtime session.

## Prerequisites

- Node.js 20 or newer
- A modern browser with `AudioWorklet` support
- A microphone
- A .wave API key beginning with `wk_live_` or `wk_test_`

## Run it

```bash
cp .env.example .env
```

Open `.env` and replace the placeholder with your API key. Then run:

```bash
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000), select **Start conversation**, and allow microphone access.

## Verify it

You should be able to:

1. hear the model greet or answer you;
2. see user and assistant transcript deltas while the conversation runs;
3. interrupt the model by speaking while it is responding;
4. end the session cleanly with **End conversation**.

Headphones make interruption tests more reliable by preventing the microphone from capturing the model's own output.

## Read the code

Start with these three places in [`public/app.js`](public/app.js):

- `createSession()` asks the local server for a short-lived credential and opens the WebSocket.
- `enqueueMicrophoneAudio()` converts browser audio to mono PCM16 at 24 kHz and sends 80 ms frames.
- `handleServerEvent()` handles transcript, audio, turn, error, and session lifecycle events.

[`server.mjs`](server.mjs) contains the only authenticated HTTP request. It forwards neither the API key nor environment variables to the browser.

## Current API limits

Nemotron VoiceChat currently uses its compiled persona and limits a session to 120 seconds. Per-session instructions and tool calling are not yet supported, so this tutorial sends empty `instructions` and `tools` values explicitly.

## Troubleshooting

**The page says the API key is missing**

Make sure `.env` exists in this directory and contains `DOTWAVE_API_KEY=...`, then restart the server.

**The browser does not ask for microphone access**

Microphone capture requires a secure context. `http://127.0.0.1` and `http://localhost` are treated as secure for local development. Check the site's microphone permission if you previously denied it.

**I hear feedback or the model interrupts itself**

Use headphones and keep browser echo cancellation enabled.

**The session ends after roughly two minutes**

That is the current context limit for Nemotron VoiceChat, not a browser timeout. Start a new conversation to continue.
