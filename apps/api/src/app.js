const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const agentRoutes = require('./routes/agent');
const customerRoutes = require('./routes/customer');
const deliveryRoutes = require('./routes/deliveries');

const app = express();

app.use(helmet());
app.use(cors()); // we'll restrict this to your real website addresses at deployment
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/deliveries', deliveryRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ error: 'That value is already in use' });
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.values(err.errors).map((item) => ({
        field: item.path,
        message: item.message,
      })),
    });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid value' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Server error' : err.message });
});

module.exports = app;
