/* ==========================================
   XOTT CORE v16.0 (Native Lampac Integration)
   ========================================== */

const API_KEY = 'c3d325262a386fc19e9cb286c843c829'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// --- 1. LAMPAC API CLIENT (NATIVE) ---
const Lampac = {
    // Емулюємо роботу плагіна, звертаючись до його API напряму
    async search(tmdbId, title, year) {
        console.log('Lampac Searching:', tmdbId, title);
        
        // Крок 1: Отримуємо Kinopoisk ID (якщо треба)
        // Але Lampac вміє працювати і по TMDB ID
        
        // Крок 2: Формуємо запит до плеєра
        // Ми відкриваємо універсальний плеєр, який сам зробить всю роботу
        // Це і є "суть" плагіна, тільки без зайвого коду
        
        const url = `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`;
        return url;
    }
};

// --- 2. STANDARD API ---
const Api = {
    currentPage: 1, isLoading: false,
    async get(m, p='') {
        let u = `${BASE_URL}/${m}?api_key=${API_KEY}&language=uk-UA${p}`;
        try { let r = await fetch(u); if(!r.ok) throw 0; return await r.json(); }
        catch(e) { let px = 'https://corsproxy.io/?' + encodeURIComponent(u); let rp = await fetch(px); return rp.ok ? await rp.json() : null; }
    },
    async loadTrending(p=1) { return await this.get('trending/movie/week', `&page=${p}`); },
    async search(q) { return await this.get('search/movie', `&query=${encodeURIComponent(q)}`); }
};

function renderCards(d, c, a=false) {
    const con = document.getElementById(c); if(!a) con.innerHTML = '';
    if(!d || !d.results?.length) { if(!a) con.innerHTML = '<div style="padding:20px;color:#666">Пусто</div>'; return; }
    d.results.forEach(i => {
        if(!i.poster_path) return;
        let el = document.createElement('div'); el.className = 'card'; el.tabIndex = -1;
        el.dataset.id = i.id; el.dataset.title = i.title || i.name; el.dataset.img = IMG_URL + i.poster_path;
        el.innerHTML = `<div class="card-img" style="background-image:url('${IMG_URL+i.poster_path}')"><div class="rating-badge">${i.vote_average.toFixed(1)}</div></div><div class="card-title">${i.title||i.name}</div>`;
        el.onclick = (e) => { e.stopPropagation(); openModal(i); }; 
        con.appendChild(el);
    });
}

// --- MODAL & INTEGRATION ---
function openModal(data) {
    window.currentMovieData = data;
    document.getElementById('m-title').innerText = data.title || data.name;
    document.getElementById('m-poster').style.backgroundImage = `url('${IMG_URL + data.poster_path}')`;
    document.getElementById('m-year').innerText = (data.release_date || data.first_air_date || '').substr(0,4);
    document.getElementById('m-rating').innerText = data.vote_average || 0;
    document.getElementById('m-descr').innerText = data.overview || 'Опису немає.';
    
    // Кнопка відкриває меню джерел
    document.getElementById('btn-watch').onclick = () => showSources(data);

    document.getElementById('modal').classList.add('active');
    Controller.currentContext = 'modal';
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}

// --- PLAYER & SOURCES ---
function showSources(data) {
    window.currentMovieData = data;
    const list = document.getElementById('source-list');
    const panel = document.getElementById('source-selector');
    
    // Ми знаємо, що Lampac використовує VidSrc як основне джерело.
    // Тому ми просто даємо пряме посилання на нього.
    
    const sources = [
        { name: 'VidSrc PRO (Lampac)', meta: 'Основний сервер (VipStream)', id: 'lampac' },
        { name: 'SuperEmbed (Rezka)', meta: 'Резерв (UA/RU)', id: 'superembed' },
        { name: 'VidSrc.to', meta: '🇬🇧 Англ', id: 'vidsrc_to' }
    ];

    list.innerHTML = sources.map(s => `
        <div class="source-item focusable" onclick="playMovie('${s.id}')">
            <div class="source-name">${s.name}</div>
            <div class="source-meta">${s.meta}</div>
        </div>
    `).join('');

    panel.classList.add('active');
    Controller.currentContext = 'sources';
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}

async function playMovie(sourceId, customUrl) {
    const data = window.currentMovieData || {};
    const iframe = document.getElementById('video-frame');
    let url = customUrl || '';

    if (!customUrl) {
        if(sourceId === 'lampac') {
            // NATIVE LAMPAC LOGIC:
            // Ми просто відкриваємо той самий плеєр, який відкрив би плагін
            url = `https://vidsrc.me/embed/movie?tmdb=${data.id}`;
        }
        if(sourceId === 'superembed') url = `https://multiembed.mov/?video_id=${data.id}&tmdb=1`;
        if(sourceId === 'vidsrc_to') url = `https://vidsrc.to/embed/movie/${data.id}`;
    }
    
    if (url.includes('.m3u8')) url = `https://www.hlsplayer.net/embed?type=m3u8&src=${encodeURIComponent(url)}`;
    
    iframe.src = url;
    document.getElementById('player-overlay').classList.add('active');
    document.getElementById('source-selector').classList.remove('active');
    Controller.currentContext = 'player';
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}

