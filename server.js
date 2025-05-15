@ -1,18 +1,61 @@
const express = require('express');
const cors = require('cors');
const path = require('path');
import {
  Application,
  Router,
  send,
} from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { cors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

const app = express();
const app = new Application();
const router = new Router();

app.use(cors()); // This will enable CORS for all routes
app.use(cors());

// Serve static files from the 'WarningFeeder' directory
app.use(express.static(path.join(__dirname)));
// Serve static files (assuming your files are in the current directory)
app.use(async (context, next) => {
  if (context.request.url.pathname.startsWith("/api")) {
    await next();
  } else {
    await send(context, context.request.url.pathname, {
      root: Deno.cwd(),
      index: "index.html",
    });
  }
});

router.get("/api/xmpp-alerts", async (context) => {
  try {
    const response = await fetch("https://xmpp-api.onrender.com/all-alerts");
    const data = await response.json();
    context.response.status = 200;
    context.response.body = data;
  } catch (error) {
    console.error("Error fetching from XMPP API:", error);
    context.response.status = 500;
    context.response.body = { error: "Failed to fetch data from XMPP API" };
  }
});

// Route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
router.get("/api/fetch-warnings", async (context) => {
  try {
    const response = await fetch(
      "https://api.weather.gov/alerts/active?area=MI"
    );
    const data = await response.json();
    const warnings = data.features.filter(
      (feature) => feature.properties.event === "Tornado Warning"
    );
    context.response.status = 200;
    context.response.body = warnings;
  } catch (error) {
    console.error("Error fetching weather warnings:", error);
    context.response.status = 500;
    context.response.body = { error: "Failed to fetch warnings" };
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
app.use(router.routes());
app.use(router.allowedMethods());

const PORT = Number(Deno.env.get("PORT")) || 3100;
console.log(`Server running on http://localhost:${PORT}`);
await app.listen({ port: PORT });
