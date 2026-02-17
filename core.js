/* ==========================================
   XOTT CORE v1.2 (Final Fix)
   ========================================== */

// --- НАЛАШТУВАННЯ ---
const API_KEY = 'c3d325262a386fc19e9cb286c843c829'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// --- ЕМУЛЯЦІЯ LAMPA API ---
const Listener = {
    _ev: {},
    follow(n, c) { (this._ev[n] = this._ev[n] || []).push(c); },
    send(n, d) { (this._ev[n] || []).forEach(c => c(d)); }
};

const Storage = {
    get: (n, d) => localStorage.getItem(n) || d,
    set: (n, v) => localStorage.setItem(n, v)
};

const Utils = {
    putScriptAsync: (urls, cb) => {
        if(!Array.isArray(urls)) urls = [urls];
        let c = 0;
        urls.forEach(u => {
            let s = document.createElement('script');
            s.src = u;
            s.onload = () => { if(++c == urls.length && cb) cb(); };
            document.head.appendChild(s);
        });
    },
    toggleFullScreen: () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else if (document.exitFullscreen) document.exitFullscreen();
    }
};

const Template = {
    get: (name, obj) => { return ''; }
};

window.Lampa = { Listener, Storage, Utils, Template, Manifest: { app_digital: 300 } };


// --- ЛОГІКА ДОДАТКУ ---

// 1. РОБОТА З API (З ПРОКСІ)
const Api = {
    async get(method, params = '') {
        // Формуємо пряме посилання
        let originalUrl = `${BASE_URL}/${method}?api_key=${API_KEY}&language=uk-UA${params}`;
        
        try {
            console.log('Спроба прямого запиту:', originalUrl);
            let res = await fetch(originalUrl);
            
            // Якщо помилка або 404/403 - кидаємо помилку, щоб піти в catch
            if (!res.ok) throw new Error(`Direct Error: ${res.status}`);
            return await res.json();
            
        } catch (e) {
            console.warn('Прямий запит не пройшов. Вмикаю проксі...', e);
            
            // ПРОКСІ-ЗАПИТ (Рятує ситуацію)
            try {
                // Використовуємо corsproxy.io для обходу блокувань
                let proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(originalUrl);
                let resProxy = await fetch(proxyUrl);
                
                if (!resProxy.ok) throw new Error(`Proxy Error: ${resProxy.status}`);
                return await resProxy.json();
                
            } catch (proxyError) {
                console.error('Навіть через проксі не вийшло:', proxyError);
                // Виводимо помилку користувачу
                const loader = document.getElementById('main-loader');
                if(loader) loader.innerHTML = `<span style="color:red">Помилка мережі:<br>${proxyError.message}</span>`;
                return null;
            }
        }
    },
    
    async loadTrending() {
        return await this.get('trending/movie/week');
    },
    
    async search(query) {
        return await this.get('search/movie', `&query=${encodeURIComponent(query)}`);
    }
};

// 2. РЕНДЕР КАРТОК
function renderCards(data, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (!data || !data.results || data.results.length === 0) {
        container.innerHTML = '<div style="padding:20px;color:#666">Нічого не знайдено</div>';
        return;
    }

    data.results.forEach(item => {
        if(!item.poster_path) return; 
        
        let el = document.createElement('div');
        el.className = 'card';
        // Важливо: додаємо tabindex, щоб елемент міг отримати фокус
        el.tabIndex = -1; 
        
        // Зберігаємо дані
        el.dataset.title = item.title || item.name;
        el.dataset.overview = item.overview;
        el.dataset.year = (item.release_date || item.first_air_date || '').substr(0,4);
        el.dataset.rating = item.vote_average;
        el.dataset.img = IMG_URL + item.poster_path;

        el.innerHTML = `
            <div class="card-img" style="background-image: url('${IMG_URL + item.poster_path}')">
                <div class="rating-badge">${item.vote_average.toFixed(1)}</div>
            </div>
            <div class="card-title">${item.title || item.name}</div>
        `;
        
        // Клік мишкою по картці
        el.onclick = (e) => {
            e.stopPropagation(); // Щоб не спрацював глобальний клік двічі
            openModal(el.dataset);
        };
        
        container.appendChild(el);
    });
}


