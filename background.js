// Background service worker for handling notifications and alarms

// Listen for alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith('reminder-')) {
        const eventId = alarm.name.replace('reminder-', '');

        // Get event details from storage
        chrome.storage.local.get(['events'], (result) => {
            const events = result.events || [];
            const event = events.find(e => e.id === eventId);

            if (event) {
                // Determine reminder text
                const reminderMinutes = event.reminder || 15;
                const reminderText = reminderMinutes >= 1440 ? `${reminderMinutes / 1440} ngày` :
                    reminderMinutes >= 60 ? `${reminderMinutes / 60} giờ` :
                        `${reminderMinutes} phút`;

                // Show notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: '⏰ Nhắc nhở sự kiện',
                    message: `${event.title}\n\n📅 ${event.date}\n⏰ ${event.startTime} - ${event.endTime}\n🔔 Sự kiện sẽ bắt đầu sau ${reminderText}!`,
                    priority: 2
                });
            }
        });
    }
});

// Listen for notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    // Open the extension popup when notification is clicked
    chrome.action.openPopup();
});

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('Schedule Manager Extension installed!');

    // Set default storage if first install
    chrome.storage.local.get(['events'], (result) => {
        if (!result.events) {
            chrome.storage.local.set({ events: [] });
        }
    });
});

// Clean up old alarms periodically
chrome.alarms.create('cleanup', {
    periodInMinutes: 60 // Run every hour
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanup') {
        chrome.storage.local.get(['events'], (result) => {
            const events = result.events || [];
            const now = new Date();

            // Remove past events older than 7 days
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const activeEvents = events.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate >= weekAgo;
            });

            if (activeEvents.length !== events.length) {
                chrome.storage.local.set({ events: activeEvents });
                console.log(`Cleaned up ${events.length - activeEvents.length} old events`);
            }
        });
    }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scheduleReminder') {
        const { event } = request;
        const eventDateTime = new Date(`${event.date}T${event.startTime}`);
        const reminderTime = new Date(eventDateTime.getTime() - 15 * 60000);

        chrome.alarms.create(`reminder-${event.id}`, {
            when: reminderTime.getTime()
        });

        sendResponse({ success: true });
    }

    if (request.action === 'cancelReminder') {
        chrome.alarms.clear(`reminder-${request.eventId}`);
        sendResponse({ success: true });
    }

    return true;
});