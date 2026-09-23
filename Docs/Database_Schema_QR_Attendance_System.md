# QR Based - Smart Attendance Management System
## Database Tables & Schema

---

## 1. faculty

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | Text | |
| email | Text | Login identifier |
| department | Text | |
| created_at | Timestamp | |

---

## 2. students

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | Text | Filled by admin |
| roll_no | Text | Filled by admin, unique |
| section_id | UUID (FK → sections) | Filled by admin |
| semester | Text | Filled by admin |
| branch | Text | Filled by admin |
| date_of_birth | Date | Filled by admin |
| admission_id | Text | Filled by admin |
| personal_email | Text | Filled by admin |
| phone | Text | Filled by admin (or later by student) |
| parent_contact | Text | Filled by admin |
| photo_url | Text | Filled by admin at creation (required — used in live attendance roster) |
| login_username | Text | Auto-generated (roll_no or email) |
| password_hash | Text | Auto-generated temp password, changed by student on first login |
| device_id | Text | Auto-populated after first student login (anti-proxy tracking) |
| account_status | Text | active / suspended |
| created_at | Timestamp | |

---

## 3. subjects

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| subject_name | Text | e.g. "Data Structures" |
| subject_code | Text | |
| semester | Text | |

---

## 4. sections

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| section_name | Text | e.g. "2A" |
| branch | Text | |
| semester | Text | |
| total_students | Integer | |

---

## 5. faculty_assignment

Directly links a faculty member, subject, and section with scheduled lecture date and timing. Single source of truth for lecture schedule.

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| faculty_id | UUID (FK → faculty) | |
| subject_id | UUID (FK → subjects) | Direct link to Subject Master |
| section_id | UUID (FK → sections) | Direct link to Section Master |
| lec_id | Text (Unique) | e.g. `LEC-20260922-A1B2C` |
| lec_date | Date | Indian Standard Date (`YYYY-MM-DD`). Day of week derived automatically. |
| status | Text | `scheduled`, `ongoing`, `completed`, `cancelled` |
| start_time | Time | e.g. `10:00:00` |
| end_time | Time | e.g. `11:00:00` |
| room_no | Text | e.g. `Room 201`, `Lab 3` |

---

## 7. attendance_sessions

One QR session instance for a live lecture. Linked directly to `faculty_assignment`.

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| faculty_assignment_id | UUID (FK → faculty_assignment) | Inherits scheduled lecture date & details |
| qr_expiry_sec | Integer | Default 15, editable by faculty at session start |
| current_qr_token | Text | Rolling dynamic TOTP cryptographic payload |
| token_expires_at | Timestamptz | Expiry timestamp for rolling token |
| started_at | Timestamptz | Session start UTC timestamp |
| ended_at | Timestamptz | Session close UTC timestamp |
| status | Text | `active`, `completed`, `cancelled` |

---

## 8. attendance_records

One student's attendance mark for a lecture session.

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| session_id | UUID (FK → attendance_sessions, nullable) | Session instance |
| faculty_assignment_id | UUID (FK → faculty_assignment) | Direct link to lecture assignment |
| student_id | UUID (FK → students) | |
| lec_id | Text | Unique lecture identifier |
| lecture_date | Date | Indian Standard Date (`YYYY-MM-DD`) |
| status | Text | `present`, `absent`, `late` |
| marked_at | Timestamptz | Check-in timestamp (formatted in IST) |
| verification_method | Text | `qr_scan`, `manual_override`, `face_verified` |
| device_id | Text | Anti-proxy device tracking |
| — | — | `UNIQUE(session_id, student_id)` |

---

## 9. Access Control Summary

| Role | Access scope |
|---|---|
| Admin | Full read/write on all tables |
| Faculty | Read/write limited to sections in their own `faculty_assignment` rows |
| Student | Read own `students` record and own `attendance_records` only |

Enforced at both the application query layer and via Row-Level Security (Supabase/PostgreSQL).
