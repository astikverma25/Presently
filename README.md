# Presently - Smart QR-Based Attendance Management System

**Presently** is a cloud-powered, proxy-resistant smart attendance management platform built with Supabase, dynamic rolling QR codes, and lightweight web scanning.

---

## 📁 Project Architecture & Folder Structure

```
Presently/
├── .vscode/                     # Recommended editor settings
├── Docs/                        # Specifications & tech stack definitions
│   └── Tech_Stack_QR_Attendance_System.md
├── Design_docs/                 # Design references & mockups
├── supabase/                    # Supabase backend configuration & Edge Functions
│   ├── config.toml              # Local Supabase CLI configuration
│   ├── migrations/              # PostgreSQL schema migrations (RBAC & RLS)
│   │   ├── 20260921000001_create_schema.sql
│   │   ├── 20260921000002_create_attendance_tables.sql
│   │   └── 20260921000003_create_roles_and_auth.sql
│   ├── functions/               # Supabase Edge Functions (Deno / TypeScript)
│   │   ├── generate-qr-token/   # Rolling dynamic QR code token generator
│   │   ├── verify-attendance/   # Anti-proxy scan verifier & attendance logging
│   │   └── export-report/       # Aggregation & report exports
│   └── seeds/                   # Sample database seed data
│       └── seed.sql
├── public/                      # Static assets & image drop-in directory
│   └── assets/                  # Hero illustrations, icons, avatars, mockups
├── src/                         # Frontend Application Source
│   ├── components/
│   │   ├── landing/             # Landing page components & interactive modals
│   │   │   ├── AuthModal.js     # Role selector & login modal
│   │   │   ├── DemoModal.js     # Live demo booking modal
│   │   │   └── TutorialModal.js # Video tutorial modal
│   │   ├── qr/                  # Dynamic QR Generator & Scanner modules
│   │   │   ├── QRGenerator.js   # qrcode.js integration with rolling interval
│   │   │   └── QRScanner.js     # html5-qrcode camera capture module
│   │   ├── admin/               # Admin panel views & reports
│   │   ├── staff/               # Staff session & live attendance view
│   │   └── student/             # Student scan & personal history
│   ├── lib/
│   │   └── supabaseClient.js    # Supabase JS SDK client
│   ├── styles/                  # Clean CSS architecture
│   │   ├── variables.css        # Design tokens, palette, typography
│   │   ├── main.css             # Resets, buttons, modal system
│   │   └── landing.css          # Pixel-perfect landing page styling
│   ├── utils/                   # Date formatters, CSV export helpers, QR parser
│   └── main.js                  # Landing page interaction handler
├── index.html                   # High-fidelity landing page entry point
├── package.json                 # Project dependencies & scripts
└── README.md                    # Project documentation
```

---

## 🖼️ Adding Custom PNG Assets

The landing page comes pre-packaged with high-resolution vector artwork. If you have custom PNG images to drop in:

1. **Hero Student Image**: Place your image at `public/assets/studenticon.png` (or `.svg`).
2. **Mobile Device Mockup**: Place your screenshot at `public/assets/app-screen-mockup.png`.
3. **Avatars**: Place customer avatars in `public/assets/avatars/`.

---

## 🚀 Getting Started Locally

### Option 1: Live Preview via Vite
```bash
npm install
npm run dev
```

### Option 2: Direct Browser View
Simply open `index.html` in any modern web browser or run with any static HTTP server.

---

## 🌐 Deployment & Security Guide

For a complete step-by-step production deployment guide with **Netlify**, **Supabase backend provisioning**, and **security hardening (CSP, HTTPS camera permissions, RLS)**, refer to:
👉 **[Deployment & Setup Guide](file:///d:/Attendence/Docs/DEPLOYMENT_AND_SETUP_GUIDE.md)**

