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
const leadRoutes = require('./modules/leads/lead.routes.js');
const noteRoutes = require('./modules/notes/note.routes.js');
const taskRoutes = require('./modules/tasks/task.routes.js');
const companyRoutes = require('./modules/companies/company.routes.js');
const contactRoutes = require('./modules/contacts/contact.routes.js');
const dealRoutes = require('./modules/deals/deal.routes.js');
const teamRoutes = require('./modules/team/team.routes.js');
const customerRoutes = require('./modules/customers/customer.routes.js');
const paymentRoutes = require('./modules/payments/payment.routes.js');
const billingWebhookRoutes = require("./modules/billing/webhook.routes.js");
const billingRoutes = require("./modules/billing/billing.routes.js");
const projectRoutes = require("./modules/projects/project.routes");
const calendarRoutes = require("./modules/calendar/calendar.routes");
const settingsRoutes = require("./modules/settings/settings.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const reportRoutes = require("./modules/reports/report.routes.js");
const activityRoutes = require("./modules/activities/activity.routes.js");
const teamInvitationRoutes = require("./modules/invitations/invitation.routes.js");
const publicInvitationRoutes = require("./modules/invitations/invitation.public.routes.js");
const supportTicketRoutes = require("./modules/support-tickets/supportTicket.routes.js");
const adminSupportTicketRoutes = require("./modules/support-tickets/admin-supportTicket.routes.js");
const fileRoutes = require("./modules/files/file.routes.js");

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use('/api/billing/webhook', billingWebhookRoutes);
app.use(express.json());
app.use(cookieParser());

// In server.js / app.js, near your other app.use(...) calls:
const passport = require("./config/passport"); // registers the strategy as a side effect
app.use(passport.initialize());
// No app.use(passport.session()) needed — we're issuing our own JWT cookie,
// not using passport sessions (session: false everywhere above).


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
app.use('/api/leads', leadRoutes);
app.use('/api/notes', noteRoutes); // Mount note routes at /api
app.use('/api/tasks', taskRoutes); // Mount task routes at /api
app.use('/api/leads/:leadId/tasks', taskRoutes); // Mount lead-scoped task routes at /api/leads/:leadId/tasks
app.use('/api/companies', companyRoutes); // Mount company routes at /api/companies
app.use('/api/contacts', contactRoutes); // Mount contact routes at /api/contacts
app.use('/api/deals', dealRoutes); // Mount deal routes at /api/deals
app.use('/api/team', teamRoutes); // Mount team routes at /api/team
app.use('/api/customers', customerRoutes); // Mount customer routes at /api/customers
app.use('/api/payments', paymentRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/settings", settingsRoutes); // Mount settings routes at /api/settings
app.use("/api/admin", adminRoutes); // Mount admin routes at /api/admin
app.use("/api/reports", reportRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/team-invitations", teamInvitationRoutes);
app.use("/api/invitations", publicInvitationRoutes);
app.use("/api/support-tickets", supportTicketRoutes);
app.use("/api/admin/support-tickets", adminSupportTicketRoutes);
app.use("/api/files", fileRoutes); // Mount file routes at /api/files

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