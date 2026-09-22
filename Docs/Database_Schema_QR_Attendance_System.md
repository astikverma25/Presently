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

## 5. section_subjects

Represents a unique subject-section offering (solves duplicate class-name ambiguity).

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| subject_id | UUID (FK → subjects) | |
| section_id | UUID (FK → sections) | |
| — | — | `UNIQUE(subject_id, section_id)` |

---

## 6. faculty_assignment

Links a faculty member to a specific section_subject, with editable lecture timing.

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| section_subject_id | UUID (FK → section_subjects) | |
| faculty_id | UUID (FK → faculty) | |
| day_of_week | Text | |
| start_time | Time | Editable |
| end_time | Time | Editable |
| room_no | Text | Editable |

---

## 7. attendance_sessions

One QR session instance for a lecture.

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| faculty_assignment_id | UUID (FK → faculty_assignment) | |
| date | Date | |
| qr_expiry_sec | Integer | Default 15, editable by faculty at session start |
| started_at | Timestamp | |
| ended_at | Timestamp | |

---

## 8. attendance_records

One student's attendance mark for a session.

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| session_id | UUID (FK → attendance_sessions) | |
| student_id | UUID (FK → students) | |
| status | Text | present / absent |
| marked_at | Timestamp | Null if absent |
| — | — | `UNIQUE(session_id, student_id)` |

---

## 9. Access Control Summary

| Role | Access scope |
|---|---|
| Admin | Full read/write on all tables |
| Faculty | Read/write limited to sections in their own `faculty_assignment` rows |
| Student | Read own `students` record and own `attendance_records` only |

Enforced at both the application query layer and via Row-Level Security (Supabase/PostgreSQL).
