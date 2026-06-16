// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  child, 
  update, 
  remove, 
  onValue, 
  push,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyALHFd8-PhTpNSn8ipHlLsQYeUjEiBDRMs",
  authDomain: "chat2-6bd92.firebaseapp.com",
  databaseURL: "https://chat2-6bd92-default-rtdb.firebaseio.com",
  projectId: "chat2-6bd92",
  storageBucket: "chat2-6bd92.appspot.com",
  appId: "1:1052210817036:web:80674c39836371f46487e4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Globals
const DB_ROOT = "bkrm";

/**
 * Cloudinary Upload Helper
 * @param {File} file 
 * @returns {Promise<string>}
 */
async function uploadImageToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "ml_default");

  try {
    const response = await fetch("https://api.cloudinary.com/v1_1/dlsiskxua/image/upload", {
      method: "POST",
      body: formData
    });
    if (!response.ok) {
      throw new Error("Failed to upload image");
    }
    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
}

/**
 * Toast notification popup system
 */
function showToast(message, type = "success") {
  // Find or create toast container
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-11/12 max-w-sm pointer-events-none";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `p-4 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 text-center flex items-center justify-between pointer-events-auto ${
    type === "success" 
      ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
      : type === "error"
      ? "bg-rose-50 text-rose-800 border-rose-200"
      : "bg-amber-50 text-amber-800 border-amber-200"
  }`;

  toast.innerHTML = `
    <span>${message}</span>
    <button class="ml-2 text-current opacity-75 hover:opacity-100 font-bold">&times;</button>
  `;

  // Close event
  toast.querySelector("button").onclick = () => {
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => toast.remove(), 300);
  };

  container.appendChild(toast);
  
  // Trigger entry animation
  requestAnimationFrame(() => {
    toast.classList.remove("opacity-0", "translate-y-2");
  });

  // Auto remove
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

/**
 * Show Loader Spinner
 */
function showLoader() {
  let loader = document.getElementById("global-loader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "global-loader";
    loader.className = "fixed inset-0 bg-slate-900/55 backdrop-blur-xs z-50 flex items-center justify-center transition-all duration-300 pointer-events-auto";
    loader.innerHTML = `
      <div class="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center gap-3">
        <svg class="animate-spin h-10 w-10 text-[#7d0000]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-sm font-semibold text-slate-700">Please wait...</span>
      </div>
    `;
    document.body.appendChild(loader);
  }
}

/**
 * Hide Loader Spinner
 */
function hideLoader() {
  const loader = document.getElementById("global-loader");
  if (loader) {
    loader.remove();
  }
}

/**
 * Validate Admin Session
 */
async function checkAdminSession() {
  const adminRef = ref(db, `${DB_ROOT}/sessions/admin`);
  const snapshot = await get(adminRef);
  
  if (!snapshot.exists()) {
    return false;
  }
  
  const session = snapshot.val();
  if (session && session.login === true) {
    return session;
  }
  return false;
}

/**
 * Validate User Session
 */
async function checkUserSession() {
  const localUserId = localStorage.getItem("bkrm_userId");
  const localUsername = localStorage.getItem("bkrm_username");
  const localName = localStorage.getItem("bkrm_name");

  if (!localUserId) {
    return false;
  }

  const sessionRef = ref(db, `${DB_ROOT}/sessions/${localUserId}`);
  const snapshot = await get(sessionRef);

  if (!snapshot.exists()) {
    return false;
  }

  const session = snapshot.val();
  if (session && session.login === true) {
    return {
      userId: localUserId,
      username: localUsername,
      name: localName,
      ...session
    };
  }
  return false;
}

/**
 * Admin Logout
 */
async function logoutAdmin() {
  showLoader();
  try {
    const adminRef = ref(db, `${DB_ROOT}/sessions/admin`);
    await remove(adminRef);
    window.location.href = "admin_login.html";
  } catch (error) {
    showToast("Error during logout", "error");
    console.error(error);
  } finally {
    hideLoader();
  }
}

/**
 * User Logout
 */
async function logoutUser() {
  showLoader();
  try {
    const localUserId = localStorage.getItem("bkrm_userId");
    if (localUserId) {
      const sessionRef = ref(db, `${DB_ROOT}/sessions/${localUserId}`);
      await remove(sessionRef);
    }
    localStorage.removeItem("bkrm_userId");
    localStorage.removeItem("bkrm_username");
    localStorage.removeItem("bkrm_name");
    window.location.href = "user_login.html";
  } catch (error) {
    showToast("Error during logout", "error");
    console.error(error);
  } finally {
    hideLoader();
  }
}

export {
  db,
  ref,
  set,
  get,
  child,
  update,
  remove,
  onValue,
  push,
  runTransaction,
  DB_ROOT,
  uploadImageToCloudinary,
  showToast,
  showLoader,
  hideLoader,
  checkAdminSession,
  checkUserSession,
  logoutAdmin,
  logoutUser
};
