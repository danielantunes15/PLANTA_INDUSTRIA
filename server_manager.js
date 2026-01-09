const API_URL = 'http://localhost:3000';
let currentHosts = []; // Cache local

window.toggleServerPanel = function() {
    const panel = document.getElementById('server-panel');
    const wasOpen = panel.classList.contains('open');

    // 1. Fecha outros painéis
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
            alert("Dados salvos!");
            toggleServerPanel();
        } else alert("Erro ao salvar.");
    } catch (error) { alert("Backend Offline."); }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('server-panel')) {
        const panelHTML = `
        <div id="server-panel" class="editor-sidebar wide">
            <div class="editor-header" style="background: rgba(45, 212, 191, 0.05);">
                <h3 style="color: #2dd4bf;"><i class="fas fa-server"></i> Servidores</h3>
                <button class="close-btn" onclick="toggleServerPanel()"><i class="fas fa-times"></i></button>
            </div>
            <div class="editor-body">
                <div class="table-container">
                    <table class="server-table">
                        <thead><tr><th>Setor</th><th>Equipamento</th><th>IP</th></tr></thead>
                        <tbody id="server-tbody"></tbody>
                    </table>
                </div>
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <button onclick="saveHostsData()" class="btn-resolve" style="background:#2dd4bf; color:#0f172a;">Salvar</button>
                    <button onclick="toggleServerPanel()" class="btn-resolve" style="background:transparent; border:1px solid #fff; color:#fff;">Cancelar</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', panelHTML);
    }
    // Carrega dados iniciais na memória assim que o site abre
    loadHostsData();
});

async function loadHostsData() {
    try {
        const res = await fetch(`${API_URL}/hosts`);
        const data = await res.json();
        // Só atualiza e renderiza se houver dados novos
        if (JSON.stringify(data) !== JSON.stringify(currentHosts)) {
            currentHosts = data;
            // Se o painel estiver aberto, atualiza a visualização
            if(document.getElementById('server-panel').classList.contains('open')) {
                renderTable();
            }
        }
    } catch (e) { console.warn("Erro ao carregar hosts (background)"); }
}

function renderTable() {
    const tbody = document.getElementById('server-tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if (currentHosts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#94a3b8">Carregando...</td></tr>';
        return;
    }

    currentHosts.forEach((host, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold; color:#cbd5e1">${host.id}</td>
            <td><input type="text" class="table-input" id="equip-${index}" value="${host.equipment || ''}"></td>
            <td><input type="text" class="table-input" id="ip-${index}" value="${host.ip || ''}"></td>
        `;
        tbody.appendChild(tr);
    });
}