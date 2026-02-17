/* ==========================================
   XOTT CORE v4.0 (Infinite Scroll + Multi-Source Player)
   ========================================== */

const API_KEY = 'c3d325262a386fc19e9cb286c843c829'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// --- PLUGINS SYSTEM ---
const Plugins = {
    list: JSON.parse(localStorage.getItem('xott_plugins') || '[]'),
    init: function() { this.list.forEach(url => Utils.putScriptAsync(url)); this.renderList(); },
    add: function(url) {
        if(!url || this.list.includes(url)) return;
        this.list.push(url); localStorage.setItem('xott_plugins', JSON.stringify(this.list));
        Utils.putScriptAsync(url); this.renderList();
    },
    renderList: function() {
        const box = document.getElementById('plugins-list'); if(box) box.innerHTML = this.list.map(u => `<div class="plugin-item">${u}</div>`).join('');
    }
};

// --- LAMPA EMULATION ---
const Listener = { _ev: {}, follow(n,c){(this._ev[n]=this._ev[n]||[]).push(c)}, send(n,d){(this._ev[n]||[]).forEach(c=>c(d))} };
const Storage = { get:(n,d)=>localStorage.getItem(n)||d, set:(n,v)=>localStorage.setItem(n,v) };
const Utils = {
    putScriptAsync: (urls, cb) => { if(!Array.isArray(urls)) urls=[urls]; let c=0; urls.forEach(u=>{ let s=document.createElement('script'); s.src=u; s.onload=()=>{if(++c==urls.length&&cb)cb()}; document.head.appendChild(s); }); },
    toggleFullScreen: () => !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen()
};
const Template = { get: (name, obj) => '' };
window.Lampa = { Listener, Storage, Utils, Template, Manifest: { app_digital: 300 } };

// --- API ---
const Api = {
    currentPage: 1,
    isLoading: false,
    
    async get(method, params = '') {
        let url = `${BASE_URL}/${method}?api_key=${API_KEY}&language=uk-UA${params}`;
        try {
            let res = await fetch(url);
            if (!res.ok) throw new Error(res.status);
            return await res.json();
        } catch (e) {
            let proxy = 'https://corsproxy.io/?' + encodeURIComponent(url);
            let resP = await fetch(proxy);
            return resP.ok ? await resP.json() : null;
        }
    },
    async loadTrending(page = 1) { return await this.get('trending/movie/week', `&page=${page}`); },
    async search(query) { return await this.get('search/movie', `&query=${encodeURIComponent(query)}`); }
};

// --- RENDER ---
function renderCards(data, containerId, append = false) {
    const container = document.getElementById(containerId);
    if (!append) container.innerHTML = '';
    
    if (!data || !data.results?.length) { 
        if(!append) container.innerHTML = '<div style="padding:20px;color:#666">Пусто</div>'; 
        return; 
    }

    data.results.forEach(item => {
        if(!item.poster_path) return;
        let el = document.createElement('div');
        el.className = 'card'; el.tabIndex = -1;
        el.dataset.id = item.id;
        el.dataset.title = item.title || item.name;
        el.dataset.year = (item.release_date || item.first_air_date || '').substr(0,4);
        el.dataset.rating = item.vote_average;
        el.dataset.img = IMG_URL + item.poster_path;
        el.dataset.orig_title = item.original_title || item.original_name;
        el.dataset.overview = item.overview;

        el.innerHTML = `<div class="card-img" style="background-image: url('${IMG_URL + item.poster_path}')"><div class="rating-badge">${item.vote_average.toFixed(1)}</div></div><div class="card-title">${item.title || item.name}</div>`;
        el.onclick = (e) => { e.stopPropagation(); openModal(el.dataset); };
        container.appendChild(el);
    });
}

// --- PLAYER SYSTEM (MULTI-SOURCE) ---
function playMovie(data, source = 'ashdi') {
    const playerOverlay = document.getElementById('player-overlay');
    const iframe = document.getElementById('video-frame');
    const title = encodeURIComponent(data.title);
    const orig = encodeURIComponent(data.orig_title);
    const id = data.id;
    
    let url = '';
    
    // ДЖЕРЕЛА (Всі підтримують вибір озвучки всередині плеєра, крім VidSrc)
    switch(source) {
        case 'ashdi': // Українське джерело (часто блокує iframe, але спробуємо)
            url = `https://ashdi.vip/vod/search?title=${title}`;
            break;
        case 'voidboost': // Найкращий вибір (багато озвучок)
            url = `https://voidboost.net/embed/movie?title=${title}`;
            break;
        case 'kinokong': // Тільки укр/рос
            url = `https://kinokong.org/embed/movie?title=${title}`;
            break;
        case 'vidsrc': // Англ + субтитри (стабільний)
            url = `https://vidsrc.to/embed/movie/${id}`;
            break;
        case 'superembed': // Резерв
            url = `https://superembed.stream/embed/movie/${id}`;
            break;
        default:
            url = `https://voidboost.net/embed/movie?title=${title}`;
    }
    
    console.log(`Playing [${source}]:`, url);
    iframe.src = url;
    playerOverlay.classList.add('active');
    
    Controller.currentContext = 'player';
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}

function closePlayer() {
    document.getElementById('player-overlay').classList.remove('active');
    document.getElementById('video-frame').src = '';
    Controller.currentContext = 'app';
    Controller.scan(); Controller.focus();
}

