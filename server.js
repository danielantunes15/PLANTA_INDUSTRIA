// server.js
const express = require('express');
const ping = require('ping');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

const FILE_PATH = './hosts.json';

// DADOS FIXOS DA SUA IMAGEM
// Mantive PORTARIA e VINHACA como extras para não quebrar o mapa 3D (que procura por esses IDs)
const initialData = [
    { id: 'REFEITORIO', name: 'Refeitório', equipment: '01 Switch Mikrotik - SW1 - Refeitório', ip: '192.168.39.1' },
    { id: 'CPD', name: 'CPD', equipment: '01 Switch Mikrotik - SW1 Administrativo', ip: '192.168.36.53' },
    { id: 'OLD', name: 'OLD', equipment: '01 Switch Mikrotik CSS326-24G-2S+RM', ip: '192.168.36.60' },
    { id: 'SUPERVISAO', name: 'Supervisão', equipment: '01 Switch Baseline 3com 2928-PWR OFICINA', ip: '192.168.36.14' },
    { id: 'COI', name: 'COI', equipment: '01 Switch Baseline 3com 2928-PWR COI', ip: '192.168.36.15' },
    { id: 'PCTS', name: 'PCTS', equipment: '01 Switch Baseline 3com 2928-PWR PCTS', ip: '192.168.36.17' },
    { id: 'BALANCA', name: 'Balança', equipment: '01 Switch Baseline 3com 2928-PWR BALANÇA', ip: '192.168.36.18' },
    
    // Mantidos para compatibilidade com o 3D (pode editar depois no menu)
    { id: 'PORTARIA', name: 'Portaria', equipment: 'Switch Portaria', ip: '192.168.36.19' },
    { id: 'VINHACA', name: 'Vinhaça', equipment: 'Rádio Link', ip: '192.168.36.20' }
];

// Reinicia o arquivo hosts.json com os dados fixos se ele não existir
// DICA: Se quiser forçar a reescrita dos dados da imagem, apague o arquivo hosts.json antes de rodar
if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(initialData, null, 2));
}

// Rota para LER os dados
app.get('/hosts', (req, res) => {
    try {
        const data = fs.readFileSync(FILE_PATH);
        res.json(JSON.parse(data));
    } catch (e) {
        res.json(initialData); // Fallback se der erro
    }
});

// Rota para SALVAR (Editar)
app.post('/hosts', (req, res) => {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Erro ao salvar arquivo" });
    }
});

// Rota de Ping (Protegida contra falhas de rede)
app.get('/status-rede', async (req, res) => {
    let hosts = [];
    try {
        hosts = JSON.parse(fs.readFileSync(FILE_PATH));
    } catch (e) {
        hosts = initialData;
    }

    const results = [];
    
    for(let host of hosts){
        let isAlive = false;
        let time = 'timeout';

        try {
            // Ping com timeout curto para simulação não travar
            const resPing = await ping.promise.probe(host.ip, { timeout: 1, min_reply: 1 });
            isAlive = resPing.alive;
            time = resPing.time;
        } catch (err) {
            console.log(`Erro ao pingar ${host.id}: simulando offline`);
            isAlive = false;
        }

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