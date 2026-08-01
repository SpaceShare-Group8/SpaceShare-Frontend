// admin-dispute-queue.js
//
// MOCK DATA NOTE: same deal as host-booking-requests.js - there's no
// disputes/moderation endpoint on the backend yet, so MOCK_DISPUTES
// below is hardcoded to match the figma. Add/edit/remove disputes in
// that array and everything else (queue rows, badge counts, the
// detail view) updates itself - you shouldn't need to touch the HTML
// to change the data.
let disputes = [
  {
    id: "DSP-2026-001",
    raisedBy: "guest", // "guest" | "host" - controls the badge color, see renderQueue()
    submittedDate: "June 30, 2026",
    bookingId: "BK-78543",
    date: "June 30, 2026",
    time: "08:00–11:00",
    duration: "3 hours",
    total: "₦45,000",
    workspace: "Hub One Workspace",
    location: "Lekki, Lagos",
    // ICON/IMAGE: reusing the one workspace photo we have. once each
    // listing has its own image on the backend, swap this per-dispute
    workspaceImg: "/src/Images/booking_img_1.jpg",
    host: "Daniel Okafor",
    hostEmail: "DanielO@gmail.com",
    hostPhone: "+234 902 860 3195",
    guestName: "I.A.Raphael",
    guestEmail: "imoadibor@gmail.com",
    guestPhone: "+234 812 860 3195",
    summary: "Workspace unavailable upon arrival.",
    guestReport: "I arrived at the scheduled booking time, but the workspace was occupied and unavailable.",
    evidence: "No files uploaded.",
    reliabilityScore: 4.6,
    completedBookings: 28,
    previousDisputes: 2,
    previousCancellations: 1,
  },
  {
    id: "DSP-2026-002",
    raisedBy: "guest",
    submittedDate: "June 29, 2026",
    bookingId: "BK-78518",
    date: "June 29, 2026",
    time: "11:00–12:00",
    duration: "1 hour",
    total: "₦30,000",
    workspace: "WorkNest Hub",
    location: "Lekki, Lagos",
    workspaceImg: "/src/Images/booking_img_1.jpg",
    host: "Kemi O.",
    hostEmail: "kemi.o@gmail.com",
    hostPhone: "+234 803 555 0182",
    guestName: "Tunde Bakare",
    guestEmail: "tunde.bakare@gmail.com",
    guestPhone: "+234 701 220 4456",
    summary: "Host cancelled the booking at the last minute.",
    guestReport: "The host cancelled about 10 minutes before my booking was due to start, with no notice.",
    evidence: "No files uploaded.",
    reliabilityScore: 4.2,
    completedBookings: 18,
    previousDisputes: 4,
    previousCancellations: 3,
  },
  {
    id: "DSP-2026-003",
    raisedBy: "guest",
    submittedDate: "June 28, 2026",
    bookingId: "BK-78491",
    date: "June 28, 2026",
    time: "16:00–17:00",
    duration: "1 hour",
    total: "₦50,000",
    workspace: "Creative Space",
    location: "Lekki, Lagos",
    workspaceImg: "/src/Images/booking_img_1.jpg",
    host: "Michael Jose",
    hostEmail: "michael.jose@gmail.com",
    hostPhone: "+234 809 112 7743",
    guestName: "Ngozi Umeh",
    guestEmail: "ngozi.umeh@gmail.com",
    guestPhone: "+234 706 998 2210",
    summary: "Amenities advertised were unavailable.",
    guestReport: "The listing advertised high-speed wifi and a projector, neither of which were available on arrival.",
    evidence: "No files uploaded.",
    reliabilityScore: 4.8,
    completedBookings: 41,
    previousDisputes: 0,
    previousCancellations: 0,
  },
  {
    id: "DSP-2026-004",
    raisedBy: "host",
    submittedDate: "June 27, 2026",
    bookingId: "BK-78477",
    date: "June 27, 2026",
    time: "13:00–14:00",
    duration: "1 hour",
    total: "₦35,000",
    workspace: "Innovation Hub",
    location: "Lekki, Lagos",
    workspaceImg: "/src/Images/booking_img_1.jpg",
    host: "Blessing Cyndy",
    hostEmail: "blessing.cyndy@gmail.com",
    hostPhone: "+234 815 340 9021",
    guestName: "Femi Adisa",
    guestEmail: "femi.adisa@gmail.com",
    guestPhone: "+234 708 662 1190",
    summary: "Guest violated booking rules.",
    guestReport: "Host reports the guest brought additional unauthorized guests into the space.",
    evidence: "No files uploaded.",
    reliabilityScore: 4.1,
    completedBookings: 16,
    previousDisputes: 3,
    previousCancellations: 2,
  },
  {
    id: "DSP-2026-005",
    raisedBy: "host",
    submittedDate: "June 26, 2026",
    bookingId: "BK-78450",
    date: "June 26, 2026",
    time: "09:00–10:00",
    duration: "1 hour",
    total: "₦15,000",
    workspace: "Hub One Workspace",
    location: "Lekki, Lagos",
    workspaceImg: "/src/Images/booking_img_1.jpg",
    host: "Daniel Okafor",
    hostEmail: "DanielO@gmail.com",
    hostPhone: "+234 902 860 3195",
    guestName: "Chidinma Eze",
    guestEmail: "chidinma.eze@gmail.com",
    guestPhone: "+234 812 774 3390",
    summary: "Guest requested a refund after poor internet service.",
    guestReport: "The internet kept disconnecting throughout the session, making it unusable for my meeting.",
    evidence: "No files uploaded.",
    reliabilityScore: 4.3,
    completedBookings: 22,
    previousDisputes: 1,
    previousCancellations: 1,
  },
];

