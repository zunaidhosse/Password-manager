const CACHE_NAME = 'password-manager-v1';
// ক্যাশে করার জন্য প্রয়োজনীয় ফাইলগুলোর তালিকা
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js'
];

// সার্ভিস ওয়ার্কার ইনস্টল করা
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache opened');
                return cache.addAll(urlsToCache);
            })
    );
});

// নেটওয়ার্ক রিকুয়েস্ট ক্যাশ থেকে পরিবেশন করা
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // যদি ক্যাশে পাওয়া যায়, তবে ক্যাশ থেকে দেওয়া হবে
                if (response) {
                    return response;
                }
                // অন্যথায়, নেটওয়ার্ক থেকে আনা হবে
                return fetch(event.request);
            })
    );
});

// পুরনো ক্যাশ মুছে ফেলা
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});