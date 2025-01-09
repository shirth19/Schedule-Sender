document.addEventListener('DOMContentLoaded', () => {
    // Calendar Configuration
    const calendarConfig = {
        days: [
            { name: 'Mon', enabled: true },
            { name: 'Tue', enabled: true },
            { name: 'Wed', enabled: true },
            { name: 'Thu', enabled: true },
            { name: 'Fri', enabled: true },
            { name: 'Sat', enabled: true },
            { name: 'Sun', enabled: true }
        ],
        timeSlots: {
            intervalsPerHour: 4,
            defaultStart: 9,
            defaultEnd: 17,
            minHour: 0,
            maxHour: 23
        },
        style: {
            cellSize: 40,
            cellHeight: 10,
            headerHeight: 60,
            timeWidth: 80,
            colors: {
                header: '#FF69B4',
                free: '#4CAF50',
                busy: '#FF4444',
                grid: '#ddd',
                pastDay: '#cccccc'
            },
            fonts: {
                header: 'bold 16px "Segoe UI"',
                weekRange: 'bold 14px "Segoe UI"',
                timeLabels: '14px "Segoe UI"'
            }
        }
    };

    // DOM Elements
    const elements = {
        timeLabels: document.querySelector('.time-labels'),
        timeGrid: document.querySelector('.time-grid'),
        generateBtn: document.getElementById('generate-btn'),
        downloadBtn: document.getElementById('download-btn'),
        clearBtn: document.getElementById('clear-btn'),
        copyBtn: document.getElementById('copy-btn'),
        canvas: document.getElementById('calendar-canvas'),
        startTimeSelect: document.getElementById('start-time'),
        endTimeSelect: document.getElementById('end-time'),
        updateRangeBtn: document.getElementById('update-range'),
        weekRange: document.getElementById('week-range'),
        prevWeekBtn: document.getElementById('prev-week'),
        nextWeekBtn: document.getElementById('next-week'),
        datePicker: document.getElementById('date-picker'),
        modeSwitch: document.getElementById('mode-switch'),
        modeLabel: document.getElementById('mode-label'),
        showWeekends: document.getElementById('show-weekends'),
        grayPastDays: document.getElementById('gray-past-days'),
        feedbackText: document.getElementById('feedback-text'),
        feedbackEmail: document.getElementById('feedback-email'),
        sendFeedbackBtn: document.getElementById('send-feedback')
    };

    const ctx = elements.canvas.getContext('2d');
    let currentDate = new Date('2025-01-08T21:34:33-05:00');
    let isMouseDown = false;
    let isSelecting = null;

    // Helper Functions
    function formatHour(hour, hour12Format = true) {
        if (!hour12Format) return `${hour}:00`;
        const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        const ampm = hour < 12 ? 'AM' : 'PM';
        return `${hour12}:00${ampm}`;
    }

    function getEnabledDays(forImage = false) {
        if (forImage) {
            const showWeekends = elements.showWeekends.checked;
            return calendarConfig.days.filter((day, index) => {
                const isWeekend = index >= 5; 
                return day.enabled && (showWeekends || !isWeekend);
            });
        }
        return calendarConfig.days.filter(day => day.enabled);
    }

    function getWeekDates() {
        const monday = new Date(currentDate);
        monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1);
        const friday = new Date(monday);
        friday.setDate(friday.getDate() + 6);
        
        const formatDate = (date) => {
            return `${date.getMonth() + 1}/${date.getDate()}`;
        };
        
        return `${formatDate(monday)}-${formatDate(friday)}`;
    }

    function getCalendarTitle() {
        const isBusyMode = elements.modeSwitch.checked;
        const weekRange = getWeekDates();
        return `${isBusyMode ? 'Busy' : 'Available'} Times: ${weekRange}`;
    }

    function updateWeekDisplay() {
        const dateRange = getWeekDates();
        elements.weekRange.textContent = dateRange;
        elements.datePicker.value = formatDateForPicker(currentDate);
        return dateRange;
    }

    function formatDateForPicker(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function initializeTimeSelectors() {
        const { minHour, maxHour, defaultStart, defaultEnd } = calendarConfig.timeSlots;
        elements.startTimeSelect.innerHTML = '';
        elements.endTimeSelect.innerHTML = '';

        for (let hour = minHour; hour <= maxHour; hour++) {
            const timeStr = formatHour(hour);
            elements.startTimeSelect.add(new Option(timeStr, hour));
            elements.endTimeSelect.add(new Option(timeStr, hour));
        }

        elements.startTimeSelect.value = defaultStart;
        elements.endTimeSelect.value = defaultEnd;
    }

    function isPastDay(dayIndex) {
        const today = new Date('2025-01-08T22:12:34-05:00');
        const monday = new Date(currentDate);
        monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1);
        const dayDate = new Date(monday);
        dayDate.setDate(dayDate.getDate() + dayIndex);
        
        // Set both dates to midnight to compare full days
        today.setHours(0, 0, 0, 0);
        dayDate.setHours(0, 0, 0, 0);
        
        return dayDate < today;
    }

    // Create calendar grid
    function createCalendarGrid() {
        elements.timeLabels.innerHTML = '';
        elements.timeGrid.innerHTML = '';

        const startHour = parseInt(elements.startTimeSelect.value);
        const endHour = parseInt(elements.endTimeSelect.value);
        const { intervalsPerHour } = calendarConfig.timeSlots;
        const totalIntervals = (endHour - startHour) * intervalsPerHour;
        const enabledDays = getEnabledDays();

        // Create time labels
        for (let hour = startHour; hour <= endHour; hour++) {
            if (hour < endHour || hour === startHour) {
                const timeLabel = document.createElement('div');
                timeLabel.className = 'time-label';
                timeLabel.textContent = formatHour(hour);
                elements.timeLabels.appendChild(timeLabel);

                if (hour < endHour) {
                    for (let i = 1; i < intervalsPerHour; i++) {
                        const quarterLabel = document.createElement('div');
                        quarterLabel.className = 'time-label';
                        elements.timeLabels.appendChild(quarterLabel);
                    }
                }
            }
        }

        // Create grid cells
        for (let interval = 0; interval < totalIntervals; interval++) {
            for (let day of enabledDays) {
                const cell = document.createElement('div');
                cell.className = 'time-cell';
                cell.dataset.day = day.name;
                cell.dataset.interval = interval;
                cell.dataset.hour = Math.floor(interval / 4) + startHour;
                cell.dataset.minute = (interval % 4) * 15;
                elements.timeGrid.appendChild(cell);
            }
        }
    }

    // Generate calendar image
    function generateCalendarImage() {
        const selectedCells = Array.from(document.querySelectorAll('.time-cell.selected'));
        if (selectedCells.length === 0) return;

        const startHour = parseInt(elements.startTimeSelect.value);
        const endHour = parseInt(elements.endTimeSelect.value);
        const totalIntervals = (endHour - startHour) * 4;
        const enabledDays = getEnabledDays(true);  
        const style = calendarConfig.style;
        const isBusyMode = elements.modeSwitch.checked;
        const shouldGrayPastDays = elements.grayPastDays.checked;

        // Set canvas dimensions
        const width = style.timeWidth + (enabledDays.length * style.cellSize);
        const height = style.headerHeight + (totalIntervals * style.cellHeight);
        elements.canvas.width = width;
        elements.canvas.height = height;

        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        // Draw header
        ctx.fillStyle = style.colors.header;
        ctx.fillRect(0, 0, width, style.headerHeight);
        
        // Draw title (week range)
        ctx.font = style.fonts.weekRange;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getCalendarTitle(), width / 2, style.headerHeight / 4);

        // Draw day names
        ctx.font = style.fonts.header;
        enabledDays.forEach((day, i) => {
            ctx.fillText(day.name, style.timeWidth + (i * style.cellSize) + style.cellSize/2, style.headerHeight * 3/4);
        });

        // Draw time labels
        ctx.font = style.fonts.timeLabels;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';

        for (let hour = startHour; hour <= endHour; hour++) {
            if (hour < endHour || hour === startHour) {
                const y = style.headerHeight + ((hour - startHour) * 4 * style.cellHeight);
                ctx.fillText(formatHour(hour), style.timeWidth - 10, y);
            }
        }

        // Draw grid lines
        ctx.strokeStyle = style.colors.grid;

        // Vertical lines
        for (let i = 0; i <= enabledDays.length; i++) {
            ctx.beginPath();
            ctx.lineWidth = 0.5;
            const x = style.timeWidth + (i * style.cellSize);
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let i = 0; i <= totalIntervals; i++) {
            ctx.beginPath();
            ctx.lineWidth = i % 4 === 0 ? 1.5 : 0.5;
            const y = style.headerHeight + (i * style.cellHeight);
            ctx.moveTo(style.timeWidth, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // If graying out past days is enabled, fill entire columns for past days
        if (shouldGrayPastDays) {
            enabledDays.forEach((day, i) => {
                const dayIndex = calendarConfig.days.findIndex(d => d.name === day.name);
                if (isPastDay(dayIndex)) {
                    ctx.fillStyle = style.colors.pastDay;
                    const x = style.timeWidth + (i * style.cellSize);
                    ctx.fillRect(x, style.headerHeight, style.cellSize, height - style.headerHeight);
                }
            });
        }

        // Fill selected cells
        selectedCells.forEach(cell => {
            const dayName = cell.dataset.day;
            const dayIndex = enabledDays.findIndex(d => d.name === dayName);
            if (dayIndex === -1) return;

            const hour = parseInt(cell.dataset.hour);
            const minute = parseInt(cell.dataset.minute);
            const x = style.timeWidth + (dayIndex * style.cellSize);
            const y = style.headerHeight + ((hour - startHour) * 4 + (minute / 15)) * style.cellHeight;

            // Only draw selection if it's not a past day or if past days are not being grayed out
            if (!shouldGrayPastDays || !isPastDay(calendarConfig.days.findIndex(d => d.name === dayName))) {
                ctx.fillStyle = isBusyMode ? style.colors.busy : style.colors.free;
                ctx.fillRect(x, y, style.cellSize, style.cellHeight);
            }
        });
    }

    // Event Listeners
    elements.prevWeekBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 7);
        updateWeekDisplay();
    });

    elements.nextWeekBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 7);
        updateWeekDisplay();
    });

    elements.updateRangeBtn.addEventListener('click', () => {
        const startHour = parseInt(elements.startTimeSelect.value);
        const endHour = parseInt(elements.endTimeSelect.value);

        if (startHour >= endHour) {
            alert('End time must be after start time!');
            return;
        }

        createCalendarGrid();
        ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    });

    elements.timeGrid.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('time-cell')) {
            isMouseDown = true;
            isSelecting = !e.target.classList.contains('selected');
            e.target.classList.toggle('selected');
            e.target.style.backgroundColor = elements.modeSwitch.checked ? calendarConfig.style.colors.busy : calendarConfig.style.colors.free;
            e.preventDefault();
        }
    });

    elements.timeGrid.addEventListener('mouseover', (e) => {
        if (isMouseDown && e.target.classList.contains('time-cell')) {
            if (isSelecting) {
                e.target.classList.add('selected');
                e.target.style.backgroundColor = elements.modeSwitch.checked ? calendarConfig.style.colors.busy : calendarConfig.style.colors.free;
            } else {
                e.target.classList.remove('selected');
                e.target.style.backgroundColor = '';
            }
        }
    });

    document.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    elements.generateBtn.addEventListener('click', generateCalendarImage);

    elements.downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'my-schedule.png';
        link.href = elements.canvas.toDataURL('image/png');
        link.click();
    });

    elements.copyBtn.addEventListener('click', async () => {
        try {
            const img = document.createElement('img');
            img.src = elements.canvas.toDataURL('image/png');
            
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.pointerEvents = 'none';
            container.style.opacity = '0';
            container.appendChild(img);
            document.body.appendChild(container);
            
            const range = document.createRange();
            range.selectNode(img);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            
            let success = false;
            try {
                success = document.execCommand('copy');
            } catch (e) {
                success = false;
            }
            
            if (!success) {
                const blob = await new Promise(resolve => elements.canvas.toBlob(resolve));
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                success = true;
            }
            
            window.getSelection().removeAllRanges();
            document.body.removeChild(container);
            
            const originalText = elements.copyBtn.textContent;
            elements.copyBtn.textContent = 'Copied! ';
            setTimeout(() => {
                elements.copyBtn.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy image: ', err);
            alert('Failed to copy image to clipboard. You can still use the download button!');
        }
    });

    elements.clearBtn.addEventListener('click', () => {
        document.querySelectorAll('.time-cell.selected').forEach(cell => {
            cell.classList.remove('selected');
            cell.style.backgroundColor = '';
        });
        ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    });

    elements.datePicker.addEventListener('change', (e) => {
        const selectedDate = new Date(e.target.value);
        selectedDate.setHours(currentDate.getHours());
        selectedDate.setMinutes(currentDate.getMinutes());
        selectedDate.setSeconds(currentDate.getSeconds());
        currentDate = selectedDate;
        updateWeekDisplay();
    });

    elements.modeSwitch.addEventListener('change', (e) => {
        const isBusyMode = e.target.checked;
        elements.modeLabel.textContent = isBusyMode ? 'Busy Times' : 'Free Times';
        
        document.querySelectorAll('.time-cell.selected').forEach(cell => {
            cell.style.backgroundColor = isBusyMode ? calendarConfig.style.colors.busy : calendarConfig.style.colors.free;
        });
        
        if (elements.canvas.width > 0) {
            generateCalendarImage();
        }
    });

    elements.showWeekends.addEventListener('change', () => {
        if (elements.canvas.width > 0) {
            generateCalendarImage();
        }
    });

    elements.grayPastDays.addEventListener('change', () => {
        if (elements.canvas.width > 0) {
            generateCalendarImage();
        }
    });

    elements.sendFeedbackBtn.addEventListener('click', () => {
        elements.sendFeedbackBtn.textContent = 'Sending...';
        setTimeout(() => {
            elements.sendFeedbackBtn.textContent = 'Send Feedback';
        }, 2000);
    });

    // Initialize
    initializeTimeSelectors();
    createCalendarGrid();
    updateWeekDisplay();
    elements.datePicker.value = formatDateForPicker(currentDate);
});
