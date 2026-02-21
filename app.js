/ mono — Тренажер оператора | Головна логіка

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const clientList = document.getElementById('clientList');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const clientPanel = document.getElementById('clientPanel');

  let selectedClientId = null;

  // Рендер списку клієнтів
  function renderClientList(clients = FAKE_CLIENTS) {
    clientList.innerHTML = clients.map(client => `
      <div class="client-item" data-id="${client.id}">
        <div class="client-item-avatar">${client.avatar}</div>
        <div class="client-item-info">
          <div class="client-item-name">${client.name}</div>
          <div class="client-item-phone">${client.phone}</div>
        </div>
      </div>
    `).join('');

    // Обробники кліків
    clientList.querySelectorAll('.client-item').forEach(item => {
      item.addEventListener('click', () => selectClient(item.dataset.id));
    });
  }

  // Вибір клієнта
  function selectClient(clientId) {
    selectedClientId = clientId;
    const client = FAKE_CLIENTS.find(c => c.id === clientId);
    if (!client) return;

    // Оновлення активного стану
    clientList.querySelectorAll('.client-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === clientId);
    });

    // Показ панелі клієнта
    welcomeScreen.classList.add('hidden');
    clientPanel.classList.remove('hidden');

    // Заповнення даних
    document.getElementById('clientAvatar').textContent = client.avatar;
    document.getElementById('clientName').textContent = client.name;
    document.getElementById('clientPhone').textContent = client.phone;
    document.getElementById('clientStatus').textContent = client.status === 'active' ? 'Активний' : 'Заблокований';
    document.getElementById('clientTier').textContent = client.tier;
    document.getElementById('clientBalance').textContent = formatMoney(client.balance);

    // Рендер транзакцій
    renderTransactions(client.transactions);

    // Рендер карток
    renderCards(client.cards);

    // Рендер чату
    renderChat(client.chat);

    // Скидання табів
    switchTab('transactions');
  }

  // Форматування грошей
  function formatMoney(amount) {
    return amount.toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' ₴';
  }

  // Рендер транзакцій
  function renderTransactions(transactions) {
    const list = document.getElementById('transactionsList');
    list.innerHTML = transactions.map(t => `
      <div class="transaction-item">
        <div class="transaction-icon">${t.icon}</div>
        <div class="transaction-info">
          <div class="transaction-desc">${t.desc}</div>
          <div class="transaction-date">${t.date}</div>
        </div>
        <div class="transaction-amount ${t.amount >= 0 ? 'income' : 'expense'}">
          ${t.amount >= 0 ? '+' : ''}${formatMoney(t.amount)}
        </div>
      </div>
    `).join('');
  }

  // Рендер карток
  function renderCards(cards) {
    const list = document.getElementById('cardsList');
    list.innerHTML = cards.map(card => `
      <div class="card-item">
        <div class="card-number">${card.number}</div>
        <div class="card-details">
          <span>Тип: ${card.type}</span>
        </div>
        <div class="card-balance">${formatMoney(card.balance)}</div>
        <span class="card-type">mono</span>
      </div>
    `).join('');
  }

  // Рендер чату
  function renderChat(messages) {
    const container = document.getElementById('chatMessages');
    container.innerHTML = messages.map(m => `
      <div class="chat-message ${m.from}">
        <div>${m.text}</div>
        <div class="chat-message-time">${m.time}</div>
      </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  }

  // Додати повідомлення в чат
  function addChatMessage(from, text) {
    const client = FAKE_CLIENTS.find(c => c.id === selectedClientId);
    if (!client) return;

    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    client.chat.push({ from, text, time });
    renderChat(client.chat);
  }

  // Перемикання табів
  function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    });
  }

  // Пошук
  function searchClients(query) {
    if (!query.trim()) {
      renderClientList(FAKE_CLIENTS);
      return;
    }
    const q = query.toLowerCase();
    const filtered = FAKE_CLIENTS.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    );
    renderClientList(filtered);
    if (filtered.length === 1) {
      selectClient(filtered[0].id);
    }
  }

  // Обробники подій
  searchBtn.addEventListener('click', () => searchClients(searchInput.value));
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchClients(searchInput.value);
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.getElementById('sendMessageBtn').addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (text && selectedClientId) {
      addChatMessage('operator', text);
      input.value = '';
      // Симуляція відповіді клієнта
      setTimeout(() => {
        addChatMessage('client', 'Дякую за допомогу!');
      }, 1500);
    }
  });

  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('sendMessageBtn').click();
    }
  });

  // Ініціалізація
  renderClientList();
});
