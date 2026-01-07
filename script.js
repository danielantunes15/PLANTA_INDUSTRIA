let scene, camera, renderer, labelRenderer, controls;
let cables = [];
let interactables = []; 
let isError = false;

// Raycasting e Mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let INTERSECTED;

// === CONFIGURAÇÃO DE SETORES ALINHADOS COM A PLANTA ===
// A imagem tem 100x100. O centro (0,0) é o meio da imagem.
// X+ é Direita, X- é Esquerda.
// Z+ é Baixo, Z- é Cima.
const SETORES = [
    // Canto Inferior Direito (Entrada)
    { id: "PORTARIA", name: "Portaria", pos: { x: 12, z: 55 }, size: [4, 3, 4] },
    { id: "BALANCA", name: "Balança", pos: { x: 4, z: 53 }, size: [4, 3, 4] },
    
    // Centro e Processos
    { id: "PCTS", name: "PCTS", pos: { x: 1, z: 41 }, size: [6, 4, 6] },
    { id: "COI", name: "COI", pos: { x: -11, z: -16 }, size: [5, 4, 5] },
    
    // Topo (Direita e Esquerda)
    { id: "ALMOXARIFADO", name: "Almoxarifado", pos: { x: 7, z: -25 }, size: [8, 4, 8] },
    { id: "ADM_ANTIGO", name: "ADM Antigo", pos: { x: 21, z: -8 }, size: [5, 3, 5] },
    { id: "ADM", name: "ADM Central", pos: { x: 23, z: 24 }, type: 'L', size: [8, 6, 4] },
    
    // Canto Superior Esquerdo
    { id: "VINHACA", name: "Vinhaça", pos: { x: -31, z: -32 }, size: [6, 2, 6] }
];

function init() {
    const container = document.getElementById('canvas-3d');

    // 1. Cena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.005);

    // 2. Câmera (Posicionada para ver a planta toda de cima)
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 90, 60); 

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Labels CSS2D
    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none'; 
    container.appendChild(labelRenderer.domElement);

    // 5. Controles
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Limita para não entrar no chão

    // 6. Cria o Ambiente (Planta Baixa)
    createEnvironment();

    // 7. Renderiza as estruturas
    renderStructures();
    renderCables();

    // 8. Eventos
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    renderer.domElement.addEventListener('pointerdown', onDocumentMouseDown, false);
    setupSearch();

    animate();
}

