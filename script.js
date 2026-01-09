let scene, camera, renderer, labelRenderer, controls;
let cables = [];
let interactables = []; 
let networkData = [];
let pulsingRings = []; 

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let INTERSECTED;

// === 1. CONFIGURAÇÃO DOS SETORES ===
const SETORES = [
    { id: "PORTARIA", name: "Portaria", pos: { x: 21, z: 55 }, size: [3, 3, 3] },
    { id: "BALANCA", name: "Balança", pos: { x: 9, z: 51 }, size: [4, 3, 4] },
    { id: "PCTS", name: "PCTS", pos: { x: 7, z: 41 }, size: [6, 4, 6] },
    { id: "COI", name: "COI", pos: { x: -9, z: -13 }, size: [5, 4, 5] },
    { id: "VINHACA", name: "Vinhaça", pos: { x: -23, z: -28 }, size: [2, 2, 2] },
    { id: "SUPERVISAO", name: "Supervisão", pos: { x: 10, z: -21 }, size: [8, 4, 8] },
    { id: "OLD", name: "OLD", pos: { x: 36, z: 0 }, size: [3, 3, 10] },
    { id: "CPD", name: "CPD", pos: { x: 40, z: 22 }, type: 'L', size: [8, 6, 4] },
    { id: "REFEITORIO", name: "Refeitório", pos: { x: 40, z: 32 }, size: [6, 3, 5] }
];

// Ligações iniciais
let activeLinks = [
    { from: "CPD", to: "REFEITORIO" },
    { from: "CPD", to: "OLD" },
    { from: "OLD", to: "SUPERVISAO" },
    { from: "OLD", to: "COI" },
    { from: "OLD", to: "PCTS" },
    { from: "COI", to: "VINHACA" },
    { from: "PCTS", to: "BALANCA" },
    { from: "BALANCA", to: "PORTARIA" }
];

let finalSectorStatus = {}; 

function init() {
    const container = document.getElementById('canvas-3d');
    if (!container) return;

    // Cena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.FogExp2(0x111111, 0.002);

    // Câmera
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 100, 60);

    // Renderizador WebGL
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Renderizador de Labels (CSS2D)
    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none'; 
    container.appendChild(labelRenderer.domElement);

    // Controles
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;

    // Luzes
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    scene.add(sun);

    // Inicialização do Ambiente 3D
    createEnvironment();
    renderStructures();
    renderCables();
    
    // Inicia Monitoramento
    checkNetworkStatus();
    setInterval(checkNetworkStatus, 3000); // Atualiza a cada 3s

    // Eventos
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    renderer.domElement.addEventListener('pointerdown', onDocumentMouseDown, false);
    setupSearch();

    animate();
}

function createEnvironment() {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./img/3.png', 
        function(texture) {
            const planeMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0.0 });
            const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), planeMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -0.1; 
            floor.receiveShadow = true;
            scene.add(floor);
        },
        undefined,
        function(err) {
            // Fallback se a imagem não carregar
            const planeMat = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide });
            const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), planeMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -0.1;
            scene.add(floor);
        }
    );
}

