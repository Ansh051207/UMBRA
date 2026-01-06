const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const userRoutes = require('./src/routes/users');
const authRoutes = require('./src/routes/auth');
const noteRoutes = require('./src/routes/notes');
const shareRoutes = require('./src/routes/share');

const app = express();

// 1. Security & CORS (Must be first)
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.options('*', cors());

// 2. Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// 3. Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use('/api/', limiter);

// 5. Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/umbra', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(' MongoDB connection error:', err));

// 6. Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/share', shareRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Umbra Backend'
  });
});



// 7. Error handling middleware
app.use((err, req, res, next) => {
  console.error(' Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);

});