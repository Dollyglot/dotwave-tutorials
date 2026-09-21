import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const apiBaseUrl = (process.env.DOTWAVE_API_BASE_URL || "https://api.dotwave.ai").replace(/\/$/, "");
const apiKey = process.env.DOTWAVE_API_KEY;

const assets = new Map([
  ["/", ["public/index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["public/app.js", "text/javascript; charset=utf-8"]],
  ["/pcm-worklet.js", ["public/pcm-worklet.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["public/styles.css", "text/css; charset=utf-8"]],
]);

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function mintClientSecret(response) {
  if (!apiKey || apiKey.includes("replace_me")) {
    sendJson(response, 500, {
      error: "Set DOTWAVE_API_KEY in .env, then restart the tutorial server.",
    });
    return;
  }

  try {
    const upstream = await fetch(`${apiBaseUrl}/v1/realtime/client_secrets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "nemotron-voicechat",
          audio: {
            input: {
              format: { type: "audio/pcm", rate: 24000 },
              transcription: {
                model: "nemotron-voicechat",
                language: "en-US",
              },
            },
          },
        },
        metadata: { tutorial: "01-browser-voice-chat" },
      }),
    });

    const body = await upstream.text();
    response.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch (error) {
    console.error("Could not reach the .wave API:", error);
    sendJson(response, 502, { error: "Could not reach the .wave API." });
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || host}`);

  if (request.method === "POST" && url.pathname === "/session") {
    await mintClientSecret(response);
    return;
  }

  if (request.method !== "GET" || !assets.has(url.pathname)) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  const [path, contentType] = assets.get(url.pathname);
  try {
    const body = await readFile(new URL(path, import.meta.url));
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch (error) {
    console.error(`Could not read ${path}:`, error);
    sendJson(response, 500, { error: "Could not load the tutorial asset." });
  }
});

server.listen(port, host, () => {
  console.log(`.wave tutorial running at http://${host}:${port}`);
});
