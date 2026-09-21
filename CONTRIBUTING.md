# Contributing

Thanks for helping people learn .wave.

## A good tutorial

A tutorial should teach one primary concept and produce a useful result. A reader should be able to run it independently without copying files from another tutorial.

Each tutorial must include:

- a short statement of what the reader will build;
- prerequisites and exact run commands;
- an explanation of the important protocol events;
- API-key safety appropriate to its environment;
- current limitations;
- a manual verification checklist.

Prefer platform APIs and small examples over abstractions. Repetition between tutorials is acceptable when it makes an example easier to understand in isolation.

## Directory names

Use a two-digit sequence followed by a descriptive slug:

```text
tutorials/02-session-lifecycle
```

Do not reserve a number with an empty directory. Add it when the tutorial is runnable.

## Before opening a pull request

Run any checks documented by the tutorial and verify the complete user flow manually. Never commit `.env` files, API keys, client secrets, recorded conversations, or microphone captures.
