/* ==========================================
   XOTT CORE v24.0 (Filmix Native Auth)
   ========================================== */

const API_KEY = 'c3d325262a386fc19e9cb286c843c829';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const BACK_URL = 'https://image.tmdb.org/t/p/original';

// --- FILMIX API (PORTED FROM PLUGIN) ---
const FX = {
    token: localStorage.getItem('fx_token') || '',
    uid: localStorage.getItem('fx_uid') || generateUid(),
    
    get headers() {
        return { 'Authorization': `Bearer ${this.token}` };
    },

    async initAuth() {
        // Крок 1: Запит коду
        const dev = `user_dev_apk=2.0.1&user_dev_id=${this.uid}&user_dev_name=XOTT&user_dev_os=Web&user_dev_vendor=FXAPI`;
        const res = await fetch(`https://corsproxy.io/?https://filmixapp.vip/api/v2/token_request?${dev}`);
        const data = await res.json();
        
        if(data.status === 'ok') {
            return { code: data.user_code, token: data.code };
        }
        return null;
    },

    async checkAuth(tempToken) {
        // Крок 2: Перевірка статусу
        const dev = `user_dev_apk=2.0.1&user_dev_id=${this.uid}&user_dev_name=XOTT`;
        const res = await fetch(`https://corsproxy.io/?https://filmixapp.vip/api/v2/user_profile?${dev}&user_dev_token=${tempToken}`);
        const data = await res.json();
        
        if(data && data.user_data) {
            this.token = tempToken;
            localStorage.setItem('fx_token', tempToken);
            return true;
        }
        return false;
    },
    
    async search(title, year) {
        if(!this.token) return null;
        try {
            const url = `https://corsproxy.io/?https://filmixapp.vip/api/v2/search?story=${encodeURIComponent(title)}`;
            const res = await fetch(url, { headers: this.headers });
            const data = await res.json();
            // Знаходимо точний збіг по року
            return data.find(i => i.year == year) || data[0];
        } catch(e) { return null; }
    },
    
    async getLink(id) {
        if(!this.token) return null;
        try {
            const res = await fetch(`https://corsproxy.io/?https://filmixapp.vip/api/v2/post/${id}`, { headers: this.headers });
            const data = await res.json();
            
            // Якщо є лінки
            if(data.player_links && data.player_links.movie) {
               // Беремо найкращу якість
               const links = data.player_links.movie[0].link; // Приклад структури
               return links; 
            }
            return null;
        } catch(e) { return null; }
    }
};

function generateUid() {
    const uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    localStorage.setItem('fx_uid', uid);
    return uid;
}

// --- STANDARD API ---
const Api = {
    async get(url) {
        try {
            let res = await fetch(`https://api.themoviedb.org/3/${url}&api_key=${API_KEY}&language=uk-UA`);
            return await res.json();
        } catch(e) { return null; }
    },
    async trending() { return await this.get('trending/movie/week?'); },
    async search(q) { return await this.get(`search/movie?query=${encodeURIComponent(q)}`); }
};