function renderStructures() {
    const geoNormal = new THREE.BoxGeometry(1, 1, 1);
    const ringGeo = new THREE.RingGeometry(2.5, 3.5, 32); 

    SETORES.forEach(s => {
        // Material base do prédio
        const mat = new THREE.MeshPhysicalMaterial({ 
            color: 0x1e293b, 
            transparent: true, 
            opacity: 0.7, 
            roughness: 0.2, 
            metalness: 0.6, 
            clearcoat: 1.0
        });

        const mesh = new THREE.Mesh(geoNormal, mat);
        if(s.type === 'L') mesh.scale.set(8, 4, 4);
        else mesh.scale.set(s.size[0], s.size[1], s.size[2]);
        
        mesh.position.set(s.pos.x, mesh.scale.y / 2, s.pos.z);
        mesh.userData = { id: s.id, name: s.name, type: 'building' };
        
        scene.add(mesh);
        interactables.push(mesh);

        // Bordas neon
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(mesh.scale.x, mesh.scale.y, mesh.scale.z));
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
        line.position.copy(mesh.position);
        scene.add(line);
        mesh.userData.lineObj = line; 

        // Anel de Alerta (Pulsante)
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0, 
            side: THREE.DoubleSide 
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(s.pos.x, 0.2, s.pos.z);
        ring.visible = false;
        ring.userData = { id: s.id }; 
        scene.add(ring);
        pulsingRings.push(ring); 

        // Rótulo HTML
        const labelDiv = document.createElement('div');
        labelDiv.className = 'label-tag';
        labelDiv.textContent = s.name;
        const label = new THREE.CSS2DObject(labelDiv);
        label.position.set(0, (mesh.scale.y/2) + 1.5, 0);
        mesh.add(label);
    });

    // Tanques (Decorativos)
    const tankGeo = new THREE.CylinderGeometry(2.5, 2.5, 3.5, 40);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    for(let i=0; i<5; i++) {
        const t = i / 3;
        const posX = -21 + (-5 - -21) * t;
        const posZ = 6 + (24 - 6) * t;
        const tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.set(posX, 1.75, posZ);
        
        const edges = new THREE.EdgesGeometry(tankGeo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
        tank.add(line);
        scene.add(tank);
    }
}

function renderCables() {
    cables.forEach(obj => scene.remove(obj));
    cables = [];

    activeLinks.forEach(link => {
        const s1 = SETORES.find(s => s.id === link.from);
        const s2 = SETORES.find(s => s.id === link.to);
        if (s1 && s2) {
            drawCable(s1.pos, s2.pos, link.from, link.to);
        }
    });
}

function drawCable(p1, p2, idFrom, idTo) {
    const points = [];
    points.push(new THREE.Vector3(p1.x, 0.5, p1.z));
    const midX = (p1.x + p2.x) / 2;
    const midZ = (p1.z + p2.z) / 2;
    points.push(new THREE.Vector3(midX, 5, midZ)); 
    points.push(new THREE.Vector3(p2.x, 0.5, p2.z));

    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 20, 0.1, 8, false);
    const mat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
    
    const tube = new THREE.Mesh(geo, mat);
    tube.userData = { isCable: true, from: idFrom, to: idTo };
    scene.add(tube);
    cables.push(tube);
    
    // Pacote de dados (animação)
    const packetGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4); 
    const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const packet = new THREE.Mesh(packetGeo, packetMat);
    scene.add(packet);
    packet.userData = { curve: curve, progress: 0, speed: 0.004 }; 
    cables.push(packet);
}

// === MONITORAMENTO INTELIGENTE ===
async function checkNetworkStatus() {
    let serverData = [];
    try {
        const response = await fetch('http://localhost:3000/status-rede');
        serverData = await response.json();
        document.getElementById('last-update').innerText = "Atualizado: " + new Date().toLocaleTimeString();
    } catch (error) { serverData = []; }
    
    networkData = serverData;
    let hasError = false;

    // Mapa de Status
    const statusMap = {}; 

    SETORES.forEach(s => {
        const net = serverData.find(d => d.id === s.id);
        
        // Se net.hasIssue for true, significa que o switch OU algum device caiu
        const isProblem = net ? net.hasIssue : false;
        
        statusMap[s.id] = { isDown: isProblem };
        if(isProblem) hasError = true;
    });

    finalSectorStatus = statusMap;

    // Atualiza Visual dos Prédios
    interactables.forEach(mesh => {
        if(mesh.userData.type === 'building') {
            const statusInfo = statusMap[mesh.userData.id] || { isDown: false };
            const ring = pulsingRings.find(r => r.userData.id === mesh.userData.id);

            if (statusInfo.isDown) {
                // COR DE ALERTA (Vermelho)
                mesh.material.color.setHex(0xff0000); 
                if(mesh.userData.lineObj) mesh.userData.lineObj.material.color.setHex(0xff0000);
                if(ring) ring.visible = true;
            } else {
                // COR NORMAL (Azul Escuro / Neon)
                if(INTERSECTED !== mesh) mesh.material.color.setHex(0x1e293b);
                if(mesh.userData.lineObj) mesh.userData.lineObj.material.color.setHex(0x38bdf8);
                if(ring) ring.visible = false;
            }
        }
    });

    // Atualiza Cabos
    cables.forEach(obj => {
        if(obj.userData.isCable) {
            const fromStatus = statusMap[obj.userData.from];
            const toStatus = statusMap[obj.userData.to];
            const fromDown = fromStatus && fromStatus.isDown;
            const toDown = toStatus && toStatus.isDown;

            if (fromDown || toDown) {
                obj.material.color.setHex(0xff0000); 
            } else {
                obj.material.color.setHex(0x0ea5e9);
            }
        }
    });

    // UI Global
    const statusDot = document.getElementById('status-dot');
    const globalText = document.getElementById('global-text');
    if(hasError) {
        statusDot.className = "dot danger";
        globalText.innerText = "ALERTA / FALHA";
        globalText.style.color = "#fb7185";
    } else {
        statusDot.className = "dot active";
        globalText.innerText = "OPERACIONAL";
        globalText.style.color = "#2dd4bf";
    }
}

