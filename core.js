/* ==========================================
   XOTT CORE v7.0 (Lampa-Style Source UI)
   ========================================== */

const API_KEY = 'c3d325262a386fc19e9cb286c843c829'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

const Plugins={list:JSON.parse(localStorage.getItem('xott_plugins')||'[]'),init:function(){this.list.forEach(u=>Utils.putScriptAsync(u));this.renderList()},add:function(u){if(!u||this.list.includes(u))return;this.list.push(u);localStorage.setItem('xott_plugins',JSON.stringify(this.list));Utils.putScriptAsync(u);this.renderList()},renderList:function(){const b=document.getElementById('plugins-list');if(b)b.innerHTML=this.list.map(u=>`<div class="plugin-item">${u}</div>`).join('')}};
const Listener={_ev:{},follow(n,c){(this._ev[n]=this._ev[n]||[]).push(c)},send(n,d){(this._ev[n]||[]).forEach(c=>c(d))}};
const Storage={get:(n,d)=>localStorage.getItem(n)||d,set:(n,v)=>localStorage.setItem(n,v)};
const Utils={putScriptAsync:(u,c)=>{if(!Array.isArray(u))u=[u];let k=0;u.forEach(x=>{let s=document.createElement('script');s.src=x;s.onload=()=>{if(++k==u.length&&c)c()};document.head.appendChild(s)})},toggleFullScreen:()=>!document.fullscreenElement?document.documentElement.requestFullscreen():document.exitFullscreen()};
const Template={get:(n,o)=>''};
window.Lampa={Listener,Storage,Utils,Template,Manifest:{app_digital:300}};

const Api={
    currentPage:1, isLoading:false,
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
        el.dataset.id=i.id; el.dataset.title=i.title||i.name;
        el.dataset.year=(i.release_date||i.first_air_date||'').substr(0,4);
        el.dataset.rating=i.vote_average; el.dataset.img=IMG_URL+i.poster_path;
        el.dataset.overview=i.overview;
        el.innerHTML=`<div class="card-img" style="background-image:url('${IMG_URL+i.poster_path}')"><div class="rating-badge">${i.vote_average.toFixed(1)}</div></div><div class="card-title">${i.title||i.name}</div>`;
        el.onclick=(e)=>{e.stopPropagation();openModal(el.dataset)};
        con.appendChild(el);
    });
}

