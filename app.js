// ==== FIREBASE IMPORTS ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ==== FIREBASE CONFIG ====
const firebaseConfig = {
  apiKey: "AIzaSyDQuAvZHmJNf3DWh5ox5liPiuOpZHDWRHs",
  authDomain: "reimbursment-portal.firebaseapp.com",
  projectId: "reimbursment-portal",
  storageBucket: "reimbursment-portal.appspot.com",
  messagingSenderId: "715489874025",
  appId: "1:715489874025:web:c786cee0715c66d19c92f8"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==== EMAILJS ====
const EMAILJS_PUBLIC_KEY = "1FRUAJTvM8PuPj_DE";
const EMAILJS_SERVICE_ID = "service_d5zbdnp";
const TEMPLATE_SUBMISSION = "template_4756h8m";   // Notify approver
const TEMPLATE_DECISION = "template_49a6dfs";     // Approved/Rejected
emailjs.init(EMAILJS_PUBLIC_KEY);

// ==== SPLASH ====
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    document.getElementById("splash").classList.add("d-none");
    document.getElementById("loading").classList.remove("d-none");
    setTimeout(() => {
      document.getElementById("loading").classList.add("d-none");
      document.getElementById("main-content").classList.remove("d-none");
    }, 1500);
  }, 2000);
});

// ==== ADMINS ====
const adminIDs = ["ADMIN1", "ADMIN2"];
const adminEmail = "bspl.expenses@gmail.com"; // replace with your actual admin email

// ==== LOGIN ====
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const empID = document.getElementById("login-emp-id").value.trim();
  const password = document.getElementById("login-password").value;

  if (adminIDs.includes(empID)) {
    showDashboard("admin", empID);
    return;
  }

  const userSnap = await getDoc(doc(db, "users", empID));
  if (!userSnap.exists()) {
    Swal.fire("Error", "User not found", "error");
    return;
  }

  const user = userSnap.data();
  if (user.password !== password) {
    Swal.fire("Error", "Invalid password", "error");
    return;
  }

  showDashboard(user.role, empID);
});

// ==== SHOW DASHBOARD ====
async function showDashboard(role, empID) {
  document.getElementById("login-section").classList.add("d-none");
  document.getElementById("dashboard-section").classList.remove("d-none");

  if (role === "admin") {
    document.getElementById("admin-section").classList.remove("d-none");
    loadUsers();
    loadAdminExpenses();
  }
  if (role === "tl") {
    document.getElementById("tl-section").classList.remove("d-none");
    loadEmployeesForTL(empID);
    loadApprovers();
    loadTLExpenses(empID);
  }
  if (role === "employee") {
    document.getElementById("employee-section").classList.remove("d-none");
    loadEmployeeExpenses(empID);
  }
  if (role === "approver") {
    document.getElementById("approver-section").classList.remove("d-none");
    loadApproverExpenses();
  }
}

// ==== ADMIN CREATE USER ====
document.getElementById("create-user-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const empID = document.getElementById("new-emp-id").value.trim();
  const name = document.getElementById("new-name").value.trim();
  const email = document.getElementById("new-email").value.trim();
  const password = document.getElementById("new-password").value.trim();
  const role = document.getElementById("new-role").value;

  await setDoc(doc(db, "users", empID), { empID, name, email, password, role });
  Swal.fire("Success", "User Created!", "success");
  loadUsers();
});

// ==== LOAD USERS ====
async function loadUsers() {
  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = "";
  const q = await getDocs(collection(db, "users"));
  q.forEach((docSnap) => {
    const u = docSnap.data();
    tbody.innerHTML += `<tr><td>${u.empID}</td><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td></tr>`;
  });
}

// ==== LOAD EMPLOYEES FOR TL (INCLUDING SELF) ====
async function loadEmployeesForTL(tlID) {
  const select = document.getElementById("expense-employee-id");
  select.innerHTML = "<option value=''>Select Employee or Myself</option>";
  const q = await getDocs(collection(db, "users"));
  q.forEach((docSnap) => {
    const u = docSnap.data();
    if (u.role === "employee" || u.empID === tlID) {
      select.innerHTML += `<option value="${u.empID}">${u.name} (${u.empID})</option>`;
    }
  });
}

