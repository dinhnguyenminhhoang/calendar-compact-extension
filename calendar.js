let currentWeekStart = new Date();
let events = [];
let editingEventId = null;
let selectedDate = null;
let selectedTime = null;
let googleIntegration = null;
let studentId = null;
let currentView = "week";
let currentDateCursor = new Date();
let overlapClusters = {};
let clusterRotateTimer = null;
let settings = {
    startHour: 7,
    endHour: 22,
    enableNotifications: true,
    syncClassroom: false,
    googleConnected: false,
    studentId: "",
    lastClassroomSyncTime: 0,
    enableEmailNotifications: false,
    emailAddress: ""
};
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Extension starting...");

    googleIntegration = new GoogleIntegration();

    loadSettings(() => {
        autoSyncOnStartup();
    });

    loadEvents();

    currentDateCursor = new Date();
    setCurrentWeek();

    initEventListeners();
    updateDateTime();
    setInterval(updateDateTime, 60000);
    initDateSelector();
    updateCurrentTimeLine();
    setInterval(updateCurrentTimeLine, 60000);

    initEnhancedForm();

    console.log("✅ Extension ready!");
});


function initEventListeners() {
    document.getElementById("btnPrevWeek").addEventListener("click", () => {
        if (currentView === "week") {
            currentDateCursor.setDate(currentDateCursor.getDate() - 7);
            syncWeekStartToCurrentDate();
        } else if (currentView === "day") {
            currentDateCursor.setDate(currentDateCursor.getDate() - 1);
            syncWeekStartToCurrentDate();
        } else if (currentView === "month") {
            currentDateCursor.setMonth(currentDateCursor.getMonth() - 1);
            syncWeekStartToCurrentDate();
        }
        renderCalendar();
    });

    document.getElementById("btnToday").addEventListener("click", () => {
        const today = new Date();
        currentDateCursor = new Date(today);
        setCurrentWeek();
        renderCalendar();
    });

    document.getElementById("btnNextWeek").addEventListener("click", () => {
        if (currentView === "week") {
            currentDateCursor.setDate(currentDateCursor.getDate() + 7);
            syncWeekStartToCurrentDate();
        } else if (currentView === "day") {
            currentDateCursor.setDate(currentDateCursor.getDate() + 1);
            syncWeekStartToCurrentDate();
        } else if (currentView === "month") {
            currentDateCursor.setMonth(currentDateCursor.getMonth() + 1);
            syncWeekStartToCurrentDate();
        }
        renderCalendar();
    });

    document
        .getElementById("btnAddEvent")
        .addEventListener("click", openAddEventModal);
    document
        .getElementById("btnSettings")
        .addEventListener("click", openSettingsModal);

    const btnGoogleSync = document.getElementById("btnGoogleSync");
    if (btnGoogleSync) {
        btnGoogleSync.addEventListener("click", () => {
            console.log("🔗 btnGoogleSync clicked!");
            syncGoogleData();
        });
    } else {
        console.error("❌ btnGoogleSync not found!");
    }

    document
        .getElementById("btnReload")
        .addEventListener("click", reloadExtension);
    document
        .getElementById("btnCloseModal")
        .addEventListener("click", closeEventModal);
    document
        .getElementById("btnCancelModal")
        .addEventListener("click", closeEventModal);
    document
        .getElementById("btnCloseSettings")
        .addEventListener("click", closeSettingsModal);
    document
        .getElementById("btnClosePopup")
        .addEventListener("click", closeEventPopup);

    document
        .getElementById("eventForm")
        .addEventListener("submit", handleEventSubmit);
    document
        .getElementById("settingStartHour")
        .addEventListener("change", updateSettings);
    document
        .getElementById("settingEndHour")
        .addEventListener("change", updateSettings);
    document
        .getElementById("settingEnableNotifications")
        .addEventListener("change", updateSettings);
    document
        .getElementById("settingSyncClassroom")
        .addEventListener("change", updateSettings);
    const emailCheckbox = document.getElementById("settingEnableEmail");
    if (emailCheckbox) {
        emailCheckbox.addEventListener("change", updateSettings);
    }

    const emailInput = document.getElementById("settingEmailAddress");
    if (emailInput) {
        emailInput.addEventListener("blur", updateSettings);
    }

    document.getElementById("btnAddLink").addEventListener("click", addLinkInput);
    document.getElementById("linksContainer").addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-remove-link")) {
            removeLinkInput(e.target);
        }
    });

    document
        .getElementById("btnConnectGoogle")
        .addEventListener("click", connectGoogle);
    document
        .getElementById("btnDisconnectGoogle")
        .addEventListener("click", disconnectGoogle);

    document
        .getElementById("btnExportData")
        .addEventListener("click", exportData);
    document.getElementById("btnImportData").addEventListener("click", () => {
        document.getElementById("importFile").click();
    });
    document.getElementById("importFile").addEventListener("change", importData);
    document
        .getElementById("btnClearData")
        .addEventListener("click", clearAllData);
    document
        .getElementById("btnClearGoogleCache")
        .addEventListener("click", clearGoogleCache);

    document
        .getElementById("btnEditPopup")
        .addEventListener("click", editEventFromPopup);
    document
        .getElementById("btnDeletePopup")
        .addEventListener("click", deleteEventFromPopup);

    // Auth button - Đăng nhập/Đăng xuất
    document
        .getElementById("btnAuth")
        .addEventListener("click", handleAuthClick);

    // Logo click - về hôm nay
    document
        .getElementById("headerLogo")
        .addEventListener("click", () => {
            const today = new Date();
            currentDateCursor = new Date(today);
            setCurrentWeek();
            renderCalendar();
        });

    // View mode selector
    document
        .getElementById("viewMode")
        .addEventListener("change", (e) => {
            currentView = e.target.value;
            renderCalendar();
        });

    // Login form handlers (giữ nguyên cho modal)
    document
        .getElementById("btnCancelLogin")
        .addEventListener("click", closeLoginModal);
    document
        .getElementById("loginForm")
        .addEventListener("submit", handleLoginSubmit);
}
function getStackPriority(event) {
    if (event.source === "classroom") return 1;
    if (event.source === "school" || event.type === "study") return 2;
    return 3;
}

function resetOverlapClusters() {
    overlapClusters = {};
    if (clusterRotateTimer) {
        clearInterval(clusterRotateTimer);
        clusterRotateTimer = null;
    }
}

function updateClusterTop(clusterId) {
    const cluster = overlapClusters[clusterId];
    if (!cluster || !cluster.eventIds.length) return;

    const activeId = cluster.eventIds[cluster.currentIndex];

    cluster.eventIds.forEach((id, idx) => {
        const el = document.querySelector(`.calendar-event[data-event-id="${id}"]`);
        if (!el) return;

        if (id === activeId) {
            el.style.zIndex = "1200";
            el.classList.add("event-active");
        } else {
            el.style.zIndex = (1100 - idx).toString();
            el.classList.remove("event-active");
        }
    });
}

function cycleCluster(clusterId) {
    const cluster = overlapClusters[clusterId];
    if (!cluster || cluster.eventIds.length <= 1) return;

    cluster.currentIndex = (cluster.currentIndex + 1) % cluster.eventIds.length;
    updateClusterTop(clusterId);
}

function startClusterAutoRotate() {
    if (clusterRotateTimer) return;

    if (Object.keys(overlapClusters).length === 0) return;

    clusterRotateTimer = setInterval(() => {
        Object.keys(overlapClusters).forEach((id) => cycleCluster(id));
    }, 60_000);
}


function setCurrentWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() + diff);
    currentWeekStart.setHours(0, 0, 0, 0);
}

function syncWeekStartToCurrentDate() {
    const d = new Date(currentDateCursor);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    currentWeekStart = new Date(d);
    currentWeekStart.setDate(d.getDate() + diff);
    currentWeekStart.setHours(0, 0, 0, 0);
}

function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };

    const dateTimeString = now.toLocaleString("vi-VN", options);
    const dateTimeEl = document.getElementById("currentDateTime");
    if (dateTimeEl) {
        dateTimeEl.textContent = dateTimeString;
    }

    const weekRangeEl = document.getElementById("weekRange");
    if (!weekRangeEl) return;

    if (currentView === "week") {
        const weekStart = new Date(currentWeekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startStr = `${weekStart.getDate().toString().padStart(2, "0")}/${(
            weekStart.getMonth() + 1
        )
            .toString()
            .padStart(2, "0")}`;
        const endStr = `${weekEnd.getDate().toString().padStart(2, "0")}/${(
            weekEnd.getMonth() + 1
        )
            .toString()
            .padStart(2, "0")}`;
        weekRangeEl.textContent = `${startStr} - ${endStr}`;
    } else if (currentView === "day") {
        const d = new Date(currentDateCursor);
        const day = d.getDate().toString().padStart(2, "0");
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        const year = d.getFullYear();
        const weekday = d.toLocaleDateString("vi-VN", { weekday: "long" });
        weekRangeEl.textContent = `${weekday}, ${day}/${month}/${year}`;
    } else if (currentView === "month") {
        const d = new Date(currentDateCursor);
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        const year = d.getFullYear();
        weekRangeEl.textContent = `Tháng ${month}/${year}`;
    }
    const picker = document.getElementById("headerDatePicker");
    if (picker) {
        // Format YYYY-MM-DD
        const year = currentDateCursor.getFullYear();
        const month = (currentDateCursor.getMonth() + 1).toString().padStart(2, "0");
        const day = currentDateCursor.getDate().toString().padStart(2, "0");

        picker.value = `${year}-${month}-${day}`;
    }

}


function formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
}

function renderCalendar() {
    console.log(
        "📅 Rendering calendar, view =",
        currentView,
        "| week starting from:",
        currentWeekStart.toDateString()
    );

    const calendarContainer = document.querySelector(".calendar-container");
    const timeColumn = document.querySelector(".time-column");
    const daysContainer = document.getElementById("daysContainer");
    if (!calendarContainer || !timeColumn || !daysContainer) return;

    // === VIEW THÁNG ===
    if (currentView === "month") {
        // Ẩn cột giờ, dùng grid cho tháng
        timeColumn.style.display = "none";
        daysContainer.innerHTML = "";
        renderMonthView(daysContainer);

        // Ẩn current time line trong view tháng
        document
            .querySelectorAll(".current-time-line")
            .forEach((el) => el.remove());
        const guide = document.getElementById("currentTimeGuide");
        if (guide) guide.style.display = "none";

        // Tháng thì scroll về đầu
        calendarContainer.scrollTop = 0;
        updateDateTime();
        return;
    }

    // === VIEW NGÀY / TUẦN ===
    timeColumn.style.display = "block";
    daysContainer.style.display = "flex";
    daysContainer.style.gridTemplateColumns = "";
    daysContainer.style.gridAutoRows = "";

    // 🔄 Reset lại các cụm trùng giờ trước khi vẽ
    resetOverlapClusters();

    // Vẽ cột giờ + 7 cột ngày
    renderTimeSlots();
    renderDayColumns(); // vẽ 7 cột như cũ

    if (currentView === "day") {
        // Chỉ giữ lại 1 cột của ngày đang chọn
        applyDayViewFilter();
    } else {
        // Week view: đảm bảo tất cả cột hiển thị
        const cols = daysContainer.querySelectorAll(".day-column");
        cols.forEach((col) => {
            col.style.display = "block";
            col.style.flex = "1";
        });
    }

    // Bắt đầu auto rotate cho các cụm trùng giờ (mỗi 1 phút switch 1 lần)
    startClusterAutoRotate();

    // Cập nhật text header ngày/tháng/năm
    updateDateTime();

    // Scroll xuống giờ bắt đầu trong settings (vd: 7h)
    setTimeout(() => {
        const slotHeight = 30;
        const scrollTo = settings.startHour * slotHeight;
        calendarContainer.scrollTop = scrollTo;
        updateCurrentTimeLine();
    }, 100);
}

function renderMonthView(daysContainer) {
    daysContainer.innerHTML = "";
    daysContainer.style.display = "grid";
    daysContainer.style.gridTemplateColumns = "repeat(7, 1fr)";
    daysContainer.style.gridAutoRows = "80px";
    daysContainer.style.columnGap = "1px";
    daysContainer.style.rowGap = "1px";

    const base = new Date(
        currentDateCursor.getFullYear(),
        currentDateCursor.getMonth(),
        1
    );
    const month = base.getMonth();

    const firstDay = base.getDay(); // 0=CN
    const offset = firstDay === 0 ? -6 : 1 - firstDay; // Bắt đầu từ thứ 2

    const gridStart = new Date(base);
    gridStart.setDate(base.getDate() + offset);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        const dateStr = formatDateToString(d);

        const dayEvents = events.filter((e) => e.date === dateStr);

        const cell = document.createElement("div");
        cell.className = "month-cell";
        cell.style.cssText = `
            border: 1px solid #e5e7eb;
            padding: 4px;
            font-size: 11px;
            background: ${d.getMonth() === month ? "#ffffff" : "#f9fafb"
            };
            position: relative;
            overflow: hidden;
            cursor: pointer;
        `;

        const label = document.createElement("div");
        label.style.display = "flex";
        label.style.justifyContent = "space-between";
        label.style.alignItems = "center";

        const dayNumber = document.createElement("span");
        dayNumber.textContent = d.getDate();
        dayNumber.style.fontWeight = "600";

        if (d.getTime() === today.getTime()) {
            dayNumber.style.background =
                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
            dayNumber.style.color = "#fff";
            dayNumber.style.padding = "2px 6px";
            dayNumber.style.borderRadius = "999px";
        }

        label.appendChild(dayNumber);

        if (dayEvents.length > 0) {
            const badge = document.createElement("span");
            badge.textContent = dayEvents.length;
            badge.style.cssText = `
                font-size: 10px;
                background: #e0e7ff;
                color: #4f46e5;
                padding: 0 6px;
                border-radius: 999px;
            `;
            label.appendChild(badge);
        }

        cell.appendChild(label);

        const list = document.createElement("div");
        list.style.marginTop = "2px";
        dayEvents.slice(0, 3).forEach((ev) => {
            const item = document.createElement("div");
            item.style.cssText = `
                margin-top: 1px;
                padding: 1px 3px;
                border-radius: 3px;
                font-size: 10px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                background: ${ev.color || "#3b82f6"};
                color: #fff;
            `;
            item.textContent = `${ev.startTime} ${ev.title}`;
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                showEventPopup(ev, item);
            });
            list.appendChild(item);
        });

        cell.appendChild(list);

        // double-click: tạo event mới ở ngày này
        cell.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            openAddEventModal();
            document.getElementById("eventDate").value = dateStr;
        });

        // click: chuyển sang view ngày tại ngày đó
        cell.addEventListener("click", () => {
            currentDateCursor = new Date(d);
            setView("day");
        });

        daysContainer.appendChild(cell);
    }
}

function getDayIndexInCurrentWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const start = new Date(currentWeekStart);
    start.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
        (d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0 || diffDays > 6) return -1;
    return diffDays;
}

function applyDayViewFilter() {
    const daysContainer = document.getElementById("daysContainer");
    if (!daysContainer) return;

    const cols = daysContainer.querySelectorAll(".day-column");
    const dayIndex = getDayIndexInCurrentWeek(currentDateCursor);
    cols.forEach((col, idx) => {
        if (idx === dayIndex) {
            col.style.display = "block";
            col.style.flex = "1";
        } else {
            col.style.display = "none";
        }
    });
}

function renderTimeSlots() {
    const timeSlotsContainer = document.getElementById("timeSlots");
    timeSlotsContainer.innerHTML = "";
    for (let hour = settings.startHour; hour <= settings.endHour; hour++) {
        const timeSlot = document.createElement("div");
        timeSlot.className = "time-slot";
        timeSlot.textContent = `${hour.toString().padStart(2, "0")}:00`;
        timeSlotsContainer.appendChild(timeSlot);
    }
}

