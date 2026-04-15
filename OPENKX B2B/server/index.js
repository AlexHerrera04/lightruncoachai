const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/coach", async (req, res) => {
  try {
    const {
  instructions,
  input,
  maxTokens = 500,
  responseFormat = null
} = req.body || {};

if (!input || typeof input !== "string") {
  return res.status(400).json({ error: "input required" });
}

const payload = {
  model: "gpt-4.1-mini",
  input,
  instructions,
  max_output_tokens: maxTokens
};

if (responseFormat) {
  payload.text = {
    format: responseFormat
  };
}

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
  },
  body: JSON.stringify(payload)
});

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed"
      });
    }

    const text =
      data.output_text ||
      data.output
        ?.flatMap(item => item.content || [])
        .map(content => content.text || "")
        .join("")
        .trim() ||
      "";

    return res.json({ text });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "coach request failed"
    });
  }
});

app.listen(port, () => {
  console.log(`AI backend listening on http://localhost:${port}`);
});