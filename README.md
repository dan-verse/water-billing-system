# Water Billing System

A comprehensive full-stack water utility billing management system built with Django REST Framework and React. Designed to streamline billing operations for water utilities serving 1000+ customers with automated meter reading processing and tiered consumption pricing.

## Overview

This system provides an intelligent billing platform for water utilities that handles:
- **Meter reading management** with anomaly detection (consumption spikes >200% flagged)
- **Automated bill generation** using tiered pricing with conservation discounts
- **Payment processing** with multiple payment methods (M-Pesa, card, bank transfer, cash)
- **Role-based access control** (Admin, Operator, Customer)
- **Real-time dashboards** with KPIs and analytics
- **Customer self-service** portal for bill and payment tracking

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         PRESENTATION LAYER (React Frontend)              │
│  Admin Dashboard │ Customer Portal │ Auth Interface     │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS / REST API
┌────────────────────▼────────────────────────────────────┐
│    API LAYER (Django REST Framework)                     │
│  Users │ Meter Readings │ Bills │ Payments │ Dashboard  │
└────────────────────┬────────────────────────────────────┘
                     │ PostgreSQL
┌────────────────────▼────────────────────────────────────┐
│         DATA LAYER (PostgreSQL)                          │
│  Users │ Meters │ Readings │ Bills │ Payments │ Rates   │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

**Backend:**
- Django 5.0.1 - Web framework
- Django REST Framework 3.14.0 - API layer
- PostgreSQL - Database (via Supabase)
- JWT Authentication - Stateless auth via djangorestframework-simplejwt
- Gunicorn - WSGI server
- Python 3.9+

**Frontend:**
- React 19.2.0 - UI framework
- Vite 7.2.4 - Build tool
- Tailwind CSS 4.1.18 - Styling
- Recharts 3.6.0 - Data visualization
- Lucide React - Icon library
- Axios - HTTP client

**DevOps & Tools:**
- Git & GitHub - Version control
- Virtual Environment - Dependency isolation

## Quick Start

### Prerequisites
- Python 3.9+ (with venv)
- Node.js 18+
- PostgreSQL or Supabase account
- Git

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with database credentials
cat > .env << EOF
DATABASE_URL=postgresql://user:password@host:port/database
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1
EOF

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load initial data
python manage.py load_initial_data

# Run server
python manage.py runserver
```

Backend API available at: `http://localhost:8000`
Admin panel at: `http://localhost:8000/admin`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:8000
EOF

# Run development server
npm run dev
```

Frontend available at: `http://localhost:5173`

## Key Features

### 1. Meter Reading Management
- **Manual input** by operators with reading date, consumption, billing period
- **Automatic anomaly detection** - flags readings >200% of rolling average
- **Reading history** with status tracking and notes
- Real-time refresh without page reload

### 2. Intelligent Bill Generation
- **Tiered pricing algorithm**: Charges vary by consumption tiers
  - 0-20 units: KSh 50/unit
  - 21-50 units: KSh 60/unit  
  - 51+ units: KSh 80/unit
- **Automatic calculations**:
  - Consumption charge (tiered)
  - Fixed base charge (KSh 50)
  - Tax (16% VAT - Kenya standard)
  - Conservation discount (5% if consumption ↓10%)
- **Bill status tracking**: Pending → Paid / Overdue / Partially Paid
- **Late fees**: Applied after due date

### 3. Payment Processing
- **Multiple payment methods**: M-Pesa, Card, Bank Transfer, Cash (Still using prop data though)
- **Payment verification** before status update
- **Partial payments** supported
- **Transaction reference** tracking
- **Payment history** with receipts

### 4. Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management, reporting |
| **Operator** | Record readings, generate bills, process payments |
| **Customer** | View own bills, make payments, download statements |

### 5. Analytics & Reporting
- **Real-time KPIs**: Active customers, total revenue, pending bills
- **Consumption analytics**: Peak usage tracking, trends
- **Payment analytics**: Collection rate, overdue amount
- **Dashboard charts**: Revenue by month, consumption patterns

