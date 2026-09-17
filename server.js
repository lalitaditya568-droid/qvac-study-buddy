import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadModel,
  completion,
  unloadModel,
  QWEN3_600M_INST_Q4,
} from "@qvac/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

let modelId = null;
let modelLoading = null;

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });

  res.end(body);
}

function sendFile(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath);

    res.writeHead(200, {
      "Content-Type": contentType,
    });

    res.end(content);
  } catch (error) {
    sendJson(res, 404, {
      error: "File not found",
    });
  }
}

async function ensureModelLoaded() {
  if (modelId) {
    return modelId;
  }

  if (modelLoading) {
    return modelLoading;
  }

  console.log("Loading QVAC model...");

  modelLoading = loadModel({
    modelSrc: QWEN3_600M_INST_Q4,
    modelConfig: {
      ctx_size: 4096,
    },
    onProgress: (progress) => {
      const percentage = progress.percentage.toFixed(0);

      process.stdout.write(
        `\rDownloading model: ${percentage}%`
      );

      if (progress.percentage >= 100) {
        process.stdout.write("\n");
      }
    },
  });

  try {
    modelId = await modelLoading;

    console.log(`QVAC model loaded: ${modelId}`);

    return modelId;
  } finally {
    modelLoading = null;
  }
}

async function handleQuestion(req, res) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const data = JSON.parse(body);

      const question = String(data.question || "").trim();

      if (!question) {
        sendJson(res, 400, {
          error: "Please enter a question.",
        });

        return;
      }

      if (question.length > 4000) {
        sendJson(res, 400, {
          error: "Question is too long. Keep it under 4000 characters.",
        });

        return;
      }

      const loadedModelId = await ensureModelLoaded();

      console.log(`Question: ${question}`);

      const result = completion({
        modelId: loadedModelId,

        history: [
          {
            role: "system",
            content:
              "You are QVAC Study Buddy, a helpful study assistant. Explain concepts clearly and simply. Give accurate, concise answers suitable for a university student.",
          },
          {
            role: "user",
            content: question,
          },
        ],

        stream: true,
      });

      const final = await result.final;

      const answer = final.contentText || "No answer was generated.";

      console.log("Answer generated.");

      sendJson(res, 200, {
        answer,
        local: true,
        model: "Qwen3 600M",
      });
    } catch (error) {
      console.error(error);

      sendJson(res, 500, {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    sendFile(
      res,
      path.join(__dirname, "public", "index.html"),
      "text/html; charset=utf-8"
    );

    return;
  }

  if (req.method === "POST" && req.url === "/api/ask") {
    handleQuestion(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, {
      status: "ok",
      qvac: true,
      local: true,
      modelLoaded: Boolean(modelId),
    });

    return;
  }

  sendJson(res, 404, {
    error: "Not found",
  });
});

async function shutdown() {
  console.log("\nShutting down...");

  if (modelId) {
    try {
      await unloadModel({
        modelId,
        clearStorage: false,
      });
    } catch (error) {
      console.error("Could not unload model:", error);
    }
  }

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("       QVAC STUDY BUDDY");
  console.log("======================================");
  console.log("");
  console.log(`Open http://localhost:${PORT}`);
  console.log("");
  console.log("AI inference runs locally with QVAC.");
  console.log("");
});