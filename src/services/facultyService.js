import { supabase } from '../lib/supabaseClient.js';
import { AuthService } from './authService.js';
import { 
  getIndianDateString, 
  getIndianTimeVal, 
  getIndianDayName, 
  formatIndianDate, 
  formatIndianTime 
} from '../utils/dateUtils.js';

/**
 * Service to manage 100% Real Faculty Data & Assigned Lectures on Supabase
 */
export class FacultyService {
  /**
   * 1. Get Logged-in / Active Faculty Profile
   */
  static async getProfile() {
    try {
      const session = AuthService.getCurrentSession();
      const email = session?.user?.email;

      if (email) {
        const { data, error } = await supabase
          .from('faculty')
          .select('*')
          .ilike('email', email.trim())
          .maybeSingle();

        if (data && !error) {
          return {
            id: data.id,
            name: data.name,
            email: data.email,
            department: data.department || 'General',
            avatarInitials: data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          };
        }
      }

      // Check first faculty in database
      const { data: firstFac } = await supabase.from('faculty').select('*').limit(1).maybeSingle();
      if (firstFac) {
        return {
          id: firstFac.id,
          name: firstFac.name,
          email: firstFac.email,
          department: firstFac.department || 'General',
          avatarInitials: firstFac.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        };
      }
    } catch (err) {
      console.warn('Error fetching faculty profile:', err);
    }

    return {
      id: null,
      name: 'Faculty Member',
      email: '',
      department: 'General',
      avatarInitials: 'FM'
    };
  }

  /**
  /**
   * 2. Get All Raw Assigned Lectures for Faculty
   */
  static async getAllAssignments(facultyId) {
    try {
      let query = supabase
        .from('faculty_assignment')
        .select(`
          id,
          lec_id,
          lec_date,
          status,
          start_time,
          end_time,
          room_no,
          subject_id,
          section_id,
          faculty_id,
          subject:subject_id (id, subject_name, subject_code),
          section:section_id (id, section_name, branch, semester, total_students)
        `);

      if (facultyId) {
        query = query.eq('faculty_id', facultyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching faculty assignments:', error.message);
        return [];
      }

      const rawList = await Promise.all((data || []).map(async (a) => {
        const subObj = a.subject;
        const secObj = a.section;

        const subject = subObj?.subject_name || 'Lecture';
        const section = secObj?.section_name || 'General';
        const sectionId = a.section_id || secObj?.id;

        let count = 0;
        if (sectionId) {
          const { count: enrolledCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('section_id', sectionId);
          
          count = enrolledCount || secObj?.total_students || 0;
        } else {
          count = secObj?.total_students || 0;
        }

        const startTime = a.start_time ? a.start_time.slice(0, 5) : '10:00';
        const endTime = a.end_time ? a.end_time.slice(0, 5) : '11:00';
        const room = a.room_no || 'Room 201';
        const lecId = a.lec_id || subObj?.subject_code || `LEC-${(a.id || '').slice(0, 4).toUpperCase()}`;
        const lecDate = a.lec_date || getIndianDateString();
        const dayOfWeek = getIndianDayName(lecDate);

        return {
          id: a.id,
          lecId: lecId,
          rawLecDate: a.lec_date || null,
          lecDate: lecDate,
          className: subject,
          section: section,
          dayOfWeek: dayOfWeek,
          time: `${startTime} - ${endTime}`,
          room: room,
          studentsCount: count,
          startTimeVal: startTime,
          endTimeVal: endTime,
          assignmentStatus: a.status || 'scheduled',
          subjectId: a.subject_id || subObj?.id,
          sectionId: sectionId,
          sectionSubjectId: a.section_subject_id || a.id
        };
      }));

      return rawList;
    } catch (err) {
      console.error('getAllAssignments error:', err);
      return [];
    }
  }

  /**
   * Filter and arrange lectures based on date strip & filter selection
   * Arranges current to upcoming. Past lectures hidden on 'today' until date/yesterday chosen.
   */
  static filterAndSortLectures(rawList = [], filterType = 'today', targetDate = null) {
    const todayStr = getIndianDateString();
    const now = new Date();
    const currentTimeVal = getIndianTimeVal();

    if (filterType === 'today') {
      const todayMatches = rawList.filter(l => l.rawLecDate === todayStr);

      const categorized = todayMatches.map(l => {
        const start = l.startTimeVal || '00:00';
        const end = l.endTimeVal || '23:59';
        
        const isPast = currentTimeVal > end;
        const isLive = currentTimeVal >= start && currentTimeVal <= end;
        const isUpcoming = currentTimeVal < start;

        let status = 'upcoming';
        let badgeText = 'Upcoming';

        if (isLive) {
          status = 'live';
          badgeText = 'Live Now';
        } else if (isPast) {
          status = 'completed';
          badgeText = 'Completed';
        } else if (isUpcoming) {
          status = 'upcoming';
          badgeText = 'Upcoming';
        }

        return {
          ...l,
          isPast,
          isLive,
          isUpcoming,
          status,
          badgeText,
          shortDate: `Today, ${formatIndianDate(todayStr)}`
        };
      });

      // Arrange: Live Now first, then upcoming chronologically, then completed chronologically
      categorized.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        if (!a.isPast && b.isPast) return -1;
        if (a.isPast && !b.isPast) return 1;
        return (a.startTimeVal || '').localeCompare(b.startTimeVal || '');
      });

      const nextUpcoming = categorized.find(l => l.status === 'upcoming');
      if (nextUpcoming && !categorized.some(l => l.status === 'live')) {
        nextUpcoming.status = 'starting_soon';
        nextUpcoming.badgeText = 'Starting Soon';
      }

      return categorized;
    }

    if (filterType === 'yesterday') {
      const yesterdayObj = new Date(now);
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      const yesterdayStr = getIndianDateString(yesterdayObj);

      const yMatches = rawList.filter(l => l.rawLecDate === yesterdayStr);

      const formatted = yMatches.map(l => ({
        ...l,
        isPast: true,
        status: 'completed',
        badgeText: 'Completed',
        shortDate: `Yesterday, ${formatIndianDate(yesterdayStr)}`
      }));

      formatted.sort((a, b) => (a.startTimeVal || '').localeCompare(b.startTimeVal || ''));
      return formatted;
    }

    if (filterType === 'tomorrow') {
      const tomorrowObj = new Date(now);
      tomorrowObj.setDate(tomorrowObj.getDate() + 1);
      const tomorrowStr = getIndianDateString(tomorrowObj);

      const tMatches = rawList.filter(l => l.rawLecDate === tomorrowStr);

      const formatted = tMatches.map(l => ({
        ...l,
        isUpcoming: true,
        status: 'upcoming',
        badgeText: 'Upcoming',
        shortDate: `Tomorrow, ${formatIndianDate(tomorrowStr)}`
      }));

      formatted.sort((a, b) => (a.startTimeVal || '').localeCompare(b.startTimeVal || ''));
      return formatted;
    }

    if (filterType === 'this_week') {
      const dayIdx = now.getDay();
      const diffToMonday = (dayIdx === 0 ? -6 : 1) - dayIdx;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);

      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dStr = getIndianDateString(d);
        weekDates.push({
          dateStr: dStr,
          dayName: getIndianDayName(d),
          dayShort: getIndianDayName(d).slice(0, 3)
        });
      }

