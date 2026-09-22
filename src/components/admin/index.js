import { renderAdminSidebar } from './AdminSidebar.js';
import { renderAdminTopbar } from './AdminTopbar.js';
import { renderAdminOverview } from './AdminOverview.js';
import { renderAddStudentView } from './AddStudentView.js';
import { renderAddFacultyView } from './AddFacultyView.js';
import { renderAddSubjectView } from './AddSubjectView.js';
import { renderAddSectionView } from './AddSectionView.js';
import { renderAssignClassView } from './AssignClassView.js';
import { AdminService } from '../../services/adminService.js';

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
          <p style="font-weight: 600; color: #1E293B;">Connecting to Supabase Database...</p>
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
          alert(`Student "${data.name}" enrolled successfully in Supabase!`);
          await this.refreshData();
          await this.render();
        } catch (err) {
          alert(`Failed to add student: ${err.message || err.details || 'Database error'}`);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Student to Database'; }
        }
      });
    }

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

    // 6. Assign Lecture Form
    const assignForm = this.container.querySelector('#form-assign-class');
    if (assignForm) {
      assignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = assignForm.querySelector('#btn-submit-assignment');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving Lecture Assignment...'; }

        const formData = new FormData(assignForm);
        const data = Object.fromEntries(formData.entries());

        try {
          await AdminService.assignFaculty(data);
          alert(`Lecture assigned to faculty in database successfully!`);
          await this.refreshData();
          await this.render();
        } catch (err) {
          alert(`Failed to assign lecture: ${err.message || err.details || 'Database error'}`);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Lecture Assignment in Database'; }
        }
      });
    }
  }
}

export const renderAdminDashboard = async (container) => {
  const app = new AdminDashboardApp(container);
  await app.init();
};