// === INTERFACE DO EDITOR DE REDE (CORRIGIDO) ===
function initEditor() {
    const s1 = document.getElementById('from-sector');
    const s2 = document.getElementById('to-sector');
    if(s1 && s2) {
        s1.innerHTML = ''; s2.innerHTML = '';
        SETORES.forEach(s => {
            s1.add(new Option(s.name, s.id));
            s2.add(new Option(s.name, s.id));
        });
        renderLinksList();
    }
}

function toggleEditor() { 
    const panel = document.getElementById('network-editor');
    const wasOpen = panel.classList.contains('open'); 

    // Fecha TODOS os painéis laterais primeiro
    document.querySelectorAll('.editor-sidebar').forEach(el => el.classList.remove('open'));

    // Se não estava aberto, abre agora
    if (!wasOpen) {
        panel.classList.add('open'); 
        initEditor(); 
    }
}

function addLink() {
    const from = document.getElementById('from-sector').value;
    const to = document.getElementById('to-sector').value;
    if(from === to) return alert("Origem e Destino iguais");
    if(!activeLinks.some(l => (l.from===from && l.to===to) || (l.from===to && l.to===from))){
        activeLinks.push({from, to});
        renderLinksList(); renderCables();
    }
}
function removeLink(i) { activeLinks.splice(i,1); renderLinksList(); renderCables(); }

