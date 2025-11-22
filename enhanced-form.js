// Enhanced Event Form Logic
// Add this to the end of calendar.js or include as separate file

// Period (tiết học) time mapping
const PERIOD_TIMES = {
    1: { start: '07:00', end: '07:50' },
    2: { start: '08:00', end: '08:50' },
    3: { start: '09:00', end: '09:50' },
    4: { start: '10:00', end: '10:50' },
    5: { start: '11:00', end: '11:50' },
    6: { start: '13:00', end: '13:50' },
    7: { start: '14:00', end: '14:50' },
    8: { start: '15:00', end: '15:50' },
    9: { start: '16:00', end: '16:50' },
    10: { start: '17:00', end: '17:50' }
};

// Template presets
const EVENT_TEMPLATES = {
    morning: {
        startTime: '07:00',
        endTime: '11:30',
        type: 'study',
        title: 'Học buổi sáng'
    },
    afternoon: {
        startTime: '13:00',
        endTime: '17:00',
        type: 'study',
        title: 'Học buổi chiều'
    },
    work: {
        startTime: '08:00',
        endTime: '17:00',
        type: 'work',
        title: 'Làm việc'
    },
    meeting: {
        startTime: '14:00',
        endTime: '15:00',
        type: 'meeting',
        title: 'Họp'
    }
};

// Initialize enhanced form
function initEnhancedForm() {
    console.log('🎨 Initializing enhanced form...');

    // Template selector
    const templateSelect = document.getElementById('eventTemplate');
    if (templateSelect) {
        templateSelect.addEventListener('change', (e) => {
            const template = EVENT_TEMPLATES[e.target.value];
            if (template) {
                document.getElementById('eventStartTime').value = template.startTime;
                document.getElementById('eventEndTime').value = template.endTime;
                document.getElementById('eventType').value = template.type;
                if (!document.getElementById('eventTitle').value) {
                    document.getElementById('eventTitle').value = template.title;
                }
            }
        });
    }

    // Time mode selector
    const timeModeRadios = document.querySelectorAll('input[name="timeMode"]');
    const timeModeContainer = document.getElementById('timeModeContainer');
    const periodModeContainer = document.getElementById('periodModeContainer');

    timeModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'time') {
                timeModeContainer.style.display = 'flex';
                periodModeContainer.style.display = 'none';
            } else {
                timeModeContainer.style.display = 'none';
                periodModeContainer.style.display = 'flex';
            }
        });
    });

    // Period selector - convert to time
    const startPeriodSelect = document.getElementById('eventStartPeriod');
    const endPeriodSelect = document.getElementById('eventEndPeriod');

    if (startPeriodSelect && endPeriodSelect) {
        const syncPeriodToTime = () => {
            const startPeriod = parseInt(startPeriodSelect.value);
            const endPeriod = parseInt(endPeriodSelect.value);

            if (PERIOD_TIMES[startPeriod] && PERIOD_TIMES[endPeriod]) {
                document.getElementById('eventStartTime').value = PERIOD_TIMES[startPeriod].start;
                document.getElementById('eventEndTime').value = PERIOD_TIMES[endPeriod].end;
            }
        };

        startPeriodSelect.addEventListener('change', syncPeriodToTime);
        endPeriodSelect.addEventListener('change', syncPeriodToTime);
    }

    console.log('✅ Enhanced form initialized');
}

// Get enhanced form data
function getEnhancedFormData() {
    const formData = {
        // Basic fields (giữ nguyên từ form cũ)
        title: document.getElementById('eventTitle').value,
        description: document.getElementById('eventDescription').value,
        type: document.getElementById('eventType').value,
        date: document.getElementById('eventDate').value,
        startTime: document.getElementById('eventStartTime').value,
        endTime: document.getElementById('eventEndTime').value,

        // Enhanced fields
        location: document.getElementById('eventLocation')?.value || '',
        priority: document.querySelector('input[name="eventPriority"]:checked')?.value || 'medium',

        // Tags
        tags: Array.from(document.querySelectorAll('input[name="eventTags"]:checked'))
            .map(cb => cb.value),

        // Color
        color: document.querySelector('input[name="eventColor"]:checked')?.value || '#8b5cf6',

        // Reminder
        reminder: document.getElementById('eventReminder').value,

        // Links
        links: Array.from(document.querySelectorAll('.event-link'))
            .map(input => input.value)
            .filter(link => link.trim() !== ''),

        // Repeat
        endDate: document.getElementById('eventEndDate').value,
        weekdays: Array.from(document.querySelectorAll('input[name="weekdays"]:checked'))
            .map(cb => parseInt(cb.value))
    };

    return formData;
}

// Set enhanced form data (for editing)
function setEnhancedFormData(event) {
    // Basic fields
    document.getElementById('eventTitle').value = event.title || '';
    document.getElementById('eventDescription').value = event.description || '';
    document.getElementById('eventType').value = event.type || 'study';
    document.getElementById('eventDate').value = event.date || '';
    document.getElementById('eventStartTime').value = event.startTime || '';
    document.getElementById('eventEndTime').value = event.endTime || '';

    // Enhanced fields
    if (document.getElementById('eventLocation')) {
        document.getElementById('eventLocation').value = event.location || '';
    }

    // Priority
    if (event.priority) {
        const priorityRadio = document.querySelector(`input[name="eventPriority"][value="${event.priority}"]`);
        if (priorityRadio) priorityRadio.checked = true;
    }

    // Tags
    if (event.tags && Array.isArray(event.tags)) {
        event.tags.forEach(tag => {
            const tagCheckbox = document.querySelector(`input[name="eventTags"][value="${tag}"]`);
            if (tagCheckbox) tagCheckbox.checked = true;
        });
    }

    // Color
    if (event.color) {
        const colorRadio = document.querySelector(`input[name="eventColor"][value="${event.color}"]`);
        if (colorRadio) colorRadio.checked = true;
    }

    // Reminder
    if (event.reminder) {
        document.getElementById('eventReminder').value = event.reminder;
    }

    // Links
    if (event.links && Array.isArray(event.links)) {
        // Clear existing links first
        const container = document.getElementById('linksContainer');
        container.innerHTML = '';

        event.links.forEach((link, index) => {
            const linkGroup = createLinkInput();
            linkGroup.querySelector('.event-link').value = link;
            if (index > 0) {
                linkGroup.querySelector('.btn-remove-link').style.display = 'block';
            }
            container.appendChild(linkGroup);
        });

        // Add empty one if no links
        if (event.links.length === 0) {
            container.appendChild(createLinkInput());
        }
    }
}

// Helper: Create link input group
function createLinkInput() {
    const div = document.createElement('div');
    div.className = 'link-input-group';
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.style.alignItems = 'center';

    div.innerHTML = `
        <input type="url" class="event-link" placeholder="https://meet.google.com/..." style="flex: 1">
        <button type="button" class="btn-remove-link" style="
            display: none;
            width: 32px;
            height: 32px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        ">✕</button>
    `;

    const removeBtn = div.querySelector('.btn-remove-link');
    removeBtn.addEventListener('click', () => {
        div.remove();
    });

    return div;
}

// Call this in DOMContentLoaded
console.log('📝 Enhanced form module loaded');