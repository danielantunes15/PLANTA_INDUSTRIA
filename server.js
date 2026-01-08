// server.js (O Agente de Ping)
const express = require('express');
const ping = require('ping');
const cors = require('cors');
const app = express();

app.use(cors()); // Permite que o teu site HTML acesse este servidor

// Lista de IPs dos teus setores (Exemplo)
const hosts = [
    { id: 'PORTARIA', ip: '192.168.X.X' }, // Coloque os IPs reais
    { id: 'BALANCA', ip: '192.168.X.X' },
    { id: 'PCTS', ip: '192.168.X.X' },
    { id: 'COI', ip: '127.0.0.1' },
    { id: 'SUPERVISAO', ip: '192.168.X.X' }, // Era Almoxarifado
    { id: 'OLD', ip: '192.168.X.X' },        // Era ADM Antigo
    { id: 'CPD', ip: '192.168.X.X' },        // Era ADM
    { id: 'VINHACA', ip: '192.168.X.X' },
    { id: 'REFEITORIO', ip: '192.168.X.X' }  // Novo
];

// O site vai chamar este endereço a cada X segundos
app.get('/status-rede', async (req, res) => {
    const results = [];
    
    for(let host of hosts){
        // Faz o ping real
        const resPing = await ping.promise.probe(host.ip, { timeout: 1 });
        results.push({
            id: host.id,
            online: resPing.alive, // true se respondeu, false se falhou
            time: resPing.time
        });
    }
    
    res.json(results);
});

app.listen(3000, () => console.log('Agente de Ping rodando na porta 3000'));