// --- RENDER ---
function render(data, containerId) {
    const con = document.getElementById(containerId);
    con.innerHTML = '';
    document.getElementById('home-loader').style.display = 'none';

    if(!data?.results) return;

    data.results.forEach(item => {
        if(!item.poster_path) return;
        let el = document.createElement('div');
        el.className = 'card menu-item';
        el.style.backgroundImage = `url('${IMG_URL + item.poster_path}')`;
        el.innerHTML = `
            <div class="card-rating">${item.vote_average.toFixed(1)}</div>
            <div class="card-info"><div class="card-title">${item.title || item.name}</div></div>
        `;
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

    // Кнопки
    document.getElementById('btn-play').onclick = () => playMovie();
    document.getElementById('btn-back').onclick = () => closeFullView();

    // Перевірка Filmix
    const fxBtn = document.getElementById('btn-filmix');
    if(FX.token) {
        fxBtn.style.display = 'flex';
        fxBtn.innerHTML = '<i class="fas fa-crown"></i> Filmix PRO';
        fxBtn.onclick = () => playFilmix();
    } else {
        fxBtn.style.display = 'none';
    }

    document.getElementById('full-view').classList.add('active');
    
    nav.target = 'full';
    nav.items = [document.getElementById('btn-play'), fxBtn, document.getElementById('btn-back')].filter(b => b.style.display !== 'none');
    nav.idx = 0;
    nav.focus();
}

function closeFullView() {
    document.getElementById('full-view').classList.remove('active');
    nav.target = 'home';
    nav.scan();
}

// --- PLAYERS ---
function playMovie() {
    const url = `https://vidsrc.me/embed/movie?tmdb=${window.currentMovie.id}`;
    openPlayer(url);
}

async function playFilmix() {
    const noty = document.createElement('div');
    noty.style.position = 'fixed'; noty.style.top = '20px'; noty.style.right = '20px'; noty.style.background = '#4b76fb'; noty.style.padding = '10px 20px'; noty.style.borderRadius = '5px'; noty.style.zIndex = '9999'; noty.innerText = 'Пошук на Filmix...';
    document.body.appendChild(noty);
    
    const fxData = await FX.search(window.currentMovie.title, (window.currentMovie.release_date||'').substr(0,4));
    
    if(fxData) {
        // Тут ми просто відкриємо сторінку фільму у фреймі, бо парсинг прямих лінків складний
        // Або якщо пощастить - прямий лінк
        const link = fxData.player_links?.movie?.[0]?.link;
        if(link) {
            noty.remove();
            openPlayer(link);
        } else {
            noty.innerText = 'Не знайдено прямих посилань :(';
            setTimeout(()=>noty.remove(), 2000);
        }
    } else {
        noty.innerText = 'Фільм не знайдено на Filmix';
        setTimeout(()=>noty.remove(), 2000);
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
    nav.target = 'full';
    nav.scan();
}

// --- SETTINGS (AUTH) ---
async function openSettings() {
    if(FX.token) {
        alert('Ви вже авторизовані в Filmix!');
        return;
    }
    
    const auth = await FX.initAuth();
    if(auth) {
        const code = auth.code;
        const tempToken = auth.token;
        
        const modal = document.createElement('div');
        modal.style.position = 'fixed'; modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%'; modal.style.background = 'rgba(0,0,0,0.9)'; modal.style.zIndex = '500'; modal.style.display = 'flex'; modal.style.flexDirection = 'column'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
        modal.innerHTML = `
            <div style="font-size:24px; margin-bottom:20px;">Авторизація Filmix</div>
            <div style="font-size:18px; margin-bottom:10px; color:#aaa;">Перейдіть на <b style="color:#fff">filmix.tv/consoles</b> і введіть код:</div>
            <div style="font-size:48px; font-weight:bold; color:#4b76fb; letter-spacing:5px; margin-bottom:30px;">${code}</div>
            <div id="auth-status" style="color:#888;">Очікування...</div>
            <div class="btn focus" onclick="this.parentElement.remove(); clearInterval(window.authInterval)">Скасувати</div>
        `;
        document.body.appendChild(modal);
        
        window.authInterval = setInterval(async () => {
            const success = await FX.checkAuth(tempToken);
            if(success) {
                clearInterval(window.authInterval);
                modal.innerHTML = '<div style="font-size:32px; color:#4caf50;">Успішно!</div>';
                setTimeout(() => { modal.remove(); location.reload(); }, 1500);
            }
        }, 3000);
    }
}

// --- NAV ---
const nav = {
    target: 'home', items: [], idx: 0,
    scan() {
        if(this.target==='home') this.items = Array.from(document.querySelectorAll('#screen-home .card, .sidebar .menu-item'));
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
        const cols = (this.target==='home') ? 5 : 1;
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
    
    document.querySelector('[data-action="settings"]').onclick = openSettings;
    
    document.addEventListener('keydown', e => {
        if(e.code.startsWith('Arrow')) nav.move(e.code.replace('Arrow',''));
        if(e.code==='Enter') nav.enter();
        if(e.code==='Backspace'||e.code==='Escape') {
            if(nav.target==='player') closePlayer();
            else if(nav.target==='full') closeFullView();
        }
    });
};
