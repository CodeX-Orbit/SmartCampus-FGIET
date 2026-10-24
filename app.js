// SmartCampus Pro — Firebase-backed starter application.
// Configure Firebase in firebase-config.js before running this app.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, setDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const $ = (id) => document.getElementById(id);
const state = { user: null, profile: null, notices: [], events: [], reports: [], saved: new Set(), authMode: "login", selectedPortal: "student", currentView: "dashboard", calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1) };

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function niceDate(value) {
  if (!value) return "Date not set";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "Date not set" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function shortDate(value) {
  if (!value) return { day: "—", month: "TBD" };
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? { day: "—", month: "TBD" } : { day: d.getDate(), month: d.toLocaleDateString("en-IN", { month: "short" }) };
}
function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  window.clearTimeout(toast.timer); toast.timer = window.setTimeout(() => el.classList.remove("show"), 2800);
}
function showAuthMessage(message, isError = false) {
  $("authMessage").textContent = message;
  $("authMessage").style.color = isError ? "#c54545" : "var(--primary)";
}
function setAuthMode(mode) {
  state.authMode = mode;
  $("loginTab").classList.toggle("active", mode === "login");
  $("signupTab").classList.toggle("active", mode === "signup");
  $("authName").classList.toggle("hidden", mode !== "signup");
  $("nameLabel").classList.toggle("hidden", mode !== "signup");
  $("signupAcademicFields").classList.toggle("hidden", mode !== "signup");
  $("authDepartment").required = mode === "signup";
  $("authYear").required = mode === "signup";
  $("authName").required = mode === "signup";
  $("authPassword").autocomplete = mode === "signup" ? "new-password" : "current-password";
  $("authSubmit").textContent = mode === "signup" ? "Create student account" : "Sign in";
  showAuthMessage("");
}
$("loginTab").addEventListener("click", () => setAuthMode("login"));
$("signupTab").addEventListener("click", () => {
  if (state.selectedPortal === "admin") { showAuthMessage("Admin accounts cannot be created from this page. Ask the project owner to authorize an admin account.", true); return; }
  setAuthMode("signup");
});
function choosePortal(portal) {
  state.selectedPortal = portal;
  $("studentPortalBtn").classList.toggle("active", portal === "student");
  $("adminPortalBtn").classList.toggle("active", portal === "admin");
  $("portalHint").textContent = portal === "admin"
    ? "Admin sign-in · Only pre-authorized admin accounts can continue."
    : "Student sign-in · New accounts are created as students.";
  $("signupTab").classList.toggle("hidden", portal === "admin");
  if (portal === "admin" && state.authMode === "signup") setAuthMode("login");
  $("authSubmit").textContent = portal === "admin" ? "Sign in to Admin Portal" : (state.authMode === "signup" ? "Create student account" : "Sign in to Student Portal");
  showAuthMessage("");
}
$("studentPortalBtn").addEventListener("click", () => choosePortal("student"));
$("adminPortalBtn").addEventListener("click", () => choosePortal("admin"));

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const name = $("authName").value.trim();
  const department = $("authDepartment").value;
  const year = $("authYear").value;
  $("authSubmit").disabled = true;
  try {
    if (state.authMode === "signup") {
      if (name.length < 2) throw new Error("Please enter your full name.");
      if (!department || !year) throw new Error("Please select your department and current year.");
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      // A new account is always a student. Admin role must be granted securely in Firestore.
      await setDoc(doc(db, "users", credential.user.uid), {
        displayName: name, email, department, year, role: "student", createdAt: serverTimestamp()
      });
      showAuthMessage("Account created. Loading your campus...");
    } else {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const profileSnap = await getDoc(doc(db, "users", credential.user.uid));
      const role = profileSnap.exists() ? profileSnap.data().role : "student";
      if (state.selectedPortal === "admin" && role !== "admin") {
        await signOut(auth);
        throw new Error("This account is not authorized for the Admin Portal. Choose Student Portal or contact the project owner.");
      }
      if (state.selectedPortal === "student" && role === "admin") {
        await signOut(auth);
        throw new Error("This is an admin account. Please choose Admin Portal to sign in.");
      }
      showAuthMessage("Signed in successfully.");
    }
  } catch (error) {
    showAuthMessage(friendlyAuthError(error), true);
  } finally {
    $("authSubmit").disabled = false;
  }
});
function friendlyAuthError(error) {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "This email already has an account. Please sign in.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email or password is incorrect.";
  if (code.includes("weak-password")) return "Choose a password with at least 6 characters.";
  if (code.includes("invalid-email")) return "Please enter a valid email address.";
  if (code.includes("network-request-failed")) return "Network error. Check your internet connection.";
  return error?.message || "Something went wrong. Please try again.";
}

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  if (!user) {
    $("authScreen").classList.remove("hidden"); $("appScreen").classList.add("hidden");
    return;
  }
  try {
    const profileSnap = await getDoc(doc(db, "users", user.uid));
    state.profile = profileSnap.exists() ? profileSnap.data() : { displayName: user.displayName || "Student", role: "student" };
    if (!profileSnap.exists()) {
      await setDoc(doc(db, "users", user.uid), { displayName: user.displayName || "Student", email: user.email || "", role: "student", createdAt: serverTimestamp() });
    }
    $("authScreen").classList.add("hidden"); $("appScreen").classList.remove("hidden");
    $("userAvatar").textContent = (state.profile.displayName || user.email || "S").trim().charAt(0).toUpperCase();
    updateTodayLabel();
    $("adminNav").classList.toggle("hidden", state.profile.role !== "admin");
    await loadData();
  } catch (error) {
    console.error(error);
    toast("Could not load campus data. Check Firebase setup and rules.");
  }
});

