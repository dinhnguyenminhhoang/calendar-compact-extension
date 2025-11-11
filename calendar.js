// Calendar Management System
let currentWeekStart = new Date();
let events = [];
let editingEventId = null;
let selectedDate = null;
let selectedTime = null;
let googleIntegration = null;

// Settings
let settings = {
    startHour: 7,
    endHour: 22,
    enableNotifications: true,
    syncClassroom: false,
    syncCalendar: false,
    googleConnected: false
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Extension starting...');

    // Initialize Google Integration
    googleIntegration = new GoogleIntegration();

    // Load settings and events FIRST
    loadSettings();
    loadEvents();

    // Setup calendar view
    setCurrentWeek();
    updateDateTime();
    setInterval(updateDateTime, 60000);

    // Initialize event listeners
    initEventListeners();

    // Update current time line
    updateCurrentTimeLine();
    setInterval(updateCurrentTimeLine, 60000);

    console.log('✅ Extension ready!');
});

// Event Listeners
function initEventListeners() {
    // Navigation
    document.getElementById('btnPrevWeek').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderCalendar();
    });

    document.getElementById('btnNextWeek').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderCalendar();
    });

    document.getElementById('btnToday').addEventListener('click', () => {
        setCurrentWeek();
        renderCalendar();
    });

    // Modals
    document.getElementById('btnAddEvent').addEventListener('click', openAddEventModal);
    document.getElementById('btnSettings').addEventListener('click', openSettingsModal);
    document.getElementById('btnGoogleSync').addEventListener('click', syncGoogleData);
    document.getElementById('btnReload').addEventListener('click', reloadExtension);
    document.getElementById('btnCloseModal').addEventListener('click', closeEventModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeEventModal);
    document.getElementById('btnCloseSettings').addEventListener('click', closeSettingsModal);
    document.getElementById('btnClosePopup').addEventListener('click', closeEventPopup);

    // Forms
    document.getElementById('eventForm').addEventListener('submit', handleEventSubmit);
    document.getElementById('settingStartHour').addEventListener('change', updateSettings);
    document.getElementById('settingEndHour').addEventListener('change', updateSettings);
    document.getElementById('settingEnableNotifications').addEventListener('change', updateSettings);
    document.getElementById('settingSyncClassroom').addEventListener('change', updateSettings);
    document.getElementById('settingSyncCalendar').addEventListener('change', updateSettings);

    // Links management
    document.getElementById('btnAddLink').addEventListener('click', addLinkInput);
    document.getElementById('linksContainer').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-link')) {
            removeLinkInput(e.target);
        }
    });

    // Google Integration
    document.getElementById('btnConnectGoogle').addEventListener('click', connectGoogle);
    document.getElementById('btnDisconnectGoogle').addEventListener('click', disconnectGoogle);

    // Data management
    document.getElementById('btnExportData').addEventListener('click', exportData);
    document.getElementById('btnImportData').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', importData);
    document.getElementById('btnClearData').addEventListener('click', clearAllData);
    document.getElementById('btnClearGoogleCache').addEventListener('click', clearGoogleCache);

    // Popup actions
    document.getElementById('btnEditPopup').addEventListener('click', editEventFromPopup);
    document.getElementById('btnDeletePopup').addEventListener('click', deleteEventFromPopup);
}

// Set current week (Monday to Sunday)
function setCurrentWeek() {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust for Monday start
    currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() + diff);
    currentWeekStart.setHours(0, 0, 0, 0);
}

// Update date and time display
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    // Update week range
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekRangeText = `${formatDate(currentWeekStart)} - ${formatDate(weekEnd)}`;
    document.getElementById('weekRange').textContent = weekRangeText;
}

function formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
}

// Render Calendar
function renderCalendar() {
    console.log(`🗓️ Rendering calendar for week starting: ${formatDateToString(currentWeekStart)}`);
    console.log(`📊 Total events in storage: ${events.length}`);

    renderTimeSlots();
    renderDayColumns();
    updateDateTime();

    // Auto-scroll to working hours (startHour)
    setTimeout(() => {
        const container = document.querySelector('.calendar-container');
        const slotHeight = 30; // height of each hour slot
        const scrollTo = settings.startHour * slotHeight;
        container.scrollTop = scrollTo;

        updateCurrentTimeLine();
    }, 100);
}
function renderTimeSlots() {
    const timeSlotsContainer = document.getElementById('timeSlots');
    timeSlotsContainer.innerHTML = '';

    for (let hour = settings.startHour; hour <= settings.endHour; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
        timeSlotsContainer.appendChild(timeSlot);
    }
}