function createEnvironment() {
    const textureLoader = new THREE.TextureLoader();
    
    // Carrega a imagem da planta
    const floorTexture = textureLoader.load('./img/3.png', function (texture) {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });

    // Aumentei um pouco a geometria para 120x120 para dar margem
    const planeGeo = new THREE.PlaneGeometry(120, 120);
    const planeMat = new THREE.MeshStandardMaterial({ 
        map: floorTexture,
        color: 0xffffff,
        roughness: 0.8,
        metalness: 0.1
    });

    const floor = new THREE.Mesh(planeGeo, planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.2; 
    floor.receiveShadow = true;
    scene.add(floor);

    // AJUDA VISUAL: Grid para ajudar você a posicionar (pode remover depois)
    // O Grid mostra onde é o centro (0,0)
    // const grid = new THREE.GridHelper(120, 60, 0x2dd4bf, 0x1e293b);
    // grid.position.y = 0.1;
    // grid.material.opacity = 0.2;
    // grid.material.transparent = true;
    // scene.add(grid);

    // Luzes
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(50, 80, 50);
    sun.castShadow = true;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
}

function renderStructures() {
    const geoNormal = new THREE.BoxGeometry(1, 1, 1);

    SETORES.forEach(s => {
        // Material Vidro/Neon
        const mat = new THREE.MeshPhysicalMaterial({ 
            color: 0x2dd4bf, // Levemente verde por padrão para combinar com neon
            transparent: true, 
            opacity: 0.15, // Bem transparente para ver o mapa embaixo
            roughness: 0,
            metalness: 0.1,
            transmission: 0,
            clearcoat: 1.0
        });

        const mesh = new THREE.Mesh(geoNormal, mat);
        
        // Aplica Tamanho
        if(s.type === 'L') {
            mesh.scale.set(8, 4, 4);
        } else {
            mesh.scale.set(s.size[0], s.size[1], s.size[2]);
        }
        
        // Posiciona
        mesh.position.set(s.pos.x, mesh.scale.y / 2, s.pos.z);
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { id: s.id, name: s.name, originalColor: 0x2dd4bf };
        
        scene.add(mesh);
        interactables.push(mesh);

        // Bordas Neon (Linhas brilhantes em volta do prédio)
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(mesh.scale.x, mesh.scale.y, mesh.scale.z));
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x2dd4bf }));
        line.position.copy(mesh.position);
        scene.add(line);

        // Label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'label-tag';
        labelDiv.textContent = s.name;
        const label = new THREE.CSS2DObject(labelDiv);
        label.position.set(0, (mesh.scale.y/2) + 2, 0);
        mesh.add(label);
    });

    // === TANQUES (CORRIGIDO PARA DIAGONAL) ===
    // Baseado na imagem, os 4 tanques formam uma linha diagonal no canto inferior esquerdo
    const tankStart = { x: -22 , z: 7 }; // Onde começa o primeiro tanque
    const tankEnd = { x: -10, z: 22 };   // Onde termina o último

    for(let i=0; i<4; i++) {
        const t = i / 3; // Interpolação (0 a 1)
        const posX = tankStart.x + (tankEnd.x - tankStart.x) * t;
        const posZ = tankStart.z + (tankEnd.z - tankStart.z) * t;

        const tGeo = new THREE.CylinderGeometry(2.5, 2.5, 4, 32);
        const tMat = new THREE.MeshStandardMaterial({ 
            color: 0x1e293b, 
            roughness: 0.3, 
            metalness: 0.8,
            transparent: true,
            opacity: 0.8
        });
        
        const tank = new THREE.Mesh(tGeo, tMat);
        tank.position.set(posX, 2, posZ);
        tank.castShadow = true;
        scene.add(tank);

        // Borda do tanque
        const edges = new THREE.EdgesGeometry(tGeo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x2dd4bf }));
        tank.add(line);
    }
}

function renderCables() {
    // Definindo conexões lógicas
    const sequence = ["PORTARIA", "BALANCA", "ADM", "PCTS", "COI", "VINHACA"];
    
    for(let i=0; i < sequence.length - 1; i++) {
        const s1 = SETORES.find(s=>s.id===sequence[i]);
        const s2 = SETORES.find(s=>s.id===sequence[i+1]);
        if(s1 && s2) drawCable(s1.pos, s2.pos);
    }

    // Conexões extras para criar rede
    const almox = SETORES.find(s=>s.id==="ALMOXARIFADO");
    const admAntigo = SETORES.find(s=>s.id==="ADM_ANTIGO");
    const adm = SETORES.find(s=>s.id==="ADM");
    const coi = SETORES.find(s=>s.id==="COI");
    
    if(almox && admAntigo) drawCable(almox.pos, admAntigo.pos);
    if(admAntigo && adm) drawCable(admAntigo.pos, adm.pos);
    if(almox && coi) drawCable(almox.pos, coi.pos);
}

function drawCable(p1, p2) {
    const points = [];
    points.push(new THREE.Vector3(p1.x, 0.5, p1.z));
    
    const midX = (p1.x + p2.x) / 2;
    const midZ = (p1.z + p2.z) / 2;
    points.push(new THREE.Vector3(midX, 4, midZ)); // Cabo faz um arco mais alto
    
    points.push(new THREE.Vector3(p2.x, 0.5, p2.z));

    const curve = new THREE.CatmullRomCurve3(points);
    
    // Cabo com efeito de brilho
    const geo = new THREE.TubeGeometry(curve, 20, 0.08, 8, false);
    const mat = new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.6 });
    
    const tube = new THREE.Mesh(geo, mat);
    scene.add(tube);
    cables.push(tube);
    
    // Pacote de dados
    const packetGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const packet = new THREE.Mesh(packetGeo, packetMat);
    scene.add(packet);
    
    packet.userData = { curve: curve, progress: 0, speed: 0.003 + Math.random() * 0.002 };
    cables.push(packet);
}

