/* ==========================================
   XOTT CORE v26.0 (Final Fix Settings)
   ========================================== */

const API_KEY = 'c3d325262a386fc19e9cb286c843c829';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const BACK_URL = 'https://image.tmdb.org/t/p/original';

// --- FILMIX ---
const FX = {
    token: localStorage.getItem('fx_token') || '',
    uid: localStorage.getItem('fx_uid') || generateUid(),
    
    get headers() { return { 'Authorization': `Bearer ${this.token}` }; },

    async initAuth() {
        try {
            const dev = `user_dev_apk=2.0.1&user_dev_id=${this.uid}&user_dev_name=XOTT&user_dev_os=Web&user_dev_vendor=FXAPI`;
            const res = await fetch(`https://corsproxy.io/?https://filmixapp.vip/api/v2/token_request?${dev}`);
            const data = await res.json();
            return (data.status === 'ok') ? { code: data.user_code, token: data.code } : null;
        } catch(e) { alert('Помилка Filmix API: ' + e.message); return null; }
    },

    async checkAuth(tempToken) {
        try {
            const dev = `user_dev_apk=2.0.1&user_dev_id=${this.uid}&user_dev_name=XOTT`;
            const res = await fetch(`https://corsproxy.io/?https://filmixapp.vip/api/v2/user_profile?${dev}&user_dev_token=${tempToken}`);
            const data = await res.json();
            if(data && data.user_data) {
                this.token = tempToken; localStorage.setItem('fx_token', tempToken); return true;
            }
        } catch(e) {}
        return false;
    }
};

function generateUid() {
    const uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    localStorage.setItem('fx_uid', uid); return uid;
}

// --- API ---
const Api = {
    async get(url) { try { return await (await fetch(`https://api.themoviedb.org/3/${url}&api_key=${API_KEY}&language=uk-UA`)).json(); } catch(e) { return null; } },
    async trending() { return await this.get('trending/movie/week?'); },
    async search(q) { return await this.get(`search/movie?query=${encodeURIComponent(q)}`); }
};

// --- RENDER ---
function render(data, containerId) {
    const con = document.getElementById(containerId); con.innerHTML = '';
    document.getElementById('home-loader').style.display = 'none';
    if(!data?.results) return;

    data.results.forEach(item => {
        if(!item.poster_path) return;
        let el = document.createElement('div');
        el.className = 'card';
        el.style.backgroundImage = `url('${IMG_URL + item.poster_path}')`;
        el.innerHTML = `<div class="card-rating">${item.vote_average.toFixed(1)}</div><div class="card-title">${item.title || item.name}</div>`;
        el.onclick = () => openFullView(item);
        con.appendChild(el);
    });
}

// --- FULL VIEW ---
function openFullView(data) {
    window.currentMovie = data;
    document.getElementById('full-title').innerText = data.title || data.name;
    document.getElementById('full-year').innerText = (data.release_date || '').substr(0,4);
    document.getElementById('full-rating').innerText = data.vote_average.toFixed(1);
    document.getElementById('full-descr').innerText = data.overview;
    document.getElementById('full-poster').style.backgroundImage = `url('${IMG_URL + data.poster_path}')`;
    if(data.backdrop_path) document.getElementById('full-bg').style.backgroundImage = `url('${BACK_URL + data.backdrop_path}')`;

    const fxBtn = document.getElementById('btn-filmix');
    if(FX.token) {
        fxBtn.style.display = 'flex';
        fxBtn.onclick = () => alert('Пошук на Filmix...'); // Тимчасово
    } else {
        fxBtn.style.display = 'none';
    }

    document.getElementById('full-view').classList.add('active');
    
    // Прив'язка кнопок
    document.getElementById('btn-play').onclick = () => playMovie();
    document.getElementById('btn-back').onclick = () => {
        document.getElementById('full-view').classList.remove('active');
    };
}

// --- PLAYER ---
function playMovie() {
    const url = `https://vidsrc.me/embed/movie?tmdb=${window.currentMovie.id}`;
    document.getElementById('video-frame').src = url;
    document.getElementById('player').classList.add('active');
}

// --- SETTINGS (AUTH) ---
async function openSettings() {
    console.log('Settings clicked'); // Для дебагу
    
    if(FX.token) {
        if(confirm('Ви авторизовані в Filmix. Вийти?')) {
            localStorage.removeItem('fx_token');
            FX.token = '';
            location.reload();
        }
        return;
    }
    
    const auth = await FX.initAuth();
    if(auth) {
        const modal = document.createElement('div');
        modal.style.position = 'fixed'; modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%'; modal.style.background = 'rgba(0,0,0,0.9)'; modal.style.zIndex = '9999'; modal.style.display = 'flex'; modal.style.flexDirection = 'column'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
        modal.innerHTML = `
            <div style="font-size:24px; margin-bottom:20px; color:#fff">Авторизація Filmix</div>
            <div style="font-size:16px; margin-bottom:10px; color:#aaa;">Введіть код на <b>filmix.tv/consoles</b>:</div>
            <div style="font-size:48px; font-weight:bold; color:#4b76fb; margin-bottom:30px; letter-spacing:5px">${auth.code}</div>
            <div id="cancel-btn" style="padding:10px 30px; background:#333; color:#fff; border-radius:5px; cursor:pointer">Скасувати</div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('cancel-btn').onclick = () => {
            modal.remove();
            clearInterval(window.authInterval);
        };
        
        window.authInterval = setInterval(async () => {
            if(await FX.checkAuth(auth.token)) {
                clearInterval(window.authInterval);
                modal.innerHTML = '<div style="font-size:32px; color:#4caf50;">Успішно!</div>';
                setTimeout(() => { modal.remove(); location.reload(); }, 1500);
            }
        }, 3000);
    }
}

// --- INIT (FIXED) ---
window.onload = async () => {
    // Clock
    setInterval(() => document.getElementById('clock').innerText = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), 1000);
    
    // Load Movies
    const data = await Api.trending();
    render(data, 'home-grid');

    // === BIND EVENTS (MANUAL) ===
    // Прив'язуємо події вручну, щоб точно працювало
    
    // Home Button
    document.querySelector('.sidebar .menu-item:nth-child(1)').onclick = () => {
        document.getElementById('screen-home').style.display = 'block';
        document.getElementById('screen-search').style.display = 'none';
    };

    // Search Button
    document.querySelector('.sidebar .menu-item:nth-child(2)').onclick = () => {
        document.getElementById('screen-home').style.display = 'none';
        document.getElementById('screen-search').style.display = 'block';
        document.getElementById('search-input').focus();
    };

    // Settings Button (Gear)
    const settingsBtn = document.querySelector('.sidebar .menu-item:nth-child(3)');
    if(settingsBtn) {
        settingsBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openSettings();
        };
    }
    
    // Search Input Logic
    document.getElementById('search-input').addEventListener('input', async (e) => {
        if(e.target.value.length > 2) {
            let d = await Api.search(e.target.value);
            render(d, 'search-grid');
        }
    });
};