function renderDayColumns() {
    const daysContainer = document.getElementById('daysContainer');
    daysContainer.innerHTML = '';

    const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentWeekStart.getDate() + i);

        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';

        // Header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        if (currentDate.getTime() === today.getTime()) {
            dayHeader.classList.add('today');
        }

        const dayName = document.createElement('div');
        dayName.className = 'day-name';
        dayName.textContent = dayNames[i];

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = currentDate.getDate();

        // Count events for this day
        const dateStr = formatDateToString(currentDate);
        const dayEventCount = events.filter(e => e.date === dateStr).length;

        // Add event count badge if > 0
        if (dayEventCount > 0) {
            const badge = document.createElement('div');
            badge.style.cssText = `
                position: absolute;
                top: 3px;
                right: 3px;
                background: ${currentDate.getTime() === today.getTime() ? 'rgba(255,255,255,0.3)' : '#667eea'};
                color: white;
                font-size: 9px;
                font-weight: 600;
                padding: 2px 5px;
                border-radius: 10px;
                min-width: 16px;
                text-align: center;
            `;
            badge.textContent = dayEventCount;
            badge.title = `${dayEventCount} sự kiện`;
            dayHeader.style.position = 'relative';
            dayHeader.appendChild(badge);
        }

        dayHeader.appendChild(dayName);
        dayHeader.appendChild(dayNumber);

        // Day slots - RENDER FULL 24H để đảm bảo có grid cho tất cả events
        const daySlots = document.createElement('div');
        daySlots.className = 'day-slots';
        daySlots.style.position = 'relative';
        daySlots.style.overflow = 'visible'; // Allow events to show properly

        // Render từ 0-24 để có grid lines cho all events
        for (let hour = settings.startHour; hour <= settings.endHour; hour++) {
            const hourSlot = document.createElement('div');
            hourSlot.className = 'hour-slot';
            hourSlot.dataset.date = formatDateToString(currentDate);
            hourSlot.dataset.hour = hour;

            // Visual indicator: làm mờ hours ngoài working range
            if (hour < settings.startHour || hour > settings.endHour) {
                hourSlot.style.opacity = '0.3';
                hourSlot.style.background = '#f9fafb';
            }

            hourSlot.addEventListener('click', (e) => {
                if (e.target === hourSlot) {
                    handleSlotClick(currentDate, hour);
                }
            });

            // DROP ZONE HANDLERS
            hourSlot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                hourSlot.classList.add('drop-target');
            });

            hourSlot.addEventListener('dragleave', (e) => {
                hourSlot.classList.remove('drop-target');
            });

            hourSlot.addEventListener('drop', (e) => {
                e.preventDefault();
                hourSlot.classList.remove('drop-target');

                const eventId = e.dataTransfer.getData('text/plain');
                const targetDate = hourSlot.dataset.date;
                const targetHour = parseInt(hourSlot.dataset.hour);

                handleEventDrop(eventId, targetDate, targetHour);
            });

            daySlots.appendChild(hourSlot);
        }

        dayColumn.appendChild(dayHeader);
        dayColumn.appendChild(daySlots);
        daysContainer.appendChild(dayColumn);

        // Render events for this day
        renderEventsForDay(daySlots, currentDate);
    }
}

function renderEventsForDay(daySlots, date) {
    const dateStr = formatDateToString(date);
    const dayEvents = events.filter(e => e.date === dateStr);

    // DEBUG: Log để xem events có match không
    if (dayEvents.length > 0) {
        console.log(`📅 Rendering ${dayEvents.length} events for ${dateStr}:`, dayEvents.map(e => e.title));
    }

    dayEvents.forEach(event => {
        const eventElement = createEventElement(event, daySlots);
        if (eventElement.style.display !== 'none') {
            daySlots.appendChild(eventElement);
        } else {
            console.log(`⚠️ Event hidden (outside visible hours): ${event.title} at ${event.startTime}`);
        }
    });
}

function createEventElement(event, daySlots) {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'calendar-event';
    eventDiv.style.backgroundColor = event.color;

    // Calculate position and height
    let [startHour, startMinute] = event.startTime.split(':').map(Number);
    let [endHour, endMinute] = event.endTime.split(':').map(Number);

    // Clamp to visible hours
    const displayStartHour = Math.max(startHour, settings.startHour);
    let rawEndHour = endHour;
    if (event.endTime === "23:59" || endHour === 0) rawEndHour = 24;

    const displayEndHour = Math.min(rawEndHour, settings.endHour);


    // If event is outside visible range, skip it
    if (displayStartHour >= settings.endHour || displayEndHour <= settings.startHour) {
        eventDiv.style.display = 'none';
        return eventDiv;
    }

    const startMinutes = displayStartHour * 60 + (displayStartHour === startHour ? startMinute : 0);
    const endMinutes = displayEndHour * 60 + (displayEndHour === endHour ? endMinute : 59);
    const duration = endMinutes - startMinutes;

    const slotHeight = 30;
    const top = ((startMinutes - settings.startHour * 60) / 60) * slotHeight;
    const height = (duration / 60) * slotHeight;

    eventDiv.style.top = `${Math.max(0, top)}px`;
    eventDiv.style.height = `${Math.max(height, 15)}px`;

    // CRITICAL FIX: Event ngắn hơn có z-index cao hơn để không bị che
    // z-index = 1000 - duration (minutes)
    // Event 1h (60 phút) → z-index = 940
    // Event 30 phút → z-index = 970
    // Event 15 phút → z-index = 985
    const zIndex = 1000 - Math.min(duration, 999);
    eventDiv.style.zIndex = zIndex.toString();

    // Content
    const titleDiv = document.createElement('div');
    titleDiv.className = 'event-title';
    titleDiv.textContent = event.title;

    const timeDiv = document.createElement('div');
    timeDiv.className = 'event-time';
    timeDiv.textContent = `${event.startTime} - ${event.endTime}`;

    eventDiv.appendChild(titleDiv);
    if (height > 20) {
        eventDiv.appendChild(timeDiv);
    }

    // Store event data
    eventDiv.dataset.eventId = event.id;
    eventDiv.dataset.eventDate = event.date;
    eventDiv.dataset.eventStart = event.startTime;
    eventDiv.dataset.eventEnd = event.endTime;

    // DRAG & DROP SUPPORT
    eventDiv.draggable = true;

    eventDiv.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        eventDiv.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', event.id);
        console.log(`🎯 Start dragging: ${event.title}`);
    });

    eventDiv.addEventListener('dragend', (e) => {
        eventDiv.classList.remove('dragging');
        console.log(`✅ End dragging: ${event.title}`);
    });

    // Click handler - only if not dragging
    let clickTimeout;
    eventDiv.addEventListener('mousedown', (e) => {
        clickTimeout = setTimeout(() => {
            // This is a click, not a drag
        }, 200);
    });

    eventDiv.addEventListener('mouseup', (e) => {
        clearTimeout(clickTimeout);
    });

    eventDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!eventDiv.classList.contains('dragging')) {
            showEventPopup(event, e.target);
        }
    });

    return eventDiv;
}