function renderLinksList() {
    const l = document.getElementById('links-list'); 
    const countSpan = document.getElementById('link-count');
    if(!l) return;
    
    l.innerHTML = '';
    if(countSpan) countSpan.innerText = activeLinks.length;

    if(activeLinks.length === 0) {
        l.innerHTML = '<div style="text-align:center; color:#64748b; padding:20px; font-size:12px;">Nenhuma conexão criada.</div>';
        return;
    }

    activeLinks.forEach((x,i) => {
        const n1 = SETORES.find(s=>s.id===x.from)?.name || x.from;
        const n2 = SETORES.find(s=>s.id===x.to)?.name || x.to;
        
        const html = `
            <div class="link-card">
                <div class="link-info">
                    <span style="font-weight:600; color:#fff;">${n1}</span>
                    <i class="fas fa-arrow-right link-arrow"></i>
                    <span style="font-weight:600; color:#fff;">${n2}</span>
                </div>
                <button class="btn-icon-trash" onclick="removeLink(${i})" title="Remover Conexão">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        l.innerHTML += html;
    });
}

// === INTERAÇÃO DO MOUSE ===
function onDocumentMouseDown(event) {
    if(INTERSECTED) {
        document.getElementById('sector-info').classList.remove('hidden');
        document.getElementById('sector-name').innerText = INTERSECTED.userData.name;
        
        const net = networkData.find(n => n.id === INTERSECTED.userData.id);
        const msg = document.getElementById('sector-status-msg');
        
        if(net) {
            document.getElementById('sector-ip').innerText = "Switch IP: " + (net.ip || 'Não Configurado');
            
            // Visualização detalhada (Switch + Equipamentos)
            let detailsHTML = '';
            
            // Status do Switch
            if(net.online) {
                detailsHTML += `<div style="margin-bottom:8px; color:#2dd4bf; font-weight:bold;">✅ Switch: ONLINE</div>`;
            } else {
                detailsHTML += `<div style="margin-bottom:8px; color:#fb7185; font-weight:bold;">❌ Switch: OFFLINE</div>`;
            }

            // Lista de Equipamentos
            if(net.devices && net.devices.length > 0) {
                detailsHTML += `<div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:5px; margin-top:5px;">`;
                detailsHTML += `<small style="color:#94a3b8">Equipamentos:</small>`;
                
                net.devices.forEach(dev => {
                    const icon = dev.online ? '✅' : '🔴';
                    const color = dev.online ? '#cbd5e1' : '#fb7185';
                    detailsHTML += `
                        <div style="font-size:11px; display:flex; justify-content:space-between; margin-top:3px; color:${color}">
                            <span>${icon} ${dev.name}</span>
                            <span style="opacity:0.7">${dev.ip}</span>
                        </div>
                    `;
                });
                detailsHTML += `</div>`;
            } else {
                detailsHTML += `<div style="font-size:10px; color:#64748b; margin-top:5px;">Nenhum equipamento extra monitorado.</div>`;
            }

            msg.innerHTML = detailsHTML;
        } else {
            document.getElementById('sector-ip').innerText = "Sem dados";
            msg.innerText = "Aguardando servidor...";
        }
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if(e.key==='Enter'){
                const v = e.target.value.toUpperCase();
                const t = SETORES.find(s=>s.id===v || s.name.toUpperCase().includes(v));
                if(t) {
                    gsap.to(controls.target, {duration:1, x:t.pos.x, y:0, z:t.pos.z});
                    gsap.to(camera.position, {duration:1, x:t.pos.x, y:30, z:t.pos.z+30});
                }
            }
        });
    }
}

function onDocumentMouseMove(e) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left)/r.width)*2-1;
    mouse.y = -((e.clientY - r.top)/r.height)*2+1;
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.003; 

    // Animação dos Anéis de Alerta
    pulsingRings.forEach(ring => {
        if(ring.visible) {
            const scale = 1 + (Math.sin(time) * 0.3 + 0.3);
            ring.scale.set(scale, scale, 1);
            ring.material.opacity = 0.8 - (Math.sin(time) * 0.4 + 0.4);
        }
    });

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactables);
    
    const statusMap = finalSectorStatus || {};

    if(hits.length>0) {
        if(INTERSECTED!=hits[0].object) {
            // Restaura cor do objeto anterior
            if(INTERSECTED && INTERSECTED.userData.type==='building') {
                const isErr = statusMap[INTERSECTED.userData.id]?.isDown;
                if(isErr) INTERSECTED.material.color.setHex(0xff0000);
                else INTERSECTED.material.color.setHex(0x1e293b);
            }
            // Define novo objeto focado
            INTERSECTED = hits[0].object;
            if(INTERSECTED.userData.type==='building') {
                const isErr = statusMap[INTERSECTED.userData.id]?.isDown;
                if(isErr) INTERSECTED.material.color.setHex(0xff4444); 
                else INTERSECTED.material.color.setHex(0x38bdf8); 
            }
            document.body.style.cursor = 'pointer';
        }
    } else {
        if(INTERSECTED && INTERSECTED.userData.type==='building') {
            const isErr = statusMap[INTERSECTED.userData.id]?.isDown;
            if(isErr) INTERSECTED.material.color.setHex(0xff0000);
            else INTERSECTED.material.color.setHex(0x1e293b);
        }
        INTERSECTED = null;
        document.body.style.cursor = 'default';
    }

    // Animação dos pacotes nos cabos
    cables.forEach(o => {
        if(o.userData.curve) {
            o.userData.progress += o.userData.speed;
            if(o.userData.progress>1) o.userData.progress=0;
            o.position.copy(o.userData.curve.getPoint(o.userData.progress));
        }
    });

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

// Inicia aplicação
init();