/* ==========================================
   XOTT CORE v22.0 (Lampa Native UI)
   ========================================== */

const API_KEY = 'c3d325262a386fc19e9cb286c843c829'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const BACK_URL = 'https://image.tmdb.org/t/p/original';

const Api = {
    async get(m,p=''){ try{ let r=await fetch(`${BASE_URL}/${m}?api_key=${API_KEY}&language=uk-UA${p}`); return await r.json()} catch(e){return null}},
    async loadTrending(p=1){return await this.get('trending/movie/week',`&page=${p}`)},
    async search(q){return await this.get('search/movie',`&query=${encodeURIComponent(q)}`)}
};

function renderCards(d, c) {
    const con = document.getElementById(c); con.innerHTML='';
    if(!d?.results?.length) return;
    d.results.forEach(i => {
        if(!i.poster_path) return;
        let el = document.createElement('div'); el.className='card focusable';
        el.innerHTML=`<div class="card-img" style="background-image:url('${IMG_URL+i.poster_path}')"></div><div class="card-title">${i.title||i.name}</div><div class="rating-badge">${i.vote_average.toFixed(1)}</div>`;
        el.onclick = () => openView(i);
        con.appendChild(el);
    });
}

// --- VIEW SCREEN LOGIC ---
function openView(data) {
    window.currentMovieData = data;
    
    // Заповнюємо інфу
    document.getElementById('v-title').innerText = data.title || data.name;
    document.getElementById('v-year').innerText = (data.release_date || data.first_air_date || '').substr(0,4);
    document.getElementById('v-rating').innerHTML = `<i class="fas fa-star"></i> ${data.vote_average.toFixed(1)}`;
    document.getElementById('v-descr').innerText = data.overview || 'Опис відсутній.';
    document.getElementById('v-poster').style.backgroundImage = `url('${IMG_URL + data.poster_path}')`;
    
    // Фон (Backdrop)
    const viewScreen = document.getElementById('view-screen');
    if (data.backdrop_path) {
        viewScreen.style.backgroundImage = `url('${BACK_URL + data.backdrop_path}')`;
    } else {
        viewScreen.style.backgroundColor = '#111';
    }

    // Генеруємо список джерел (як сірі блоки на скріні)
    const sourcesBox = document.getElementById('v-sources');
    sourcesBox.innerHTML = '';
    
    const sources = [
        { name: 'Lampa (Auto)', sub: 'VidSrc PRO • 1080p', id: 'vidsrc_pro', icon: 'fa-play' },
        { name: 'Rezka / Filmix', sub: 'Альтернатива (UA/RU)', id: 'superembed', icon: 'fa-globe' },
        { name: 'Kodik Player', sub: 'Озвучки (HD)', id: 'kodik', icon: 'fa-list' }
    ];

    sources.forEach(s => {
        let el = document.createElement('div');
        el.className = 'source-card focusable';
        el.onclick = () => playMovie(s.id);
        el.innerHTML = `
            <div class="source-icon"><i class="fas ${s.icon}"></i></div>
            <div class="source-info">
                <div style="font-size:18px; font-weight:600; color:#fff">${s.name}</div>
                <div style="font-size:14px; color:#888">${s.sub}</div>
            </div>
        `;
        sourcesBox.appendChild(el);
    });

    viewScreen.classList.add('active');
    Controller.currentContext = 'view';
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}

function closeView() {
    document.getElementById('view-screen').classList.remove('active');
    Controller.currentContext = 'app';
    Controller.scan(); Controller.focus();
}

// --- PLAYER ---
function playMovie(id) {
    const data = window.currentMovieData;
    let url = '';
    if(id==='vidsrc_pro') url = `https://vidsrc.me/embed/movie?tmdb=${data.id}`;
    if(id==='superembed') url = `https://multiembed.mov/?video_id=${data.id}&tmdb=1`;
    if(id==='kodik') url = `https://kodik.info/find-player?tmdbID=${data.id}&types=film,serial&camrip=false`;
    
    // Fix for Kodik
    if (url.startsWith('//')) url = 'https:' + url;

    document.getElementById('video-frame').src = url;
    document.getElementById('player-overlay').classList.add('active');
    Controller.currentContext = 'player';
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}

function closePlayer() {
    document.getElementById('player-overlay').classList.remove('active');
    document.getElementById('video-frame').src = '';
    Controller.currentContext = 'view';
    Controller.scan(); Controller.focus();
}

// --- CONTROLLER ---
const Controller = {
    targets: [], idx: 0, currentContext: 'app',
    scan: function() {
        if(this.currentContext === 'player') this.targets = [document.querySelector('.btn-close')];
        else if(this.currentContext === 'view') {
            // В режимі перегляду фокус тільки на джерелах (права колонка)
            this.targets = Array.from(document.querySelectorAll('#v-sources .source-card'));
        }
        else { // App (Main Screen)
            let s = document.querySelector('.screen.active');
            let m = Array.from(document.querySelectorAll('.menu-btn')); // Якщо будуть
            let c = s ? Array.from(s.querySelectorAll('.focusable')) : [];
            this.targets = [...m, ...c];
        }
        if(this.idx >= this.targets.length) this.idx = 0;
    },
    focus: function() {
        document.querySelectorAll('.focus').forEach(e => e.classList.remove('focus'));
        if(this.targets[this.idx]) {
            let el = this.targets[this.idx]; el.classList.add('focus');
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    },
    move: function(d) { 
        this.scan(); if(!this.targets.length) return; 
        const cols = (this.currentContext === 'app') ? 6 : 1; // 6 карток в рядок
        if(d==='right') this.idx++; 
        if(d==='left') this.idx--; 
        if(d==='down') this.idx += cols; 
        if(d==='up') this.idx -= cols;
        
        if(this.idx < 0) this.idx = 0;
        if(this.idx >= this.targets.length) this.idx = this.targets.length-1;
        this.focus(); 
    },
    enter: function() { 
        let el = this.targets[this.idx]; 
        if(el && el.onclick) el.onclick();
        else if(el && el.id === 'search-input') el.focus();
    }
};

async function loadMain(){ let d=await Api.loadTrending(); renderCards(d,'main-row'); setTimeout(()=>{Controller.scan(); Controller.idx=0; Controller.focus()}, 500); }

window.onload = () => {
    setInterval(() => { document.getElementById('clock').innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }, 1000);
    document.addEventListener('keydown', e => {
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) Controller.move(e.code.replace('Arrow','').toLowerCase());
        if(e.code==='Enter') Controller.enter();
        if(e.code==='Escape'||e.code==='Backspace') {
            if(Controller.currentContext==='player') closePlayer();
            else if(Controller.currentContext==='view') closeView();
        }
    });
    // Search Handler
    document.getElementById('search-input').addEventListener('input', async (e) => {
        if(e.target.value.length > 2) {
            let d = await Api.search(e.target.value);
            renderCards(d, 'search-results');
            Controller.scan();
        }
    });
    
    // Switch Tabs Logic (Simple)
    document.querySelectorAll('.menu-btn').forEach(b => {
        b.onclick = () => {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('screen-' + b.dataset.action).classList.add('active');
            Controller.currentContext = 'app'; Controller.scan(); Controller.focus();
        }
    });

    loadMain();
};