// Event Popup
// Event Popup
function showEventPopup(event, targetElement) {
    const popup = document.getElementById('eventPopup');

    document.getElementById('popupTitle').textContent = event.title;
    document.getElementById('popupTime').textContent = `${event.date} • ${event.startTime} - ${event.endTime}`;

    // Build description with links
    const descEl = document.getElementById('popupDescription');
    let descHTML = event.description || 'Không có mô tả';

    // Add links if available
    if (event.links && event.links.length > 0) {
        descHTML += '<br><br><div style="display: flex; flex-direction: column; gap: 6px;">';
        event.links.forEach((link, index) => {
            const linkText = link.includes('meet.google') ? '📹 Google Meet' :
                link.includes('zoom') ? '📹 Zoom' :
                    link.includes('docs.google') ? '📄 Google Docs' :
                        link.includes('drive.google') ? '📁 Google Drive' :
                            `🔗 Link ${index + 1}`;
            descHTML += `<a href="${link}" target="_blank" style="color: #667eea; text-decoration: none; padding: 6px 12px; background: #f0f4ff; border-radius: 6px; display: inline-block; font-size: 13px; transition: all 0.2s;" onmouseover="this.style.background='#e0e7ff'" onmouseout="this.style.background='#f0f4ff'">${linkText}</a>`;
        });
        descHTML += '</div>';
    }

    // Add old link support for backward compatibility
    if (event.link && (!event.links || event.links.length === 0)) {
        descHTML += `<br><br>🔗 <a href="${event.link}" target="_blank" style="color: #667eea; text-decoration: underline;">Mở link</a>`;
    }

    if (event.source === 'classroom' || event.source === 'gcalendar') {
        descHTML += `<br><small style="color: #6b7280;">📍 ${event.source === 'classroom' ? 'Google Classroom' : 'Google Calendar'}</small>`;
    }

    descEl.innerHTML = descHTML;

    popup.dataset.eventId = event.id;

    // Show popup first to get its dimensions
    popup.style.display = 'block';
    popup.style.visibility = 'hidden'; // Hide while calculating position

    // Get dimensions
    const rect = targetElement.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate best position
    let left = rect.left;
    let top = rect.bottom + 5;

    // Adjust horizontal position if popup goes off-screen
    if (left + popupRect.width > viewportWidth - 20) {
        // Try positioning to the left of the element
        left = rect.right - popupRect.width;

        // If still off-screen, align to right edge
        if (left < 20) {
            left = viewportWidth - popupRect.width - 20;
        }
    }

    // Ensure minimum left margin
    if (left < 20) {
        left = 20;
    }

    // Adjust vertical position if popup goes off-screen
    if (top + popupRect.height > viewportHeight - 20) {
        // Try positioning above the element
        top = rect.top - popupRect.height - 5;

        // If still off-screen, position at top of viewport
        if (top < 20) {
            top = 20;
        }
    }

    // Apply calculated position
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.visibility = 'visible'; // Make visible now

    // Add max-height to prevent popup from being too tall
    popup.style.maxHeight = `${viewportHeight - top - 20}px`;
    popup.style.overflowY = 'auto';
}

function closeEventPopup() {
    const popup = document.getElementById('eventPopup');
    popup.style.display = 'none';
    popup.style.maxHeight = 'none';
    popup.style.overflowY = 'visible';
}
function editEventFromPopup() {
    const eventId = document.getElementById('eventPopup').dataset.eventId;
    const event = events.find(e => e.id === eventId);
    if (event) {
        editingEventId = eventId;
        openEditEventModal(event);
    }
    closeEventPopup();
}

function deleteEventFromPopup() {
    const eventId = document.getElementById('eventPopup').dataset.eventId;
    if (confirm('Bạn có chắc muốn xóa sự kiện này?')) {
        deleteEvent(eventId);
    }
    closeEventPopup();
}

