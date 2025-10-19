// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const App = {
    state: {
        students: {},
        classes: [],
        history: [],
        currentClass: '7A',
        editingStudentId: null,
        correctionSession: null,
        studentDetail: null
    },
    db: null,
    auth: null,
    userId: null,
    appId: typeof __app_id !== 'undefined' ? __app_id : 'default-app-id',
    studentDataUnsubscribe: null,
    historyUnsubscribe: null,

    async init() {
        this.showLoading(true, "Inisialisasi aplikasi...");
        this.generateClasses();
        this.registerEventListeners();

        try {
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
             if (Object.keys(firebaseConfig).length === 0) {
                console.warn("Firebase config not found. Using placeholder data. THIS WILL NOT PERSIST DATA.");
                this.showInfoModal('Mode Demo', 'Konfigurasi database tidak ditemukan. Aplikasi berjalan dalam mode demo, data tidak akan tersimpan.');
                this.loadData();
                this.loadHistory();
                this.populateClassSelects();
                this.renderStudentTable();
                this.renderHistoryTable();
                this.showTab('tab-manajemen');
                this.showLoading(false);
                return;
            }

            const app = initializeApp(firebaseConfig);
            this.db = getFirestore(app);
            this.auth = getAuth(app);

            onAuthStateChanged(this.auth, async (user) => {
                if (user) {
                    this.userId = user.uid;
                    document.getElementById('userIdDisplay').textContent = this.userId;
                    document.getElementById('userInfo').classList.remove('hidden');
                    this.showLoading(true, "Memuat data...");
                    this.setupListeners();
                } else {
                     try {
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            await signInWithCustomToken(this.auth, __initial_auth_token);
                        } else {
                            await signInAnonymously(this.auth);
                        }
                    } catch (error) {
                        console.error("Authentication error:", error);
                        this.showInfoModal('Error', 'Gagal melakukan autentikasi. Beberapa fitur mungkin tidak berfungsi.');
                        this.showLoading(false);
                    }
                }
            });
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            this.showInfoModal('Initialization Error', 'Gagal memuat koneksi ke database. Silakan refresh halaman.');
            this.showLoading(false);
        }
    },

    setupListeners() {
        if (this.studentDataUnsubscribe) this.studentDataUnsubscribe();
        if (this.historyUnsubscribe) this.historyUnsubscribe();

        const studentDocRef = doc(this.db, `artifacts/${this.appId}/users/${this.userId}/students/studentData`);
        this.studentDataUnsubscribe = onSnapshot(studentDocRef, (docSnap) => {
            if (docSnap.exists()) {
                this.state.students = docSnap.data().students || {};
            } else {
                this.state.students = {};
                this.state.classes.forEach(c => this.state.students[c] = []);
            }
            this.populateClassSelects();
            this.renderStudentTable();
            if (document.getElementById('loadingOverlay').style.display !== 'none') {
                this.showTab('tab-manajemen');
            }
            this.showLoading(false);
        }, (error) => {
            console.error("Error listening to student data:", error);
            this.showLoading(false);
        });

        const historyCollRef = collection(this.db, `artifacts/${this.appId}/users/${this.userId}/history`);
        this.historyUnsubscribe = onSnapshot(query(historyCollRef), (querySnapshot) => {
            const history = [];
            querySnapshot.forEach((doc) => history.push({ ...doc.data(), id: doc.id }));
            this.state.history = history.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            this.renderHistoryTable();
        }, (error) => console.error("Error listening to history data:", error));
    },

    // ... sisa kode JavaScript lainnya, persis seperti yang ada di dalam tag <script> ...
    // ... hingga baris terakhir: document.addEventListener('DOMContentLoaded', () => App.init());

};

document.addEventListener('DOMContentLoaded', () => App.init());