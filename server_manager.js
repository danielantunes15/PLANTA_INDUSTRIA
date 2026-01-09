const API_URL = 'http://localhost:3000';

// DADOS PADRÃO (FALLBACK) - Garante que o menu abra PREENCHIDO instantaneamente
const DEFAULT_HOSTS = [
    { id: 'REFEITORIO', name: 'Refeitório', equipment: '01 Switch Mikrotik - SW1 - Refeitório', ip: '192.168.39.1' },
    { id: 'CPD', name: 'CPD', equipment: '01 Switch Mikrotik - SW1 Administrativo', ip: '192.168.36.53' },
    { id: 'OLD', name: 'OLD', equipment: '01 Switch Mikrotik CSS326-24G-2S+RM', ip: '192.168.36.60' },
    { id: 'SUPERVISAO', name: 'Supervisão', equipment: '01 Switch Baseline 3com 2928-PWR OFICINA', ip: '192.168.36.14' },
    { id: 'COI', name: 'COI', equipment: '01 Switch Baseline 3com 2928-PWR COI', ip: '192.168.36.15' },
    { id: 'PCTS', name: 'PCTS', equipment: '01 Switch Baseline 3com 2928-PWR PCTS', ip: '192.168.36.17' },
    { id: 'BALANCA', name: 'Balança', equipment: '01 Switch Baseline 3com 2928-PWR BALANÇA', ip: '192.168.36.18' },
    { id: 'PORTARIA', name: 'Portaria', equipment: 'Switch Portaria', ip: '192.168.36.19' },
    { id: 'VINHACA', name: 'Vinhaça', equipment: 'Rádio Link', ip: '192.168.36.20' }
];

// Inicia JÁ com os dados padrão (não começa vazio)
let currentHosts = [...DEFAULT_HOSTS]; 

window.toggleServerPanel = function() {
    const panel = document.getElementById('server-panel');
    const wasOpen = panel.classList.contains('open');

    // 1. Fecha outros painéis para não sobrepor
    document.querySelectorAll('.editor-sidebar').forEach(el => el.classList.remove('open'));

    // 2. Abre este
    if (!wasOpen) {
        panel.classList.add('open');
        
        // --- OTIMIZAÇÃO: RENDERIZA IMEDIATAMENTE (Sem esperar o servidor) ---
        renderTable(); 
        
        // Atualiza dados em segundo plano (silenciosamente)
        loadHostsData();
    }
};

window.saveHostsData = async function() {
    // Captura valores dos inputs
    currentHosts.forEach((host, index) => {
        const equipInput = document.getElementById(`equip-${index}`);
        const ipInput = document.getElementById(`ip-${index}`);
        if(equipInput) host.equipment = equipInput.value;
        if(ipInput) host.ip = ipInput.value;
    });

    try {
        const res = await fetch(`${API_URL}/hosts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentHosts)
        });
        
        if(res.ok) {
            alert("Dados salvos e atualizados!");
            toggleServerPanel();
        } else {
            alert("Erro ao salvar no servidor.");
        }
    } catch (error) {
        // Se der erro, salva visualmente na sessão atual
        alert("Modo Offline: Dados salvos temporariamente (Backend não encontrado).");
        toggleServerPanel();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Injeta HTML se não existir
    if (!document.getElementById('server-panel')) {
        const panelHTML = `
        <div id="server-panel" class="editor-sidebar wide">
            <div class="editor-header" style="background: rgba(45, 212, 191, 0.05);">
                <h3 style="color: #2dd4bf;"><i class="fas fa-server"></i> Configuração de Servidores</h3>
                <button class="close-btn" onclick="toggleServerPanel()"><i class="fas fa-times"></i></button>
            </div>
            <div class="editor-body">
                <p style="font-size:12px; color:#94a3b8; margin-bottom: 20px;">
                    Gerencie os IPs e nomes dos equipamentos monitorados.
                </p>
                <div class="table-container">
                    <table class="server-table">
                        <thead>
                            <tr>
                                <th style="width: 15%">Setor</th>
                                <th style="width: 55%">Equipamento</th>
                                <th style="width: 30%">IP</th>
                            </tr>
                        </thead>
                        <tbody id="server-tbody"></tbody>
                    </table>
                </div>
                <div style="margin-top: 20px; display:flex; gap:10px;">
                    <button onclick="saveHostsData()" class="btn-resolve" style="background:#2dd4bf; color:#0f172a;">Salvar Alterações</button>
                    <button onclick="toggleServerPanel()" class="btn-resolve" style="background:transparent; border:1px solid #475569; color:#cbd5e1;">Cancelar</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', panelHTML);
    }
    
    // Tenta buscar dados novos do servidor em background
    loadHostsData();
});

async function loadHostsData() {
    try {
        const res = await fetch(`${API_URL}/hosts`);
        const data = await res.json();
        
        // Só atualiza se vier dados válidos e diferentes
        if (Array.isArray(data) && data.length > 0) {
            currentHosts = data;
            
            // Se o painel estiver aberto, atualiza a tela
            if(document.getElementById('server-panel').classList.contains('open')) {
                renderTable();
            }
        }
    } catch (e) {
        console.warn("Backend offline. Mantendo dados padrão (Instantâneo).");
    }
}

function renderTable() {
    const tbody = document.getElementById('server-tbody');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    
    currentHosts.forEach((host, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold; color:#cbd5e1; font-size:12px;">${host.id}</td>
            <td>
                <input type="text" class="table-input" id="equip-${index}" value="${host.equipment || ''}" placeholder="Nome do equipamento">
            </td>
            <td>
                <input type="text" class="table-input" id="ip-${index}" value="${host.ip || ''}" placeholder="0.0.0.0">
            </td>
        `;
        tbody.appendChild(tr);
    });
}