      const weekLectures = [];
      weekDates.forEach(({ dateStr, dayName, dayShort }) => {
        const isToday = dateStr === todayStr;
        const isPastDay = dateStr < todayStr;
        
        const dayMatches = rawList.filter(l => l.rawLecDate === dateStr);

        dayMatches.forEach(l => {
          let status = 'upcoming';
          let badgeText = 'Upcoming';

          if (isToday) {
            const start = l.startTimeVal || '00:00';
            const end = l.endTimeVal || '23:59';
            if (currentTimeVal >= start && currentTimeVal <= end) {
              status = 'live';
              badgeText = 'Live Now';
            } else if (currentTimeVal > end) {
              status = 'completed';
              badgeText = 'Completed';
            } else {
              status = 'upcoming';
              badgeText = 'Upcoming';
            }
          } else if (isPastDay) {
            status = 'completed';
            badgeText = 'Completed';
          }

          weekLectures.push({
            ...l,
            lecDate: dateStr,
            shortDate: isToday ? `Today, ${formatIndianDate(dateStr)}` : `${dayShort}, ${formatIndianDate(dateStr)}`,
            status,
            badgeText,
            isPastDay,
            isToday
          });
        });
      });

      weekLectures.sort((a, b) => {
        const dateComp = (a.lecDate || '').localeCompare(b.lecDate || '');
        if (dateComp !== 0) return dateComp;
        return (a.startTimeVal || '').localeCompare(b.startTimeVal || '');
      });

