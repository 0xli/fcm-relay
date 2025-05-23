require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const API_KEY = process.env.API_KEY || 'mysecret201203all0m';

const serviceAccount = require('./beaglechatwallet-firebase-adminsdk-fbsvc-a63bca90f9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(bodyParser.json());

app.post('/send', async (req, res) => {
  const clientKey = req.headers['x-api-key'];

  if (clientKey !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API key' });
  }
  const message = req.body;

  try {
    const response = await admin.messaging().send(message);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('FCM error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FCM relay running on port ${PORT}`);
});

