// google_integration.js
// Google API Integration Module (MV3-safe)

class GoogleIntegration {
    constructor() {
        this.accessToken = null;
        this.isAuthenticated = false;
    }

    // ---------- Core helpers ----------
    async getToken(forceRefresh = false) {
        const get = () =>
            new Promise((resolve) =>
                chrome.identity.getAuthToken({ interactive: true }, (t) => resolve(t || null))
            );

        let token = await get();
        if (!token) return null;

        if (forceRefresh) {
            await new Promise((r) => chrome.identity.removeCachedAuthToken({ token }, r));
            token = await get();
        }
        return token;
    }

    async fetchJson(url, token) {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });

        if (res.status === 401) {
            const fresh = await this.getToken(true);
            if (!fresh) return { error: "no_token" };
            const res2 = await fetch(url, {
                headers: { Authorization: `Bearer ${fresh}`, "Content-Type": "application/json" },
            });
            return res2.json();
        }

        return res.json();
    }

    // ---------- Auth ----------
    async authenticate() {
        try {
            const token = await this.getToken();
            this.isAuthenticated = !!token;
            this.accessToken = token;
            if (!this.isAuthenticated) console.error("No token received from chrome.identity");
            else console.log("✅ Google authentication successful");
            return this.isAuthenticated;
        } catch (error) {
            console.error("❌ Google authentication failed:", error);
            return false;
        }
    }

    // ---------- Classroom ----------
    async fetchClassroomCourses() {
        if (!this.isAuthenticated) await this.authenticate();
        if (!this.accessToken) return [];

        const courses = [];
        let pageToken = "";
        do {
            const url = new URL("https://classroom.googleapis.com/v1/courses");
            url.searchParams.set("courseStates", "ACTIVE");
            if (pageToken) url.searchParams.set("pageToken", pageToken);

            const data = await this.fetchJson(url.toString(), this.accessToken);
            courses.push(...(data.courses || []));
            pageToken = data.nextPageToken || "";
        } while (pageToken);

        console.log("📚 Courses:", courses.length);
        return courses;
    }

    async fetchCoursework(courseId) {
        if (!this.isAuthenticated) await this.authenticate();
        if (!this.accessToken) return [];

        const items = [];
        let pageToken = "";
        do {
            const url = new URL(
                `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`
            );
            if (pageToken) url.searchParams.set("pageToken", pageToken);

            const data = await this.fetchJson(url.toString(), this.accessToken);
            items.push(...(data.courseWork || []));
            pageToken = data.nextPageToken || "";
        } while (pageToken);

        return items;
    }

    toYmdHm(dueDate, dueTime) {
        // dueDate: {year,month,day}, dueTime?: {hours,minutes}
        const y = dueDate.year;
        const m = String(dueDate.month).padStart(2, "0");
        const d = String(dueDate.day).padStart(2, "0");
        const hh = String(dueTime?.hours ?? 23).padStart(2, "0");
        const mm = String(dueTime?.minutes ?? 59).padStart(2, "0");
        return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
    }

    async fetchAllAssignments() {
        const courses = await this.fetchClassroomCourses();
        const allAssignments = [];

        for (const course of courses) {
            const coursework = await this.fetchCoursework(course.id);
            for (const work of coursework) {
                if (!work?.dueDate) continue;
                const { date, time } = this.toYmdHm(work.dueDate, work.dueTime);

                allAssignments.push({
                    id: `classroom-${work.id}`,
                    title: `📚 ${work.title || "Bài tập"}`,
                    description: `${course.name}\n\n${work.description || "Không có mô tả"}`,
                    date,
                    startTime: time,
                    endTime: time,
                    color: "#8b5cf6",
                    type: "study",
                    source: "classroom",
                    courseId: course.id,
                    courseName: course.name,
                    workId: work.id,
                    link: work.alternateLink,
                    reminder: 60, // 1h trước hạn
                });
            }
        }

        console.log("📚 Total assignments:", allAssignments.length);
        return allAssignments;
    }

    // ---------- Calendar ----------
    localDateFromAllDay(ymd) {
        // 'YYYY-MM-DD' -> Date local 00:00
        const [y, m, d] = ymd.split("-").map(Number);
        const dt = new Date();
        dt.setFullYear(y, m - 1, d);
        dt.setHours(0, 0, 0, 0);
        return dt;
    }

    convertCalendarEvents(events) {
        const pad = (n) => String(n).padStart(2, "0");
        return events.map((ev) => {
            const isAllDay = !!ev.start?.date;
            const start = isAllDay
                ? this.localDateFromAllDay(ev.start.date)
                : new Date(ev.start?.dateTime || ev.start?.date || Date.now());
            const end = ev.end?.date
                ? this.localDateFromAllDay(ev.end.date)
                : new Date(ev.end?.dateTime || ev.start?.dateTime || start);

            return {
                id: `gcal-${ev.id}`,
                title: `📅 ${ev.summary || "Không có tiêu đề"}`,
                description: ev.description || "",
                date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
                startTime: isAllDay ? "00:00" : `${pad(start.getHours())}:${pad(start.getMinutes())}`,
                endTime: isAllDay ? "23:59" : `${pad(end.getHours())}:${pad(end.getMinutes())}`,
                color: "#06b6d4",
                type: "work",
                source: "gcalendar",
                link: ev.htmlLink,
                location: ev.location || "",
                reminder: 15,
            };
        });
    }

    async listAllCalendars() {
        if (!this.isAuthenticated) await this.authenticate();
        if (!this.accessToken) return [];

        const calendars = [];
        let pageToken = "";
        do {
            const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
            url.searchParams.set("maxResults", "250");
            if (pageToken) url.searchParams.set("pageToken", pageToken);

            const data = await this.fetchJson(url.toString(), this.accessToken);
            calendars.push(...(data.items || []));
            pageToken = data.nextPageToken || "";
        } while (pageToken);

        return calendars;
    }

    async fetchCalendarEvents(startDate, endDate) {
        if (!this.isAuthenticated) await this.authenticate();
        if (!this.accessToken) return [];

        const timeMin = new Date(startDate).toISOString();
        const timeMax = new Date(endDate).toISOString();

        const calendars = await this.listAllCalendars();
        console.log("📅 Calendars:", calendars.length, calendars.map((c) => c.summary));

        let allEvents = [];
        for (const cal of calendars) {
            let pageToken = "";
            do {
                const u = new URL(
                    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`
                );
                u.searchParams.set("timeMin", timeMin);
                u.searchParams.set("timeMax", timeMax);
                u.searchParams.set("singleEvents", "true");
                u.searchParams.set("orderBy", "startTime");
                u.searchParams.set("maxResults", "2500");
                if (pageToken) u.searchParams.set("pageToken", pageToken);

                const data = await this.fetchJson(u.toString(), this.accessToken);
                const items = Array.isArray(data.items) ? data.items : [];
                allEvents.push(...items);
                pageToken = data.nextPageToken || "";
            } while (pageToken);
        }

        console.log("📅 Total GCal events (raw):", allEvents.length);
        return this.convertCalendarEvents(allEvents);
    }

    // ---------- Sync ----------
    async syncAll(startDate, endDate) {
        if (!this.isAuthenticated) await this.authenticate();
        const [assignments, calendarEvents] = await Promise.all([
            this.fetchAllAssignments(),
            this.fetchCalendarEvents(startDate, endDate),
        ]);

        const total = assignments.length + calendarEvents.length;
        console.log("✅ Sync done. totals:", { assignments: assignments.length, calendarEvents: calendarEvents.length, total });
        return { assignments, calendarEvents, total };
    }

    // ---------- Logout ----------
    async logout() {
        try {
            if (this.accessToken) {
                await new Promise((r) =>
                    chrome.identity.removeCachedAuthToken({ token: this.accessToken }, r)
                );
            }
            this.accessToken = null;
            this.isAuthenticated = false;
            console.log("✅ Logged out successfully");
        } catch (error) {
            console.error("Error logging out:", error);
        }
    }
}

// Export for popup/pages
window.GoogleIntegration = GoogleIntegration;