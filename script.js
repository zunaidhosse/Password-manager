// --- Import Firebase modules ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
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
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const googleSignInBtn = document.getElementById('google-signin-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = {
    name: document.getElementById('user-name'),
    photo: document.getElementById('user-photo')
};
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


// --- Encryption & Decryption Functions ---
const encryptData = (text, secretKey) => {
    return CryptoJS.AES.encrypt(text, secretKey).toString();
};

const decryptData = (ciphertext, secretKey) => {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
};

// --- Authentication Logic ---
const handleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then(result => {
            console.log("Successfully signed in:", result.user);
        })
        .catch(error => {
            console.error("Sign in error:", error);
            alert("সাইন ইন করতে সমস্যা হয়েছে: " + error.message);
        });
};

const handleSignOut = () => {
    signOut(auth)
        .then(() => {
            console.log("Successfully signed out.");
        })
        .catch(error => {
            console.error("Sign out error:", error);
        });
};

// --- Auth State Observer ---
onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        userInfo.name.textContent = user.displayName;
        userInfo.photo.src = user.photoURL;

        fetchPasswords(user.uid);
    } else {
        currentUser = null;
        loginContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        passwordList.innerHTML = '<p>লগইন করে আপনার পাসওয়ার্ড দেখুন।</p>';
    }
});

// --- Firestore Database Logic ---
const savePassword = async (event) => {
    event.preventDefault();
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
            siteName: siteName,
            username: username,
            password: encryptedPassword,
            category: category,
            notes: notes,
            createdAt: serverTimestamp()
        });
        passwordForm.reset();
        console.log("Password saved successfully!");
    } catch (error) {
        console.error("Error saving password: ", error);
        alert("পাসওয়ার্ড সংরক্ষণ করতে সমস্যা হয়েছে।");
    }
};

const fetchPasswords = (uid) => {
    const passwordsCollection = collection(db, "passwords");
    const q = query(passwordsCollection, where("uid", "==", uid), orderBy("createdAt", "desc"));

    onSnapshot(q, (querySnapshot) => {
        if (loadingMessage) loadingMessage.classList.add('hidden');
        passwordList.innerHTML = ''; 

        if (querySnapshot.empty) {
            passwordList.innerHTML = '<p>এখনও কোনো পাসওয়ার্ড সংরক্ষণ করা হয়নি।</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            let decryptedPassword = "ডিক্রিপ্ট করা যায়নি";
            try {
                decryptedPassword = decryptData(data.password, uid);
            } catch (e) {
                console.error("Could not decrypt password for site:", data.siteName);
            }
            
            renderPasswordCard(data, decryptedPassword);
        });
    }, (error) => {
        console.error("Error fetching passwords:", error);
        alert("ডেটা আনতে সমস্যা হচ্ছে। আপনার Firestore Security Rules চেক করুন।");
    });
};

// --- UI Rendering ---
const renderPasswordCard = (data, decryptedPassword) => {
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

    const toggleBtn = card.querySelector('.toggle-visibility');
    const passInput = card.querySelector('.password-display input');
    toggleBtn.addEventListener('click', () => {
        if (passInput.type === 'password') {
            passInput.type = 'text';
            toggleBtn.innerHTML = `<span class="material-icons">visibility</span>`;
        } else {
            passInput.type = 'password';
            toggleBtn.innerHTML = `<span class="material-icons">visibility_off</span>`;
        }
    });

    const copyBtn = card.querySelector('.copy-password');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(decryptedPassword).then(() => {
            alert(`"${data.siteName}" এর পাসওয়ার্ড কপি করা হয়েছে!`);
        });
    });

    passwordList.appendChild(card);
};

// --- Password Generator ---
const generateStrongPassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(Math.floor(Math.random() * n));
    }
    passwordInput.value = password;
    passwordInput.type = 'text';
};

// --- Dark Mode ---
const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
};

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

// --- PWA Install Prompt ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPwaBtn.classList.remove('hidden');
});

const handlePwaInstall = () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the A2HS prompt');
            }
            deferredPrompt = null;
        });
        installPwaBtn.classList.add('hidden');
    }
};

// --- Register Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => console.log('Service Worker registered:', registration))
            .catch(error => console.log('Service Worker registration failed:', error));
    });
}


// --- Event Listeners ---
googleSignInBtn.addEventListener('click', handleSignIn);
logoutBtn.addEventListener('click', handleSignOut);
passwordForm.addEventListener('submit', savePassword);
generatePasswordBtn.addEventListener('click', generateStrongPassword);
darkModeToggle.addEventListener('click', toggleDarkMode);
installPwaBtn.addEventListener('click', handlePwaInstall);