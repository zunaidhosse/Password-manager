// --- Firebase মডিউল ইম্পোর্ট ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// =========================================================================================
// !! গুরুত্বপূর্ণ !! আপনার Firebase প্রজেক্টের কনফিগারেশন কোড এখানে পেস্ট করুন !!
// =========================================================================================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // আপনার API কী এখানে বসান
    authDomain: "YOUR_AUTH_DOMAIN", // আপনার Auth Domain এখানে বসান
    projectId: "YOUR_PROJECT_ID", // আপনার Project ID এখানে বসান
    storageBucket: "YOUR_STORAGE_BUCKET", // আপনার Storage Bucket এখানে বসান
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // আপনার Messaging Sender ID এখানে বসান
    appId: "YOUR_APP_ID" // আপনার App ID এখানে বসান
};
// =========================================================================================

// --- Firebase চালু করা ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- গ্লোবাল ভ্যারিয়েবল ---
let currentUser = null;

// --- DOM এলিমেন্টের রেফারেন্স ---
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

// --- এনক্রিপশন ও ডিক্রিপশন ফাংশন ---
const encryptData = (text, secretKey) => {
    return CryptoJS.AES.encrypt(text, secretKey).toString();
};

const decryptData = (ciphertext, secretKey) => {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
};

// --- অথেনটিকেশন এর কার্যকারিতা ---
const handleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .catch(error => console.error("Sign in error:", error.message));
};

const handleSignOut = () => {
    signOut(auth).catch(error => console.error("Sign out error:", error.message));
};

// --- ব্যবহারকারীর লগইন স্টেট পর্যবেক্ষণ ---
onAuthStateChanged(auth, user => {
    if (user) {
        // ব্যবহারকারী লগইন করেছেন
        currentUser = user;
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        userInfo.name.textContent = user.displayName;
        userInfo.photo.src = user.photoURL;

        fetchPasswords(user.uid);
    } else {
        // ব্যবহারকারী লগ আউট করেছেন
        currentUser = null;
        loginContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        passwordList.innerHTML = '<p>আপনার সংরক্ষিত পাসওয়ার্ড দেখতে লগইন করুন।</p>';
    }
});

// --- Firestore ডেটাবেস এর কার্যকারিতা ---
const savePassword = async (event) => {
    event.preventDefault();
    if (!currentUser) return;

    const siteName = siteNameInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    if (!siteName || !username || !password) {
        alert("দয়া করে সাইটের নাম, ইউজারনেম এবং পাসওয়ার্ড পূরণ করুন।");
        return;
    }

    // সংরক্ষণের আগে পাসওয়ার্ড এনক্রিপ্ট করা
    const encryptedPassword = encryptData(password, currentUser.uid);

    try {
        await addDoc(collection(db, "passwords"), {
            uid: currentUser.uid,
            siteName: siteName,
            username: username,
            password: encryptedPassword,
            category: categoryInput.value,
            notes: notesInput.value.trim(),
            createdAt: serverTimestamp()
        });
        passwordForm.reset();
        passwordInput.type = 'password';
    } catch (error) {
        console.error("Error saving password: ", error);
        alert("পাসওয়ার্ড সংরক্ষণ করতে একটি সমস্যা হয়েছে।");
    }
};

const fetchPasswords = (uid) => {
    const passwordsCollection = collection(db, "passwords");
    const q = query(passwordsCollection, where("uid", "==", uid), orderBy("createdAt", "desc"));

    onSnapshot(q, (querySnapshot) => {
        if (loadingMessage) loadingMessage.classList.add('hidden');
        passwordList.innerHTML = ''; // আগের তালিকা মুছে ফেলা

        if (querySnapshot.empty) {
            passwordList.innerHTML = '<p>এখনও কোনো পাসওয়ার্ড সংরক্ষণ করা হয়নি। নতুন পাসওয়ার্ড যোগ করুন।</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            let decryptedPassword = "";
            try {
                // প্রদর্শনের জন্য পাসওয়ার্ড ডিক্রিপ্ট করা
                decryptedPassword = decryptData(data.password, uid);
            } catch (e) {
                console.error("Could not decrypt password for site:", data.siteName);
                decryptedPassword = "ডিক্রিপ্ট করা সম্ভব হয়নি";
            }
            renderPasswordCard(data, decryptedPassword);
        });
    });
};

// --- UI তে পাসওয়ার্ড কার্ড দেখানো ---
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
    passwordList.appendChild(card);

    // কার্ডের বাটনগুলোর জন্য ইভেন্ট লিসেনার
    card.querySelector('.toggle-visibility').addEventListener('click', (e) => {
        const passInput = e.currentTarget.closest('.password-display').querySelector('input');
        const icon = e.currentTarget.querySelector('.material-icons');
        if (passInput.type === 'password') {
            passInput.type = 'text';
            icon.textContent = 'visibility';
        } else {
            passInput.type = 'password';
            icon.textContent = 'visibility_off';
        }
    });

    card.querySelector('.copy-password').addEventListener('click', () => {
        navigator.clipboard.writeText(decryptedPassword).then(() => {
            alert(`'${data.siteName}' এর পাসওয়ার্ড কপি করা হয়েছে!`);
        });
    });
};

// --- শক্তিশালী পাসওয়ার্ড জেনারেটর ---
const generateStrongPassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let newPassword = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        newPassword += charset.charAt(Math.floor(Math.random() * n));
    }
    passwordInput.value = newPassword;
    passwordInput.type = 'text';
};

// --- ডার্ক মোড ---
const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
};

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

// --- PWA ইনস্টল করার অপশন ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPwaBtn.classList.remove('hidden');
});

const handlePwaInstall = () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        installPwaBtn.classList.add('hidden');
        deferredPrompt.userChoice.then((choiceResult) => {
            deferredPrompt = null;
        });
    }
};

// --- সার্ভিস ওয়ার্কার রেজিস্টার করা ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker registered.'))
            .catch(err => console.log('Service Worker registration failed: ', err));
    });
}

// --- সব ইভেন্ট লিসেনার যুক্ত করা ---
googleSignInBtn.addEventListener('click', handleSignIn);
logoutBtn.addEventListener('click', handleSignOut);
passwordForm.addEventListener('submit', savePassword);
generatePasswordBtn.addEventListener('click', generateStrongPassword);
darkModeToggle.addEventListener('click', toggleDarkMode);
installPwaBtn.addEventListener('click', handlePwaInstall);