function renderDayColumns() {
    const daysContainer = document.getElementById("daysContainer");
    daysContainer.innerHTML = "";
    const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentWeekStart.getDate() + i);

        const dayColumn = document.createElement("div");
        dayColumn.className = "day-column";

        const dayHeader = document.createElement("div");
        dayHeader.className = "day-header";
        if (currentDate.getTime() === today.getTime()) {
            dayHeader.classList.add("today");
        }

        const dayName = document.createElement("div");
        dayName.className = "day-name";
        dayName.textContent = dayNames[i];

        const dayNumber = document.createElement("div");
        dayNumber.className = "day-number";
        dayNumber.textContent = currentDate.getDate();

        const dateStr = formatDateToString(currentDate);
        const dayEventCount = events.filter((e) => e.date === dateStr).length;

        if (dayEventCount > 0) {
            const badge = document.createElement("div");
            badge.style.cssText = `
                position: absolute;
                top: 3px;
                right: 3px;
                background: ${currentDate.getTime() === today.getTime()
                    ? "rgba(255,255,255,0.3)"
                    : "#667eea"
                };
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
            dayHeader.style.position = "relative";
            dayHeader.appendChild(badge);
        }

        dayHeader.appendChild(dayName);
        dayHeader.appendChild(dayNumber);

        const daySlots = document.createElement("div");
        daySlots.className = "day-slots";
        daySlots.style.position = "relative";
        daySlots.style.overflow = "visible";

        for (let hour = settings.startHour; hour <= settings.endHour; hour++) {
            const hourSlot = document.createElement("div");
            hourSlot.className = "hour-slot";
            hourSlot.dataset.date = formatDateToString(currentDate);
            hourSlot.dataset.hour = hour;

            if (hour < settings.startHour || hour > settings.endHour) {
                hourSlot.style.opacity = "0.3";
                hourSlot.style.background = "#f9fafb";
            }

            hourSlot.addEventListener("click", (e) => {
                if (e.target === hourSlot) {
                    handleSlotClick(currentDate, hour);
                }
            });

            hourSlot.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                hourSlot.classList.add("drop-target");
            });

            hourSlot.addEventListener("dragleave", () => {
                hourSlot.classList.remove("drop-target");
            });

            hourSlot.addEventListener("drop", (e) => {
                e.preventDefault();
                hourSlot.classList.remove("drop-target");
                const eventId = e.dataTransfer.getData("text/plain");
                const targetDate = hourSlot.dataset.date;
                const targetHour = parseInt(hourSlot.dataset.hour);
                handleEventDrop(eventId, targetDate, targetHour);
            });

            daySlots.appendChild(hourSlot);
        }

        dayColumn.appendChild(dayHeader);
        dayColumn.appendChild(daySlots);
        daysContainer.appendChild(dayColumn);
        renderEventsForDay(daySlots, currentDate);
    }
}
function renderEventsForDay(daySlots, date) {
    const dateStr = formatDateToString(date);
    const dayEvents = events.filter((e) => e.date === dateStr);

    if (dayEvents.length === 0) return;

    console.log(
        `📅 Rendering ${dayEvents.length} events for ${dateStr}:`,
        dayEvents.map((e) => e.title)
    );

    // Chuẩn hóa thời gian để xử lý trùng
    const extended = dayEvents.map(ev => {
        const [sh, sm] = (ev.startTime || "00:00").split(":").map(Number);
        const [eh, em] = (ev.endTime || ev.startTime || "00:00").split(":").map(Number);

        let startTotal = sh * 60 + sm;
        let endTotal = eh * 60 + em;

        if (ev.endTime === "23:59") endTotal = 24 * 60 - 1;
        if (ev.endTime === "00:00") endTotal = 24 * 60;

        if (endTotal <= startTotal) endTotal = startTotal + 15;

        return { ev, startTotal, endTotal };
    });

    extended.sort((a, b) => a.startTotal - b.startTotal || a.endTotal - b.endTotal);

    // Gom các event chồng giờ thành cluster
    const clusters = [];
    let currentCluster = null;

    for (const item of extended) {
        if (!currentCluster || item.startTotal >= currentCluster.maxEnd) {
            currentCluster = { items: [], maxEnd: item.endTotal };
            clusters.push(currentCluster);
        }
        currentCluster.items.push(item);
        currentCluster.maxEnd = Math.max(currentCluster.maxEnd, item.endTotal);
    }

    // ==============================
    // 🟣 VIEW NGÀY: giữ layout CŨ (chia cột, KHÔNG switch)
    // ==============================
    if (currentView === "day") {
        for (const cluster of clusters) {
            const colsEnd = [];

            for (const item of cluster.items) {
                let colIndex = 0;
                while (colIndex < colsEnd.length && item.startTotal < colsEnd[colIndex]) {
                    colIndex++;
                }
                if (colIndex === colsEnd.length) {
                    colsEnd.push(item.endTotal);
                } else {
                    colsEnd[colIndex] = item.endTotal;
                }
                item.colIndex = colIndex;
            }

            const colCount = colsEnd.length;
            const widthPercent = 100 / colCount;

            for (const item of cluster.items) {
                const leftPercent = item.colIndex * widthPercent;
                const eventElement = createEventElement(
                    item.ev,
                    daySlots,
                    leftPercent,
                    widthPercent,   // ⬅️ không truyền clusterId ⇒ KHÔNG có nút switch
                    null
                );
                if (eventElement.style.display !== "none") {
                    daySlots.appendChild(eventElement);
                }
            }
        }
        return;
    }

    // ==============================
    // 🟦 VIEW TUẦN: overlay + switch
    // ==============================
    clusters.forEach((cluster, clusterIndex) => {
        const items = cluster.items;

        // Nếu không trùng (1 event) => vẽ full cột, không switch
        if (items.length === 1) {
            const item = items[0];
            const eventElement = createEventElement(
                item.ev,
                daySlots,
                0,
                100,
                null        // không clusterId ⇒ không switch
            );
            if (eventElement.style.display !== "none") {
                daySlots.appendChild(eventElement);
            }
            return;
        }

        // Có trùng: tạo cluster + nút switch
        const clusterId = `${dateStr}-c${clusterIndex}`;

        // Sắp xếp theo độ ưu tiên (1 < 2 < 3) rồi theo giờ
        const sortedItems = [...items].sort((a, b) => {
            const pa = getStackPriority(a.ev);
            const pb = getStackPriority(b.ev);
            if (pa !== pb) return pa - pb;
            return a.startTotal - b.startTotal;
        });

        // Lưu cluster để còn xoay
        overlapClusters[clusterId] = {
            eventIds: sortedItems.map(item => item.ev.id),
            currentIndex: sortedItems.length - 1   // cái ưu tiên nhất nằm trên cùng
        };

        // Vẽ tất cả event chồng lên nhau (full width) + gán clusterId
        sortedItems.forEach((item) => {
            const eventElement = createEventElement(
                item.ev,
                daySlots,
                0,
                100,
                clusterId     // ⬅️ chỉ WEEK view mới truyền clusterId
            );
            if (eventElement.style.display !== "none") {
                daySlots.appendChild(eventElement);
            }
        });

        // Cập nhật z-index cho cụm
        updateClusterTop(clusterId);
    });
}
function createEventElement(
    event,
    daySlots,
    leftPercent = 0,
    widthPercent = 100,
    clusterId = null     // ⬅️ thêm tham số
) {
    const eventDiv = document.createElement("div");
    eventDiv.className = "calendar-event";
    eventDiv.style.backgroundColor = event.color || "#667eea";

    // --- Parse giờ bắt đầu / kết thúc ---
    let [startHour, startMinute] = (event.startTime || "00:00").split(":").map(Number);
    let [endHour, endMinute] = (event.endTime || event.startTime || "00:00")
        .split(":")
        .map(Number);

    let startTotal = startHour * 60 + startMinute;
    let endTotal = endHour * 60 + endMinute;

    if (event.endTime === "23:59") endTotal = 24 * 60 - 1;
    if (event.endTime === "00:00") endTotal = 24 * 60;

    if (endTotal <= startTotal) endTotal = startTotal + 15; // tránh 0 phút

    const dayStart = settings.startHour * 60;
    const dayEnd = settings.endHour * 60 + 59;

    let visibleStart = Math.max(startTotal, dayStart);
    let visibleEnd = Math.min(endTotal, dayEnd);

    if (visibleEnd <= visibleStart) {
        visibleEnd = visibleStart + 15;
    }

    if (visibleEnd <= dayStart || visibleStart >= dayEnd) {
        eventDiv.style.display = "none";
        return eventDiv;
    }

    const slotHeight = 30; // px mỗi giờ
    const duration = visibleEnd - visibleStart;
    const top = ((visibleStart - dayStart) / 60) * slotHeight;
    const height = (duration / 60) * slotHeight;

    eventDiv.style.top = `${Math.max(0, top)}px`;
    eventDiv.style.height = `${Math.max(height, 15)}px`;

    // 👉 Vị trí ngang mặc định theo cột
    eventDiv.style.left = `calc(${leftPercent}% + 2px)`;
    eventDiv.style.width = `calc(${widthPercent}% - 4px)`;
    eventDiv.style.right = "auto";

    // Nếu là cụm trùng giờ ở VIEW TUẦN ⇒ chiếm full cột, đè lên nhau
    if (clusterId && currentView === "week") {
        eventDiv.style.left = "2px";
        eventDiv.style.right = "2px";
        eventDiv.style.width = "calc(100% - 4px)";
    }

    const zIndex = 1000 - Math.min(duration, 999);
    eventDiv.style.zIndex = zIndex.toString();

    // --- Nội dung hiển thị ---
    const titleDiv = document.createElement("div");
    titleDiv.className = "event-title";
    titleDiv.style.display = "flex";
    titleDiv.style.justifyContent = "space-between";
    titleDiv.style.alignItems = "flex-start";
    titleDiv.style.gap = "4px";

    const titleText = document.createElement("span");
    titleText.textContent = event.title || "Sự kiện";
    titleText.style.flex = "1";
    titleText.style.overflow = "hidden";
    titleText.style.textOverflow = "ellipsis";
    titleDiv.appendChild(titleText);

    if (event.priority && event.priority !== "medium") {
        const priorityDot = document.createElement("span");
        priorityDot.style.fontSize = "14px";
        priorityDot.style.lineHeight = "1";
        priorityDot.style.flexShrink = "0";
        priorityDot.textContent = event.priority === "high" ? "●" : "○";
        priorityDot.style.color =
            event.priority === "high" ? "#ef4444" : "#10b981";
        priorityDot.title =
            event.priority === "high" ? "Ưu tiên cao" : "Ưu tiên thấp";
        titleDiv.appendChild(priorityDot);
    }

    const timeDiv = document.createElement("div");
    timeDiv.className = "event-time";
    timeDiv.textContent = `${event.startTime} - ${event.endTime}`;

    let tooltipText = `${event.title || "Sự kiện"}\n${event.startTime} - ${event.endTime
        }`;
    if (event.location) tooltipText += `\n${event.location}`;
    if (event.priority && event.priority !== "medium") {
        tooltipText += `\n${event.priority === "high" ? "Ưu tiên cao" : "Ưu tiên thấp"
            }`;
    }
    if (event.tags && event.tags.length > 0) {
        tooltipText += `\n${event.tags.map((tag) => "#" + tag).join(" ")}`;
    }
    if (event.description) {
        tooltipText += `\n\n${event.description}`;
    }
    eventDiv.title = tooltipText;

    eventDiv.appendChild(titleDiv);
    if (height > 20) {
        eventDiv.appendChild(timeDiv);
    }

    if (
        (event.description && event.description.trim()) ||
        (event.tags && event.tags.length > 0)
    ) {
        const descDiv = document.createElement("div");
        descDiv.className = "event-desc";

        let descText = "";
        if (event.tags && event.tags.length > 0) {
            descText = event.tags.map((tag) => "#" + tag).join(" ") + " ";
        }
        if (event.description && event.description.trim()) {
            descText += event.description.trim();
        }

        descDiv.textContent = descText;
        const MIN_HEIGHT_FOR_DESC = 46;
        if (height > MIN_HEIGHT_FOR_DESC) {
            eventDiv.appendChild(descDiv);
        }
    }

    eventDiv.dataset.eventId = event.id;
    eventDiv.dataset.eventDate = event.date;
    eventDiv.dataset.eventStart = event.startTime;
    eventDiv.dataset.eventEnd = event.endTime;

    // Drag & Drop
    eventDiv.draggable = true;

    eventDiv.addEventListener("dragstart", (e) => {
        e.stopPropagation();
        eventDiv.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", event.id);
    });

    eventDiv.addEventListener("dragend", () => {
        eventDiv.classList.remove("dragging");
    });

    let clickTimeout;
    eventDiv.addEventListener("mousedown", () => {
        clickTimeout = setTimeout(() => { }, 200);
    });

    eventDiv.addEventListener("mouseup", () => {
        clearTimeout(clickTimeout);
    });

    eventDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!eventDiv.classList.contains("dragging")) {
            showEventPopup(event, e.target);
        }
    });

    // 🔁 NÚT SWITCH: chỉ hiện khi ở VIEW TUẦN và có clusterId
    if (clusterId && currentView === "week") {
        eventDiv.dataset.clusterId = clusterId;

        const switchBtn = document.createElement("button");
        switchBtn.type = "button";
        switchBtn.className = "event-switch-btn";
        switchBtn.textContent = "⇄";
        switchBtn.title = "Chuyển sự kiện trùng giờ";
        switchBtn.style.position = "absolute";
        switchBtn.style.top = "2px";
        switchBtn.style.left = "2px";
        switchBtn.style.width = "18px";
        switchBtn.style.height = "18px";
        switchBtn.style.border = "none";
        switchBtn.style.borderRadius = "4px";
        switchBtn.style.fontSize = "11px";
        switchBtn.style.cursor = "pointer";
        switchBtn.style.background = "rgba(0,0,0,0.35)";
        switchBtn.style.color = "#fff";

        switchBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            cycleCluster(clusterId);
        });

        eventDiv.appendChild(switchBtn);
    }

    return eventDiv;
}


function showEventPopup(event, targetElement) {
    const popup = document.getElementById("eventPopup");
    document.getElementById("popupTitle").textContent = event.title;

    // 🔥 TIME với LOCATION (bỏ emoji)
    let timeText = `${event.date} • ${event.startTime} - ${event.endTime}`;
    if (event.location) {
        timeText += ` • ${event.location}`;
    }
    document.getElementById("popupTime").textContent = timeText;

    const descEl = document.getElementById("popupDescription");
    let descHTML = '';

    // 🔥 PRIORITY (bỏ emoji, chỉ dùng dot + text)
    if (event.priority && event.priority !== 'medium') {
        const priorityColor = event.priority === 'high' ? '#fee2e2' : '#d1fae5';
        const priorityTextColor = event.priority === 'high' ? '#dc2626' : '#059669';
        const priorityDot = event.priority === 'high' ? '●' : '○';
        const priorityLabel = event.priority === 'high' ? 'Ưu tiên cao' : 'Ưu tiên thấp';
        descHTML += `<div style="display: inline-block; padding: 4px 10px; background: ${priorityColor}; color: ${priorityTextColor}; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 8px;">${priorityDot} ${priorityLabel}</div>`;
    }

    // 🔥 HASHTAGS (không dùng emoji)
    if (event.tags && event.tags.length > 0) {
        descHTML += '<div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">';
        event.tags.forEach(tag => {
            descHTML += `<span style="padding: 3px 8px; background: #f3f4f6; border-radius: 4px; font-size: 11px; font-weight: 500; color: #667eea;">#${tag}</span>`;
        });
        descHTML += '</div>';
    }

    // Description
    if (event.description) {
        descHTML += event.description;
    } else if (!event.priority && (!event.tags || event.tags.length === 0)) {
        descHTML += "Không có mô tả";
    }

    // Links (giữ lại icons cho links vì dễ nhận biết)
    if (event.links && event.links.length > 0) {
        descHTML +=
            '<br><br><div style="display: flex; flex-direction: column; gap: 6px;">';
        event.links.forEach((link, index) => {
            const linkText = link.includes("meet.google")
                ? "Google Meet"
                : link.includes("zoom")
                    ? "Zoom"
                    : link.includes("docs.google")
                        ? "Google Docs"
                        : link.includes("drive.google")
                            ? "Google Drive"
                            : `Link ${index + 1}`;
            descHTML += `<a href="${link}" target="_blank" style="color: #667eea; text-decoration: none; padding: 6px 12px; background: #f0f4ff; border-radius: 6px; display: inline-block; font-size: 13px; transition: all 0.2s;" onmouseover="this.style.background='#e0e7ff'" onmouseout="this.style.background='#f0f4ff'">${linkText}</a>`;
        });
        descHTML += "</div>";
    }

    if (event.link && (!event.links || event.links.length === 0)) {
        descHTML += `<br><br><a href="${event.link}" target="_blank" style="color: #667eea; text-decoration: underline;">Mở link</a>`;
    }

    if (event.source === "classroom") {
        descHTML += `<br><small style="color: #6b7280;">Google Classroom</small>`;
    } else if (event.source === "school") {
        descHTML += `<br><small style="color: #6b7280;">Lịch trường</small>`;
    }

    descEl.innerHTML = descHTML;
    popup.dataset.eventId = event.id;
    popup.style.display = "block";
    popup.style.visibility = "hidden";

    const rect = targetElement.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = rect.left;
    let top = rect.bottom + 5;

    if (left + popupRect.width > viewportWidth - 20) {
        left = rect.right - popupRect.width;
        if (left < 20) {
            left = viewportWidth - popupRect.width - 20;
        }
    }

    if (left < 20) {
        left = 20;
    }

    if (top + popupRect.height > viewportHeight - 20) {
        top = rect.top - popupRect.height - 5;
        if (top < 20) {
            top = 20;
        }
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.visibility = "visible";
    popup.style.maxHeight = `${viewportHeight - top - 20}px`;
    popup.style.overflowY = "auto";
}