$("logoutBtn").addEventListener("click", async () => {
  try { await signOut(auth); toast("Signed out."); } catch (e) { toast("Could not sign out."); }
});
$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("sc-theme", document.body.classList.contains("dark") ? "dark" : "light");
});
if (localStorage.getItem("sc-theme") === "dark") document.body.classList.add("dark");

document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));
function showView(view) {
  if (view === "admin" && state.profile?.role !== "admin") { toast("Admin access is required."); return; }
  state.currentView = view;
  document.querySelectorAll(".view").forEach(section => section.classList.add("hidden"));
  $(`${view}View`).classList.remove("hidden");
  document.querySelectorAll(".nav-link[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  const titles = { dashboard: `Welcome, ${(state.profile?.displayName || "Student").split(" ")[0]} 👋`, notices: "Notice board", calendar: "Events & deadlines", resources: "Campus resources", lostfound: "Lost & found", admin: "Admin workspace" };
  $("pageTitle").textContent = titles[view] || "SmartCampus";
  renderAll();
}

async function loadData() {
  try {
    const [noticeSnap, eventSnap, reportSnap, savedSnap] = await Promise.all([
      getDocs(query(collection(db, "notices"), orderBy("createdAt", "desc"))),
      getDocs(query(collection(db, "events"), orderBy("date", "asc"))),
      getDocs(query(collection(db, "lostFound"), orderBy("createdAt", "desc"))),
      getDocs(collection(db, "users", state.user.uid, "savedNotices"))
    ]);
    state.notices = noticeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.events = eventSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.reports = reportSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.saved = new Set(savedSnap.docs.map(d => d.id));
  } catch (error) {
    console.error("Firestore read error:", error);
    toast("Firebase data could not load. Check internet, Firestore setup, and published rules.");
    state.notices = []; state.events = []; state.reports = []; state.saved = new Set();
  }
  renderAll();
}
function renderAll() {
  renderStats(); renderDashboard(); renderNotices(); renderEvents(); renderMonthCalendar(); renderLostFound(); renderAdmin();
}
function updateTodayLabel() {
  const now = new Date();
  $("todayLabel").textContent = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  $("calendarTodayText").textContent = `Today is ${now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`;
}
function renderStats() {
  $("statNotices").textContent = state.notices.length;
  const today = localISODate(new Date());
  $("statEvents").textContent = state.events.filter(e => e.date >= today).length;
  $("statLost").textContent = state.reports.filter(r => r.status !== "Resolved").length;
  $("statSaved").textContent = state.saved.size;
}
function categoryClass(category) {
  const c = String(category || "").toLowerCase();
  return c === "events" ? "events" : c === "general" ? "general" : "";
}
function noticeCard(n) {
  const saved = state.saved.has(n.id);
  return `<article class="notice-card"><div class="card-top"><span class="category-pill ${categoryClass(n.category)}">${escapeHTML(n.category || "General")}</span><button class="save-btn ${saved ? "saved" : ""}" data-save="${escapeHTML(n.id)}" aria-label="${saved ? "Unsave" : "Save"} notice" title="${saved ? "Remove saved notice" : "Save notice"}">${saved ? "★" : "☆"}</button></div><h4>${escapeHTML(n.title)}</h4><p class="description">${escapeHTML(n.description)}</p><div class="card-footer"><span>${escapeHTML(n.date ? niceDate(n.date) : "Campus update")}</span><span>${escapeHTML(n.source || "FGIET SmartCampus")}</span></div></article>`;
}
function renderDashboard() {
  const latest = [...state.notices].slice(0, 3);
  $("dashboardNotices").innerHTML = latest.length ? latest.map(noticeCard).join("") : `<div class="empty-state">No notices published yet. ${state.profile?.role === "admin" ? "Use the Admin Panel to add one." : "Check again later."}</div>`;
  const today = localISODate(new Date());
  const upcoming = [...state.events].filter(e => e.date >= today).sort((a,b) => (a.date || "").localeCompare(b.date || "")).slice(0, 4);
  $("dashboardEvents").innerHTML = upcoming.length ? upcoming.map(eventRow).join("") : `<div class="empty-state">No upcoming events yet.</div>`;
}
function renderNotices() {
  if (!$("noticeResults")) return;
  const term = ($("noticeSearch").value || "").trim().toLowerCase();
  const category = $("noticeCategory").value;
  const savedFilter = $("noticeSavedFilter").value;
  const items = state.notices.filter(n => {
    const haystack = `${n.title || ""} ${n.description || ""} ${n.category || ""}`.toLowerCase();
    return haystack.includes(term) && (category === "all" || n.category === category) && (savedFilter !== "saved" || state.saved.has(n.id));
  });
  $("noticeResults").innerHTML = items.length ? items.map(noticeCard).join("") : `<div class="empty-state">No matching notices found. Try another search or filter.</div>`;
}
$("noticeSearch").addEventListener("input", renderNotices);
$("noticeCategory").addEventListener("change", renderNotices);
$("noticeSavedFilter").addEventListener("change", renderNotices);

document.addEventListener("click", async (event) => {
  const saveButton = event.target.closest("[data-save]");
  if (!saveButton || !state.user) return;
  const noticeId = saveButton.dataset.save;
  try {
    const ref = doc(db, "users", state.user.uid, "savedNotices", noticeId);
    if (state.saved.has(noticeId)) {
      await deleteDoc(ref); state.saved.delete(noticeId); toast("Removed from saved notices.");
    } else {
      await setDoc(ref, { savedAt: serverTimestamp() }); state.saved.add(noticeId); toast("Notice saved.");
    }
    renderAll();
  } catch (error) { console.error(error); toast("Could not save this notice. Check security rules."); }
});

function eventRow(e) {
  const date = shortDate(e.date);
  return `<article class="event-row"><div class="event-date"><b>${escapeHTML(date.day)}</b><small>${escapeHTML(date.month)}</small></div><div class="event-info"><h4>${escapeHTML(e.title)}</h4><p>${escapeHTML(e.location || "Location to be announced")} · ${escapeHTML(e.description || "")}</p></div><span class="event-tag">${escapeHTML(e.type || "Event")}</span></article>`;
}
function localISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function renderEvents() {
  const today = localISODate(new Date());
  const events = [...state.events].filter(e => e.date >= today).sort((a,b) => (a.date || "").localeCompare(b.date || ""));
  $("calendarEvents").innerHTML = events.length ? events.map(eventRow).join("") : `<div class="empty-state">No upcoming events or deadlines yet.</div>`;
}
function renderMonthCalendar() {
  const month = state.calendarMonth;
  if (!month || !$("monthCalendarGrid")) return;
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  $("calendarMonthLabel").textContent = month.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = localISODate(new Date());
  const eventDates = new Set(state.events.map(e => e.date).filter(Boolean));
  let html = "";
  for (let i = 0; i < firstWeekday; i++) html += `<span class="calendar-day outside" aria-hidden="true"></span>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const classes = ["calendar-day", date === today ? "is-today" : "", eventDates.has(date) ? "has-event" : ""].filter(Boolean).join(" ");
    const eventNames = state.events.filter(e => e.date === date).map(e => e.title).join(", ");
    html += `<span class="${classes}" title="${escapeHTML(eventNames || date)}">${day}${eventDates.has(date) ? '<i></i>' : ''}</span>`;
  }
  const totalCells = firstWeekday + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < trailing; i++) html += `<span class="calendar-day outside" aria-hidden="true"></span>`;
  $("monthCalendarGrid").innerHTML = html;
}
$("prevMonth").addEventListener("click", () => { state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1); renderMonthCalendar(); });
$("nextMonth").addEventListener("click", () => { state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1); renderMonthCalendar(); });
$("lostForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const report = {
    title: $("itemTitle").value.trim(), type: $("itemType").value, category: $("itemCategory").value,
    description: $("itemDescription").value.trim(), status: "Open",
    createdBy: state.user.uid, createdByName: state.profile?.displayName || "Student",
    createdAt: serverTimestamp()
  };
  if (!report.title || !report.description) { $("lostMessage").textContent = "Please complete all required fields."; return; }
  try {
    await addDoc(collection(db, "lostFound"), report);
    $("lostForm").reset(); $("lostMessage").textContent = "Your report has been submitted.";
    toast("Lost & found report submitted."); await loadData();
  } catch (error) { console.error(error); $("lostMessage").textContent = "Could not submit. Check Firestore rules."; }
});
$("lostSearch").addEventListener("input", renderLostFound);
function renderLostFound() {
  const term = ($("lostSearch").value || "").toLowerCase().trim();
  const reports = state.reports.filter(r => `${r.title || ""} ${r.category || ""} ${r.description || ""} ${r.type || ""}`.toLowerCase().includes(term));
  $("lostResults").innerHTML = reports.length ? reports.map(r => {
    const admin = state.profile?.role === "admin";
    const owner = r.createdBy === state.user?.uid;
    const canResolve = admin || owner;
    return `<article class="lost-card"><div class="lost-card-head"><h4>${escapeHTML(r.type || "Report")}: ${escapeHTML(r.title)}</h4><span class="status-pill ${r.status === "Resolved" ? "resolved" : ""}">${escapeHTML(r.status || "Open")}</span></div><p>${escapeHTML(r.category || "Other")} · ${escapeHTML(r.description)}</p><div class="card-footer"><span>Reported by ${escapeHTML(r.createdByName || "Student")}</span>${canResolve && r.status !== "Resolved" ? `<button class="mini-btn" data-resolve="${escapeHTML(r.id)}">Mark resolved</button>` : ""}</div></article>`;
  }).join("") : `<div class="empty-state">No reports found. Be the first to submit one.</div>`;
}
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-resolve]");
  if (!button) return;
  const report = state.reports.find(r => r.id === button.dataset.resolve);
  if (!report || (state.profile?.role !== "admin" && report.createdBy !== state.user?.uid)) return toast("You cannot update this report.");
  try { await updateDoc(doc(db, "lostFound", report.id), { status: "Resolved", resolvedAt: serverTimestamp() }); toast("Item marked resolved."); await loadData(); }
  catch (error) { console.error(error); toast("Could not update report."); }
});

function isAdmin() { return state.profile?.role === "admin"; }
function requireAdminMessage(target) {
  if (!isAdmin()) { target.textContent = "Admin permission is required for this action."; return false; }
  return true;
}
$("noticeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAdminMessage($("adminNoticeMessage"))) return;
  const id = $("editNoticeId").value;
  const data = { title: $("adminNoticeTitle").value.trim(), category: $("adminNoticeCategory").value, source: $("adminNoticeSource").value, description: $("adminNoticeDescription").value.trim(), date: $("adminNoticeDate").value || "", updatedAt: serverTimestamp() };
  try {
    if (id) await updateDoc(doc(db, "notices", id), data);
    else await addDoc(collection(db, "notices"), { ...data, createdBy: state.user.uid, createdAt: serverTimestamp() });
    resetNoticeForm(); $("adminNoticeMessage").textContent = id ? "Notice updated." : "Notice published."; toast(id ? "Notice updated." : "Notice published."); await loadData();
  } catch (error) { console.error(error); $("adminNoticeMessage").textContent = "Save failed. Check admin role and Firestore rules."; }
});
$("eventForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAdminMessage($("adminEventMessage"))) return;
  const id = $("editEventId").value;
  const data = { title: $("adminEventTitle").value.trim(), type: $("adminEventType").value, date: $("adminEventDate").value, location: $("adminEventLocation").value.trim(), description: $("adminEventDescription").value.trim(), updatedAt: serverTimestamp() };
  try {
    if (id) await updateDoc(doc(db, "events", id), data);
    else await addDoc(collection(db, "events"), { ...data, createdBy: state.user.uid, createdAt: serverTimestamp() });
    resetEventForm(); $("adminEventMessage").textContent = id ? "Event updated." : "Event added."; toast(id ? "Event updated." : "Event added."); await loadData();
  } catch (error) { console.error(error); $("adminEventMessage").textContent = "Save failed. Check admin role and Firestore rules."; }
});
function resetNoticeForm() {
  $("noticeForm").reset(); $("editNoticeId").value = ""; $("noticeFormTitle").textContent = "Publish a notice"; $("cancelNoticeEdit").classList.add("hidden");
}
function resetEventForm() {
  $("eventForm").reset(); $("editEventId").value = ""; $("eventFormTitle").textContent = "Add event or deadline"; $("cancelEventEdit").classList.add("hidden");
}
$("cancelNoticeEdit").addEventListener("click", resetNoticeForm);
$("cancelEventEdit").addEventListener("click", resetEventForm);
function renderAdmin() {
  if (!isAdmin()) return;
  const realNotices = state.notices;
  const realEvents = state.events;
  $("adminNoticeList").innerHTML = realNotices.length ? realNotices.map(n => `<div class="manage-row"><div><strong>${escapeHTML(n.title)}</strong><small>${escapeHTML(n.category || "General")} · ${escapeHTML(n.source || "Admin verified update")} · ${escapeHTML(n.date ? niceDate(n.date) : "No date")}</small></div><div class="manage-actions"><button class="mini-btn" data-edit-notice="${escapeHTML(n.id)}">Edit</button><button class="mini-btn danger" data-delete-notice="${escapeHTML(n.id)}">Delete</button></div></div>`).join("") : `<div class="empty-state">No notices yet.</div>`;
  $("adminEventList").innerHTML = realEvents.length ? realEvents.map(e => `<div class="manage-row"><div><strong>${escapeHTML(e.title)}</strong><small>${escapeHTML(e.type || "Event")} · ${escapeHTML(niceDate(e.date))}</small></div><div class="manage-actions"><button class="mini-btn" data-edit-event="${escapeHTML(e.id)}">Edit</button><button class="mini-btn danger" data-delete-event="${escapeHTML(e.id)}">Delete</button></div></div>`).join("") : `<div class="empty-state">No events yet.</div>`;
}
document.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target || !isAdmin()) return;
  const noticeEdit = target.dataset.editNotice;
  const eventEdit = target.dataset.editEvent;
  const noticeDelete = target.dataset.deleteNotice;
  const eventDelete = target.dataset.deleteEvent;
  try {
    if (noticeEdit) {
      const n = state.notices.find(x => x.id === noticeEdit); if (!n) return;
      $("editNoticeId").value = n.id; $("adminNoticeTitle").value = n.title || ""; $("adminNoticeCategory").value = n.category || "General"; $("adminNoticeSource").value = n.source || "Admin verified update"; $("adminNoticeDescription").value = n.description || ""; $("adminNoticeDate").value = n.date || ""; $("noticeFormTitle").textContent = "Edit notice"; $("cancelNoticeEdit").classList.remove("hidden"); showView("admin"); $("adminNoticeTitle").focus();
    } else if (eventEdit) {
      const e = state.events.find(x => x.id === eventEdit); if (!e) return;
      $("editEventId").value = e.id; $("adminEventTitle").value = e.title || ""; $("adminEventType").value = e.type || "Event"; $("adminEventDate").value = e.date || ""; $("adminEventLocation").value = e.location || ""; $("adminEventDescription").value = e.description || ""; $("eventFormTitle").textContent = "Edit event"; $("cancelEventEdit").classList.remove("hidden"); showView("admin"); $("adminEventTitle").focus();
    } else if (noticeDelete) {
      if (!confirm("Delete this notice? This cannot be undone.")) return;
      await deleteDoc(doc(db, "notices", noticeDelete)); toast("Notice deleted."); await loadData();
    } else if (eventDelete) {
      if (!confirm("Delete this event? This cannot be undone.")) return;
      await deleteDoc(doc(db, "events", eventDelete)); toast("Event deleted."); await loadData();
    }
  } catch (error) { console.error(error); toast("Action failed. Check your admin role and Firestore rules."); }
});
