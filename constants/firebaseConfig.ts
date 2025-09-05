import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyC_hDnn9GGNWx4JD7R6RYmjzFvD9o2oEws',
  authDomain: 'muse-7b403.web.app',
  projectId: 'muse-7b403',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

export const app = initializeApp(firebaseConfig);
