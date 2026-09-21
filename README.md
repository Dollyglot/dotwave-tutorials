# .wave tutorials

Small, runnable tutorials for building voice applications with the [.wave](https://dotwave.ai) API.

Each tutorial is self-contained, keeps long-lived API keys on the server, and uses the public API directly so you can see the protocol clearly.

## Tutorials

- [Talk to Nemotron VoiceChat in a browser](tutorials/01-browser-voice-chat) — Capture microphone audio, stream PCM over a WebSocket, play responses, display live transcripts, and handle interruption.

## Start here

```bash
cd tutorials/01-browser-voice-chat
cp .env.example .env
# Add your .wave API key to .env
npm start
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

You need Node.js 20 or newer, a modern browser, a microphone, and a .wave API key.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a tutorial.

## License

[MIT](LICENSE)
