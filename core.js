// 1. Емуляція сховища (Settings)
const Storage = {
    data: {},
    get: function(name, def) {
        return localStorage.getItem(name) || def;
    },
    set: function(name, val) {
        localStorage.setItem(name, val);
        this.data[name] = val;
    }
};

// 2. Емуляція подій (Listener)
const Listener = {
    events: {},
    follow: function(name, callback) {
        if (!this.events[name]) this.events[name] = [];
        this.events[name].push(callback);
    },
    send: function(name, data) {
        if (this.events[name]) {
            this.events[name].forEach(cb => cb(data));
        }
    }
};

// 3. Інструменти для завантаження скриптів (Utils)
const Utils = {
    putScriptAsync: function(urls, callback) {
        if (!Array.isArray(urls)) urls = [urls];
        
        let loaded = 0;
        urls.forEach(url => {
            let script = document.createElement('script');
            script.src = url;
            script.onload = () => {
                loaded++;
                console.log('Plugin loaded:', url);
                if (loaded === urls.length && callback) callback();
            };
            script.onerror = () => {
                console.error('Failed to load:', url);
            };
            document.head.appendChild(script);
        });
    }
};

// 4. СБИРАЄМО ГЛОБАЛЬНИЙ ОБ'ЄКТ LAMPA
window.Lampa = {
    Listener: Listener,
    Storage: Storage,
    Utils: Utils,
    Manifest: { app_digital: 300 }, // Версія, щоб плагіни думали що це нова лампа
    Params: { values: {} }
};

// 5. Повідомляємо плагінам, що "Лампа завантажилась"
window.onload = function() {
    console.log('Lampa Zero Core Started');
    
    // Багато плагінів чекають на цю подію
    setTimeout(() => {
        window.appready = true; // Для старих плагінів
        Lampa.Listener.send('app', { type: 'ready' });
        
        document.getElementById('plugin-status').innerText = 'Ядро запущено. Готовий до плагінів.';
        
        // --- ТУТ МИ БУДЕМО ВРУЧНУ ВМИКАТИ ПЛАГІНИ ---
        // Наприклад, спробуємо завантажити простий скрипт
        // Lampa.Utils.putScriptAsync(['посилання_на_плагін.js']);
    }, 500);
};

// Проста навігація клавіатурою (для тесту на ПК)
document.addEventListener('keydown', (e) => {
    // Тут потім напишемо повноцінний контролер
    console.log('Key:', e.code);
});

