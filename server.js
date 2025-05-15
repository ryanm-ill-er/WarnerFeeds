const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
// Removed: const fetch = require('node-fetch'); <-- cause that breaks CommonJS

const app = express();

app.use(cors());

app.use(express.static(path.join(__dirname)));

app.get('/api/xmpp-alerts', async (req, res) => {
  if (req.method === 'GET') {
    try {
      const response = await axios.get('https://xmpp-api.onrender.com/all-alerts');
      res.status(200).json(response.data);
    } catch (error) {
      console.error('Error fetching from XMPP API:', error);
      res.status(500).json({ error: 'Failed to fetch data from XMPP API' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});

app.get('/api/fetch-warnings', async (req, res) => {
  try {
    // Dynamic import of node-fetch in CommonJS
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

    const response = await fetch('https://api.weather.gov/alerts/active?area=MI');
    const data = await response.json();

    const warnings = data.features.filter(feature =>
      feature.properties.event === "Tornado Warning"
    );

    res.status(200).json(warnings);
  } catch (error) {
    console.error('Error fetching weather warnings:', error);
    res.status(500).json({ error: 'Failed to fetch warnings' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
