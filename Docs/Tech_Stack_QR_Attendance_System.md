# QR Based - Smart Attendance Management System
## Finalized Technology Stack

---

## 1. Common / Core Stack (used across all panels)

| Layer | Technology |
|---|---|
| Backend-as-a-Service (DB + Auth + APIs) | **Supabase** (PostgreSQL, built-in Auth, auto-generated REST APIs, Row-Level Security) |
| Custom Backend Logic | **Supabase Edge Functions** (for QR generation, token expiry, verification logic) |
| Database | **PostgreSQL** (via Supabase) |
| Authentication | **Supabase Auth** (Role-Based Access Control — student / staff / admin) |
| QR Code Generation | **qrcode.js** |
| QR Code Scanning | **html5-qrcode** (in-app, browser-based camera scan via `getUserMedia`) |
| Hosting Requirement | **HTTPS-enabled deployment** (mandatory for camera access) |
| Version Control | **Git + GitHub** |
| Documentation Tools | **MS Word, MS PowerPoint** |

---

## 2. Admin Panel

| Layer | Technology |
|---|---|
| Frontend Framework | **React.js** |
| Data/Reports View | Supabase REST APIs (attendance records, session logs, user management) |
| Real-Time Updates | Supabase Realtime (for live monitoring dashboards) |
| Report Export | Client-side export (CSV/PDF generation library) |
| Access Control | Supabase Auth + Row-Level Security (admin role) |

---

## 3. Staff / Faculty Panel

| Layer | Technology |
|---|---|
| Frontend Framework | **React.js** |
| Session/QR Management | Supabase Edge Function (session creation, dynamic QR token refresh) |
| Live Attendance View | Supabase Realtime (live count of students marked present per session) |
| Access Control | Supabase Auth + Row-Level Security (staff role) |

---

## 4. Student Panel

| Layer | Technology |
|---|---|
| Frontend Framework | **React.js** (or lightweight HTML/CSS/JS build for faster load on college networks) |
| Scanning Module | **html5-qrcode** (in-app browser camera scan, no external scanner/app) |
| Attendance Marking | Plain REST call (non-real-time) to Supabase Edge Function for verification |
| Access Control | Supabase Auth + Row-Level Security (student role, restricted to own records) |

---

## 5. Network / Performance Considerations

| Concern | Chosen Approach |
|---|---|
| College WiFi congestion | Lightweight REST calls (small JSON payloads) instead of persistent socket connections for scan/mark actions |
| Real-time usage | Limited to Admin/Staff dashboards only; not used for student scan flow |
| QR expiry window | 30–45 seconds (balances proxy-prevention with network latency tolerance) |
