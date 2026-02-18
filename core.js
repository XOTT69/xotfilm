/* ==========================================
   XOTT CORE v28.0 (Stable & Proxy Fix)
   ========================================== */

const API_KEY = 'c3d325262a386fc19e9cb286c843c829';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const BACK_URL = 'https://image.tmdb.org/t/p/original';

// --- FILMIX (ALLORIGINS PROXY) ---
const FX = {
    token: localStorage.getItem('fx_token') || '',
    uid: localStorage.getItem('fx_uid') || genUid(),
    
    async auth() {
        try {
            // Використовуємо надійніший проксі allorigins
            const url = `https://filmixapp.vip/api/v2/token_request?user_dev_apk=2.0.1&user_dev_id=${this.uid}&user_dev_name=XOTT`;
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            const json = await res.json();
            
            // Парсимо відповідь
            const data = JSON.parse(json.contents);
            
            if(data.status === 'ok') return { code: data.user_code, token: data.code };
            throw new Error('API Error');
        } catch(e) {
            console.error(e);
            alert('Помилка з\'єднання з Filmix! Спробуйте ще раз.');
            return null;
        }
    },
    
    async check(t) {
        try {
            const url = `https://filmixapp.vip/api/v2/user_profile?user_dev_id=${this.uid}&user_dev_token=${t}`;
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            const json = await res.json();
            const data = JSON.parse(json.contents);
            
            if(data?.user_data) {
                this.token = t; 
                localStorage.setItem('fx_token', t); 
                return true;
            }
        } catch(e) {}
        return false;
    }
};

function genUid() {
    const u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c=='x'?Math.random()*16|0:(Math.random()*16|0)&0x3|0x8).toString(16));
    localStorage.setItem('fx_uid', u); return u;
}

// --- API ---
const Api = {
    async get(u) { try{return await(await fetch(`https://api.themoviedb.org/3/${u}&api_key=${API_KEY}&language=uk-UA`)).json()}catch(e){return null}},
    async trend() { return await this.get('trending/movie/week?') },
    async search(q) { return await this.get(`search/movie?query=${encodeURIComponent(q)}`) }
};

// --- UI ---
function render(d, id) {
    const c = document.getElementById(id); c.innerHTML = '';
    document.getElementById('home-loader').style.display = 'none';
    if(!d?.results) return;
    d.results.forEach(i => {
        if(!i.poster_path) return;
        let el = document.createElement('div'); el.className = 'card';
        el.style.backgroundImage = `url('${IMG_URL + i.poster_path}')`;
        el.innerHTML = `<div class="card-rating">${i.vote_average.toFixed(1)}</div><div class="card-title">${i.title||i.name}</div>`;
        el.onclick = () => openFull(i);
        c.appendChild(el);
    });
}

function openFull(d) {
    window.mov = d;
    document.getElementById('full-title').innerText = d.title||d.name;
    document.getElementById('full-year').innerText = (d.release_date||'').substr(0,4);
    document.getElementById('full-rating').innerText = d.vote_average.toFixed(1);
    document.getElementById('full-descr').innerText = d.overview;
    document.getElementById('full-poster').style.backgroundImage = `url('${IMG_URL+d.poster_path}')`;
    if(d.backdrop_path) document.getElementById('full-bg').style.backgroundImage = `url('${BACK_URL+d.backdrop_path}')`;
    
    // Показуємо кнопку Filmix тільки якщо є токен
    const fx = document.getElementById('btn-filmix');
    fx.style.display = FX.token ? 'flex' : 'none';
    fx.onclick = () => alert('Пошук Filmix PRO...'); // Тимчасово

    document.getElementById('full-view').classList.add('active');
}

// --- INIT EVENTS ---
window.onload = async () => {
    setInterval(() => document.getElementById('clock').innerText = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), 1000);
    const d = await Api.trend(); render(d, 'home-grid');

    // === КНОПКИ МЕНЮ (НАДІЙНА ПРИВ'ЯЗКА) ===
    
    // HOME
    const homeBtn = document.getElementById('home-btn');
    if(homeBtn) {
        homeBtn.addEventListener('click', () => {
            document.getElementById('screen-home').style.display = 'block';
            document.getElementById('screen-search').style.display = 'none';
            document.getElementById('home-btn').classList.add('active-tab');
            document.getElementById('search-btn').classList.remove('active-tab');
        });
    }

    // SEARCH
    const searchBtn = document.getElementById('search-btn');
    if(searchBtn) {
        searchBtn.addEventListener('click', () => {
            document.getElementById('screen-home').style.display = 'none';
            document.getElementById('screen-search').style.display = 'block';
            document.getElementById('home-btn').classList.remove('active-tab');
            document.getElementById('search-btn').classList.add('active-tab');
            document.getElementById('search-input').focus();
        });
    }

    // SETTINGS (ШЕСТЕРНЯ)
    const settingsBtn = document.getElementById('settings-btn');
    if(settingsBtn) {
        settingsBtn.addEventListener('click', async () => {
            console.log('Settings clicked!');
            
            if(FX.token) {
                if(confirm('Вийти з Filmix?')) { localStorage.removeItem('fx_token'); FX.token=''; location.reload(); }
                return;
            }

            const auth = await FX.auth(); // Отримуємо код через проксі
            if(auth) {
                const div = document.createElement('div');
                div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;';
                div.innerHTML = `
                    <h2>Авторизація Filmix</h2>
                    <p>Введіть код на <b>filmix.tv/consoles</b></p>
                    <h1 style="color:#4b76fb;font-size:40px;letter-spacing:5px;margin:20px 0">${auth.code}</h1>
                    <button id="cancel-auth" style="padding:10px 20px;font-size:16px;cursor:pointer;background:#333;color:#fff;border:none;border-radius:5px;">Скасувати</button>
                `;
                document.body.appendChild(div);
                
                document.getElementById('cancel-auth').onclick = () => { div.remove(); clearInterval(window.tmr); };
                
                window.tmr = setInterval(async () => {
                    if(await FX.check(auth.token)) {
                        clearInterval(window.tmr);
                        div.innerHTML = '<h1 style="color:#4caf50">Успішно!</h1>';
                        setTimeout(() => { div.remove(); location.reload(); }, 1500);
                    }
                }, 3000);
            }
        });
    }

    // PLAY & BACK
    document.getElementById('btn-play').onclick = () => {
        document.getElementById('video-frame').src = `https://vidsrc.me/embed/movie?tmdb=${window.mov.id}`;
        document.getElementById('player').classList.add('active');
    };
    
    document.getElementById('btn-back').onclick = () => {
        document.getElementById('full-view').classList.remove('active');
        document.getElementById('video-frame').src = ''; // Stop video
    };

    // SEARCH INPUT
    document.getElementById('search-input').oninput = async (e) => {
        if(e.target.value.length>2) render(await Api.search(e.target.value), 'search-grid');
    };
};