function closeEventPopup() {
    const popup = document.getElementById("eventPopup");
    popup.style.display = "none";
    popup.style.maxHeight = "none";
    popup.style.overflowY = "visible";
}

function editEventFromPopup() {
    const eventId = document.getElementById("eventPopup").dataset.eventId;
    const event = events.find((e) => e.id === eventId);
    if (event) {
        editingEventId = eventId;
        openEditEventModal(event);
    }
    closeEventPopup();
}

function deleteEventFromPopup() {
    const eventId = document.getElementById("eventPopup").dataset.eventId;
    if (confirm("Bạn có chắc muốn xóa sự kiện này?")) {
        deleteEvent(eventId);
    }
    closeEventPopup();
}

function handleSlotClick(date, hour) {
    selectedDate = date;
    selectedTime = hour;
    document.getElementById("eventDate").value = formatDateToString(date);
    document.getElementById("eventStartTime").value = `${hour
        .toString()
        .padStart(2, "0")}:00`;
    document.getElementById("eventEndTime").value = `${(hour + 1)
        .toString()
        .padStart(2, "0")}:00`;
    openAddEventModal();
}

function handleEventDrop(eventId, targetDate, targetHour) {
    console.log(
        `📍 Dropping event ${eventId} to ${targetDate} at ${targetHour}:00`
    );
    const event = events.find((e) => e.id === eventId);
    if (!event) {
        console.error("Event not found:", eventId);
        return;
    }
    if (event.source === "classroom" || event.source === "school") {
        showNotification(
            "⚠️ Không thể di chuyển sự kiện từ Google Classroom / lịch trường",
            "error"
        );
        return;
    }
    const [startHour, startMinute] = event.startTime.split(":").map(Number);
    const [endHour, endMinute] = event.endTime.split(":").map(Number);
    const durationMinutes =
        endHour * 60 + endMinute - (startHour * 60 + startMinute);

    const newStartHour = targetHour;
    const newStartMinute = startMinute;
    const newEndMinutes = newStartHour * 60 + newStartMinute + durationMinutes;
    const newEndHour = Math.floor(newEndMinutes / 60);
    const newEndMinute = newEndMinutes % 60;

    event.date = targetDate;
    event.startTime = `${newStartHour
        .toString()
        .padStart(2, "0")}:${newStartMinute.toString().padStart(2, "0")}`;
    event.endTime = `${newEndHour.toString().padStart(2, "0")}:${newEndMinute
        .toString()
        .padStart(2, 0)}`;

    saveEvents();
    renderCalendar();
    showNotification(
        `✅ Đã di chuyển "${event.title}" đến ${targetDate} ${event.startTime}`,
        "success"
    );
    if (event.reminder && event.reminder !== "none") {
        scheduleReminder(event);
    }
}

