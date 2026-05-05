const logger = require('./utils/logger');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();
const errorMiddleware = require('./middlewares/error.middleware');
const cookieParser = require('cookie-parser');
const authRoutes = require('./modules/auth/auth.routes');
const { authRateLimiter, apiRateLimiter } = require('./middlewares/rateLimiter.middleware');
const clientRoutes = require('./modules/client/client.routes');
const userRoutes = require('./modules/users/user.routes');
const invoiceRoutes = require('./modules/invoices/invoice.routes');
const notificationsRoutes = require('./modules/notifications/notification.routes.js');
const searchRoutes = require('./modules/search/search.routes.js');
const expenseRoutes = require('./modules/expense/expense.routes.js');
const salesRoutes = require('./modules/sales/sales.routes.js');
const financeRoutes = require('./modules/finance/finance.routes.js');


// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));


app.use(express.json());
app.use(cookieParser());


// Rate limiting
app.use('/api/', apiRateLimiter);
app.use('/api/auth/login', authRateLimiter);

// Logger
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/users', userRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/finance', financeRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// 404 handler
app.use((req, res, next) => {
  const ApiError = require('./utils/ApiError');
  next(new ApiError(404, 'Not Found'));
});

app.use(errorMiddleware);

module.exports = app;