// Handle slot click (quick add event)
function handleSlotClick(date, hour) {
    selectedDate = date;
    selectedTime = hour;

    // Pre-fill form
    document.getElementById('eventDate').value = formatDateToString(date);
    document.getElementById('eventStartTime').value = `${hour.toString().padStart(2, '0')}:00`;
    document.getElementById('eventEndTime').value = `${(hour + 1).toString().padStart(2, '0')}:00`;

    openAddEventModal();
}

// Handle event drop (drag & drop)
function handleEventDrop(eventId, targetDate, targetHour) {
    console.log(`📍 Dropping event ${eventId} to ${targetDate} at ${targetHour}:00`);

    const event = events.find(e => e.id === eventId);
    if (!event) {
        console.error('Event not found:', eventId);
        return;
    }

    // Don't allow moving Google synced events
    if (event.source === 'classroom' || event.source === 'gcalendar') {
        showNotification('⚠️ Không thể di chuyển sự kiện từ Google Classroom/Calendar', 'error');
        return;
    }

    // Calculate event duration
    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);
    const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);

    // Calculate new times
    const newStartHour = targetHour;
    const newStartMinute = startMinute; // Keep original minutes
    const newEndMinutes = newStartHour * 60 + newStartMinute + durationMinutes;
    const newEndHour = Math.floor(newEndMinutes / 60);
    const newEndMinute = newEndMinutes % 60;

    // Update event
    event.date = targetDate;
    event.startTime = `${newStartHour.toString().padStart(2, '0')}:${newStartMinute.toString().padStart(2, '0')}`;
    event.endTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;

    // Save and re-render
    saveEvents();
    renderCalendar();

    // Show notification
    showNotification(`✅ Đã di chuyển "${event.title}" đến ${targetDate} ${event.startTime}`, 'success');

    // Update reminder
    if (event.reminder && event.reminder !== 'none') {
        scheduleReminder(event);
    }
}

// Modal Functions
function openAddEventModal() {
    editingEventId = null;
    document.getElementById('modalTitle').textContent = 'Thêm Sự Kiện';
    document.getElementById('eventForm').reset();

    // Reset links to single input
    resetLinksContainer();

    // Set default date if not set
    if (!document.getElementById('eventDate').value) {
        document.getElementById('eventDate').value = formatDateToString(new Date());
    }

    document.getElementById('eventModal').classList.add('active');
}

// Links Management
function addLinkInput() {
    const container = document.getElementById('linksContainer');
    const linkGroup = document.createElement('div');
    linkGroup.className = 'link-input-group';
    linkGroup.style.cssText = 'display: flex; gap: 8px; align-items: center;';

    linkGroup.innerHTML = `
        <input type="url" class="event-link" placeholder="https://..." style="flex: 1;">
        <button type="button" class="btn-remove-link" style="width: 32px; height: 32px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">✕</button>
    `;

    container.appendChild(linkGroup);

    // Update remove buttons visibility
    updateRemoveButtons();
}

function removeLinkInput(button) {
    const linkGroup = button.closest('.link-input-group');
    linkGroup.style.animation = 'slideOut 0.2s ease';
    setTimeout(() => {
        linkGroup.remove();
        updateRemoveButtons();
    }, 200);
}

function updateRemoveButtons() {
    const linkGroups = document.querySelectorAll('.link-input-group');
    linkGroups.forEach((group, index) => {
        const removeBtn = group.querySelector('.btn-remove-link');
        if (linkGroups.length === 1) {
            removeBtn.style.display = 'none';
        } else {
            removeBtn.style.display = 'block';
        }
    });
}

function resetLinksContainer() {
    const container = document.getElementById('linksContainer');
    container.innerHTML = `
        <div class="link-input-group" style="display: flex; gap: 8px; align-items: center;">
            <input type="url" class="event-link" placeholder="https://meet.google.com/..." style="flex: 1;">
            <button type="button" class="btn-remove-link" style="display: none; width: 32px; height: 32px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">✕</button>
        </div>
    `;
}

function getEventLinks() {
    const linkInputs = document.querySelectorAll('.event-link');
    const links = [];
    linkInputs.forEach(input => {
        if (input.value.trim()) {
            links.push(input.value.trim());
        }
    });
    return links;
}

function setEventLinks(links) {
    if (!links || links.length === 0) {
        resetLinksContainer();
        return;
    }

    const container = document.getElementById('linksContainer');
    container.innerHTML = '';

    links.forEach((link, index) => {
        const linkGroup = document.createElement('div');
        linkGroup.className = 'link-input-group';
        linkGroup.style.cssText = 'display: flex; gap: 8px; align-items: center;';

        linkGroup.innerHTML = `
            <input type="url" class="event-link" value="${link}" placeholder="https://..." style="flex: 1;">
            <button type="button" class="btn-remove-link" style="${links.length === 1 ? 'display: none;' : 'display: block;'} width: 32px; height: 32px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">✕</button>
        `;

        container.appendChild(linkGroup);
    });

    updateRemoveButtons();
}

