/* ==========================================
   XOTT CORE v23.0 (Clean & Working)
   ========================================== */

const API_KEY = 'c3d325262a386fc19e9cb286c843c829';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const BACK_URL = 'https://image.tmdb.org/t/p/original';

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
        el.className = 'card menu-item'; // Клас menu-item для навігації
        el.style.backgroundImage = `url('${IMG_URL + item.poster_path}')`;
        el.innerHTML = `
            <div class="card-rating">${item.vote_average.toFixed(1)}</div>
            <div class="card-info">
                <div class="card-title">${item.title || item.name}</div>
            </div>
        `;
        el.onclick = () => openFullView(item);
        con.appendChild(el);
    });
}

// --- FULL VIEW LOGIC ---
function openFullView(data) {
    window.currentMovie = data;
    
    document.getElementById('full-title').innerText = data.title || data.name;
    document.getElementById('full-year').innerText = (data.release_date || '').substr(0,4);
    document.getElementById('full-rating').innerText = data.vote_average.toFixed(1);
    document.getElementById('full-descr').innerText = data.overview;
    document.getElementById('full-poster').style.backgroundImage = `url('${IMG_URL + data.poster_path}')`;
    
    if(data.backdrop_path) {
        document.getElementById('full-bg').style.backgroundImage = `url('${BACK_URL + data.backdrop_path}')`;
    }

    // BUTTONS ACTION
    document.getElementById('btn-play').onclick = () => playMovie();
    document.getElementById('btn-back').onclick = () => closeFullView();

    document.getElementById('full-view').classList.add('active');
    
    // FOCUS ON PLAY BUTTON
    nav.target = 'full';
    nav.items = [
        document.getElementById('btn-play'),
        document.getElementById('btn-trailer'),
        document.getElementById('btn-back')
    ];
    nav.idx = 0;
    nav.focus();
}

function closeFullView() {
    document.getElementById('full-view').classList.remove('active');
    nav.target = 'home';
    nav.scan();
}

// --- PLAYER LOGIC ---
function playMovie() {
    const data = window.currentMovie;
    // VIDSRC PRO - ЦЕ ЄДИНИЙ СТАБІЛЬНИЙ ВАРІАНТ
    // Він сам підтягує переклади Rezka/Filmix
    const url = `https://vidsrc.me/embed/movie?tmdb=${data.id}`;
    
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

// --- NAVIGATION SYSTEM (SIMPLE) ---
const nav = {
    target: 'home', // home, full, player
    items: [],
    idx: 0,
    
    scan() {
        if(this.target === 'home') {
            this.items = Array.from(document.querySelectorAll('#screen-home .card, .sidebar .menu-item'));
        }
        if(this.target === 'full') {
            this.items = Array.from(document.querySelectorAll('.buttons-row .btn'));
        }
        this.idx = 0;
        this.focus();
    },
    
    focus() {
        document.querySelectorAll('.focus').forEach(e => e.classList.remove('focus'));
        if(this.items[this.idx]) {
            this.items[this.idx].classList.add('focus');
            this.items[this.idx].scrollIntoView({behavior: 'smooth', block: 'center'});
        }
    },
    
    move(dir) {
        if(!this.items.length) return;
        
        // Grid Logic
        const cols = (this.target === 'home') ? 5 : 1;
        
        if(dir === 'Right') this.idx++;
        if(dir === 'Left') this.idx--;
        if(dir === 'Down') this.idx += cols;
        if(dir === 'Up') this.idx -= cols;
        
        if(this.idx < 0) this.idx = 0;
        if(this.idx >= this.items.length) this.idx = this.items.length - 1;
        
        this.focus();
    },
    
    enter() {
        if(this.items[this.idx]) this.items[this.idx].click();
    }
};

// --- INIT ---
window.onload = async () => {
    // Clock
    setInterval(() => {
        document.getElementById('clock').innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    }, 1000);

    // Load Data
    const data = await Api.trending();
    render(data, 'home-grid');
    nav.scan();

    // Keys
    document.addEventListener('keydown', e => {
        if(e.code.startsWith('Arrow')) nav.move(e.code.replace('Arrow',''));
        if(e.code === 'Enter') nav.enter();
        if(e.code === 'Backspace' || e.code === 'Escape') {
            if(nav.target === 'player') closePlayer();
            else if(nav.target === 'full') closeFullView();
        }
    });
};