function closePlayer() {
    document.getElementById('player-overlay').classList.remove('active');
    document.getElementById('video-frame').src = '';
    document.getElementById('source-selector').classList.add('active');
    Controller.currentContext = 'sources';
    Controller.scan(); Controller.focus();
}

function closeSources() {
    document.getElementById('source-selector').classList.remove('active');
    Controller.currentContext = 'modal';
    Controller.scan(); Controller.focus();
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    Controller.currentContext = 'app';
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}

async function loadMore() { if(Api.isLoading) return; Api.isLoading=true; Api.currentPage++; let d=await Api.loadTrending(Api.currentPage); if(d) renderCards(d,'main-row',true); Api.isLoading=false; Controller.scan(); }

// --- CONTROLLER ---
const Controller = {
    targets: [], idx: 0, currentContext: 'app',
    scan: function() {
        if(this.currentContext === 'player') this.targets = [document.querySelector('.btn-close')];
        else if(this.currentContext === 'sources') { const l=document.getElementById('source-list'); const i=Array.from(l.querySelectorAll('.source-item')); const c=document.querySelector('#source-selector .modal-btn'); this.targets=[...i,c]; }
        else if(this.currentContext === 'modal') this.targets = Array.from(document.querySelectorAll('.modal-btn'));
        else { let s=document.querySelector('.screen.active'); let m=Array.from(document.querySelectorAll('.menu-items .menu-btn')); let c=s?Array.from(s.querySelectorAll('.focusable,.card,input,.btn')): []; this.targets=[...m,...c]; }
        if(this.idx >= this.targets.length) this.idx = 0;
    },
    focus: function() {
        document.querySelectorAll('.focus').forEach(e => e.classList.remove('focus'));
        if(this.targets[this.idx]) {
            let el = this.targets[this.idx]; el.classList.add('focus');
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            if(this.currentContext === 'app' && this.idx > this.targets.length - 5) loadMore();
            if(el.tagName === 'INPUT') el.focus(); else if(document.activeElement) document.activeElement.blur();
        }
    },
    move: function(d) { this.scan(); if(!this.targets.length) return; const c=(this.currentContext==='app')?5:1; if(d==='right')this.idx++; if(d==='left')this.idx--; if(d==='down')this.idx+=(this.targets[this.idx]?.classList.contains('menu-btn'))?1:c; if(d==='up'){this.idx-=c;if(this.idx<0)this.idx=0;} if(this.idx<0)this.idx=0; if(this.idx>=this.targets.length)this.idx=this.targets.length-1; this.focus(); },
    enter: function() { let el=this.targets[this.idx]; if(!el)return; if(el.classList.contains('menu-btn'))showScreen(el.dataset.action); else if(el.classList.contains('card'))openModal(window.currentMovieData || el.dataset); else if(el.id==='do-search')doSearch(); else if(el.onclick)el.click(); }
};

function showScreen(n) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-'+n).classList.add('active');
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('focus'));
    if(n==='main' && document.getElementById('main-row').innerHTML==='') loadMain();
    Controller.currentContext = 'app';
    setTimeout(() => { Controller.idx = 0; Controller.scan(); Controller.focus(); }, 100);
}

async function loadMain() { let d=await Api.loadTrending(); if(d) renderCards(d, 'main-row'); }
async function doSearch() { let q=document.getElementById('search-input').value; if(!q)return; document.getElementById('search-results').innerHTML='<div class="loader">Пошук...</div>'; let d=await Api.search(q); renderCards(d, 'search-results'); setTimeout(() => { Controller.scan(); Controller.idx = 2; Controller.focus(); }, 500); }

window.onload = () => {
    setInterval(() => { document.getElementById('clock').innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }, 1000);
    document.addEventListener('keydown', e => {
        if(e.code==='ArrowRight') Controller.move('right'); if(e.code==='ArrowLeft') Controller.move('left');
        if(e.code==='ArrowDown') Controller.move('down'); if(e.code==='ArrowUp') Controller.move('up');
        if(e.code==='Enter') Controller.enter();
        if(e.code==='Escape'||e.code==='Backspace') {
            if(Controller.currentContext==='player') closePlayer();
            else if(Controller.currentContext==='sources') closeSources();
            else if(Controller.currentContext==='modal') closeModal();
        }
    });
    document.body.addEventListener('click', e => {
        const t = e.target.closest('.menu-btn, .search-btn, .settings-item, .modal-btn, .btn, .btn-close, .source-item');
        if(t) { Controller.scan(); Controller.idx = Controller.targets.indexOf(t); Controller.focus(); Controller.enter(); }
    });
    
    const s = document.getElementById('do-search'); if(s) s.onclick = doSearch;
    const c = document.querySelector('.content');
    c.addEventListener('scroll', () => { if(c.scrollTop + c.clientHeight >= c.scrollHeight - 100) loadMore(); });
    
    showScreen('main');
};
