# .wave tutorials

Small, runnable tutorials for building voice applications with the [.wave](https://dotwave.ai) API.

The examples begin with the smallest useful result and introduce one realtime concept at a time. Each tutorial is self-contained, keeps long-lived API keys on the server, and uses the public API directly so you can see the protocol clearly.

## Tutorials

| # | Tutorial | What you will learn | Status |
| --- | --- | --- | --- |
| 01 | [Talk to Nemotron VoiceChat in a browser](tutorials/01-browser-voice-chat) | Client secrets, microphone capture, PCM streaming, duplex playback, transcripts, and interruption | Available |
| 02 | Understand the session lifecycle | Session creation, WebSocket events, clean shutdown, and errors | Planned |
| 03 | Build a live transcript | User and assistant transcript events and turn boundaries | Planned |
| 04 | Visualize turn-taking | Barge-in and `conversation.turn.event` diagnostics | Planned |
| 05 | Make a voice app resilient | Reconnection, timeouts, and device changes | Planned |

Tool calling will get its own tutorial after it is supported by the public API. The current examples intentionally send an empty `tools` array.

## Start here

```bash
cd tutorials/01-browser-voice-chat
cp .env.example .env
# Add your .wave API key to .env
npm start
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

You need Node.js 20 or newer, a modern browser, a microphone, and a .wave API key.

## Principles

- One concept per tutorial.
- Runnable before abstract.
- No framework unless the lesson requires one.
- Never expose a long-lived API key to a browser.
- Document the API that exists today.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a tutorial.

## License

[MIT](LICENSE)
