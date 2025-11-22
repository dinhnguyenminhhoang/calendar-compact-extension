class GoogleIntegration {
    constructor() {
        this.accessToken = null;
        this.isAuthenticated = false;
    }

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

    async authenticate() {
        try {
            const token = await this.getToken();
            this.isAuthenticated = !!token;
            this.accessToken = token;
            if (!this.isAuthenticated) {
                console.error("No token received from chrome.identity");
            } else {
                console.log("✅ Google authentication successful");
            }
            return this.isAuthenticated;
        } catch (error) {
            console.error("❌ Google authentication failed:", error);
            return false;
        }
    }


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
                const state = await this.fetchSubmissionState(course.id, work.id);
                const { date: dueDate, time: dueTime } = this.toYmdHm(
                    work.dueDate,
                    work.dueTime
                );

                const created = work.creationTime
                    ? new Date(work.creationTime)
                    : new Date();

                const startY = created.getFullYear();
                const startM = String(created.getMonth() + 1).padStart(2, "0");
                const startD = String(created.getDate()).padStart(2, "0");
                const startH = String(created.getHours()).padStart(2, "0");
                const startMin = String(created.getMinutes()).padStart(2, "0");

                const startDate = `${startY}-${startM}-${startD}`;
                const startTime = `${startH}:${startMin}`;

                const baseEvent = {
                    title: `${work.title || "Bài tập"}`,
                    description: `${course.name}\n\n${work.description || "Không có mô tả"
                        } `,

                    color: "#8b5cf6",
                    type: "study",
                    source: "classroom",

                    courseId: course.id,
                    courseName: course.name,
                    workId: work.id,
                    link: work.alternateLink,
                    reminder: 60
                };

                allAssignments.push({
                    id: `classroom - ${work.id} `,
                    ...baseEvent,
                    date: startDate,
                    startTime,
                    endTime: dueTime,
                    endDate: dueDate
                });

                if (dueDate !== startDate) {
                    allAssignments.push({
                        id: `classroom - ${work.id} -due`,
                        ...baseEvent,
                        title: `${(getSubmissionPrefix(state))}Hạn nộp: ${work.title || "Bài tập"}`,
                        date: dueDate,
                        startTime: "00:00",
                        endTime: dueTime,
                        endDate: dueDate
                    });
                }
            }
        }

        console.log("📚 Total assignments:", allAssignments.length);
        return allAssignments;
    }

    async syncAll(startDate, endDate) {
        if (!this.isAuthenticated) await this.authenticate();
        const assignments = await this.fetchAllAssignments();

        const total = assignments.length;
        console.log("✅ Sync done. totals:", { assignments: assignments.length, total });
        return { assignments, total };
    }

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
    async fetchSubmissionState(courseId, workId) {
        if (!this.isAuthenticated) await this.authenticate();
        if (!this.accessToken) return "UNKNOWN";

        const url = `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${workId}/studentSubmissions`;

        const data = await this.fetchJson(url, this.accessToken);
        const list = data.studentSubmissions || [];

        if (list.length > 0) {
            return list[0].state || "UNKNOWN";
        }

        return "UNKNOWN";
    }
}
function getSubmissionPrefix(state) {
    switch (state) {
        case "TURNED_IN":
            return " Đã nộp – ";
        case "RETURNED":
            return "Đã chấm – ";
        case "RECLAIMED_BY_STUDENT":
            return "Nộp lại – ";
        case "CREATED":
        default:
            return "Chưa nộp – ";
    }
}



window.GoogleIntegration = GoogleIntegration;