// ==== LOAD APPROVERS ====
async function loadApprovers() {
  const select = document.getElementById("approverSelect");
  select.innerHTML = "<option value=''>Select Approver</option>";
  const q = await getDocs(collection(db, "users"));
  q.forEach((docSnap) => {
    const u = docSnap.data();
    if (u.role === "approver") {
      select.innerHTML += `<option value="${u.email}">${u.name}</option>`;
    }
  });
}

// ==== TL SUBMIT EXPENSE ====
// ==== TL SUBMIT EXPENSE ====
document.getElementById("expense-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const empID = document.getElementById("expense-employee-id").value;
  const empName = document.getElementById("expense-employee-id").selectedOptions[0].text.split("(")[0].trim();

  // get TL email from users collection
  const tlSnap = await getDoc(doc(db, "users", empID));
  let tlEmail = "";
  if (tlSnap.exists()) {
    const tlData = tlSnap.data();
    if (tlData.role === "tl") {
      tlEmail = tlData.email;
    }
  }

  const expenseData = {
    empID,
    name: empName,
    category: document.getElementById("category").value,
    type: document.getElementById("expenseType").value,
    from: document.getElementById("fromDate").value,
    to: document.getElementById("toDate").value,
    place: document.getElementById("place").value,
    remarks: document.getElementById("remarks").value,
    amount: document.getElementById("amount").value,
    status: "Pending",
    approverEmail: document.getElementById("approverSelect").value,
    tlEmail: tlEmail,  // ✅ store TL’s email
    submittedBy: "TL",
    createdAt: Date.now()
  };

  const expID = empID + "-" + Date.now();
  await setDoc(doc(db, "expenses", expID), expenseData);
  Swal.fire("Success", "Expense Submitted!", "success");

  // Notify Approver
  emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_SUBMISSION, {
    to_email: expenseData.approverEmail,
    emp_id: expenseData.empID,
    name: expenseData.name,
    category: expenseData.category,
    amount: expenseData.amount
  });

  loadTLExpenses(empID);
});

// ==== SORT HELPER ====
function sortByDate(docs) {
  return docs.sort((a, b) => (b.data().createdAt || 0) - (a.data().createdAt || 0));
}

// ==== LOAD TL EXPENSES ====
async function loadTLExpenses(empID) {
  const tbody = document.getElementById("tl-expenses-table-body");
  tbody.innerHTML = "";
  let docs = [];
  const q = await getDocs(collection(db, "expenses"));
  q.forEach((docSnap) => docs.push(docSnap));
  sortByDate(docs).forEach((docSnap) => {
    const e = docSnap.data();
    if (e.empID === empID || e.submittedBy === "TL") {
      tbody.innerHTML += `<tr><td>${e.empID}</td><td>${e.name}</td><td>${e.category}</td><td>${e.type}</td><td>${e.from}</td><td>${e.to}</td><td>${e.place}</td><td>${e.amount}</td><td>${e.status}</td></tr>`;
    }
  });
}

// ==== LOAD EMPLOYEE EXPENSES ====
async function loadEmployeeExpenses(empID) {
  const tbody = document.getElementById("employee-expenses-table-body");
  tbody.innerHTML = "";
  let docs = [];
  const q = await getDocs(collection(db, "expenses"));
  q.forEach((docSnap) => docs.push(docSnap));
  sortByDate(docs).forEach((docSnap) => {
    const e = docSnap.data();
    if (e.empID === empID) {
      tbody.innerHTML += `<tr><td>${e.category}</td><td>${e.type}</td><td>${e.from}</td><td>${e.to}</td><td>${e.place}</td><td>${e.amount}</td><td>${e.status}</td></tr>`;
    }
  });
}