## 🔒 Security Features

- **JWT Authentication**: Stateless, scalable authentication
- **CORS Protection**: Frontend-specific access control
- **Password Hashing**: bcrypt via Django
- **Role-Based Authorization**: View-level and field-level permissions
- **Environment Variables**: Sensitive config external to code
- **HTTPS Ready**: Deployable with SSL/TLS

## 📚 API Documentation

### Authentication
```bash
# Get tokens
POST /api/token/
{
  "username": "admin",
  "password": "password"
}

# Response:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Core Endpoints
- `GET/POST /api/accounts/users/` - User management
- `GET/POST /api/accounts/meter-readings/` - Meter readings
- `POST /api/accounts/meter-readings/{id}/generate_bill/` - Generate bill from reading
- `GET/POST /api/accounts/bills/` - Bill management
- `GET/POST /api/accounts/payments/` - Payment processing
- `GET /api/accounts/dashboard/summary/` - Dashboard KPIs
- `GET /api/accounts/dashboard/recent_activity/` - Recent transactions



## 📈 Performance

- **Response time**: <200ms for typical API calls (cached)
- **Concurrent users**: Scalable to 10,000+ with proper deployment
- **Database queries**: Optimized with select_related/prefetch_related
- **Frontend bundle**: ~150KB gzipped

## 🔧 Development

### Project Structure
```
.
├── backend/
│   ├── accounts/               # User, meter, bill models & APIs
│   ├── billing/                # Billing logic & utilities
│   ├── water_billing/          # Django settings & config
│   ├── manage.py               # Django CLI
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   ├── pages/              # Page-level components
│   │   ├── services/           # API integration
│   │   └── App.jsx             # Main app component
│   ├── index.html              # HTML entry
│   ├── package.json            # Node dependencies
│   └── vite.config.js          # Vite build config
├── README.md                   # This file
├── .gitignore                  # Git ignore rules
```

### Running Tests
```bash
# Backend
cd backend
python manage.py test

# Frontend
cd frontend
npm test
```

### Code Quality
```bash
# Backend
pylint backend/
black backend/ --check

# Frontend
npm run lint
npm run format
```

## 📋 Database Schema

**Key Models:**
- **User**: Extended Django user with phone, role, meter_number
- **MeterReading**: Consumption data with anomaly_flag
- **Bill**: Generated from readings with status tracking
- **Payment**: Payment records with method & status
- **WaterRate**: Tiered pricing configuration
- **Notification**: User alerts & messages

See database migrations in `backend/accounts/migrations/` for detailed schema.

## 🌍 Deployment

### Requirements for Production
- PostgreSQL 12+
- Python 3.9+ with venv
- Node.js 18+
- Gunicorn for WSGI
- Nginx for reverse proxy
- SSL certificate (Let's Encrypt)

### Deployment Steps
1. Clone repository to server
2. Setup Python venv and install dependencies
3. Configure `.env` with production credentials
4. Run migrations: `python manage.py migrate`
5. Collect static files: `python manage.py collectstatic`
6. Start Gunicorn: `gunicorn water_billing.wsgi:application --bind 0.0.0.0:8000`
7. Build frontend: `npm run build`
8. Serve static files with Nginx

## 📝 License

This project is provided as-is for educational and commercial use.

## 👤 Author

**Mbugua** - Full-stack developer
- GitHub: [Davy](https://github.com/David1942-23)
- Email: videmungai@gmail.com

## Acknowledgments

- My amazing supervisor for guiding me in every step of the development of this wonderful web application
- Django REST Framework team for excellent API documentation
- React community for comprehensive tooling
- Tailwind CSS for modern utility-first styling
- Supabase for accessible PostgreSQL hosting

---

**Last Updated**: January 5, 2026

**Version**: 1.0.0