// --- MODAL & SOURCES ---
function openModal(data) {
    window.currentMovieData = data;
    document.getElementById('m-title').innerText = data.title;
    document.getElementById('m-poster').style.backgroundImage = `url('${data.img}')`;
    document.getElementById('m-year').innerText = data.year;
    document.getElementById('m-rating').innerText = data.rating;
    document.getElementById('m-descr').innerText = data.overview || 'Опису немає.';
    
    // Оновлюємо кнопки в модалці (Додаємо вибір джерела)
    const btnContainer = document.querySelector('.modal-buttons');
    btnContainer.innerHTML = `
        <div class="modal-btn focus" onclick="playMovie(window.currentMovieData, 'voidboost')">▶ Voidboost (Багато мов)</div>
        <div class="modal-btn" onclick="playMovie(window.currentMovieData, 'ashdi')">🇺🇦 Ashdi (Укр)</div>
        <div class="modal-btn" onclick="playMovie(window.currentMovieData, 'vidsrc')">🇬🇧 VidSrc (Orig)</div>
        <div class="modal-btn" onclick="closeModal()">Закрити</div>
    `;

    document.getElementById('modal').classList.add('active');
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}

// --- INFINITE SCROLL ---
async function loadMore() {
    if(Api.isLoading) return;
    Api.isLoading = true;
    Api.currentPage++;
    
    // Показуємо лоадер знизу (якщо треба, можна додати в HTML)
    let data = await Api.loadTrending(Api.currentPage);
    if(data) renderCards(data, 'main-row', true);
    
    Api.isLoading = false;
    // Оновлюємо навігацію, щоб побачити нові картки
    Controller.scan();
}

// --- CONTROLLER ---
const Controller = {
    targets: [], idx: 0, currentContext: 'app',

    scan: function() {
        if(this.currentContext === 'player') {
            this.targets = [document.querySelector('.btn-close')];
        } else if(document.getElementById('modal').classList.contains('active')) {
            this.targets = Array.from(document.querySelectorAll('.modal-btn'));
        } else {
            let screen = document.querySelector('.screen.active');
            let menu = Array.from(document.querySelectorAll('.menu-items .menu-btn'));
            let content = screen ? Array.from(screen.querySelectorAll('.focusable, .card, input, .btn')) : [];
            this.targets = [...menu, ...content];
        }
        if(this.idx >= this.targets.length) this.idx = 0;
    },

    focus: function() {
        document.querySelectorAll('.focus').forEach(e => e.classList.remove('focus'));
        if(this.targets[this.idx]) {
            let el = this.targets[this.idx];
            el.classList.add('focus');
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            
            // Якщо ми дійшли до кінця списку - вантажимо ще!
            if (this.currentContext === 'app' && this.idx > this.targets.length - 5) {
                loadMore();
            }
            
            if(el.tagName === 'INPUT') el.focus(); else if (document.activeElement) document.activeElement.blur();
        }
    },

    move: function(dir) {
        this.scan(); if(!this.targets.length) return;
        const cols = 5; 
        if (dir === 'right') this.idx++;
        if (dir === 'left') this.idx--;
        if (dir === 'down') this.idx += (this.targets[this.idx].classList.contains('menu-btn')) ? 1 : cols;
        if (dir === 'up') { this.idx -= cols; if(this.idx<0) this.idx=0; }
        if (this.idx < 0) this.idx = 0; if (this.idx >= this.targets.length) this.idx = this.targets.length - 1;
        this.focus();
    },

    enter: function() {
        let el = this.targets[this.idx]; if(!el) return;
        if(el.classList.contains('menu-btn')) showScreen(el.dataset.action);
        else if(el.classList.contains('card')) openModal(el.dataset);
        else if(el.id === 'do-search') doSearch();
        else if(el.onclick) el.click();
    }
};

// --- UI HELPERS ---
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('focus'));
    if(name === 'main' && document.getElementById('main-row').innerHTML === '') loadMain();
    if(name === 'settings') Plugins.renderList();
    setTimeout(() => { Controller.idx = 0; Controller.scan(); Controller.focus(); }, 100);
}
async function loadMain() { let data = await Api.loadTrending(); if(data) renderCards(data, 'main-row'); }
async function doSearch() {
    let q = document.getElementById('search-input').value; if(!q) return;
    document.getElementById('search-results').innerHTML = '<div class="loader">Пошук...</div>';
    let data = await Api.search(q); renderCards(data, 'search-results');
    setTimeout(() => { Controller.scan(); Controller.idx = 2; Controller.focus(); }, 500);
}
function addPlugin() { const inp = document.getElementById('plugin-url'); Plugins.add(inp.value); inp.value = ''; }

// --- INIT ---
window.onload = () => {
    Plugins.init();
    setInterval(() => { document.getElementById('clock').innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }, 1000);
    
    document.addEventListener('keydown', e => {
        if(e.code==='ArrowRight') Controller.move('right');
        if(e.code==='ArrowLeft') Controller.move('left');
        if(e.code==='ArrowDown') Controller.move('down');
        if(e.code==='ArrowUp') Controller.move('up');
        if(e.code==='Enter') Controller.enter();
        if(e.code==='Escape'||e.code==='Backspace') {
            if(Controller.currentContext === 'player') closePlayer(); else closeModal();
        }
    });

    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('.menu-btn, .search-btn, .settings-item, .modal-btn, .btn, .btn-close');
        if (target) { Controller.scan(); Controller.idx = Controller.targets.indexOf(target); Controller.focus(); Controller.enter(); }
    });
    
    const sBtn = document.getElementById('do-search'); if(sBtn) sBtn.onclick = doSearch;
    const addP = document.getElementById('btn-add-plugin'); if(addP) addP.onclick = addPlugin;

    // Detect scroll to load more (Mouse users)
    const content = document.querySelector('.content');
    content.addEventListener('scroll', () => {
        if(content.scrollTop + content.clientHeight >= content.scrollHeight - 100) {
            loadMore();
        }
    });

    showScreen('main');
};
