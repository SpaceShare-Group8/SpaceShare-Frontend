// host-booking-requests.js - renders the host's incoming booking
// requests list and handles accept/decline + the countdown timers.
//
// MOCK DATA NOTE: there's no bookings/host-requests endpoint on the
// backend yet, so this is all hardcoded to match the figma states
// (pending, confirmed, cancelled, expired). Swap MOCK_BOOKINGS for a
// real fetch once that endpoint exists - the render/state logic below
// doesn't care where the data comes from.

const DECLINE_REASONS = [
  { value: "maintenance", label: "Space under maintenance" },
  { value: "private_event", label: "Private event planned" },
  { value: "operational", label: "Unexpected operational issue" },
];

let bookings = [
  {
    id: "bk-1",
    guestName: "Amaka Johnson",
    workspaceName: "Hub One Workspace",
    location: "Lekki, Lagos",
    date: "Fri, 3rd July 2026",
    time: "08:00-09:00",
    duration: "1 Hour",
    rate: "₦15,000/hour",
    total: "₦15,000",
    status: "pending",
    expiresIn: 57 * 60 + 12,
  },
  {
    id: "bk-2",
    guestName: "David Adeyemi",
    workspaceName: "Innovation Hub",
    location: "Lekki, Lagos",
    date: "Mon, 14th Sept 2026",
    time: "11:00-13:00",
    duration: "2 Hours",
    rate: "₦35,000/hour",
    total: "₦70,000",
    status: "pending",
    expiresIn: 44 * 60 + 32,
  },
  {
    id: "bk-3",
    guestName: "Raphael Imoadibo",
    workspaceName: "WorkNest Hub",
    location: "Lekki, Lagos",
    date: "Thu, 6th Aug 2026",
    time: "08:00-10:00",
    duration: "2 Hours",
    rate: "₦30,000/hour",
    total: "₦60,000",
    status: "pending",
    expiresIn: 39 * 60 + 16,
  },
  {
    id: "bk-4",
    guestName: "Esther Williams",
    workspaceName: "Creative Space",
    location: "Lekki, Lagos",
    date: "Wed, 29th July 2026",
    time: "14:00-18:00",
    duration: "4 Hours",
    rate: "₦15,000/hour",
    total: "₦60,000",
    status: "pending",
    expiresIn: 4 * 60 + 57,
  },
];

const listEl = document.getElementById("requestsList");

