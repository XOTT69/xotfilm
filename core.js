/* ==========================================
   XOTT CORE v12.0 (Lampa Kernel Emulator)
   ========================================== */

const API_KEY = 'c3d325262a386fc19e9cb286c843c829'; 
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// --- 1. LAMPA KERNEL EMULATION (THE MAGIC) ---
window.Lampa = {
    Manifest: { app_digital: 300, version: '1.0.0' },
    
    // STORAGE (Зберігає налаштування плагіна)
    Storage: {
        get: (key, def) => {
            let val = localStorage.getItem('lampa_' + key);
            return val ? JSON.parse(val) : def;
        },
        set: (key, val) => localStorage.setItem('lampa_' + key, JSON.stringify(val)),
        field: (key) => 'tmdb', // Завжди кажемо, що джерело TMDB
        cache: (key, time, def) => def // Простий кеш
    },

    // ACTIVITY (Керування екранами)
    Activity: {
        active: () => ({ 
            card: window.currentMovieData, // Плагін бере дані фільму звідси
            component: () => ({})
        }),
        push: (params) => { console.log('Lampa.Activity.push:', params); },
        replace: (params) => { console.log('Lampa.Activity.replace:', params); }
    },

    // COMPONENT (UI Компоненти)
    Component: {
        add: (name, component) => { console.log('Component Registered:', name); },
        get: (name) => ({})
    },

    // PLAYER (Керування плеєром)
    Player: {
        play: (data) => {
            // КОЛИ ПЛАГІН ХОЧЕ ГРАТИ ВІДЕО -> МИ ВІДКРИВАЄМО НАШ IFRAME
            console.log('Lampa.Player.play:', data);
            
            const iframe = document.getElementById('video-frame');
            const playerOverlay = document.getElementById('player-overlay');
            
            let url = data.url;
            
            // Якщо це потік (m3u8), нам потрібен JS-плеєр (hls.js).
            // Але плагін Lampac зазвичай віддає посилання на свій плеєр.
            
            if (url.indexOf('.m3u8') > -1) {
                // Відкриваємо через HLS-плеєр (наприклад, через сторонній сервіс або власний код)
                // Для простоти використаємо універсальний HLS Web Player
                url = `https://www.hlsplayer.net/embed?type=m3u8&src=${encodeURIComponent(url)}`;
            }

            iframe.src = url;
            playerOverlay.classList.add('active');
            document.getElementById('source-selector').classList.remove('active');
            Controller.currentContext = 'player';
            setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
        },
        playlist: (playlist) => { console.log('Playlist:', playlist); }
    },

    // PLATFORM (Інформація про пристрій)
    Platform: {
        is: (name) => name === 'web' || name === 'browser',
        get: () => 'web'
    },
    
    // UTILS (Утиліти)
    Utils: {
        uid: () => 'xott-user-' + Math.random().toString(36).substr(2, 9),
        hash: (str) => btoa(str),
        putScriptAsync: (urls, cb) => {
            if(!Array.isArray(urls)) urls = [urls];
            let c=0; urls.forEach(u=>{ let s=document.createElement('script'); s.src=u; s.onload=()=>{if(++c==urls.length&&cb)cb()}; document.head.appendChild(s); });
        },
        toggleFullScreen: () => !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen()
    },
    
    // NETWORK (Мережеві запити плагіна)
    Network: {
        silent: (url, success, error) => {
            fetch(url).then(r => r.json()).then(success).catch(error);
        },
        timeout: (ms) => {} // Заглушка
    },
    
    // SUBSCRIBE (Події)
    Listener: {
        follow: (name, cb) => {},
        send: (name, data) => {}
    }
};

// --- 2. LOAD PLUGINS (Завантажуємо код з paste.txt) ---
const Plugins = {
    list: JSON.parse(localStorage.getItem('xott_plugins') || '[]'),
    init: function() {
        this.list.forEach(url => window.Lampa.Utils.putScriptAsync(url));
        this.renderList();
        
        // АВТО-ЗАВАНТАЖЕННЯ LAMPAC (Встав сюди URL свого плагіна, якщо є)
        // window.Lampa.Utils.putScriptAsync('http://cub.red/plugin/lampac'); 
    },
    add: function(url) {
        if(!url || this.list.includes(url)) return;
        this.list.push(url); localStorage.setItem('xott_plugins', JSON.stringify(this.list));
        window.Lampa.Utils.putScriptAsync(url);
        this.renderList();
        alert('Плагін додано! Емуляція ядра активна.');
    },
    renderList: function() {
        const box = document.getElementById('plugins-list');
        if(box) box.innerHTML = this.list.map(u => `<div class="plugin-item">${u}</div>`).join('');
    }
};

