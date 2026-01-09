const API_URL_MONITOR = 'http://localhost:3000';

window.toggleSimPanel = function() {
    const panel = document.getElementById('sim-panel');
    const wasOpen = panel.classList.contains('open');
    document.querySelectorAll('.editor-sidebar').forEach(el => el.classList.remove('open'));
    
    if (!wasOpen) {
        panel.classList.add('open');
        updateRealTimeList();
    }
};

async function updateRealTimeList() {
    const list = document.getElementById('sim-list');
    if(!list) return;

    // Loading sutil se a lista estiver vazia
    if(list.children.length === 0) 
        list.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:20px;">Carregando status...</div>';

    try {
        const response = await fetch(`${API_URL_MONITOR}/status-rede`);
        const data = await response.json();
        
        list.innerHTML = '';
        
        if(!data || data.length === 0) {
            list.innerHTML = '<div style="text-align:center; color:#94a3b8">Nenhum dispositivo encontrado.</div>';
            return;
        }

        // --- 1. CATEGORIA: SERVIDORES / SWITCHES ---
        // Cria o título da seção
        const headerServers = document.createElement('div');
        headerServers.innerHTML = `
            <h4 style="color:#2dd4bf; margin:10px 0 10px 5px; font-size:10px; text-transform:uppercase; letter-spacing:1px; opacity:0.8;">
                <i class="fas fa-server"></i> Servidores & Switches
            </h4>`;
        list.appendChild(headerServers);

        // Lista os Hosts Principais
        data.forEach(host => {
            list.appendChild(createStatusCard(host.name, host.ip, host.online, host.last_check));
        });

        // --- 2. CATEGORIA: EQUIPAMENTOS / ENDPOINTS ---
        // Extrai todos os devices de dentro dos setores
        let allDevices = [];
        data.forEach(host => {
            if(host.devices && host.devices.length > 0) {
                host.devices.forEach(dev => {
                    allDevices.push({
                        name: dev.name,
                        ip: dev.ip,
                        online: dev.online,
                        last_check: host.last_check, // Usa o horário do setor pai
                        sectorName: host.name
                    });
                });
            }
        });

        // Se houver equipamentos, cria a seção
        if(allDevices.length > 0) {
            const headerEquip = document.createElement('div');
            headerEquip.innerHTML = `
                <h4 style="color:#facc15; margin:30px 0 10px 5px; font-size:10px; text-transform:uppercase; letter-spacing:1px; opacity:0.8; border-top:1px solid rgba(255,255,255,0.1); padding-top:20px;">
                    <i class="fas fa-print"></i> Equipamentos
                </h4>`;
            list.appendChild(headerEquip);

            // Ordena por nome para ficar organizado
            allDevices.sort((a,b) => a.name.localeCompare(b.name));

            allDevices.forEach(dev => {
                // Monta nome com o setor visualmente destacado
                const displayName = `
                    <span>${dev.name}</span>
                    <span style="display:block; font-size:10px; color:#64748b; font-weight:normal;">
                        <i class="fas fa-map-marker-alt" style="font-size:9px"></i> ${dev.sectorName}
                    </span>
                `;
                list.appendChild(createStatusCard(displayName, dev.ip, dev.online, dev.last_check, true));
            });
        }

    } catch (error) {
        console.error(error);
        list.innerHTML = `<div style="color:#fb7185; text-align:center; padding:20px;">Erro de conexão com o servidor.</div>`;
    }
}

// Função auxiliar para criar o visual do Card (usado para ambos)
function createStatusCard(nameHTML, ip, isOnline, lastUpdate, isRichText = false) {
    const color = isOnline ? '#2dd4bf' : '#fb7185'; 
    const statusLabel = isOnline ? 'ONLINE' : 'OFFLINE';
    const icon = isOnline ? 'fa-check-circle' : 'fa-times-circle';
    const bg = isOnline ? 'rgba(255,255,255,0.02)' : 'rgba(251, 113, 133, 0.1)'; // Fundo vermelho leve se offline

    const item = document.createElement('div');
    item.className = 'link-item';
    item.style.cssText = `
        display:flex; justify-content:space-between; align-items:center; 
        padding:12px; margin-bottom:6px; border-radius:8px;
        background: ${bg}; border: 1px solid rgba(255,255,255,0.05);
        transition: transform 0.2s;
    `;
    
    // Efeito hover simples
    item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.05)';
    item.onmouseleave = () => item.style.background = bg;

    // Se o nome for HTML (com setor embaixo), usa innerHTML, senão texto simples
    const nameContent = isRichText ? nameHTML : `<div style="font-weight:600; color:#f8fafc; font-size:13px;">${nameHTML}</div>`;

    item.innerHTML = `
        <div style="flex-grow:1;">
            ${nameContent}
            <small style="color:#94a3b8; font-family:monospace; font-size:11px; display:block; margin-top:2px;">${ip || 'IP N/A'}</small>
        </div>
        
        <div style="text-align:right; min-width: 90px;">
            <div style="color:${color}; font-weight:800; font-size:11px; margin-bottom:3px;">
                <i class="fas ${icon}"></i> ${statusLabel}
            </div>
            <div style="font-size:10px; color:#64748b;">
                ${lastUpdate || '...'}
            </div>
        </div>
    `;
    return item;
}

// Atualiza a cada 5s apenas se o painel estiver visível
setInterval(() => {
    const panel = document.getElementById('sim-panel');
    if (panel && panel.classList.contains('open')) {
        updateRealTimeList();
    }
}, 5000);

// Inicializa estrutura do painel
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('sim-panel')) {
        const panelHTML = `
        <div id="sim-panel" class="editor-sidebar wide">
            <div class="editor-header" style="background: rgba(45, 212, 191, 0.05);">
                <h3 style="color: #2dd4bf;"><i class="fas fa-satellite-dish"></i> Monitoramento Tempo Real</h3>
                <button class="close-btn" onclick="toggleSimPanel()"><i class="fas fa-times"></i></button>
            </div>
            <div class="editor-body">
                <div style="margin-bottom:15px; padding:10px; border-radius:8px; background:rgba(15,23,42,0.5); border:1px solid rgba(255,255,255,0.05);">
                    <p style="font-size:11px; color:#94a3b8; margin:0;">
                        <i class="fas fa-sync-alt fa-spin" style="margin-right:5px;"></i> Atualizando automaticamente...
                    </p>
                </div>
                <div id="sim-list" class="links-container"></div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', panelHTML);
    }
});