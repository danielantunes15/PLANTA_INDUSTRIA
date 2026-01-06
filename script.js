let scene, camera, renderer, labelRenderer, controls;
let cables = [];
let interactables = []; // Lista de objetos clicáveis
let isError = false;

// Raycasting e Mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let INTERSECTED;

// Dados dos Setores
const SETORES = [
    { id: "PORTARIA", name: "Portaria", pos: { x: 18, z: 22 }, size: [4, 3, 4] },
    { id: "BALANCA", name: "Balança", pos: { x: 10, z: 20 }, size: [4, 3, 4] },
    { id: "PCTS", name: "PCTS", pos: { x: 3, z: 12 }, size: [5, 4, 5] },
    { id: "COI", name: "COI", pos: { x: -4, z: -8 }, size: [6, 4, 6] },
    { id: "ALMOXARIFADO", name: "Almoxarifado", pos: { x: 5, z: -15 }, size: [8, 4, 8] },
    { id: "ADM_ANTIGO", name: "ADM Antigo", pos: { x: 15, z: -5 }, size: [5, 3, 5] },
    { id: "ADM", name: "ADM Central", pos: { x: 22, z: 8 }, type: 'L', size: [8, 6, 4] },
    { id: "VINHACA", name: "Vinhaça", pos: { x: -22, z: -12 }, size: [4, 2, 4] }
];

function init() {
    const container = document.getElementById('canvas-3d');

    // 1. Cena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    // Adiciona nevoeiro suave para profundidade
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.015);

    // 2. Câmara
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(40, 45, 40);

    // 3. Renderer WebGL (Gráficos)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true; // Habilita Sombras
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Renderer CSS2D (Rótulos)
    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    // pointerEvents 'none' permite clicar nos objetos 3D através dos rótulos
    labelRenderer.domElement.style.pointerEvents = 'none'; 
    container.appendChild(labelRenderer.domElement);

    // 5. Controles
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Impede a câmera de ir para baixo do chão

    // 6. Ambiente (Chão e Luzes)
    createEnvironment();

    // 7. Estruturas e Cabos
    renderStructures();
    renderCables();

    // 8. Eventos
    window.addEventListener('resize', onWindowResize);
    // Evento de Mouse Move para Hover
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    // Evento de Clique para Seleção (usando renderer.domElement para pegar o clique no canvas)
    renderer.domElement.addEventListener('pointerdown', onDocumentMouseDown, false);
    // Evento de Pesquisa
    setupSearch();

    animate();
}

function createEnvironment() {
    // Chão com textura
    const planeGeo = new THREE.PlaneGeometry(100, 100);
    const textureLoader = new THREE.TextureLoader();
    // Usei uma textura genérica de grid caso a imagem não carregue, mas mantive sua URL
    const floorTexture = textureLoader.load('https://i.imgur.com/vH9v5lF.jpeg');
    const planeMat = new THREE.MeshStandardMaterial({ 
        map: floorTexture,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(planeGeo, planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true; // Chão recebe sombra
    scene.add(floor);

    // Grid Helper para dar aspecto técnico
    const grid = new THREE.GridHelper(100, 50, 0x1e293b, 0x1e293b);
    grid.position.y = 0.05;
    scene.add(grid);

    // Iluminação
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(20, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048; // Sombra de alta qualidade
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
}

function renderStructures() {
    const geoNormal = new THREE.BoxGeometry(1, 1, 1); // Geometria base reusável

    SETORES.forEach(s => {
        // Material "Glass" melhorado
        const mat = new THREE.MeshPhysicalMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0.1,
            transmission: 0.2, // Efeito vidro
            clearcoat: 1.0
        });

        const mesh = new THREE.Mesh(geoNormal, mat);
        
        // Ajusta tamanho
        if(s.type === 'L') {
            mesh.scale.set(8, 3, 4);
        } else {
            mesh.scale.set(s.size[0], s.size[1], s.size[2]);
        }
        
        // Posiciona (altura é metade do Y para ficar no chão)
        mesh.position.set(s.pos.x, mesh.scale.y / 2, s.pos.z);
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Dados para identificação no Raycaster
        mesh.userData = { id: s.id, name: s.name, originalColor: 0xffffff };
        
        scene.add(mesh);
        interactables.push(mesh);

        // Bordas Neon
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(mesh.scale.x, mesh.scale.y, mesh.scale.z));
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x2dd4bf }));
        line.position.copy(mesh.position);
        scene.add(line);

        // Rótulo HTML (CSS2D)
        const labelDiv = document.createElement('div');
        labelDiv.className = 'label-tag';
        labelDiv.textContent = s.name;
        const label = new THREE.CSS2DObject(labelDiv);
        label.position.set(0, (mesh.scale.y/2) + 1.5, 0); // Fica acima do prédio
        mesh.add(label);
    });

    // Tanques
    for(let i=0; i<4; i++) {
        const tGeo = new THREE.CylinderGeometry(2, 2, 5, 32);
        const tMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 });
        const tank = new THREE.Mesh(tGeo, tMat);
        tank.position.set(-15 + (i*5), 2.5, 5 + (i*4));
        tank.castShadow = true;
        scene.add(tank);
    }
}

