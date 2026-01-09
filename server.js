const express = require('express');
const ping = require('ping');
const cors = require('cors');
const supabase = require('./supabase');

const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO ---
const PING_INTERVAL = 3 * 60 * 1000; // 3 Minutos (Conforme solicitado)

const PING_CONFIG = {
    timeout: 10,
    extra: ['-i', '1']
};

let cachedStatus = [];

// --- DADOS DE FALLBACK (BACKUP) ---
const FALLBACK_DATA = [
    { id: 'REFEITORIO', name: 'Refeitório', ip: '192.168.39.1' },
    { id: 'CPD', name: 'CPD', ip: '192.168.36.53' },
    { id: 'OLD', name: 'OLD', ip: '192.168.36.60' },
    { id: 'SUPERVISAO', name: 'Supervisão', ip: '192.168.36.14' },
    { id: 'COI', name: 'COI', ip: '192.168.36.15' },
    { id: 'PCTS', name: 'PCTS', ip: '192.168.36.17' },
    { id: 'BALANCA', name: 'Balança', ip: '192.168.36.18' },
    { id: 'PORTARIA', name: 'Portaria', ip: '192.168.36.19' },
    { id: 'VINHACA', name: 'Vinhaça', ip: '192.168.36.20' }
];

// --- FUNÇÃO DE PING AUTOMÁTICO ---
async function runPingCycle() {
    console.log(`\n[${new Date().toLocaleTimeString()}] --- Iniciando Ciclo de Ping Detalhado ---`);
    
    let hosts = [];
    let allDevices = [];

    // 1. Busca HOSTS e DISPOSITIVOS do Banco
    try { 
        const { data: hostData } = await supabase.from('hosts').select('*').order('name');
        hosts = (hostData && hostData.length > 0) ? hostData : FALLBACK_DATA;

        const { data: devData } = await supabase.from('devices').select('*');
        allDevices = devData || [];
    } catch (e) { 
        console.error("Erro Supabase/Fallback:", e.message);
        hosts = FALLBACK_DATA; 
    }

    const results = [];
    const checkTime = new Date().toLocaleString('pt-BR'); 

    // 2. Loop principal (Por Setor)
    for(let host of hosts){
        // A. Ping no Switch Principal do Setor
        let hostAlive = false;
        let hostLatency = 'timeout';
        const hostIp = host.ip ? host.ip.trim() : null;

        if(hostIp) {
            try {
                const res = await ping.promise.probe(hostIp, PING_CONFIG);
                hostAlive = res.alive;
                hostLatency = hostAlive ? res.time + 'ms' : 'timeout';
            } catch (err) { hostAlive = false; }
        }

        // B. Ping nos Dispositivos Deste Setor (Impressoras, Câmeras...)
        const sectorDevices = allDevices.filter(d => d.sector_id === host.id);
        const deviceStatuses = [];

        for (let dev of sectorDevices) {
            let devAlive = false;
            if(dev.ip) {
                try {
                    const resDev = await ping.promise.probe(dev.ip.trim(), PING_CONFIG);
                    devAlive = resDev.alive;
                } catch(e) {}
            }
            deviceStatuses.push({
                name: dev.name,
                ip: dev.ip,
                online: devAlive
            });
            console.log(`   -> Device [${host.id}] ${dev.name}: ${devAlive ? 'OK' : 'FALHA'}`);
        }

        // Lógica de Alerta: Se o host caiu OU algum device caiu
        const anyDeviceDown = deviceStatuses.some(d => !d.online);
        const isCritical = !hostAlive || anyDeviceDown;

        // 3. Registro de Histórico (Se mudou de status para erro)
        const previous = cachedStatus.find(c => c.id === host.id);
        const wasClean = previous ? (!previous.hasIssue) : true;

        if (wasClean && isCritical) {
            const reason = !hostAlive ? "Switch Offline" : "Falha em Equipamento";
            logHistory(host.id, reason);
        }

        results.push({
            id: host.id,
            name: host.name,
            ip: hostIp,
            online: hostAlive, // Status do Switch
            devices: deviceStatuses, // Lista de equipamentos
            hasIssue: isCritical, // Flag global de problema no setor
            latency: hostLatency,
            last_check: checkTime
        });

        console.log(`> Setor ${host.name}: ${isCritical ? 'ALERTA 🔴' : 'NORMAL 🟢'}`);
    }

    cachedStatus = results;
    console.log(`Ciclo concluído.\n`);
}

// Inicia
runPingCycle();
setInterval(runPingCycle, PING_INTERVAL);

// --- ROTAS ---

app.get('/status-rede', (req, res) => res.json(cachedStatus));

// CRUD Hosts (Switches)
app.get('/hosts', async (req, res) => {
    const { data } = await supabase.from('hosts').select('*').order('name');
    res.json(data || []);
});
app.post('/hosts', async (req, res) => {
    const { error } = await supabase.from('hosts').upsert(req.body, { onConflict: 'id' });
    if (error) return res.status(500).json({error: error.message});
    res.json({ success: true });
});

// CRUD Devices (Novos Equipamentos)
app.get('/devices', async (req, res) => {
    const { sector } = req.query;
    let query = supabase.from('devices').select('*');
    if(sector) query = query.eq('sector_id', sector);
    
    const { data, error } = await query;
    if(error) return res.status(500).json([]);
    res.json(data);
});

app.post('/devices', async (req, res) => {
    // Recebe { sector_id, name, ip }
    const { error } = await supabase.from('devices').insert(req.body);
    if(error) return res.status(500).json({error: error.message});
    res.json({ success: true });
});

app.delete('/devices/:id', async (req, res) => {
    const { error } = await supabase.from('devices').delete().eq('id', req.params.id);
    if(error) return res.status(500).json({error: error.message});
    res.json({ success: true });
});

// Histórico
app.get('/history', async (req, res) => {
    const { data } = await supabase.from('history').select('*').order('timestamp', { ascending: false }).limit(50);
    res.json(data || []);
});
app.delete('/history', async (req, res) => {
    await supabase.from('history').delete().gt('id', 0);
    res.json({ success: true });
});

async function logHistory(sectorId, reason) {
    try {
        await supabase.from('history').insert([{
            timestamp: new Date().toISOString(),
            sector: sectorId,
            duration: reason
        }]);
    } catch(e) {}
}

app.listen(3000, () => console.log('Monitoramento Avançado Rodando na porta 3000!'));