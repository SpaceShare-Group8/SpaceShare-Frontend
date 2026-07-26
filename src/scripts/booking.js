// src/scripts/booking.js
// Wires up src/pages/booking.html: an interactive calendar, hourly
// time slot picker, live booking summary, and a booking-type toggle
// (Request vs Instant).
//
// MOCK DATA NOTE: there's no bookings/availability API built yet (see
// SpaceShare-Backend's src/ layout - a bookings/ module is planned but
// not implemented). So "unavailable" dates/slots below are hardcoded
// just to match the Figma states visually. Once a real availability
// endpoint exists, swap MOCK_UNAVAILABLE_DAYS/MOCK_UNAVAILABLE_SLOTS
// for a real fetch of that workspace's actual booked slots.

const RATE_PER_HOUR = 15000;
const WORKSPACE_NAME = "Hub One Workspace";

// Days-of-month that are already booked, regardless of which month is
// showing - purely to mirror the two greyed-out dates in the design.
const MOCK_UNAVAILABLE_DAYS = [8, 17];

const TIME_SLOTS = [
  "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00",
  "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00",
  "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00",
];
const MOCK_UNAVAILABLE_SLOTS = ["13:00-14:00"];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const calendarMonthEl = document.getElementById("calendarMonth");
const calendarGridEl = document.getElementById("calendarGrid");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const timeSlotsEl = document.getElementById("timeSlots");
const bookingTypeSelect = document.getElementById("bookingType");
const bookingTypeNoteText = document.getElementById("bookingTypeNoteText");
const requestBtn = document.getElementById("requestBookingBtn");
const requestBtnLabel = document.getElementById("requestBtnLabel");
const bookingFootnote = document.getElementById("bookingFootnote");
const backBtn = document.querySelector(".back_btn");

const summaryDateEl = document.getElementById("summaryDate");
const summaryTimeEl = document.getElementById("summaryTime");
const summaryTotalEl = document.getElementById("summaryTotal");

const today = new Date();
today.setHours(0, 0, 0, 0);

let viewYear = today.getFullYear();
let viewMonth = today.getMonth(); // 0-11
let selectedDate = null; // { year, month, day }
let selectedSlot = null; // e.g. "08:00-09:00"

function isPastDate(year, month, day) {
  return new Date(year, month, day) < today;
}

function isUnavailableDate(day) {
  return MOCK_UNAVAILABLE_DAYS.includes(day);
}

function formatMoney(amount) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function renderCalendar() {
  calendarMonthEl.textContent = `${MONTH_LABELS[viewMonth]} ${viewYear}`;

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  calendarGridEl.innerHTML = "";

  for (let i = 0; i < firstWeekday; i++) {
    calendarGridEl.appendChild(document.createElement("span"));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar_day";
    btn.textContent = String(day);

    const disabled = isPastDate(viewYear, viewMonth, day) || isUnavailableDate(day);
    btn.disabled = disabled;

    const isSelected =
      selectedDate &&
      selectedDate.year === viewYear &&
      selectedDate.month === viewMonth &&
      selectedDate.day === day;
    btn.classList.toggle("selected", Boolean(isSelected));

    if (!disabled) {
      btn.addEventListener("click", () => {
        selectedDate = { year: viewYear, month: viewMonth, day };
        renderCalendar();
        updateSummary();
      });
    }

    calendarGridEl.appendChild(btn);
  }

  // Don't let people navigate to months before the current one
  prevMonthBtn.disabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();
}

prevMonthBtn.addEventListener("click", () => {
  viewMonth -= 1;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear -= 1;
  }
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  viewMonth += 1;
  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear += 1;
  }
  renderCalendar();
});

function renderTimeSlots() {
  timeSlotsEl.innerHTML = "";

  TIME_SLOTS.forEach((slot) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "time_slot";
    btn.textContent = slot;

    const disabled = MOCK_UNAVAILABLE_SLOTS.includes(slot);
    btn.disabled = disabled;
    btn.classList.toggle("selected", slot === selectedSlot);

    if (!disabled) {
      btn.addEventListener("click", () => {
        selectedSlot = slot;
        renderTimeSlots();
        updateSummary();
      });
    }

    timeSlotsEl.appendChild(btn);
  });
}

function updateSummary() {
  if (selectedDate) {
    const dateObj = new Date(selectedDate.year, selectedDate.month, selectedDate.day);
    const weekday = WEEKDAY_LABELS[dateObj.getDay()];
    const ordinal = getOrdinal(selectedDate.day);
    summaryDateEl.textContent = `${weekday}, ${ordinal} ${MONTH_LABELS[selectedDate.month]} ${selectedDate.year}`;
  } else {
    summaryDateEl.textContent = "Select a date";
  }

  summaryTimeEl.textContent = selectedSlot || "Select a time slot";
  summaryTotalEl.textContent = selectedSlot ? formatMoney(RATE_PER_HOUR) : formatMoney(0);

  requestBtn.disabled = !(selectedDate && selectedSlot);
}

function getOrdinal(day) {
  if (day % 10 === 1 && day !== 11) return `${day}st`;
  if (day % 10 === 2 && day !== 12) return `${day}nd`;
  if (day % 10 === 3 && day !== 13) return `${day}rd`;
  return `${day}th`;
}

function applyBookingType() {
  const isInstant = bookingTypeSelect.value === "instant";
  bookingTypeNoteText.textContent = isInstant
    ? "Your booking will be confirmed instantly - no host approval needed."
    : "Your booking requires host approval before confirmation.";
  requestBtnLabel.textContent = isInstant ? "Confirm Booking" : "Request Booking";
  bookingFootnote.textContent = isInstant
    ? "You'll get instant confirmation once payment is complete."
    : "You'll be notified once your booking request has been reviewed.";
}

bookingTypeSelect.addEventListener("change", applyBookingType);

backBtn.addEventListener("click", () => {
  window.history.back();
});

requestBtn.addEventListener("click", () => {
  if (!selectedDate || !selectedSlot) return;

  // No bookings API exists yet to actually call here (see note at the
  // top of this file) - this is a placeholder confirmation only.
  requestBtnLabel.textContent = "Request sent ✓";
  requestBtn.disabled = true;
});

renderCalendar();
renderTimeSlots();
applyBookingType();
updateSummary();