function openEditEventModal(event) {
    document.getElementById('modalTitle').textContent = 'Sửa Sự Kiện';

    document.getElementById('eventType').value = event.type;
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDescription').value = event.description || '';
    setEventLinks(event.links || []); // Load links
    document.getElementById('eventDate').value = event.date;
    document.getElementById('eventStartTime').value = event.startTime;
    document.getElementById('eventEndTime').value = event.endTime;
    document.getElementById('eventReminder').value = event.reminder || 'none';

    // Set color
    const colorRadios = document.querySelectorAll('input[name="eventColor"]');
    colorRadios.forEach(radio => {
        if (radio.value === event.color) {
            radio.checked = true;
        }
    });

    document.getElementById('eventModal').classList.add('active');
}

function closeEventModal() {
    document.getElementById('eventModal').classList.remove('active');
    editingEventId = null;
    selectedDate = null;
    selectedTime = null;
}

function openSettingsModal() {
    loadSettings();
    updateStats();
    document.getElementById('settingsModal').classList.add('active');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
}

// Handle Form Submit
function handleEventSubmit(e) {
    e.preventDefault();

    const type = document.getElementById('eventType').value;
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDescription').value;
    const links = getEventLinks(); // Get array of links
    const date = document.getElementById('eventDate').value;
    const startTime = document.getElementById('eventStartTime').value;
    const endTime = document.getElementById('eventEndTime').value;
    const reminder = document.getElementById('eventReminder').value;
    const color = document.querySelector('input[name="eventColor"]:checked').value;

    // Get selected weekdays
    const weekdaysCheckboxes = document.querySelectorAll('input[name="weekdays"]:checked');
    const weekdays = Array.from(weekdaysCheckboxes).map(cb => parseInt(cb.value));

    const endDate = document.getElementById('eventEndDate').value;

    if (editingEventId) {
        // Update existing event
        const eventIndex = events.findIndex(e => e.id === editingEventId);
        events[eventIndex] = {
            ...events[eventIndex],
            type,
            title,
            description,
            links,
            date,
            startTime,
            endTime,
            color,
            reminder: reminder === 'none' ? null : parseInt(reminder)
        };

        saveEvents();
        renderCalendar();
        closeEventModal();
    } else {
        // Add new event(s)
        if (endDate && weekdays.length > 0) {
            // Create recurring events
            createRecurringEvents(type, title, description, links, date, endDate, startTime, endTime, color, reminder, weekdays);
        } else {
            // Create single event
            const event = {
                id: generateId(),
                type,
                title,
                description,
                links,
                date,
                startTime,
                endTime,
                color,
                reminder: reminder === 'none' ? null : parseInt(reminder)
            };

            events.push(event);

            if (event.reminder && settings.enableNotifications) {
                scheduleReminder(event);
            }
        }

        saveEvents();
        renderCalendar();
        closeEventModal();
    }
}