const queueView = document.getElementById("queueView");
const detailView = document.getElementById("detailView");
const queueRowsEl = document.getElementById("queueRows");
const openCountPill = document.getElementById("openCountPill");
const queueFootnote = document.getElementById("queueFootnote");
const moderationBadge = document.getElementById("moderationBadge");

function renderQueue() {
  queueRowsEl.innerHTML = "";

  disputes.forEach((dispute) => {
    queueRowsEl.appendChild(renderQueueRow(dispute));
  });

  openCountPill.textContent = `${disputes.length} Open Disputes`;
  queueFootnote.textContent = `Showing 1–${disputes.length} of ${disputes.length} open disputes`;
  moderationBadge.textContent = disputes.length;
}

function renderQueueRow(dispute) {
  const row = document.createElement("div");
  row.className = "queue_row";
  row.dataset.id = dispute.id;

  // .row_field_label spans below are only visible on mobile (hidden
  // on desktop via CSS) - they're what turns each grid cell into a
  // labeled line on the stacked mobile card, e.g. "Booking Details"
  // above the date/time, since there's no column header row there
  row.innerHTML = `
    <div class="dispute_id_cell">
      <span class="row_field_label">Dispute ID</span>
      <p class="dispute_id">${dispute.id}</p>
      <span class="raised_by_badge ${dispute.raisedBy === "host" ? "by_host" : ""}">
        Raised by ${dispute.raisedBy === "host" ? "Host" : "Guest"}
      </span>
    </div>

    <div class="booking_cell">
      <span class="row_field_label">Booking Details</span>
      <p><a class="booking_id_link" href="#">Booking ID: ${dispute.bookingId}</a></p>
      <p class="booking_meta"><i class="ph ph-calendar" aria-hidden="true"></i>Date: ${dispute.date}</p>
      <p class="booking_meta"><i class="ph ph-clock" aria-hidden="true"></i>Time: ${dispute.time}</p>
      <p class="booking_meta"><i class="ph-fill ph-currency-ngn" aria-hidden="true"></i>Total: ${dispute.total}</p>
    </div>

    <div class="listing_cell">
      <img class="listing_thumb" src="${dispute.workspaceImg}" alt="${dispute.workspace}" />
      <div>
        <span class="row_field_label">Listing & Host</span>
        <p class="listing_name">${dispute.workspace}</p>
        <p class="listing_loc">${dispute.location}</p>
        <p class="listing_host">Host: ${dispute.host}</p>
      </div>
    </div>

    <div class="summary_cell">
      <span class="row_field_label">Dispute Summary</span>
      <p>${dispute.summary}</p>
    </div>

    <div class="reliability_cell">
      <span class="row_field_label">Reliability History</span>
      <p>Reliability Score: <span class="reliability_score">${dispute.reliabilityScore} / 5</span></p>
      <p class="score_note">Completed Bookings: ${dispute.completedBookings}</p>
      <p class="score_note">Previous Disputes: ${dispute.previousDisputes}</p>
      <p class="score_note">Previous Cancellations: ${dispute.previousCancellations}</p>
    </div>

    <div class="action_cell">
      <button type="button" class="view_details_btn">View Details</button>
      <button type="button" class="dismiss_btn">Dismiss</button>
    </div>
  `;

  row.querySelector(".view_details_btn").onclick = () => showDetail(dispute.id);
  row.querySelector(".dismiss_btn").onclick = () => dismissDispute(dispute.id);

  return row;
}

