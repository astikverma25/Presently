import { renderAdminSidebar } from './AdminSidebar.js';
import { renderAdminTopbar } from './AdminTopbar.js';
import { renderAdminOverview } from './AdminOverview.js';
import { renderAddStudentView } from './AddStudentView.js';
import { renderAddFacultyView } from './AddFacultyView.js';
import { renderAddSubjectView } from './AddSubjectView.js';
import { renderAddSectionView } from './AddSectionView.js';
import { renderAssignClassView } from './AssignClassView.js';
import { AdminService } from '../../services/adminService.js';
import { getLocalDateString } from '../../utils/dateUtils.js';

/**
 * Master Admin Dashboard Coordinator (Live Supabase Connected)
 */
export class AdminDashboardApp {
  constructor(container) {
    this.container = container;
    this.currentTab = 'add-student'; // 'overview' | 'add-student' | 'add-faculty' | 'add-class' | 'add-section' | 'assign-class'
    this.profile = null;
    this.students = [];
    this.faculty = [];
    this.subjects = [];
    this.sections = [];
    this.assignments = [];
    this.loading = true;
  }

  async init() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: var(--font-sans); color: var(--text-muted);">
        <div style="text-align: center;">
          <div style="width: 40px; height: 40px; border: 3px solid #E0E7FF; border-top-color: #4F46E5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;"></div>
          <p style="font-weight: 600; color: #1E293B;">Loading Admin Portal...</p>
        </div>
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;

