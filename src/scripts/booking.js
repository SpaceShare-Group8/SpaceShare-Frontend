// booking.js - handles the booking type dropdown, calendar, time slots and summary

const RATE = 15000;
const BAD_DAYS = [8, 17]; // already booked, just hardcoded for now since there's no api for it yet
const SLOTS = [
  "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00",
  "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00",
  "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00",
];
const BAD_SLOTS = ["08:00-09:00", "15:00-16:00"]; // matches the greyed out ones in the figma

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const calMonthEl = document.getElementById("calendarMonth");
const calGridEl = document.getElementById("calendarGrid");
const prevBtn = document.getElementById("prevMonth");
const nextBtn = document.getElementById("nextMonth");
const slotsEl = document.getElementById("timeSlots");
const typeSelect = document.getElementById("bookingType");
const typeNoteText = document.getElementById("bookingTypeNoteText");
const payNoteText = document.getElementById("paymentNoteText");
const reqBtn = document.getElementById("requestBookingBtn");
const reqBtnLabel = document.getElementById("requestBtnLabel");
const backBtn = document.querySelector(".back_btn");

const sumDate = document.getElementById("summaryDate");
const sumTime = document.getElementById("summaryTime");
const sumDuration = document.getElementById("summaryDuration");
const sumTotal = document.getElementById("summaryTotal");

const today = new Date();
today.setHours(0, 0, 0, 0);

let viewYear = today.getFullYear();
let viewMonth = today.getMonth();
let pickedDate = null;

// range selection - click a slot to start, click a later one to finish
// the range (fills everything between). clicking again after that
// starts a fresh range.
let rangeStart = null;
let rangeEnd = null;

function drawCalendar() {
  calMonthEl.textContent = `${months[viewMonth]} ${viewYear}`;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

  calGridEl.innerHTML = "";
  for (let i = 0; i < firstDay; i++) {
    calGridEl.appendChild(document.createElement("span"));
  }

  for (let d = 1; d <= totalDays; d++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal_day";
    btn.textContent = d;

    const past = new Date(viewYear, viewMonth, d) < today;
    const booked = BAD_DAYS.includes(d);
    btn.disabled = past || booked;

    if (pickedDate && pickedDate.y === viewYear && pickedDate.m === viewMonth && pickedDate.d === d) {
      btn.classList.add("is_selected");
    }

    if (!btn.disabled) {
      btn.onclick = () => {
        pickedDate = { y: viewYear, m: viewMonth, d };
        drawCalendar();
        updateSummary();
      };
    }

    calGridEl.appendChild(btn);
  }

  // can't go back before this month
  prevBtn.disabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();
}

prevBtn.onclick = () => {
  viewMonth--;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear--;
  }
  drawCalendar();
};

nextBtn.onclick = () => {
  viewMonth++;
  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear++;
  }
  drawCalendar();
};

function drawSlots() {
  slotsEl.innerHTML = "";

  SLOTS.forEach((slot, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot";
    btn.textContent = slot;
    btn.disabled = BAD_SLOTS.includes(slot);

    const inRange = rangeStart !== null && i >= rangeStart && i <= (rangeEnd ?? rangeStart);
    if (inRange) btn.classList.add("is_selected");

    if (!btn.disabled) {
      btn.onclick = () => pickSlot(i);
    }

    slotsEl.appendChild(btn);
  });
}

function pickSlot(i) {
  if (rangeStart === null) {
    rangeStart = i;
    rangeEnd = null;
  } else if (rangeEnd === null) {
    if (i > rangeStart && !rangeHasBadSlot(rangeStart, i)) {
      rangeEnd = i;
    } else {
      // clicked backwards or the range would cross a booked slot -
      // just start over from here
      rangeStart = i;
      rangeEnd = null;
    }
  } else {
    rangeStart = i;
    rangeEnd = null;
  }

  drawSlots();
  updateSummary();
}

function rangeHasBadSlot(start, end) {
  for (let i = start; i <= end; i++) {
    if (BAD_SLOTS.includes(SLOTS[i])) return true;
  }
  return false;
}

function updateSummary() {
  if (pickedDate) {
    const dObj = new Date(pickedDate.y, pickedDate.m, pickedDate.d);
    sumDate.textContent = `${weekdays[dObj.getDay()]}, ${ordinal(pickedDate.d)} ${months[pickedDate.m]} ${pickedDate.y}`;
  } else {
    sumDate.textContent = "Select a date";
  }

  if (rangeStart !== null) {
    const start = SLOTS[rangeStart].split("-")[0];
    const end = SLOTS[rangeEnd ?? rangeStart].split("-")[1];
    sumTime.textContent = `${start}-${end}`;

    const hours = (rangeEnd ?? rangeStart) - rangeStart + 1;
    sumDuration.textContent = hours === 1 ? "1 Hour" : `${hours} Hours`;
    sumTotal.textContent = `₦${(hours * RATE).toLocaleString("en-NG")}`;
  } else {
    sumTime.textContent = "Select a time";
    sumDuration.textContent = "-";
    sumTotal.textContent = "0";
  }

  reqBtn.disabled = !(pickedDate && rangeStart !== null);
}

function ordinal(d) {
  if (d % 10 === 1 && d !== 11) return d + "st";
  if (d % 10 === 2 && d !== 12) return d + "nd";
  if (d % 10 === 3 && d !== 13) return d + "rd";
  return d + "th";
}

// swap the copy depending on booking type - request needs host approval,
// instant just needs payment
function applyType() {
  const instant = typeSelect.value === "instant";
  typeNoteText.textContent = instant
    ? "You can book and access the space immediately after payment."
    : "Your booking requires host approval before confirmation.";
  payNoteText.textContent = instant
    ? "Complete payment to instantly confirm your booking."
    : "The host typically responds within 24 hours.";
  reqBtnLabel.textContent = instant ? "Proceed to Payment" : "Request Booking";
}

typeSelect.onchange = applyType;

backBtn.onclick = () => window.history.back();

reqBtn.onclick = () => {
  if (reqBtn.disabled) return;
  // no bookings endpoint on the backend yet so this doesn't actually
  // send anything - just a placeholder so the button does something
  reqBtnLabel.textContent = "Sent ✓";
  reqBtn.disabled = true;
};

drawCalendar();
drawSlots();
applyType();
updateSummary();
