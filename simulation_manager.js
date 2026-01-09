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

    // Loading sutil se estiver vazio
    if(list.children.length === 0) 
        list.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:20px;">Carregando status...</div>';

    try {
        const response = await fetch(`${API_URL_MONITOR}/status-rede`);
        const data = await response.json();
        
        list.innerHTML = '';
        
        if(!data || data.length === 0) {
            list.innerHTML = '<div style="text-align:center; color:#94a3b8">Nenhum servidor configurado.</div>';
            return;
        }

        data.forEach(host => {
            // Definições visuais
            const isOnline = host.online;
            const color = isOnline ? '#2dd4bf' : '#fb7185'; // Verde ou Vermelho
            const statusLabel = isOnline ? 'ATIVO' : 'PARADO';
            const icon = isOnline ? 'fa-check-circle' : 'fa-times-circle';
            // Pega a data/hora vinda do servidor ou usa "Pendente"
            const lastUpdate = host.last_check || 'Aguardando...'; 

            const item = document.createElement('div');
            item.className = 'link-item';
            
            // Estilo flex para alinhar: [Nome/IP] ------------ [Status | Data]
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.padding = '15px';
            item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

            item.innerHTML = `
                <div style="flex-grow:1;">
                    <strong style="color:#f8fafc; font-size:14px; display:block;">${host.name}</strong>
                    <small style="color:#64748b; font-family:monospace; font-size:11px;">${host.ip}</small>
                </div>
                
                <div style="text-align:right; min-width: 140px;">
                    <div style="color:${color}; font-weight:800; font-size:12px; margin-bottom:4px;">
                        <i class="fas ${icon}"></i> ${statusLabel}
                    </div>
                    <div style="font-size:10px; color:#94a3b8;">
                        <i class="far fa-clock"></i> ${lastUpdate}
                    </div>
                </div>
            `;
            list.appendChild(item);
        });

    } catch (error) {
        console.error(error);
        list.innerHTML = `<div style="color:#fb7185; text-align:center; padding:20px;">Erro de conexão com o servidor.</div>`;
    }
}

// Atualiza a cada 5s apenas se o painel estiver visível
setInterval(() => {
    const panel = document.getElementById('sim-panel');
    if (panel && panel.classList.contains('open')) {
        updateRealTimeList();
    }
}, 5000);

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('sim-panel')) {
        const panelHTML = `
        <div id="sim-panel" class="editor-sidebar wide">
            <div class="editor-header" style="background: rgba(45, 212, 191, 0.05);">
                <h3 style="color: #2dd4bf;"><i class="fas fa-satellite-dish"></i> Monitoramento em Tempo Real</h3>
                <button class="close-btn" onclick="toggleSimPanel()"><i class="fas fa-times"></i></button>
            </div>
            <div class="editor-body">
                <div style="margin-bottom:15px; padding:10px; border-radius:8px; background:rgba(15,23,42,0.5); border:1px solid rgba(255,255,255,0.05);">
                    <p style="font-size:11px; color:#94a3b8; margin:0;">
                        <i class="fas fa-sync-alt fa-spin" style="margin-right:5px;"></i> Atualização automática a cada 3 minutos.
                    </p>
                </div>
                <div id="sim-list" class="links-container"></div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', panelHTML);
    }
});