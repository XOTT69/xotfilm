/* ==========================================
   XOTT CORE v25.0 (Fixed Nav & Filmix)
   ========================================== */

const API_KEY = 'c3d325262a386fc19e9cb286c843c829';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const BACK_URL = 'https://image.tmdb.org/t/p/original';

// --- FILMIX LOGIC ---
const FX = {
    token: localStorage.getItem('fx_token') || '',
    uid: localStorage.getItem('fx_uid') || generateUid(),
    
    get headers() { return { 'Authorization': `Bearer ${this.token}` }; },

    async initAuth() {
        const dev = `user_dev_apk=2.0.1&user_dev_id=${this.uid}&user_dev_name=XOTT&user_dev_os=Web&user_dev_vendor=FXAPI`;
        const res = await fetch(`https://corsproxy.io/?https://filmixapp.vip/api/v2/token_request?${dev}`);
        const data = await res.json();
        return (data.status === 'ok') ? { code: data.user_code, token: data.code } : null;
    },

    async checkAuth(tempToken) {
        const dev = `user_dev_apk=2.0.1&user_dev_id=${this.uid}&user_dev_name=XOTT`;
        const res = await fetch(`https://corsproxy.io/?https://filmixapp.vip/api/v2/user_profile?${dev}&user_dev_token=${tempToken}`);
        const data = await res.json();
        if(data && data.user_data) {
            this.token = tempToken; localStorage.setItem('fx_token', tempToken); return true;
        }
        return false;
    },
    
    async search(title, year) {
        if(!this.token) return null;
        try {
            const res = await fetch(`https://corsproxy.io/?https://filmixapp.vip/api/v2/search?story=${encodeURIComponent(title)}`, { headers: this.headers });
            const data = await res.json();
            return data.find(i => i.year == year) || data[0];
        } catch(e) { return null; }
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

// --- UI LOGIC ---
function switchTab(tab) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById('screen-' + tab).style.display = 'block';
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active-tab'));
    event.currentTarget.classList.add('active-tab');

    nav.target = (tab === 'home') ? 'home' : 'search';
    nav.scan();
}

function openFullView(data) {
    window.currentMovie = data;
    document.getElementById('full-title').innerText = data.title || data.name;
    document.getElementById('full-year').innerText = (data.release_date || '').substr(0,4);
    document.getElementById('full-rating').innerText = data.vote_average.toFixed(1);
    document.getElementById('full-descr').innerText = data.overview;
    document.getElementById('full-poster').style.backgroundImage = `url('${IMG_URL + data.poster_path}')`;
    if(data.backdrop_path) document.getElementById('full-bg').style.backgroundImage = `url('${BACK_URL + data.backdrop_path}')`;

    // Buttons
    document.getElementById('btn-play').onclick = () => playMovie();
    document.getElementById('btn-back').onclick = () => closeFullView();

    const fxBtn = document.getElementById('btn-filmix');
    if(FX.token) {
        fxBtn.style.display = 'flex';
        fxBtn.onclick = () => playFilmix();
    } else {
        fxBtn.style.display = 'none';
    }

    document.getElementById('full-view').classList.add('active');
    nav.target = 'full';
    nav.items = [document.getElementById('btn-play'), fxBtn, document.getElementById('btn-back')].filter(b => b.style.display !== 'none');
    nav.idx = 0; nav.focus();
}

function closeFullView() {
    document.getElementById('full-view').classList.remove('active');
    nav.target = 'home'; nav.scan();
}

// --- PLAYER ---
function playMovie() {
    openPlayer(`https://vidsrc.me/embed/movie?tmdb=${window.currentMovie.id}`);
}

async function playFilmix() {
    const fxData = await FX.search(window.currentMovie.title, (window.currentMovie.release_date||'').substr(0,4));
    if(fxData && fxData.player_links?.movie?.[0]?.link) {
        openPlayer(fxData.player_links.movie[0].link);
    } else {
        alert('Не знайдено на Filmix');
    }
}

function openPlayer(url) {
    document.getElementById('video-frame').src = url;
    document.getElementById('player').classList.add('active');
    nav.target = 'player';
}

function closePlayer() {
    document.getElementById('player').classList.remove('active');
    document.getElementById('video-frame').src = '';
    nav.target = 'full'; nav.scan();
}

// --- SETTINGS (AUTH) ---
async function openSettings() {
    if(FX.token) { alert('Ви вже авторизовані в Filmix!'); return; }
    
    const auth = await FX.initAuth();
    if(auth) {
        const modal = document.createElement('div');
        modal.style.position = 'fixed'; modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%'; modal.style.background = 'rgba(0,0,0,0.9)'; modal.style.zIndex = '500'; modal.style.display = 'flex'; modal.style.flexDirection = 'column'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
        modal.innerHTML = `
            <div style="font-size:24px; margin-bottom:20px;">Авторизація Filmix</div>
            <div style="font-size:18px; margin-bottom:10px; color:#aaa;">Введіть код на <b style="color:#fff">filmix.tv/consoles</b>:</div>
            <div style="font-size:48px; font-weight:bold; color:#4b76fb; margin-bottom:30px;">${auth.code}</div>
            <div class="btn focus" onclick="this.parentElement.remove(); clearInterval(window.authInterval)">Скасувати</div>
        `;
        document.body.appendChild(modal);
        
        window.authInterval = setInterval(async () => {
            if(await FX.checkAuth(auth.token)) {
                clearInterval(window.authInterval);
                modal.innerHTML = '<div style="font-size:32px; color:#4caf50;">Успішно!</div>';
                setTimeout(() => { modal.remove(); location.reload(); }, 1500);
            }
        }, 3000);
    }
}

// --- NAVIGATION ---
const nav = {
    target: 'home', items: [], idx: 0,
    scan() {
        if(this.target==='home') this.items = Array.from(document.querySelectorAll('#screen-home .card'));
        if(this.target==='full') this.items = Array.from(document.querySelectorAll('.buttons-row .btn')).filter(b=>b.style.display!=='none');
        this.idx=0; this.focus();
    },
    focus() {
        document.querySelectorAll('.focus').forEach(e=>e.classList.remove('focus'));
        if(this.items[this.idx]) {
            this.items[this.idx].classList.add('focus');
            this.items[this.idx].scrollIntoView({behavior:'smooth', block:'center'});
        }
    },
    move(dir) {
        if(!this.items.length) return;
        const cols = (this.target==='home') ? Math.floor(document.querySelector('.cards-grid').offsetWidth / 180) : 1;
        if(dir==='Right') this.idx++; if(dir==='Left') this.idx--;
        if(dir==='Down') this.idx+=cols; if(dir==='Up') this.idx-=cols;
        if(this.idx<0)this.idx=0; if(this.idx>=this.items.length)this.idx=this.items.length-1;
        this.focus();
    },
    enter() { if(this.items[this.idx]) this.items[this.idx].click(); }
};

window.onload = async () => {
    setInterval(() => document.getElementById('clock').innerText = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), 1000);
    const data = await Api.trending(); render(data, 'home-grid'); nav.scan();
    
    // Search
    document.getElementById('search-input').addEventListener('input', async (e) => {
        if(e.target.value.length > 2) {
            let d = await Api.search(e.target.value);
            render(d, 'search-grid');
            nav.items = Array.from(document.querySelectorAll('#screen-search .card'));
        }
    });

    document.addEventListener('keydown', e => {
        if(e.code.startsWith('Arrow')) nav.move(e.code.replace('Arrow',''));
        if(e.code==='Enter') nav.enter();
        if(e.code==='Backspace'||e.code==='Escape') {
            if(nav.target==='player') closePlayer();
            else if(nav.target==='full') closeFullView();
        }
    });
};