function setupSearch() {
    const input = document.getElementById('searchInput');
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const termo = input.value.toUpperCase();
            const target = SETORES.find(s => s.id === termo || s.name.toUpperCase().includes(termo));
            
            if (target) {
                gsap.to(camera.position, {
                    duration: 1.5,
                    x: target.pos.x,
                    y: 20,
                    z: target.pos.z + 20,
                    ease: "power2.out",
                    onUpdate: () => controls.update()
                });
                
                gsap.to(controls.target, {
                    duration: 1.5,
                    x: target.pos.x,
                    y: 0,
                    z: target.pos.z,
                    ease: "power2.out"
                });

                highlightSector(target.id);
            }
        }
    });
}

function onDocumentMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onDocumentMouseDown(event) {
    if (INTERSECTED) {
        document.getElementById('sector-info').classList.remove('hidden');
        document.getElementById('sector-name').innerText = INTERSECTED.userData.name;
        document.getElementById('sector-coords').innerText = `X: ${INTERSECTED.position.x.toFixed(0)}, Z: ${INTERSECTED.position.z.toFixed(0)}`;
        
        gsap.to(controls.target, {
            duration: 1,
            x: INTERSECTED.position.x,
            y: 0,
            z: INTERSECTED.position.z
        });
    }
}

function highlightSector(id) {
    interactables.forEach(mesh => {
        if(mesh.userData.id === id) {
            mesh.material.opacity = 0.6;
            mesh.material.color.setHex(0x2dd4bf);
        } else {
            mesh.material.opacity = 0.15;
            mesh.material.color.setHex(0x2dd4bf); // Reseta para cor original
        }
    });
}

function animate() {
    requestAnimationFrame(animate);

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactables);

    if (intersects.length > 0) {
        if (INTERSECTED != intersects[0].object) {
            if (INTERSECTED) INTERSECTED.material.opacity = 0.15;
            INTERSECTED = intersects[0].object;
            INTERSECTED.material.opacity = 0.5; // Brilha ao passar o mouse
            document.body.style.cursor = 'pointer';
        }
    } else {
        if (INTERSECTED) INTERSECTED.material.opacity = 0.15;
        INTERSECTED = null;
        document.body.style.cursor = 'default';
    }

    cables.forEach(obj => {
        if (obj.userData.curve) {
            obj.userData.progress += isError ? 0 : obj.userData.speed;
            if(obj.userData.progress > 1) obj.userData.progress = 0;
            const point = obj.userData.curve.getPoint(obj.userData.progress);
            obj.position.copy(point);
        }
    });

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

function simulateFault() {
    isError = true;
    cables.forEach(c => {
        if(c.material) c.material.color.setHex(0xfb7185);
    });
    document.getElementById('incident-ui').classList.remove('hidden');
    document.getElementById('global-text').innerText = "FALHA CRÍTICA";
    document.getElementById('global-text').style.color = "#fb7185";
    document.getElementById('status-dot').className = "dot danger";
    document.getElementById('data-flow-bar').style.background = "#fb7185";
}

function repairSystem() {
    isError = false;
    cables.forEach(c => {
        if(c.material) c.material.color.setHex(0x2dd4bf);
    });
    
    document.getElementById('incident-ui').classList.add('hidden');
    document.getElementById('global-text').innerText = "ESTÁVEL";
    document.getElementById('global-text').style.color = "#2dd4bf";
    document.getElementById('status-dot').className = "dot active";
    document.getElementById('data-flow-bar').style.background = "#2dd4bf";
}

function onWindowResize() {
    const container = document.getElementById('canvas-3d');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

init();