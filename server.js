const express = require("express");
const cors = require("cors");
const path = require("path");
const compression = require("compression");
const EventSource = require("eventsource");

const app = express();

// 🧠 Memory cache to hold most recent alert(s)
let lastAlerts = [];

app.use(cors());
app.use(express.static(path.join(__dirname)));
app.use(
  compression({
    filter: (req, res) =>
      req.headers.accept?.includes("text/event-stream")
        ? false
        : compression.filter(req, res),
  })
);

app.get("/api/xmpp-alerts", (req, res) => {
  // 1️⃣ SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  console.log(
    `[${new Date().toISOString()}] 🚀 Client connected to /api/xmpp-alerts`
  );

  // 2️⃣ Send INIT right away if cached alerts exist
  const initialState = lastAlerts.length > 0 ? lastAlerts : [];
  res.write(`event: INIT\n`);
  res.write(`data: ${JSON.stringify(initialState)}\n\n`);

  // 3️⃣ Connect upstream
  const upstreamUrl = "https://xmpp-api-production.up.railway.app/live-alerts";
  const source = new EventSource(upstreamUrl);
  console.log(`🔗 Connecting to upstream SSE: ${upstreamUrl}`);

  // 4️⃣ Unified handler for all upstream events
  function handleEventData(evt) {
    try {
      console.log(
        `[${new Date().toISOString()}] 🔥 Upstream ${evt.type || "message"} event received`
      );
      const data = JSON.parse(evt.data);

      // update cache
      lastAlerts = Array.isArray(data)
        ? data
        : data.features
        ? data.features
        : [data];

      const eventLine = evt.type !== "message" ? `event: ${evt.type}\n` : "";
      res.write(`${eventLine}data: ${evt.data}\n\n`);
      res.flush?.();
    } catch (err) {
      console.error("❌ Failed to relay upstream payload:", err);
    }
  }

  // 5️⃣ Relay default unnamed messages
  source.onmessage = handleEventData;

  // 6️⃣ Relay known named events
  const knownEvents = ["INIT", "ALERT", "UPDATE", "CANCEL", "OTHER", "ALERT_CANCELED", "EXPIRE_ALERT", "CONTINUE", "NEW", "EXPIRE", "SPECIAL_WEATHER_STATEMENT", "EXPIRE_BEFORE_OPEN"];
  knownEvents.forEach((eventType) => {
    source.addEventListener(eventType, handleEventData);
  });

  // 7️⃣ Keep-alive ping to client every 15s
  const ping = setInterval(() => {
    res.write("event: ping\ndata: {}\n\n");
    res.flush?.();
  }, 15000);

  // 🧹 Cleanup on client close
  const cleanUp = () => {
    clearInterval(ping);
    source.close();
    res.end();
    console.log(
      `[${new Date().toISOString()}] 🛑 Client disconnected, closed upstream`
    );
  };

  req.on("close", cleanUp);
  req.on("aborted", cleanUp);
});

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
