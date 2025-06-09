require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const PropertiesReader = require('properties-reader');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.API_KEY || 'mysecret201203all0m';

// Load application.properties and parse FCM config mappings
const props = PropertiesReader(path.join(__dirname, 'application.properties'));
const fcmConfigs = {};
Object.keys(props.getAllProperties()).forEach(key => {
  if (key.startsWith('push.fcm-config.')) {
    const appName = key.replace('push.fcm-config.', '');
    fcmConfigs[appName] = props.get(key);
  }
});

// Initialize Firebase apps for each service account
const firebaseApps = {};
Object.entries(fcmConfigs).forEach(([appName, jsonPath]) => {
  try {
    const serviceAccount = require(jsonPath);
    firebaseApps[appName] = admin.initializeApp(
      { credential: admin.credential.cert(serviceAccount) },
      appName // use appName as the app instance name
    );
  } catch (e) {
    console.error(`Failed to load service account for ${appName}:`, e.message);
  }
});

// Default service account (the only one you have now)
const defaultServiceAccount = require('./config/beaglechatwallet-firebase-adminsdk-fbsvc-a63bca90f9.json');
if (!firebaseApps['default']) {
  firebaseApps['default'] = admin.initializeApp(
    { credential: admin.credential.cert(defaultServiceAccount) },
    'default'
  );
}

const app = express();
app.use(bodyParser.json());

app.post('/send', async (req, res) => {
  const clientKey = req.headers['x-api-key'];
  const now = new Date().toISOString();
  const { appName, token, ...rest } = req.body;

  // Log the request details
  console.log(`[${now}] Received push request: appName=${appName || 'default'}, payload=`, JSON.stringify(req.body));

  if (clientKey !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API key' });
  }

  const firebaseApp =
    (appName && firebaseApps[appName]) ? firebaseApps[appName] : firebaseApps['default'];

  const message = {
    token,
    ...rest
  };

  try {
    const response = await firebaseApp.messaging().send(message);
    console.log(`[${now}] Push sent: appName=${appName || 'default'}, response=`, response);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error(`[${now}] FCM error: appName=${appName || 'default'}, error=`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FCM relay running on port ${PORT}`);
});

