// Calendar Management System
let currentWeekStart = new Date();
let events = [];
let editingEventId = null;
let selectedDate = null;
let selectedTime = null;

// Settings
let settings = {
    startHour: 7,
    endHour: 22,
    enableNotifications: true
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadEvents();
    setCurrentWeek();
    renderCalendar();
    updateDateTime();
    setInterval(updateDateTime, 60000);
    initEventListeners();
    updateCurrentTimeLine();
    setInterval(updateCurrentTimeLine, 60000);
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
    document.getElementById('btnCloseModal').addEventListener('click', closeEventModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeEventModal);
    document.getElementById('btnCloseSettings').addEventListener('click', closeSettingsModal);
    document.getElementById('btnClosePopup').addEventListener('click', closeEventPopup);
    
    // Forms
    document.getElementById('eventForm').addEventListener('submit', handleEventSubmit);
    document.getElementById('settingStartHour').addEventListener('change', updateSettings);
    document.getElementById('settingEndHour').addEventListener('change', updateSettings);
    document.getElementById('settingEnableNotifications').addEventListener('change', updateSettings);
    
    // Data management
    document.getElementById('btnExportData').addEventListener('click', exportData);
    document.getElementById('btnImportData').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', importData);
    document.getElementById('btnClearData').addEventListener('click', clearAllData);
    
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
    renderTimeSlots();
    renderDayColumns();
    updateDateTime();
    
    // Update current time line after rendering
    setTimeout(() => {
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
        
        dayHeader.appendChild(dayName);
        dayHeader.appendChild(dayNumber);
        
        // Day slots
        const daySlots = document.createElement('div');
        daySlots.className = 'day-slots';
        
        for (let hour = settings.startHour; hour <= settings.endHour; hour++) {
            const hourSlot = document.createElement('div');
            hourSlot.className = 'hour-slot';
            hourSlot.dataset.date = formatDateToString(currentDate);
            hourSlot.dataset.hour = hour;
            
            hourSlot.addEventListener('click', (e) => {
                if (e.target === hourSlot) {
                    handleSlotClick(currentDate, hour);
                }
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
    
    dayEvents.forEach(event => {
        const eventElement = createEventElement(event);
        daySlots.appendChild(eventElement);
    });
}

function createEventElement(event) {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'calendar-event';
    eventDiv.style.backgroundColor = event.color;
    
    // Calculate position and height
    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const duration = endMinutes - startMinutes;
    
    const slotHeight = 30; // Height of one hour slot
    const top = ((startMinutes - settings.startHour * 60) / 60) * slotHeight;
    const height = (duration / 60) * slotHeight;
    
    eventDiv.style.top = `${top}px`;
    eventDiv.style.height = `${Math.max(height, 15)}px`;
    
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
    
    eventDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        showEventPopup(event, e.target);
    });
    
    return eventDiv;
}

// Event Popup
function showEventPopup(event, targetElement) {
    const popup = document.getElementById('eventPopup');
    
    document.getElementById('popupTitle').textContent = event.title;
    document.getElementById('popupTime').textContent = `${event.date} • ${event.startTime} - ${event.endTime}`;
    document.getElementById('popupDescription').textContent = event.description || 'Không có mô tả';
    
    popup.dataset.eventId = event.id;
    
    // Position popup
    const rect = targetElement.getBoundingClientRect();
    popup.style.display = 'block';
    popup.style.left = `${rect.left}px`;
    popup.style.top = `${rect.bottom + 5}px`;
}

function closeEventPopup() {
    document.getElementById('eventPopup').style.display = 'none';
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

// Modal Functions
function openAddEventModal() {
    editingEventId = null;
    document.getElementById('modalTitle').textContent = 'Thêm Sự Kiện';
    document.getElementById('eventForm').reset();
    
    // Set default date if not set
    if (!document.getElementById('eventDate').value) {
        document.getElementById('eventDate').value = formatDateToString(new Date());
    }
    
    document.getElementById('eventModal').classList.add('active');
}

function openEditEventModal(event) {
    document.getElementById('modalTitle').textContent = 'Sửa Sự Kiện';
    
    document.getElementById('eventType').value = event.type;
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDescription').value = event.description || '';
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
            createRecurringEvents(type, title, description, date, endDate, startTime, endTime, color, reminder, weekdays);
        } else {
            // Create single event
            const event = {
                id: generateId(),
                type,
                title,
                description,
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
function createRecurringEvents(type, title, description, startDate, endDate, startTime, endTime, color, reminder, weekdays) {
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
            settings = result.settings;
        }
        
        document.getElementById('settingStartHour').value = settings.startHour;
        document.getElementById('settingEndHour').value = settings.endHour;
        document.getElementById('settingEnableNotifications').checked = settings.enableNotifications;
    });
}

function updateSettings() {
    settings.startHour = parseInt(document.getElementById('settingStartHour').value);
    settings.endHour = parseInt(document.getElementById('settingEndHour').value);
    settings.enableNotifications = document.getElementById('settingEnableNotifications').checked;
    
    chrome.storage.local.set({ settings }, () => {
        renderCalendar();
    });
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

// Storage Functions
function loadEvents() {
    chrome.storage.local.get(['events'], (result) => {
        events = result.events || [];
        renderCalendar();
    });
}

function saveEvents() {
    chrome.storage.local.set({ events });
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
    
    // Check if current time is in view range
    const totalMinutes = currentHour * 60 + currentMinute;
    const startMinutes = settings.startHour * 60;
    const endMinutes = settings.endHour * 60;
    
    if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
        return; // Outside view hours
    }
    
    // Find current day column
    const weekStart = new Date(currentWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayDiff = Math.floor((today - weekStart) / (1000 * 60 * 60 * 24));
    
    if (dayDiff < 0 || dayDiff > 6) {
        return; // Not in current week
    }
    
    const dayColumns = document.querySelectorAll('.day-column');
    const targetColumn = dayColumns[dayDiff];
    
    if (!targetColumn) return;
    
    // Remove existing lines from all columns first
    document.querySelectorAll('.current-time-line').forEach(line => line.remove());
    
    // Calculate position
    const slotHeight = 30;
    const top = ((totalMinutes - startMinutes) / 60) * slotHeight;
    
    // Create line
    const line = document.createElement('div');
    line.className = 'current-time-line';
    line.style.top = `${top + 35}px`; // 35px for header
    
    const daySlots = targetColumn.querySelector('.day-slots');
    if (daySlots) {
        daySlots.appendChild(line);
    }
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
