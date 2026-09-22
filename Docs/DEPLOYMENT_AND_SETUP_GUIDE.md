# 🚀 Complete Deployment & Secure Setup Guide

This guide walks you through the step-by-step process of setting up **Presently** on **Supabase** (Database, Auth, & Edge Functions) and deploying the frontend securely on **Netlify**.

---

## 📑 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Step 1: Supabase Backend Setup](#2-step-1-supabase-backend-setup)
3. [Step 2: Frontend Environment Configuration](#3-step-2-frontend-environment-configuration)
4. [Step 3: Deploying to Netlify](#4-step-3-deploying-to-netlify)
5. [Step 4: Security Hardening & Best Practices](#5-step-4-security-hardening--best-practices)
6. [Step 5: Verification & Smoke Testing](#6-step-5-verification--smoke-testing)

---

## 1. Prerequisites

Before beginning, make sure you have:
- [Node.js](https://nodejs.org/) (v18 or higher) & `npm` installed.
- A [GitHub](https://github.com/) / [GitLab](https://gitlab.com/) account for version control.
- A free [Supabase](https://supabase.com/) account.
- A free [Netlify](https://www.netlify.com/) account.

---

## 2. Step 1: Supabase Backend Setup

### 2.1 Create a New Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Choose your Organization, enter Name (e.g. `presently-attendance`), set a secure **Database Password**, and select your nearest region.
4. Click **Create new project** and wait ~2 minutes for provisioning.

### 2.2 Run Database Migrations
1. In your Supabase Dashboard, navigate to the **SQL Editor** (left sidebar icon `>_`).
2. Run each migration file located in `supabase/migrations/` in sequential order:
   - `supabase/migrations/20260921000001_create_schema.sql` (Creates core tables: users, departments, subjects, sections)
   - `supabase/migrations/20260921000002_create_attendance_tables.sql` (Creates attendance_sessions & attendance_records)
   - `supabase/migrations/20260921000003_create_roles_and_auth.sql` (Creates RBAC and RLS policies)
   - `supabase/migrations/20260921000004_create_admin_table.sql`
   - `supabase/migrations/20260921000005_fix_is_admin_check.sql`
   - `supabase/migrations/20260921000006_fix_permissions_and_recursion.sql`
   - `supabase/migrations/20260921000007_remove_auth_users_dependency.sql`
   - `supabase/migrations/20260922000008_fix_faculty_assignment_rls.sql`
   - `supabase/migrations/20260922000009_add_lecture_id_and_date_to_assignments.sql`
   - `supabase/migrations/20260922000010_student_password_auth.sql`

3. (Optional) Run `supabase/seeds/seed.sql` to populate initial demo faculty, students, classes, and admin accounts.

### 2.3 Retrieve API Credentials
1. In Supabase Dashboard, go to **Project Settings** (gear icon) ➔ **API**.
2. Copy the following keys:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **Project API Anon Key** (`anon` `public` key)

> ⚠️ **CRITICAL SECURITY RULE:** Never expose or commit the `service_role` (secret) key to the frontend repository! Only the `anon` public key is used by the frontend client.

---

## 3. Step 2: Frontend Environment Configuration

### 3.1 Local Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3.2 Build Verification
Test the production multi-page build locally:
```bash
npm install
npm run build
```
Ensure all pages (`index.html`, `admin.html`, `faculty.html`, `student.html`) are output into `dist/`.

---

## 4. Step 3: Deploying to Netlify

### Option A: Deploy via GitHub / GitLab (Recommended - Continuous Deployment)

1. **Push your code to GitHub**:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

2. **Connect to Netlify**:
   - Log into [Netlify](https://app.netlify.com/).
   - Click **Add new site** ➔ **Import an existing project**.
   - Select **GitHub** and choose your repository.

3. **Configure Build Settings**:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   *(Netlify automatically detects these from the included `netlify.toml` file)*.

4. **Set Environment Variables**:
   - Under **Environment variables**, click **Add a variable** and enter:
     - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `your-anon-public-key`

5. **Click Deploy Site**:
   - Netlify will build and deploy your site with a custom live URL (e.g., `https://presently-demo.netlify.app`).

---

### Option B: Deploy via Netlify CLI

1. Install Netlify CLI globally:
   ```bash
   npm install -g netlify-cli
   ```
2. Link or create site:
   ```bash
   ntl login
   ntl init
   ```
3. Set environment variables on Netlify:
   ```bash
   ntl env:set VITE_SUPABASE_URL "https://your-project.supabase.co"
   ntl env:set VITE_SUPABASE_ANON_KEY "your-anon-public-key"
   ```
4. Deploy to production:
   ```bash
   ntl deploy --prod --build
   ```

---

## 5. Step 4: Security Hardening & Best Practices

### 5.1 Pre-configured Security Headers (`netlify.toml`)
The repository includes a ready-to-use `netlify.toml` which applies:
- **HTTPS Enforced**: Netlify provides automated, free TLS/SSL certificates.
- **Permissions-Policy**: Explicitly enables `camera=(self)` while blocking unauthorized microphone and geolocation access.
- **Content Security Policy (CSP)**: Restricts script, style, and connection endpoints strictly to `self`, `*.supabase.co`, and Google Fonts.
- **X-Frame-Options: DENY**: Protects against clickjacking.
- **X-Content-Type-Options: nosniff**: Prevents MIME-sniffing attacks.

### 5.2 Mobile Camera Permission (HTTPS Requirement)
- Modern mobile web browsers (Chrome, Safari, Firefox) **strictly forbid** camera access (`navigator.mediaDevices.getUserMedia`) over unencrypted HTTP.
- Deploying to Netlify automatically grants an HTTPS domain, ensuring seamless QR code scanning on iOS and Android devices without camera permission errors.

### 5.3 Row Level Security (RLS)
- Supabase tables are protected with Row Level Security.
- Students can only view their own attendance records.
- Faculty can only generate sessions and view students in their assigned sections.
- Admins have scoped management capabilities.

---

## 6. Step 5: Verification & Smoke Testing

Once deployed, verify all endpoints on your Netlify URL:

| Module | URL Path | Verification Checks |
|---|---|---|
| **Landing Page** | `/index.html` | Hero animation, quick login selector, responsive layout |
| **Faculty Portal** | `/faculty.html` | Log in as faculty, start QR session, dynamic timer updates |
| **Student Portal** | `/student.html` | Open on phone over HTTPS, grant camera access, scan rolling QR |
| **Admin Portal** | `/admin.html` | View live metrics, manage courses/faculty, export reports |

---

## 🛠️ Summary of Key Commands

```bash
# Start local development
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```
