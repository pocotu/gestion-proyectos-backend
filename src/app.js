const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');

// Importar rutas
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware de seguridad
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (keeps minimal footprint)
app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({ message: 'gestion-proyectos-backend scaffold', status: 'ok' });
});

// Configurar rutas
app.use('/api/auth', authRoutes);

// Global error handler (last middleware)
app.use(errorHandler);

// expose logger for health checks if needed
app.locals.logger = logger;

module.exports = app;
