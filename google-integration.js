class GoogleIntegration {
    constructor() {
        this.accessToken = null;
        this.isAuthenticated = false;
    }

    async authenticate() {
        try {
            const token = await chrome.identity.getAuthToken({ interactive: true });
            this.accessToken = token;
            this.isAuthenticated = true;
            console.log('✅ Google authentication successful');
            return true;
        } catch (error) {
            console.error('❌ Google authentication failed:', error);
            return false;
        }
    }

    // Fetch Google Classroom courses
    async fetchClassroomCourses() {
        if (!this.isAuthenticated) {
            await this.authenticate();
        }

        try {
            const response = await fetch(
                'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE',
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await response.json();
            return data.courses || [];
        } catch (error) {
            console.error('Error fetching courses:', error);
            return [];
        }
    }

    // Fetch coursework (assignments) from Google Classroom
    async fetchCoursework(courseId) {
        if (!this.isAuthenticated) {
            await this.authenticate();
        }

        try {
            const response = await fetch(
                `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await response.json();
            return data.courseWork || [];
        } catch (error) {
            console.error('Error fetching coursework:', error);
            return [];
        }
    }

    // Fetch all assignments from all courses
    async fetchAllAssignments() {
        const courses = await this.fetchClassroomCourses();
        const allAssignments = [];

        for (const course of courses) {
            const coursework = await this.fetchCoursework(course.id);

            for (const work of coursework) {
                // Convert to our event format
                const dueDate = work.dueDate;
                const dueTime = work.dueTime || { hours: 23, minutes: 59 };

                if (dueDate) {
                    const dateStr = `${dueDate.year}-${String(dueDate.month).padStart(2, '0')}-${String(dueDate.day).padStart(2, '0')}`;
                    const timeStr = `${String(dueTime.hours).padStart(2, '0')}:${String(dueTime.minutes).padStart(2, '0')}`;

                    allAssignments.push({
                        id: `classroom-${work.id}`,
                        title: `📚 ${work.title}`,
                        description: `${course.name}\n\n${work.description || 'Không có mô tả'}`,
                        date: dateStr,
                        startTime: timeStr,
                        endTime: timeStr,
                        color: '#8b5cf6',
                        type: 'study',
                        source: 'classroom',
                        courseId: course.id,
                        courseName: course.name,
                        workId: work.id,
                        link: work.alternateLink,
                        reminder: 60 // 1 hour before
                    });
                }
            }
        }

        return allAssignments;
    }

    // Fetch Google Calendar events
    async fetchCalendarEvents(startDate, endDate) {
        if (!this.isAuthenticated) {
            await this.authenticate();
        }

        try {
            const timeMin = new Date(startDate).toISOString();
            const timeMax = new Date(endDate).toISOString();

            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await response.json();
            return this.convertCalendarEvents(data.items || []);
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            return [];
        }
    }

    // Convert Google Calendar events to our format
    convertCalendarEvents(events) {
        return events.map(event => {
            const start = event.start.dateTime || event.start.date;
            const end = event.end.dateTime || event.end.date;

            const startDate = new Date(start);
            const endDate = new Date(end);

            return {
                id: `gcal-${event.id}`,
                title: `📅 ${event.summary || 'Không có tiêu đề'}`,
                description: event.description || '',
                date: startDate.toISOString().split('T')[0],
                startTime: startDate.toTimeString().slice(0, 5),
                endTime: endDate.toTimeString().slice(0, 5),
                color: '#06b6d4',
                type: 'work',
                source: 'gcalendar',
                link: event.htmlLink,
                location: event.location || '',
                reminder: 15
            };
        });
    }

    // Sync all data from Google services
    async syncAll(startDate, endDate) {
        const assignments = await this.fetchAllAssignments();
        const calendarEvents = await this.fetchCalendarEvents(startDate, endDate);

        return {
            assignments,
            calendarEvents,
            total: assignments.length + calendarEvents.length
        };
    }

    // Logout
    async logout() {
        try {
            if (this.accessToken) {
                await chrome.identity.removeCachedAuthToken({ token: this.accessToken });
            }
            this.accessToken = null;
            this.isAuthenticated = false;
            console.log('✅ Logged out successfully');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }
}

// Export for use in other files
window.GoogleIntegration = GoogleIntegration;