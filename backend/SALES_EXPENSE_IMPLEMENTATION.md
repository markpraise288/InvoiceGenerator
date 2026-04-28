# Sales & Expense Tracking System - Implementation Guide

## 📋 Overview

This document outlines the implementation of the Sales & Expense Tracking System for InvoiceFlow, following the existing modular architecture.

## 🏗️ Architecture

The system is built with a **feature-based modular structure**:

```
src/modules/
├── expense/
│   ├── expense.model.js
│   ├── expense.controller.js
│   ├── expense.service.js
│   ├── expense.routes.js
│   └── expense.validation.js
├── sales/
│   ├── sales.model.js
│   ├── sales.controller.js
│   ├── sales.service.js
│   ├── sales.routes.js
│   └── sales.validation.js
└── finance/
    ├── finance.controller.js
    ├── finance.service.js
    ├── finance.routes.js
    └── finance.validation.js
```

## 🗄️ Database Design

### Expense Model
```javascript
{
  userId: ObjectId,        // Required, indexed
  title: String,           // Required
  amount: Number,          // Required, min: 0
  category: Enum,          // rent, utilities, marketing, salary, other
  date: Date,              // Default: now, indexed
  notes: String,           // Optional
  receiptUrl: String,      // Optional
  isDeleted: Boolean,      // Soft delete
  timestamps: true
}

Indexes:
- { userId: 1, date: -1 }
- { userId: 1, category: 1 }
```

### Sales Model
```javascript
{
  userId: ObjectId,        // Required, indexed
  source: Enum,            // "invoice" | "manual"
  invoiceId: ObjectId,     // Optional, ref: Invoice
  clientId: ObjectId,      // Optional, ref: Client
  amount: Number,          // Required
  status: Enum,            // "paid" | "pending"
  date: Date,              // Default: now
  notes: String,           // Optional
  timestamps: true
}

Indexes:
- { userId: 1, date: -1 }
- { userId: 1, status: 1 }
```

## 🔌 API Endpoints

### Expense Routes
```
POST   /api/expenses              Create expense
GET    /api/expenses              Get expenses (paginated + filters)
GET    /api/expenses/:id          Get expense by ID
PUT    /api/expenses/:id          Update expense
DELETE /api/expenses/:id          Soft delete expense
DELETE /api/expenses/:id/permanent Permanently delete expense
```

**Query Filters:**
- `category`: Filter by category
- `startDate` / `endDate`: Date range
- `page` / `limit`: Pagination
- `sortBy` / `sortOrder`: Sorting

### Sales Routes
```
POST   /api/sales                 Create manual sale
GET    /api/sales                 Get sales (paginated + filters)
GET    /api/sales/:id             Get sale by ID
PUT    /api/sales/:id             Update manual sale
DELETE /api/sales/:id             Delete manual sale
```

**Query Filters:**
- `status`: paid | pending
- `source`: invoice | manual
- `startDate` / `endDate`: Date range
- `page` / `limit`: Pagination

### Finance Routes
```
GET /api/finance/summary          Get financial summary
GET /api/finance/expense-breakdown Get expenses by category
GET /api/finance/cash-flow        Get recent transactions
```

## ⚙️ Business Logic

### Invoice → Sale Integration

When an invoice is updated to **"paid"** status, the system automatically creates a Sale record.

**Implementation in `invoice.service.js`:**

```javascript
const updateInvoice = async (id, updateData) => {
  const invoice = await Invoice.findOne({ _id: id });
  const previousStatus = invoice.status;
  
  if (updateData.status) invoice.status = updateData.status;
  if (updateData.payments) invoice.payments = updateData.payments;
  
  await invoice.save();
  
  // Create sale if status changed to "paid"
  if (previousStatus !== "paid" && invoice.status === "paid") {
    await createSaleFromInvoice(invoice);
    // Trigger notification
  }
  
  return invoice;
};
```

**Key Points:**
- Logic is in the **service layer** (not controller)
- Prevents duplicate sales (checks existing records)
- Automatically sets source to "invoice"
- Links to original invoice and client

### Finance Aggregation

The finance service uses MongoDB aggregation pipelines for efficient calculations:

```javascript
// Total Revenue
Sale.aggregate([
  { $match: { userId, date: dateFilter } },
  { $group: { _id: null, total: { $sum: "$amount" } } }
]);

// Monthly Breakdown
Sale.aggregate([
  { $match: { userId, date: dateFilter } },
  {
    $group: {
      _id: { year: { $year: "$date" }, month: { $month: "$date" } },
      revenue: { $sum: "$amount" }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
]);
```

## 🔒 Security