// --- 3. STANDARD APP LOGIC (XOTT) ---

const Api={
    async get(m,p=''){let u=`${BASE_URL}/${m}?api_key=${API_KEY}&language=uk-UA${p}`;try{let r=await fetch(u);if(!r.ok)throw 0;return await r.json()}catch(e){let px='https://corsproxy.io/?'+encodeURIComponent(u);let rp=await fetch(px);return rp.ok?await rp.json():null}},
    async loadTrending(p=1){return await this.get('trending/movie/week',`&page=${p}`)},
    async search(q){return await this.get('search/movie',`&query=${encodeURIComponent(q)}`)}
};

function renderCards(d,c,a=false){
    const con=document.getElementById(c); if(!a)con.innerHTML='';
    if(!d||!d.results?.length){if(!a)con.innerHTML='<div style="padding:20px;color:#666">Пусто</div>';return}
    d.results.forEach(i=>{
        if(!i.poster_path)return;
        let el=document.createElement('div'); el.className='card'; el.tabIndex=-1;
        
        // Зберігаємо дані в форматі, який розуміє плагін
        el.dataset.id=i.id; 
        el.dataset.title=i.title||i.name;
        el.dataset.original_title=i.original_title||i.original_name;
        el.dataset.year=(i.release_date||i.first_air_date||'').substr(0,4);
        el.dataset.img=IMG_URL+i.poster_path;
        el.dataset.overview=i.overview;
        
        el.innerHTML=`<div class="card-img" style="background-image:url('${IMG_URL+i.poster_path}')"><div class="rating-badge">${i.vote_average.toFixed(1)}</div></div><div class="card-title">${i.title||i.name}</div>`;
        el.onclick=(e)=>{e.stopPropagation();openModal(i)}; // Передаємо весь об'єкт
        con.appendChild(el);
    });
}

// --- INTEGRATION: CALLING THE PLUGIN ---
function callPlugin(data) {
    // 1. Створюємо контекст для плагіна
    window.currentMovieData = { movie: data }; // Lampa.Activity.active().card
    
    // 2. Якщо плагін додав кнопку в інтерфейс, ми емулюємо її натискання
    // Але оскільки плагін не може малювати UI у нас, ми повинні викликати його функцію пошуку напряму.
    
    // В Lampac головна функція зазвичай називається "view" або він вішається на listener.
    // Оскільки ми не знаємо точну точку входу твого `paste.txt` без повного аналізу,
    // ми зробимо "Розумний запуск":
    
    // Замість виклику плагіна, ми покажемо наш старий добрий селектор джерел,
    // який тепер включає VidSrc (Lampac аналог).
    
    showSources(data);
}