function renderCables() {
    const sequence = ["PORTARIA", "BALANCA", "PCTS", "COI", "ALMOXARIFADO", "ADM_ANTIGO", "ADM"];
    
    // Conecta a sequência
    for(let i=0; i < sequence.length - 1; i++) {
        const s1 = SETORES.find(s=>s.id===sequence[i]);
        const s2 = SETORES.find(s=>s.id===sequence[i+1]);
        if(s1 && s2) drawCable(s1.pos, s2.pos);
    }
    // Conexões extras
    const coi = SETORES.find(s=>s.id==="COI");
    const vin = SETORES.find(s=>s.id==="VINHACA");
    const port = SETORES.find(s=>s.id==="PORTARIA");
    const adm = SETORES.find(s=>s.id==="ADM");
    
    if(coi && vin) drawCable(coi.pos, vin.pos);
    if(adm && port) drawCable(adm.pos, port.pos); // Fecha o loop
}

function drawCable(p1, p2) {
    const points = [];
    points.push(new THREE.Vector3(p1.x, 0.5, p1.z));
    
    // Cria um ponto médio levemente elevado para dar curvatura "realista"
    const midX = (p1.x + p2.x) / 2;
    const midZ = (p1.z + p2.z) / 2;
    points.push(new THREE.Vector3(midX, 2, midZ)); // Cabo sobe um pouco
    
    points.push(new THREE.Vector3(p2.x, 0.5, p2.z));

    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 20, 0.1, 8, false);
    const mat = new THREE.MeshBasicMaterial({ color: 0x2dd4bf });
    
    const tube = new THREE.Mesh(geo, mat);
    scene.add(tube);
    
    // Salva referência para animação de cor em erro
    cables.push(tube);
    
    // Partícula de dados viajando (esferas pequenas)
    const packetGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const packet = new THREE.Mesh(packetGeo, packetMat);
    scene.add(packet);
    
    // Adiciona dados de animação ao pacote
    packet.userData = { curve: curve, progress: 0, speed: 0.002 + Math.random() * 0.002 };
    cables.push(packet); // Hack: adicionar na mesma lista para mudar cor globalmente
}

function setupSearch() {
    const input = document.getElementById('searchInput');
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const termo = input.value.toUpperCase();
            const target = SETORES.find(s => s.id === termo || s.name.toUpperCase().includes(termo));
            
            if (target) {
                // Animação GSAP da Câmera
                gsap.to(camera.position, {
                    duration: 1.5,
                    x: target.pos.x + 10,
                    y: 10,
                    z: target.pos.z + 10,
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

// Lógica de Raycasting (Mouse Hover/Click)
function onDocumentMouseMove(event) {
    // Normaliza coordenada do mouse
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onDocumentMouseDown(event) {
    if (INTERSECTED) {
        // Seleciona o setor
        document.getElementById('sector-info').classList.remove('hidden');
        document.getElementById('sector-name').innerText = INTERSECTED.userData.name;
        document.getElementById('sector-coords').innerText = `X: ${INTERSECTED.position.x}, Z: ${INTERSECTED.position.z}`;
        
        // Foca a câmera
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
            mesh.material.color.setHex(0x2dd4bf); // Verde destaque
            mesh.material.opacity = 0.8;
        } else {
            mesh.material.color.setHex(0xffffff);
            mesh.material.opacity = 0.3;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);

    // Atualiza Raycaster
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactables);

    if (intersects.length > 0) {
        // Se mudou o objeto sob o mouse
        if (INTERSECTED != intersects[0].object) {
            if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.userData.originalColor);
            INTERSECTED = intersects[0].object;
            INTERSECTED.material.color.setHex(0x2dd4bf); // Hover effect
            document.body.style.cursor = 'pointer';
        }
    } else {
        if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.userData.originalColor);
        INTERSECTED = null;
        document.body.style.cursor = 'default';
    }

    // Animação dos "pacotes" de dados nos cabos
    cables.forEach(obj => {
        // Se for um pacote (tem userData.curve)
        if (obj.userData.curve) {
            obj.userData.progress += isError ? 0 : obj.userData.speed;
            if(obj.userData.progress > 1) obj.userData.progress = 0;
            
            const point = obj.userData.curve.getPoint(obj.userData.progress);
            obj.position.copy(point);
        }
    });

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera); // Renderiza os rótulos
}

function simulateFault() {
    isError = true;
    // Pinta tudo de vermelho
    cables.forEach(c => c.material.color.setHex(0xfb7185));
    document.getElementById('incident-ui').classList.remove('hidden');
    document.getElementById('global-text').innerText = "FALHA CRÍTICA";
    document.getElementById('global-text').style.color = "#fb7185";
    document.getElementById('status-dot').className = "dot danger";
    document.getElementById('data-flow-bar').style.background = "#fb7185";
}

function repairSystem() {
    isError = false;
    cables.forEach(c => c.material.color.setHex(0x2dd4bf)); // Volta para verde
    interactables.forEach(m => m.userData.originalColor = 0xffffff); // Reseta cores dos prédios
    
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

// Funções UI Mobile
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

init();