- **All routes** require authentication via `authMiddleware`
- **User isolation**: All queries filter by `userId` from JWT token
- **Input validation**: Joi schemas validate all inputs
- **ObjectID validation**: Middleware validates MongoDB IDs
- **Soft deletes**: Expenses use soft delete to preserve data integrity

## ⚡ Performance

- **Pagination**: All list endpoints support pagination
- **Indexes**: Proper indexes on frequently queried fields
- **Lean queries**: Use `.lean()` where population not needed
- **Aggregation**: Efficient MongoDB aggregation pipelines
- **Selective fields**: Only return necessary fields

## 🧪 Validation

All endpoints use Joi validation schemas:

```javascript
// Example: Create Expense
const createExpenseSchema = joi.object({
  title: joi.string().required().trim(),
  amount: joi.number().min(0).required(),
  category: joi.string().valid("rent", "utilities", "marketing", "salary", "other").required(),
  date: joi.date().default(Date.now),
  notes: joi.string().allow("", null),
  receiptUrl: joi.string().uri().allow("", null),
});
```

## 📊 Response Format

All endpoints return consistent responses:

```javascript
// Success
{
  "success": true,
  "message": "Expense created successfully",
  "data": { /* resource */ }
}

// Error
{
  "success": false,
  "message": "Error message",
  "code": 404
}
```

## 🔄 Layer Responsibilities

### Controller
- Handle HTTP request/response
- Parse and validate input
- Call service layer
- Return formatted responses
- **NO business logic**

### Service
- All business logic
- Database operations
- Data transformation
- Reusable functions
- Error handling

### Model
- Mongoose schema definition
- Indexes
- Virtuals and methods
- Validation rules

### Validation
- Joi schemas
- Request body validation
- Query parameter validation
- Clear error messages

## 🚀 Usage Examples

### Create Expense
```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Cookie: accessToken=..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Office Rent",
    "amount": 1500,
    "category": "rent",
    "date": "2024-01-01",
    "notes": "Monthly office rent"
  }'
```

### Get Expenses with Filters
```bash
curl "http://localhost:5000/api/expenses?category=rent&startDate=2024-01-01&endDate=2024-01-31&page=1&limit=10"
```

### Get Finance Summary
```bash
curl "http://localhost:5000/api/finance/summary?startDate=2024-01-01&endDate=2024-12-31"
```

## 📈 Future Enhancements (Bonus)

### CSV Export
```javascript
// Add to finance routes
router.get('/export/csv', exportToCSV);
```

### Receipt Upload
```javascript
// Using multer
const upload = multer({ dest: 'uploads/receipts/' });
router.post('/', upload.single('receipt'), createExpenseHandler);
```

### Search Functionality
```javascript
// Add text index to expense model
expenseSchema.index({ title: 'text', notes: 'text' });

// Search query
Expense.find({ $text: { $search: "office rent" } });
```

## ✅ Testing Checklist

- [ ] Create expense with valid data
- [ ] Create expense with invalid category
- [ ] Get expenses with pagination
- [ ] Filter expenses by date range
- [ ] Update expense amount
- [ ] Soft delete expense
- [ ] Permanently delete expense
- [ ] Create manual sale
- [ ] Get sales with filters
- [ ] Mark invoice as paid → verify sale created
- [ ] Get finance summary
- [ ] Get expense breakdown by category
- [ ] Get cash flow transactions
- [ ] Verify user isolation (can't access other users' data)
- [ ] Test authentication required on all routes

## 🎯 Key Design Decisions

1. **Modular Structure**: Each feature is self-contained with its own model, controller, service, routes, and validation.

2. **Service Layer Logic**: Business logic (like creating sales from invoices) is in the service layer, not controllers.

3. **Soft Deletes**: Expenses use soft deletes to maintain data integrity for financial reporting.

4. **Automated Sales**: Sales are automatically created when invoices are paid, ensuring accurate financial tracking.

5. **Aggregation Pipelines**: MongoDB aggregation is used for efficient financial calculations.

6. **Consistent Validation**: All inputs are validated using Joi schemas for type safety and security.

7. **User Isolation**: All queries are scoped to the authenticated user to ensure data privacy.

8. **Pagination**: All list endpoints support pagination to handle large datasets.

## 📝 Maintenance Notes

- When adding new expense categories, update the enum in the model
- Finance calculations default to last 12 months if no date range specified
- Sales from invoices cannot be manually edited or deleted
- Expense records are soft-deleted to preserve financial history
- All dates are stored as UTC in MongoDB

---

**Implementation Date**: 2024
**Developer**: Senior Backend Engineer
**Status**: ✅ Complete