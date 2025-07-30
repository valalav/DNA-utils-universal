import express from 'express';
const router = express.Router();

const API_URL = 'http://127.0.0.1:9003/api';

router.get('/*', async (req, res) => {
  try {
    const path = req.path;
    const response = await fetch(`${API_URL}${path}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/*', async (req, res) => {
  try {
    const path = req.path;
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;