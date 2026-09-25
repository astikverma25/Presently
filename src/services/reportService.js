import { supabase } from '../lib/supabaseClient.js';
import { getIndianDateString, formatIndianDate } from '../utils/dateUtils.js';

/**
 * Service for Institutional Faculty Attendance Reporting & Multi-Date Matrix Generation
 */
export class ReportService {
  /**
   * 1. Get filtered Section & Subject options for a specific Faculty
   * (Only returns sections and subjects in which this faculty member has assigned lectures)
   */
  static async getFacultyReportOptions(facultyId) {
    try {
      if (!facultyId) return { sections: [] };

      const { data: assignments, error } = await supabase
        .from('faculty_assignment')
        .select(`
          id,
          lec_id,
          subject_id,
          section_id,
          subject:subject_id (id, subject_name, subject_code, semester),
          section:section_id (id, section_name, branch, semester, total_students)
        `)
        .eq('faculty_id', facultyId);

      if (error || !assignments) {
        console.error('Error fetching faculty assignment options:', error);
        return { sections: [] };
      }

      // Group by Section -> Subjects
      const sectionMap = new Map();

      assignments.forEach((a) => {
        const sec = a.section;
        const sub = a.subject;
        if (!sec || !sec.id) return;

        if (!sectionMap.has(sec.id)) {
          sectionMap.set(sec.id, {
            sectionId: sec.id,
            sectionName: sec.section_name,
            branch: sec.branch || 'CSE',
            semester: sec.semester || '',
            totalStudents: sec.total_students || 0,
            displayName: `Section ${sec.section_name} (${sec.branch || 'CSE'}${sec.semester ? ` - Sem ${sec.semester}` : ''})`,
            subjectsMap: new Map()
          });
        }

        if (sub && sub.id) {
          const currentSec = sectionMap.get(sec.id);
          if (!currentSec.subjectsMap.has(sub.id)) {
            currentSec.subjectsMap.set(sub.id, {
              subjectId: sub.id,
              subjectName: sub.subject_name,
              subjectCode: sub.subject_code || '',
              displayName: `${sub.subject_name} (${sub.subject_code || 'LEC'})`
            });
          }
        }
      });

      const sections = Array.from(sectionMap.values()).map((sec) => ({
        sectionId: sec.sectionId,
        sectionName: sec.sectionName,
        branch: sec.branch,
        semester: sec.semester,
        totalStudents: sec.totalStudents,
        displayName: sec.displayName,
        subjects: Array.from(sec.subjectsMap.values())
      }));

      // Sort alphabetically by section name
      sections.sort((a, b) => a.sectionName.localeCompare(b.sectionName));

      return { sections };
    } catch (err) {
      console.error('getFacultyReportOptions error:', err);
      return { sections: [] };
    }
  }

