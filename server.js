const express = require('express');
const ping = require('ping');
const cors = require('cors');
const supabase = require('./supabase');

const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO ---
const PING_INTERVAL = 5 * 60 * 1000; // 5 Minutos

// Configurações avançadas do Ping para evitar falsos negativos
const PING_CONFIG = {
    timeout: 10,       // AUMENTADO: 10 segundos (Windows/Firewall podem demorar)
    extra: ['-i', '1'] // Garante compatibilidade de TTL
};

// Cache em memória para resposta rápida ao Frontend
let cachedStatus = [];

// --- DADOS DE FALLBACK (BACKUP) ---
// Usado caso o Supabase falhe ou esteja vazio. 
// Contém TODOS os setores para garantir o monitoramento.
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
    console.log(`\n[${new Date().toLocaleTimeString()}] --- Iniciando Ciclo de Ping ---`);
    
    // 1. Busca lista do Banco (ou usa fallback se der erro)
    let hosts = [];
    try { 
        const { data, error } = await supabase.from('hosts').select('*').order('name');
        if (error) throw error;
        hosts = (data && data.length > 0) ? data : FALLBACK_DATA;
    } catch (e) { 
        console.error("Aviso: Erro ao buscar hosts no Supabase. Usando lista de backup interna.");
        hosts = FALLBACK_DATA; 
    }

    const results = [];
    const checkTime = new Date().toLocaleString('pt-BR'); 

    // 2. Faz o Ping em cada host
    for(let host of hosts){
        let isAlive = false;
        let latency = 'timeout';

        // TRATAMENTO IMPRESCINDÍVEL: Remove espaços que quebram o comando (ex: " 192.168.0.1 ")
        const targetIP = host.ip ? host.ip.trim() : null;

        if(targetIP) {
            try {
                // Executa o ping com o timeout aumentado
                const res = await ping.promise.probe(targetIP, PING_CONFIG);
                isAlive = res.alive;
                latency = isAlive ? res.time + 'ms' : 'timeout';
                
                // Log para você conferir no terminal se está funcionando
                console.log(`> Ping ${host.name.padEnd(15)} [${targetIP}]: ${isAlive ? 'ONLINE 🟢' : 'OFFLINE 🔴'} (${latency})`);
                
            } catch (err) { 
                console.error(`Erro ao pingar ${host.name}:`, err.message);
                isAlive = false; 
            }
        } else {
            console.warn(`> Pular ${host.name}: IP não configurado.`);
        }

        // 3. Verifica Queda para Histórico (Lógica de detecção de falha)
        const previous = cachedStatus.find(c => c.id === host.id);
        
        // Só registra se estava online antes E agora caiu (evita spam de logs se continuar offline)
        if (previous && previous.online && !isAlive) {
            logHistory(host.id);
        }

        results.push({
            id: host.id,
            name: host.name,
            ip: targetIP,
            online: isAlive,
            latency: latency,
            last_check: checkTime
        });
    }

    // Atualiza o cache global
    cachedStatus = results;
    console.log(`Ciclo concluído. Atualizado em: ${checkTime}\n`);
}

// Inicia o primeiro ciclo imediatamente e agenda os próximos
runPingCycle();
setInterval(runPingCycle, PING_INTERVAL);


// --- ROTAS DA API ---

app.get('/status-rede', (req, res) => {
    // Retorna o cache para o Frontend (resposta instantânea)
    res.json(cachedStatus);
});

app.get('/hosts', async (req, res) => {
    // Busca configurações para o painel de edição
    const { data } = await supabase.from('hosts').select('*').order('name');
    res.json(data || []);
});

app.post('/hosts', async (req, res) => {
    // Salva configurações vindas do painel
    try {
        const { error } = await supabase.from('hosts').upsert(req.body, { onConflict: 'id' });
        if (error) throw error;
        
        console.log("Configuração de IPs atualizada via painel web.");
        // Opcional: Se quiser forçar um ping assim que salvar, descomente a linha abaixo:
        // runPingCycle(); 
        
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao salvar hosts:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
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
    console.log(`[ALERTA] Registrando queda no histórico: ${sectorId}`);
    try {
        await supabase.from('history').insert([{
            timestamp: new Date().toISOString(),
            sector: sectorId,
            duration: "Falha de Ping"
        }]);
    } catch(e) { console.error("Erro ao salvar histórico:", e); }
}

app.listen(3000, () => console.log('Servidor de Monitoramento Rodando na porta 3000!'));