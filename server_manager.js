// server_manager.js
const API_URL = 'http://localhost:3000';
let currentHosts = [];

// Garante que a função existe globalmente
window.toggleServerPanel = function() {
    const panel = document.getElementById('server-panel');
    if (panel) {
        panel.classList.toggle('open');
        if (panel.classList.contains('open')) {
            loadHostsData(); // Carrega dados ao abrir
        }
    } else {
        console.error("Painel #server-panel não encontrado no HTML");
    }
};

window.saveHostsData = async function() {
    // Atualiza array local
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
            alert("Dados salvos com sucesso!");
            toggleServerPanel();
        } else {
            alert("Erro ao salvar no servidor.");
        }
    } catch (error) {
        alert("Erro de conexão com o backend.");
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Injeta o HTML do painel se ele não existir
    if (!document.getElementById('server-panel')) {
        const panelHTML = `
        <div id="server-panel" class="editor-sidebar wide">
            <div class="editor-header">
                <h3><i class="fas fa-server"></i> Configuração de Servidores</h3>
                <button class="close-btn" onclick="toggleServerPanel()"><i class="fas fa-times"></i></button>
            </div>
            <div class="editor-body">
                <div class="table-container">
                    <table class="server-table">
                        <thead>
                            <tr>
                                <th>Setor</th>
                                <th>Equipamento</th>
                                <th>IP</th>
                            </tr>
                        </thead>
                        <tbody id="server-tbody"></tbody>
                    </table>
                </div>
                <div style="margin-top: 20px; display:flex; gap:10px;">
                    <button onclick="saveHostsData()" class="btn-resolve" style="background:var(--primary);">Salvar</button>
                    <button onclick="toggleServerPanel()" class="btn-resolve" style="background:#334155; color:#fff;">Cancelar</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', panelHTML);
    }
    
    // Tenta carregar os dados iniciais
    loadHostsData();
});

async function loadHostsData() {
    try {
        const res = await fetch(`${API_URL}/hosts`);
        currentHosts = await res.json();
        renderTable();
    } catch (error) {
        console.warn("Backend offline ou inacessível. Usando dados vazios.");
    }
}

function renderTable() {
    const tbody = document.getElementById('server-tbody');
    if(!tbody) return;
    
    tbody.innerHTML = '';
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