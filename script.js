// --- Import Firebase modules ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- আপনার দেওয়া Firebase প্রজেক্টের কনফিগারেশন ---
const firebaseConfig = {
    apiKey: "AIzaSyDEfU60XnxHqPbjV90L4Fz10mFfM7KIK9k",
    authDomain: "password-3dc71.firebaseapp.com",
    projectId: "password-3dc71",
    storageBucket: "password-3dc71.firebasestorage.app",
    messagingSenderId: "783232884163",
    appId: "1:783232884163:web:696b6815d8b445ec767176"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global Variables ---
let currentUser = null;

// --- DOM Element References ---
const authContainer = document.getElementById('auth-container');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

const appContainer = document.getElementById('app-container');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

const passwordForm = document.getElementById('password-form');
const siteNameInput = document.getElementById('site-name');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const categoryInput = document.getElementById('category');
const notesInput = document.getElementById('notes');
const generatePasswordBtn = document.getElementById('generate-password-btn');
const passwordList = document.getElementById('password-list');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const installPwaBtn = document.getElementById('install-pwa-btn');
const loadingMessage = document.getElementById('loading-message');

// --- Form Toggling ---
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.classList.add('hidden');
    registerView.classList.remove('hidden');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerView.classList.add('hidden');
    loginView.classList.remove('hidden');
});

// --- Authentication Logic ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert("নিবন্ধন করতে সমস্যা হয়েছে: " + error.message);
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert("লগইন করতে সমস্যা হয়েছে: " + error.message);
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// --- Auth State Observer ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        userEmailSpan.textContent = user.email;
        fetchPasswords(user.uid);
    } else {
        currentUser = null;
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        passwordList.innerHTML = '';
    }
});

// --- Encryption & Decryption Functions ---
const encryptData = (text, secretKey) => CryptoJS.AES.encrypt(text, secretKey).toString();
const decryptData = (ciphertext, secretKey) => CryptoJS.AES.decrypt(ciphertext, secretKey).toString(CryptoJS.enc.Utf8);


// --- Firestore Database Logic ---
passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const siteName = siteNameInput.value;
    const username = usernameInput.value;
    const password = passwordInput.value;
    const category = categoryInput.value;
    const notes = notesInput.value;

    if (!siteName || !username || !password) {
        alert("দয়া করে প্রয়োজনীয় সব ফিল্ড পূরণ করুন।");
        return;
    }
    const encryptedPassword = encryptData(password, currentUser.uid);

    try {
        await addDoc(collection(db, "passwords"), {
            uid: currentUser.uid,
            siteName, username, password: encryptedPassword, category, notes,
            createdAt: serverTimestamp()
        });
        passwordForm.reset();
    } catch (error) {
        console.error("Error saving password: ", error);
        alert("পাসওয়ার্ড সংরক্ষণ করতে সমস্যা হয়েছে।");
    }
});

const fetchPasswords = (uid) => {
    const q = query(collection(db, "passwords"), where("uid", "==", uid), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        if (loadingMessage) loadingMessage.classList.add('hidden');
        passwordList.innerHTML = '';
        if (snapshot.empty) {
            passwordList.innerHTML = '<p>এখনও কোনো পাসওয়ার্ড সংরক্ষণ করা হয়নি।</p>';
            return;
        }
        snapshot.forEach((doc) => {
            renderPasswordCard(doc.data());
        });
    });
};

// --- UI Rendering ---
const renderPasswordCard = (data) => {
    let decryptedPassword;
    try {
        decryptedPassword = decryptData(data.password, currentUser.uid);
    } catch (e) {
        decryptedPassword = "ডিক্রিপ্ট করা যায়নি";
        console.error("Decryption failed for:", data.siteName);
    }
    
    const card = document.createElement('div');
    card.className = 'password-card';
    card.innerHTML = `
        <span class="category-badge">${data.category}</span>
        <h4>${data.siteName}</h4>
        <p><strong>ইউজারনেম:</strong> ${data.username}</p>
        <div class="password-display">
            <input type="password" value="${decryptedPassword}" readonly>
            <div class="actions">
                <button class="toggle-visibility" title="Show/Hide Password"><span class="material-icons">visibility_off</span></button>
                <button class="copy-password" title="Copy Password"><span class="material-icons">content_copy</span></button>
            </div>
        </div>
        ${data.notes ? `<p><strong>নোট:</strong> ${data.notes}</p>` : ''}
    `;

    card.querySelector('.toggle-visibility').addEventListener('click', (e) => {
        const input = e.currentTarget.closest('.password-display').querySelector('input');
        const icon = e.currentTarget.querySelector('.material-icons');
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = 'visibility';
        } else {
            input.type = 'password';
            icon.textContent = 'visibility_off';
        }
    });

    card.querySelector('.copy-password').addEventListener('click', () => {
        navigator.clipboard.writeText(decryptedPassword).then(() => {
            alert(`"${data.siteName}" এর পাসওয়ার্ড কপি করা হয়েছে!`);
        });
    });

    passwordList.appendChild(card);
};

// --- Helper Functions ---
const generateStrongPassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let pass = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        pass += charset.charAt(Math.floor(Math.random() * n));
    }
    passwordInput.value = pass;
    passwordInput.type = 'text';
};
generatePasswordBtn.addEventListener('click', generateStrongPassword);

const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
};
darkModeToggle.addEventListener('click', toggleDarkMode);
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

// --- PWA Functionality ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPwaBtn.classList.remove('hidden');
});

installPwaBtn.addEventListener('click', () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
        installPwaBtn.classList.add('hidden');
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registered.', reg))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}