    try {
      this.profile = await AdminService.getProfile();
      await this.refreshData();
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      this.loading = false;
      await this.render();
    }
  }

  async refreshData() {
    const [students, faculty, subjects, sections, assignments] = await Promise.all([
      AdminService.getStudents(),
      AdminService.getFaculty(),
      AdminService.getSubjects(),
      AdminService.getSections(),
      AdminService.getAssignments()
    ]);

    this.students = students;
    this.faculty = faculty;
    this.subjects = subjects;
    this.sections = sections;
    this.assignments = assignments;
  }

  async render() {
    let mainViewHTML = '';

    switch (this.currentTab) {
      case 'overview':
        mainViewHTML = renderAdminOverview();
        break;
      case 'add-student':
        mainViewHTML = renderAddStudentView(this.students, this.sections);
        break;
      case 'add-faculty':
        mainViewHTML = renderAddFacultyView(this.faculty);
        break;
      case 'add-class':
        mainViewHTML = renderAddSubjectView(this.subjects);
        break;
      case 'add-section':
        mainViewHTML = renderAddSectionView(this.sections);
        break;
      case 'assign-class':
        mainViewHTML = renderAssignClassView(this.assignments, this.subjects, this.sections, this.faculty);
        break;
      default:
        mainViewHTML = renderAdminOverview();
    }

    this.container.innerHTML = `
      <div class="admin-layout">
        ${renderAdminSidebar(this.currentTab)}
        <main class="admin-main">
          ${renderAdminTopbar(this.profile)}
          <div class="admin-content-area">
            ${mainViewHTML}
          </div>
        </main>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // 1. Sidebar Tab Navigation
    this.container.querySelectorAll('.admin-nav-item button').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.currentTab = btn.getAttribute('data-tab');
        await this.render();
      });
    });

    const adminLogoutBtn = this.container.querySelector('#btn-admin-logout');
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener('click', async () => {
        const { AuthService } = await import('../../services/authService.js');
        await AuthService.signOut();
      });
    }

    // 2. Add Student Form & Toggle Collapse Logic
    const toggleStudentBtn = this.container.querySelector('#btn-toggle-student-form');
    const studentCard = this.container.querySelector('#card-add-student');
    const closeStudentBtn = this.container.querySelector('#btn-close-student-form');
    const cancelStudentBtn = this.container.querySelector('#btn-cancel-student-form');

    const toggleStudentCard = (show) => {
      if (!studentCard) return;
      const isCurrentlyHidden = studentCard.classList.contains('hidden');
      const shouldShow = show !== undefined ? show : isCurrentlyHidden;

      if (shouldShow) {
        studentCard.classList.remove('hidden');
        if (toggleStudentBtn) {
          toggleStudentBtn.classList.add('active');
          toggleStudentBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            <span>Hide Form</span>
          `;
        }
        studentCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        studentCard.classList.add('hidden');
        if (toggleStudentBtn) {
          toggleStudentBtn.classList.remove('active');
          toggleStudentBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Add New Student</span>
          `;
        }
      }
    };

    if (toggleStudentBtn) {
      toggleStudentBtn.addEventListener('click', () => toggleStudentCard());
    }
    if (closeStudentBtn) {
      closeStudentBtn.addEventListener('click', () => toggleStudentCard(false));
    }
    if (cancelStudentBtn) {
      cancelStudentBtn.addEventListener('click', () => toggleStudentCard(false));
    }

    // Student Dropdown Filters & Search Logic (Default NONE)
    const sectionSelect = this.container.querySelector('#filter-student-section');
    const branchSelect = this.container.querySelector('#filter-student-branch');
    const semesterSelect = this.container.querySelector('#filter-student-semester');
    const searchInput = this.container.querySelector('#input-student-search');
    const resetBtn = this.container.querySelector('#btn-reset-student-filters');
    const studentRows = this.container.querySelectorAll('.student-table-row');
    const promptRow = this.container.querySelector('#row-select-classroom-prompt');
    const visibleCountElem = this.container.querySelector('#visible-students-count');

    let currentSectionFilter = 'none';
    let currentBranchFilter = 'all';
    let currentSemesterFilter = 'all';
    let currentSearchTerm = '';

    const applyStudentFilters = () => {
      // If no classroom is selected, show empty selection prompt
      if (currentSectionFilter === 'none') {
        if (promptRow) promptRow.style.display = '';
        studentRows.forEach(row => row.style.display = 'none');
        if (visibleCountElem) visibleCountElem.textContent = '0';
        return;
      }

      // Hide prompt when a classroom/section is chosen
      if (promptRow) promptRow.style.display = 'none';

      let visibleCount = 0;
      studentRows.forEach(row => {
        const rowSection = row.getAttribute('data-section') || '';
        const rowBranch = row.getAttribute('data-branch') || '';
        const rowSemester = row.getAttribute('data-semester') || '';
        const rowSearchData = row.getAttribute('data-search') || '';

        const matchesSection = (currentSectionFilter === 'all') || (rowSection === currentSectionFilter);
        const matchesBranch = (currentBranchFilter === 'all') || (rowBranch === currentBranchFilter);
        const matchesSemester = (currentSemesterFilter === 'all') || (rowSemester === currentSemesterFilter);
        const matchesSearch = !currentSearchTerm || rowSearchData.includes(currentSearchTerm);

        if (matchesSection && matchesBranch && matchesSemester && matchesSearch) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });

      if (visibleCountElem) {
        visibleCountElem.textContent = visibleCount;
      }
    };

    if (sectionSelect) {
      sectionSelect.addEventListener('change', (e) => {
        currentSectionFilter = e.target.value.toLowerCase();
        applyStudentFilters();
      });
    }

    if (branchSelect) {
      branchSelect.addEventListener('change', (e) => {
        currentBranchFilter = e.target.value.toLowerCase();
        applyStudentFilters();
      });
    }

    if (semesterSelect) {
      semesterSelect.addEventListener('change', (e) => {
        currentSemesterFilter = e.target.value.toLowerCase();
        applyStudentFilters();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearchTerm = (e.target.value || '').trim().toLowerCase();
        applyStudentFilters();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (sectionSelect) sectionSelect.value = 'none';
        if (branchSelect) branchSelect.value = 'all';
        if (semesterSelect) semesterSelect.value = 'all';
        if (searchInput) searchInput.value = '';

        currentSectionFilter = 'none';
        currentBranchFilter = 'all';
        currentSemesterFilter = 'all';
        currentSearchTerm = '';

        applyStudentFilters();
      });
    }

    const studentForm = this.container.querySelector('#form-add-student');
    if (studentForm) {
      studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = studentForm.querySelector('#btn-submit-student');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving to Database...'; }

        const formData = new FormData(studentForm);
        const data = Object.fromEntries(formData.entries());

        try {
          await AdminService.addStudent(data);
          alert(`Student "${data.name}" enrolled successfully!`);
          await this.refreshData();
          await this.render();
        } catch (err) {
          alert(`Failed to add student: ${err.message || err.details || 'Database error'}`);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Student to Database'; }
        }
      });
    }

    // 2.1 Reset Student Bound Device Action
    this.container.querySelectorAll('.btn-reset-student-device').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const studentId = btn.getAttribute('data-student-id');
        const studentName = btn.getAttribute('data-student-name') || 'Student';

        const confirmed = confirm(`Are you sure you want to reset the bound device for "${studentName}"?\n\nThis will allow the student to register their new phone on their next login.`);
        if (!confirmed) return;

        btn.disabled = true;
        btn.textContent = 'Resetting...';

        try {
          await AdminService.resetStudentDevice(studentId);
          alert(`Device binding for "${studentName}" has been reset successfully! The student can now log in and bind a new device.`);
          await this.refreshData();
          await this.render();
        } catch (err) {
          alert(`Failed to reset device binding: ${err.message || 'Database error'}`);
          btn.disabled = false;
          btn.textContent = '🔄 Reset Device';
        }
      });
    });

    // 3. Add Faculty Form
    const facultyForm = this.container.querySelector('#form-add-faculty');
    if (facultyForm) {
      facultyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = facultyForm.querySelector('#btn-submit-faculty');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Registering in Database...'; }

        const formData = new FormData(facultyForm);
        const data = Object.fromEntries(formData.entries());

        try {
          await AdminService.addFaculty(data);
          alert(`Faculty member "${data.name}" registered successfully!`);
          await this.refreshData();
          await this.render();
        } catch (err) {
          alert(`Failed to register faculty: ${err.message || err.details || 'Database error'}`);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Register Faculty in Database'; }
        }
      });
    }

    // 4. Add Lecture / Subject Form
    const subjectForm = this.container.querySelector('#form-add-subject');
    if (subjectForm) {
      subjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = subjectForm.querySelector('#btn-submit-subject');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving to Database...'; }

        const formData = new FormData(subjectForm);
        const data = Object.fromEntries(formData.entries());

        try {
          await AdminService.addSubject(data);
          alert(`Lecture / Subject "${data.subjectName}" (${data.subjectCode}) created!`);
          await this.refreshData();
          await this.render();
        } catch (err) {
          alert(`Failed to add lecture: ${err.message || err.details || 'Database error'}`);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Lecture to Database'; }
        }
      });
    }

    // 5. Create Classroom / Section Form
    const sectionForm = this.container.querySelector('#form-add-section');
    if (sectionForm) {
      sectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = sectionForm.querySelector('#btn-submit-section');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving to Database...'; }

        const formData = new FormData(sectionForm);
        const data = Object.fromEntries(formData.entries());

        try {
          await AdminService.addSection(data);
          alert(`Classroom / Section "${data.sectionName}" created successfully!`);
          await this.refreshData();
          await this.render();
        } catch (err) {
          alert(`Failed to create classroom: ${err.message || err.details || 'Database error'}`);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Classroom to Database'; }
        }
      });
    }

    // 6. Assign Lecture Form with Multi-Slot Weekly Scheduler & Toggle
    const toggleAssignBtn = this.container.querySelector('#btn-toggle-assign-form');
    const assignFormContainer = this.container.querySelector('#assign-form-container');
    const cancelAssignBtn = this.container.querySelector('#btn-cancel-assign-form');

    const toggleAssignForm = (show) => {
      if (!assignFormContainer) return;
      const isCurrentlyHidden = assignFormContainer.style.display === 'none' || assignFormContainer.classList.contains('hidden');
      const shouldShow = show !== undefined ? show : isCurrentlyHidden;

      if (shouldShow) {
        assignFormContainer.style.display = 'block';
        assignFormContainer.classList.remove('hidden');
        if (toggleAssignBtn) {
          toggleAssignBtn.style.background = '#FFF1F2';
          toggleAssignBtn.style.color = '#E11D48';
          toggleAssignBtn.style.borderColor = '#FECDD3';
          toggleAssignBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            <span>Close</span>
          `;
        }
      } else {
        assignFormContainer.style.display = 'none';
        assignFormContainer.classList.add('hidden');
        if (toggleAssignBtn) {
          toggleAssignBtn.style.background = '#EEF2FF';
          toggleAssignBtn.style.color = '#4338CA';
          toggleAssignBtn.style.borderColor = '#C7D2FE';
          toggleAssignBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Open</span>
          `;
        }
      }
    };

    if (toggleAssignBtn) {
      toggleAssignBtn.addEventListener('click', () => toggleAssignForm());
    }
    if (cancelAssignBtn) {
      cancelAssignBtn.addEventListener('click', () => toggleAssignForm(false));
    }

    // Active Lecture Assignments Filters (Faculty, Date, Class/Section)
    const filterFacultySelect = this.container.querySelector('#filter-assignment-faculty');
    const filterDateInput = this.container.querySelector('#filter-assignment-date');
    const filterSectionSelect = this.container.querySelector('#filter-assignment-section');
    const resetAssignFiltersBtn = this.container.querySelector('#btn-reset-assignment-filters');
    const assignmentRows = this.container.querySelectorAll('.assignment-table-row');
    const visibleAssignCountElem = this.container.querySelector('#visible-assignments-count');
    const noAssignMatchesRow = this.container.querySelector('#row-no-assignment-matches');

    const applyAssignmentFilters = () => {
      const selectedFaculty = filterFacultySelect ? filterFacultySelect.value : 'all';
      const selectedDate = filterDateInput ? filterDateInput.value : '';
      const selectedSection = filterSectionSelect ? filterSectionSelect.value : 'all';

      let matchCount = 0;
      assignmentRows.forEach(row => {
        const rowFacultyId = row.getAttribute('data-faculty-id') || '';
        const rowDate = row.getAttribute('data-lec-date') || '';
        const rowSectionId = row.getAttribute('data-section-id') || '';

        const matchFaculty = (selectedFaculty === 'all') || (rowFacultyId === selectedFaculty);
        const matchDate = !selectedDate || (rowDate === selectedDate);
        const matchSection = (selectedSection === 'all') || (rowSectionId === selectedSection);

        if (matchFaculty && matchDate && matchSection) {
          row.style.display = '';
          matchCount++;
        } else {
          row.style.display = 'none';
        }
      });

      if (visibleAssignCountElem) {
        visibleAssignCountElem.textContent = matchCount;
      }
      if (noAssignMatchesRow) {
        noAssignMatchesRow.style.display = (matchCount === 0 && assignmentRows.length > 0) ? '' : 'none';
      }
    };

    if (filterFacultySelect) filterFacultySelect.addEventListener('change', applyAssignmentFilters);
    if (filterDateInput) filterDateInput.addEventListener('input', applyAssignmentFilters);
    if (filterSectionSelect) filterSectionSelect.addEventListener('change', applyAssignmentFilters);
    if (resetAssignFiltersBtn) {
      resetAssignFiltersBtn.addEventListener('click', () => {
        if (filterFacultySelect) filterFacultySelect.value = 'all';
        if (filterDateInput) filterDateInput.value = '';
        if (filterSectionSelect) filterSectionSelect.value = 'all';
        applyAssignmentFilters();
      });
    }

    const assignForm = this.container.querySelector('#form-assign-class');
    if (assignForm) {
      const semesterSelect = assignForm.querySelector('#assign-semester-select');
      const sectionSelect = assignForm.querySelector('#assign-section-select');
      const subjectSelect = assignForm.querySelector('#assign-subject-select');

      const isSemMatch = (a, b) => {
        if (a === null || a === undefined || b === null || b === undefined) return false;
        const numA = parseInt(String(a).replace(/[^0-9]/g, ''), 10);
        const numB = parseInt(String(b).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA === numB;
        return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
      };

      const updateDependentDropdowns = (selectedSemester) => {
        if (!selectedSemester) {
          if (sectionSelect) {
            sectionSelect.innerHTML = '<option value="" disabled selected>← Choose Semester first</option>';
            sectionSelect.disabled = true;
          }
          if (subjectSelect) {
            subjectSelect.innerHTML = '<option value="" disabled selected>← Choose Semester first</option>';
            subjectSelect.disabled = true;
          }
          return;
        }

        // 1. Filter Sections
        const filteredSections = (this.sections || []).filter(sec => isSemMatch(sec.semester, selectedSemester));
        if (sectionSelect) {
          if (filteredSections.length > 0) {
            sectionSelect.innerHTML = `<option value="" disabled selected>Select Classroom / Section (${selectedSemester} Sem)...</option>` +
              filteredSections.map(sec => `
                <option value="${sec.id}">${sec.section_name || sec.sectionName} (${sec.branch || 'CSE'})</option>
              `).join('');
            sectionSelect.disabled = false;
          } else {
            sectionSelect.innerHTML = `<option value="" disabled selected>No classrooms found for ${selectedSemester} Sem (Add in Sections tab)</option>`;
            sectionSelect.disabled = true;
          }
        }

        // 2. Filter Subjects
        const filteredSubjects = (this.subjects || []).filter(s => isSemMatch(s.semester, selectedSemester));
        if (subjectSelect) {
          if (filteredSubjects.length > 0) {
            subjectSelect.innerHTML = `<option value="" disabled selected>Select Lecture / Subject (${selectedSemester} Sem)...</option>` +
              filteredSubjects.map(s => `
                <option value="${s.id}">${s.subject_name || s.subjectName} (${s.subject_code || s.subjectCode})</option>
              `).join('');
            subjectSelect.disabled = false;
          } else {
            subjectSelect.innerHTML = `<option value="" disabled selected>No subjects found for ${selectedSemester} Sem (Add in Subjects tab)</option>`;
            subjectSelect.disabled = true;
          }
        }
      };

      if (semesterSelect) {
        semesterSelect.addEventListener('change', (e) => {
          updateDependentDropdowns(e.target.value);
        });
        if (semesterSelect.value) {
          updateDependentDropdowns(semesterSelect.value);
        }
      }

      const slotsContainer = assignForm.querySelector('#lecture-slots-container');
      const addSlotBtn = assignForm.querySelector('#btn-add-slot');
      const clearSlotsBtn = assignForm.querySelector('#btn-clear-slots');
      const presetWeekdaysBtn = assignForm.querySelector('#btn-preset-weekdays');
      const submitBtnText = assignForm.querySelector('#btn-submit-assignment-text');

      const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      let slotCounter = 1;

      const formatYMD = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const getNextDayYMD = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        return formatYMD(d);
      };

      let slots = [
        {
          id: slotCounter++,
          lecDate: getLocalDateString(),
          startTime: '10:00:00',
          endTime: '11:00:00',
          roomNo: 'Room 101'
        }
      ];

      const renderSlots = () => {
        if (!slotsContainer) return;

        slotsContainer.innerHTML = slots.map((slot, index) => {
          const d = new Date(slot.lecDate + 'T00:00:00');
          const dayName = isNaN(d.getDay()) ? 'Scheduled Day' : fullDays[d.getDay()];

          return `
            <div class="lecture-slot-card" data-slot-id="${slot.id}" style="display: grid; grid-template-columns: 2fr 1.2fr 1.2fr 1.4fr auto; gap: 12px; align-items: end; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: border-color 0.15s;">
              <!-- Slot Date & Day Detection -->
              <div class="admin-form-group" style="margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0;">Slot #${index + 1} Date *</label>
                  <span class="slot-day-badge" style="font-size: 0.72rem; font-weight: 800; background: #EEF2FF; color: #4338CA; padding: 2px 8px; border-radius: 6px;">${dayName}</span>
                </div>
                <input type="date" class="admin-input slot-input-date" value="${slot.lecDate}" required style="font-weight: 600; padding: 9px 12px; font-size: 0.88rem;">
              </div>

              <!-- Start Time -->
              <div class="admin-form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px;">Start Time *</label>
                <input type="time" class="admin-input slot-input-start" value="${slot.startTime}" required step="1" style="font-weight: 600; padding: 9px 10px; font-size: 0.88rem;">
              </div>

              <!-- End Time -->
              <div class="admin-form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px;">End Time *</label>
                <input type="time" class="admin-input slot-input-end" value="${slot.endTime}" required step="1" style="font-weight: 600; padding: 9px 10px; font-size: 0.88rem;">
              </div>

              <!-- Room / Lab Number -->
              <div class="admin-form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px;">Room / Lab *</label>
                <input type="text" class="admin-input slot-input-room" value="${slot.roomNo}" required placeholder="Room 101" style="font-weight: 600; padding: 9px 12px; font-size: 0.88rem;">
              </div>

              <!-- Action Buttons (Duplicate & Delete) -->
              <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" class="btn-duplicate-slot" data-slot-id="${slot.id}" style="padding: 8px 12px; font-size: 0.8rem; font-weight: 700; border-radius: 8px; background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; cursor: pointer; white-space: nowrap;" title="Duplicate this slot">
                  + Copy
                </button>
                <button type="button" class="btn-remove-slot" data-slot-id="${slot.id}" ${slots.length <= 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : 'style="cursor:pointer;"'} style="padding: 8px 10px; font-size: 0.8rem; font-weight: 700; border-radius: 8px; background: #FFF1F2; color: #E11D48; border: 1px solid #FECDD3;" title="Delete this slot">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          `;
        }).join('');

        const count = slots.length;
        if (submitBtnText) submitBtnText.textContent = `Save ${count} Lecture Assignment${count > 1 ? 's' : ''} in Database`;

        // Attach input sync event listeners
        slotsContainer.querySelectorAll('.lecture-slot-card').forEach(card => {
          const slotId = parseInt(card.getAttribute('data-slot-id'), 10);
          const slotObj = slots.find(s => s.id === slotId);
          if (!slotObj) return;

          const dateInput = card.querySelector('.slot-input-date');
          const startInput = card.querySelector('.slot-input-start');
          const endInput = card.querySelector('.slot-input-end');
          const roomInput = card.querySelector('.slot-input-room');
          const dayBadge = card.querySelector('.slot-day-badge');

          dateInput?.addEventListener('change', (e) => {
            slotObj.lecDate = e.target.value;
            const d = new Date(slotObj.lecDate + 'T00:00:00');
            if (dayBadge) dayBadge.textContent = isNaN(d.getDay()) ? 'Scheduled Day' : fullDays[d.getDay()];
          });

          startInput?.addEventListener('change', (e) => {
            slotObj.startTime = e.target.value;
          });

          endInput?.addEventListener('change', (e) => {
            slotObj.endTime = e.target.value;
          });

          roomInput?.addEventListener('input', (e) => {
            slotObj.roomNo = e.target.value;
          });
        });

        // Attach Duplicate Slot listeners
        slotsContainer.querySelectorAll('.btn-duplicate-slot').forEach(btn => {
          btn.addEventListener('click', () => {
            const slotId = parseInt(btn.getAttribute('data-slot-id'), 10);
            const sourceSlot = slots.find(s => s.id === slotId);
            if (sourceSlot) {
              const newSlot = {
                id: slotCounter++,
                lecDate: sourceSlot.lecDate,
                startTime: sourceSlot.startTime,
                endTime: sourceSlot.endTime,
                roomNo: sourceSlot.roomNo
              };
              const insertIdx = slots.findIndex(s => s.id === slotId);
              slots.splice(insertIdx + 1, 0, newSlot);
              renderSlots();
            }
          });
        });

        // Attach Remove Slot listeners
        slotsContainer.querySelectorAll('.btn-remove-slot').forEach(btn => {
          btn.addEventListener('click', () => {
            if (slots.length <= 1) return;
            const slotId = parseInt(btn.getAttribute('data-slot-id'), 10);
            slots = slots.filter(s => s.id !== slotId);
            renderSlots();
          });
        });
      };

      renderSlots();

      // + Add Another Slot button (duplicates last slot with next day date)
      if (addSlotBtn) {
        addSlotBtn.addEventListener('click', () => {
          const lastSlot = slots[slots.length - 1];
          const newDate = lastSlot ? getNextDayYMD(lastSlot.lecDate) : getLocalDateString();
          slots.push({
            id: slotCounter++,
            lecDate: newDate,
            startTime: lastSlot ? lastSlot.startTime : '10:00:00',
            endTime: lastSlot ? lastSlot.endTime : '11:00:00',
            roomNo: lastSlot ? lastSlot.roomNo : 'Room 101'
          });
          renderSlots();
        });
      }

      // Clear / Reset Slots button
      if (clearSlotsBtn) {
        clearSlotsBtn.addEventListener('click', () => {
          slots = [
            {
              id: slotCounter++,
              lecDate: getLocalDateString(),
              startTime: '10:00:00',
              endTime: '11:00:00',
              roomNo: 'Room 101'
            }
          ];
          renderSlots();
        });
      }

      // Fill Mon-Fri Weekdays Preset
      if (presetWeekdaysBtn) {
        presetWeekdaysBtn.addEventListener('click', () => {
          const now = new Date();
          // Find next or current Monday
          let cur = new Date(now);
          while (cur.getDay() !== 1) { // 1 = Monday
            cur.setDate(cur.getDate() + 1);
          }

          const defaultRoom = slots[0]?.roomNo || 'Room 101';
          const newSlots = [];
          for (let i = 0; i < 5; i++) {
            newSlots.push({
              id: slotCounter++,
              lecDate: formatYMD(cur),
              startTime: '10:00:00',
              endTime: '11:00:00',
              roomNo: defaultRoom
            });
            cur.setDate(cur.getDate() + 1);
          }
          slots = newSlots;
          renderSlots();
        });
      }

      // Form Submit (Batch Create)
      assignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (slots.length === 0) {
          alert('Please configure at least 1 lecture slot.');
          return;
        }

        const submitBtn = assignForm.querySelector('#btn-submit-assignment');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving Lecture Assignments...'; }

        const formData = new FormData(assignForm);
        const data = Object.fromEntries(formData.entries());

        try {
          const res = await AdminService.assignFaculty({
            ...data,
            slots: slots
          });
          const countCreated = res?.length || slots.length;
          alert(`Success! Scheduled ${countCreated} lecture assignment(s) for the faculty in database!`);
          await this.refreshData();
          await this.render();
        } catch (err) {
          alert(`Failed to assign lectures: ${err.message || err.details || 'Database error'}`);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Lecture Assignments in Database'; }
        }
      });
    }

    // 7. Edit & Delete Existing Lecture Assignments
    const editModal = this.container.querySelector('#modal-edit-assignment');
    const editForm = this.container.querySelector('#form-edit-assignment');
    const closeEditModalBtn = this.container.querySelector('#btn-close-edit-modal');
    const cancelEditBtn = this.container.querySelector('#btn-cancel-edit-assignment');
    const editLecDateInput = this.container.querySelector('#edit-lec-date');
    const editDayBadge = this.container.querySelector('#edit-slot-day-badge');
    const fullDaysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const closeEditModal = () => {
      if (editModal) {
        editModal.style.display = 'none';
        editModal.classList.remove('active');
      }
    };

    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
    if (editModal) {
      editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
      });
    }

    // Date change listener in edit modal
    if (editLecDateInput && editDayBadge) {
      editLecDateInput.addEventListener('change', (e) => {
        const d = new Date(e.target.value + 'T00:00:00');
        editDayBadge.textContent = isNaN(d.getDay()) ? 'Day' : fullDaysArr[d.getDay()];
      });
    }

    // Attach Edit button click handlers
    this.container.querySelectorAll('.btn-edit-assignment').forEach(btn => {
      btn.addEventListener('click', () => {
        const assignmentId = btn.getAttribute('data-id');
        const a = this.assignments.find(item => item.id === assignmentId);
        if (!a || !editModal) return;

        const subjectName = a.subject?.subject_name || a.section_subject?.subject?.subject_name || a.subjectName || 'Course';
        const subjectCode = a.subject?.subject_code || a.section_subject?.subject?.subject_code || a.subjectCode || '';
        const sectionName = a.section?.section_name || a.section_subject?.section?.section_name || a.sectionName || 'Class';
        const lecId = a.lec_id || `LEC-${(a.id || '').slice(0, 6).toUpperCase()}`;

        // Populate modal fields
        const idInput = editModal.querySelector('#edit-assignment-id');
        const subtitle = editModal.querySelector('#edit-assignment-subtitle');
        const classSubjectText = editModal.querySelector('#edit-class-subject-text');
        const facultySelect = editModal.querySelector('#edit-faculty-select');
        const startTimeInput = editModal.querySelector('#edit-start-time');
        const endTimeInput = editModal.querySelector('#edit-end-time');
        const roomNoInput = editModal.querySelector('#edit-room-no');

        if (idInput) idInput.value = a.id;
        if (subtitle) subtitle.textContent = `Lecture ID: ${lecId}`;
        if (classSubjectText) classSubjectText.textContent = `Section ${sectionName} • ${subjectName} (${subjectCode})`;
        if (facultySelect) facultySelect.value = a.faculty?.id || a.faculty_id || '';
        if (editLecDateInput) {
          editLecDateInput.value = a.lec_date || getLocalDateString();
          const d = new Date(editLecDateInput.value + 'T00:00:00');
          if (editDayBadge) editDayBadge.textContent = isNaN(d.getDay()) ? 'Day' : fullDaysArr[d.getDay()];
        }
        if (startTimeInput) startTimeInput.value = a.start_time || '10:00:00';
        if (endTimeInput) endTimeInput.value = a.end_time || '11:00:00';
        if (roomNoInput) roomNoInput.value = a.room_no || 'Room 101';

        editModal.style.display = 'flex';
        editModal.classList.add('active');
      });
    });

    // Edit Form Submit Handler
    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = editForm.querySelector('#btn-submit-edit-assignment');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Updating...'; }

        const formData = new FormData(editForm);
        const data = Object.fromEntries(formData.entries());
        const assignmentId = data.assignmentId;

        try {
          await AdminService.updateAssignment(assignmentId, {
            facultyId: data.facultyId,
            lecDate: data.lecDate,
            startTime: data.startTime,
            endTime: data.endTime,
            roomNo: data.roomNo
          });

          alert('Lecture assignment updated successfully!');
          closeEditModal();
          await this.refreshData();
          await this.render();
        } catch (err) {
          alert(`Failed to update assignment: ${err.message || 'Database error'}`);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Update Assignment'; }
        }
      });
    }

    // Attach Delete Confirmation Modal handlers
    const deleteModal = this.container.querySelector('#modal-delete-assignment');
    const deleteMsg = this.container.querySelector('#delete-assignment-message');
    const deleteIdInput = this.container.querySelector('#delete-assignment-id');
    const cancelDeleteBtn = this.container.querySelector('#btn-cancel-delete-modal');
    const confirmDeleteBtn = this.container.querySelector('#btn-confirm-delete-assignment');

    const closeDeleteModal = () => {
      if (deleteModal) {
        deleteModal.style.display = 'none';
        deleteModal.classList.remove('active');
      }
    };

    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    if (deleteModal) {
      deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
      });
    }

    this.container.querySelectorAll('.btn-delete-assignment').forEach(btn => {
      btn.addEventListener('click', () => {
        const assignmentId = btn.getAttribute('data-id');
        const a = this.assignments.find(item => item.id === assignmentId);
        if (!a || !deleteModal) return;

        const lecId = a.lec_id || `LEC-${(a.id || '').slice(0, 6).toUpperCase()}`;
        const subjectName = a.subject?.subject_name || a.section_subject?.subject?.subject_name || a.subjectName || 'this subject';
        const sectionName = a.section?.section_name || a.section_subject?.section?.section_name || a.sectionName || '';

        if (deleteIdInput) deleteIdInput.value = a.id;
        if (deleteMsg) {
          deleteMsg.innerHTML = `Are you sure you want to delete assignment <strong>${lecId}</strong> for <strong>${subjectName}</strong> (Sec ${sectionName}) on <strong>${a.lec_date || ''}</strong>?<br><span style="color:#DC2626; font-size:0.82rem; margin-top:4px; display:inline-block;">This action cannot be undone.</span>`;
        }

        deleteModal.style.display = 'flex';
        deleteModal.classList.add('active');
      });
    });

    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', async () => {
        const assignmentId = deleteIdInput ? deleteIdInput.value : null;
        if (!assignmentId) return;

        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = 'Deleting...';

        try {
          await AdminService.deleteAssignment(assignmentId);
          closeDeleteModal();
          alert('Lecture assignment deleted successfully.');
          await this.refreshData();
          await this.render();
        } catch (err) {
          alert(`Failed to delete assignment: ${err.message || 'Database error'}`);
          confirmDeleteBtn.disabled = false;
          confirmDeleteBtn.textContent = 'Yes, Delete Assignment';
        }
      });
    }
  }
}

export const renderAdminDashboard = async (container) => {
  const app = new AdminDashboardApp(container);
  await app.init();
};
