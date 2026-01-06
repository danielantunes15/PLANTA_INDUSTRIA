let scene, camera, renderer, controls;
let cables = [];
let isError = false;

// Coordenadas baseadas na planta real enviada
const SETORES = [
    { id: "PORTARIA", name: "Portaria", pos: { x: 18, z: 22 } },
    { id: "BALANCA", name: "Balança", pos: { x: 10, z: 20 } },
    { id: "PCTS", name: "PCTS", pos: { x: 3, z: 12 } },
    { id: "COI", name: "COI", pos: { x: -4, z: -8 } },
    { id: "ALMOXARIFADO", name: "Almoxarifado", pos: { x: 5, z: -15 } },
    { id: "ADM_ANTIGO", name: "ADM Antigo", pos: { x: 15, z: -5 } },
    { id: "ADM", name: "ADM Central", pos: { x: 22, z: 8 }, type: 'L' },
    { id: "VINHACA", name: "Vinhaça", pos: { x: -22, z: -12 } }
];

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(35, 40, 35);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const container = document.getElementById('canvas-3d');
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Chão: Mapa Satélite (Substitua o link pela sua imagem local)
    const planeGeo = new THREE.PlaneGeometry(80, 80);
    const textureLoader = new THREE.TextureLoader();
    const planeMat = new THREE.MeshBasicMaterial({ 
        map: textureLoader.load('https://i.imgur.com/vH9v5lF.jpeg'),
        transparent: true,
        opacity: 0.6
    });
    const floor = new THREE.Mesh(planeGeo, planeMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Iluminação Clean
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(10, 20, 10);
    scene.add(sun);

    renderStructures();
    renderCables();
    animate();
}

function renderStructures() {
    SETORES.forEach(s => {
        // Prédios em estilo Cristal Translúcido
        const geo = s.type === 'L' ? new THREE.BoxGeometry(8, 2, 3) : new THREE.BoxGeometry(4, 3, 4);
        const mat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.2,
            roughness: 0,
            metalness: 0.5
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(s.pos.x, 1.5, s.pos.z);
        scene.add(mesh);

        // Bordas Finas (Estilo moderno)
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x2dd4bf, opacity: 0.5, transparent: true }));
        line.position.copy(mesh.position);
        scene.add(line);

        // Nomes dos Setores (Labels)
        scene.add(createModernLabel(s.name, s.pos));
    });

    // Tanques em diagonal
    for(let i=0; i<5; i++) {
        const tankGeo = new THREE.CylinderGeometry(2, 2, 4, 32);
        const tankMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
        const tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.set(-15 + (i*5.5), 2, 5 + (i*4));
        scene.add(tank);
    }
}

function createModernLabel(text, pos) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 300; canvas.height = 100;
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px "Plus Jakarta Sans"';
    ctx.fillText(text, 10, 50);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
    sprite.position.set(pos.x, 6, pos.z);
    sprite.scale.set(8, 2.5, 1);
    return sprite;
}

function renderCables() {
    const sequence = ["PORTARIA", "BALANCA", "PCTS", "COI", "ALMOXARIFADO", "ADM_ANTIGO", "ADM", "PORTARIA"];
    for(let i=0; i < sequence.length - 1; i++) {
        drawCable(SETORES.find(s=>s.id===sequence[i]).pos, SETORES.find(s=>s.id===sequence[i+1]).pos);
    }
    // Ramal Vinhaça
    drawCable(SETORES.find(s=>s.id==="COI").pos, SETORES.find(s=>s.id==="VINHACA").pos);
}

function drawCable(p1, p2) {
    const curve = new THREE.LineCurve3(new THREE.Vector3(p1.x, 0.5, p1.z), new THREE.Vector3(p2.x, 0.5, p2.z));
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(10));
    const mat = new THREE.LineDashedMaterial({ color: 0x2dd4bf, dashSize: 1, gapSize: 0.4 });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    scene.add(line);
    cables.push(line);
}

function animate() {
    requestAnimationFrame(animate);
    if (!isError) {
        cables.forEach(c => c.material.dashOffset -= 0.025);
    }
    controls.update();
    renderer.render(scene, camera);
}

function simulateFault() {
    isError = true;
    cables.forEach(c => c.material.color.setHex(0xfb7185));
    document.getElementById('incident-ui').classList.remove('hidden');
    document.getElementById('global-text').innerText = "FALHA CRÍTICA";
    document.getElementById('global-text').style.color = "#fb7185";
}

function repairSystem() {
    isError = false;
    cables.forEach(c => c.material.color.setHex(0x2dd4bf));
    document.getElementById('incident-ui').classList.add('hidden');
    document.getElementById('global-text').innerText = "ESTÁVEL";
    document.getElementById('global-text').style.color = "#2dd4bf";
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();