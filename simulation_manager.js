const API_URL_SIM = 'http://localhost:3000';

// TORNA O ESTADO ACESSÍVEL PARA O SCRIPT.JS
window.SIMULATION_STATE = {}; 

const FALLBACK_HOSTS = [
    { id: 'REFEITORIO', name: 'Refeitório' }, { id: 'CPD', name: 'CPD' },
    { id: 'OLD', name: 'OLD' }, { id: 'SUPERVISAO', name: 'Supervisão' },
    { id: 'COI', name: 'COI' }, { id: 'PCTS', name: 'PCTS' },
    { id: 'BALANCA', name: 'Balança' }, { id: 'PORTARIA', name: 'Portaria' },
    { id: 'VINHACA', name: 'Vinhaça' }
];

window.toggleSimPanel = function() {
    const panel = document.getElementById('sim-panel');
    const wasOpen = panel.classList.contains('open');
    document.querySelectorAll('.editor-sidebar').forEach(el => el.classList.remove('open'));
    if (!wasOpen) {
        panel.classList.add('open');
        loadSimStatus();
    }
};

window.toggleSimulation = async function(sectorId, forceOffline) {
    // 1. ATUALIZAÇÃO VISUAL IMEDIATA (Sem esperar servidor)
    if(forceOffline) {
        window.SIMULATION_STATE[sectorId] = true;
    } else {
        delete window.SIMULATION_STATE[sectorId];
    }
    
    // Atualiza os botões do menu
    loadSimStatus(); 

    // 2. TENTA AVISAR O SERVIDOR
    try {
        await fetch(`${API_URL_SIM}/simulation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: sectorId, active: forceOffline })
        });
    } catch (error) {
        console.warn("Backend offline, usando simulação local.");
    }
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
});

async function loadSimStatus() {
    let hosts = [];
    try {
        const resHosts = await fetch(`${API_URL_SIM}/hosts`);
        hosts = await resHosts.json();
        if(!hosts || hosts.length === 0) throw new Error();
    } catch(e) { hosts = FALLBACK_HOSTS; }

    // Atualiza o estado visual com base no que já temos localmente ou busca do server
    try {
        const resSim = await fetch(`${API_URL_SIM}/simulation`);
        const serverState = await resSim.json();
        // Mescla estado do servidor com o local
        window.SIMULATION_STATE = { ...window.SIMULATION_STATE, ...serverState };
    } catch(e) { }

    renderSimList(hosts);
}

function renderSimList(hosts) {
    const list = document.getElementById('sim-list');
    list.innerHTML = '';
    hosts.forEach(host => {
        // Verifica na variável GLOBAL
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