function openAddEventModal() {
    editingEventId = null;
    document.getElementById("modalTitle").textContent = "Thêm Sự Kiện";
    document.getElementById("eventForm").reset();
    resetLinksContainer();
    if (!document.getElementById("eventDate").value) {
        document.getElementById("eventDate").value = formatDateToString(new Date());
    }
    document.getElementById("eventModal").classList.add("active");
}

function addLinkInput() {
    const container = document.getElementById("linksContainer");
    const linkGroup = document.createElement("div");
    linkGroup.className = "link-input-group";
    linkGroup.style.cssText = "display: flex; gap: 8px; align-items: center;";
    linkGroup.innerHTML = `
        <input type="url" class="event-link" placeholder="https://..." style="flex: 1;">
        <button type="button" class="btn-remove-link" style="width: 32px; height: 32px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">✕</button>
    `;
    container.appendChild(linkGroup);
    updateRemoveButtons();
}

function removeLinkInput(button) {
    const linkGroup = button.closest(".link-input-group");
    linkGroup.style.animation = "slideOut 0.2s ease";
    setTimeout(() => {
        linkGroup.remove();
        updateRemoveButtons();
    }, 200);
}

function updateRemoveButtons() {
    const linkGroups = document.querySelectorAll(".link-input-group");
    linkGroups.forEach((group) => {
        const removeBtn = group.querySelector(".btn-remove-link");
        if (linkGroups.length === 1) {
            removeBtn.style.display = "none";
        } else {
            removeBtn.style.display = "block";
        }
    });
}

function resetLinksContainer() {
    const container = document.getElementById("linksContainer");
    container.innerHTML = `
        <div class="link-input-group" style="display: flex; gap: 8px; align-items: center;">
            <input type="url" class="event-link" placeholder="https://meet.google.com/..." style="flex: 1;">
            <button type="button" class="btn-remove-link" style="display: none; width: 32px; height: 32px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">✕</button>
        </div>
    `;
}