// --- SOURCE SELECTOR & PLAYER ---
function showSources(data) {
    window.currentMovieData = data;
    const list = document.getElementById('source-list');
    const panel = document.getElementById('source-selector');
    
    // Список джерел (Стиль Lampa)
    const sources = [
        { name: 'VidSrc.to', meta: 'Багатомовний • Стабільний • 1080p', id: 'vidsrc' },
        { name: 'SuperEmbed', meta: 'Filmix / Rezka • RU/UA • 1080p', id: 'superembed' },
        { name: '2Embed', meta: 'Резервний • Eng/Ru • 720p', id: '2embed' },
        { name: 'Ashdi (New Window)', meta: 'Українська озвучка • Тільки UA', id: 'ashdi' }
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

function closeSources() {
    document.getElementById('source-selector').classList.remove('active');
    // Повертаємось в модалку або на головну, залежно від того, звідки прийшли.
    // Але краще в модалку.
    Controller.currentContext = document.getElementById('modal').classList.contains('active') ? 'modal' : 'app';
    Controller.scan(); Controller.focus();
}

function playMovie(sourceId) {
    const data = window.currentMovieData;
    const tmdbId = data.id;
    const title = encodeURIComponent(data.title);
    
    if(sourceId === 'ashdi') {
        window.open(`https://ashdi.vip/vod/search?title=${title}`, '_blank');
        return;
    }

    const playerOverlay = document.getElementById('player-overlay');
    const iframe = document.getElementById('video-frame');
    let url = '';

    switch(sourceId) {
        case 'vidsrc': url = `https://vidsrc.to/embed/movie/${tmdbId}`; break;
        case 'superembed': url = `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`; break;
        case '2embed': url = `https://www.2embed.cc/embed/${tmdbId}`; break;
    }
    
    console.log(`Playing [${sourceId}]:`, url);
    iframe.src = url;
    playerOverlay.classList.add('active');
    
    // Закриваємо панель джерел, щоб не заважала
    document.getElementById('source-selector').classList.remove('active');
    
    Controller.currentContext = 'player';
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}

function closePlayer() {
    document.getElementById('player-overlay').classList.remove('active');
    document.getElementById('video-frame').src = '';
    
    // Повертаємось до вибору джерел
    document.getElementById('source-selector').classList.add('active');
    Controller.currentContext = 'sources';
    Controller.scan(); Controller.focus();
}

// --- MODAL ---
function openModal(data) {
    window.currentMovieData = data;
    document.getElementById('m-title').innerText = data.title;
    document.getElementById('m-poster').style.backgroundImage = `url('${data.img}')`;
    document.getElementById('m-year').innerText = data.year;
    document.getElementById('m-rating').innerText = data.rating;
    document.getElementById('m-descr').innerText = data.overview || 'Опису немає.';
    
    // КНОПКА "ДИВИТИСЬ" ТЕПЕР ВІДКРИВАЄ МЕНЮ ДЖЕРЕЛ
    const btnWatch = document.getElementById('btn-watch');
    btnWatch.onclick = () => showSources(data);

    document.getElementById('modal').classList.add('active');
    Controller.currentContext = 'modal';
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    Controller.currentContext = 'app';
    setTimeout(() => { Controller.scan(); Controller.idx = 0; Controller.focus(); }, 100);
}

async function loadMore() {
    if(Api.isLoading) return; Api.isLoading=true; Api.currentPage++;
    let d=await Api.loadTrending(Api.currentPage); if(d)renderCards(d,'main-row',true);
    Api.isLoading=false; Controller.scan();
}

// --- CONTROLLER ---
const Controller = {
    targets: [], idx: 0, currentContext: 'app',
    scan: function() {
        if(this.currentContext === 'player') {
            this.targets = [document.querySelector('.btn-close')];
        } else if(this.currentContext === 'sources') {
            // Шукаємо кнопки джерел + кнопку закрити
            const list = document.getElementById('source-list');
            const items = Array.from(list.querySelectorAll('.source-item'));
            const close = document.querySelector('#source-selector .modal-btn'); // Кнопка закрити
            this.targets = [...items, close];
        } else if(this.currentContext === 'modal') {
            this.targets = Array.from(document.querySelectorAll('.modal-btn'));
        } else {
            let sc = document.querySelector('.screen.active');
            let mn = Array.from(document.querySelectorAll('.menu-items .menu-btn'));
            let cn = sc ? Array.from(sc.querySelectorAll('.focusable, .card, input, .btn')) : [];
            this.targets = [...mn, ...cn];
        }
        if(this.idx >= this.targets.length) this.idx = 0;
    },
    focus: function() {
        document.querySelectorAll('.focus').forEach(e => e.classList.remove('focus'));
        if(this.targets[this.idx]) {
            let el = this.targets[this.idx]; el.classList.add('focus');
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            if (this.currentContext === 'app' && this.idx > this.targets.length - 5) loadMore();
            if(el.tagName === 'INPUT') el.focus(); else if (document.activeElement) document.activeElement.blur();
        }
    },
    move: function(dir) {
        this.scan(); if(!this.targets.length) return;
        const cols = (this.currentContext === 'app') ? 5 : 1;
        if (dir === 'right') this.idx++; if (dir === 'left') this.idx--;
        if (dir === 'down') this.idx += (this.targets[this.idx]?.classList.contains('menu-btn')) ? 1 : cols;
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

function showScreen(n) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-'+n).classList.add('active');
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('focus'));
    if(n==='main'&&document.getElementById('main-row').innerHTML==='') loadMain();
    if(n==='settings') Plugins.renderList();
    Controller.currentContext = 'app';
    setTimeout(()=>{Controller.idx=0;Controller.scan();Controller.focus()},100);
}
async function loadMain(){ let d=await Api.loadTrending(); if(d)renderCards(d,'main-row'); }
async function doSearch(){
    let q=document.getElementById('search-input').value; if(!q)return;
    document.getElementById('search-results').innerHTML='<div class="loader">Пошук...</div>';
    let d=await Api.search(q); renderCards(d,'search-results');
    setTimeout(()=>{Controller.scan();Controller.idx=2;Controller.focus()},500);
}
function addPlugin(){ const i=document.getElementById('plugin-url'); Plugins.add(i.value); i.value=''; }

window.onload=()=>{
    Plugins.init(); setInterval(()=>{document.getElementById('clock').innerText=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})},1000);
    document.addEventListener('keydown',e=>{
        if(e.code==='ArrowRight')Controller.move('right'); if(e.code==='ArrowLeft')Controller.move('left');
        if(e.code==='ArrowDown')Controller.move('down'); if(e.code==='ArrowUp')Controller.move('up');
        if(e.code==='Enter')Controller.enter();
        if(e.code==='Escape'||e.code==='Backspace'){
            if(Controller.currentContext==='player') closePlayer();
            else if(Controller.currentContext==='sources') closeSources();
            else if(Controller.currentContext==='modal') closeModal();
        }
    });
    document.body.addEventListener('click',e=>{
        const t=e.target.closest('.menu-btn,.search-btn,.settings-item,.modal-btn,.btn,.btn-close,.source-item');
        if(t){ Controller.scan(); Controller.idx=Controller.targets.indexOf(t); Controller.focus(); Controller.enter(); }
    });
    const s=document.getElementById('do-search'); if(s)s.onclick=doSearch;
    const ap=document.getElementById('btn-add-plugin'); if(ap)ap.onclick=addPlugin;
    const c=document.querySelector('.content');
    c.addEventListener('scroll',()=>{if(c.scrollTop+c.clientHeight>=c.scrollHeight-100)loadMore()});
    showScreen('main');
};