  /**
   * 2. Generate Attendance Matrix Data for selected Section, Subject, and Date Range
   */
  static async generateAttendanceMatrix(facultyId, { sectionId, subjectId, startDate, endDate }) {
    try {
      if (!sectionId || !startDate || !endDate) {
        throw new Error('Please select Section, Start Date, and End Date.');
      }

      // 1. Fetch Students enrolled in this section
      const { data: students, error: stdErr } = await supabase
        .from('students')
        .select('id, name, roll_no, photo_url')
        .eq('section_id', sectionId)
        .order('roll_no', { ascending: true });

      if (stdErr) throw stdErr;

      // 2. Fetch Assignments for this faculty, section, and subject
      let assignQuery = supabase
        .from('faculty_assignment')
        .select(`
          id,
          lec_id,
          lec_date,
          subject_id,
          section_id,
          subject:subject_id (id, subject_name, subject_code),
          section:section_id (id, section_name, branch, semester)
        `)
        .eq('faculty_id', facultyId)
        .eq('section_id', sectionId);

      if (subjectId && subjectId !== 'all') {
        assignQuery = assignQuery.eq('subject_id', subjectId);
      }

      const { data: assignments, error: assignErr } = await assignQuery;
      if (assignErr) throw assignErr;

      const assignmentIds = (assignments || []).map((a) => a.id);
      const lecIds = (assignments || []).map((a) => a.lec_id).filter(Boolean);

      // Extract subject & section metadata
      const firstAssign = assignments && assignments[0];
      const sectionInfo = firstAssign?.section 
        ? `Section ${firstAssign.section.section_name} (${firstAssign.section.branch || 'CSE'})` 
        : 'Selected Section';
      const subjectInfo = subjectId && subjectId !== 'all' && firstAssign?.subject
        ? `${firstAssign.subject.subject_name} (${firstAssign.subject.subject_code || ''})`
        : 'All Assigned Subjects';

      // 3. Fetch Attendance Records for this date range
      let recordsQuery = supabase
        .from('attendance_records')
        .select('id, student_id, session_id, faculty_assignment_id, lec_id, lecture_date, status, marked_at')
        .gte('lecture_date', startDate)
        .lte('lecture_date', endDate);

      if (assignmentIds.length > 0) {
        recordsQuery = recordsQuery.in('faculty_assignment_id', assignmentIds);
      }

      const { data: records, error: recErr } = await recordsQuery;
      if (recErr) throw recErr;

      // Also check if any records were marked with lec_ids if assignment IDs returned sparse records
      let allRecords = records || [];
      if (lecIds.length > 0) {
        const { data: lecRecords } = await supabase
          .from('attendance_records')
          .select('id, student_id, session_id, faculty_assignment_id, lec_id, lecture_date, status, marked_at')
          .in('lec_id', lecIds)
          .gte('lecture_date', startDate)
          .lte('lecture_date', endDate);

        if (lecRecords && lecRecords.length > 0) {
          const existingIds = new Set(allRecords.map((r) => r.id));
          lecRecords.forEach((lr) => {
            if (!existingIds.has(lr.id)) {
              allRecords.push(lr);
            }
          });
        }
      }

      // 4. Identify unique dates where attendance was taken (Conducted Dates)
      const conductedDatesSet = new Set();
      allRecords.forEach((r) => {
        if (r.lecture_date) {
          conductedDatesSet.add(r.lecture_date);
        }
      });

      // Also check if assignments had scheduled lecture dates in range
      (assignments || []).forEach((a) => {
        if (a.lec_date && a.lec_date >= startDate && a.lec_date <= endDate) {
          if (allRecords.some((r) => r.lecture_date === a.lec_date)) {
            conductedDatesSet.add(a.lec_date);
          }
        }
      });

      // Sorted list of conducted dates
      const conductedDates = Array.from(conductedDatesSet).sort();

      // Generate all chronological dates in the range [startDate, endDate]
      const allCalendarDates = [];
      const curr = new Date(startDate);
      const end = new Date(endDate);
      while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        allCalendarDates.push(dStr);
        curr.setDate(curr.getDate() + 1);
      }

      // We display all conducted dates (or calendar dates if user prefers)
      const activeDates = conductedDates.length > 0 ? conductedDates : allCalendarDates.slice(0, 15);

      // 5. Index attendance records: key = `${student_id}_${lecture_date}`
      const studentDateMap = new Map();
      allRecords.forEach((r) => {
        const key = `${r.student_id}_${r.lecture_date}`;
        studentDateMap.set(key, r);
      });

      // 6. Build the student rows with attendance cells
      let totalPresentsSum = 0;
      let totalPossibleAttendance = 0;

      const studentRows = (students || []).map((s, idx) => {
        let presentCount = 0;
        let conductedCount = 0;

        const dateCells = activeDates.map((dateStr) => {
          const isDateConducted = conductedDatesSet.has(dateStr);

          if (!isDateConducted) {
            // No attendance taken on this date -> Blank cell
            return {
              date: dateStr,
              status: '',
              display: '',
              isConducted: false
            };
          }

          conductedCount++;
          const rec = studentDateMap.get(`${s.id}_${dateStr}`);
          const isPresent = rec?.status === 'present';

          if (isPresent) {
            presentCount++;
            return {
              date: dateStr,
              status: 'present',
              display: 'P',
              isConducted: true
            };
          } else {
            return {
              date: dateStr,
              status: 'absent',
              display: 'A',
              isConducted: true
            };
          }
        });

        totalPresentsSum += presentCount;
        totalPossibleAttendance += conductedCount;

        const percentage = conductedCount > 0 ? Math.round((presentCount / conductedCount) * 100) : 0;

        return {
          sNo: idx + 1,
          studentId: s.id,
          rollNo: s.roll_no || `2A-${String(idx + 1).padStart(3, '0')}`,
          name: s.name,
          email: s.email || '',
          photoUrl: s.photo_url || '',
          dateCells,
          presentCount,
          conductedCount,
          percentage
        };
      });

      const totalConductedClasses = conductedDates.length;
      const overallAvgPercentage = totalPossibleAttendance > 0 
        ? Math.round((totalPresentsSum / totalPossibleAttendance) * 100) 
        : 0;

      return {
        success: true,
        sectionInfo,
        subjectInfo,
        startDate,
        endDate,
        totalStudents: students?.length || 0,
        totalConductedClasses,
        overallAvgPercentage,
        activeDates,
        conductedDates,
        students: studentRows,
        generatedAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('generateAttendanceMatrix error:', err);
      throw err;
    }
  }