// ==== LOAD APPROVER EXPENSES ====
async function loadApproverExpenses() {
  const tbody = document.getElementById("approver-expenses-table-body");
  tbody.innerHTML = "";
  let docs = [];
  const q = await getDocs(collection(db, "expenses"));
  q.forEach((docSnap) => docs.push(docSnap));
  sortByDate(docs).forEach((docSnap) => {
    const e = docSnap.data();
    tbody.innerHTML += `<tr>
      <td>${e.empID}</td><td>${e.name}</td><td>${e.category}</td><td>${e.type}</td>
      <td>${e.from}</td><td>${e.to}</td><td>${e.place}</td><td>${e.amount}</td><td>${e.status}</td>
      <td>${e.status === "Pending" ? 
        `<button class="btn btn-success btn-sm me-1" onclick="approveExpense('${docSnap.id}', '${e.empID}', '${e.name}', '${e.approverEmail}')">Approve</button>
         <button class="btn btn-danger btn-sm" onclick="rejectExpense('${docSnap.id}', '${e.empID}', '${e.name}', '${e.approverEmail}')">Reject</button>` : ""}</td>
    </tr>`;
  });
}

// ==== APPROVE ====
// ==== APPROVE ====
window.approveExpense = async (expID, empID, name) => {
  await updateDoc(doc(db, "expenses", expID), { status: "Approved" });
  Swal.fire("Approved", "Expense Approved!", "success");

  // Get expense (to fetch TL email)
  const expSnap = await getDoc(doc(db, "expenses", expID));
  const expData = expSnap.exists() ? expSnap.data() : {};

  // Get employee email
  const empSnap = await getDoc(doc(db, "users", empID));
  const empEmail = empSnap.exists() ? empSnap.data().email : "";

  // ✅ Correct TL email (from expense data)
  const tlEmail = expData.tlEmail || "";

  // Notify Employee + TL + Admin
  emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_DECISION, {
    to_email: [empEmail, tlEmail, adminEmail].filter(Boolean).join(","),
    emp_id: empID,
    name: name,
    decision: "Approved"
  });

  loadApproverExpenses();
  loadAdminExpenses();
};

// ==== REJECT ====
window.rejectExpense = async (expID, empID, name) => {
  await updateDoc(doc(db, "expenses", expID), { status: "Rejected" });
  Swal.fire("Rejected", "Expense Rejected!", "warning");

  const expSnap = await getDoc(doc(db, "expenses", expID));
  const expData = expSnap.exists() ? expSnap.data() : {};

  const empSnap = await getDoc(doc(db, "users", empID));
  const empEmail = empSnap.exists() ? empSnap.data().email : "";

  // ✅ Correct TL email
  const tlEmail = expData.tlEmail || "";

  emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_DECISION, {
    to_email: [empEmail, tlEmail, adminEmail].filter(Boolean).join(","),
    emp_id: empID,
    name: name,
    decision: "Rejected"
  });

  loadApproverExpenses();
  loadAdminExpenses();
};


// ==== LOAD ADMIN ALL EXPENSES ====
async function loadAdminExpenses() {
  const tbody = document.getElementById("admin-expenses-table-body");
  tbody.innerHTML = "";
  let docs = [];
  const q = await getDocs(collection(db, "expenses"));
  q.forEach((docSnap) => docs.push(docSnap));
  sortByDate(docs).forEach((docSnap) => {
    const e = docSnap.data();
    tbody.innerHTML += `<tr>
      <td>${e.empID}</td><td>${e.name}</td><td>${e.category}</td><td>${e.type}</td>
      <td>${e.from}</td><td>${e.to}</td><td>${e.place}</td><td>${e.amount}</td><td>${e.status}</td>
      <td>${e.status === "Approved" ? 
        `<button class="btn btn-sm ${e.credited ? 'btn-success' : 'btn-warning'}" onclick="toggleCredited('${docSnap.id}', ${e.credited || false})">
          ${e.credited ? 'Credited' : 'Not Credited'}
        </button>` : "-"}</td>
    </tr>`;
  });
}

// ==== TOGGLE CREDITED ====
window.toggleCredited = async (expID, currentStatus) => {
  await updateDoc(doc(db, "expenses", expID), { credited: !currentStatus });
  loadAdminExpenses();
};