function dismissDispute(id) {
  // just removes it from the mock list for now - once there's a real
  // moderation endpoint this is where the "dismiss" API call goes
  disputes = disputes.filter((d) => d.id !== id);
  renderQueue();
}

function showDetail(id) {
  const dispute = disputes.find((d) => d.id === id);
  if (!dispute) return;

  document.getElementById("detailDisputeId").textContent = `${dispute.id}`;

  const raisedByEl = document.getElementById("detailRaisedBy");
  raisedByEl.textContent = `Raised by ${dispute.raisedBy === "host" ? "Host" : "Guest"}`;
  raisedByEl.className = `raised_by_badge ${dispute.raisedBy === "host" ? "by_host" : ""}`;

  document.getElementById("detailSubmittedDate").textContent = dispute.submittedDate;

  document.getElementById("detailBookingId").textContent = dispute.bookingId;
  document.getElementById("detailDate").textContent = dispute.date;
  document.getElementById("detailTime").textContent = dispute.time;
  document.getElementById("detailDuration").textContent = dispute.duration;
  document.getElementById("detailTotal").textContent = dispute.total;

  document.getElementById("detailGuestName").textContent = dispute.guestName;
  document.getElementById("detailGuestEmail").textContent = dispute.guestEmail;
  document.getElementById("detailGuestPhone").textContent = dispute.guestPhone;

  document.getElementById("detailWorkspace").textContent = dispute.workspace;
  document.getElementById("detailLocation").textContent = dispute.location;
  document.getElementById("detailHost").textContent = dispute.host;
  document.getElementById("detailHostEmail").textContent = dispute.hostEmail;
  document.getElementById("detailHostPhone").textContent = dispute.hostPhone;

  document.getElementById("detailReason").textContent = dispute.summary;
  document.getElementById("detailGuestReport").textContent = `"${dispute.guestReport}"`;
  document.getElementById("detailEvidence").textContent = dispute.evidence;

  document.getElementById("detailScore").textContent = `${dispute.reliabilityScore} / 5`;
  document.getElementById("detailCompleted").textContent = dispute.completedBookings;
  document.getElementById("detailPrevDisputes").textContent = dispute.previousDisputes;
  document.getElementById("detailPrevCancellations").textContent = dispute.previousCancellations;

  // Refund/Penalty are wired here (not once at page load) so they
  // always act on whichever dispute is currently open, without
  // needing to track a separate "current dispute id" variable
  document.getElementById("refundBtn").onclick = () => resolveDispute(dispute.id);
  document.getElementById("penaltyBtn").onclick = () => resolveDispute(dispute.id);

  queueView.hidden = true;
  detailView.hidden = false;
}

function resolveDispute(id) {
  // mock only - no refund/penalty API to call yet. just closes the
  // dispute out of the queue and goes back, same as Dismiss
  disputes = disputes.filter((d) => d.id !== id);
  renderQueue();
  showQueue();
}

function showQueue() {
  detailView.hidden = true;
  queueView.hidden = false;
}

document.getElementById("backToQueue").onclick = (e) => {
  e.preventDefault();
  showQueue();
};

renderQueue();