// tracks which card currently has its decline panel open, and which
// reason is selected in it, keyed by booking id - kept outside the
// data objects since it's just UI state, not booking data
const declineUiState = {};

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function statusLabel(status) {
  return { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled", expired: "Expired" }[status];
}

function render() {
  listEl.innerHTML = "";

  bookings.forEach((booking) => {
    listEl.appendChild(renderCard(booking));
  });
}

function renderCard(booking) {
  const card = document.createElement("article");
  card.className = "request_card";
  card.dataset.id = booking.id;

  const showActions = booking.status === "pending";
  const showExpiry = booking.status === "pending";
  const declineOpen = declineUiState[booking.id]?.open;

  card.innerHTML = `
    <div class="card_top">
      <div class="avatar">${initials(booking.guestName)}</div>
      <span class="guest_name">${booking.guestName}</span>
      <span class="status_badge ${booking.status}">${statusLabel(booking.status)}</span>
    </div>

    <div class="workspace_row">
      <img class="workspace_thumb" src="/src/Images/booking_img_1.jpg" alt="${booking.workspaceName}" />
      <div>
        <p class="workspace_name">${booking.workspaceName}</p>
        <p class="workspace_loc"><i class="ph ph-map-pin" aria-hidden="true"></i>${booking.location}</p>
      </div>
    </div>

    <div class="booking_details">
      <p class="section_label">Booking Details</p>
      <div class="detail_row"><span><i class="ph ph-calendar" aria-hidden="true"></i>Date</span><span>${booking.date}</span></div>
      <div class="detail_row"><span><i class="ph ph-clock" aria-hidden="true"></i>Time</span><span>${booking.time}</span></div>
      <div class="detail_row"><span><i class="ph ph-hourglass" aria-hidden="true"></i>Duration</span><span>${booking.duration}</span></div>
      <div class="detail_row"><span><i class="ph ph-tag" aria-hidden="true"></i>Rate</span><span>${booking.rate}</span></div>
      <div class="detail_row total"><span><i class="ph-fill ph-receipt" aria-hidden="true"></i>Total</span><span>${booking.total}</span></div>
    </div>

    <div class="card_footer">
      ${
        showExpiry
          ? `<span class="expiry"><i class="ph ph-timer" aria-hidden="true"></i>Expires in <strong class="countdown">${formatCountdown(booking.expiresIn)}</strong></span>`
          : `<span></span>`
      }
      <a class="guest_profile_link" href="#">View Guest Profile</a>
    </div>

    ${
      showActions
        ? `<div class="card_actions">
            <button type="button" class="accept_btn">Accept Request</button>
            <button type="button" class="decline_btn">Decline</button>
          </div>`
        : ""
    }

    ${showActions ? renderDeclinePanel(booking, declineOpen) : ""}
  `;

  if (showActions) {
    card.querySelector(".accept_btn").onclick = () => acceptBooking(booking.id);
    card.querySelector(".decline_btn").onclick = () => toggleDeclinePanel(booking.id);
    wireDeclinePanel(card, booking);
  }

  return card;
}

function renderDeclinePanel(booking, isOpen) {
  const reasonsHtml = DECLINE_REASONS.map(
    (reason) => `
      <label class="decline_reason_option">
        <input type="radio" name="reason-${booking.id}" value="${reason.value}" />
        ${reason.label}
      </label>`
  ).join("");

  return `
    <div class="decline_panel" ${isOpen ? "" : "hidden"}>
      <p class="decline_title">Reason for declining</p>
      ${reasonsHtml}
      <p class="decline_note_label">Leave a short note for the guest (Optional)</p>
      <textarea placeholder="Type your message here..."></textarea>
      <div class="decline_actions">
        <button type="button" class="cancel_decline">Cancel</button>
        <button type="button" class="confirm_decline">Confirm Decline</button>
      </div>
    </div>
  `;
}

function wireDeclinePanel(card, booking) {
  const panel = card.querySelector(".decline_panel");
  panel.querySelector(".cancel_decline").onclick = () => {
    declineUiState[booking.id] = { open: false };
    render();
  };
  panel.querySelector(".confirm_decline").onclick = () => declineBooking(booking.id);
}

function toggleDeclinePanel(id) {
  const current = declineUiState[id]?.open ?? false;
  declineUiState[id] = { open: !current };
  render();
}

function acceptBooking(id) {
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return;
  booking.status = "confirmed";
  render();
}

function declineBooking(id) {
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return;
  booking.status = "cancelled";
  declineUiState[id] = { open: false };
  render();
}

// ticks every pending booking's countdown down by a second, flips it
// to expired once it hits zero. updates the countdown text directly
// instead of calling render() every second - a full re-render would
// wipe out anything the host is typing in an open decline note
function tickCountdowns() {
  let someoneExpired = false;

  bookings.forEach((booking) => {
    if (booking.status !== "pending") return;

    booking.expiresIn -= 1;
    if (booking.expiresIn <= 0) {
      booking.expiresIn = 0;
      booking.status = "expired";
      someoneExpired = true;
    } else {
      const countdownEl = listEl.querySelector(`[data-id="${booking.id}"] .countdown`);
      if (countdownEl) countdownEl.textContent = formatCountdown(booking.expiresIn);
    }
  });

  if (someoneExpired) render();
}

render();
setInterval(tickCountdowns, 1000);
