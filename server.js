require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const trackerRoutes = require('./routes/trackerRoutes');
const authRoutes = require('./routes/authRoutes');
require('./services/scheduler'); 

const app = express();

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3000', // Local development
    'https://amazon-price-tracker-front.vercel.app', // Main Vercel domain
    'https://amazon-price-tracker-front-lokesh-36s-projects.vercel.app', // Project-specific domain
    'https://amazon-price-tracker-back-1.onrender.com', // Your backend URL (for internal calls)
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

connectDB();

app.use('/api', trackerRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