      return weekLectures;
    }

    if (filterType === 'custom' || targetDate) {
      const chosenDateStr = targetDate || todayStr;
      const chosenDayName = getIndianDayName(chosenDateStr);
      const isToday = chosenDateStr === todayStr;
      const isPastDate = chosenDateStr < todayStr;

      const dateMatches = rawList.filter(l => l.rawLecDate === chosenDateStr);

      const formatted = dateMatches.map(l => {
        let status = 'upcoming';
        let badgeText = 'Upcoming';

        if (isToday) {
          const start = l.startTimeVal || '00:00';
          const end = l.endTimeVal || '23:59';
          if (currentTimeVal >= start && currentTimeVal <= end) {
            status = 'live';
            badgeText = 'Live Now';
          } else if (currentTimeVal > end) {
            status = 'completed';
            badgeText = 'Completed';
          } else {
            status = 'upcoming';
            badgeText = 'Upcoming';
          }
        } else if (isPastDate) {
          status = 'completed';
          badgeText = 'Completed';
        }

        return {
          ...l,
          lecDate: chosenDateStr,
          shortDate: isToday ? `Today, ${formatIndianDate(chosenDateStr)}` : `${chosenDayName.slice(0, 3)}, ${formatIndianDate(chosenDateStr)}`,
          status,
          badgeText
        };
      });

      formatted.sort((a, b) => {
        if (isToday) {
          if (a.status === 'live' && b.status !== 'live') return -1;
          if (a.status !== 'live' && b.status === 'live') return 1;
        }
        return (a.startTimeVal || '').localeCompare(b.startTimeVal || '');
      });

      return formatted;
    }

    return rawList;
  }

  /**
   * Get Today's Assigned Lectures for Faculty (convenience wrapper)
   */
  static async getTodayLectures(facultyId) {
    const rawAssignments = await FacultyService.getAllAssignments(facultyId);
    return FacultyService.filterAndSortLectures(rawAssignments, 'today');
  }

  /**
   * 3. Get Real Faculty KPI Metrics
   */
  static async getKPIs(facultyId, lectures = []) {
    try {
      // 1. Total real students count from database
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // 2. Total real sections count from database
      const { count: sectionCount } = await supabase
        .from('sections')
        .select('*', { count: 'exact', head: true });

      const lecturesTodayCount = lectures.length;
      let startingSoonText = 'No lectures scheduled';
      if (lecturesTodayCount > 0) {
        startingSoonText = `Next at ${lectures[0].time?.split(' - ')[0] || '10:00'}`;
      }

      return {
        lecturesToday: lecturesTodayCount,
        startingSoonText: startingSoonText,
        studentsEnrolled: studentCount || 0,
        sectionsCount: sectionCount || 0
      };
    } catch (err) {
      return {
        lecturesToday: lectures.length || 0,
        startingSoonText: 'No lectures scheduled',
        studentsEnrolled: 0,
        sectionsCount: 0
      };
    }
  }

  /**
   * 4. Get Real Section-wise Attendance Performance for Today's Lectures
   * Computes attendance percentage against total enrolled students in each section.
   * If a section has multiple lectures scheduled today, averages all of today's lectures.
   */
  static async getSectionAttendance(facultyId, date = null) {
    try {
      const todayDate = date || getIndianDateString();

      // 1. Fetch all assignments belonging to this faculty member
      let assignQuery = supabase
        .from('faculty_assignment')
        .select(`
          id,
          lec_id,
          lec_date,
          start_time,
          end_time,
          subject_id,
          section_id,
          faculty_id,
          subject:subject_id (id, subject_name, subject_code),
          section:section_id (id, section_name, branch, semester, total_students)
        `);

      if (facultyId) {
        assignQuery = assignQuery.eq('faculty_id', facultyId);
      }

      const { data: assignments, error: assignErr } = await assignQuery;

      if (assignErr || !assignments || !assignments.length) {
        return [];
      }

      // 2. Group assignments by unique section
      const assignedSectionsMap = new Map();
      assignments.forEach(a => {
        const sec = a.section;
        const sub = a.subject;

        if (sec && sec.id) {
          if (!assignedSectionsMap.has(sec.id)) {
            assignedSectionsMap.set(sec.id, {
              sectionId: sec.id,
              sectionName: sec.section_name,
              branch: sec.branch || 'CSE',
              semester: sec.semester || '',
              totalStudents: sec.total_students || 0,
              assignments: [a]
            });
          } else {
            assignedSectionsMap.get(sec.id).assignments.push(a);
          }
        }
      });

      const assignedSections = Array.from(assignedSectionsMap.values());
      if (!assignedSections.length) {
        return [];
      }

      // 3. For each assigned section, evaluate today's lectures and compute accurate attendance %
      const stats = await Promise.all(
        assignedSections.map(async (sec) => {
          // A. Count total real enrolled students in this section
          const { count: realStudentsCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('section_id', sec.sectionId);

          const totalSectionPool = realStudentsCount || sec.totalStudents || 1;

          // B. Identify today's lectures for this section by lec_date
          const scheduledTodayAssignments = sec.assignments.filter(a => a.lec_date === todayDate);

          // Use scheduled today assignments; if none explicitly scheduled for this day, fallback to all assigned
          const targetAssignments = scheduledTodayAssignments.length > 0 
            ? scheduledTodayAssignments 
            : sec.assignments;

          // C. Calculate attendance percentage for each lecture today
          const lecturePercentages = await Promise.all(
            targetAssignments.map(async (assign) => {
              // Gather session IDs conducted for this assignment
              const { data: todaySessions } = await supabase
                .from('attendance_sessions')
                .select('id')
                .eq('faculty_assignment_id', assign.id);

              const sessionIds = (todaySessions || []).map(s => s.id);

              // Find unique students present for this assignment today
              const presentStudentIds = new Set();

              // 1) Check by session IDs
              if (sessionIds.length > 0) {
                const { data: sessRecords } = await supabase
                  .from('attendance_records')
                  .select('student_id')
                  .in('session_id', sessionIds)
                  .ilike('status', 'present');

                (sessRecords || []).forEach(r => presentStudentIds.add(r.student_id));
              }

              // 2) Check by faculty_assignment_id & todayDate
              const { data: assignRecords } = await supabase
                .from('attendance_records')
                .select('student_id')
                .eq('faculty_assignment_id', assign.id)
                .eq('lecture_date', todayDate)
                .ilike('status', 'present');

              (assignRecords || []).forEach(r => presentStudentIds.add(r.student_id));

              // 3) Check by lec_id if available
              if (assign.lec_id) {
                const { data: lecRecords } = await supabase
                  .from('attendance_records')
                  .select('student_id')
                  .eq('lec_id', assign.lec_id)
                  .eq('lecture_date', todayDate)
                  .ilike('status', 'present');

                (lecRecords || []).forEach(r => presentStudentIds.add(r.student_id));
              }

              const presentCount = presentStudentIds.size;
              const lecturePct = Math.min(100, Math.round((presentCount / totalSectionPool) * 100));
              return lecturePct;
            })
          );

          // D. Compute section average:
          // If 1 lecture today: that lecture's percentage
          // If >1 lectures today: average of all today's lectures
          // If no lectures scheduled today or 0 present: 0%
          let sectionAvgPct = 0;
          if (scheduledTodayAssignments.length > 0 && lecturePercentages.length > 0) {
            const sumPct = lecturePercentages.reduce((acc, curr) => acc + curr, 0);
            sectionAvgPct = Math.round(sumPct / lecturePercentages.length);
          } else if (lecturePercentages.length > 0) {
            const sumPct = lecturePercentages.reduce((acc, curr) => acc + curr, 0);
            sectionAvgPct = sumPct > 0 ? Math.round(sumPct / lecturePercentages.length) : 0;
          }

          return {
            sectionId: sec.sectionId,
            sectionName: `Section ${sec.sectionName} (${sec.branch})`,
            rawSectionName: sec.sectionName,
            percentage: sectionAvgPct,
            totalStudents: totalSectionPool,
            lecturesTodayCount: scheduledTodayAssignments.length
          };
        })
      );

      return stats;
    } catch (err) {
      console.error('getSectionAttendance error:', err);
      return [];
    }
  }

  /**
   * 5. Get Real Recent Activities from attendance_sessions
   */
  static async getRecentActivities() {
    try {
      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          status,
          started_at,
          ended_at,
          faculty_assignment:faculty_assignment_id (
            room_no,
            subject:subject_id (subject_name),
            section:section_id (section_name)
          )
        `)
        .order('started_at', { ascending: false })
        .limit(5);

      if (!sessions || !sessions.length) {
        return [];
      }

      return sessions.map(s => {
        const fa = s.faculty_assignment;
        const subject = fa?.subject?.subject_name || 'Lecture';
        const section = fa?.section?.section_name || '';
        const isCompleted = s.status === 'completed';
        const timeAgo = s.started_at ? new Date(s.started_at).toLocaleDateString() : 'Today';

        return {
          title: isCompleted ? `QR session closed for ${subject} - Sec ${section}` : `Active QR session in ${subject} - Sec ${section}`,
          time: timeAgo,
          type: isCompleted ? 'completed' : 'active'
        };
      });
    } catch (err) {
      console.error('getRecentActivities error:', err);
      return [];
    }
  }

  /**
   * 6. Calculate Overall Attendance Average across today's sections
   */
  static calculateOverallAverage(sectionList) {
    if (!sectionList || !sectionList.length) return 0;
    const activeSections = sectionList.filter(s => (s.lecturesTodayCount && s.lecturesTodayCount > 0) || s.percentage > 0);
    const targetPool = activeSections.length > 0 ? activeSections : sectionList;
    const sum = targetPool.reduce((acc, curr) => acc + curr.percentage, 0);
    return Math.round(sum / targetPool.length);
  }
}
