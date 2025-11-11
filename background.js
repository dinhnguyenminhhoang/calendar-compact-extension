// Background service worker for handling notifications and alarms

// ---- Helpers
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function fmtReminderText(minutes) {
    if (minutes >= 1440) return `${minutes / 1440} ngày`;
    if (minutes >= 60) return `${minutes / 60} giờ`;
    return `${minutes} phút`;
}

function toLocalDateTime(dateStr, timeStr) {
    // dateStr: 'YYYY-MM-DD', timeStr: 'HH:mm'
    // Tạo Date theo local time để alarm chạy đúng múi giờ máy
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    const dt = new Date();
    dt.setFullYear(y, m - 1, d);
    dt.setHours(hh, mm, 0, 0);
    return dt;
}

// ---- One alarm handler for all
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith('reminder-')) {
        const eventId = alarm.name.slice('reminder-'.length);

        chrome.storage.local.get(['events'], (result) => {
            const events = result.events || [];
            const ev = events.find(e => e.id === eventId);
            if (!ev) return;

            const reminderMinutes = Number(ev.reminder ?? 15);
            const message =
                `${ev.title}\n\n` +
                `📅 ${ev.date}\n` +
                `⏰ ${ev.startTime} - ${ev.endTime}\n` +
                `🔔 Sự kiện sẽ bắt đầu sau ${fmtReminderText(reminderMinutes)}!`;

            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: '⏰ Nhắc nhở sự kiện',
                message,
                priority: 2
            });
        });
    }

    if (alarm.name === 'cleanup') {
        chrome.storage.local.get(['events'], (result) => {
            const events = result.events || [];
            const now = Date.now();
            const weekAgo = now - 7 * DAY;

            const filtered = events.filter(ev => {
                const endDt = toLocalDateTime(ev.date, ev.endTime || ev.startTime || '00:00').getTime();
                return endDt >= weekAgo;
            });

            if (filtered.length !== events.length) {
                chrome.storage.local.set({ events: filtered });
                console.log(`Cleaned up ${events.length - filtered.length} old events`);
            }
        });
    }
});

// ---- Notification click → mở UI chắc ăn
chrome.notifications.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('calendar.html') });
});

// ---- First install
chrome.runtime.onInstalled.addListener(() => {
    console.log('Schedule Manager Extension installed!');
    chrome.storage.local.get(['events'], (res) => {
        if (!Array.isArray(res.events)) chrome.storage.local.set({ events: [] });
    });
    // tạo alarm dọn rác định kỳ
    chrome.alarms.create('cleanup', { periodInMinutes: 60 });
});

// ---- Messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scheduleReminder') {
        const { event } = request;
        // event: { id, title, date:'YYYY-MM-DD', startTime:'HH:mm', endTime:'HH:mm', reminder?: minutes }

        const eventStart = toLocalDateTime(event.date, event.startTime);
        const minutes = Number(event.reminder ?? 15);
        const remindAt = new Date(eventStart.getTime() - minutes * MINUTE);

        const now = Date.now();
        if (remindAt.getTime() <= now) {
            console.warn('Reminder time is in the past, skip:', event.id);
            sendResponse({ success: false, reason: 'past' });
            return true;
        }

        chrome.alarms.create(`reminder-${event.id}`, { when: remindAt.getTime() });
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'cancelReminder') {
        chrome.alarms.clear(`reminder-${request.eventId}`, (cleared) => {
            sendResponse({ success: cleared });
        });
        return true;
    }

    return false;
});