// Create recurring events
function createRecurringEvents(type, title, description, links, startDate, endDate, startTime, endTime, color, reminder, weekdays) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // If no weekdays selected, use the weekday of the start date
    if (weekdays.length === 0) {
        weekdays = [start.getDay()];
    }

    let currentDate = new Date(start);

    while (currentDate <= end) {
        if (weekdays.includes(currentDate.getDay())) {
            const event = {
                id: generateId(),
                type,
                title,
                description,
                links,
                date: formatDateToString(currentDate),
                startTime,
                endTime,
                color,
                reminder: reminder === 'none' ? null : parseInt(reminder)
            };

            events.push(event);

            if (event.reminder && settings.enableNotifications) {
                scheduleReminder(event);
            }
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// Delete Event
function deleteEvent(eventId) {
    events = events.filter(e => e.id !== eventId);
    saveEvents();
    renderCalendar();

    // Cancel reminder
    if (chrome.runtime) {
        chrome.runtime.sendMessage({
            action: 'cancelReminder',
            eventId: eventId
        });
    }
}

// Schedule Reminder
function scheduleReminder(event) {
    if (!chrome.runtime) return;

    chrome.runtime.sendMessage({
        action: 'scheduleReminder',
        event: event
    });
}

// Settings
function loadSettings() {
    chrome.storage.local.get(['settings'], (result) => {
        if (result.settings) {
            // Merge loaded settings with defaults
            settings = {
                ...settings,
                ...result.settings
            };
            console.log('✅ Settings loaded:', settings);
        }

        // Update UI
        document.getElementById('settingStartHour').value = settings.startHour;
        document.getElementById('settingEndHour').value = settings.endHour;
        document.getElementById('settingEnableNotifications').checked = settings.enableNotifications;

        // Update Google status
        updateGoogleStatus();
    });
}

function saveSettings() {
    chrome.storage.local.set({ settings }, () => {
        console.log('Settings saved:', settings);
    });
}

function updateSettings() {
    settings.startHour = parseInt(document.getElementById('settingStartHour').value);
    settings.endHour = parseInt(document.getElementById('settingEndHour').value);
    settings.enableNotifications = document.getElementById('settingEnableNotifications').checked;

    if (document.getElementById('settingSyncClassroom')) {
        settings.syncClassroom = document.getElementById('settingSyncClassroom').checked;
    }
    if (document.getElementById('settingSyncCalendar')) {
        settings.syncCalendar = document.getElementById('settingSyncCalendar').checked;
    }

    saveSettings();
    renderCalendar();
}

// Stats
function updateStats() {
    const studyEvents = events.filter(e => e.type === 'study').length;
    const workEvents = events.filter(e => e.type === 'work').length;

    document.getElementById('statStudyCount').textContent = studyEvents;
    document.getElementById('statWorkCount').textContent = workEvents;
    document.getElementById('statTotalCount').textContent = events.length;
}

// Data Management
function exportData() {
    const data = {
        events,
        settings,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-backup-${Date.now()}.json`;
    a.click();
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);

            if (confirm('Nhập dữ liệu sẽ ghi đè lên dữ liệu hiện tại. Tiếp tục?')) {
                events = data.events || [];
                settings = data.settings || settings;

                saveEvents();
                chrome.storage.local.set({ settings });

                renderCalendar();
                alert('Nhập dữ liệu thành công!');
            }
        } catch (error) {
            alert('Lỗi: File không hợp lệ');
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('Bạn có chắc muốn xóa TẤT CẢ dữ liệu? Hành động này không thể hoàn tác!')) {
        events = [];
        saveEvents();
        renderCalendar();
        updateStats();
        alert('Đã xóa tất cả dữ liệu');
    }
}

// Clear only Google synced events and resync
async function clearGoogleCache() {
    if (!confirm('Xóa tất cả events từ Google và tải lại?\n\nNhững events tự tạo sẽ KHÔNG bị xóa.')) {
        return;
    }

    try {
        // Remove all Google-sourced events
        const googleEvents = events.filter(e => e.source === 'classroom' || e.source === 'gcalendar');
        const manualEvents = events.filter(e => !e.source || (e.source !== 'classroom' && e.source !== 'gcalendar'));

        console.log(`🗑️ Xóa ${googleEvents.length} Google events`);
        console.log(`✅ Giữ lại ${manualEvents.length} manual events`);

        events = manualEvents;
        saveEvents();
        renderCalendar();

        showNotification(`🗑️ Đã xóa ${googleEvents.length} events từ Google`, 'info');

        // Auto sync if connected
        if (settings.googleConnected && (settings.syncClassroom || settings.syncCalendar)) {
            setTimeout(() => {
                showNotification('🔄 Đang sync lại...', 'info');
                syncGoogleData();
            }, 1000);
        } else {
            showNotification('💡 Click nút 🔄 để sync lại events', 'info');
        }
    } catch (error) {
        console.error('Error clearing cache:', error);
        showNotification('❌ Lỗi: ' + error.message, 'error');
    }
}

// Reload extension data
function reloadExtension() {
    console.log('🔃 Reloading extension...');
    showNotification('🔃 Đang tải lại...', 'info');

    // Reload settings and events
    loadSettings();
    loadEvents();

    // Re-render calendar
    setCurrentWeek();
    renderCalendar();

    setTimeout(() => {
        showNotification('✅ Đã tải lại!', 'success');
    }, 500);
}

// Storage Functions
function loadEvents() {
    chrome.storage.local.get(['events'], (result) => {
        events = result.events || [];
        console.log(`✅ Loaded ${events.length} events from storage`);
        if (events.length > 0) {
            console.log('📅 Events:', events.map(e => ({ title: e.title, date: e.date, source: e.source })));
        }
        renderCalendar();
        updateStats();
    });
}

function saveEvents() {
    chrome.storage.local.set({ events }, () => {
        console.log(`💾 Saved ${events.length} events to storage`);
    });
}

// Utility Functions
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Format date to YYYY-MM-DD without timezone issues
function formatDateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Current Time Line
function updateCurrentTimeLine() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // phút hiện tại, khoảng hiển thị
    const totalMinutes = currentHour * 60 + currentMinute;
    const startMinutes = settings.startHour * 60;
    const endMinutes = settings.endHour * 60;

    // ngoài khung giờ -> ẩn
    if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
        document.querySelectorAll('.current-time-line').forEach(el => el.remove());
        const g = document.getElementById('currentTimeGuide');
        if (g) g.style.display = 'none';
        return;
    }

    // Tính vị trí (theo px) 1 LẦN
    const slotHeight = 30;
    const top = ((totalMinutes - startMinutes) / 60) * slotHeight;

    // ----- dashed guide chạy ngang qua tất cả cột -----
    const daysContainer = document.getElementById('daysContainer');
    if (daysContainer) {
        // cao phần header (lấy thật, fallback 35)
        const headerH = document.querySelector('.day-header')?.offsetHeight || 35;

        let guide = document.getElementById('currentTimeGuide');
        if (!guide) {
            guide = document.createElement('div');
            guide.id = 'currentTimeGuide';
            guide.className = 'current-time-guide';
            daysContainer.appendChild(guide);
        }
        guide.style.display = 'block';
        guide.style.top = `${top + headerH}px`; // dashed line cần cộng header
    }

    // ----- thanh đỏ trong cột hôm nay -----
    const weekStart = new Date(currentWeekStart); weekStart.setHours(0, 0, 0, 0);
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const dayDiff = Math.floor((today0 - weekStart) / (1000 * 60 * 60 * 24));
    if (dayDiff < 0 || dayDiff > 6) return;

    const dayColumn = document.querySelectorAll('.day-column')[dayDiff];
    if (!dayColumn) return;

    // dọn cũ
    document.querySelectorAll('.current-time-line').forEach(el => el.remove());

    // tạo line đỏ
    const line = document.createElement('div');
    line.className = 'current-time-line';
    line.style.top = `${top}px`; // KHÔNG cộng header vì đặt trong .day-slots

    const daySlots = dayColumn.querySelector('.day-slots');
    if (daySlots) daySlots.appendChild(line);
}

// Click outside to close popups
document.addEventListener('click', (e) => {
    const eventPopup = document.getElementById('eventPopup');
    if (eventPopup.style.display === 'block' && !eventPopup.contains(e.target)) {
        if (!e.target.closest('.calendar-event')) {
            closeEventPopup();
        }
    }
});

// ===============================
// GOOGLE INTEGRATION FUNCTIONS
// ===============================

// Connect to Google
async function connectGoogle() {
    const btn = document.getElementById('btnConnectGoogle');
    btn.textContent = '🔄 Đang kết nối...';
    btn.disabled = true;

    try {
        const success = await googleIntegration.authenticate();

        if (success) {
            settings.googleConnected = true;
            saveSettings();
            updateGoogleStatus();
            showNotification('✅ Kết nối Google thành công!', 'success');

            // Auto sync if enabled
            if (settings.syncClassroom || settings.syncCalendar) {
                await syncGoogleData();
            }
        } else {
            showNotification('❌ Không thể kết nối Google. Vui lòng thử lại.', 'error');
        }
    } catch (error) {
        console.error('Error connecting to Google:', error);
        showNotification('❌ Lỗi kết nối: ' + error.message, 'error');
    } finally {
        btn.textContent = '🔐 Kết nối Google';
        btn.disabled = false;
    }
}

// Disconnect from Google
async function disconnectGoogle() {
    if (!confirm('Bạn có chắc muốn ngắt kết nối với Google? Dữ liệu đã đồng bộ sẽ vẫn được giữ lại.')) {
        return;
    }

    try {
        await googleIntegration.logout();
        settings.googleConnected = false;
        settings.syncClassroom = false;
        settings.syncCalendar = false;
        saveSettings();
        updateGoogleStatus();

        // Update checkboxes
        document.getElementById('settingSyncClassroom').checked = false;
        document.getElementById('settingSyncCalendar').checked = false;

        showNotification('✅ Đã ngắt kết nối Google', 'success');
    } catch (error) {
        console.error('Error disconnecting:', error);
        showNotification('❌ Lỗi ngắt kết nối: ' + error.message, 'error');
    }
}

// Update Google connection status in UI
function updateGoogleStatus() {
    const statusEl = document.getElementById('googleStatus');
    const connectBtn = document.getElementById('btnConnectGoogle');
    const disconnectBtn = document.getElementById('btnDisconnectGoogle');
    const syncClassroomCb = document.getElementById('settingSyncClassroom');
    const syncCalendarCb = document.getElementById('settingSyncCalendar');

    // Get parent labels for opacity control
    const classroomLabel = syncClassroomCb.closest('.checkbox-label');
    const calendarLabel = syncCalendarCb.closest('.checkbox-label');

    if (settings.googleConnected) {
        statusEl.textContent = '✅ Đã kết nối Google - Sẵn sàng đồng bộ!';
        statusEl.style.color = '#10b981';
        statusEl.style.fontWeight = '600';
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';
        syncClassroomCb.disabled = false;
        syncCalendarCb.disabled = false;

        // Enable labels
        if (classroomLabel) classroomLabel.style.opacity = '1';
        if (calendarLabel) calendarLabel.style.opacity = '1';
    } else {
        statusEl.textContent = '❌ Chưa kết nối - Click nút bên dưới để kết nối';
        statusEl.style.color = '#ef4444';
        statusEl.style.fontWeight = '500';
        connectBtn.style.display = 'block';
        disconnectBtn.style.display = 'none';
        syncClassroomCb.disabled = true;
        syncCalendarCb.disabled = true;

        // Disable labels
        if (classroomLabel) classroomLabel.style.opacity = '0.5';
        if (calendarLabel) calendarLabel.style.opacity = '0.5';
    }

    // Update checkbox states
    syncClassroomCb.checked = settings.syncClassroom;
    syncCalendarCb.checked = settings.syncCalendar;
}

// Sync Google data
async function syncGoogleData() {
    if (!settings.googleConnected) {
        if (confirm('Chưa kết nối với Google. Bạn có muốn kết nối ngay không?')) {
            await connectGoogle();
            if (!settings.googleConnected) return;
        } else {
            return;
        }
    }

    const syncBtn = document.getElementById('btnGoogleSync');
    syncBtn.textContent = '⏳';
    syncBtn.disabled = true;

    try {
        // Get date range - include past 7 days to catch recent events
        const pastStart = new Date(currentWeekStart);
        pastStart.setDate(pastStart.getDate() - 7); // 7 days ago
        pastStart.setHours(0, 0, 0, 0);

        const weekStart = new Date(currentWeekStart);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Expand range to include upcoming events (next 30 days)
        const futureEnd = new Date(weekStart);
        futureEnd.setDate(futureEnd.getDate() + 30);

        let syncedCount = 0;
        let newEvents = [];

        console.log('🔄 Bắt đầu đồng bộ...');
        console.log('📅 Date range:', pastStart.toLocaleDateString(), '-', futureEnd.toLocaleDateString());
        console.log('⚙️ Settings:', {
            classroom: settings.syncClassroom,
            calendar: settings.syncCalendar
        });

        // Sync Google Classroom if enabled
        if (settings.syncClassroom) {
            console.log('📚 Đang tải Google Classroom...');
            try {
                const assignments = await googleIntegration.fetchAllAssignments();
                console.log(`📚 Tìm thấy ${assignments.length} assignments từ Classroom`);

                // Filter assignments within our date range and not already synced
                const existingClassroomIds = events
                    .filter(e => e.source === 'classroom')
                    .map(e => e.id);

                const newAssignments = assignments.filter(a => {
                    const assignmentDate = new Date(a.date);
                    return assignmentDate >= pastStart &&
                        assignmentDate <= futureEnd &&
                        !existingClassroomIds.includes(a.id);
                });

                console.log(`📚 ${newAssignments.length} assignments mới cần đồng bộ`);
                newEvents = newEvents.concat(newAssignments);
                syncedCount += newAssignments.length;
            } catch (error) {
                console.error('❌ Lỗi tải Classroom:', error);
                showNotification('⚠️ Không thể tải Google Classroom: ' + error.message, 'error');
            }
        }

        // Sync Google Calendar if enabled
        if (settings.syncCalendar) {
            console.log('📅 Đang tải Google Calendar...');
            try {
                const calendarEvents = await googleIntegration.fetchCalendarEvents(pastStart, futureEnd);
                console.log(`📅 Tìm thấy ${calendarEvents.length} events từ Calendar`);
                console.log('📅 Events:', calendarEvents.map(e => ({ title: e.title, date: e.date })));

                // Filter events not already synced
                const existingCalendarIds = events
                    .filter(e => e.source === 'gcalendar')
                    .map(e => e.id);

                console.log('📅 Already synced IDs:', existingCalendarIds);

                const newCalendarEvents = calendarEvents.filter(e =>
                    !existingCalendarIds.includes(e.id)
                );

                console.log(`📅 ${newCalendarEvents.length} events mới cần đồng bộ`);
                if (newCalendarEvents.length > 0) {
                    console.log('📅 New events:', newCalendarEvents.map(e => ({ title: e.title, date: e.date, id: e.id })));
                }

                newEvents = newEvents.concat(newCalendarEvents);
                syncedCount += newCalendarEvents.length;
            } catch (error) {
                console.error('❌ Lỗi tải Calendar:', error);
                showNotification('⚠️ Không thể tải Google Calendar: ' + error.message, 'error');
            }
        }

        // Add new events to our calendar
        if (newEvents.length > 0) {
            console.log(`✅ Thêm ${newEvents.length} events vào calendar`);
            events = [...events, ...newEvents];
            saveEvents();
            renderCalendar();

            // Show detailed notification
            const inCurrentWeek = newEvents.filter(e => {
                const eventDate = new Date(e.date);
                const weekEnd = new Date(currentWeekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                return eventDate >= currentWeekStart && eventDate <= weekEnd;
            }).length;

            if (inCurrentWeek > 0 && inCurrentWeek < newEvents.length) {
                showNotification(
                    `✅ Đã đồng bộ ${syncedCount} sự kiện! ${inCurrentWeek} sự kiện trong tuần này, ${newEvents.length - inCurrentWeek} sự kiện ở các tuần khác. Dùng nút ◀ ▶ để xem.`,
                    'success'
                );
            } else if (inCurrentWeek === 0) {
                showNotification(
                    `✅ Đã đồng bộ ${syncedCount} sự kiện! Tất cả đều nằm ngoài tuần này. Dùng nút ◀ ▶ để xem các tuần khác.`,
                    'info'
                );
            } else {
                showNotification(`✅ Đồng bộ thành công ${syncedCount} sự kiện mới!`, 'success');
            }
        } else {
            console.log('ℹ️ Không có events mới');
            showNotification('ℹ️ Không có sự kiện mới. Có thể đã sync rồi hoặc không có events trong khoảng thời gian này.', 'info');
        }

    } catch (error) {
        console.error('❌ Lỗi đồng bộ:', error);
        showNotification('❌ Lỗi đồng bộ: ' + error.message, 'error');
    } finally {
        syncBtn.textContent = '🔄';
        syncBtn.disabled = false;
    }
}

// Show notification (simple toast)
function showNotification(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS for toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .day-slots {
        position: relative;
        min-height: 100%;
        overflow: visible !important;
    }
    
    .day-column {
        overflow: visible !important;
    }
    
    .calendar-event {
        z-index: 10;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
`;
document.head.appendChild(style);