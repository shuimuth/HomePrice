const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'client')));

// API routes (will be loaded in task 3)
const routes = require('./routes');
app.use('/api', routes);

// Fallback: serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// Start server
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`Home Price Experiment server running on http://localhost:${PORT}`);
  console.log(`Game URL: http://localhost:${PORT}/?uid=TEST001`);
});
