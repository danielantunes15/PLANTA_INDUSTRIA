const express = require('express');
const ping = require('ping');
const cors = require('cors');
const supabase = require('./supabase');

const app = express();

app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO
const PING_INTERVAL = 5 * 60 * 1000; // 5 Minutos

// Cache em memória
let cachedStatus = [];

// Dados de Fallback (Padrão)
const FALLBACK_DATA = [
    { id: 'REFEITORIO', name: 'Refeitório', ip: '192.168.39.1' },
    { id: 'CPD', name: 'CPD', ip: '192.168.36.53' }
];

// --- FUNÇÃO DE PING AUTOMÁTICO ---
async function runPingCycle() {
    console.log(`[${new Date().toLocaleTimeString()}] Iniciando Ping Geral...`);
    
    // 1. Busca lista do Banco (ou usa fallback)
    let hosts = [];
    try { 
        const { data } = await supabase.from('hosts').select('*').order('name'); // Ordena por nome para facilitar leitura
        hosts = (data && data.length > 0) ? data : FALLBACK_DATA;
    } catch (e) { hosts = FALLBACK_DATA; }

    const results = [];
    // DATA E HORA COMPLETA
    const checkTime = new Date().toLocaleString('pt-BR'); 

    // 2. Faz o Ping
    for(let host of hosts){
        let isAlive = false;
        let latency = 'timeout';

        if(host.ip) {
            try {
                const res = await ping.promise.probe(host.ip, { timeout: 2, min_reply: 1 });
                isAlive = res.alive;
                latency = isAlive ? res.time + 'ms' : 'timeout';
            } catch (err) { isAlive = false; }
        }

        // 3. Verifica Queda para Histórico
        const previous = cachedStatus.find(c => c.id === host.id);
        if (previous && previous.online && !isAlive) {
            logHistory(host.id);
        }

        results.push({
            id: host.id,
            name: host.name,
            ip: host.ip,
            online: isAlive,
            latency: latency,
            last_check: checkTime // Agora envia Data + Hora
        });
    }

    cachedStatus = results;
    console.log(`Ciclo concluído. Atualizado: ${checkTime}`);
}

// Inicia ciclo
runPingCycle();
setInterval(runPingCycle, PING_INTERVAL);


// --- ROTAS ---
app.get('/status-rede', (req, res) => {
    // Retorna o cache para resposta instantânea
    res.json(cachedStatus);
});

app.get('/hosts', async (req, res) => {
    const { data } = await supabase.from('hosts').select('*').order('name');
    res.json(data || []);
});

app.post('/hosts', async (req, res) => {
    await supabase.from('hosts').upsert(req.body, { onConflict: 'id' });
    res.json({ success: true });
    // runPingCycle(); // Opcional: forçar ping ao salvar
});

app.get('/history', async (req, res) => {
    const { data } = await supabase.from('history').select('*').order('timestamp', { ascending: false }).limit(50);
    res.json(data || []);
});

app.delete('/history', async (req, res) => {
    await supabase.from('history').delete().gt('id', 0);
    res.json({ success: true });
});

async function logHistory(sectorId) {
    await supabase.from('history').insert([{
        timestamp: new Date().toISOString(),
        sector: sectorId,
        duration: "Falha de Ping"
    }]);
}

app.listen(3000, () => console.log('Servidor de Monitoramento Rodando!'));