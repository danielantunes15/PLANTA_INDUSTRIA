const API_URL_SIM = 'http://localhost:3000';

window.SIMULATION_STATE = {}; 

const FALLBACK_HOSTS = [
    { id: 'REFEITORIO', name: 'Refeitório' }, { id: 'CPD', name: 'CPD' },
    { id: 'OLD', name: 'OLD' }, { id: 'SUPERVISAO', name: 'Supervisão' },
    { id: 'COI', name: 'COI' }, { id: 'PCTS', name: 'PCTS' },
    { id: 'BALANCA', name: 'Balança' }, { id: 'PORTARIA', name: 'Portaria' },
    { id: 'VINHACA', name: 'Vinhaça' }
];

// Cache local para renderização instantânea
let cachedHosts = FALLBACK_HOSTS;

window.toggleSimPanel = function() {
    const panel = document.getElementById('sim-panel');
    const wasOpen = panel.classList.contains('open');
    document.querySelectorAll('.editor-sidebar').forEach(el => el.classList.remove('open'));
    if (!wasOpen) {
        panel.classList.add('open');
        
        // --- OTIMIZAÇÃO: RENDERIZAÇÃO INSTANTÂNEA ---
        renderSimList(cachedHosts);
        
        // Busca atualização em background
        loadSimStatus();
    }
};

window.toggleSimulation = async function(sectorId, forceOffline) {
    if(forceOffline) window.SIMULATION_STATE[sectorId] = true;
    else delete window.SIMULATION_STATE[sectorId];
    
    // Atualiza visualmente NA HORA
    renderSimList(cachedHosts);

    try {
        await fetch(`${API_URL_SIM}/simulation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: sectorId, active: forceOffline })
        });
    } catch (error) { console.warn("Simulação local (Backend offline)"); }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('sim-panel')) {
        const panelHTML = `
        <div id="sim-panel" class="editor-sidebar">
            <div class="editor-header" style="background: rgba(250, 204, 21, 0.05);">
                <h3 style="color: #facc15;"><i class="fas fa-bolt"></i> Simulador</h3>
                <button class="close-btn" onclick="toggleSimPanel()"><i class="fas fa-times"></i></button>
            </div>
            <div class="editor-body">
                <p style="font-size:12px; color:#94a3b8; margin-bottom:20px;">Force paradas para testar alertas.</p>
                <div id="sim-list" class="links-container"></div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', panelHTML);
    }
    // Pré-carregamento silencioso
    loadSimStatus();
});

async function loadSimStatus() {
    // 1. Atualiza lista de hosts (se servidor estiver online)
    try {
        const resHosts = await fetch(`${API_URL_SIM}/hosts`);
        const data = await resHosts.json();
        if(data && data.length > 0) cachedHosts = data;
    } catch(e) { } // Mantém o fallback se falhar

    // 2. Atualiza estado da simulação
    try {
        const resSim = await fetch(`${API_URL_SIM}/simulation`);
        const serverState = await resSim.json();
        window.SIMULATION_STATE = { ...window.SIMULATION_STATE, ...serverState };
    } catch(e) { }

    // Re-renderiza com dados frescos (se o painel estiver aberto)
    if(document.getElementById('sim-panel').classList.contains('open')) {
        renderSimList(cachedHosts);
    }
}

function renderSimList(hosts) {
    const list = document.getElementById('sim-list');
    // Verifica se a lista mudou para evitar "piscar" desnecessário do DOM
    // Mas como é rápido, limpar e refazer garante consistência
    list.innerHTML = '';
    
    hosts.forEach(host => {
        const isDown = window.SIMULATION_STATE[host.id] === true;
        const item = document.createElement('div');
        item.className = 'link-item';
        item.style.justifyContent = 'space-between';
        
        item.innerHTML = `
            <div><strong style="color:#e2e8f0; font-size:13px;">${host.name}</strong><br><small style="color:#64748b">${host.id}</small></div>
            <button onclick="toggleSimulation('${host.id}', ${!isDown})" 
                class="btn-mini" style="background:${isDown ? '#fb7185' : '#334155'}; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; width:100px;">
                ${isDown ? '<i class="fas fa-ban"></i> PARADO' : '<i class="fas fa-check"></i> Normal'}
            </button>
        `;
        list.appendChild(item);
    });
}