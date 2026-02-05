// js/firebase-config.js

// Your specific Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB4aNtPh3OdpZqxis-ainOXa3djBVZeHM8",
    authDomain: "daveteklay23.firebaseapp.com",
    projectId: "daveteklay23",
    storageBucket: "daveteklay23.firebasestorage.app",
    messagingSenderId: "1079200881836",
    appId: "1:1079200881836:web:220d35768dcbed9b0e1309",
    measurementId: "G-63LQF1M4B5"
};

// Initialize Firebase using the Compat library
firebase.initializeApp(firebaseConfig);

// Initialize Analytics (Optional for web apps)
const analytics = firebase.analytics();

// Hooks for the rest of the app to use
const auth = firebase.auth();
const db = firebase.firestore();

// Performance & Reliability: Enable Offline Persistence
// This allows the steel shop owner to keep working even if the internet drops!
db.enablePersistence().catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required for persistence
        console.warn('Persistence not supported by this browser');
    }
});