function getEventLinks() {
    const linkInputs = document.querySelectorAll(".event-link");
    const links = [];
    linkInputs.forEach((input) => {
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
    const container = document.getElementById("linksContainer");
    container.innerHTML = "";
    links.forEach((link, index) => {
        const linkGroup = document.createElement("div");
        linkGroup.className = "link-input-group";
        linkGroup.style.cssText = "display: flex; gap: 8px; align-items: center;";
        linkGroup.innerHTML = `
            <input type="url" class="event-link" value="${link}" placeholder="https://..." style="flex: 1;">
            <button type="button" class="btn-remove-link" style="${links.length === 1 ? "display: none;" : "display: block;"
            } width: 32px; height: 32px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">✕</button>
        `;
        container.appendChild(linkGroup);
    });
    updateRemoveButtons();
}

function openEditEventModal(event) {
    document.getElementById("modalTitle").textContent = "Sửa Sự Kiện";
    document.getElementById("eventType").value = event.type;
    document.getElementById("eventTitle").value = event.title;
    document.getElementById("eventDescription").value = event.description || "";
    setEventLinks(event.links || []);
    document.getElementById("eventDate").value = event.date;
    document.getElementById("eventStartTime").value = event.startTime;
    document.getElementById("eventEndTime").value = event.endTime;
    document.getElementById("eventReminder").value = event.reminder || "none";

    const colorRadios = document.querySelectorAll('input[name="eventColor"]');
    colorRadios.forEach((radio) => {
        if (radio.value === event.color) radio.checked = true;
    });

    document.getElementById("eventModal").classList.add("active");
}

function closeEventModal() {
    document.getElementById("eventModal").classList.remove("active");
    editingEventId = null;
    selectedDate = null;
    selectedTime = null;
}

function openSettingsModal() {
    loadSettings();
    updateStats();
    document.getElementById("settingsModal").classList.add("active");
}

function closeSettingsModal() {
    document.getElementById("settingsModal").classList.remove("active");
}

function handleEventSubmit(e) {
    e.preventDefault();
    const type = document.getElementById("eventType").value;
    const title = document.getElementById("eventTitle").value;
    const description = document.getElementById("eventDescription").value;
    const links = getEventLinks();
    const date = document.getElementById("eventDate").value;
    const startTime = document.getElementById("eventStartTime").value;
    const endTime = document.getElementById("eventEndTime").value;
    const reminder = document.getElementById("eventReminder").value;
    const color = document.querySelector(
        'input[name="eventColor"]:checked'
    ).value;

    // 🔥 ENHANCED FIELDS
    const location = document.getElementById("eventLocation")?.value || '';
    const priority = document.querySelector('input[name="eventPriority"]:checked')?.value || 'medium';
    const tagsCheckboxes = document.querySelectorAll('input[name="eventTags"]:checked');
    const tags = Array.from(tagsCheckboxes).map(cb => cb.value);

    const weekdaysCheckboxes = document.querySelectorAll(
        'input[name="weekdays"]:checked'
    );
    const weekdays = Array.from(weekdaysCheckboxes).map((cb) =>
        parseInt(cb.value)
    );

    const endDate = document.getElementById("eventEndDate").value;

    if (editingEventId) {
        const eventIndex = events.findIndex((e) => e.id === editingEventId);
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
            reminder: reminder === "none" ? null : parseInt(reminder),
            // 🔥 ENHANCED FIELDS
            location,
            priority,
            tags,
        };
        saveEvents();
        renderCalendar();
        closeEventModal();
    } else {
        if (endDate && weekdays.length > 0) {
            createRecurringEvents(
                type,
                title,
                description,
                links,
                date,
                endDate,
                startTime,
                endTime,
                color,
                reminder,
                weekdays,
                location,  // 🔥 ADD
                priority,  // 🔥 ADD
                tags       // 🔥 ADD
            );
        } else {
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
                reminder: reminder === "none" ? null : parseInt(reminder),
                // 🔥 ENHANCED FIELDS
                location,
                priority,
                tags,
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

function createRecurringEvents(
    type,
    title,
    description,
    links,
    startDate,
    endDate,
    startTime,
    endTime,
    color,
    reminder,
    weekdays,
    location = '',    // 🔥 ADD
    priority = 'medium',  // 🔥 ADD
    tags = []         // 🔥 ADD
) {
    const start = new Date(startDate);
    const end = new Date(endDate);
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
                reminder: reminder === "none" ? null : parseInt(reminder),
                // 🔥 ENHANCED FIELDS
                location,
                priority,
                tags,
            };
            events.push(event);
            if (event.reminder && settings.enableNotifications) {
                scheduleReminder(event);
            }
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

function deleteEvent(eventId) {
    events = events.filter((e) => e.id !== eventId);
    saveEvents();
    renderCalendar();
    if (chrome.runtime) {
        chrome.runtime.sendMessage({
            action: "cancelReminder",
            eventId: eventId,
        });
    }
}

function scheduleReminder(event) {
    if (!chrome.runtime) return;
    chrome.runtime.sendMessage({
        action: "scheduleReminder",
        event: event,
    });
}

function loadSettings(callback) {
    chrome.storage.local.get(["settings"], (result) => {
        if (result.settings) {
            settings = { ...settings, ...result.settings };
            console.log("✅ Settings loaded:", settings);
        }

        document.getElementById("settingStartHour").value = settings.startHour;
        document.getElementById("settingEndHour").value = settings.endHour;
        document.getElementById("settingEnableNotifications").checked =
            settings.enableNotifications;

        const emailCheckbox = document.getElementById("settingEnableEmail");
        if (emailCheckbox) {
            emailCheckbox.checked = !!settings.enableEmailNotifications;
        }

        const emailInput = document.getElementById("settingEmailAddress");
        if (emailInput) {
            emailInput.value = settings.notificationEmail || "";
        }

        updateGoogleStatus();
        updateAuthUI();

        if (typeof callback === "function") {
            callback();
        }
    });
}


function saveSettings() {
    chrome.storage.local.set({ settings }, () => {
        console.log("Settings saved:", settings);
    });
}
function updateSettings() {
    settings.startHour = parseInt(
        document.getElementById("settingStartHour").value
    );
    settings.endHour = parseInt(document.getElementById("settingEndHour").value);
    settings.enableNotifications = document.getElementById(
        "settingEnableNotifications"
    ).checked;

    if (document.getElementById("settingSyncClassroom")) {
        settings.syncClassroom = document.getElementById(
            "settingSyncClassroom"
        ).checked;
    }

    const emailCheckbox = document.getElementById("settingEnableEmail");
    if (emailCheckbox) {
        settings.enableEmailNotifications = emailCheckbox.checked;
    }

    const emailInput = document.getElementById("settingEmailAddress");
    if (emailInput) {
        settings.notificationEmail = emailInput.value.trim();
    }

    saveSettings();
    renderCalendar();
}


function updateStats() {
    const studyEvents = events.filter((e) => e.type === "study").length;
    const workEvents = events.filter((e) => e.type === "work").length;
    document.getElementById("statStudyCount").textContent = studyEvents;
    document.getElementById("statWorkCount").textContent = workEvents;
    document.getElementById("statTotalCount").textContent = events.length;
}

function exportData() {
    const data = { events, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
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
            if (confirm("Nhập dữ liệu sẽ ghi đè lên dữ liệu hiện tại. Tiếp tục?")) {
                events = data.events || [];
                settings = data.settings || settings;
                saveEvents();
                chrome.storage.local.set({ settings });
                renderCalendar();
                alert("Nhập dữ liệu thành công!");
            }
        } catch {
            alert("Lỗi: File không hợp lệ");
        }
    };
    reader.readAsText(file);
}

async function clearAllData() {
    if (
        confirm(
            "Bạn có chắc muốn xóa TẤT CẢ dữ liệu? Hành động này sẽ:\n\n" +
            "✅ Xóa tất cả sự kiện\n" +
            "✅ Đăng xuất Google\n" +
            "✅ Đăng xuất tài khoản sinh viên\n" +
            "✅ Reset toàn bộ cài đặt\n\n" +
            "⚠️ Không thể hoàn tác!"
        )
    ) {
        try {
            // 1. Đăng xuất Google nếu đã kết nối
            if (settings.googleConnected && googleIntegration) {
                console.log("🔓 Đăng xuất Google...");
                await googleIntegration.logout();
            }

            // 2. Xóa tất cả events
            events = [];
            saveEvents();

            // 3. Reset settings (bao gồm studentId và googleConnected)
            settings = {
                startHour: 7,
                endHour: 22,
                enableNotifications: true,
                syncClassroom: false,
                googleConnected: false,
                studentId: "", // 🔥 CLEAR STUDENT ID
            };
            await new Promise((r) => chrome.storage.local.set({ settings }, r));

            // 4. Update UI
            renderCalendar();
            updateStats();
            updateGoogleStatus();
            updateAuthUI(); // 🔥 UPDATE AUTH UI

            showNotification("✅ Đã xóa tất cả dữ liệu và đăng xuất!", "success");
        } catch (error) {
            console.error("Error clearing data:", error);
            showNotification("❌ Lỗi khi xóa dữ liệu: " + error.message, "error");
        }
    }
}

async function clearGoogleCache() {
    if (
        !confirm(
            "Xóa tất cả events từ Google và tải lại?\n\nNhững events tự tạo sẽ KHÔNG bị xóa."
        )
    )
        return;
    try {
        // ❗ Chỉ xóa events từ Google Classroom, không xóa lịch trường (source: 'school')
        const googleEvents = events.filter(
            (e) => e.source === "classroom"
        );
        const manualEvents = events.filter(
            (e) => !e.source || (e.source !== "classroom")
        );
        console.log(`🗑️ Xóa ${googleEvents.length} Google Classroom events`);
        console.log(`✅ Giữ lại ${manualEvents.length} events khác (bao gồm lịch trường & manual)`);
        events = manualEvents;
        saveEvents();
        renderCalendar();
        showNotification(
            `🗑️ Đã xóa ${googleEvents.length} events từ Google Classroom`,
            "info"
        );
        if (
            settings.googleConnected &&
            settings.syncClassroom
        ) {
            setTimeout(() => {
                showNotification("🔄 Đang sync lại...", "info");
                syncGoogleData();
            }, 1000);
        } else {
            showNotification("💡 Bật sync Classroom & click nút 🔄 để sync lại events", "info");
        }
    } catch (error) {
        console.error("Error clearing cache:", error);
        showNotification("❌ Lỗi: " + error.message, "error");
    }
}

function reloadExtension() {
    console.log("🔃 Reloading extension...");
    showNotification("🔃 Đang tải lại...", "info");
    loadSettings();
    loadEvents();
    setCurrentWeek();
    renderCalendar();
    setTimeout(() => {
        showNotification("✅ Đã tải lại!", "success");
    }, 500);
}

function loadEvents() {
    chrome.storage.local.get(["events"], (result) => {
        events = result.events || [];
        console.log(`✅ Loaded ${events.length} events from storage`);
        if (events.length > 0) {
            console.log(
                "📅 Events:",
                events.map((e) => ({ title: e.title, date: e.date, source: e.source }))
            );
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

function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function formatDateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function updateCurrentTimeLine() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const totalMinutes = currentHour * 60 + currentMinute;
    const startMinutes = settings.startHour * 60;
    const endMinutes = settings.endHour * 60;

    // Format giờ hiện tại: "09:58"
    const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
        document.querySelectorAll(".current-time-line").forEach((el) => el.remove());
        const g = document.getElementById("currentTimeGuide");
        if (g) g.style.display = "none";
        return;
    }

    const slotHeight = 30;
    const top = ((totalMinutes - startMinutes) / 60) * slotHeight;

    const daysContainer = document.getElementById("daysContainer");
    if (daysContainer) {
        const headerH = document.querySelector(".day-header")?.offsetHeight || 35;
        let guide = document.getElementById("currentTimeGuide");
        if (!guide) {
            guide = document.createElement("div");
            guide.id = "currentTimeGuide";
            guide.className = "current-time-guide";
            daysContainer.appendChild(guide);
        }
        guide.style.display = "block";
        guide.style.top = `${top + headerH}px`;
        guide.setAttribute('data-time', timeString); // ✅ Thêm chữ giờ
    }

    const weekStart = new Date(currentWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const dayDiff = Math.floor((today0 - weekStart) / (1000 * 60 * 60 * 24));
    if (dayDiff < 0 || dayDiff > 6) return;

    const dayColumn = document.querySelectorAll(".day-column")[dayDiff];
    if (!dayColumn) return;

    document.querySelectorAll(".current-time-line").forEach((el) => el.remove());

    const line = document.createElement("div");
    line.className = "current-time-line";
    line.style.top = `${top}px`;
    line.setAttribute('data-time', timeString); // ✅ Thêm chữ giờ

    const daySlots = dayColumn.querySelector(".day-slots");
    if (daySlots) daySlots.appendChild(line);
}

document.addEventListener("click", (e) => {
    const eventPopup = document.getElementById("eventPopup");
    if (eventPopup.style.display === "block" && !eventPopup.contains(e.target)) {
        if (!e.target.closest(".calendar-event")) {
            closeEventPopup();
        }
    }
});


async function autoSyncOnStartup() {
    if (settings.googleConnected && settings.syncClassroom) {
        console.log("🔄 Auto syncing Google Classroom on startup...");

        showNotification(
            "🔄 Đang tải dữ liệu mới từ Google Classroom...",
            "info"
        );

        setTimeout(async () => {
            try {
                await syncGoogleData(true);
                console.log("✅ Auto sync completed");
            } catch (error) {
                console.error("❌ Auto sync failed:", error);
            }
        }, 1500);
    }
}

async function connectGoogle() {
    const btn = document.getElementById("btnConnectGoogle");
    if (btn) {
        btn.textContent = "🔄 Đang kết nối...";
        btn.disabled = true;
    }

    try {
        const success = await googleIntegration.authenticate();
        if (success) {
            settings.googleConnected = true;
            settings.syncClassroom = true; // 🔥 TỰ ĐỘNG ENABLE
            saveSettings();
            updateGoogleStatus();
            showNotification("✅ Kết nối Google thành công!", "success");
            // 🔥 TỰ ĐỘNG SYNC NGAY
            await syncGoogleData();
        } else {
            showNotification(
                "❌ Không thể kết nối Google. Vui lòng thử lại.",
                "error"
            );
        }
    } catch (error) {
        console.error("Error connecting to Google:", error);
        showNotification("❌ Lỗi kết nối: " + error.message, "error");
    } finally {
        if (btn) {
            btn.textContent = "🔐 Kết nối Google";
            btn.disabled = false;
        }
    }
}

async function disconnectGoogle() {
    if (
        !confirm(
            "Bạn có chắc muốn ngắt kết nối với Google? Dữ liệu đã đồng bộ sẽ vẫn được giữ lại."
        )
    )
        return;
    try {
        await googleIntegration.logout();
        settings.googleConnected = false;
        settings.syncClassroom = false;
        saveSettings();
        updateGoogleStatus();
        const syncClassroomCb = document.getElementById("settingSyncClassroom");
        if (syncClassroomCb) syncClassroomCb.checked = false;
        showNotification("✅ Đã ngắt kết nối Google", "success");
    } catch (error) {
        console.error("Error disconnecting:", error);
        showNotification("❌ Lỗi ngắt kết nối: " + error.message, "error");
    }
}

function updateGoogleStatus() {
    const statusEl = document.getElementById("googleStatus");
    const connectBtn = document.getElementById("btnConnectGoogle");
    const disconnectBtn = document.getElementById("btnDisconnectGoogle");
    const syncClassroomCb = document.getElementById("settingSyncClassroom");
    const classroomLabel = syncClassroomCb?.closest(".checkbox-label");

    if (settings.googleConnected) {
        statusEl.textContent = "✅ Đã kết nối Google - Sẵn sàng đồng bộ!";
        statusEl.style.color = "#10b981";
        statusEl.style.fontWeight = "600";
        connectBtn.style.display = "none";
        disconnectBtn.style.display = "block";
        if (syncClassroomCb) {
            syncClassroomCb.disabled = false;
            syncClassroomCb.checked = settings.syncClassroom; // 🔥 SYNC CHECKBOX STATE
        }
        if (classroomLabel) classroomLabel.style.opacity = "1";
    } else {
        statusEl.textContent = "❌ Chưa kết nối - Click nút bên dưới để kết nối";
        statusEl.style.color = "#ef4444";
        statusEl.style.fontWeight = "500";
        connectBtn.style.display = "block";
        disconnectBtn.style.display = "none";
        if (syncClassroomCb) {
            syncClassroomCb.disabled = true;
            syncClassroomCb.checked = false;
        }
        if (classroomLabel) classroomLabel.style.opacity = "0.5";
    }

    if (syncClassroomCb) {
        syncClassroomCb.checked = settings.syncClassroom;
    }
}

async function syncGoogleData(silent = false) {
    console.log("🔄 syncGoogleData called, silent:", silent, "googleConnected:", settings.googleConnected);

    if (!settings.googleConnected) {
        if (!silent) {
            // 🔥 TỰ ĐỘNG MỞ CONNECT GOOGLE thay vì confirm
            console.log("⚠️ Not connected, opening Google login...");
            showNotification("⚠️ Chưa kết nối Google. Đang mở cửa sổ đăng nhập...", "info");
            await connectGoogle();
            if (!settings.googleConnected) {
                console.log("❌ Google login failed or cancelled");
                showNotification("❌ Đăng nhập Google thất bại hoặc bị hủy", "error");
                return;
            }
        } else {
            console.log("ℹ️ Silent mode, skip login");
            return;
        }
    }

    const syncBtn = document.getElementById("btnGoogleSync");
    if (syncBtn) {
        syncBtn.textContent = "⏳";
        syncBtn.disabled = true;
    }

    try {
        const pastStart = new Date(currentWeekStart);
        pastStart.setDate(pastStart.getDate() - 7);
        pastStart.setHours(0, 0, 0, 0);

        const weekStart = new Date(currentWeekStart);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const futureEnd = new Date(weekStart);
        futureEnd.setDate(futureEnd.getDate() + 30);

        let syncedCount = 0;
        let newEvents = [];

        console.log("🔄 Bắt đầu đồng bộ...");
        console.log(
            "📅 Date range:",
            pastStart.toLocaleDateString(),
            "-",
            futureEnd.toLocaleDateString()
        );
        console.log("⚙️ Settings:", {
            classroom: settings.syncClassroom
        });

        if (settings.syncClassroom) {
            console.log("📚 Đang tải Google Classroom...");
            try {
                const assignments = await googleIntegration.fetchAllAssignments();
                console.log(
                    `📚 Tìm thấy ${assignments.length} assignments từ Classroom`
                );
                const existingClassroomIds = new Set(events
                    .filter((e) => e.source === "classroom")
                    .map((e) => e.id));

                const newAssignments = assignments.filter((a) => {
                    const assignmentDate = new Date(a.date);
                    return (
                        assignmentDate >= pastStart &&
                        assignmentDate <= futureEnd &&
                        !existingClassroomIds.has(a.id)
                    );
                });
                console.log(`📚 ${newAssignments.length} assignments mới cần đồng bộ`);
                newEvents = newEvents.concat(newAssignments);
                syncedCount += newAssignments.length;
            } catch (error) {
                console.error("❌ Lỗi tải Classroom:", error);
                if (!silent) {
                    showNotification(
                        "⚠️ Không thể tải Google Classroom: " + error.message,
                        "error"
                    );
                }
            }
        }

        if (newEvents.length > 0) {
            console.log(`✅ Thêm ${newEvents.length} events vào calendar`);
            events = [...events, ...newEvents];
            saveEvents();
            renderCalendar();

            const inCurrentWeek = newEvents.filter((e) => {
                const eventDate = new Date(e.date);
                const weekEnd2 = new Date(currentWeekStart);
                weekEnd2.setDate(weekEnd2.getDate() + 6);
                return eventDate >= currentWeekStart && eventDate <= weekEnd2;
            }).length;

            if (!silent) {
                if (inCurrentWeek > 0 && inCurrentWeek < newEvents.length) {
                    showNotification(
                        `✅ Đã đồng bộ ${syncedCount} sự kiện từ Classroom! ${inCurrentWeek} sự kiện trong tuần này, ${newEvents.length - inCurrentWeek
                        } sự kiện ở các tuần khác. Dùng nút ◀ ▶ để xem.`,
                        "success"
                    );
                } else if (inCurrentWeek === 0) {
                    showNotification(
                        `✅ Đã đồng bộ ${syncedCount} sự kiện từ Classroom! Tất cả đều nằm ngoài tuần này. Dùng nút ◀ ▶ để xem các tuần khác.`,
                        "info"
                    );
                } else {
                    showNotification(
                        `✅ Đồng bộ Classroom thành công ${syncedCount} sự kiện mới!`,
                        "success"
                    );
                }
            }
        } else {
            console.log("ℹ️ Không có events mới");
            if (!silent) {
                showNotification(
                    "ℹ️ Không có sự kiện Classroom mới trong khoảng thời gian này (có thể đã sync rồi).",
                    "info"
                );
            }
        }
    } catch (error) {
        console.error("❌ Lỗi đồng bộ:", error);
        if (!silent) {
            showNotification("❌ Lỗi đồng bộ: " + error.message, "error");
        }
    } finally {
        if (syncBtn) {
            syncBtn.textContent = "🔗";
            syncBtn.disabled = false;
        }
    }
}

function showNotification(message, type = "info") {
    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === "success"
            ? "#10b981"
            : type === "error"
                ? "#ef4444"
                : "#3b82f6"
        };
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
    setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
    .day-slots { position: relative; min-height: 100%; overflow: visible !important; }
    .day-column { overflow: visible !important; }
    .calendar-event { z-index: 10; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
`;
document.head.appendChild(style);

function openLoginModal() {
    const input = document.getElementById('studentId');
    if (settings.studentId) input.value = settings.studentId;
    document.getElementById('loginModal').classList.add('active');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
}

function handleAuthClick() {
    if (settings.studentId) {
        // Đã đăng nhập → Đăng xuất
        if (confirm('Bạn có muốn đăng xuất?')) {
            settings.studentId = '';
            chrome.storage.local.set({ settings }, () => {
                updateAuthUI();
                showNotification('✅ Đã đăng xuất', 'success');
            });
        }
    } else {
        // Chưa đăng nhập → Mở modal
        openLoginModal();
    }
}

function updateAuthUI() {
    const authBtn = document.getElementById('btnAuth');
    const authText = document.getElementById('authText');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');

    if (settings.studentId) {
        // Đã đăng nhập
        authText.textContent = 'Đăng xuất';
        userName.textContent = settings.studentId;
        userInfo.style.display = 'flex';
    } else {
        // Chưa đăng nhập
        authText.textContent = 'Đăng nhập';
        userInfo.style.display = 'none';
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('studentId').value.trim();
    if (!id) { showNotification('Vui lòng nhập Mã sinh viên', 'error'); return; }

    try {
        settings.studentId = id;
        await new Promise((r) => chrome.storage.local.set({ settings }, r));
        updateAuthUI();

        showNotification('⏳ Đang lấy thời khóa biểu...', 'info');
        const syncedCount = await syncSchoolTimetable(id);

        showNotification(`Đồng bộ lịch trường thành công: +${syncedCount} sự kiện`, 'success');
        closeLoginModal();
    } catch (err) {
        console.error(err);
        showNotification('❌ Lỗi đồng bộ lịch trường: ' + (err?.message || 'Unknown error'), 'error');
    }
}

// Parse ISO → { date:'YYYY-MM-DD', time:'HH:mm' } theo local time
function parseIsoToLocal(isoString) {
    const dt = new Date(isoString);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
}

// Map 1 item API → event của app
function mapSchoolItemToEvent(item) {
    if (!item) return null;

    // API mới có sẵn date, startTime, endTime
    if (item.date && item.startTime && item.endTime) {
        return {
            id: item.id || `school-${Date.now()}-${Math.random()}`,
            type: item.type || 'study',
            title: item.title,
            description: item.description || '',
            date: item.date,
            startTime: item.startTime,
            endTime: item.endTime,
            color: item.color || '#3b82f6',
            source: 'school',
            reminder: item.reminder || 30,
            links: item.links || []
        };
    }

    // Fallback: format cũ (raw data)
    if (!item.GIO_BD || !item.GIO_KT) return null;

    const start = parseIsoToLocal(item.GIO_BD);
    const end = parseIsoToLocal(item.GIO_KT);

    const color = item.COLOR || '#3b82f6';
    const title = `${item.TEN_LOP || 'Lịch học'}`;

    const rawId = `school-${(item.TEN_LOP || '')}-${item.GIO_BD}`;
    const id = 'school-' + btoa(unescape(encodeURIComponent(rawId))).replace(/=+$/, '');

    const descParts = [];
    if (item.GIANG_VIEN) descParts.push(`GV: ${item.GIANG_VIEN}`);
    if (item.PHONG_HOC) descParts.push(`Phòng: ${item.PHONG_HOC}`);
    const description = descParts.join('\n');

    return {
        id,
        type: 'study',
        title,
        description,
        date: start.date,
        startTime: start.time,
        endTime: end.time,
        color,
        source: 'school',
        reminder: 30
    };
}

async function syncSchoolTimetable(studentId) {
    const url = `https://utc2-timetable.minhhoang.online/api/timetable?studentId=${encodeURIComponent(studentId)}`;
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    let data;
    try {
        data = await res.json();
    } catch (e) {
        throw new Error('Dữ liệu phản hồi không phải JSON hợp lệ');
    }

    const eventsArray = data.events || data || [];
    const dataArray = Array.isArray(eventsArray) ? eventsArray : [];

    const mapped = dataArray
        .map(mapSchoolItemToEvent)
        .filter(Boolean);

    const seen = new Set();
    const uniqueNew = [];
    for (const ev of mapped) {
        if (!seen.has(ev.id)) { seen.add(ev.id); uniqueNew.push(ev); }
    }

    const kept = events.filter(e => e.source !== 'school');

    events = kept.concat(uniqueNew);
    saveEvents();
    renderCalendar();
    updateStats();

    uniqueNew.forEach(ev => {
        if (settings.enableNotifications && ev.reminder) {
            scheduleReminder(ev);
        }
    });

    return uniqueNew.length;
}
function initDateSelector() {
    const weekRangeEl = document.getElementById("weekRange");
    if (!weekRangeEl) return;

    // Tạo container bọc
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";

    // Tạo input type="date"
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.id = "headerDatePicker";
    dateInput.style.position = "absolute";
    dateInput.style.opacity = "0";
    dateInput.style.cursor = "pointer";
    dateInput.style.width = "100%";
    dateInput.style.height = "100%";
    dateInput.style.left = "0";
    dateInput.style.top = "0";
    dateInput.style.zIndex = "3";

    // Khi chọn ngày
    dateInput.addEventListener("change", () => {
        const picked = new Date(dateInput.value);
        if (!isNaN(picked.getTime())) {
            currentDateCursor = picked;
            syncWeekStartToCurrentDate();
            updateDateTime();
            renderCalendar();
        }
    });

    // Cho wrapper có style giống text gốc
    weekRangeEl.style.cursor = "pointer";
    weekRangeEl.style.padding = "2px 8px";
    weekRangeEl.style.borderRadius = "6px";
    weekRangeEl.style.transition = "0.2s";

    // Hover highlight
    weekRangeEl.addEventListener("mouseenter", () => {
        weekRangeEl.style.background = "rgba(255,255,255,0.2)";
    });
    weekRangeEl.addEventListener("mouseleave", () => {
        weekRangeEl.style.background = "transparent";
    });

    // Chèn wrapper
    weekRangeEl.parentNode.insertBefore(wrapper, weekRangeEl);
    wrapper.appendChild(weekRangeEl);
    wrapper.appendChild(dateInput);
}

// ==================== ENHANCED FORM LOGIC ====================

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
    morning: { startTime: '07:00', endTime: '11:30', type: 'study', title: 'Học buổi sáng' },
    afternoon: { startTime: '13:00', endTime: '17:00', type: 'study', title: 'Học buổi chiều' },
    work: { startTime: '08:00', endTime: '17:00', type: 'work', title: 'Làm việc' },
    meeting: { startTime: '14:00', endTime: '15:00', type: 'meeting', title: 'Họp' }
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
                const titleInput = document.getElementById('eventTitle');
                if (!titleInput.value || titleInput.value === 'Học buổi sáng' || titleInput.value === 'Học buổi chiều' || titleInput.value === 'Làm việc' || titleInput.value === 'Họp') {
                    titleInput.value = template.title;
                }
                console.log('✅ Template applied:', e.target.value);
            }
        });
        console.log('✅ Template selector initialized');
    } else {
        console.warn('⚠️ eventTemplate not found');
    }

    // Time mode selector
    const timeModeRadios = document.querySelectorAll('input[name="timeMode"]');
    const timeModeContainer = document.getElementById('timeModeContainer');
    const periodModeContainer = document.getElementById('periodModeContainer');

    if (timeModeRadios.length > 0) {
        timeModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                console.log('⏰ Time mode changed to:', e.target.value);
                if (e.target.value === 'time') {
                    timeModeContainer.style.display = 'flex';
                    periodModeContainer.style.display = 'none';
                } else {
                    timeModeContainer.style.display = 'none';
                    periodModeContainer.style.display = 'flex';
                    // Auto sync period to time khi chuyển mode
                    syncPeriodToTime();
                }
            });
        });
        console.log('✅ Time mode selector initialized');
    } else {
        console.warn('⚠️ timeMode radios not found');
    }

    // Period selector - convert to time
    const startPeriodSelect = document.getElementById('eventStartPeriod');
    const endPeriodSelect = document.getElementById('eventEndPeriod');

    function syncPeriodToTime() {
        if (!startPeriodSelect || !endPeriodSelect) return;

        const startPeriod = parseInt(startPeriodSelect.value);
        const endPeriod = parseInt(endPeriodSelect.value);

        if (PERIOD_TIMES[startPeriod] && PERIOD_TIMES[endPeriod]) {
            document.getElementById('eventStartTime').value = PERIOD_TIMES[startPeriod].start;
            document.getElementById('eventEndTime').value = PERIOD_TIMES[endPeriod].end;
            console.log(`🔄 Period synced: Tiết ${startPeriod}-${endPeriod} → ${PERIOD_TIMES[startPeriod].start}-${PERIOD_TIMES[endPeriod].end}`);
        }
    }

    if (startPeriodSelect && endPeriodSelect) {
        startPeriodSelect.addEventListener('change', syncPeriodToTime);
        endPeriodSelect.addEventListener('change', syncPeriodToTime);
        console.log('✅ Period selectors initialized');
    } else {
        console.warn('⚠️ Period selectors not found');
    }

    console.log('✅ Enhanced form fully initialized');
}