  /**
   * 3. Download Attendance Matrix as Standard CSV
   */
  static exportMatrixToCSV(matrixData, filename = null) {
    if (!matrixData || !matrixData.students || !matrixData.students.length) {
      alert('No attendance data available to export.');
      return;
    }

    const cleanSec = (matrixData.sectionInfo || 'Section').replace(/[^a-zA-Z0-9]/g, '_');
    const fname = filename || `Attendance_Report_${cleanSec}_${matrixData.startDate}_to_${matrixData.endDate}.csv`;

    const headers = [
      'S.No',
      'Roll No',
      'Student Name',
      ...matrixData.activeDates.map((d) => d),
      'Total Present',
      'Total Classes',
      'Attendance %'
    ];

    const rows = matrixData.students.map((s) => {
      // Use ="ROLL_NO" to strictly preserve full numeric string as plain text in Excel & CSV
      const formattedRoll = `="""${s.rollNo}"""`;
      const row = [
        s.sNo,
        formattedRoll,
        `"${s.name}"`
      ];

      s.dateCells.forEach((c) => {
        row.push(c.display || '');
      });

      row.push(s.presentCount);
      row.push(s.conductedCount);
      row.push(`${s.percentage}%`);

      return row.join(',');
    });

    // Metadata header
    const metaHeader = [
      `"INSTITUTIONAL ATTENDANCE REPORT"`,
      `"Section: ${matrixData.sectionInfo}","Subject: ${matrixData.subjectInfo}"`,
      `"Date Range: ${matrixData.startDate} to ${matrixData.endDate}","Classes Conducted: ${matrixData.totalConductedClasses}","Avg Attendance: ${matrixData.overallAvgPercentage}%"`,
      `"Generated On: ${new Date().toLocaleString()}"`,
      ''
    ].join('\n');

    const csvContent = '\uFEFF' + metaHeader + headers.join(',') + '\n' + rows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fname;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 4. Download Attendance Matrix as Formatted Excel Workbook (.xls)
   * Formatted with professional styling, green P highlights, borders, and summary totals
   */
  static exportMatrixToExcel(matrixData, filename = null) {
    if (!matrixData || !matrixData.students || !matrixData.students.length) {
      alert('No attendance data available to export.');
      return;
    }

    const cleanSec = (matrixData.sectionInfo || 'Section').replace(/[^a-zA-Z0-9]/g, '_');
    const fname = filename || `Attendance_Report_${cleanSec}_${matrixData.startDate}_to_${matrixData.endDate}.xls`;

    // Generate date columns header
    const dateHeadersHTML = matrixData.activeDates
      .map((d) => `<th style="background-color: #1E293B; color: #FFFFFF; font-weight: bold; padding: 8px; border: 1px solid #CBD5E1; text-align: center; min-width: 60px;">${d}</th>`)
      .join('');

    // Generate student rows with explicit mso-number-format:'\@' to prevent scientific notation
    const rowsHTML = matrixData.students.map((s, idx) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      
      const cellsHTML = s.dateCells.map((c) => {
        if (c.display === 'P') {
          return `<td style="background-color: #DCFCE7; color: #15803D; font-weight: bold; text-align: center; border: 1px solid #E2E8F0; padding: 6px;">P</td>`;
        } else if (c.display === 'A') {
          return `<td style="background-color: #FEE2E2; color: #B91C1C; font-weight: bold; text-align: center; border: 1px solid #E2E8F0; padding: 6px;">A</td>`;
        } else {
          return `<td style="background-color: ${bg}; color: #94A3B8; text-align: center; border: 1px solid #E2E8F0; padding: 6px;"></td>`;
        }
      }).join('');

      const pctColor = s.percentage >= 75 ? '#15803D' : (s.percentage >= 60 ? '#D97706' : '#B91C1C');

      return `
        <tr style="background-color: ${bg};">
          <td style="text-align: center; padding: 6px 10px; border: 1px solid #E2E8F0; font-weight: 500;">${s.sNo}</td>
          <td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-family: monospace; font-weight: bold; mso-number-format:'\\@';" x:str>${s.rollNo}</td>
          <td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: 600;">${s.name}</td>
          ${cellsHTML}
          <td style="text-align: center; padding: 6px 10px; border: 1px solid #E2E8F0; font-weight: bold; color: #1E293B;">${s.presentCount}</td>
          <td style="text-align: center; padding: 6px 10px; border: 1px solid #E2E8F0; font-weight: 500; color: #64748B;">${s.conductedCount}</td>
          <td style="text-align: center; padding: 6px 10px; border: 1px solid #E2E8F0; font-weight: bold; color: ${pctColor};">${s.percentage}%</td>
        </tr>
      `;
    }).join('');

    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Attendance Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
          .roll-text { mso-number-format: "\\@"; }
        </style>
      </head>
      <body>
        <table style="margin-bottom: 20px;">
          <tr>
            <td colspan="${matrixData.activeDates.length + 6}" style="font-size: 16pt; font-weight: bold; color: #1E1B4B; padding: 12px 0;">INSTITUTIONAL ATTENDANCE REPORT</td>
          </tr>
          <tr>
            <td colspan="3" style="font-size: 11pt; font-weight: bold; color: #334155;">Class / Section:</td>
            <td colspan="${matrixData.activeDates.length + 3}" style="font-size: 11pt; color: #0F172A;">${matrixData.sectionInfo}</td>
          </tr>
          <tr>
            <td colspan="3" style="font-size: 11pt; font-weight: bold; color: #334155;">Subject:</td>
            <td colspan="${matrixData.activeDates.length + 3}" style="font-size: 11pt; color: #0F172A;">${matrixData.subjectInfo}</td>
          </tr>
          <tr>
            <td colspan="3" style="font-size: 11pt; font-weight: bold; color: #334155;">Date Range:</td>
            <td colspan="${matrixData.activeDates.length + 3}" style="font-size: 11pt; color: #0F172A;">${matrixData.startDate} to ${matrixData.endDate} (${matrixData.totalConductedClasses} classes conducted)</td>
          </tr>
          <tr>
            <td colspan="3" style="font-size: 11pt; font-weight: bold; color: #334155;">Overall Attendance:</td>
            <td colspan="${matrixData.activeDates.length + 3}" style="font-size: 11pt; font-weight: bold; color: #10B981;">${matrixData.overallAvgPercentage}%</td>
          </tr>
          <tr>
            <td colspan="3" style="font-size: 10pt; color: #64748B;">Generated Date:</td>
            <td colspan="${matrixData.activeDates.length + 3}" style="font-size: 10pt; color: #64748B;">${new Date().toLocaleString()}</td>
          </tr>
        </table>

        <table border="1" style="border-collapse: collapse; border: 1px solid #CBD5E1;">
          <thead>
            <tr>
              <th style="background-color: #1E293B; color: #FFFFFF; font-weight: bold; padding: 8px 10px; border: 1px solid #CBD5E1; text-align: center;">S.No</th>
              <th style="background-color: #1E293B; color: #FFFFFF; font-weight: bold; padding: 8px 14px; border: 1px solid #CBD5E1; text-align: left;">Roll No</th>
              <th style="background-color: #1E293B; color: #FFFFFF; font-weight: bold; padding: 8px 16px; border: 1px solid #CBD5E1; text-align: left;">Student Name</th>
              ${dateHeadersHTML}
              <th style="background-color: #047857; color: #FFFFFF; font-weight: bold; padding: 8px 10px; border: 1px solid #CBD5E1; text-align: center;">Total Present</th>
              <th style="background-color: #334155; color: #FFFFFF; font-weight: bold; padding: 8px 10px; border: 1px solid #CBD5E1; text-align: center;">Total Classes</th>
              <th style="background-color: #1D4ED8; color: #FFFFFF; font-weight: bold; padding: 8px 12px; border: 1px solid #CBD5E1; text-align: center;">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([template], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fname;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