// 3. НАВІГАЦІЯ (CONTROLLER)
const Controller = {
    targets: [],
    idx: 0,

    scan: function() {
        if(document.getElementById('modal').classList.contains('active')) {
            this.targets = Array.from(document.querySelectorAll('.modal-btn'));
        } else {
            let screen = document.querySelector('.screen.active');
            let menu = Array.from(document.querySelectorAll('.menu-items .menu-btn'));
            // Знаходимо інпути, картки та кнопки налаштувань
            let content = screen ? Array.from(screen.querySelectorAll('.focusable, .card, input')) : [];
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
            
            if(el.tagName === 'INPUT') el.focus();
            else if (document.activeElement) document.activeElement.blur();
        }
    },

    move: function(dir) {
        this.scan();
        if(this.targets.length === 0) return;

        const cols = 5; 
        
        if (dir === 'right') this.idx++;
        if (dir === 'left') this.idx--;
        
        if (dir === 'down') {
            if (this.targets[this.idx].classList.contains('menu-btn')) {
                let firstContent = this.targets.findIndex(e => !e.classList.contains('menu-btn'));
                if(firstContent !== -1) this.idx = firstContent;
            } else {
                this.idx += cols; 
            }
        }
        
        if (dir === 'up') {
            this.idx -= cols;
            if (this.idx < 0) this.idx = 0; 
        }

        if (this.idx < 0) this.idx = 0;
        if (this.idx >= this.targets.length) this.idx = this.targets.length - 1;

        this.focus();
    },

    enter: function() {
        let el = this.targets[this.idx];
        if(!el) return;

        console.log('ENTER на:', el);

        if(el.classList.contains('menu-btn')) {
            showScreen(el.dataset.action);
        } else if(el.classList.contains('card')) {
            openModal(el.dataset);
        } else if(el.id === 'do-search') {
            doSearch();
        } else if(el.id === 'btn-watch') {
             alert('Запуск плеєра для: ' + document.getElementById('m-title').innerText);
        } else if(el.classList.contains('settings-item')) {
             el.click(); // Викликаємо onclick з HTML
        }
    }
};


// 4. ФУНКЦІЇ ІНТЕРФЕЙСУ
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('focus'));
    
    if(name === 'main' && document.getElementById('main-row').innerHTML === '') {
        loadMain();
    }
    
    // Скидаємо навігацію на початок
    setTimeout(() => { Controller.idx = 0; Controller.scan(); Controller.focus(); }, 100);
}

async function loadMain() {
    const loader = document.getElementById('main-loader');
    if(loader) loader.style.display = 'block';
    
    let data = await Api.loadTrending();
    
    if(loader) loader.style.display = 'none';
    if(data) renderCards(data, 'main-row');
}

async function doSearch() {
    let q = document.getElementById('search-input').value;
    if(!q) return;
    
    document.getElementById('search-results').innerHTML = '<div class="loader">Пошук...</div>';
    let data = await Api.search(q);
    renderCards(data, 'search-results');
    
    setTimeout(() => { Controller.scan(); Controller.idx = 2; Controller.focus(); }, 500);
}

function openModal(data) {
    document.getElementById('m-title').innerText = data.title;
    document.getElementById('m-poster').style.backgroundImage = `url('${data.img}')`;
    document.getElementById('m-year').innerText = data.year;
    document.getElementById('m-rating').innerText = data.rating;
    document.getElementById('m-descr').innerText = data.overview || 'Опису немає.';
    
    document.getElementById('modal').classList.add('active');
    
    // Перемикаємо контролер на модалку
    setTimeout(() => {
        Controller.scan();
        Controller.idx = 0; 
        Controller.focus();
    }, 100);
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    setTimeout(() => {
        Controller.scan();
        // Повертаємось на якусь розумну позицію (наприклад в меню)
        Controller.idx = 0;
        Controller.focus(); 
    }, 100);
}


// --- START ---
window.onload = () => {
    // Годинник
    setInterval(() => {
        let d = new Date();
        document.getElementById('clock').innerText = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }, 1000);

    // КЛАВІАТУРА / ПУЛЬТ
    document.addEventListener('keydown', e => {
        if(e.code === 'ArrowRight') Controller.move('right');
        if(e.code === 'ArrowLeft') Controller.move('left');
        if(e.code === 'ArrowDown') Controller.move('down');
        if(e.code === 'ArrowUp') Controller.move('up');
        if(e.code === 'Enter') Controller.enter();
        if(e.code === 'Escape' || e.code === 'Backspace') closeModal();
    });

    // МИШКА (КЛІКИ)
    document.body.addEventListener('click', (e) => {
        // Шукаємо клікабельний елемент
        const target = e.target.closest('.menu-btn, .search-btn, .settings-item, .modal-btn');
        if (target) {
            // Оновлюємо індекс контролера, щоб фокус стрибнув туди
            Controller.scan();
            const index = Controller.targets.indexOf(target);
            if (index !== -1) {
                Controller.idx = index;
                Controller.focus();
                Controller.enter(); // Виконуємо дію
            }
        }
    });
    
    // Клік по кнопці пошуку
    const searchBtn = document.getElementById('do-search');
    if(searchBtn) {
        searchBtn.onclick = doSearch;
    }

    // Запуск
    showScreen('main');
    console.log('XOTT Core Loaded (Proxy Enabled)');
};