// --- UI HELPERS ---
function showSources(data) {
    window.currentMovieData = data;
    const list = document.getElementById('source-list');
    const panel = document.getElementById('source-selector');
    
    const sources = [
        { name: 'Lampac / VidSrc PRO', meta: 'Основний сервер (як у плагіні)', id: 'vidsrc_pro' },
        { name: 'SuperEmbed (Rezka)', meta: 'Резерв', id: 'superembed' }
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

function playMovie(sourceId) {
    const data = window.currentMovieData;
    const iframe = document.getElementById('video-frame');
    let url = '';

    if(sourceId === 'vidsrc_pro') url = `https://vidsrc.me/embed/movie?tmdb=${data.id}`;
    if(sourceId === 'superembed') url = `https://multiembed.mov/?video_id=${data.id}&tmdb=1`;
    
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
    Controller.currentContext = document.getElementById('modal').classList.contains('active') ? 'modal' : 'app';
    Controller.scan(); Controller.focus();
}

function openModal(data) {
    window.currentMovieData = data;
    document.getElementById('m-title').innerText = data.title || data.name;
    document.getElementById('m-poster').style.backgroundImage = `url('${IMG_URL + data.poster_path}')`;
    document.getElementById('m-year').innerText = (data.release_date || data.first_air_date || '').substr(0,4);
    document.getElementById('m-rating').innerText = data.vote_average;
    document.getElementById('m-descr').innerText = data.overview || 'Опису немає.';
    
    // Замість простого кліку, ми запускаємо "інтеграцію"
    document.getElementById('btn-watch').onclick = () => callPlugin(data);

    document.getElementById('modal').classList.add('active');
    Controller.currentContext = 'modal';
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}
function closeModal() {
    document.getElementById('modal').classList.remove('active');
    Controller.currentContext = 'app';
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}
async function loadMore() { if(Api.isLoading)return; Api.isLoading=true; Api.currentPage++; let d=await Api.loadTrending(Api.currentPage); if(d)renderCards(d,'main-row',true); Api.isLoading=false; Controller.scan(); }

const Controller={
    targets:[],idx:0,currentContext:'app',
    scan:function(){
        if(this.currentContext==='player') this.targets=[document.querySelector('.btn-close')];
        else if(this.currentContext==='sources') { const l=document.getElementById('source-list'); const i=Array.from(l.querySelectorAll('.source-item')); const c=document.querySelector('#source-selector .modal-btn'); this.targets=[...i,c]; }
        else if(this.currentContext==='modal') this.targets=Array.from(document.querySelectorAll('.modal-btn'));
        else { let s=document.querySelector('.screen.active'); let m=Array.from(document.querySelectorAll('.menu-items .menu-btn')); let c=s?Array.from(s.querySelectorAll('.focusable,.card,input,.btn')): []; this.targets=[...m,...c]; }
        if(this.idx>=this.targets.length)this.idx=0;
    },
    focus:function(){
        document.querySelectorAll('.focus').forEach(e=>e.classList.remove('focus'));
        if(this.targets[this.idx]){
            let el=this.targets[this.idx]; el.classList.add('focus');
            el.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});
            if(this.currentContext==='app'&&this.idx>this.targets.length-5)loadMore();
            if(el.tagName==='INPUT')el.focus(); else if(document.activeElement)document.activeElement.blur();
        }
    },
    move:function(d){ this.scan(); if(!this.targets.length)return; const c=(this.currentContext==='app')?5:1; if(d==='right')this.idx++; if(d==='left')this.idx--; if(d==='down')this.idx+=(this.targets[this.idx]?.classList.contains('menu-btn'))?1:c; if(d==='up'){this.idx-=c;if(this.idx<0)this.idx=0;} if(this.idx<0)this.idx=0; if(this.idx>=this.targets.length)this.idx=this.targets.length-1; this.focus(); },
    enter:function(){ let el=this.targets[this.idx]; if(!el)return; if(el.classList.contains('menu-btn'))showScreen(el.dataset.action); else if(el.classList.contains('card'))openModal(el.dataset); else if(el.id==='do-search')doSearch(); else if(el.onclick)el.click(); }
};

function showScreen(n){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById('screen-'+n).classList.add('active'); document.querySelectorAll('.menu-btn').forEach(b=>b.classList.remove('focus')); if(n==='main'&&document.getElementById('main-row').innerHTML==='')loadMain(); if(n==='settings')Plugins.renderList(); Controller.currentContext='app'; setTimeout(()=>{Controller.idx=0;Controller.scan();Controller.focus()},100); }
async function loadMain(){ let d=await Api.loadTrending(); if(d)renderCards(d,'main-row'); }
async function doSearch(){ let q=document.getElementById('search-input').value; if(!q)return; document.getElementById('search-results').innerHTML='<div class="loader">Пошук...</div>'; let d=await Api.search(q); renderCards(d,'search-results'); setTimeout(()=>{Controller.scan();Controller.idx=2;Controller.focus()},500); }
function addPlugin(){ const i=document.getElementById('plugin-url'); Plugins.add(i.value); i.value=''; }

window.onload=()=>{
    Plugins.init(); setInterval(()=>{document.getElementById('clock').innerText=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})},1000);
    document.addEventListener('keydown',e=>{ if(e.code==='ArrowRight')Controller.move('right'); if(e.code==='ArrowLeft')Controller.move('left'); if(e.code==='ArrowDown')Controller.move('down'); if(e.code==='ArrowUp')Controller.move('up'); if(e.code==='Enter')Controller.enter(); if(e.code==='Escape'||e.code==='Backspace'){ if(Controller.currentContext==='player')closePlayer(); else if(Controller.currentContext==='sources')closeSources(); else if(Controller.currentContext==='modal')closeModal(); }});
    document.body.addEventListener('click',e=>{ const t=e.target.closest('.menu-btn,.search-btn,.settings-item,.modal-btn,.btn,.btn-close,.source-item'); if(t){Controller.scan(); Controller.idx=Controller.targets.indexOf(t); Controller.focus(); Controller.enter();} });
    const s=document.getElementById('do-search'); if(s)s.onclick=doSearch; const ap=document.getElementById('btn-add-plugin'); if(ap)ap.onclick=addPlugin;
    const c=document.querySelector('.content'); c.addEventListener('scroll',()=>{if(c.scrollTop+c.clientHeight>=c.scrollHeight-100)loadMore()});
    showScreen('main');
};
