// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDQuAvZHmJNf3DWh5ox5liPiuOpZHDWRHs",
  authDomain: "reimbursment-portal.firebaseapp.com",
  projectId: "reimbursment-portal",
  storageBucket: "reimbursment-portal.firebasestorage.app",
  messagingSenderId: "715489874025",
  appId: "1:715489874025:web:c786cee0715c66d19c92f8"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// EmailJS setup
const EMAILJS_PUBLIC_KEY = "1FRUAJTvM8PuPj_DE";
const EMAILJS_SERVICE_ID = "service_d5zbdnp";
const TEMPLATE_SUBMISSION = "template_4756h8m"; 
const TEMPLATE_DECISION = "template_49a6dfs";    
emailjs.init(EMAILJS_PUBLIC_KEY);

// Splash → login
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

// Admin IDs
const adminIDs = ["ADMIN1", "ADMIN2"];

// Login handler
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

// Show dashboard
async function showDashboard(role, empID) {
  document.getElementById("login-section").classList.add("d-none");
  document.getElementById("dashboard-section").classList.remove("d-none");

  if (role === "admin") {
    document.getElementById("admin-section").classList.remove("d-none");
    loadAdminExpenses();
  }
  if (role === "tl") {
    document.getElementById("tl-section").classList.remove("d-none");
    await loadEmployeesForTL();
    await loadApprovers();
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

// Load Employees + TL for selection
async function loadEmployeesForTL() {
  const select = document.getElementById("expense-employee-id");
  select.innerHTML = "<option value=''>Select Employee / TL</option>";
  const q = await getDocs(collection(db, "users"));
  q.forEach(docSnap => {
    const u = docSnap.data();
    if (["employee","tl"].includes(u.role)) {
      select.innerHTML += `<option value="${u.empID}">${u.name} (${u.empID})</option>`;
    }
  });
}

// Load Approvers
async function loadApprovers() {
  const select = document.getElementById("approverSelect");
  select.innerHTML = "<option value=''>Select Approver</option>";
  const q = await getDocs(collection(db, "users"));
  q.forEach(docSnap => {
    const u = docSnap.data();
    if (u.role === "approver") {
      select.innerHTML += `<option value="${u.email}">${u.name}</option>`;
    }
  });
}

// TL submit expense
document.getElementById("expense-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const empID = document.getElementById("expense-employee-id").value;
  const empName = document.getElementById("expense-employee-id").selectedOptions[0].text.split("(")[0].trim();

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
    submittedBy: document.getElementById("login-emp-id").value
  };

  const expID = empID + "-" + Date.now();
  await setDoc(doc(db, "expenses", expID), expenseData);
  Swal.fire("Success", "Expense Submitted!", "success");

  // Email to approver
  emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_SUBMISSION, {
    to_email: expenseData.approverEmail,
    from_name: "Expense Tracker",
    reply_to: "bspl.expenses@gmail.com",
    emp_id: expenseData.empID,
    name: expenseData.name,
    category: expenseData.category,
    amount: expenseData.amount
  });

  loadTLExpenses(expenseData.submittedBy);
});

// Load TL Expenses (All: Pending + Approved + Rejected)
async function loadTLExpenses(tlID) {
  const tbody = document.getElementById("tl-expenses-table-body");
  tbody.innerHTML = "";
  const q = await getDocs(collection(db, "expenses"));
  q.forEach(docSnap => {
    const e = docSnap.data();
    if (e.submittedBy === tlID || e.empID === tlID || e.submittedBy === tlID) {
      tbody.innerHTML += `<tr>
        <td>${e.empID}</td><td>${e.name}</td><td>${e.category}</td><td>${e.type}</td>
        <td>${e.from}</td><td>${e.to}</td><td>${e.place}</td>
        <td>${e.amount}</td><td>${e.status}</td>
      </tr>`;
    }
  });
}

// Load Employee Expenses
async function loadEmployeeExpenses(empID) {
  const tbody = document.getElementById("employee-expenses-table-body");
  tbody.innerHTML = "";
  const q = await getDocs(collection(db, "expenses"));
  q.forEach(docSnap => {
    const e = docSnap.data();
    if (e.empID === empID) {
      tbody.innerHTML += `<tr>
        <td>${e.category}</td><td>${e.type}</td><td>${e.from}</td>
        <td>${e.to}</td><td>${e.place}</td><td>${e.amount}</td>
        <td>${e.status}</td>
      </tr>`;
    }
  });
}

// Load Admin Expenses (Approved only)
async function loadAdminExpenses() {
  const tbody = document.getElementById("admin-expenses-table-body");
  tbody.innerHTML = "";
  const q = await getDocs(collection(db, "expenses"));
  q.forEach(docSnap => {
    const e = docSnap.data();
    if (e.status === "Approved") {
      const credited = e.credited ? "Credited" : `<button class="btn btn-success btn-sm" onclick="markCredited('${docSnap.id}')">Mark Credited</button>`;
      tbody.innerHTML += `<tr>
        <td>${e.empID}</td><td>${e.name}</td><td>${e.category}</td><td>${e.type}</td>
        <td>${e.from}</td><td>${e.to}</td><td>${e.place}</td><td>${e.amount}</td>
        <td>${credited}</td>
      </tr>`;
    }
  });
}

// Mark Credited
window.markCredited = async (expID) => {
  await setDoc(doc(db, "expenses", expID), { credited: true }, { merge: true });
  loadAdminExpenses();
}

// Load Approver Expenses
async function loadApproverExpenses() {
  const tbody = document.getElementById("approver-expenses-table-body");
  tbody.innerHTML = "";
  const q = await getDocs(collection(db, "expenses"));
  q.forEach(docSnap => {
    const e = docSnap.data();
    const actionBtns = e.status === "Pending" 
      ? `<button class="btn btn-success btn-sm me-1" onclick="approveExpense('${docSnap.id}', '${e.empID}', '${e.name}')">Approve</button>
         <button class="btn btn-danger btn-sm" onclick="rejectExpense('${docSnap.id}', '${e.empID}', '${e.name}')">Reject</button>` 
      : "";
    tbody.innerHTML += `<tr>
      <td>${e.empID}</td><td>${e.name}</td><td>${e.category}</td><td>${e.type}</td>
      <td>${e.from}</td><td>${e.to}</td><td>${e.place}</td><td>${e.amount}</td><td>${e.status}</td>
      <td>${actionBtns}</td>
    </tr>`;
  });
}

// Approve Expense
window.approveExpense = async (expID, empID, name) => {
  await setDoc(doc(db, "expenses", expID), { status: "Approved" }, { merge: true });
  Swal.fire("Approved", "Expense Approved!", "success");

  // Email notify
  emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_DECISION, {
    to_email: "bspl.expenses@gmail.com",
    from_name: "Expense Tracker",
    reply_to: "bspl.expenses@gmail.com",
    emp_id: empID,
    name: name,
    decision: "Approved"
  });

  loadApproverExpenses();
  loadAdminExpenses();
  loadTLExpenses(empID); // refresh TL dashboard too
};

// Reject Expense
window.rejectExpense = async (expID, empID, name) => {
  await setDoc(doc(db, "expenses", expID), { status: "Rejected" }, { merge: true });
  Swal.fire("Rejected", "Expense Rejected!", "warning");

  emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_DECISION, {
    to_email: "bspl.expenses@gmail.com",
    from_name: "Expense Tracker",
    reply_to: "bspl.expenses@gmail.com",
    emp_id: empID,
    name: name,
    decision: "Rejected"
  });

  loadApproverExpenses();
  loadTLExpenses(empID); // refresh TL dashboard too
};
