// /api/xmpp-alerts.js
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const response = await axios.get('https://xmpp-api.onrender.com/all-alerts');
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching from XMPP API:', error);
    res.status(500).json({ error: 'Failed to fetch data from XMPP API' });
  }
}
