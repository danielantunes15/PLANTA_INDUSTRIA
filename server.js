const express = require('express');
const ping = require('ping');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

const HOSTS_PATH = './hosts.json';
const HISTORY_PATH = './history.json';

// Estado em memória
let simulationOverrides = {}; 
let hostStatusMemory = {}; 

// Dados padrão (Fallback)
const initialData = [
    { id: 'REFEITORIO', name: 'Refeitório', equipment: 'Switch Mikrotik', ip: '192.168.39.1' },
    { id: 'CPD', name: 'CPD', equipment: 'Switch Adm', ip: '192.168.36.53' },
    { id: 'OLD', name: 'OLD', equipment: 'Switch Mikrotik CSS', ip: '192.168.36.60' },
    { id: 'SUPERVISAO', name: 'Supervisão', equipment: 'Switch Oficina', ip: '192.168.36.14' },
    { id: 'COI', name: 'COI', equipment: 'Switch COI', ip: '192.168.36.15' },
    { id: 'PCTS', name: 'PCTS', equipment: 'Switch PCTS', ip: '192.168.36.17' },
    { id: 'BALANCA', name: 'Balança', equipment: 'Switch Balança', ip: '192.168.36.18' },
    { id: 'PORTARIA', name: 'Portaria', equipment: 'Switch Portaria', ip: '192.168.36.19' },
    { id: 'VINHACA', name: 'Vinhaça', equipment: 'Radio Link', ip: '192.168.36.20' }
];

// Inicialização dos arquivos
if (!fs.existsSync(HOSTS_PATH)) fs.writeFileSync(HOSTS_PATH, JSON.stringify(initialData, null, 2));
if (!fs.existsSync(HISTORY_PATH)) fs.writeFileSync(HISTORY_PATH, JSON.stringify([], null, 2));

// --- ROTAS ---

app.get('/hosts', (req, res) => {
    try { res.json(JSON.parse(fs.readFileSync(HOSTS_PATH))); } 
    catch (e) { res.json(initialData); }
});

app.post('/hosts', (req, res) => {
    try {
        fs.writeFileSync(HOSTS_PATH, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Erro ao salvar" }); }
});

app.get('/simulation', (req, res) => res.json(simulationOverrides));

app.post('/simulation', (req, res) => {
    const { id, active } = req.body;
    if (active) simulationOverrides[id] = true;
    else delete simulationOverrides[id];
    res.json({ success: true });
});

app.get('/history', (req, res) => {
    try { res.json(JSON.parse(fs.readFileSync(HISTORY_PATH))); }
    catch (e) { res.json([]); }
});

app.delete('/history', (req, res) => {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify([], null, 2));
    res.json({ success: true });
});

function logHistory(sectorId) {
    try {
        const history = JSON.parse(fs.readFileSync(HISTORY_PATH));
        history.push({
            timestamp: new Date().toISOString(),
            sector: sectorId,
            duration: "Detectado"
        });
        if (history.length > 50) history.shift();
        fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
    } catch (e) { console.error(e); }
}

// ROTA PRINCIPAL DE MONITORAMENTO
app.get('/status-rede', async (req, res) => {
    let hosts = [];
    try { hosts = JSON.parse(fs.readFileSync(HOSTS_PATH)); } 
    catch (e) { hosts = initialData; }

    const results = [];
    
    for(let host of hosts){
        let isAlive = false;
        let time = 'timeout';

        // 1. Verifica Simulação
        if (simulationOverrides[host.id]) {
            isAlive = false; // Força offline
            time = 'SIMULATED_DOWN';
        } else {
            // 2. Ping Real
            try {
                const resPing = await ping.promise.probe(host.ip, { timeout: 1, min_reply: 1 });
                isAlive = resPing.alive;
                time = resPing.time;
            } catch (err) { isAlive = false; }
        }

        // 3. Registro de Histórico (Borda de descida: Online -> Offline)
        const previousState = hostStatusMemory[host.id];
        if ((previousState === true || previousState === undefined) && isAlive === false) {
            logHistory(host.id);
        }
        hostStatusMemory[host.id] = isAlive;

        results.push({
            id: host.id,
            online: isAlive,
            time: time,
            equipment: host.equipment,
            ip: host.ip
        });
    }
    
    res.json(results);
});

app.listen(3000, () => console.log('Servidor rodando na porta 3000'));