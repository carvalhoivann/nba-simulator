// ==========================================
// ESTADO GLOBAL DEL JUEGO
// ==========================================
const gameState = {
    player: {
        firstName: "",
        lastName: "",
        position: "",
        age: 18,
        experience: 0,
        currentTeam: "",
        contractYearsLeft: 0,
        availablePoints: 0,
        minutesPerGame: 0,
        isRetired: false,
        declineAge: null, // se define recién cuando el jugador cumple 30
        injuryHistory: 0, // 🆕 cuenta lesiones moderadas/graves sufridas en la carrera
        enfoqueTemporada: null, // 🆕 decisión de enfoque elegida para la temporada por jugar
        rivalTeam: null, // 🆕 equipo rival de franquicia asignado al firmar contrato
        rivalRecord: { wins: 0, losses: 0 }, // 🆕 historial de duelos narrativos contra el rival
        cantidadTraspasosRecibidos: 0, // 🆕 cuenta traspasos que afectaron a TU equipo en la carrera
        climaVestuario: 60 // 🆕 stat oculta 0-100, arranca neutral-positiva, la mueven los eventos
    },
    // Los 10 atributos obligatorios arrancan en el mínimo (1)
    attributes: {
        bandeja: 1, clavada: 1, tiroInterior: 1, mediaDistancia: 1, triple: 1, tiroLibre: 1,
        dribbling: 1, pase: 1, vision: 1,
        rebote: 1, tapon: 1, robo: 1,
        fuerza: 1, velocidad: 1, resistencia: 1
    },
    statsHistory: [],
    cardCollection: [] // 🆕 cartas coleccionables de cada temporada jugada
};

// Lista completa de las 30 franquicias de la NBA para el Draft aleatorio
const nbaTeams = [
    "Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets",
    "Chicago Bulls", "Cleveland Cavaliers", "Dallas Mavericks", "Denver Nuggets",
    "Detroit Pistons", "Golden State Warriors", "Houston Rockets", "Indiana Pacers",
    "LA Clippers", "Los Angeles Lakers", "Memphis Grizzlies", "Miami Heat",
    "Milwaukee Bucks", "Minnesota Timberwolves", "New Orleans Pelicans", "New York Knicks",
    "Oklahoma City Thunder", "Orlando Magic", "Philadelphia 76ers", "Phoenix Suns",
    "Portland Trail Blazers", "Sacramento Kings", "San Antonio Spurs", "Toronto Raptors",
    "Utah Jazz", "Washington Wizards"
];

async function guardarPickPropioCompartido(datosPick) {
    if (!tieneCarreraCompartida()) return;
    try {
        const { db, doc, setDoc } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        const campo = `draft_${gameState.player.slotPropio}`;
        await setDoc(refPartida, { [campo]: datosPick }, { merge: true });
    } catch (e) {
        console.warn("No se pudo guardar el pick de Draft compartido:", e);
    }
}

async function obtenerPickDelRivalCompartido() {
    if (!tieneCarreraCompartida()) return null;
    try {
        const { db, doc, getDoc } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        const snap = await getDoc(refPartida);
        if (!snap.exists()) return null;

        const data = snap.data();
        const slotRival = gameState.player.slotPropio === "slotA" ? "slotB" : "slotA";
        return data[`draft_${slotRival}`] || null;
    } catch (e) {
        console.warn("No se pudo consultar el pick del rival compartido:", e);
        return null;
    }
}

// ==========================================
// 🆕 NUEVO: LISTADO COMPLETO DEL DRAFT (60 picks)
// ==========================================
// Pool de nombres genéricos para generar los otros 59 draftees (tu jugador
// ocupa 1 de los 60 picks, el resto se completa al azar). No son jugadores
// reales, son combinaciones random para darle cuerpo a la noche del Draft.
// ==========================================
// 🆕 NUEVO: LISTADO COMPLETO DEL DRAFT (60 picks)
// ==========================================
// Pool de nombres genéricos para generar los otros 59 draftees (tu jugador
// ocupa 1 de los 60 picks, el resto se completa al azar). No son jugadores
// reales, son combinaciones random para darle cuerpo a la noche del Draft.
const NOMBRES_DRAFT = [
    "Jalen", "Marcus", "Tyler", "Devin", "Xavier", "Isaiah", "Malik", "Cameron",
    "Andre", "Terrence", "Darius", "Jaylen", "Kobe", "Elijah", "Amir", "Trey",
    "Jordan", "Christian", "Zion", "Bryce", "Caleb", "Dominique", "Ezekiel", "Nasir",
    "Quentin", "Rashad", "Sterling", "Tremaine", "Wesley", "Deshawn"
];

const APELLIDOS_DRAFT = [
    "Whitfield", "Coleman", "Bridges", "Sanders", "Holloway", "Mercer", "Dunbar",
    "Kessler", "Ashford", "Bellamy", "Carrington", "Donovan", "Emerson", "Fontaine",
    "Grayson", "Hutchins", "Ivory", "Jensen", "Kirkland", "Lassiter", "Monroe",
    "Norwood", "Ogden", "Pruitt", "Quintero", "Radcliffe", "Sinclair", "Thorne",
    "Underwood", "Vance"
];

function generarNombreDraftAleatorio() {
    const nombre = NOMBRES_DRAFT[Math.floor(Math.random() * NOMBRES_DRAFT.length)];
    const apellido = APELLIDOS_DRAFT[Math.floor(Math.random() * APELLIDOS_DRAFT.length)];
    return `${nombre} ${apellido}`;
}

// Arma las 60 posiciones del draft (30 equipos x 2 rondas), inserta a tu
// jugador en el pick que le tocó y completa el resto con nombres al azar.
// Si tenés carrera compartida activa, también intenta insertar al otro
// jugador humano en su pick (si ya está guardado en Firestore para ese
// mismo código de partida).
function generarListaDraftCompleta(pickJugador, nombreJugador, equipoJugador, posicionJugador, draftInfoRival) {
    const lista = [];
    for (let i = 1; i <= 60; i++) {
        const ronda = i <= 30 ? 1 : 2;
        const equipoDelPick = nbaTeams[(i - 1) % 30];
        lista.push({
            pick: i,
            ronda,
            equipo: equipoDelPick,
            nombre: generarNombreDraftAleatorio(),
            esJugadorReal: false
        });
    }

    const indicePropio = lista.findIndex(p => p.pick === pickJugador);
    if (indicePropio !== -1) {
        lista[indicePropio].nombre = `${nombreJugador} (${posicionJugador}) — VOS`;
        lista[indicePropio].equipo = equipoJugador;
        lista[indicePropio].esJugadorReal = true;
    }

    // 🆕 si hay datos del rival compartido, lo insertamos en su pick real
    if (draftInfoRival) {
        const indiceRival = lista.findIndex(p => p.pick === draftInfoRival.pick);
        if (indiceRival !== -1) {
            lista[indiceRival].nombre = `${draftInfoRival.nombre} (${draftInfoRival.posicion}) — RIVAL 🆚`;
            lista[indiceRival].equipo = draftInfoRival.equipo;
            lista[indiceRival].esJugadorRival = true;
        }
    }

    return lista;
}

function renderizarListaDraftHTML(listaDraft) {
    const filas = listaDraft.map(p => {
        let claseEspecial = "";
        if (p.esJugadorReal) claseEspecial = "draft-pick-propio";
        else if (p.esJugadorRival) claseEspecial = "draft-pick-rival";

        return `
            <li class="draft-pick-row ${claseEspecial}">
                <span class="draft-pick-num">#${p.pick}</span>
                <span class="draft-pick-equipo">${p.equipo}</span>
                <span class="draft-pick-nombre">${p.nombre}</span>
            </li>
        `;
    }).join("");

    return `
        <details class="draft-board-details">
            <summary>📋 Ver el Draft completo (60 picks)</summary>
            <ul class="draft-board-list">${filas}</ul>
        </details>
    `;
}

// ==========================================
// 🆕 MEJORA: CURVA DE DESARROLLO POR EDAD DE CARRERA
// ==========================================
// Antes: siempre +1 punto por año, sin importar la experiencia. Eso hacía
// carísimo llegar a un nivel decente (con 10 atributos para repartir, subir
// aunque sea 5 barras te llevaba una década de simulación).
// Ahora: los primeros años (fisicamente el jugador todavía está creciendo y
// aprendiendo el juego pro) dan más puntos, y se va frenando con la edad,
// como en la realidad. Los puntos de logros/premios se siguen sumando aparte
// SIEMPRE, incluso en la fase de declive.
function calcularPuntosBaseDesarrollo(experience) {
    let base;
    if (experience <= 3) base = 3;   // Años 1-3: desarrollo acelerado de novato
    else if (experience <= 7) base = 2;   // Años 4-7: mejoras finas de veterano
    else base = 1;                        // Año 8+: el techo natural ya se tocó, pero no en cero

    const rol = obtenerRolActivo();
    if (rol.bonusDesarrollo) base = Math.round(base * (1 + rol.bonusDesarrollo));
    return base;
}

// ==========================================
// 🆕 NUEVO: SONIDO Y FEEDBACK FÍSICO (Web Audio API, sin archivos)
// ==========================================
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function reproducirTono(freq, duracion, tipoOnda = "sine", volumenInicial = 0.2, delay = 0) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = tipoOnda;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volumenInicial, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duracion);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duracion);
    } catch (e) {
        console.warn("No se pudo reproducir sonido:", e);
    }
}

function sonidoSwish() {
    reproducirTono(1200, 0.08, "sine", 0.15);
    reproducirTono(1800, 0.12, "sine", 0.1, 0.05);
}

function sonidoBuzzer() {
    reproducirTono(120, 0.5, "sawtooth", 0.18);
}

function sonidoLogro() {
    reproducirTono(880, 0.1, "triangle", 0.15);
    reproducirTono(1108, 0.1, "triangle", 0.15, 0.1);
    reproducirTono(1318, 0.18, "triangle", 0.15, 0.2);
}

function sonidoCampeon() {
    [523, 659, 784, 1046, 1318].forEach((freq, i) => {
        reproducirTono(freq, 0.25, "triangle", 0.2, i * 0.12);
    });
}

// Lanza un efecto de confetti simple en un canvas flotante, se auto-destruye solo.
function lanzarConfetti() {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const colores = ["#E2691B", "#D4AF37", "#35A667", "#F4F1EA", "#D6483F"];
    const particulas = Array.from({ length: 140 }, () => ({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.5,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 3,
        tam: 4 + Math.random() * 5,
        color: colores[Math.floor(Math.random() * colores.length)],
        rot: Math.random() * 360,
        vrot: (Math.random() - 0.5) * 10
    }));

    let frames = 0;
    const maxFrames = 220;

    function animar() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particulas.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vrot;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rot * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.tam / 2, -p.tam / 2, p.tam, p.tam * 0.6);
            ctx.restore();
        });
        frames++;
        if (frames < maxFrames) {
            requestAnimationFrame(animar);
        } else {
            canvas.remove();
        }
    }
    animar();
}

// Revisa los logros/lesiones de la temporada recién jugada y dispara el
// sonido/efecto correspondiente. Se llama desde cada pantalla de resultados.
function reproducirFeedbackDeTemporada(res) {
    const nombresLogros = (res.logros || []).map(l => l.nombre);
    if (nombresLogros.includes("Campeón de la NBA 🏆")) {
        sonidoCampeon();
        lanzarConfetti();
    } else if (res.logros && res.logros.length > 0) {
        sonidoLogro();
    }
    if (res.mensajeLesion && res.mensajeLesion.includes("🚑")) {
        sonidoBuzzer();
    }
}

// ==========================================
// 🆕 NUEVO: CARTAS COLECCIONABLES DE TEMPORADA
// ==========================================
const ESTILOS_RAREZA = {
    "Común": { color: "#8B93A3", emoji: "⚪" },
    "Rara": { color: "#35A667", emoji: "🟢" },
    "Épica": { color: "#9B6FE8", emoji: "🟣" },
    "Legendaria": { color: "#D4AF37", emoji: "🌟" }
};

function determinarRarezaTemporada(res) {
    const nombresLogros = (res.logros || []).map(l => l.nombre);
    const logrosLegendarios = ["Campeón de la NBA 🏆", "MVP de la Temporada 👑", "Finals MVP 🏅"];
    const logrosEpicos = ["All-NBA Team ⭐", "Mejor Defensor del Año (DPOY) 🛡️", "Rookie del Año (ROY) 🏅", "Finalista de la NBA 🏀"];
    const logrosRaros = ["Finalista de Conferencia", "Equipo Defensivo Ideal 🛡️⭐", "Sexto Hombre del Año 🎖️", "Most Improved Player 📈", "All-Rookie Team", "Clasificación a Playoffs 🎟️"];

    if (nombresLogros.some(n => logrosLegendarios.includes(n)) || res.rendimientoPer36 >= 55) return "Legendaria";
    if (nombresLogros.some(n => logrosEpicos.includes(n)) || res.rendimientoPer36 >= 42) return "Épica";
    if (nombresLogros.some(n => logrosRaros.includes(n)) || res.rendimientoPer36 >= 28) return "Rara";
    return "Común";
}

function generarCartaDeTemporada(res) {
    const rareza = determinarRarezaTemporada(res);
    const carta = {
        year: res.year,
        team: res.team,
        position: gameState.player.position,
        pts: res.pts, ast: res.ast, reb: res.reb, stl: res.stl, blk: res.blk,
        tipoAño: res.tipoAzar,
        rareza
    };
    gameState.cardCollection.push(carta);
    return carta;
}

function renderizarCartaHTML(carta) {
    const estilo = ESTILOS_RAREZA[carta.rareza] || ESTILOS_RAREZA["Común"];
    return `
        <div class="trading-card" style="--rareza-color: ${estilo.color};">
            <div class="trading-card-header">
                <span class="trading-card-rareza">${estilo.emoji} ${carta.rareza}</span>
                <span class="trading-card-year">Año ${carta.year}</span>
            </div>
            <h4>${gameState.player.firstName} ${gameState.player.lastName}</h4>
            <p class="trading-card-meta">${carta.position} · ${carta.team}</p>
            <div class="trading-card-stats">
                <span>${carta.pts} PTS</span>
                <span>${carta.ast} AST</span>
                <span>${carta.reb} REB</span>
                <span>${carta.stl} STL</span>
                <span>${carta.blk} BLK</span>
            </div>
            <p class="trading-card-tipo">${carta.tipoAño}</p>
        </div>
    `;
}

// Recuerda qué pantalla estaba visible antes de abrir la galería, para
// poder volver exactamente a donde estabas al cerrarla.
let pantallaAntesDeColeccion = null;

function mostrarColeccionCartas() {
    const idsPantallas = ["creation-screen", "draft-screen", "season-screen", "office-screen", "evento-screen", "retire-screen"];
    pantallaAntesDeColeccion = idsPantallas.find(id => {
        const el = document.getElementById(id);
        return el && !el.classList.contains("hidden");
    }) || null;

    idsPantallas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });

    let cardsScreen = document.getElementById("cards-screen");
    if (!cardsScreen) {
        cardsScreen = document.createElement("section");
        cardsScreen.id = "cards-screen";
        document.getElementById("game-container").appendChild(cardsScreen);
    }
    cardsScreen.classList.remove("hidden");

    const cartasHTML = gameState.cardCollection.length > 0
        ? gameState.cardCollection.slice().reverse().map(renderizarCartaHTML).join("")
        : `<p class="career-no-trophies">Todavía no completaste ninguna temporada.</p>`;

    cardsScreen.innerHTML = `
        <h2>🎴 Mi Colección de Cartas</h2>
        <div class="cards-grid">${cartasHTML}</div>
        <button onclick="cerrarColeccionCartas()">Volver ↩️</button>
    `;
}

function cerrarColeccionCartas() {
    const cardsScreen = document.getElementById("cards-screen");
    if (cardsScreen) cardsScreen.classList.add("hidden");
    if (pantallaAntesDeColeccion) {
        const el = document.getElementById(pantallaAntesDeColeccion);
        if (el) el.classList.remove("hidden");
    }
}

// ==========================================
// FUNCIÓN PRINCIPAL: SIMULAR EL DRAFT ALEATORIO
// ==========================================
async function simularDraft() {
    asignarRivalDeFranquicia();
    cachearRivalHistorico();
    const inputNombre = document.getElementById("firstname").value.trim();
    const inputApellido = document.getElementById("lastname").value.trim();
    const selectPosicion = document.getElementById("position").value;

    if (inputNombre === "" || inputApellido === "") {
        alert("Por favor, completá tu nombre y apellido antes de entrar al Draft.");
        return;
    }

    gameState.player.firstName = inputNombre;
    gameState.player.lastName = inputApellido;
    gameState.player.position = selectPosicion;

    // 🆕 Modo Carrera Compartida (opcional)
    const codigoIngresado = document.getElementById("codigo-partida").value.trim();
    gameState.player.codigoPartida = codigoIngresado || null;
    gameState.player.slotPropio = codigoIngresado ? document.getElementById("slot-jugador").value : null;

    // 🆕 si hay carrera compartida, mira qué pick ya ocupó el rival (si ya
    // hizo su Draft) para no repetir el mismo número.
    let pickOcupadoPorRival = null;
    if (tieneCarreraCompartida()) {
        const draftRival = await obtenerPickDelRivalCompartido();
        if (draftRival) pickOcupadoPorRival = draftRival.pick;
    }

    let pickAleatorio;
    do {
        pickAleatorio = Math.floor(Math.random() * 60) + 1;
    } while (pickAleatorio === pickOcupadoPorRival);

    let equiposDisponiblesDraft = nbaTeams;
    if (tieneCarreraCompartida()) {
        const draftRivalParaEquipo = await obtenerPickDelRivalCompartido();
        if (draftRivalParaEquipo && draftRivalParaEquipo.equipo) {
            equiposDisponiblesDraft = nbaTeams.filter(t => t !== draftRivalParaEquipo.equipo);
        }
    }
    const equipoAleatorio = equiposDisponiblesDraft[Math.floor(Math.random() * equiposDisponiblesDraft.length)];

    gameState.player.currentTeam = equipoAleatorio;
    gameState.player.contractYearsLeft = 2;
    gameState.player.pickDeDraft = pickAleatorio; // 🆕 se guarda para armar el listado
    asignarRivalDeFranquicia();

    let puntosOtorgados = 0;
    let minutosIniciales = 0;

    if (pickAleatorio >= 1 && pickAleatorio <= 5) {
        puntosOtorgados = 65;
        minutosIniciales = Math.floor(Math.random() * 4) + 32;
    } else if (pickAleatorio >= 6 && pickAleatorio <= 15) {
        puntosOtorgados = 55;
        minutosIniciales = Math.floor(Math.random() * 5) + 24;
    } else if (pickAleatorio >= 16 && pickAleatorio <= 30) {
        puntosOtorgados = 42;
        minutosIniciales = Math.floor(Math.random() * 7) + 16;
    } else {
        puntosOtorgados = 30;
        minutosIniciales = Math.floor(Math.random() * 5) + 8;
    }

    gameState.player.availablePoints = puntosOtorgados;
    gameState.player.minutesPerGame = minutosIniciales;
    gameState.player.rolEquipo = asignarRolInicialPorPick(pickAleatorio);

    // 🆕 guarda tu pick en Firestore para que el otro dispositivo lo vea
    guardarPickPropioCompartido({
        pick: pickAleatorio,
        equipo: equipoAleatorio,
        nombre: `${inputNombre} ${inputApellido}`,
        posicion: selectPosicion
    });

    mostrarPantallaAsignacion(pickAleatorio, equipoAleatorio, puntosOtorgados, minutosIniciales);
}

// ==========================================
// 🆕 MEJORA: MENSAJE CLARO DE "TENÉS QUE REPARTIR TODO"
// ==========================================
// El botón de confirmar ya estaba deshabilitado hasta gastar los puntos,
// pero no quedaba claro POR QUÉ. Este mensaje deja explícita la regla: no se
// puede avanzar de temporada con puntos sin repartir.
function generarMensajePuntosHint(puntos) {
    if (puntos > 0 && todosLosAtributosAlTope()) {return `<p id="puntos-hint" style="color: var(--scoreboard-green);">✅ Ya tenés todos los atributos al máximo posible para tu posición. Los <strong>${puntos}</strong> punto(s) restantes no se pueden usar — ya podés confirmar.</p>`;
        
    }
    if (puntos > 0) {
        return `<p id="puntos-hint" style="color: var(--hardwood);">⚠️ Repartí los <strong>${puntos}</strong> punto(s) restantes para poder confirmar y simular la temporada.</p>`;
    }
    if (puntos < 0) {
        return `<p id="puntos-hint" style="color: var(--foul-red);">Te pasaste de puntos, sacá alguno con el botón "-".</p>`;
    }
    return `<p id="puntos-hint" style="color: var(--scoreboard-green);">✅ Repartiste todos tus puntos. Ya podés confirmar.</p>`;
}

// ==========================================
// INTERFAZ: MOSTRAR RESULTADO DEL DRAFT
// ==========================================
function mostrarPantallaAsignacion(pick, equipo, puntos, minutos) {
    document.getElementById("creation-screen").style.display = "none";

    const draftScreen = document.getElementById("draft-screen");
    draftScreen.style.display = "block";
    draftScreen.classList.remove("hidden");

    gameState.player.minutosAlArrancarTemporada = minutos;
    gameState.player.objetivoTemporadaActivo = sortearObjetivoDeTemporada(true);
    draftScreen.innerHTML = `
        <h2>¡Noche del Draft NBA! 🏀</h2>
        <div class="draft-card">
            <p>Con el <strong>Pick #${pick}</strong> del Draft, los <strong>${equipo}</strong> seleccionan a:</p>
            <h3>${gameState.player.firstName} ${gameState.player.lastName} (${gameState.player.position})</h3>
        </div>

        <div id="draft-board-container">
            ${renderizarListaDraftHTML(generarListaDraftCompleta(pick, `${gameState.player.firstName} ${gameState.player.lastName}`, equipo, gameState.player.position, null))}
        </div>

        <div class="status-box">
            <p><strong>Contrato firmado:</strong> 2 Años obligatorios (Escala de Rookie).</p>
            <p><strong>Tiempo en cancha inicial:</strong> Jugarás aprox. <strong>${minutos} minutos</strong> por partido debido a tu posición de Draft.</p>
            <p>Bolsa de puntos iniciales otorgados: <strong>${puntos} puntos libres</strong>.</p>
        </div>

        <hr>
        <h3>Repartí tus puntos de Atributos (Máximo 20 por barra, según tu posición):</h3>
        <p>Puntos restantes: <span id="puntos-contador">${puntos}</span></p>
        ${generarMensajePuntosHint(puntos)}

        <div id="contenedor-atributos">
            <!-- Los controlamos en el siguiente paso -->
        </div>

        ${renderizarObjetivoActivoHTML(gameState.player.objetivoTemporadaActivo)}
        ${renderizarSelectorEnfoque()}

        <button id="btn-confirmar-atributos" disabled>Confirmar Atributos y Simular Año 1 🚀</button>
    `;
    renderizarControlesAtributos();

    const btnConfirmar = document.getElementById("btn-confirmar-atributos");
    btnConfirmar.onclick = iniciarTemporadaUno;

    // 🆕 si hay carrera compartida, busca el pick del rival (por si ya
    // drafteó) y actualiza el listado con su nombre insertado.
    if (tieneCarreraCompartida()) {
        obtenerPickDelRivalCompartido().then(draftInfoRival => {
            if (!draftInfoRival) return;
            const contenedor = document.getElementById("draft-board-container");
            if (contenedor) {
                contenedor.innerHTML = renderizarListaDraftHTML(
                    generarListaDraftCompleta(pick, `${gameState.player.firstName} ${gameState.player.lastName}`, equipo, gameState.player.position, draftInfoRival)
                );
            }
        });
    }
}

// ==========================================
// INTERFAZ: GENERAR SELECTORES DE ATRIBUTOS
// ==========================================
function renderizarControlesAtributos() {
    const contenedor = document.getElementById("contenedor-atributos");
    contenedor.innerHTML = "";

    const nombresAmigables = {
        bandeja: "Bandeja", clavada: "Clavada", tiroInterior: "Tiro Interior",
        mediaDistancia: "Media Distancia", triple: "Triple", tiroLibre: "Tiro Libre",
        dribbling: "Dribbling", pase: "Pase", vision: "Visión de Juego",
        rebote: "Rebote", tapon: "Tapón", robo: "Robo",
        fuerza: "Fuerza", velocidad: "Velocidad", resistencia: "Resistencia"
    };

    Object.keys(gameState.attributes).forEach(attr => {
        const tope = obtenerTopeAtributo(gameState.player.position, attr);
        const fila = document.createElement("div");
        fila.className = "attr-row";
        fila.innerHTML = `
            <span class="attr-name">${nombresAmigables[attr]} <small style="opacity:0.6">(tope ${tope})</small>:</span>
            <button onclick="modificarAtributo('${attr}', -1)">-</button>
            <span id="val-${attr}" class="attr-value">${gameState.attributes[attr]}</span>
            <button onclick="modificarAtributo('${attr}', 1)">+</button>
        `;
        contenedor.appendChild(fila);
    });
}

// ==========================================
// LÓGICA: MODIFICAR PUNTOS (Suma / Resta)
// ==========================================
function modificarAtributo(attr, cambio) {
    if (gameState.player.isRetired) return; // 🆕 FIX: no dejar entrenar a un jugador retirado

    const valorActual = gameState.attributes[attr];
    const puntosDisponibles = gameState.player.availablePoints;

    const tope = obtenerTopeAtributo(gameState.player.position, attr);
    if (cambio === 1 && (valorActual >= tope || puntosDisponibles <= 0)) return;
    if (cambio === -1 && valorActual <= 1) return;

    gameState.attributes[attr] += cambio;
    gameState.player.availablePoints -= cambio;

    document.getElementById(`val-${attr}`).innerText = gameState.attributes[attr];
    document.getElementById("puntos-contador").innerText = gameState.player.availablePoints;

    const hint = document.getElementById("puntos-hint");
    if (hint) hint.outerHTML = generarMensajePuntosHint(gameState.player.availablePoints);

    const btnConfirmar = document.getElementById("btn-confirmar-atributos");
    if (btnConfirmar) actualizarEstadoBotonConfirmar();
}

// ==========================================
// 🆕 NUEVO: ROLES DENTRO DEL EQUIPO
// ==========================================
const ROLES_EQUIPO = {
    franquicia: {
        nombre: "Franquicia ⭐⭐", franja: "Estrella",
        minMin: 34, maxMin: 38,
        mult: { pts: 1.18, ast: 1.08, reb: 0.95, stl: 0.95, blk: 0.95 },
        pesoCalidadEquipo: 1.6,
        premiosBloqueados: [],
        descripcion: "El equipo se arma alrededor tuyo. Todo el peso ofensivo cae en tus manos."
    },
    primeraOpcion: {
        nombre: "Primera Opción ⭐", franja: "Estrella",
        minMin: 30, maxMin: 34,
        mult: { pts: 1.12, ast: 1.0, reb: 0.97, stl: 0.97, blk: 0.97 },
        pesoCalidadEquipo: 1.3,
        premiosBloqueados: [],
        descripcion: "Cargás con el mayor peso ofensivo del plantel."
    },
    segundaOpcion: {
        nombre: "Segunda Opción 🎯", franja: "Titular",
        minMin: 26, maxMin: 30,
        mult: { pts: 1.0, ast: 1.0, reb: 1.0, stl: 1.0, blk: 1.0 },
        pesoCalidadEquipo: 1.0,
        premiosBloqueados: [],
        descripcion: "El complemento ideal: buen volumen sin cargar con todo el peso."
    },
    motorDeJuego: {
        nombre: "Motor de Juego 🧠", franja: "Titular",
        minMin: 26, maxMin: 30,
        mult: { pts: 0.88, ast: 1.20, reb: 1.0, stl: 1.05, blk: 0.95 },
        pesoCalidadEquipo: 1.0,
        premiosBloqueados: [],
        descripcion: "Titular cuya función es armar juego para el resto, no anotar."
    },
    anclaDefensiva: {
        nombre: "Ancla Defensiva 🛡️", franja: "Titular",
        minMin: 24, maxMin: 28,
        mult: { pts: 0.85, ast: 0.95, reb: 1.05, stl: 1.20, blk: 1.20 },
        pesoCalidadEquipo: 1.0,
        premiosBloqueados: [],
        descripcion: "Titular cuya función es defender, no anotar."
    },
    sextoHombre: {
        nombre: "Sexto Hombre de Impacto 🔋", franja: "Banco",
        minMin: 20, maxMin: 24,
        mult: { pts: 1.08, ast: 1.08, reb: 1.08, stl: 1.08, blk: 1.08 },
        pesoCalidadEquipo: 0.6,
        premiosBloqueados: ["mvp", "allNba"],
        descripcion: "Entrás desde el banco a cambiar partidos con energía fresca."
    },
    especialista: {
        nombre: "Especialista de Rotación 🧩", franja: "Banco",
        minMin: 16, maxMin: 20,
        mult: { pts: 0.90, ast: 0.90, reb: 0.90, stl: 0.90, blk: 0.90 }, // se ajusta con la especialidad elegida
        pesoCalidadEquipo: 0.4,
        premiosBloqueados: ["mvp", "allNba", "dpoy", "allDefensive"],
        descripcion: "Hacés una cosa muy bien y la hacés todo el tiempo."
    },
    proyecto: {
        nombre: "Proyecto a Futuro 🌱", franja: "Marginal",
        minMin: 8, maxMin: 14,
        mult: { pts: 0.90, ast: 0.90, reb: 0.90, stl: 0.90, blk: 0.90 },
        pesoCalidadEquipo: 0.2,
        premiosBloqueados: ["mvp", "allNba", "dpoy", "allDefensive", "sextoHombre", "mip"],
        bonusDesarrollo: 0.5, // +50% puntos de entrenamiento
        descripcion: "Minutos muy bajos, pero el equipo invierte en tu desarrollo."
    }
};

function obtenerRolActivo() {
    const key = gameState.player.rolEquipo;
    return ROLES_EQUIPO[key] || ROLES_EQUIPO.segundaOpcion;
}

// Especialidad elegida para el rol "Especialista" (una de: pts, ast, reb, stlblk)
function aplicarEspecialidadElegida(rol) {
    if (gameState.player.rolEquipo !== "especialista" || !gameState.player.especialidadElegida) return rol;
    const especial = { ...rol, mult: { ...rol.mult } };
    const esp = gameState.player.especialidadElegida;
    if (esp === "pts") especial.mult.pts = 1.25;
    else if (esp === "ast") especial.mult.ast = 1.25;
    else if (esp === "reb") especial.mult.reb = 1.25;
    else if (esp === "stlblk") { especial.mult.stl = 1.25; especial.mult.blk = 1.25; }
    return especial;
}

// Asigna un rol inicial al draftear, según el pick.
function asignarRolInicialPorPick(pick) {
    if (pick <= 5) return "primeraOpcion";
    if (pick <= 20) return "segundaOpcion";
    if (pick <= 40) return "sextoHombre";
    return "proyecto";
}

// ==========================================
// 🆕 MEJORA: LA POSICIÓN AHORA IMPORTA
// ==========================================
// El <select> de posición se guardaba en gameState.player.position pero
// nunca se usaba para nada — daba lo mismo elegir Base que Pívot. Ahora cada
// posición da una pequeña ventaja/desventaja natural (un Base pasa mejor
// pero rebotea menos, un Pívot rebotea mejor pero pasa menos), sin romper el
// balance: son ajustes de ±15% como mucho, no un multiplicador que decida la
// carrera por sí solo.
// 🆕 MEJORA: el bono por posición pasa de ser un ±10-15% decorativo a pesar
// de verdad en el rendimiento real (no solo en el GRL que se muestra en la
// tarjeta). Ahora también cubre robos y tapones (las nuevas stats), para que
// un Base que descuida el pase o un Pívot que descuida el rebote/tapón lo
// sufra de verdad en la planilla, no solo en un número cosmético.
const bonosPorPosicion = {
    "Base":       { tiro: 1.00, pases: 1.30, reboteo: 0.68, robos: 1.20, tapones: 0.55 },
    "Escolta":    { tiro: 1.15, pases: 0.90, reboteo: 0.75, robos: 1.10, tapones: 0.60 },
    "Alero":      { tiro: 1.05, pases: 1.00, reboteo: 1.00, robos: 1.00, tapones: 1.00 },
    "Ala-Pívot":  { tiro: 0.90, pases: 0.75, reboteo: 1.20, robos: 0.90, tapones: 1.25 },
    "Pívot":      { tiro: 0.80, pases: 0.65, reboteo: 1.30, robos: 0.75, tapones: 1.40 }
};

// ==========================================
// 🆕 NUEVO: TOPES DUROS DE ATRIBUTOS POR POSICIÓN
// ==========================================
// Cada posición tiene un límite máximo distinto para cada atributo, en vez
// de que todos puedan llegar a 20 en todo. Esto obliga a builds realistas:
// un Base no puede ser un tapón elite, un Pívot no puede ser un asesino del
// triple. El límite general (si no está listado) es 20.
const TOPES_POR_POSICION = {
    "Base": {
        clavada: 12, tiroInterior: 14, rebote: 12, tapon: 8, fuerza: 14,
        dribbling: 20, vision: 20, pase: 20, triple: 20, velocidad: 20
    },
    "Escolta": {
        clavada: 14, rebote: 13, tapon: 10, fuerza: 15,
        triple: 20, mediaDistancia: 20, dribbling: 20
    },
    "Alero": {
        // el más versátil: sin topes especiales, todo hasta 20
    },
    "Ala-Pívot": {
        triple: 14, dribbling: 13, vision: 13, velocidad: 15,
        rebote: 20, fuerza: 20, tapon: 20
    },
    "Pívot": {
        triple: 10, dribbling: 10, vision: 12, velocidad: 13, pase: 13,
        rebote: 20, tapon: 20, fuerza: 20, clavada: 20
    }
};

function obtenerTopeAtributo(position, attr) {
    const topes = TOPES_POR_POSICION[position];
    if (topes && topes[attr] !== undefined) return topes[attr];
    return 20; // tope general si no hay restricción especial
}

function obtenerBonoPosicion(position) {
    return bonosPorPosicion[position] || { tiro: 1.0, pases: 1.0, reboteo: 1.0, robos: 1.0, tapones: 1.0 };
}

// ==========================================
// 🆕 MEJORA: GRL PONDERADO POR POSICIÓN
// ==========================================
// Antes el GRL era un promedio plano de los 10 atributos: a un Pívot le
// pesaba igual el Tiro Exterior que el Rebote, y a un Base le pesaba igual
// la Fuerza que la Visión de Juego — no reflejaba el rol real del jugador en
// la cancha. Ahora cada posición tiene su propio set de pesos (todos suman
// 1.0) que reflejan qué atributos son más importantes ahí, como en cualquier
// videojuego de básquet: un Base vale por manejo/pases/visión, un Pívot por
// rebote/fuerza/juego interior.
const pesosGRLPorPosicion = {
    "Base": {
        bandeja: 0.03, clavada: 0.02, tiroInterior: 0.03, mediaDistancia: 0.06, triple: 0.10, tiroLibre: 0.03,
        dribbling: 0.15, pase: 0.18, vision: 0.15,
        rebote: 0.03, tapon: 0.01, robo: 0.10,
        fuerza: 0.03, velocidad: 0.06, resistencia: 0.02
    },
    "Escolta": {
        bandeja: 0.04, clavada: 0.03, tiroInterior: 0.05, mediaDistancia: 0.14, triple: 0.16, tiroLibre: 0.04,
        dribbling: 0.12, pase: 0.06, vision: 0.06,
        rebote: 0.05, tapon: 0.01, robo: 0.09,
        fuerza: 0.04, velocidad: 0.08, resistencia: 0.03
    },
    "Alero": {
        bandeja: 0.05, clavada: 0.04, tiroInterior: 0.06, mediaDistancia: 0.09, triple: 0.09, tiroLibre: 0.04,
        dribbling: 0.08, pase: 0.07, vision: 0.07,
        rebote: 0.07, tapon: 0.04, robo: 0.07,
        fuerza: 0.07, velocidad: 0.07, resistencia: 0.09
    },
    "Ala-Pívot": {
        bandeja: 0.06, clavada: 0.07, tiroInterior: 0.12, mediaDistancia: 0.04, triple: 0.02, tiroLibre: 0.03,
        dribbling: 0.03, pase: 0.03, vision: 0.03,
        rebote: 0.16, tapon: 0.10, robo: 0.04,
        fuerza: 0.17, velocidad: 0.04, resistencia: 0.06
    },
    "Pívot": {
        bandeja: 0.08, clavada: 0.10, tiroInterior: 0.12, mediaDistancia: 0.02, triple: 0.01, tiroLibre: 0.02,
        dribbling: 0.01, pase: 0.02, vision: 0.02,
        rebote: 0.18, tapon: 0.14, robo: 0.02,
        fuerza: 0.18, velocidad: 0.02, resistencia: 0.06
    }
};

// ==========================================
// 🆕 NUEVO: OBJETIVOS DE TEMPORADA
// ==========================================
const OBJETIVOS_TEMPORADA = [
    { id: "pts25", texto: "Anotá 25+ PTS de promedio", puntos: 2,
      chequear: (res) => res.pts >= 25 },
    { id: "ast8", texto: "Repartí 8+ AST de promedio", puntos: 2,
      chequear: (res) => res.ast >= 8 },
    { id: "reb10", texto: "Capturá 10+ REB de promedio", puntos: 2,
      chequear: (res) => res.reb >= 10 },
    { id: "combo45", texto: "Sumá un combinado de 45+ (PTS+AST+REB)", puntos: 2,
      chequear: (res) => (res.pts + res.ast + res.reb) >= 45 },
    { id: "stl2", texto: "Conseguí 2+ STL de promedio", puntos: 3,
      chequear: (res) => res.stl >= 2 },
    { id: "blk2", texto: "Conseguí 2+ BLK de promedio", puntos: 3,
      chequear: (res) => res.blk >= 2 },
    { id: "combodef", texto: "Sumá 3.5+ combinados de STL+BLK", puntos: 3,
      chequear: (res) => (res.stl + res.blk) >= 3.5 },
    { id: "playoffs", texto: "Llegá a Playoffs con tu franquicia", puntos: 1,
      chequear: (res) => res.logros.some(l => l.nombre.includes("Playoffs") || l.nombre.includes("Finalista") || l.nombre.includes("Campeón")) },
    { id: "serie", texto: "Ganá al menos 1 serie de Playoffs", puntos: 3,
      chequear: (res) => res.logros.some(l => l.nombre.includes("Finalista de Conferencia") || l.nombre.includes("Finalista de la NBA") || l.nombre.includes("Campeón")) },
    { id: "sinlesion", texto: "Terminá la temporada sin sufrir ninguna lesión", puntos: 1,
      chequear: (res) => !res.mensajeLesion },
    { id: "min30", texto: "Mantené 30+ minutos de promedio en la temporada", puntos: 1,
      chequear: (res) => res.min >= 30 },
    { id: "mvpAllNba", texto: "Conseguí una candidatura a MVP o All-NBA", puntos: 5,
      chequear: (res) => !!(res.candidaturas && (res.candidaturas.mvp || res.candidaturas.allNba)) },
    { id: "dpoyAllDef", texto: "Conseguí una candidatura a DPOY o Equipo Defensivo", puntos: 5,
      chequear: (res) => !!(res.candidaturas && (res.candidaturas.dpoy || res.candidaturas.allDefensive)) },
    { id: "royRookie", texto: "Conseguí ROY o All-Rookie (solo aplica si sos rookie)", puntos: 4,
      soloRookie: true,
      chequear: (res) => !!(res.candidaturas && (res.candidaturas.roy || res.candidaturas.allRookie)) },
    { id: "mejoraPts", texto: "Mejorá tu PTS respecto al año anterior", puntos: 1,
      requiereHistorial: true,
      chequear: (res, historialPrevio) => historialPrevio && res.pts > historialPrevio.pts },
    { id: "masMinutos", texto: "Terminá con más minutos de los que arrancaste la temporada", puntos: 1,
      chequear: (res, historialPrevio, minutosAlArrancar) => res.min > minutosAlArrancar },
    { id: "rivalHistorico", texto: "Superá el ritmo de tu rival histórico esta temporada", puntos: 2,
      chequear: (res) => !!(res.mensajeRivalHistorico && res.mensajeRivalHistorico.includes("superando")) }
];

// Sortea un objetivo válido para la temporada (evita "royRookie" si no sos
// rookie, y evita repetir el mismo que el año pasado si hay otras opciones).
function sortearObjetivoDeTemporada(esRookie) {
    const anteriorId = gameState.player.objetivoTemporadaAnteriorId;
    let candidatos = OBJETIVOS_TEMPORADA.filter(o => !o.soloRookie || esRookie);
    if (candidatos.length > 1) {
        const sinRepetir = candidatos.filter(o => o.id !== anteriorId);
        if (sinRepetir.length > 0) candidatos = sinRepetir;
    }
    const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
    gameState.player.objetivoTemporadaAnteriorId = elegido.id;
    return elegido;
}

// Verifica el objetivo activo contra el resultado de la temporada recién
// jugada y devuelve { cumplido, objetivo } para mostrar en pantalla.
function verificarObjetivoDeTemporada(resultadoAño) {
    const objetivo = gameState.player.objetivoTemporadaActivo;
    if (!objetivo) return null;

    const historial = gameState.statsHistory;
    const historialPrevio = historial.length >= 2 ? historial[historial.length - 2] : null;
    const minutosAlArrancar = gameState.player.minutosAlArrancarTemporada || 0;

    const cumplido = objetivo.chequear(resultadoAño, historialPrevio, minutosAlArrancar);
    return { cumplido, objetivo };
}

function renderizarObjetivoActivoHTML(objetivo) {
    if (!objetivo) return "";
    return `
        <div class="status-box alert-info logros-box">
            <h3>🎯 Objetivo de la Temporada</h3>
            <p>${objetivo.texto} <strong>(+${objetivo.puntos} pts si lo cumplís)</strong></p>
        </div>
    `;
}

function renderizarResultadoObjetivoHTML(resultadoObjetivo) {
    if (!resultadoObjetivo) return "";
    const { cumplido, objetivo } = resultadoObjetivo;
    if (cumplido) {
        return `
            <div class="status-box alert-evento">
                <p>✅ <strong>Objetivo Cumplido:</strong> ${objetivo.texto} — ganaste <strong>${objetivo.puntos} puntos extra</strong>.</p>
            </div>
        `;
    }
    return `
        <div class="status-box alert-warning">
            <p>❌ <strong>Objetivo No Cumplido:</strong> ${objetivo.texto}</p>
        </div>
    `;
}

// 🆕 MEJORA: antes calcularGRL() calculaba el promedio ponderado por posición
// solo para pintar el número de la tarjeta, y simularAñoDos() calculaba los
// minutos con un promedio PLANO aparte (sumaAtributos/10). Resultado: a
// partir del año 2 los minutos que jugabas no reflejaban tu build real, y un
// Pívot enorme en rebote/fuerza pero flojo en tiro exterior podía terminar
// con menos minutos que su nivel real ameritaba, o viceversa. Ahora ambos
// usan la misma base ponderada.
function calcularPromedioPonderadoPorPosicion() {
    const attrs = gameState.attributes;
    const pesos = pesosGRLPorPosicion[gameState.player.position];
    if (!pesos) {
        return Object.values(attrs).reduce((a, b) => a + b, 0) / 10;
    }
    let promedio = 0;
    Object.keys(pesos).forEach(attr => {
        promedio += attrs[attr] * pesos[attr];
    });
    return promedio;
}

// 🆕 Detecta si el compañero de partida está en TU MISMO equipo actual.
// Usa el progreso ya sincronizado (no bloqueante, puede estar un poco viejo).
function obtenerDatosRivalMismoEquipo() {
    if (!tieneCarreraCompartida()) return null;
    const datosRival = gameState.player.progresoRivalCacheado;
    if (!datosRival || datosRival.isRetired) return null;
    if (datosRival.team !== gameState.player.currentTeam) return null;
    return datosRival;
}

// ==========================================
// 🆕 MEJORA: MINUTOS DINÁMICOS AÑO A AÑO
// ==========================================
// Antes los minutos se fijaban una sola vez en el Draft y se recalculaban
// SOLO una vez más en el Año 2 (con 3 escalones fijos muy gruesos). Del Año 3
// en adelante quedaban congelados para siempre, sin importar cuánto mejorara
// el jugador. Ahora se recalculan TODOS los años con una escala continua
// (no 3 casilleros) y hay chance real de "dar el salto" (breakout) si venís
// relegado pero rindiendo bien, o de perder terreno (regresión) aunque
// tengas buen nivel — como en la vida real, no todo depende solo de tu GRL.
function calcularMinutosDelAño(modificadorSuerte) {
    const player = gameState.player;
    const grl = calcularPromedioPonderadoPorPosicion(); // 1 a 15

    const fraccion = (grl - 1) / 19; // 0 (piso) a 1 (techo absoluto)
    let base = 6 + fraccion * 32; // escala continua: 6 a 38 minutos según nivel

    // 🆕 El rol declarado "atrae" los minutos hacia su rango asignado.
    const rolMin = obtenerRolActivo();
    const puntoMedioRol = (rolMin.minMin + rolMin.maxMin) / 2;
    base = base * 0.55 + puntoMedioRol * 0.45; // mezcla: 55% tu nivel real, 45% lo que tu rol dicta

    // Ruido normal de un año a otro: competencia en el roster, preferencias
    // del cuerpo técnico, fichajes nuevos que te compiten el puesto, etc.
    base += (Math.random() - 0.5) * 6; // ±3

    // Tu rendimiento reciente influye en la confianza del entrenador
    if (gameState.statsHistory.length > 0) {
        const ultimo = gameState.statsHistory[gameState.statsHistory.length - 1];
        if (ultimo.rendimientoPer36 >= 30) base += 3;
        else if (ultimo.rendimientoPer36 <= 8) base -= 3;
    }

    // 🆕 El "tipo de año" (suerte) también empuja los minutos: un año de
    // gracia genera más confianza del cuerpo técnico, un año de bajón te
    // puede sacar del rotation. Rango: modificadorSuerte 0.65 (maldita) a
    // 1.42 (histórica), centrado en ~1.05, así que esto suma entre -4.8 y +4.4.
    base += (modificadorSuerte - 1.05) * 12;

    // Chance de BREAKOUT: relegado pero con nivel real para más minutos.
    // Un año de gracia/racha (suerte alta) duplica la chance de que se dé.
    let huboBreakout = false;
    let huboRegresion = false;
    const probBreakoutBase = modificadorSuerte >= 1.15 ? 0.32 : 0.18;
    const probRegresionBase = modificadorSuerte <= 0.85 ? 0.20 : 0.10;

    if (player.minutesPerGame <= 18 && grl >= 11 && Math.random() < probBreakoutBase) {
        base += 10 + Math.random() * 8;
        huboBreakout = true;
    } else if (player.minutesPerGame >= 24 && Math.random() < probRegresionBase) {
        base -= 8 + Math.random() * 8;
        huboRegresion = true;
    }

    let minutos = Math.round(Math.max(4, Math.min(40, base)));

    // 🆕 PELEA POR MINUTOS: si tu compañero de partida está en tu mismo equipo,
    // los minutos de los dos no pueden convivir sin tensión — el que rindió
    // mejor recientemente se queda con más cancha.
    const rivalMismoEquipo = obtenerDatosRivalMismoEquipo();
    let mensajePeleaMinutos = null;
    if (rivalMismoEquipo) {
        const miRendimientoReciente = gameState.statsHistory.length > 0
            ? gameState.statsHistory[gameState.statsHistory.length - 1].rendimientoPer36 : 15;
        const rendimientoRival = rivalMismoEquipo.rendimientoPer36 || 15;
        const TECHO_COMBINADO = 62; // los dos no pueden sumar más de esto en minutos

        const totalDeseado = minutos + (rivalMismoEquipo.minutesPerGame || minutos);
        if (totalDeseado > TECHO_COMBINADO) {
            const proporcionPropia = miRendimientoReciente / (miRendimientoReciente + rendimientoRival || 1);
            const minutosAjustados = Math.round(TECHO_COMBINADO * proporcionPropia);
            if (minutosAjustados < minutos) {
                mensajePeleaMinutos = `⚔️ Compartís roster con ${rivalMismoEquipo.firstName} — el cuerpo técnico repartió minutos entre los dos, y esta vez cediste algo de cancha.`;
            } else {
                mensajePeleaMinutos = `⚔️ Compartís roster con ${rivalMismoEquipo.firstName} — te ganaste la pelea por minutos esta temporada.`;
            }
            minutos = Math.max(4, Math.min(40, minutosAjustados));
        }
    }

    return { minutos, huboBreakout, huboRegresion, mensajePeleaMinutos };
}

function renderizarMensajeMinutosHTML(huboBreakout, huboRegresion, minutosNuevos, mensajePeleaMinutos) {
    if (mensajePeleaMinutos) {
        return `<div class="status-box alert-equipo"><p>${mensajePeleaMinutos} Terminaste con <strong>${minutosNuevos} minutos</strong> por partido.</p></div>`;
    }
    if (huboBreakout) {
        return `<div class="status-box alert-evento"><p>📈 <strong>¡Diste el salto!</strong> El cuerpo técnico te subió en la rotación: ahora vas a jugar cerca de <strong>${minutosNuevos} minutos</strong> por partido.</p></div>`;
    }
    if (huboRegresion) {
        return `<div class="status-box alert-warning"><p>📉 <strong>Perdiste terreno en la rotación.</strong> La competencia interna te bajó a cerca de <strong>${minutosNuevos} minutos</strong> por partido esta temporada.</p></div>`;
    }
    return "";
}

function calcularGRL() {
    const attrs = gameState.attributes;
    const pesos = pesosGRLPorPosicion[gameState.player.position];

    // 🆕 MEJORA: la escala anterior era 0-99 lineal y pura, así que como
    // siempre te quedan atributos secundarios en el piso (1) aunque tengas
    // una temporada de MVP en tus stats principales, el promedio ponderado
    // nunca se acercaba al techo — costaba muchísimo pasar de 60. En la
    // realidad (y en cualquier videojuego de básquet) un jugador que ya está
    // en un roster de la NBA arranca con un piso razonable (~60), y de ahí
    // sube según cuán bien armado esté, sin necesitar los 10 atributos al
    // máximo para verse reflejado.
    const PISO_GRL = 58;
    const TECHO_GRL = 99;

    const escalar = (promedioPonderado) => {
        const fraccion = promedioPonderado / 20; // 0 (imposible) a 1 (todo al máximo)
        return Math.round(PISO_GRL + fraccion * (TECHO_GRL - PISO_GRL));
    };

    // Fallback si por algún motivo no hay posición: promedio plano (como antes)
    if (!pesos) {
        const suma = Object.values(attrs).reduce((a, b) => a + b, 0);
        return escalar(suma / 10);
    }

    let promedioPonderado = 0;
    Object.keys(pesos).forEach(attr => {
        promedioPonderado += attrs[attr] * pesos[attr];
    });

    return escalar(promedioPonderado);
}

function renderizarTarjetaJugador() {
    const player = gameState.player;
    const grl = calcularGRL();
    const rosterHTML = typeof renderizarRosterEquipoHTML === "function"
        ? renderizarRosterEquipoHTML(player.currentTeam)
        : "";

    return `
        <div class="player-card">
            <div>
                <p class="player-card-name">${player.firstName} ${player.lastName}</p>
                <p class="player-card-meta">${player.position || "Sin posición"} · ${player.currentTeam} · ${obtenerRolActivo().nombre}${player.climaVestuario >= 80 ? " · 🔥 Líder del vestuario" : player.climaVestuario <= 30 ? " · ⚠️ Tensión en el vestuario" : ""}</p>
                <div class="player-card-details">
                    <span>Edad: <strong>${player.age}</strong></span>
                    <span>Temporada: <strong>${player.experience}</strong></span>
                </div>
            </div>
            <div class="player-card-grl">
                <span>GRL</span>
                <h3>${grl}</h3>
            </div>
        </div>
        ${rosterHTML}
    `;
}

// ==========================================
// LÓGICA COMPARTIDA: CALCULAR ESTADÍSTICAS DE UN AÑO
// ==========================================
// 🆕 MEJORA: penalización genérica por especialización pura. Antes solo tiro
// y pases tenían "atributo de apoyo" (y con un castigo relativamente chico).
// Ahora CUALQUIER stat (tiro, pases, rebote, robos, tapones) revisa si el
// atributo principal está muy por delante de su atributo de apoyo, y si es
// así aplica un castigo más duro (hasta -55%, antes rondaba -40/45%) y
// proporcional a la carencia real, no un escalón fijo. Esto hace que ser
// "especialista puro" (dumpear todo en 2-3 atributos e ignorar el resto)
// cueste de verdad, y que builds repartidas o especializadas-pero-completas
// rindan mejor en el balance general.
function calcularFactorEspecializacion(nivelPrincipal, nivelApoyo) {
    if (nivelPrincipal <= 13) return 1.0; // recién penaliza si sos realmente bueno en lo principal
    const apoyoFaltante = Math.max(0, 11 - nivelApoyo); // por debajo de 11/20 empieza a doler
    if (apoyoFaltante <= 0) return 1.0;
    const carencia = apoyoFaltante / 11;
    const base = 1 - carencia * 0.55;
    const variacionAzar = (Math.random() - 0.5) * 0.22;
    return Math.max(0.40, Math.min(1.0, base + variacionAzar));
}

// 🆕 MEJORA: azar independiente por estadística, con posibilidad de "noche
// anormal" puntual en CUALQUIER categoría (5% de pico, 5% de bajón), además
// del ruido normal más amplio. Así un jugador promedio también puede tener,
// de vez en cuando, una temporada rara y espectacular (o muy floja) en una
// sola stat puntual — no todo tiene que salir siempre "parejito".
function generarRuidoStat() {
    const azar = Math.random();
    if (azar < 0.05) return 1.45 + Math.random() * 0.20; // pico anormal (1.45 - 1.65)
    if (azar < 0.10) return 0.55 + Math.random() * 0.15; // bajón anormal (0.55 - 0.70)
    return 0.86 + Math.random() * 0.28; // rango típico (0.86 - 1.14)
}

// ==========================================
// 🆕 MEJORA: SUERTE DEL AÑO, CALCULADA UNA SOLA VEZ
// ==========================================
// Antes el "tipo de año" (racha, bajón, temporada histórica) se calculaba
// DENTRO de calcularEstadisticasDelAño y no influía en nada más — los
// minutos eran ciegos a si estabas en tu mejor momento o en un bajón. Ahora
// se calcula primero, una sola vez por temporada, y tanto los minutos como
// las stats usan el MISMO resultado: un año de gracia te puede ganar
// rotación, un año de bajón te la puede hacer perder.
function generarSuerteDelAño() {
    const promedioTresTiradas = (Math.random() + Math.random() + Math.random()) / 3;
    let modificadorSuerte = 0.75 + promedioTresTiradas * 0.60; // rango típico ~0.75 - 1.35
    let tipoAño = "Año Estándar";

    if (modificadorSuerte >= 1.20) {
        tipoAño = "¡Año de Gracia! El pibe está intratable 🌟";
    } else if (modificadorSuerte >= 1.06) {
        tipoAño = "Año en Racha 🔥";
    } else if (modificadorSuerte <= 0.83) {
        tipoAño = "Año de Bajón (Pared física o malas rachas) 📉";
    } else if (modificadorSuerte <= 0.95) {
        tipoAño = "Año Irregular 🎢";
    }

    if (Math.random() < 0.05) {
        modificadorSuerte = 1.42;
        tipoAño = "¡Temporada Histórica! Rompe la tabla 🚀";
    } else if (Math.random() < 0.05) {
        modificadorSuerte = 0.65;
        tipoAño = "Temporada Maldita: lesiones y mala suerte todo el año 🤕";
    }

    return { modificadorSuerte, tipoAño };
}

function calcularEstadisticasDelAño(modificadorSuerte, tipoAño) {
    const attrs = gameState.attributes;
    const player = gameState.player;
    const bonoPos = obtenerBonoPosicion(player.position);

    const ruidoPts = generarRuidoStat();
    const ruidoAst = generarRuidoStat();
    const ruidoReb = generarRuidoStat();
    const ruidoStl = generarRuidoStat();
    const ruidoBlk = generarRuidoStat();

    const multiplicadorMinutos = player.minutesPerGame / 36;

    const TECHO_PTS = 32;
    const TECHO_AST = 12;
    const TECHO_REB = 13;
    const TECHO_STL = 2.8;
    const TECHO_BLK = 2.6;
    const EXPONENTE_CURVA = 1.35;

    // 🆕 Composición de tiro con los 6 atributos de anotación + asistido por
    // dribbling (el manejo te crea tu propio tiro). Escala 1-20.
    const tiroCompuesto = attrs.bandeja * 0.12 + attrs.clavada * 0.08 + attrs.tiroInterior * 0.18 +
        attrs.mediaDistancia * 0.20 + attrs.triple * 0.24 + attrs.tiroLibre * 0.10 + attrs.dribbling * 0.08;
    const nivelTiro = Math.min(1, (tiroCompuesto / 20) * bonoPos.tiro);

    const nivelPases = Math.min(1, ((attrs.vision * 0.5 + attrs.pase * 0.35 + attrs.dribbling * 0.15) / 20) * bonoPos.pases);
    const nivelReboteo = Math.min(1, ((attrs.rebote * 0.6 + attrs.fuerza * 0.25 + attrs.velocidad * 0.15) / 20) * bonoPos.reboteo);
    const nivelRobos = Math.min(1, ((attrs.robo * 0.7 + attrs.velocidad * 0.3) / 20) * bonoPos.robos);
    const nivelTapones = Math.min(1, ((attrs.tapon * 0.7 + attrs.fuerza * 0.3) / 20) * bonoPos.tapones);

    const factorTiro = calcularFactorEspecializacion(attrs.triple, Math.min(attrs.dribbling, attrs.resistencia));
    const factorPases = calcularFactorEspecializacion(attrs.vision, attrs.pase);
    const factorReboteo = calcularFactorEspecializacion(attrs.rebote, attrs.fuerza);
    const factorRobos = calcularFactorEspecializacion(attrs.robo, attrs.velocidad);
    const factorTapones = calcularFactorEspecializacion(attrs.tapon, attrs.fuerza);

    const nivelDefensa = ((attrs.robo * 0.5 + attrs.tapon * 0.5) / 20) * multiplicadorMinutos * modificadorSuerte;

    let pts = TECHO_PTS * Math.pow(nivelTiro, EXPONENTE_CURVA) * multiplicadorMinutos * factorTiro * modificadorSuerte * ruidoPts;
    let ast = TECHO_AST * Math.pow(nivelPases, EXPONENTE_CURVA) * multiplicadorMinutos * factorPases * modificadorSuerte * ruidoAst;
    let reb = TECHO_REB * Math.pow(nivelReboteo, EXPONENTE_CURVA) * multiplicadorMinutos * factorReboteo * modificadorSuerte * ruidoReb;
    let stl = TECHO_STL * Math.pow(nivelRobos, EXPONENTE_CURVA) * multiplicadorMinutos * factorRobos * modificadorSuerte * ruidoStl;
    let blk = TECHO_BLK * Math.pow(nivelTapones, EXPONENTE_CURVA) * multiplicadorMinutos * factorTapones * modificadorSuerte * ruidoBlk;

    const enfoque = obtenerEnfoqueActivo();
    const rolActivo = aplicarEspecialidadElegida(obtenerRolActivo());
    pts *= enfoque.pts * rolActivo.mult.pts;
    ast *= enfoque.ast * rolActivo.mult.ast;
    reb *= enfoque.reb * rolActivo.mult.reb;
    stl *= enfoque.stl * rolActivo.mult.stl;
    blk *= enfoque.blk * rolActivo.mult.blk;

    // 🆕 Techo duro realista: por encima de esto ya es marca histórica única.
    pts = Math.min(pts, 38);
    ast = Math.min(ast, 15);
    reb = Math.min(reb, 18);
    stl = Math.min(stl, 4.5);
    blk = Math.min(blk, 4.5);

    const ptsPer36 = TECHO_PTS * Math.pow(nivelTiro, EXPONENTE_CURVA) * factorTiro * modificadorSuerte * ruidoPts * enfoque.pts * rolActivo.mult.pts;
    const astPer36 = TECHO_AST * Math.pow(nivelPases, EXPONENTE_CURVA) * factorPases * modificadorSuerte * ruidoAst * enfoque.ast * rolActivo.mult.ast;
    const rebPer36 = TECHO_REB * Math.pow(nivelReboteo, EXPONENTE_CURVA) * factorReboteo * modificadorSuerte * ruidoReb * enfoque.reb * rolActivo.mult.reb;
    const stlPer36 = TECHO_STL * Math.pow(nivelRobos, EXPONENTE_CURVA) * factorRobos * modificadorSuerte * ruidoStl * enfoque.stl * rolActivo.mult.stl;
    const blkPer36 = TECHO_BLK * Math.pow(nivelTapones, EXPONENTE_CURVA) * factorTapones * modificadorSuerte * ruidoBlk * enfoque.blk * rolActivo.mult.blk;
    const rendimientoPer36 = parseFloat((ptsPer36 + astPer36 + rebPer36 + (stlPer36 + blkPer36) * 4).toFixed(1));

    pts = parseFloat(pts.toFixed(1));
    ast = parseFloat(ast.toFixed(1));
    reb = parseFloat(reb.toFixed(1));
    stl = parseFloat(stl.toFixed(1));
    blk = parseFloat(blk.toFixed(1));

    return { pts, ast, reb, stl, blk, tipoAño, rendimientoPer36, impactoDefensivo: nivelDefensa };
}

// ==========================================
// 🆕 NUEVO: CONTEXTO DEL EQUIPO (calidad de roster por temporada)
// ==========================================
// Antes, tus chances de playoffs/título dependían SOLO de tus stats
// personales — el "equipo" no existía como concepto, solo como nombre.
// Ahora, cada temporada se sortea qué tan armado está el roster de tu
// franquicia ese año (se re-sortea siempre, aunque no cambies de equipo,
// porque en la vida real el plantel a tu alrededor cambia de un año a otro).
// Este contexto SOLO afecta la cadena de playoffs/finales/anillo — nunca los
// premios individuales (MVP, All-NBA, ROY, MIP, 6MOY, DPOY), que siguen
// dependiendo 100% de tu nivel de juego. Así podés ser MVP en un equipo en
// reconstrucción y no pisar playoffs, o ganar un anillo como pieza secundaria
// de un superequipo.
const CALIDADES_EQUIPO = [
    {
        nombre: "Reconstrucción 🏗️",
        probPeso: 20,
        bonusRendimiento: -14,
        mensaje: "El equipo está en plena reconstrucción, apostando al draft y al futuro más que a ganar ya."
    },
    {
        nombre: "Mediocre ⚖️",
        probPeso: 30,
        bonusRendimiento: -5,
        mensaje: "Un año de transición: el equipo pelea un lugar cómodo en la tabla, sin ilusiones grandes."
    },
    {
        nombre: "Competitivo 🔷",
        probPeso: 30,
        bonusRendimiento: 6,
        mensaje: "Un roster competitivo, con piso real para meterse en playoffs."
    },
    {
        nombre: "Contendiente 🔥",
        probPeso: 15,
        bonusRendimiento: 14,
        mensaje: "Un roster armado para pelear el título de verdad esta temporada."
    },
    {
        nombre: "Superequipo 👑",
        probPeso: 5,
        bonusRendimiento: 22,
        mensaje: "Un plantel de superequipo, favorito absoluto al anillo antes de arrancar la temporada."
    }
];

// 🆕 MEJORA: el sorteo ya no es parejo entre las 5 categorías — ahora pesa
// la fuerza REAL del roster de tu franquicia actual (calculada a partir de
// nba-players-db.js). Un equipo con estrellas de verdad va a tender a ser
// Contendiente/Superequipo más seguido; uno flojo va a tender a
// Reconstrucción/Mediocre. Sigue habiendo azar real (un equipo fuerte
// puede tener un año gris, y viceversa), solo se inclina la balanza.
// 🆕 Suma/resta clima de vestuario, con clamp entre 0 y 100.
function ajustarClimaVestuario(delta) {
    const player = gameState.player;
    player.climaVestuario = Math.max(0, Math.min(100, (player.climaVestuario ?? 60) + delta));
}

async function sortearCalidadEquipo() {
    // 🆕 si compartís equipo con tu compañero de partida, la calidad del
    // roster tiene que ser LA MISMA para los dos — no puede ser "Superequipo"
    // para uno y "Reconstrucción" para el otro, es el mismo plantel.
    if (tieneCarreraCompartida()) {
        const yaCompartida = await obtenerCalidadEquipoCompartidaDelAño();
        if (yaCompartida) return yaCompartida;
    }

    const fuerza = typeof calcularFuerzaRealDeEquipo === "function"
        ? calcularFuerzaRealDeEquipo(gameState.player.currentTeam)
        : { ataque: 65, defensa: 65 };

    const nivelEquipo = (fuerza.ataque + fuerza.defensa) / 2;
    let nivelNormalizado = Math.max(-1, Math.min(1, (nivelEquipo - 68) / 18));
    const clima = gameState.player.climaVestuario ?? 60;
    const empujeClima = ((clima - 60) / 40) * 0.15;
    nivelNormalizado = Math.max(-1, Math.min(1, nivelNormalizado + empujeClima));

    const pesosAjustados = CALIDADES_EQUIPO.map((tier, indice) => {
        const indiceObjetivo = 2 + nivelNormalizado * 2;
        const distancia = Math.abs(indice - indiceObjetivo);
        const factor = Math.max(0.15, 1.6 - distancia * 0.5);
        return { tier, pesoFinal: tier.probPeso * factor };
    });

    const pesoTotal = pesosAjustados.reduce((acc, t) => acc + t.pesoFinal, 0);
    let dado = Math.random() * pesoTotal;
    let resultado = CALIDADES_EQUIPO[CALIDADES_EQUIPO.length - 1];
    for (const item of pesosAjustados) {
        if (dado < item.pesoFinal) { resultado = item.tier; break; }
        dado -= item.pesoFinal;
    }

    if (tieneCarreraCompartida()) await guardarCalidadEquipoCompartidaDelAño(resultado);
    return resultado;
}

// 🆕 Guarda/lee la calidad de equipo del año, keyed por equipo+temporada propia,
// solo relevante si el rival está en el MISMO equipo esa misma temporada.
async function guardarCalidadEquipoCompartidaDelAño(calidad) {
    if (!tieneCarreraCompartida()) return;
    try {
        const { db, doc, setDoc } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        const campo = `calidadEquipoCompartida_${gameState.player.currentTeam}_year${gameState.player.experience + 1}`;
        await setDoc(refPartida, { [campo]: calidad }, { merge: true });
    } catch (e) {
        console.warn("No se pudo guardar la calidad de equipo compartida:", e);
    }
}

async function obtenerCalidadEquipoCompartidaDelAño() {
    if (!tieneCarreraCompartida()) return null;
    const rivalMismoEquipo = obtenerDatosRivalMismoEquipo();
    if (!rivalMismoEquipo) return null; // no comparten equipo, cada uno tira lo suyo
    try {
        const { db, doc, getDoc } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        const snap = await getDoc(refPartida);
        if (!snap.exists()) return null;
        const campo = `calidadEquipoCompartida_${gameState.player.currentTeam}_year${gameState.player.experience + 1}`;
        return snap.data()[campo] || null;
    } catch (e) {
        console.warn("No se pudo consultar la calidad de equipo compartida:", e);
        return null;
    }
}

// 🆕 Límites de traspasos por carrera: nunca menos de MIN, nunca más de MAX.
const MIN_AÑO_GARANTIZADO = 8;   // si a esta altura no tuviste ninguno, se fuerza la chance
const MAX_TRASPASOS_CARRERA = 4; // techo duro por carrera

function intentarTraspasoDeLaTemporada() {
    const player = gameState.player;

    if (typeof procesarTraspasoAleatorio !== "function") return null;
    if (player.cantidadTraspasosRecibidos >= MAX_TRASPASOS_CARRERA) return null;

    const necesitaEmpujon = player.experience >= MIN_AÑO_GARANTIZADO && player.cantidadTraspasosRecibidos === 0;

    let traspaso;
    if (necesitaEmpujon && Math.random() < 0.75) {
        traspaso = forzarTraspasoAleatorio(player.currentTeam);
    } else {
        traspaso = procesarTraspasoAleatorio(player.currentTeam);
    }

    if (traspaso) player.cantidadTraspasosRecibidos++;
    return traspaso;
}

// 🆕 Agrupa todas las cajas narrativas/contextuales de la temporada en un
// solo acordeón colapsable, para no apilar 5-6 cajas sueltas del mismo estilo.
function renderizarDetallesTemporadaHTML(res) {
    const partes = [
        renderizarCalidadEquipoHTML(res.calidadEquipo),
        renderizarTraspasoHTML(res.traspaso),
        renderizarLesionHTML(res.mensajeLesion),
        renderizarMensajeMinutosHTML(res.huboBreakout, res.huboRegresion, res.min, res.mensajePeleaMinutos),
        renderizarEventoHTML(res.mensajeEvento)
    ].filter(html => html && html.trim() !== "");

    if (partes.length === 0) return "";

    return `
        <details class="draft-board-details temporada-detalles">
            <summary>📋 Detalles de la temporada (${partes.length})</summary>
            <div class="temporada-detalles-contenido">
                ${partes.join("")}
            </div>
        </details>
    `;
}

// 🆕 caja de aviso — solo se genera HTML si el traspaso involucra una estrella.
// 🆕 caja de aviso con la calidad de roster sorteada para la temporada.
function renderizarCalidadEquipoHTML(calidadEquipo) {
    if (!calidadEquipo) return "";
    return `<div class="status-box alert-equipo"><p><strong>${calidadEquipo.nombre}</strong> — ${calidadEquipo.mensaje}</p></div>`;
}

// 🆕 caja de aviso — solo se genera HTML si el traspaso involucra una estrella.
function renderizarTraspasoHTML(traspaso) {
    if (!traspaso) return "";
    if (typeof esTraspasoDeEstrella === "function" && !esTraspasoDeEstrella(traspaso)) return "";
    return `<div class="status-box alert-equipo"><p>${traspaso.mensaje}</p></div>`;
}

// ==========================================
// 🆕 NUEVO: RIVALIDADES Y NARRATIVA
// ==========================================
// Sistema 100% narrativo (no toca stats ni logros): le da un hilo de "historia
// personal" a la carrera. Tiene dos capas:
// 1) Rival de franquicia: un equipo rival asignado cuando firmás contrato,
//    contra el que se resuelve un "duelo" narrativo cada temporada.
// 2) Rival histórico: comparado contra carreras GUARDADAS de partidas
//    anteriores (mismo puesto), usando localStorage. Esto es la base directa
//    del futuro leaderboard (punto 6): acá ya se guarda y compara toda la
//    data, ahí se va a poder visualizar en una tabla comparativa.

async function guardarCarreraEnHistorial(registro) {
    try {
        const { db, collection, addDoc } = window.firestoreDB;
        await addDoc(collection(db, "carreras"), {
            firstName: registro.firstName,
            lastName: registro.lastName,
            position: registro.position,
            puntajeLegado: registro.puntajeLegado,
            tier: registro.tier,
            seasons: registro.seasons || 0,
            createdAt: Date.now()
        });
    } catch (e) {
        console.warn("No se pudo guardar la carrera en el leaderboard global:", e);
    }
}

function construirResumenRetiro(clasificacion, puntajeLegado, conteoLogros) {
    const player = gameState.player;
    let sumaPts = 0, sumaAst = 0, sumaReb = 0, sumaStl = 0, sumaBlk = 0;
    gameState.statsHistory.forEach(h => {
        sumaPts += h.pts; sumaAst += h.ast; sumaReb += h.reb;
        sumaStl += (h.stl || 0); sumaBlk += (h.blk || 0);
    });
    const años = gameState.statsHistory.length;
    return {
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        team: player.currentTeam,
        seasons: años,
        promedioPts: (sumaPts / años).toFixed(1),
        promedioAst: (sumaAst / años).toFixed(1),
        promedioReb: (sumaReb / años).toFixed(1),
        promedioStl: (sumaStl / años).toFixed(1),
        promedioBlk: (sumaBlk / años).toFixed(1),
        tier: clasificacion.tier,
        puntajeLegado: Math.round(puntajeLegado),
        cantidadTrofeos: Object.values(conteoLogros).reduce((a, b) => a + b, 0)
    };
}

async function guardarRetiroCompartido(resumen) {
    if (!tieneCarreraCompartida()) return;
    try {
        const { db, doc, setDoc } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        const campo = `retiro_${gameState.player.slotPropio}`;
        await setDoc(refPartida, { [campo]: resumen }, { merge: true });
    } catch (e) {
        console.warn("No se pudo guardar el retiro compartido:", e);
    }
}

async function obtenerRetiroRivalCompartido() {
    if (!tieneCarreraCompartida()) return null;
    try {
        const { db, doc, getDoc } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        const snap = await getDoc(refPartida);
        if (!snap.exists()) return null;
        const slotRival = gameState.player.slotPropio === "slotA" ? "slotB" : "slotA";
        return snap.data()[`retiro_${slotRival}`] || null;
    } catch (e) {
        console.warn("No se pudo consultar el retiro del rival:", e);
        return null;
    }
}

let intervaloEsperaRetiroRival = null;

function mostrarPantallaEsperandoRetiroRival(resumenPropio) {
    let esperaScreen = document.getElementById("espera-retiro-screen");
    if (!esperaScreen) {
        esperaScreen = document.createElement("section");
        esperaScreen.id = "espera-retiro-screen";
        document.getElementById("game-container").appendChild(esperaScreen);
    }
    esperaScreen.classList.remove("hidden");
    esperaScreen.innerHTML = `
        <h2>🏁 Esperando a tu compañero de partida...</h2>
        <div class="status-box alert-equipo">
            <p>Ya te retiraste. Cuando tu compañero también termine su carrera, vas a ver la comparativa final de ambas.</p>
        </div>
    `;

    if (intervaloEsperaRetiroRival) clearInterval(intervaloEsperaRetiroRival);

    intervaloEsperaRetiroRival = setInterval(async () => {
        const resumenRival = await obtenerRetiroRivalCompartido();
        if (!resumenRival) return; // sigue esperando

        clearInterval(intervaloEsperaRetiroRival);
        intervaloEsperaRetiroRival = null;
        mostrarComparativaFinalCarreras(resumenPropio, resumenRival);
    }, 5000);
}

function mostrarComparativaFinalCarreras(resumenPropio, resumenRival) {
    let esperaScreen = document.getElementById("espera-retiro-screen");
    if (!esperaScreen) {
        esperaScreen = document.createElement("section");
        esperaScreen.id = "espera-retiro-screen";
        document.getElementById("game-container").appendChild(esperaScreen);
    }
    esperaScreen.classList.remove("hidden");

    const filaComparativa = (etiqueta, valorA, valorB) => `
        <div class="stat-box"><p>${etiqueta}</p><h3>${valorA}</h3></div>
        <div class="stat-box"><p>${etiqueta} (rival)</p><h3>${valorB}</h3></div>
    `;

    esperaScreen.innerHTML = `
        <h2>🏆 Comparativa Final de Carreras</h2>
        <div class="status-box alert-equipo">
            <p><strong>${resumenPropio.firstName} ${resumenPropio.lastName}</strong> (${resumenPropio.position}) — ${resumenPropio.seasons} temporadas — <strong>${resumenPropio.tier}</strong> (${resumenPropio.puntajeLegado} pts de legado)</p>
            <p><strong>${resumenRival.firstName} ${resumenRival.lastName}</strong> (${resumenRival.position}) — ${resumenRival.seasons} temporadas — <strong>${resumenRival.tier}</strong> (${resumenRival.puntajeLegado} pts de legado)</p>
        </div>
        <div class="stats-grid">
            ${filaComparativa("PTS", resumenPropio.promedioPts, resumenRival.promedioPts)}
            ${filaComparativa("AST", resumenPropio.promedioAst, resumenRival.promedioAst)}
            ${filaComparativa("REB", resumenPropio.promedioReb, resumenRival.promedioReb)}
            ${filaComparativa("STL", resumenPropio.promedioStl, resumenRival.promedioStl)}
            ${filaComparativa("BLK", resumenPropio.promedioBlk, resumenRival.promedioBlk)}
        </div>
        <div class="status-box hof-box">
            <p class="hof-label">Veredicto Final</p>
            <h3 class="hof-tier">${resumenPropio.puntajeLegado >= resumenRival.puntajeLegado ? `${resumenPropio.firstName} se lleva la gloria 🐐` : `${resumenRival.firstName} se lleva la gloria 🐐`}</h3>
        </div>
        <button onclick="location.reload()">Crear un nuevo Personaje 🔄</button>
    `;
}

async function obtenerLeaderboardGlobal(topN = 20) {
    try {
        const { db, collection, query, orderBy, limit, getDocs } = window.firestoreDB;
        const q = query(collection(db, "carreras"), orderBy("puntajeLegado", "desc"), limit(topN));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data());
    } catch (e) {
        console.warn("No se pudo cargar el leaderboard:", e);
        return [];
    }
}

// Busca la mejor carrera guardada en la MISMA posición, para servir de
// "fantasma" contra el que te comparás temporada a temporada.
async function obtenerRivalHistorico(position) {
    try {
        const { db, collection, query, where, orderBy, limit, getDocs } = window.firestoreDB;
        const q = query(
            collection(db, "carreras"),
            where("position", "==", position),
            orderBy("puntajeLegado", "desc"),
            limit(1)
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return snap.docs[0].data();
    } catch (e) {
        console.warn("No se pudo consultar el rival histórico:", e);
        return null;
    }
}

async function cachearRivalHistorico() {
    gameState.player.rivalHistoricoCache = await obtenerRivalHistorico(gameState.player.position);
}

// ---- Rival de franquicia ----
function sortearRival(equipoActual) {
    const candidatos = nbaTeams.filter(t => t !== equipoActual);
    return candidatos[Math.floor(Math.random() * candidatos.length)];
}

function asignarRivalDeFranquicia() {
    gameState.player.rivalTeam = sortearRival(gameState.player.currentTeam);
    gameState.player.rivalRecord = { wins: 0, losses: 0 };
}

// Se llama una vez por temporada simulada, después de tener el rendimiento
// individual del año. Resuelve el duelo, actualiza el historial de
// enfrentamientos y devuelve el mensaje narrativo a mostrar.
function resolverDueloDeRival(rendimientoIndividual) {
    const player = gameState.player;
    if (!player.rivalTeam) asignarRivalDeFranquicia();

    // Nivel del rival: ruido moderado alrededor de un valor medio, para que
    // el duelo no sea 100% previsible ni 100% al azar puro.
    const nivelRival = 20 + Math.random() * 30;
    const ganaste = rendimientoIndividual >= nivelRival;

    if (ganaste) {
        player.rivalRecord.wins++;
    } else {
        player.rivalRecord.losses++;
    }

    const { wins, losses } = player.rivalRecord;

    let mensaje;
    if (ganaste) {
        if (wins - losses >= 4) {
            mensaje = `🔥 Otra vez les ganaste a los ${player.rivalTeam}. Ya es personal — les tenés bien agarrado el número (${wins}-${losses}).`;
        } else {
            mensaje = `✅ Te impusiste en el cruce ante los ${player.rivalTeam} esta temporada (${wins}-${losses} en la rivalidad).`;
        }
    } else {
        if (losses - wins >= 4) {
            mensaje = `😤 Los ${player.rivalTeam} te volvieron a ganar el cruce. Empieza a pesar (${wins}-${losses}) — necesitás revertir esto.`;
        } else {
            mensaje = `📉 Perdiste el cruce ante los ${player.rivalTeam} esta temporada (${wins}-${losses} en la rivalidad).`;
        }
    }

    // 🆕 pequeña chance de que llegue un nuevo "villano" a la división, para
    // que la rivalidad no sea siempre la misma los 15 años de carrera. Se
    // procesa DESPUÉS de armar el mensaje del duelo de este año, así el
    // cambio de rival se anuncia en la temporada siguiente.
    if (Math.random() < 0.12) {
        const rivalAnterior = player.rivalTeam;
        asignarRivalDeFranquicia();
        mensaje += ` 🔄 Cambio de escenario: los ${rivalAnterior} dejan de ser tu gran cruce, y ahora los ${player.rivalTeam} se perfilan como tu nueva rivalidad.`;
    }

    return mensaje;
}

function renderizarRivalHTML(mensajeRival) {
    if (!mensajeRival) return "";
    return `<div class="status-box alert-rival"><p>${mensajeRival}</p></div>`;
}

// Comparación narrativa contra tu mejor carrera histórica guardada en la
// misma posición (si existe alguna). Usa un proxy rápido de "ritmo de
// legado" para poder comparar una carrera en curso contra una ya cerrada.
function generarMensajeRivalHistorico() {
    const rival = gameState.player.rivalHistoricoCache;
    if (!rival) return null;

    const sumaActual = gameState.statsHistory.reduce((acc, h) => acc + h.pts + h.ast + h.reb, 0);
    const promedioActual = gameState.statsHistory.length > 0 ? sumaActual / gameState.statsHistory.length : 0;
    const ritmoRival = rival.puntajeLegado;
    const ritmoPropio = promedioActual * 0.35 + Math.min(gameState.statsHistory.length, 20) * 0.6;

    if (ritmoPropio >= ritmoRival) {
        return `👻 Vas superando el legado de <strong>${rival.firstName} ${rival.lastName}</strong> (${rival.tier}), tu mejor carrera guardada en este puesto.`;
    }
    const brechaPct = Math.max(1, Math.round((1 - ritmoPropio / Math.max(1, ritmoRival)) * 100));
    return `👻 Todavía estás a un <strong>${brechaPct}%</strong> del legado de <strong>${rival.firstName} ${rival.lastName}</strong> (${rival.tier}), tu mejor carrera guardada en este puesto.`;
}

function renderizarRivalHistoricoHTML(mensaje) {
    if (!mensaje) return "";
    return `<div class="status-box alert-rival-historico"><p>${mensaje}</p></div>`;
}

// ==========================================
// 🆕 NUEVO: CANDIDATURAS A PREMIOS INDIVIDUALES (para modo compartido)
// ==========================================
// En carrera compartida, premios como MVP o DPOY no pueden repetirse entre
// los dos jugadores. Esta función tira los mismos dados que antes, pero en
// vez de otorgar el premio directamente, marca si el jugador ES CANDIDATO
// (pasó el check de azar) y guarda el puntaje para comparar después contra
// el compañero. El que tenga mejor puntaje entre los candidatos se lo lleva.
function calcularCandidaturasPremios(pts, ast, reb, stl, blk, yearNumero, impactoDefensivo) {
    const player = gameState.player;
    const rolPremios = obtenerRolActivo();
    const rendimientoIndividual = pts + ast + reb + (impactoDefensivo * 15);
    const rendimientoDefensivo = (stl * 8) + (blk * 8) + (impactoDefensivo * 25);
    const esRookie = yearNumero === 1;
    const historialPrevio = gameState.statsHistory.length > 0
        ? gameState.statsHistory[gameState.statsHistory.length - 1]
        : null;

    const candidaturas = {
        mvp: false, allNba: false, roy: false, allRookie: false,
        sextoHombre: false, mip: false, dpoy: false, allDefensive: false
    };

    if (!esRookie && rendimientoIndividual >= 48) {
        const probMVP = Math.min(0.40, (rendimientoIndividual - 45) / 20);
        if (Math.random() < probMVP) {
            candidaturas.mvp = true;
        } else if (Math.random() < Math.min(0.55, (rendimientoIndividual - 30) / 40)) {
            candidaturas.allNba = true;
        }
    } else if (!esRookie && rendimientoIndividual >= 35) {
        if (Math.random() < Math.min(0.55, (rendimientoIndividual - 30) / 40)) {
            candidaturas.allNba = true;
        }
    }

    if (!esRookie && player.minutesPerGame < 20 && rendimientoIndividual >= 15) {
        if (Math.random() < 0.30) candidaturas.sextoHombre = true;
    }

    if (!esRookie && historialPrevio) {
        const rendimientoPrevio = historialPrevio.pts + historialPrevio.ast + historialPrevio.reb;
        const huboSaltoGrande = rendimientoPrevio > 0 && rendimientoIndividual >= rendimientoPrevio * 1.35;
        if (huboSaltoGrande && rendimientoIndividual >= 15 && Math.random() < 0.40) {
            candidaturas.mip = true;
        }
    }

    if (esRookie) {
        if (rendimientoIndividual >= 20 && Math.random() < 0.35) {
            candidaturas.roy = true;
        } else if (rendimientoIndividual >= 10 && Math.random() < 0.30) {
            candidaturas.allRookie = true;
        }
    }

    if (!esRookie && rendimientoDefensivo >= 18) {
        const probDPOY = Math.min(0.35, (rendimientoDefensivo - 16) * 0.028);
        if (Math.random() < probDPOY) candidaturas.dpoy = true;
    }

    if (!esRookie && rendimientoDefensivo >= 11) {
        const probAllDef = Math.min(0.50, (rendimientoDefensivo - 9) * 0.045);
        if (Math.random() < probAllDef) candidaturas.allDefensive = true;
    }

    // 🆕 tu rol declarado puede bloquear ciertos premios (ej: un Especialista no compite por MVP).
    (rolPremios.premiosBloqueados || []).forEach(key => { candidaturas[key] = false; });
    return { candidaturas, rendimientoIndividual, rendimientoDefensivo, esRookie };
}

// ==========================================
// 🆕 NUEVO: RESOLUCIÓN DE CAMPEÓN ÚNICO (modo compartido)
// ==========================================
// Si ambos jugadores llegaron a "Campeón de la NBA" en su propia cadena de
// playoffs esa temporada, solo uno se queda con el título real de la liga.
// Gana el de mayor rendimiento individual; el otro pasa a Finalista.
function resolverCampeonUnico(logrosPropios, rendimientoIndividualPropio, datosRival) {
    const yoSoyCampeon = logrosPropios.some(l => l.nombre === "Campeón de la NBA 🏆");
    if (!yoSoyCampeon || !datosRival || !datosRival.esCampeonEstaTemporada) {
        return logrosPropios; // no hay conflicto, nada que resolver
    }

    const rendimientoRival = datosRival.rendimientoIndividual || 0;
    if (rendimientoIndividualPropio >= rendimientoRival) {
        return logrosPropios; // ganás el desempate, te quedás con el título
    }

    // Perdiste el desempate: bajás a Finalista de la NBA
    return logrosPropios.map(l => {
        if (l.nombre === "Campeón de la NBA 🏆") {
            return { nombre: "Finalista de la NBA 🏀", puntos: 1 };
        }
        if (l.nombre === "Finals MVP 🏅") {
            return null; // si no sos campeón, tampoco podés ser Finals MVP
        }
        return l;
    }).filter(Boolean);
}

// ==========================================
// SISTEMA DE PREMIOS Y LOGROS DE TEMPORADA
// ==========================================
function calcularLogrosDeTemporada(pts, ast, reb, stl, blk, yearNumero, impactoDefensivo, calidadEquipo, modoCompartido = false) {
    const player = gameState.player;
    const rendimientoIndividual = pts + ast + reb + (impactoDefensivo * 15);
    const bonusEquipo = calidadEquipo ? calidadEquipo.bonusRendimiento : 0;
    const pesoRol = obtenerRolActivo().pesoCalidadEquipo || 1.0;
    const rendimiento = Math.max(0, (rendimientoIndividual * pesoRol) + bonusEquipo);

    const logros = [];
    let bonus = 0;

    const agregarLogro = (nombre, puntos) => {
        logros.push({ nombre, puntos });
        bonus += puntos;
    };

    // ---- Premios de EQUIPO: no compiten entre los dos jugadores, cada uno
    // tiene su propia franquicia, así que se mantienen como antes. ----
    let probPlayoffs;
    if (rendimiento >= 45) probPlayoffs = 0.80;
    else if (rendimiento >= 28) probPlayoffs = 0.55;
    else if (rendimiento >= 15) probPlayoffs = 0.30;
    else probPlayoffs = 0.10;
    const rivalMismoEquipoLogros = obtenerDatosRivalMismoEquipo();
    if (Math.random() < probPlayoffs) {
        if (rivalMismoEquipoLogros) {
            agregarLogro(`Clasificación a Playoffs 🎟️ (junto a ${rivalMismoEquipoLogros.firstName} 🤝)`, 1);
        } else {
            agregarLogro("Clasificación a Playoffs 🎟️", 1);
        }

        const probConferencia = Math.min(0.55, 0.25 + rendimiento / 130);
        if (Math.random() < probConferencia) {
            agregarLogro("Finalista de Conferencia", 1);

            const probFinalesNBA = Math.min(0.50, 0.20 + rendimiento / 150);
            if (Math.random() < probFinalesNBA) {
                agregarLogro("Finalista de la NBA 🏀", 1);

                const probCampeon = Math.min(0.45, 0.15 + rendimiento / 170);
                if (Math.random() < probCampeon) {
                    agregarLogro("Campeón de la NBA 🏆", 1);

                    const probFinalsMVP = rendimientoIndividual >= 38 ? 0.45 : 0.15;
                    if (Math.random() < probFinalsMVP) {
                        agregarLogro("Finals MVP 🏅", 2);
                    }
                }
            }
        }
    }

    // ---- Premios INDIVIDUALES: en modo SOLO se otorgan directo (como
    // siempre). En modo COMPARTIDO se calculan como candidaturas y se
    // resuelven después en la ceremonia (ver resolverPremiosCompartidos). ----
    const { candidaturas, rendimientoDefensivo, esRookie } = calcularCandidaturasPremios(pts, ast, reb, stl, blk, yearNumero, impactoDefensivo);

    if (!modoCompartido) {
        if (candidaturas.mvp) agregarLogro("MVP de la Temporada 👑", 3);
        else if (candidaturas.allNba) agregarLogro("All-NBA Team ⭐", 2);
        if (candidaturas.sextoHombre) agregarLogro("Sexto Hombre del Año 🎖️", 2);
        if (candidaturas.mip) agregarLogro("Most Improved Player 📈", 2);
        if (candidaturas.roy) agregarLogro("Rookie del Año (ROY) 🏅", 2);
        else if (candidaturas.allRookie) agregarLogro("All-Rookie Team", 1);
        if (candidaturas.dpoy) agregarLogro("Mejor Defensor del Año (DPOY) 🛡️", 3);
        if (candidaturas.allDefensive) agregarLogro("Equipo Defensivo Ideal 🛡️⭐", 2);
    }

    return { logros, bonus, candidaturas, rendimientoIndividual, rendimientoDefensivo, esRookie };
}

// 🆕 NUEVO: caja de aviso cuando hubo una lesión en la temporada.
function renderizarLesionHTML(mensajeLesion) {
    if (!mensajeLesion) return "";
    return `<div class="status-box alert-warning"><p>${mensajeLesion}</p></div>`;
}

function renderizarLogrosHTML(logros) {
    if (!logros || logros.length === 0) return "";

    const items = logros.map(l => `<li>${l.nombre} <strong>(+${l.puntos} pts de mejora)</strong></li>`).join("");
    return `
        <div class="status-box logros-box alert-info">
            <h3>🏆 Logros de la Temporada</h3>
            <ul>${items}</ul>
        </div>
    `;
}

// ==========================================
// 🆕 MEJORA: PROMEDIO MÓVIL PARA DECISIONES DE CORTE/RETIRO
// ==========================================
// Antes, tanto el corte de agencia libre como el retiro por bajo rendimiento
// miraban UN solo año. Con el factor suerte pudiendo bajarte el rendimiento,
// alcanzaba una sola mala temporada para terminar tu carrera de golpe, incluso
// con un jugador bien construido. Ahora usamos el promedio de las últimas 2
// temporadas (o 1, si todavía no jugaste dos), que es mucho más representativo
// de tu nivel real.
function obtenerPromedioPer36Reciente() {
    const historialReciente = gameState.statsHistory.slice(-2);
    const suma = historialReciente.reduce((acc, h) => acc + h.rendimientoPer36, 0);
    return suma / historialReciente.length;
}

// ==========================================
// MOTOR DE SIMULACIÓN DE TEMPORADA (AÑO 1)
// ==========================================
async function iniciarTemporadaUno() {
    sonidoSwish(); // 🆕
    const player = gameState.player;
    const { modificadorSuerte, tipoAño } = generarSuerteDelAño();
    const calidadEquipo = await sortearCalidadEquipo();
    const traspaso = intentarTraspasoDeLaTemporada();
    if (traspaso) {
        if (!gameState.traspasosAplicadosIds) gameState.traspasosAplicadosIds = new Set();
        gameState.traspasosAplicadosIds.add(traspaso.id);
        if (typeof guardarTraspasoCompartido === "function") guardarTraspasoCompartido(traspaso);
    }
    const { pts, ast, reb, stl, blk, rendimientoPer36, impactoDefensivo, mensajeLesion, minutosReales } = calcularEstadisticasConLesion(modificadorSuerte, tipoAño);

    const { logros, bonus, candidaturas, rendimientoIndividual, rendimientoDefensivo, esRookie } = calcularLogrosDeTemporada(pts, ast, reb, stl, blk, 1, impactoDefensivo, calidadEquipo, tieneCarreraCompartida());

    // 🆕 duelo narrativo contra el rival de franquicia y comparación contra
    // el rival histórico (carreras guardadas de partidas anteriores).
    const rendimientoParaRival = pts + ast + reb + (impactoDefensivo * 15);
    const mensajeRival = resolverDueloDeRival(rendimientoParaRival);

    const resultadoAño = {
        year: 1,
        team: player.currentTeam,
        min: minutosReales,
        pts, ast, reb, stl, blk,
        tipoAzar: tipoAño,
        mensajeLesion,
        calidadEquipo, // 🆕
        traspaso, // 🆕
        mensajeRival, // 🆕
        logros,
        rendimientoPer36,
        candidaturas,          // 🆕
        rendimientoIndividual, // 🆕
        rendimientoDefensivo,  // 🆕
        esRookie                // 🆕
    };
    gameState.statsHistory.push(resultadoAño);
    generarCartaDeTemporada(resultadoAño); // 🆕
    resultadoAño.mensajeRivalHistorico = generarMensajeRivalHistorico(); // 🆕 necesita el año ya en el historial

    player.contractYearsLeft = Math.max(0, player.contractYearsLeft - 1);
    player.age++;
    player.experience++;

    resultadoAño.resultadoObjetivo = verificarObjetivoDeTemporada(resultadoAño);
    manejarEventoYFinalizar(
        resultadoAño,
        (bonusExtra) => {
            const puntosObjetivo = (resultadoAño.resultadoObjetivo && resultadoAño.resultadoObjetivo.cumplido)
                ? resultadoAño.resultadoObjetivo.objetivo.puntos : 0;
            player.availablePoints = Math.max(0, calcularPuntosBaseDesarrollo(player.experience) + bonus + bonusExtra + puntosObjetivo);
        },
        mostrarResultadosTemporada
    );
}

// ==========================================
// INTERFAZ: PANTALLA DE ESTADÍSTICAS FINALES (AÑO 1)
// ==========================================
function mostrarResultadosTemporada(res) {
    document.getElementById("draft-screen").classList.add("hidden");

    let seasonScreen = document.getElementById("season-screen");
    if (!seasonScreen) {
        seasonScreen = document.createElement("section");
        seasonScreen.id = "season-screen";
        document.getElementById("game-container").appendChild(seasonScreen);
    }
    seasonScreen.classList.remove("hidden");

    seasonScreen.innerHTML = `
        ${renderizarTarjetaJugador()}
        <h2>Resultados de la Temporada (Año ${res.year})</h2>
        <p><strong>Equipo:</strong> ${res.team} | <strong>Edad:</strong> ${gameState.player.age} años | <strong>Contexto:</strong> ${res.tipoAzar}</p>

        <div class="stats-grid">
            <div class="stat-box"><p>MIN</p><h3>${res.min}</h3></div>
            <div class="stat-box"><p>PTS</p><h3>${res.pts}</h3></div>
            <div class="stat-box"><p>AST</p><h3>${res.ast}</h3></div>
            <div class="stat-box"><p>REB</p><h3>${res.reb}</h3></div>
            <div class="stat-box"><p>STL</p><h3>${res.stl}</h3></div>
            <div class="stat-box"><p>BLK</p><h3>${res.blk}</h3></div>
        </div>

        ${renderizarResultadoObjetivoHTML(res.resultadoObjetivo)}
        ${renderizarLogrosHTML(res.logros)}
        ${renderizarDetallesTemporadaHTML(res)}

        <div class="status-box">
            <p><strong>Contrato Restante:</strong> Queda ${gameState.player.contractYearsLeft} año obligatorio en este equipo.</p>
            <p>¡Terminó el año! Ganaste <strong>${gameState.player.availablePoints} punto(s)</strong> para entrenar de cara al Año 2.</p>
        </div>

        <button onclick="irAEntrenamientoAñoDos()">Ir a entrenar para el Año 2 🏋️‍♂️</button>
        <button class="btn-secundario" onclick="mostrarColeccionCartas()">Ver mi Colección de Cartas 🎴</button>
        ${tieneCarreraCompartida() ? `<button onclick="mostrarRecordsPartida()">Ver Récords de la Partida 🔥</button>` : ""}
    `;

    reproducirFeedbackDeTemporada(res); // 🆕
    sincronizarCarreraCompartida();
}

// ==========================================
// PANTALLA: ENTRENAMIENTO PREVIO AL AÑO 2
// ==========================================
function irAEntrenamientoAñoDos() {
    if (gameState.player.isRetired) return;

    gameState.player.enfoqueTemporada = null;
    gameState.player.enfoquesDisponiblesTemporada = null; // 🆕 vuelve a sortear opciones nuevas
    gameState.player.minutosAlArrancarTemporada = gameState.player.minutesPerGame;
    gameState.player.objetivoTemporadaActivo = sortearObjetivoDeTemporada(gameState.player.experience === 1);

    document.getElementById("season-screen").classList.add("hidden");
    // ...el resto queda igual...

    const screen = document.getElementById("draft-screen");
    screen.classList.remove("hidden");
    screen.style.display = "block";

    screen.innerHTML = `
        ${renderizarTarjetaJugador()}
        <h2>Centro de Entrenamiento: Año ${gameState.player.experience + 1} 🏋️‍♂️</h2>
        <div class="status-box">
            <p>Es momento de pulir tu juego antes de arrancar tu próxima temporada.</p>
            <p>Puntos de mejora disponibles: <span id="puntos-contador">${gameState.player.availablePoints}</span></p>
            ${generarMensajePuntosHint(gameState.player.availablePoints)}
        </div>

        <div id="contenedor-atributos">
            <!-- JavaScript vuelve a dibujar las barritas con los valores actuales -->
        </div>

        ${renderizarObjetivoActivoHTML(gameState.player.objetivoTemporadaActivo)}
        ${renderizarSelectorEnfoque()}

        <button id="btn-confirmar-atributos" disabled>Confirmar Mejora y Simular Año ${gameState.player.experience + 1} 🚀</button>
    `;

    renderizarControlesAtributos();

    const btnConfirmar = document.getElementById("btn-confirmar-atributos");
    const esEntrenamientoParaAñoDos = gameState.player.experience === 1;
    btnConfirmar.onclick = esEntrenamientoParaAñoDos ? simularAñoDos : simularSiguienteAño;
    actualizarEstadoBotonConfirmar();
}

// ==========================================
// MOTOR DE SIMULACIÓN: TEMPORADA (AÑO 2)
// ==========================================
async function simularAñoDos() {
    sonidoSwish(); // 🆕
    const player = gameState.player;

    const { modificadorSuerte, tipoAño } = generarSuerteDelAño();
    const { minutos, huboBreakout, huboRegresion, mensajePeleaMinutos } = calcularMinutosDelAño(modificadorSuerte);
    player.minutesPerGame = minutos;

    const calidadEquipo = await sortearCalidadEquipo();
    const traspaso = intentarTraspasoDeLaTemporada();
    if (traspaso) {
        if (!gameState.traspasosAplicadosIds) gameState.traspasosAplicadosIds = new Set();
        gameState.traspasosAplicadosIds.add(traspaso.id);
        if (typeof guardarTraspasoCompartido === "function") guardarTraspasoCompartido(traspaso);
    }
    const { pts, ast, reb, stl, blk, rendimientoPer36, impactoDefensivo, mensajeLesion, minutosReales } = calcularEstadisticasConLesion(modificadorSuerte, tipoAño);
    const { logros, bonus, candidaturas, rendimientoIndividual, rendimientoDefensivo, esRookie } = calcularLogrosDeTemporada(pts, ast, reb, stl, blk, 2, impactoDefensivo, calidadEquipo, tieneCarreraCompartida());

    // 🆕 duelo narrativo contra el rival de franquicia y comparación contra
    // el rival histórico (carreras guardadas de partidas anteriores).
    const rendimientoParaRival = pts + ast + reb + (impactoDefensivo * 15);
    const mensajeRival = resolverDueloDeRival(rendimientoParaRival);

    const resultadoAño = {
        year: 2,
        team: player.currentTeam,
        min: minutosReales,
        pts, ast, reb, stl, blk,
        tipoAzar: tipoAño,
        mensajeLesion,
        calidadEquipo, // 🆕
        traspaso, // 🆕
        mensajeRival, // 🆕
        logros,
        rendimientoPer36,
        huboBreakout,      // 🆕
        huboRegresion,      // 🆕
        mensajePeleaMinutos, // 🆕
        candidaturas,          // 🆕
        rendimientoIndividual, // 🆕
        rendimientoDefensivo,  // 🆕
        esRookie                // 🆕
    };
    gameState.statsHistory.push(resultadoAño);
    generarCartaDeTemporada(resultadoAño); // 🆕
    resultadoAño.mensajeRivalHistorico = generarMensajeRivalHistorico(); // 🆕 necesita el año ya en el historial

    player.contractYearsLeft = Math.max(0, player.contractYearsLeft - 1);
    player.age++;
    player.experience++;

    resultadoAño.resultadoObjetivo = verificarObjetivoDeTemporada(resultadoAño);
    manejarEventoYFinalizar(
        resultadoAño,
        (bonusExtra) => {
            const puntosObjetivo = (resultadoAño.resultadoObjetivo && resultadoAño.resultadoObjetivo.cumplido)
                ? resultadoAño.resultadoObjetivo.objetivo.puntos : 0;
            player.availablePoints = Math.max(0, calcularPuntosBaseDesarrollo(player.experience) + bonus + bonusExtra + puntosObjetivo);
        },
        mostrarResultadosAñoDos
    );
}

// ==========================================
// INTERFAZ: PANTALLA FIN DE CONTRATO ROOKIE
// ==========================================
function mostrarResultadosAñoDos(res) {
    document.getElementById("draft-screen").classList.add("hidden");
    const seasonScreen = document.getElementById("season-screen");

    seasonScreen.classList.remove("hidden");
    seasonScreen.innerHTML = `
        ${renderizarTarjetaJugador()}
        <h2>Resultados de la Temporada (Año ${res.year})</h2>
        <p><strong>Equipo:</strong> ${res.team} | <strong>Edad:</strong> ${gameState.player.age} años | <strong>Contexto:</strong> ${res.tipoAzar}</p>

        <div class="stats-grid">
            <div class="stat-box"><p>MIN</p><h3>${res.min}</h3></div>
            <div class="stat-box"><p>PTS</p><h3>${res.pts}</h3></div>
            <div class="stat-box"><p>AST</p><h3>${res.ast}</h3></div>
            <div class="stat-box"><p>REB</p><h3>${res.reb}</h3></div>
            <div class="stat-box"><p>STL</p><h3>${res.stl}</h3></div>
            <div class="stat-box"><p>BLK</p><h3>${res.blk}</h3></div>
        </div>

        ${renderizarResultadoObjetivoHTML(res.resultadoObjetivo)}
        ${renderizarLogrosHTML(res.logros)}
        ${renderizarDetallesTemporadaHTML(res)}

        <div class="status-box alert-warning">
            <h3>⚠️ ¡CONTRATO DE NOVATO VENCIDO! ⚠️</h3>
            <p>Completaste tus primeros 2 años obligatorios en la liga. Las oficinas del mánager están abiertas.</p>
        </div>

        <button onclick="procesarAgenciaLibreOGameOver()">Ir a la Oficina: Ver ofertas o Retiro 💼</button>
        <button class="btn-secundario" onclick="mostrarColeccionCartas()">Ver mi Colección de Cartas 🎴</button>
        ${tieneCarreraCompartida() ? `<button onclick="mostrarRecordsPartida()">Ver Récords de la Partida 🔥</button>` : ""}
    `;

    reproducirFeedbackDeTemporada(res); // 🆕
    sincronizarCarreraCompartida();
}

// ==========================================
// LÓGICA: ARMAR EL MERCADO DE AGENTES LIBRES
// ==========================================
function generarOfertasAgenciaLibre(rendimientoCombinado) {
    const player = gameState.player;

    let tier;
    if (rendimientoCombinado >= 40.0) {
        tier = { cantidadOfertas: 4, minAños: 2, maxAños: 4, esEstrella: true };
    } else if (rendimientoCombinado >= 22.0) {
        tier = { cantidadOfertas: 3, minAños: 1, maxAños: 3, esEstrella: false };
    } else {
        tier = { cantidadOfertas: 2, minAños: 1, maxAños: 2, esEstrella: false };
    }

    // 🆕 según qué tan bien rendiste vs. lo que tu rol actual esperaba, definimos
    // si merecés subir, mantener o bajar de franja.
    const promedioReciente = obtenerPromedioPer36Reciente();
    let franjaSugerida; // "alta", "media", "baja"
    if (promedioReciente >= 26) franjaSugerida = "alta";
    else if (promedioReciente >= 14) franjaSugerida = "media";
    else franjaSugerida = "baja";

    // 🆕 elige un rol de oferta según la fuerza real del roster de ESE equipo:
    // equipos débiles ofrecen roles de franja alta, equipos fuertes ofrecen roles bajos/medios.
    function sugerirRolParaEquipo(equipo) {
        const fuerza = typeof calcularFuerzaRealDeEquipo === "function"
            ? calcularFuerzaRealDeEquipo(equipo)
            : { ataque: 65, defensa: 65 };
        const nivelEquipo = (fuerza.ataque + fuerza.defensa) / 2;

        const rolesAlta = ["franquicia", "primeraOpcion"];
        const rolesMedia = ["segundaOpcion", "motorDeJuego", "anclaDefensiva"];
        const rolesBaja = ["sextoHombre", "especialista"];

        let pool;
        if (nivelEquipo <= 65) pool = franjaSugerida === "alta" ? rolesAlta : rolesMedia;
        else if (nivelEquipo <= 78) pool = franjaSugerida === "baja" ? rolesBaja : rolesMedia;
        else pool = franjaSugerida === "alta" ? rolesMedia : rolesBaja;

        return pool[Math.floor(Math.random() * pool.length)];
    }

    const equiposDisponibles = nbaTeams.filter(t => t !== player.currentTeam);
    const equiposSorteados = [];
    const copiaDisponibles = [...equiposDisponibles];
    const cantidadEquiposExternos = Math.min(tier.cantidadOfertas - 1, copiaDisponibles.length);

    for (let i = 0; i < cantidadEquiposExternos; i++) {
        const indiceRandom = Math.floor(Math.random() * copiaDisponibles.length);
        equiposSorteados.push(copiaDisponibles.splice(indiceRandom, 1)[0]);
    }

    const equipoActualRenueva = Math.random() > 0.25;

    let ofertasHTML = "";

    if (equipoActualRenueva) {
        const añosRenovacion = tier.esEstrella
            ? tier.maxAños
            : Math.floor(Math.random() * (tier.maxAños - tier.minAños + 1)) + tier.minAños;
        const rolOferta = sugerirRolParaEquipo(player.currentTeam);
        const nombreRol = ROLES_EQUIPO[rolOferta].nombre;

        ofertasHTML += `
            <div class="oferta-card ${tier.esEstrella ? "estrella" : ""}">
                <h3>${tier.esEstrella ? "🔥 Renovación Máxima" : "🔄 Renovar"} - ${player.currentTeam}</h3>
                <p>Te ofrecen ${añosRenovacion} año(s) de contrato como <strong>${nombreRol}</strong>.</p>
                <button onclick="aceptarContrato('${player.currentTeam}', ${añosRenovacion}, '${rolOferta}')">Aceptar Renovación</button>
            </div>
        `;
    }

    equiposSorteados.forEach(equipo => {
        const años = Math.floor(Math.random() * (tier.maxAños - tier.minAños + 1)) + tier.minAños;
        const etiqueta = tier.esEstrella ? "⭐ Oferta de Agente Libre" : "💼 Oferta de Mercado";
        const rolOferta = sugerirRolParaEquipo(equipo);
        const nombreRol = ROLES_EQUIPO[rolOferta].nombre;
        ofertasHTML += `
            <div class="oferta-card">
                <h3>${etiqueta} - ${equipo}</h3>
                <p>Te ofrecen ${años} año(s) de contrato como <strong>${nombreRol}</strong>.</p>
                <button onclick="aceptarContrato('${equipo}', ${años}, '${rolOferta}')">Firmar con ${equipo}</button>
            </div>
        `;
    });

    if (!equipoActualRenueva && equiposSorteados.length < 1) {
        const equipoRescate = equiposDisponibles[Math.floor(Math.random() * equiposDisponibles.length)];
        const rolOferta = sugerirRolParaEquipo(equipoRescate);
        const nombreRol = ROLES_EQUIPO[rolOferta].nombre;
        ofertasHTML += `
            <div class="oferta-card">
                <h3>💼 Oferta de Mercado - ${equipoRescate}</h3>
                <p>Te ofrecen 1 año de contrato como <strong>${nombreRol}</strong>, buscando profundidad en el banco.</p>
                <button onclick="aceptarContrato('${equipoRescate}', 1, '${rolOferta}')">Firmar con ${equipoRescate}</button>
            </div>
        `;
    }

    return ofertasHTML;
}

// ==========================================
// FILTRO DE SUPERVIVENCIA Y AGENCIA LIBRE (FIN DEL AÑO 2)
// ==========================================
function procesarAgenciaLibreOGameOver() {
    document.getElementById("season-screen").classList.add("hidden");

    let officeScreen = document.getElementById("office-screen");
    if (!officeScreen) {
        officeScreen = document.createElement("section");
        officeScreen.id = "office-screen";
        document.getElementById("game-container").appendChild(officeScreen);
    }
    officeScreen.classList.remove("hidden");

    const ultimasStats = gameState.statsHistory[gameState.statsHistory.length - 1];
    const pts = ultimasStats.pts;
    const ast = ultimasStats.ast;
    const reb = ultimasStats.reb;
    const stl = ultimasStats.stl || 0;
    const blk = ultimasStats.blk || 0;

    // 🆕 MEJORA: promedio de los últimos años en vez de solo el último, y
    // umbral bajado de 6.0 a 5.0 — un poco más de margen para picks tardíos
    // que recién están agarrando ritmo. Ahora robos/tapones también suman al
    // rendimiento combinado (ponderados x3, ya que su escala es más chica),
    // así un defensor de elite también puede conseguir buenas ofertas aunque
    // su planilla ofensiva sea modesta.
    const promedioPer36Reciente = obtenerPromedioPer36Reciente();
    const rendimientoCombinado = pts + ast + reb + (stl + blk) * 3;

    // 🆕 mismo criterio de exigencia por edad que en chequearRetiroDefinitivo,
    // para que sea consistente: cuanto más veterano, más rendimiento
    // reciente te exige la liga para seguir dándote contrato.
    const player = gameState.player;
    const umbralBase = 5.0;
    const exigenciaPorEdad = player.age >= 32 ? (player.age - 31) * 0.9 : 0;
    const umbralActual = umbralBase + exigenciaPorEdad;

    if (promedioPer36Reciente < umbralActual) {
        ejecutarPantallaRetiro(
            `Fin de la Carrera: Fuera de la Liga. Tus números esta temporada (${pts} PTS, ${ast} AST, ${reb} REB) fueron demasiado bajos para el nivel exigido en la NBA a tu edad, incluso ajustando por los pocos minutos que jugaste. Ninguna franquicia mostró interés y decidís retirarte de manera prematura.`,
            true
        );
        return;
    }

    const ofertasHTML = generarOfertasAgenciaLibre(rendimientoCombinado);

    officeScreen.innerHTML = `
        ${renderizarTarjetaJugador()}
        <h2>Oficinas de la Agencia Libre 💼</h2>
        <p>Tu rendimiento acumulado te permitió mantenerte en la elite. Evaluá las propuestas de tu agente:</p>
        <div class="contenedor-ofertas">
            ${ofertasHTML}
        </div>
    `;
}

// ==========================================
// FUNCIÓN AUXILIAR: PROCESAR EL CONTRATO ELEGIDO
// ==========================================
function aceptarContrato(equipo, años, rol) {
    if (gameState.player.isRetired) return; // 🆕 FIX: no firmar contratos post-retiro

    const cambioDeEquipo = gameState.player.currentTeam !== equipo;
    gameState.player.currentTeam = equipo;
    gameState.player.contractYearsLeft = años;
    gameState.player.rolEquipo = rol || "segundaOpcion"; // 🆕
    gameState.player.especialidadElegida = null; // 🆕 se re-elige si el rol es "especialista"

    // 🆕 nueva franquicia, nueva rivalidad — el rival de tu equipo anterior
    // no te sigue si te vas a jugar a otro lado.
    if (cambioDeEquipo) asignarRivalDeFranquicia();

    document.getElementById("office-screen").classList.add("hidden");

    if (rol === "especialista") {
        mostrarPantallaElegirEspecialidad();
        return;
    }

    irAEntrenamientoAñoDos();
}

// 🆕 Pantalla para elegir en qué stat especializarse si te tocó el rol Especialista.
function mostrarPantallaElegirEspecialidad() {
    let screen = document.getElementById("office-screen");
    screen.classList.remove("hidden");
    screen.innerHTML = `
        <h2>🧩 Elegí tu Especialidad</h2>
        <div class="status-box">
            <p>Firmaste como Especialista de Rotación. Elegí en qué faceta del juego vas a destacarte por sobre el resto.</p>
        </div>
        <div class="contenedor-ofertas">
            <div class="oferta-card"><h3>Anotador 🎯</h3><p>+25% de bonus a tus puntos.</p><button onclick="confirmarEspecialidad('pts')">Elegir</button></div>
            <div class="oferta-card"><h3>Pasador 🧠</h3><p>+25% de bonus a tus asistencias.</p><button onclick="confirmarEspecialidad('ast')">Elegir</button></div>
            <div class="oferta-card"><h3>Reboteador 🧱</h3><p>+25% de bonus a tus rebotes.</p><button onclick="confirmarEspecialidad('reb')">Elegir</button></div>
            <div class="oferta-card"><h3>Defensor 🛡️</h3><p>+25% de bonus a robos y tapones.</p><button onclick="confirmarEspecialidad('stlblk')">Elegir</button></div>
        </div>
    `;
}

function confirmarEspecialidad(especialidad) {
    gameState.player.especialidadElegida = especialidad;
    document.getElementById("office-screen").classList.add("hidden");
    irAEntrenamientoAñoDos();
}

// ==========================================
// BUCLE GENERAL DE CARRERA (AÑO 3 EN ADELANTE)
// ==========================================
async function simularSiguienteAño() {
    const player = gameState.player;
    if (player.isRetired) return; // 🆕 FIX: no simular más temporadas post-retiro
    sonidoSwish(); // 🆕

    player.age++;
    player.experience++;
    player.contractYearsLeft = Math.max(0, player.contractYearsLeft - 1);

    if (player.age >= 30) {
        if (player.age === 30 && player.declineAge === null) {
            const dadoPerfil = Math.random();
            if (dadoPerfil <= 0.30) {
                player.declineAge = 31;
            } else if (dadoPerfil <= 0.90) {
                player.declineAge = 33;
            } else {
                player.declineAge = 35;
            }
        }

        if (player.declineAge !== null && player.age >= player.declineAge) {
            procesarDecliveFisico();
        }
    }

    const { modificadorSuerte, tipoAño } = generarSuerteDelAño();
    const { minutos, huboBreakout, huboRegresion, mensajePeleaMinutos } = calcularMinutosDelAño(modificadorSuerte);
    player.minutesPerGame = minutos;

    const calidadEquipo = await sortearCalidadEquipo();
    const traspaso = intentarTraspasoDeLaTemporada();
    if (traspaso) {
        if (!gameState.traspasosAplicadosIds) gameState.traspasosAplicadosIds = new Set();
        gameState.traspasosAplicadosIds.add(traspaso.id);
        if (typeof guardarTraspasoCompartido === "function") guardarTraspasoCompartido(traspaso);
    }
    const { pts, ast, reb, stl, blk, rendimientoPer36, impactoDefensivo, mensajeLesion, minutosReales } = calcularEstadisticasConLesion(modificadorSuerte, tipoAño);
    const { logros, bonus, candidaturas, rendimientoIndividual, rendimientoDefensivo, esRookie } = calcularLogrosDeTemporada(pts, ast, reb, stl, blk, player.experience, impactoDefensivo, calidadEquipo, tieneCarreraCompartida());

    // 🆕 duelo narrativo contra el rival de franquicia y comparación contra
    // el rival histórico (carreras guardadas de partidas anteriores).
    const rendimientoParaRival = pts + ast + reb + (impactoDefensivo * 15);
    const mensajeRival = resolverDueloDeRival(rendimientoParaRival);

    const resultadoAño = {
        year: player.experience,
        team: player.currentTeam,
        min: minutosReales,
        pts, ast, reb, stl, blk,
        tipoAzar: tipoAño,
        mensajeLesion,
        calidadEquipo, // 🆕
        traspaso, // 🆕
        mensajeRival, // 🆕
        logros,
        rendimientoPer36,
        huboBreakout,
        huboRegresion,
        candidaturas,          // 🆕
        rendimientoIndividual, // 🆕
        rendimientoDefensivo,  // 🆕
        esRookie                // 🆕
    };
    gameState.statsHistory.push(resultadoAño);
    generarCartaDeTemporada(resultadoAño); // 🆕
    resultadoAño.mensajeRivalHistorico = generarMensajeRivalHistorico(); // 🆕 necesita el año ya en el historial

    if (chequearRetiroDefinitivo()) {
        return;
    }

    resultadoAño.resultadoObjetivo = verificarObjetivoDeTemporada(resultadoAño);
    manejarEventoYFinalizar(
        resultadoAño,
        (bonusExtra) => {
            const base = (player.declineAge === null || player.age < player.declineAge)
                ? calcularPuntosBaseDesarrollo(player.experience)
                : 0;
            const puntosObjetivo = (resultadoAño.resultadoObjetivo && resultadoAño.resultadoObjetivo.cumplido)
                ? resultadoAño.resultadoObjetivo.objetivo.puntos : 0;
            player.availablePoints = Math.max(0, base + bonus + bonusExtra + puntosObjetivo);
        },
        mostrarPantallaBucleCarrera
    );
}

// ==========================================
// 🆕 NUEVO: ENFOQUE DE TEMPORADA (decisión previa a simular)
// ==========================================
// Antes la única decisión del jugador eran los puntos de atributos. Ahora,
// antes de confirmar y simular cada temporada, elegís cómo vas a plantear el
// año. No cambia tus atributos, pero sí cómo se traducen en la cancha: más
// riesgo por más números, jugar seguro, priorizar al equipo, o el término
// medio de siempre. Se conecta directo con el sistema de lesiones (jugar
// arriesgado sube la probabilidad de lesionarte).
// Enfoques con injuryMultiplier ajustado — el salto entre "riesgo normal" y
// "riesgo alto" ahora es mucho más marcado, para que el trade-off pese de
// verdad y no sea una decisión sin sacrificio real.
const ENFOQUES_TEMPORADA = {
    agresivo: {
        nombre: "Modo Estrella 🌟",
        descripcion: "Buscás protagonismo total: más tiros, más responsabilidad, más minutos de riesgo. Sube mucho tu producción ofensiva pero descuida el resto del juego y el desgaste físico es real.",
        pts: 1.32, ast: 0.90, reb: 0.88, stl: 0.85, blk: 0.85,
        injuryMultiplier: 2.6   // antes 1.65
    },
    conservador: {
        nombre: "Cuidar el Cuerpo 🧊",
        descripcion: "Jugás con el freno de mano puesto para llegar entero a fin de año. Baja fuerte tu producción, pero el riesgo de lesión se reduce muchísimo.",
        pts: 0.72, ast: 0.78, reb: 0.78, stl: 0.80, blk: 0.80,
        injuryMultiplier: 0.35  // antes 0.40, un poco más de recompensa por jugar seguro
    },
    equipo: {
        nombre: "Juego de Equipo 🤝",
        descripcion: "Priorizás pases, rebote y defensa por sobre tu propia planilla ofensiva. Anotás bastante menos, pero sumás mucho más en todo lo demás.",
        pts: 0.68, ast: 1.38, reb: 1.30, stl: 1.28, blk: 1.25,
        injuryMultiplier: 1.05
    },
    profesional: {
        nombre: "Profesional 📋",
        descripcion: "Ni arriesgás de más ni te guardás: jugás tu juego de siempre, sin cambios.",
        pts: 1.0, ast: 1.0, reb: 1.0, stl: 1.0, blk: 1.0,
        injuryMultiplier: 1.0
    },
    candado: {
        nombre: "Modo Candado 🔒",
        descripcion: "Te olvidás del ataque y te ponés como misión frenar al rival. Tu planilla ofensiva se resiente fuerte, pero tu impacto defensivo (robos y tapones) se dispara.",
        pts: 0.65, ast: 0.85, reb: 0.95, stl: 1.55, blk: 1.55,
        injuryMultiplier: 1.20
    },
    facilitador: {
        nombre: "Armador Puro 🎯",
        descripcion: "Bajás tu volumen de tiro casi a cero para dedicarte pura y exclusivamente a generarle juego a tus compañeros. Menos puntos que nunca, pero un nivel de asistencias fuera de serie.",
        pts: 0.55, ast: 1.60, reb: 0.85, stl: 1.05, blk: 0.75,
        injuryMultiplier: 0.85
    },
    todoterreno: {
        nombre: "Todoterreno 🧩",
        descripcion: "No sobresalís en nada puntual, pero rendís parejo en todos lados: un poco más de todo, sin picos ni bajones marcados. Ideal para sumar en cualquier planilla sin exponerte de más.",
        pts: 1.08, ast: 1.08, reb: 1.08, stl: 1.08, blk: 1.08,
        injuryMultiplier: 1.15
    },
    alto_riesgo: {
        nombre: "Todo o Nada 🎲",
        descripcion: "Vas con todo, sin frenos, en cada faceta del juego. Tu techo es altísimo, pero también tu piso: puede ser tu mejor temporada o un desastre físico y estadístico.",
        pts: 1.20, ast: 1.20, reb: 1.20, stl: 1.20, blk: 1.20,
        injuryMultiplier: 2.9   // antes 1.75, el más riesgoso de todos
    },
    rebotero: {
        nombre: "Máquina de Rebotes 🧱",
        descripcion: "Vivís pegado al aro peleando cada pelota dividida. Sacrificás asistencias y algo de tiro exterior, pero tu nivel de rebote se dispara muy por encima de lo normal.",
        pts: 0.85, ast: 0.70, reb: 1.55, stl: 0.90, blk: 1.10,
        injuryMultiplier: 1.75  // el roce bajo el aro también castiga físicamente
    },
    showman: {
        nombre: "Showman 🎪",
        descripcion: "Jugás para la tribuna: jugadas vistosas, tiros de media/larga distancia y asistencias espectaculares. Descuidás el rebote y la defensa, pero el show ofensivo es total.",
        pts: 1.22, ast: 1.22, reb: 0.70, stl: 0.75, blk: 0.70,
        injuryMultiplier: 1.90
    }
};

function obtenerEnfoqueActivo() {
    const key = gameState.player.enfoqueTemporada;
    return ENFOQUES_TEMPORADA[key] || ENFOQUES_TEMPORADA.profesional;
}

// 🆕 MEJORA: en vez de mostrar siempre las mismas 8 opciones (lo que hacía
// que terminaras usando siempre las mismas 2-3 favoritas), cada temporada se
// sortean 3 enfoques al azar + "Profesional" (que siempre está disponible
// como opción segura de base). Así la decisión real cambia año a año, sin
// perder la opción neutral de siempre.
function sortearEnfoquesDeLaTemporada() {
    const keysNoProfesional = Object.keys(ENFOQUES_TEMPORADA).filter(k => k !== "profesional");
    const copia = [...keysNoProfesional];
    const elegidos = [];

    const cantidadASortear = Math.min(3, copia.length);
    for (let i = 0; i < cantidadASortear; i++) {
        const indice = Math.floor(Math.random() * copia.length);
        elegidos.push(copia.splice(indice, 1)[0]);
    }

    return [...elegidos, "profesional"];
}

function renderizarSelectorEnfoque() {
    const seleccionado = gameState.player.enfoqueTemporada;

    // 🆕 se sortea una sola vez por temporada y se guarda, para que no
    // cambien las opciones si la pantalla se vuelve a dibujar (por ejemplo
    // al seleccionar un atributo).
    if (!gameState.player.enfoquesDisponiblesTemporada) {
        gameState.player.enfoquesDisponiblesTemporada = sortearEnfoquesDeLaTemporada();
    }

    const keysDisponibles = gameState.player.enfoquesDisponiblesTemporada;

    const cards = keysDisponibles.map(key => {
        const enfoque = ENFOQUES_TEMPORADA[key];
        const activa = seleccionado === key ? "enfoque-card-activa" : "";
        return `
            <div class="enfoque-card ${activa}" onclick="seleccionarEnfoque('${key}')">
                <h4>${enfoque.nombre}</h4>
                <p>${enfoque.descripcion}</p>
            </div>
        `;
    }).join("");

    return `
        <div class="enfoque-selector">
            <h3>Elegí tu enfoque para esta temporada</h3>
            <div id="enfoque-hint" class="enfoque-hint">${seleccionado ? "" : "⚠️ Elegí un enfoque para poder confirmar."}</div>
            <div class="enfoque-grid">${cards}</div>
        </div>
    `;
}

function seleccionarEnfoque(key) {
    if (gameState.player.isRetired) return;
    gameState.player.enfoqueTemporada = key;

    document.querySelectorAll(".enfoque-card").forEach(el => el.classList.remove("enfoque-card-activa"));
    const cardIndex = gameState.player.enfoquesDisponiblesTemporada.indexOf(key);
    const cards = document.querySelectorAll(".enfoque-card");
    if (cards[cardIndex]) cards[cardIndex].classList.add("enfoque-card-activa");

    const hint = document.getElementById("enfoque-hint");
    if (hint) hint.textContent = "";

    actualizarEstadoBotonConfirmar();
}

// Antes no existía ningún riesgo de lesión: el único desgaste físico venía
// del declive determinístico por edad (procesarDecliveFisico). Ahora cada
// temporada hay una chance de lesionarte, que depende de tus minutos
// jugados, tu edad, tu resistencia física (fisico/fuerza) y si ya venís
// arrastrando lesiones previas. Es 100% automático y narrativo — no hay
// decisión del jugador, solo el relato de lo que pasó. Se pensó para que
// aparezca pocas veces (no todos los años) y no rompa la experiencia: la
// gravedad es aleatoria y proporcional, no un patrón fijo y lineal.
function calcularProbabilidadLesion() {
    const player = gameState.player;
    const attrs = gameState.attributes;

    const factorMinutos = player.minutesPerGame / 36; // más cancha, más exposición
    const factorEdad = player.age >= 30 ? 1 + (player.age - 29) * 0.055 : 1.0;
    const resistenciaFisica = (attrs.resistencia + attrs.fuerza) / 40; // 0 (débil) a 1 (fuerte)
// 🆕 antes iba de 1.35 (débil) a 0.70 (fuerte) — el físico casi anulaba
// el riesgo. Ahora el rango es más angosto, así el enfoque elegido sigue
// pesando de verdad aunque tengas buen físico/fuerza.
const factorResistencia = 1.20 - resistenciaFisica * 0.40; // antes: 1.35 - resistenciaFisica * 0.65    // 🆕 jugadores "de vidrio": cada lesión moderada/grave previa suma propensión,
    // hasta un techo, para que un historial cargado se sienta cada vez más frágil.
    const factorPropension = 1 + Math.min(player.injuryHistory * 0.14, 0.65);

    const BASE = 0.075; // ~7.5% base con exposición y físico promedio
    // 🆕 el enfoque elegido para la temporada pesa directo acá: Modo Estrella
    // sube bastante el riesgo, Cuidar el Cuerpo lo baja mucho.
    const factorEnfoque = obtenerEnfoqueActivo().injuryMultiplier;
    const probabilidad = BASE * factorMinutos * factorEdad * factorResistencia * factorPropension * factorEnfoque;

    return Math.min(0.32, Math.max(0.02, probabilidad));
}

function procesarLesionDeTemporada() {
    const player = gameState.player;

    if (Math.random() >= calcularProbabilidadLesion()) {
        return null; // temporada sana, lo más común
    }

    const dadoGravedad = Math.random();
    const minutosOriginales = player.minutesPerGame;

    if (dadoGravedad < 0.55) {
        // Leve: no te saca partidos, solo te resta un poco de nivel esa temporada.
        const multiplicadorStat = 0.90 + Math.random() * 0.07;
        const mensajes = [
            "Molestia en el tobillo que arrastraste parte del año, sin faltar a la cancha.",
            "Sobrecarga muscular leve que te bajó un poco el rendimiento en tramos de la temporada.",
            "Golpe en la rodilla que te hizo jugar con precaución durante varias semanas."
        ];
        return {
            severidad: "leve",
            mensajeLesion: `🩹 Lesión Leve: ${mensajes[Math.floor(Math.random() * mensajes.length)]}`,
            multiplicadorStat,
            minutosOriginales,
            minutosAjustados: minutosOriginales
        };
    }

    if (dadoGravedad < 0.87) {
        // Moderada: te perdés partidos de verdad (menos minutos promedio) y bajás nivel.
        const reduccionMinutos = 0.15 + Math.random() * 0.15; // -15% a -30%
        const minutosAjustados = Math.max(4, Math.round(minutosOriginales * (1 - reduccionMinutos)));
        const multiplicadorStat = 0.80 + Math.random() * 0.10;
        player.injuryHistory += 1;
        const mensajes = [
            "Esguince que te dejó afuera varias semanas y te costó recuperar el ritmo.",
            "Problema muscular recurrente que el cuerpo técnico manejó con cautela toda la temporada.",
            "Lesión en la espalda que te limitó los minutos durante buena parte del año."
        ];
        return {
            severidad: "moderada",
            mensajeLesion: `🤕 Lesión Moderada: ${mensajes[Math.floor(Math.random() * mensajes.length)]}`,
            multiplicadorStat,
            minutosOriginales,
            minutosAjustados
        };
    }

    // Grave: temporada golpeada de verdad, y deja marca en el historial físico.
    const reduccionMinutos = 0.40 + Math.random() * 0.25; // -40% a -65%
    const minutosAjustados = Math.max(3, Math.round(minutosOriginales * (1 - reduccionMinutos)));
    const multiplicadorStat = 0.60 + Math.random() * 0.15;
    player.injuryHistory += 2;
    const mensajes = [
        "Lesión importante que te tuvo semanas enteras afuera de las canchas.",
        "Cirugía menor que te hizo perderte una parte grande de la temporada.",
        "Recaída física seria que preocupó al cuerpo médico del equipo."
    ];
    return {
        severidad: "grave",
        mensajeLesion: `🚑 Lesión Grave: ${mensajes[Math.floor(Math.random() * mensajes.length)]}`,
        multiplicadorStat,
        minutosOriginales,
        minutosAjustados
    };
}

// Aplica el efecto de una lesión (si la hubo) a las stats ya calculadas de la
// temporada, ajustando minutos temporalmente durante el cálculo y
// restaurándolos después (la reducción de minutos es solo de ese año).
function calcularEstadisticasConLesion(modificadorSuerte, tipoAño) {
    const player = gameState.player;
    const lesion = procesarLesionDeTemporada();

    if (!lesion) {
        const stats = calcularEstadisticasDelAño(modificadorSuerte, tipoAño);
        return { ...stats, mensajeLesion: null, minutosReales: player.minutesPerGame };
    }

    player.minutesPerGame = lesion.minutosAjustados;
    const statsBase = calcularEstadisticasDelAño(modificadorSuerte, tipoAño);
    player.minutesPerGame = lesion.minutosOriginales; // se restaura para años futuros

    const m = lesion.multiplicadorStat;
    return {
        pts: parseFloat((statsBase.pts * m).toFixed(1)),
        ast: parseFloat((statsBase.ast * m).toFixed(1)),
        reb: parseFloat((statsBase.reb * m).toFixed(1)),
        stl: parseFloat((statsBase.stl * m).toFixed(1)),
        blk: parseFloat((statsBase.blk * m).toFixed(1)),
        tipoAño: statsBase.tipoAño,
        rendimientoPer36: statsBase.rendimientoPer36,
        impactoDefensivo: statsBase.impactoDefensivo,
        mensajeLesion: lesion.mensajeLesion,
        minutosReales: lesion.minutosAjustados
    };
}

// ==========================================
// 🆕 NUEVO: EVENTOS ALEATORIOS DE TEMPORADA
// ==========================================
// Antes cada temporada era "repartir puntos -> simular -> ver stats", siempre
// igual. Ahora, después de jugar la temporada, puede aparecer un evento que
// le pone color y algo de peso mecánico al año: la mayoría son automáticos
// y solo narrativos (con un pequeño efecto en los puntos de mejora que
// ganás), pero algunos te dan a elegir entre dos caminos. Mezcla eventos
// dentro de la cancha (roces, química de equipo) y fuera de ella (prensa,
// sponsors, vida personal).
const EVENTOS_AUTOMATICOS = [
    // ---- Cancha: química positiva ----
    { categoria: "cancha", mensaje: "🔥 Hiciste buena onda con un compañero clave y la química del equipo te sumó en la cancha.", bonusExtra: 1, climaExtra: 4 },
    { categoria: "cancha", mensaje: "🤝 Un veterano del plantel te tomó como discípulo y te ayudó a pulir detalles de tu juego.", bonusExtra: 2, climaExtra: 5 },
    { categoria: "cancha", mensaje: "🎯 El cuerpo técnico destacó tu profesionalismo en los entrenamientos frente a todo el plantel.", bonusExtra: 1, climaExtra: 3 },
    { categoria: "cancha", mensaje: "🎉 Organizaste una cena de equipo que ayudó a soldar el grupo antes de un tramo difícil del calendario.", bonusExtra: 0, climaExtra: 6 },
    { categoria: "cancha", mensaje: "🙌 Le diste una mano a un novato del plantel que venía perdido — el vestuario lo valoró.", bonusExtra: 0, climaExtra: 4 },
    { categoria: "cancha", mensaje: "💪 Te quedaste después del entrenamiento ayudando a un compañero con su tiro — se corrió la voz en el vestuario.", bonusExtra: 1, climaExtra: 3 },
    { categoria: "cancha", mensaje: "🌟 Marcaste el tanto de la victoria en un partido y el estadio coreó tu nombre.", bonusExtra: 2, climaExtra: 3 },
    { categoria: "cancha", mensaje: "📈 Estudiaste el video de tu próximo rival y alertaste a tus compañeros de una debilidad clave.", bonusExtra: 2, climaExtra: 4 },
    { categoria: "cancha", mensaje: "🛡️ Te pusiste al frente en una jugada dividida peligrosa, ganándote el respeto total de los defensores.", bonusExtra: 1, climaExtra: 5 },
    { categoria: "cancha", mensaje: "🤝 Fuiste el primero en levantar a un compañero que había caído al piso tras una falta.", bonusExtra: 0, climaExtra: 3 },
    { categoria: "cancha", mensaje: "⚡ Demostraste una intensidad física en el entrenamiento que contagió energía a todo el equipo.", bonusExtra: 1, climaExtra: 4 },
    { categoria: "cancha", mensaje: "🎙️ En la charla técnica, hiciste una autocrítica constructiva que unió más al plantel.", bonusExtra: 0, climaExtra: 5 },
    { categoria: "cancha", mensaje: "🎁 Diste una asistencia perfecta, priorizando el beneficio común.", bonusExtra: 1, climaExtra: 4 },
    { categoria: "cancha", mensaje: "🎖️ El capitán te felicitó públicamente por tu sacrificio defensivo en los últimos partidos.", bonusExtra: 1, climaExtra: 5 },
    { categoria: "cancha", mensaje: "🧘 Ayudaste a un compañero a manejar los nervios antes de un partido definitorio con un consejo simple.", bonusExtra: 0, climaExtra: 4 },
    { categoria: "cancha", mensaje: "🔋 Tu rendimiento físico subió un escalón y el preparador físico lo usó como ejemplo para los demás.", bonusExtra: 2, climaExtra: 3 },

    // ---- Cancha: fricción negativa ----
    { categoria: "cancha", mensaje: "😤 Un cruce con el entrenador por minutos te tuvo un poco distraído parte del año.", bonusExtra: -1, climaExtra: -4 },
    { categoria: "cancha", mensaje: "🗣️ Te agarraste una discusión fuerte con un compañero en pleno entrenamiento por una jugada.", bonusExtra: 0, climaExtra: -6 },
    { categoria: "cancha", mensaje: "😒 Un compañero se quejó públicamente de que acaparás demasiado la pelota.", bonusExtra: 0, climaExtra: -5 },
    { categoria: "cancha", mensaje: "🚫 Llegaste tarde a un entrenamiento clave y el cuerpo técnico te llamó la atención delante de todos.", bonusExtra: -1, climaExtra: -5 },
    { categoria: "cancha", mensaje: "🧊 Sentiste que el grupo te dejó un poco de lado después de una mala racha de resultados.", bonusExtra: 0, climaExtra: -3 },
    { categoria: "cancha", mensaje: "⚠️ Te perdiste una marca clave en el clutch y el profe te recriminó fuertemente.", bonusExtra: -1, climaExtra: -4 },
    { categoria: "cancha", mensaje: "🌡️ Jugaste un partido visiblemente desganado y el público local empezó a murmurar contra vos.", bonusExtra: -2, climaExtra: -6 },
    { categoria: "cancha", mensaje: "🛑 Fuiste expulsado de manera irresponsable, dejando a tu equipo con diez hombres.", bonusExtra: -2, climaExtra: -8 },
    { categoria: "cancha", mensaje: "🚧 Tu falta de entendimiento táctico con el lateral provocó un desorden defensivo evidente.", bonusExtra: -1, climaExtra: -3 },
    { categoria: "cancha", mensaje: "🤐 Ignoraste una instrucción directa del entrenador durante el partido, generando un momento tenso.", bonusExtra: -1, climaExtra: -5 },
    { categoria: "cancha", mensaje: "📉 Entraste en una racha de fallos inexplicables que empezaron a generar murmullos en la tribuna.", bonusExtra: -1, climaExtra: -4 },
    { categoria: "cancha", mensaje: "😠 Te descubrieron una cuenta falsa de X donde hablas mal de tus compañeros.", bonusExtra: -1, climaExtra: -6 },
    { categoria: "cancha", mensaje: "📉 Se filtró que estás bajo de forma física y la prensa empezó a cuestionar tu contrato.", bonusExtra: -1, climaExtra: -3 },
    { categoria: "cancha", mensaje: "👥 Te comiste a la mujer de tu compañero y se enteró todo el vestuario.", bonusExtra: 0, climaExtra: -7 },
    { categoria: "cancha", mensaje: "⚖️ Se notó una diferencia abismal entre tu juego defensivo y ofensivo, creando dudas en el cuerpo técnico.", bonusExtra: -1, climaExtra: -2 },

    // ---- Fuera de cancha: positivos ----
    { categoria: "fueraCancha", mensaje: "📸 Una marca deportiva te sumó a una campaña menor — más exposición, algo de presión extra.", bonusExtra: 1, climaExtra: 1 },
    { categoria: "fueraCancha", mensaje: "🎂 Organizaste el cumpleaños de un compañero y el gesto cayó muy bien en el plantel.", bonusExtra: 0, climaExtra: 5 },
    { categoria: "fueraCancha", mensaje: "🏡 Invitaste a varios compañeros a tu casa en un día libre — el grupo se llevó una buena tarde.", bonusExtra: 0, climaExtra: 4 },
    { categoria: "fueraCancha", mensaje: "📰 Elogiaste públicamente a tus compañeros en una entrevista, y ellos lo agradecieron.", bonusExtra: 0, climaExtra: 3 },
    { categoria: "fueraCancha", mensaje: "🚗 Le diste un aventón seguido a un compañero sin auto — un gesto chico que se valoró en el grupo.", bonusExtra: 0, climaExtra: 3 },
    { categoria: "fueraCancha", mensaje: "🎓 Terminaste un curso de capacitación o carrera corta, demostrando madurez fuera del fútbol.", bonusExtra: 1, climaExtra: 2 },
    { categoria: "fueraCancha", mensaje: "🏥 Visitaste a un compañero lesionado en el hospital, un gesto que el vestuario valoró mucho.", bonusExtra: 0, climaExtra: 6 },
    { categoria: "fueraCancha", mensaje: "👕 Hiciste una donación importante de equipamiento para las divisiones inferiores del club.", bonusExtra: 1, climaExtra: 5 },
    { categoria: "fueraCancha", mensaje: "🤝 Actuaste como mediador en un conflicto menor entre dos compañeros, evitando que pase a mayores.", bonusExtra: 0, climaExtra: 4 },
    { categoria: "fueraCancha", mensaje: "🍽️ Pagaste una cena de equipo inesperada después de una victoria importante.", bonusExtra: 0, climaExtra: 5 },
    { categoria: "fueraCancha", mensaje: "🎤 Participaste en un evento benéfico local, dejando muy bien parada la imagen del plantel.", bonusExtra: 1, climaExtra: 3 },
    { categoria: "fueraCancha", mensaje: "🎮 Armaste un grupo de juego online para los más jóvenes, integrándolos rápidamente al grupo.", bonusExtra: 0, climaExtra: 3 },
    { categoria: "fueraCancha", mensaje: "📦 Ayudaste a un compañero nuevo a mudarse a su departamento apenas llegó a la ciudad.", bonusExtra: 0, climaExtra: 4 },
    { categoria: "fueraCancha", mensaje: "💡 Tuviste un gesto de humildad al reconocer tu error ante un veterano, ganando su respeto.", bonusExtra: 0, climaExtra: 4 },
    { categoria: "fueraCancha", mensaje: "✈️ Gestionaste la logística de viaje de un compañero que tenía problemas personales, siendo un salvavidas.", bonusExtra: 0, climaExtra: 5 },

    // ---- Fuera de cancha: negativos ----
    { categoria: "fueraCancha", mensaje: "📰 Unas declaraciones tuyas se malinterpretaron en la prensa y armaron un quilombo corto.", bonusExtra: -1, climaExtra: -4 },
    { categoria: "fueraCancha", mensaje: "✈️ Un viaje familiar te desconcentró un poco antes de un tramo importante de la temporada.", bonusExtra: -1, climaExtra: 0 },
    { categoria: "fueraCancha", mensaje: "🎧 Te vieron mucho tiempo con auriculares puestos, ignorando charlas de grupo — algunos lo tomaron como soberbia.", bonusExtra: 0, climaExtra: -3 },
    { categoria: "fueraCancha", mensaje: "💸 Un compañero se enteró que ganás bastante más que él y hubo un poco de tensión incómoda.", bonusExtra: 0, climaExtra: -2 },
    { categoria: "fueraCancha", mensaje: "📸 Te vieron en un boliche hasta tarde un día antes de un partido, la prensa no perdonó.", bonusExtra: -2, climaExtra: -7 },
    { categoria: "fueraCancha", mensaje: "📱 Publicaste una foto polémica en redes sociales que involucraba a compañeros sin permiso.", bonusExtra: -1, climaExtra: -5 },
    { categoria: "fueraCancha", mensaje: "🚗 Tuviste un incidente de tránsito menor que salió en los portales de chimentos.", bonusExtra: 0, climaExtra: -3 },
    { categoria: "fueraCancha", mensaje: "🏠 Hubo una queja de los vecinos de tu edificio por ruidos molestos en una reunión tuya.", bonusExtra: 0, climaExtra: -2 },
    { categoria: "fueraCancha", mensaje: "💬 Se rumorea en el vestuario que sos quien filtra información a los periodistas.", bonusExtra: -1, climaExtra: -6 },
    { categoria: "fueraCancha", mensaje: "👟 Rechazaste firmar autógrafos a un grupo de chicos a la salida del predio, se viralizó en Twitter.", bonusExtra: 0, climaExtra: -4 },
    { categoria: "fueraCancha", mensaje: "📉 Faltaste a un evento de patrocinio obligatorio del club por un olvido personal.", bonusExtra: -1, climaExtra: -3 },
    { categoria: "fueraCancha", mensaje: "🙊 Comentaste algo privado de un compañero que terminó llegando a oídos de todo el equipo.", bonusExtra: 0, climaExtra: -5 },
    { categoria: "fueraCancha", mensaje: "💸 Te vieron gastando cifras excesivas en un momento de crisis del club, la hinchada está molesta.", bonusExtra: 0, climaExtra: -4 },
    { categoria: "fueraCancha", mensaje: "📵 Te aislaste del grupo en el hotel de concentración, negándote a compartir tiempo común.", bonusExtra: 0, climaExtra: -3 }
];

const EVENTOS_DECISION = [
    // ---- Tus 10 originales ----
    {
        categoria: "fueraCancha",
        narrativa: "Una marca de indumentaria te ofrece un contrato de auspicio. Es plata y exposición, pero te va a robar tiempo de entrenamiento.",
        opciones: [
            { label: "Firmar el contrato 💰", resultadoTexto: "Firmaste el auspicio: sumaste plata y fama, pero le restaste horas al gimnasio.", bonusExtra: -1, climaExtra: 0 },
            { label: "Rechazar y enfocarte en el juego 🏀", resultadoTexto: "Rechazaste la oferta para no distraerte — el cuerpo técnico valoró tu compromiso.", bonusExtra: 1, climaExtra: 1 }
        ]
    },
    {
        categoria: "cancha",
        narrativa: "El entrenador te da a elegir: liderar vos los entrenamientos extra del equipo, o entrenar solo a tu ritmo.",
        opciones: [
            { label: "Liderar al equipo 👥", resultadoTexto: "Te pusiste al hombro los entrenamientos extra — el grupo te lo agradeció.", bonusExtra: 1, climaExtra: 6 },
            { label: "Entrenar a tu ritmo 🧘", resultadoTexto: "Preferiste tu rutina personal, más efectiva para vos individualmente.", bonusExtra: 2, climaExtra: -2 }
        ]
    },
    {
        categoria: "fueraCancha",
        narrativa: "Te invitan a dar una charla motivacional en tu ciudad natal, justo en medio de la pretemporada.",
        opciones: [
            { label: "Ir a la charla 🎤", resultadoTexto: "Fuiste a devolverle algo a tu gente — te costó una semana de pretemporada intensiva.", bonusExtra: -1, climaExtra: 0 },
            { label: "Rechazar y quedarte entrenando 💪", resultadoTexto: "Preferiste no distraerte de la pretemporada.", bonusExtra: 1, climaExtra: 0 }
        ]
    },
    {
        categoria: "cancha",
        narrativa: "Dos compañeros del plantel están en conflicto por minutos y te piden que actúes de mediador.",
        opciones: [
            { label: "Meterte a mediar 🤝", resultadoTexto: "Ayudaste a destrabar el conflicto — el grupo respiró más tranquilo.", bonusExtra: 0, climaExtra: 7 },
            { label: "No meterte, no es tu problema 🙅", resultadoTexto: "Preferiste no involucrarte — el conflicto se resolvió solo, pero quedó un poco de resquemor.", bonusExtra: 0, climaExtra: -3 }
        ]
    },
    {
        categoria: "fueraCancha",
        narrativa: "El equipo organiza una actividad de bonding (día de pesca, torneo de la consola, etc.) el mismo día que tenías planeada una sesión extra en el gimnasio.",
        opciones: [
            { label: "Ir a la actividad de equipo 🎮", resultadoTexto: "Te sumaste al plan grupal — nada mejor para el clima del vestuario.", bonusExtra: 0, climaExtra: 5 },
            { label: "Quedarte entrenando solo 🏋️", resultadoTexto: "Preferiste seguir puliendo tu juego — el cuerpo lo agradece, el grupo un poco menos.", bonusExtra: 1, climaExtra: -3 }
        ]
    },
    {
        categoria: "cancha",
        narrativa: "El cuerpo técnico te pregunta tu opinión sobre sacar del roster a un compañero que rinde poco pero es muy querido en el vestuario.",
        opciones: [
            { label: "Recomendar que se quede 🛡️", resultadoTexto: "Defendiste a tu compañero frente al cuerpo técnico — el vestuario lo supo y te lo agradeció.", bonusExtra: 0, climaExtra: 6 },
            { label: "Ser honesto sobre su bajo rendimiento 📋", resultadoTexto: "Diste tu opinión sincera — el cuerpo técnico lo valoró, aunque no cayó igual de bien en el vestuario.", bonusExtra: 1, climaExtra: -5 }
        ]
    },
    {
        categoria: "fueraCancha",
        narrativa: "Un canal de streaming te ofrece hacer una serie documental sobre tu temporada, con cámaras siguiéndote incluso en el vestuario.",
        opciones: [
            { label: "Aceptar el documental 🎥", resultadoTexto: "Aceptaste la exposición — algunos compañeros se sintieron incómodos con las cámaras cerca.", bonusExtra: 2, climaExtra: -4 },
            { label: "Rechazar, cuidar la privacidad del grupo 🔒", resultadoTexto: "Rechazaste la oferta para no invadir la intimidad del vestuario.", bonusExtra: 0, climaExtra: 3 }
        ]
    },
    {
        categoria: "cancha",
        narrativa: "En medio de una racha de derrotas, el capitán del equipo te pide que ayudes a levantar el ánimo del grupo en una charla.",
        opciones: [
            { label: "Dar la cara y hablarle al equipo 🗣️", resultadoTexto: "Diste una charla sincera al grupo — se notó el efecto en la semana siguiente.", bonusExtra: 0, climaExtra: 8 },
            { label: "Preferir liderar con el ejemplo, no con palabras 🤐", resultadoTexto: "Elegiste liderar en silencio, dejando que otros hablen — funcionó, aunque menos.", bonusExtra: 1, climaExtra: 2 }
        ]
    },
    {
        categoria: "fueraCancha",
        narrativa: "Se filtra a la prensa que pediste ser cambiado de equipo hace un tiempo. Los compañeros lo leyeron y hay tensión.",
        opciones: [
            { label: "Aclarar la situación con el grupo cara a cara 💬", resultadoTexto: "Hablaste con el plantel y bajaste la tensión — no fue fácil, pero funcionó.", bonusExtra: 0, climaExtra: 2 },
            { label: "Ignorar el tema y seguir como si nada 🤷", resultadoTexto: "Preferiste no darle entidad al rumor — el silencio se sintió raro en el vestuario.", bonusExtra: 0, climaExtra: -6 }
        ]
    },
    {
        categoria: "cancha",
        narrativa: "Un rookie del plantel te pide consejos todo el tiempo, incluso te llama fuera de horario de entrenamiento.",
        opciones: [
            { label: "Hacerte tiempo para guiarlo 🌱", resultadoTexto: "Te tomaste el trabajo de ser mentor — el rookie y el resto del plantel lo valoraron mucho.", bonusExtra: 0, climaExtra: 6 },
            { label: "Poner un límite claro, necesitás tu espacio 🚧", resultadoTexto: "Le pusiste un límite sano — entendió, aunque quedó un poco frío el trato.", bonusExtra: 1, climaExtra: -2 }
        ]
    },

    // ---- Mis 10 nuevos ----
    {
        categoria: "cancha",
        narrativa: "El entrenador te pide que sacrifiques tu posición habitual para jugar en una posición que no te gusta pero que el equipo necesita.",
        opciones: [
            { label: "Aceptar el desafío 🔄", resultadoTexto: "Te adaptaste — el entrenador valoró tu versatilidad y el equipo ganó.", bonusExtra: 1, climaExtra: 5 },
            { label: "Negarte y pedir tu posición 🎯", resultadoTexto: "Priorizaste tu juego — el entrenador quedó molesto por tu falta de flexibilidad.", bonusExtra: 2, climaExtra: -4 }
        ]
    },
    {
        categoria: "cancha",
        narrativa: "Durante un entrenamiento, un compañero juega de forma muy agresiva y peligrosa.",
        opciones: [
            { label: "Pedirle que baje un cambio 🛑", resultadoTexto: "Evitaste una lesión y pusiste orden.", bonusExtra: 0, climaExtra: 3 },
            { label: "Responder con la misma intensidad 🥊", resultadoTexto: "Demostraste carácter, pero el ambiente se volvió hostil.", bonusExtra: 1, climaExtra: -5 }
        ]
    },
    {
        categoria: "cancha",
        narrativa: "Se presenta una oportunidad de practicar una jugada de riesgo que podría definir partidos.",
        opciones: [
            { label: "Dedicar tiempo extra a pulirla 🛠️", resultadoTexto: "La jugada salió perfecta en el próximo partido — héroe del día.", bonusExtra: 2, climaExtra: 3 },
            { label: "Mantener el entrenamiento estándar 🛡️", resultadoTexto: "Jugaste a lo seguro — el cuerpo técnico notó tu falta de ambición.", bonusExtra: 0, climaExtra: -2 }
        ]
    },
    {
        categoria: "cancha",
        narrativa: "El preparador físico te propone un plan de dieta estricto que afectaría tu vida social.",
        opciones: [
            { label: "Seguir el plan al pie de la letra 🥗", resultadoTexto: "Tu nivel físico subió notablemente.", bonusExtra: 3, climaExtra: -3 },
            { label: "Flexibilizar la dieta 🍕", resultadoTexto: "Mantuviste tu equilibrio personal, pero tu rendimiento físico no dio ese salto.", bonusExtra: 0, climaExtra: 2 }
        ]
    },
    {
        categoria: "cancha",
        narrativa: "Un jugador rival te busca constantemente con provocaciones para hacerte perder los estribos.",
        opciones: [
            { label: "Mantener la calma 🧘", resultadoTexto: "Tu temple ayudó a que el equipo no cayera en la trampa — el capitán te elogió.", bonusExtra: 1, climaExtra: 4 },
            { label: "Responder a la provocación 🗣️", resultadoTexto: "Perdiste el foco y recibiste una amarilla innecesaria.", bonusExtra: -1, climaExtra: -6 }
        ]
    },
    {
        categoria: "fueraCancha",
        narrativa: "Un amigo de la infancia quiere venir a quedarse a tu casa durante un tramo importante de la temporada.",
        opciones: [
            { label: "Alojalo en casa 🏠", resultadoTexto: "Fue un gran apoyo emocional, aunque perdiste horas de descanso.", bonusExtra: 0, climaExtra: 2 },
            { label: "Pedirle que venga después ✋", resultadoTexto: "Priorizaste tu descanso y enfoque profesional.", bonusExtra: 1, climaExtra: -1 }
        ]
    },
    {
        categoria: "fueraCancha",
        narrativa: "Te ofrecen ir a un podcast popular, pero coincide con tu siesta obligatoria de día de partido.",
        opciones: [
            { label: "Ir al podcast 🎙️", resultadoTexto: "Ganaste popularidad, pero llegaste al partido con poca energía.", bonusExtra: 1, climaExtra: -3 },
            { label: "Priorizar el descanso 💤", resultadoTexto: "Llegaste al 100% — el cuerpo técnico valoró tu profesionalismo.", bonusExtra: 1, climaExtra: 1 }
        ]
    },
    {
        categoria: "fueraCancha",
        narrativa: "Un compañero te pide un préstamo importante y sospechas que es para apuestas.",
        opciones: [
            { label: "Prestarle el dinero 💸", resultadoTexto: "El gesto estrechó la relación, pero te preocupa su hábito.", bonusExtra: 0, climaExtra: 4 },
            { label: "Rechazar y ser honesto 🚫", resultadoTexto: "Marcaste un límite — la relación se enfrió, pero actuaste con responsabilidad.", bonusExtra: 1, climaExtra: -3 }
        ]
    },
    {
        categoria: "fueraCancha",
        narrativa: "Te invitan a una fiesta exclusiva con rumores de prensa sensacionalista cerca.",
        opciones: [
            { label: "Ir con perfil bajo 🕶️", resultadoTexto: "La pasaste bien sin escándalos — ganaste contactos valiosos.", bonusExtra: 1, climaExtra: 2 },
            { label: "No ir por precaución 🏠", resultadoTexto: "Evitaste cualquier riesgo de manchar tu reputación.", bonusExtra: 0, climaExtra: 3 }
        ]
    },
    {
        categoria: "fueraCancha",
        narrativa: "Un familiar tiene un problema de salud menor y te pide que lo acompañes al médico en tu día libre.",
        opciones: [
            { label: "Acompañarlo 🏥", resultadoTexto: "Familia agradecida, recargaste pilas emocionalmente.", bonusExtra: 0, climaExtra: 5 },
            { label: "Quedarte descansando 🛋️", resultadoTexto: "Aprovechaste el día para recuperación total — renovado físicamente.", bonusExtra: 1, climaExtra: 0 }
        ]
    }
];

// 🆕 ~28% de chance de evento por temporada, 65% automático / 35% con
// elección, para que aparezcan de vez en cuando y no todos los años.
function procesarEventoDeTemporada() {
    if (Math.random() >= 0.40) return null;

    if (Math.random() < 0.65) {
        const evento = EVENTOS_AUTOMATICOS[Math.floor(Math.random() * EVENTOS_AUTOMATICOS.length)];
        return { tipo: "automatico", mensaje: evento.mensaje, bonusExtra: evento.bonusExtra };
    }

    const evento = EVENTOS_DECISION[Math.floor(Math.random() * EVENTOS_DECISION.length)];
    return { tipo: "decision", narrativa: evento.narrativa, opciones: evento.opciones };
}

// Orquesta qué pasa con el evento de la temporada y termina el flujo de
// cierre de año (fijar puntos disponibles + mostrar pantalla de resultados),
// ya sea directo (sin evento / evento automático) o pasando primero por una
// pantalla de decisión.
function manejarEventoYFinalizar(resultadoAño, aplicarPuntosFinal, mostrarFn) {
    const evento = procesarEventoDeTemporada();

    const finalizarFlujo = (extraDelEvento) => {
        if (tieneCarreraCompartida()) {
            guardarResultadoParaCeremonia(resultadoAño);
            mostrarPantallaEsperandoRival(resultadoAño, (resultadoFinal, bonusCeremonia) => {
                aplicarPuntosFinal((extraDelEvento || 0) + bonusCeremonia);
                setTimeout(() => mostrarFn(resultadoFinal), 3000);
            });
        } else {
            aplicarPuntosFinal(extraDelEvento || 0);
            mostrarFn(resultadoAño);
        }
    };

    if (!evento) {
        finalizarFlujo(0);
        return;
    }

    if (evento.tipo === "automatico") {
        resultadoAño.mensajeEvento = evento.mensaje;
        if (evento.climaExtra) ajustarClimaVestuario(evento.climaExtra);
        finalizarFlujo(evento.bonusExtra);
        return;
    }

    mostrarPantallaEventoDecision(evento, resultadoAño, (bonusExtra) => finalizarFlujo(bonusExtra), () => {});
}

// ==========================================
// INTERFAZ: PANTALLA DE DECISIÓN DE EVENTO
// ==========================================
function mostrarPantallaEventoDecision(evento, resultadoAño, aplicarPuntosFinal, mostrarFn) {
    ["creation-screen", "draft-screen", "season-screen", "office-screen"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });

    let eventoScreen = document.getElementById("evento-screen");
    if (!eventoScreen) {
        eventoScreen = document.createElement("section");
        eventoScreen.id = "evento-screen";
        document.getElementById("game-container").appendChild(eventoScreen);
    }
    eventoScreen.classList.remove("hidden");

    const botones = evento.opciones.map((opcion, i) =>
        `<button class="evento-opcion-btn" data-opcion="${i}">${opcion.label}</button>`
    ).join("");

    eventoScreen.innerHTML = `
        ${renderizarTarjetaJugador()}
        <h2>Un momento decisivo 🎬</h2>
        <div class="status-box">
            <p>${evento.narrativa}</p>
        </div>
        <div class="evento-opciones">${botones}</div>
    `;

    evento.opciones.forEach((opcion, i) => {
        const btn = eventoScreen.querySelector(`[data-opcion="${i}"]`);
        btn.onclick = () => {
            resultadoAño.mensajeEvento = opcion.resultadoTexto;
            if (opcion.climaExtra) ajustarClimaVestuario(opcion.climaExtra);
            aplicarPuntosFinal(opcion.bonusExtra);
            eventoScreen.classList.add("hidden");
            mostrarFn(resultadoAño);
        };
    });
}

// 🆕 caja de aviso para mostrar el evento de la temporada, si hubo.
function renderizarEventoHTML(mensajeEvento) {
    if (!mensajeEvento) return "";
    return `<div class="status-box alert-evento"><p>${mensajeEvento}</p></div>`;
}

// ==========================================
// LÓGICA: PROCESAR EL DECLIVE FÍSICO
// ==========================================
function procesarDecliveFisico() {
    const attrs = gameState.attributes;

    attrs.fuerza = Math.max(1, attrs.fuerza - (Math.floor(Math.random() * 2) + 1));
    attrs.velocidad = Math.max(1, attrs.velocidad - (Math.floor(Math.random() * 2) + 1));
    attrs.resistencia = Math.max(1, attrs.resistencia - 1);
    attrs.robo = Math.max(1, attrs.robo - 1);

    if (Math.random() > 0.8) {
        attrs.triple = Math.max(1, attrs.triple - 1);
    }
}

// ==========================================
// LÓGICA: CHEQUEAR SI TIRA LOS BOTINES
// ==========================================
// 🆕 MEJORA: ya no recibe el rendimiento de un solo año — usa el promedio
// móvil de las últimas 2 temporadas (obtenerPromedioPer36Reciente), así una
// sola mala racha con el factor suerte no te termina la carrera de golpe.
function chequearRetiroDefinitivo() {
    const player = gameState.player;
    const promedioPer36Reciente = obtenerPromedioPer36Reciente();
    const ultimoAño = gameState.statsHistory[gameState.statsHistory.length - 1];

    if (player.age >= 41) {
        ejecutarPantallaRetiro("Retiro Leyenda: Llegaste a los 41 años dando batalla. Tu cuerpo pide un descanso.");
        return true;
    }

    // 🆕 MEJORA: el umbral de "sos demasiado flojo para seguir" ya no es fijo
    // en 5.0. Sube con la edad: la liga exige cada vez más rendimiento a un
    // veterano para justificarle un lugar en el roster. A los 24 con un 5.0
    // de per36 te bancan un año más; a los 36 con ese mismo nivel, ya no.
    const umbralBase = 5.0;
    const exigenciaPorEdad = player.age >= 32 ? (player.age - 31) * 0.9 : 0;
    const umbralActual = umbralBase + exigenciaPorEdad;

    if (player.experience > 4 && promedioPer36Reciente < umbralActual) {
        ejecutarPantallaRetiro(`Retiro Prematuro: Con ${player.age} años, tu nivel de juego cayó demasiado bajo (${ultimoAño.pts} PTS, ${ultimoAño.ast} AST esta temporada) para seguir siendo una opción viable en la liga. Decidís retirarte con dignidad antes de que la liga te olvide.`, true);
        return true;
    }

    // 🆕 MEJORA: un jugador que acumuló varias lesiones moderadas/graves ya
    // sabe que su cuerpo no da para mucho más, así que la decisión de
    // retirarse por voluntad propia empieza antes (desde los 31, no 33) y es
    // más probable a cualquier edad. No es un límite duro — solo se inclina
    // la balanza, como en la vida real con un cuerpo castigado.
    const esJugadorDeVidrio = player.injuryHistory >= 3; // antes 4
    const edadMinimaRetiroVoluntario = esJugadorDeVidrio ? 31 : 33;

    if (player.age >= edadMinimaRetiroVoluntario) {
        const propensionExtra = Math.min(0.20, player.injuryHistory * 0.03);
        const probabilidadRetiro = Math.min(0.90, (player.age - (edadMinimaRetiroVoluntario - 1)) * 0.06 + propensionExtra);
        const factorRendimiento = promedioPer36Reciente >= 35 ? 0.5 : 1.0;

        if (Math.random() < probabilidadRetiro * factorRendimiento) {
            const motivoLesiones = esJugadorDeVidrio
                ? " El historial de lesiones te terminó de convencer: el cuerpo ya no responde como antes."
                : "";
            ejecutarPantallaRetiro(`Retiro por Decisión Propia: Con ${player.age} años y ${player.experience} temporadas encima, decidís que es momento de dejar la cancha mientras el cuerpo todavía responde.${motivoLesiones}`);
            return true;
        }
    }

    return false;
}

// ==========================================
// INTERFAZ: PANTALLA DEL BUCLE DE CARRERA (AÑOS 3+)
// ==========================================
function mostrarPantallaBucleCarrera(res) {
    const trainingScreen = document.getElementById("draft-screen");
    if (trainingScreen) {
        trainingScreen.classList.add("hidden");
        trainingScreen.style.display = "none";
    }

    const officeScreen = document.getElementById("office-screen");
    if (officeScreen) officeScreen.classList.add("hidden");

    const seasonScreen = document.getElementById("season-screen");
    seasonScreen.classList.remove("hidden");

    let seccionAcciones = "";

    if (gameState.player.contractYearsLeft === 0) {
        seccionAcciones = `
            <div class="status-box alert-warning">
                <p><strong>⚠️ Fin de Contrato:</strong> Tu vínculo con ${res.team} terminó. Es hora de negociar.</p>
            </div>
            <button onclick="procesarAgenciaLibreOGameOver()">Ir a la Agencia Libre 💼</button>
        `;
    } else {
        const enDeclive = gameState.player.declineAge !== null && gameState.player.age >= gameState.player.declineAge;
        let mensajePuntos;
        if (gameState.player.availablePoints > 0) {
            mensajePuntos = `<p>Ganaste <strong>${gameState.player.availablePoints} punto(s)</strong> de entrenamiento.</p>`;
        } else if (enDeclive) {
            mensajePuntos = `<p style="color: #d63031;">⚠️ Tu cuerpo ya no asimila el entrenamiento natural (Fase de Declive), y este año no sumaste puntos extra por logros.</p>`;
        } else {
            mensajePuntos = `<p>No sumaste puntos extra este año, pero seguís entrenando con normalidad.</p>`;
        }

        seccionAcciones = `
            <div class="status-box">
                <p><strong>Contrato Restante:</strong> Te queda(n) ${gameState.player.contractYearsLeft} año(s) con los ${res.team}.</p>
                ${mensajePuntos}
            </div>
            <button onclick="avanzarProximaTemporada()">Siguiente Temporada 🏀</button>
        `;
    }

    seasonScreen.innerHTML = `
        ${renderizarTarjetaJugador()}
        <h2>Temporada Finalizada (Año ${res.year})</h2>
        <p><strong>Equipo actual:</strong> ${res.team} | <strong>Edad:</strong> ${gameState.player.age} años | <strong>Rendimiento:</strong> ${res.tipoAzar}</p>

        <div class="stats-grid">
            <div class="stat-box"><p>MIN</p><h3>${res.min}</h3></div>
            <div class="stat-box"><p>PTS</p><h3>${res.pts}</h3></div>
            <div class="stat-box"><p>AST</p><h3>${res.ast}</h3></div>
            <div class="stat-box"><p>REB</p><h3>${res.reb}</h3></div>
            <div class="stat-box"><p>STL</p><h3>${res.stl}</h3></div>
            <div class="stat-box"><p>BLK</p><h3>${res.blk}</h3></div>
        </div>

        ${renderizarResultadoObjetivoHTML(res.resultadoObjetivo)}
        ${renderizarLogrosHTML(res.logros)}
        ${renderizarDetallesTemporadaHTML(res)}

        ${seccionAcciones}
        <button class="btn-secundario" onclick="mostrarColeccionCartas()">Ver mi Colección de Cartas 🎴</button>
        ${tieneCarreraCompartida() ? `<button onclick="mostrarRecordsPartida()">Ver Récords de la Partida 🔥</button>` : ""}
    `;

    reproducirFeedbackDeTemporada(res); // 🆕
    sincronizarCarreraCompartida();
}

function avanzarProximaTemporada() {
    if (gameState.player.isRetired) return; // 🆕 FIX: no simular más temporadas post-retiro
    irAEntrenamientoAñoDos();
}

// ==========================================
// 🆕 MEJORA: LOGROS ACUMULADOS DE TODA LA CARRERA
// ==========================================
// Antes cada logro se mostraba una sola vez, en la temporada en la que
// pasó, y se perdía de vista en cuanto avanzabas de año. Ahora, al retirarte,
// se junta TODO lo que ganaste en tu carrera en una sola "vitrina de trofeos".
function analizarLogrosDeCarrera() {
    const conteo = {};
    gameState.statsHistory.forEach(año => {
        (año.logros || []).forEach(logro => {
            conteo[logro.nombre] = (conteo[logro.nombre] || 0) + 1;
        });
    });
    return conteo;
}

function renderizarVitrinaDeTrofeosHTML(conteo) {
    const nombres = Object.keys(conteo);
    if (nombres.length === 0) {
        return `<p class="career-no-trophies">No sumaste premios individuales ni colectivos en tu carrera — una carrera de laburante silencioso, sin vitrina.</p>`;
    }
    const items = nombres.map(nombre => {
        const veces = conteo[nombre];
        return `<li>${nombre}${veces > 1 ? ` <strong>x${veces}</strong>` : ""}</li>`;
    }).join("");
    return `<ul class="career-trophy-list">${items}</ul>`;
}

// ==========================================
// 🆕 MEJORA: CLASIFICACIÓN AL SALÓN DE LA FAMA
// ==========================================
// Combina trofeos (con distinto peso según jerarquía: un anillo pesa más que
// clasificar a playoffs), longevidad y nivel de juego sostenido en un
// "puntaje de legado". Una carrera cortada de raíz por bajo nivel (corte o
// retiro prematuro) con pocos años jugados nunca puede colarse como leyenda,
// por más que el azar le haya regalado un par de logros sueltos.
const PESO_LOGRO_LEGADO = {
    "Campeón de la NBA 🏆": 8,
    "Finals MVP 🏅": 6,
    "MVP de la Temporada 👑": 10,
    "Finalista de la NBA 🏀": 3,
    "Finalista de Conferencia": 1.5,
    "Clasificación a Playoffs 🎟️": 0.5,
    "All-NBA Team ⭐": 3,
    "Mejor Defensor del Año (DPOY) 🛡️": 4,
    "Equipo Defensivo Ideal 🛡️⭐": 2,
    "Rookie del Año (ROY) 🏅": 2,
    "All-Rookie Team": 1,
    "Sexto Hombre del Año 🎖️": 2,
    "Most Improved Player 📈": 2
};

function calcularPuntajeLegado(conteo) {
    let puntaje = 0;
    Object.keys(conteo).forEach(nombre => {
        puntaje += (PESO_LOGRO_LEGADO[nombre] || 0) * conteo[nombre];
    });

    const años = gameState.statsHistory.length;
    const sumaRendimiento = gameState.statsHistory.reduce((acc, h) => acc + h.pts + h.ast + h.reb, 0);
    const promedioRendimiento = años > 0 ? sumaRendimiento / años : 0;

    puntaje += Math.min(años, 20) * 0.6;      // longevidad, con techo en 20 años
    puntaje += promedioRendimiento * 0.35;    // nivel de juego sostenido

    return puntaje;
}

function clasificarHOF(puntaje, fueCorteForzado) {
    const años = gameState.statsHistory.length;

    if (fueCorteForzado && años <= 2) {
        return {
            tier: "Bust de Draft 📉",
            detalle: "Tu carrera terminó casi antes de arrancar. La liga es así de despiadada a veces."
        };
    }
    if (puntaje >= 55) {
        return {
            tier: "Leyenda Inmortal 🐐",
            detalle: "Anillos, premios individuales y una carrera larguísima al más alto nivel. Tu nombre queda tallado en la historia de la liga."
        };
    }
    if (puntaje >= 35) {
        return {
            tier: "Hall of Fame 🏛️",
            detalle: "Una carrera de elite con hardware de sobra. Primera ronda de votación al Salón de la Fama, sin discusión."
        };
    }
    if (puntaje >= 20) {
        return {
            tier: "Gran Carrera (Casi HOF) ⭐",
            detalle: "Nivel de All-Star sostenido en el tiempo. Se discute si entra al Salón, pero fue una carrera para el orgullo."
        };
    }
    if (puntaje >= 10) {
        return {
            tier: "Jugador Sólido de Rotación 🔧",
            detalle: "Nunca fue la estrella, pero cualquier equipo de la liga lo quería en su plantel. Una carrera confiable."
        };
    }
    if (puntaje >= 4) {
        return {
            tier: "Jugador de Rol / Banco 🪑",
            detalle: "Minutos limitados y planilla modesta, pero se ganó su lugar en la liga durante años."
        };
    }
    return {
        tier: "Carrera Discreta 🤷",
        detalle: "Pasaste por la NBA sin pena ni gloria, pero podés decir que jugaste en la mejor liga del mundo."
    };
}

// ==========================================
// INTERFAZ: PANTALLA DE RETIRO DEFINITIVO
// ==========================================
function ejecutarPantallaRetiro(motivoMensaje, fueCorteForzado = false) {
    if (fueCorteForzado) sonidoBuzzer(); // 🆕
    // 🆕 FIX: antes esta función solo ocultaba season-screen y office-screen.
    // Si el retiro se disparaba desde la pantalla de entrenamiento (draft-screen
    // reutilizado para repartir puntos entre temporadas), esa pantalla seguía
    // visible con sus botones activos: se podía seguir subiendo atributos y
    // confirmando, simulando temporadas de un jugador retirado. Ahora se
    // ocultan TODAS las demás pantallas y se marca isRetired para bloquear
    // cualquier función de simulación por si quedara algún camino de acceso.
    gameState.player.isRetired = true;

    ["creation-screen", "draft-screen", "season-screen", "office-screen", "evento-screen"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add("hidden");
            el.style.display = "none";
        }
    });

    let retireScreen = document.getElementById("retire-screen");
    if (!retireScreen) {
        retireScreen = document.createElement("section");
        retireScreen.id = "retire-screen";
        document.getElementById("game-container").appendChild(retireScreen);
    }
    retireScreen.classList.remove("hidden");

    let totalPartidos = gameState.statsHistory.length * 82;
    let sumaPts = 0, sumaAst = 0, sumaReb = 0, sumaStl = 0, sumaBlk = 0;
    gameState.statsHistory.forEach(h => {
        sumaPts += h.pts; sumaAst += h.ast; sumaReb += h.reb;
        sumaStl += (h.stl || 0); sumaBlk += (h.blk || 0);
    });
    let promedioVidaPts = (sumaPts / gameState.statsHistory.length).toFixed(1);
    let promedioVidaAst = (sumaAst / gameState.statsHistory.length).toFixed(1);
    let promedioVidaReb = (sumaReb / gameState.statsHistory.length).toFixed(1);
    let promedioVidaStl = (sumaStl / gameState.statsHistory.length).toFixed(1);
    let promedioVidaBlk = (sumaBlk / gameState.statsHistory.length).toFixed(1);

    const conteoLogros = analizarLogrosDeCarrera();
    const puntajeLegado = calcularPuntajeLegado(conteoLogros);
    const clasificacion = clasificarHOF(puntajeLegado, fueCorteForzado);
    guardarCarreraEnHistorial({
        firstName: gameState.player.firstName,
        lastName: gameState.player.lastName,
        position: gameState.player.position,
        puntajeLegado,
        tier: clasificacion.tier,
        seasons: gameState.statsHistory.length
    });

    retireScreen.innerHTML = `
        ${renderizarTarjetaJugador()}
        <h2>🏁 Salón de la Fama - Retiro Oficial</h2>
        <div class="status-box alert-dark">
            <h3>${gameState.player.firstName} ${gameState.player.lastName}</h3>
            <p><strong>${motivoMensaje}</strong></p>
        </div>

        <h3>Resumen de Carrera:</h3>
        <ul>
            <li><strong>Temporadas disputadas:</strong> ${gameState.statsHistory.length} años en la elite.</li>
            <li><strong>Partidos estimados:</strong> ${totalPartidos} encuentros oficiales.</li>
            <li><strong>Promedios históricos:</strong> ${promedioVidaPts} PTS / ${promedioVidaAst} AST / ${promedioVidaReb} REB / ${promedioVidaStl} STL / ${promedioVidaBlk} BLK por partido.</li>
        </ul>

        <h3>Vitrina de Trofeos:</h3>
        ${renderizarVitrinaDeTrofeosHTML(conteoLogros)}

        <div class="status-box hof-box">
            <p class="hof-label">Veredicto del Salón de la Fama</p>
            <h3 class="hof-tier">${clasificacion.tier}</h3>
            <p>${clasificacion.detalle}</p>
        </div>

        <p>Tu historia en este simulador quedó sellada.</p>
        <button class="btn-secundario" onclick="mostrarColeccionCartas()">Ver mi Colección de Cartas 🎴</button>
        <button onclick="mostrarLeaderboard()">Ver Leaderboard Global 🌎</button>
        <button onclick="location.reload()">Crear un nuevo Personaje 🔄</button>
    `;

    // 🆕 Carrera compartida: espera a que el otro también se retire para
    // mostrar la comparativa final de ambas carreras.
    if (tieneCarreraCompartida()) {
        const resumenPropio = construirResumenRetiro(clasificacion, puntajeLegado, conteoLogros);
        guardarRetiroCompartido(resumenPropio);
        obtenerRetiroRivalCompartido().then(resumenRival => {
            if (resumenRival) {
                mostrarComparativaFinalCarreras(resumenPropio, resumenRival);
            } else {
                mostrarPantallaEsperandoRetiroRival(resumenPropio);
            }
        });
    }
}

async function mostrarLeaderboard() {
    let lbScreen = document.getElementById("leaderboard-screen");
    if (!lbScreen) {
        lbScreen = document.createElement("section");
        lbScreen.id = "leaderboard-screen";
        document.getElementById("game-container").appendChild(lbScreen);
    }
    lbScreen.classList.remove("hidden");
    lbScreen.innerHTML = `<h2>🌎 Leaderboard Global</h2><p>Cargando...</p>`;

    const top = await obtenerLeaderboardGlobal(20);

    if (top.length === 0) {
        lbScreen.innerHTML = `<h2>🌎 Leaderboard Global</h2><p>Todavía no hay carreras guardadas. ¡Sé el primero!</p>`;
        return;
    }

    const filas = top.map((c, i) =>
        `<li><strong>#${i + 1} ${c.firstName} ${c.lastName}</strong> (${c.position}) — ${c.tier} · ${Math.round(c.puntajeLegado)} pts</li>`
    ).join("");

    lbScreen.innerHTML = `
        <h2>🌎 Leaderboard Global</h2>
        <ul class="career-trophy-list">${filas}</ul>
    `;
}

// ==========================================
// 🆕 FIX: BLOQUEO DE ZOOM POR DOBLE-TAP (mobile/iOS) — versión segura
// ==========================================
// En vez de interceptar touchstart y re-disparar el click a mano (que podía
// bloquear toques reales, como confirmar justo después de tocar un
// atributo), bloqueamos directamente los eventos que iOS usa para generar
// el zoom (gesturestart, y el doble-click sintético), sin tocar el flujo
// normal de ningún botón.
document.addEventListener("gesturestart", (e) => e.preventDefault());

let ultimoToqueGlobal = 0;
document.addEventListener("touchend", (e) => {
    const ahora = Date.now();
    if (ahora - ultimoToqueGlobal <= 180) {
        e.preventDefault();
    }
    ultimoToqueGlobal = ahora;
}, { passive: false });

function todosLosAtributosAlTope() {
    return Object.keys(gameState.attributes).every(attr =>
        gameState.attributes[attr] >= obtenerTopeAtributo(gameState.player.position, attr)
    );
}

function actualizarEstadoBotonConfirmar() {
    const btnConfirmar = document.getElementById("btn-confirmar-atributos");
    if (!btnConfirmar) return;
    const puntosListos = gameState.player.availablePoints === 0 || todosLosAtributosAlTope();
    const enfoqueListo = gameState.player.enfoqueTemporada !== null;
    btnConfirmar.disabled = !(puntosListos && enfoqueListo);
}

// ==========================================
// 🆕 NUEVO: CARRERA COMPARTIDA (dos dispositivos, mismo código de partida)
// ==========================================
// Cada jugador guarda un resumen de su progreso en Firestore bajo un
// documento identificado por el código de partida que ambos ingresaron. No
// es sincronización en vivo estricta (no hay turnos ni bloqueo), cada uno
// juega a su ritmo — pero cada vez que termina una temporada, se actualiza
// su "foto" más reciente, y el otro la puede ver en su propia pantalla de
// resultados.

function tieneCarreraCompartida() {
    return !!(gameState.player.codigoPartida && gameState.player.slotPropio);
}

function construirResumenDeProgreso() {
    const player = gameState.player;
    const ultimo = gameState.statsHistory[gameState.statsHistory.length - 1];
    return {
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        team: player.currentTeam,
        year: player.experience,
        age: player.age,
        pts: ultimo ? ultimo.pts : 0,
        ast: ultimo ? ultimo.ast : 0,
        reb: ultimo ? ultimo.reb : 0,
        rendimientoPer36: ultimo ? ultimo.rendimientoPer36 : 0,
        isRetired: player.isRetired,
        updatedAt: Date.now()
    };
}

async function guardarProgresoCompartido() {
    if (!tieneCarreraCompartida()) return;
    try {
        const { db, doc, setDoc } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        const resumen = construirResumenDeProgreso();
        await setDoc(refPartida, { [gameState.player.slotPropio]: resumen }, { merge: true });
    } catch (e) {
        console.warn("No se pudo guardar el progreso compartido:", e);
    }
}

async function obtenerProgresoDelRivalCompartido() {
    if (!tieneCarreraCompartida()) return null;
    try {
        const { db, doc, getDoc } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        const snap = await getDoc(refPartida);
        if (!snap.exists()) return null;

        const data = snap.data();
        const slotRival = gameState.player.slotPropio === "slotA" ? "slotB" : "slotA";
        return data[slotRival] || null;
    } catch (e) {
        console.warn("No se pudo consultar el progreso del rival compartido:", e);
        return null;
    }
}

// 🆕 Guarda un traspaso generado localmente en el documento compartido, para
// que el otro jugador también lo vea reflejado en su copia del roster.
async function guardarTraspasoCompartido(traspaso) {
    if (!tieneCarreraCompartida() || !traspaso) return;
    try {
        const { db, doc, setDoc, arrayUnion } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        await setDoc(refPartida, { traspasosLog: arrayUnion(traspaso) }, { merge: true });
    } catch (e) {
        console.warn("No se pudo guardar el traspaso compartido:", e);
    }
}

// 🆕 Trae el log completo de traspasos de la partida y aplica los que
// todavía no procesamos localmente (rastreados por id en gameState).
async function sincronizarTraspasosCompartidos() {
    if (!tieneCarreraCompartida()) return;
    try {
        const { db, doc, getDoc } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        const snap = await getDoc(refPartida);
        if (!snap.exists()) return;

        const log = snap.data().traspasosLog || [];
        if (!gameState.traspasosAplicadosIds) gameState.traspasosAplicadosIds = new Set();

        log.forEach(traspaso => {
            if (gameState.traspasosAplicadosIds.has(traspaso.id)) return; // ya aplicado
            if (typeof aplicarTraspasoRemoto === "function") {
                aplicarTraspasoRemoto(traspaso);
            }
            gameState.traspasosAplicadosIds.add(traspaso.id);
        });
    } catch (e) {
        console.warn("No se pudo sincronizar el log de traspasos:", e);
    }
}

function renderizarProgresoRivalCompartidoHTML(datosRival) {
    if (!datosRival) {
        return `
            <div class="status-box alert-equipo" id="rival-compartido-box">
                <p>🆚 Todavía no hay datos de tu compañero de partida en este código, o él/ella aún no jugó su primera temporada.</p>
            </div>
        `;
    }
    if (datosRival.isRetired) {
        return `
            <div class="status-box alert-equipo" id="rival-compartido-box">
                <p>🆚 <strong>${datosRival.firstName} ${datosRival.lastName}</strong> ya se retiró de su carrera.</p>
            </div>
        `;
    }
    return `
        <div class="status-box alert-equipo" id="rival-compartido-box">
            <p>🆚 <strong>${datosRival.firstName} ${datosRival.lastName}</strong> (${datosRival.position}) va en el <strong>Año ${datosRival.year}</strong>, ${datosRival.age} años, jugando en los ${datosRival.team}. Última temporada: ${datosRival.pts} PTS / ${datosRival.ast} AST / ${datosRival.reb} REB.</p>
        </div>
    `;
}

// Guarda el progreso propio y, en paralelo, busca e inyecta el del rival en
// el contenedor con id="rival-compartido-box" si existe en la pantalla.
let intervaloProgresoRival = null;

async function sincronizarCarreraCompartida() {
    if (!tieneCarreraCompartida()) return;

    guardarProgresoCompartido(); // no bloqueante, no hace falta esperar
    gameState.player.progresoRivalCacheado = await obtenerProgresoDelRivalCompartido(); // 🆕 cachea para pelea por minutos
    await sincronizarTraspasosCompartidos(); // 🆕 trae los traspasos del rival antes de refrescar la UI

    const actualizar = async () => {
        const contenedor = document.getElementById("rival-compartido-box");
        if (!contenedor) {
            // Ya no estamos en una pantalla con ese cartel, dejamos de preguntar
            if (intervaloProgresoRival) {
                clearInterval(intervaloProgresoRival);
                intervaloProgresoRival = null;
            }
            return;
        }
        const datosRival = await obtenerProgresoDelRivalCompartido();
        contenedor.outerHTML = renderizarProgresoRivalCompartidoHTML(datosRival);
    };

    await actualizar();

    if (intervaloProgresoRival) clearInterval(intervaloProgresoRival);
    intervaloProgresoRival = setInterval(actualizar, 6000);
}

// 🆕 NUEVO: RÉCORDS DE LA PARTIDA COMPARTIDA
// Compara TODAS las temporadas de los dos jugadores (guardadas en
// ceremonia_year{N}_{slot}) y encuentra quién hizo más de cada stat
// en una sola temporada, dentro de esta partida.
async function obtenerRecordsDeLaPartida() {
    if (!tieneCarreraCompartida()) return null;
    try {
        const { db, doc, getDoc } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        const snap = await getDoc(refPartida);
        if (!snap.exists()) return null;

        const data = snap.data();
        const stats = ["pts", "ast", "reb", "stl", "blk"];
        const records = {};

        stats.forEach(stat => { records[stat] = { valor: -1, nombre: null, year: null }; });

        Object.keys(data).forEach(campo => {
            if (!campo.startsWith("ceremonia_year")) return;
            const resultado = data[campo];
            const esPropio = campo.endsWith(`_${gameState.player.slotPropio}`);
            const nombreJugador = esPropio
                ? `${gameState.player.firstName} ${gameState.player.lastName}`
                : (resultado.nombreJugador || "Rival");

            stats.forEach(stat => {
                if (resultado[stat] > records[stat].valor) {
                    records[stat] = { valor: resultado[stat], nombre: nombreJugador, year: resultado.year };
                }
            });
        });

        return records;
    } catch (e) {
        console.warn("No se pudo consultar los récords de la partida:", e);
        return null;
    }
}

function renderizarRecordsPartidaHTML(records) {
    if (!records) {
        return `<p class="career-no-trophies">Todavía no hay suficientes datos para calcular récords de la partida.</p>`;
    }
    const etiquetas = { pts: "PTS", ast: "AST", reb: "REB", stl: "STL", blk: "BLK" };
    const filas = Object.keys(records).map(stat => {
        const r = records[stat];
        if (!r.nombre) return "";
        return `<li>${etiquetas[stat]}: <strong>${r.valor}</strong> — ${r.nombre} (Año ${r.year})</li>`;
    }).join("");
    return `<ul class="career-trophy-list">${filas}</ul>`;
}

async function mostrarRecordsPartida() {
    let recordsScreen = document.getElementById("records-partida-screen");
    if (!recordsScreen) {
        recordsScreen = document.createElement("section");
        recordsScreen.id = "records-partida-screen";
        document.getElementById("game-container").appendChild(recordsScreen);
    }
    recordsScreen.classList.remove("hidden");
    recordsScreen.innerHTML = `<h2>🔥 Récords de la Partida</h2><p>Cargando...</p>`;

    const records = await obtenerRecordsDeLaPartida();
    recordsScreen.innerHTML = `
        <h2>🔥 Récords de la Partida</h2>
        <p>Comparación entre vos y tu compañero de partida, en todas las temporadas jugadas hasta ahora.</p>
        ${renderizarRecordsPartidaHTML(records)}
        <button onclick="document.getElementById('records-partida-screen').classList.add('hidden')">Cerrar</button>
    `;
}

// ==========================================
// 🆕 NUEVO: CEREMONIA ANUAL COMPARTIDA
// ==========================================
// Cuando hay carrera compartida, en vez de mostrar los resultados de la
// temporada apenas termina, cada jugador guarda su resultadoAño en Firestore
// bajo una clave por año (ceremonia_year_N) y espera a que el otro también
// termine ESE MISMO año. Recién ahí se resuelven los premios individuales
// (que no pueden repetirse) y se muestran los resultados de ambos juntos.

async function guardarResultadoParaCeremonia(resultadoAño) {
    if (!tieneCarreraCompartida()) return;
    try {
        const { db, doc, setDoc } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        const campo = `ceremonia_year${resultadoAño.year}_${gameState.player.slotPropio}`;
        await setDoc(refPartida, {
            [campo]: {
                ...resultadoAño,
                nombreJugador: `${gameState.player.firstName} ${gameState.player.lastName}`
            }
        }, { merge: true });
    } catch (e) {
        console.warn("No se pudo guardar el resultado para la ceremonia:", e);
    }
}

async function obtenerResultadoRivalCeremonia(year) {
    if (!tieneCarreraCompartida()) return null;
    try {
        const { db, doc, getDoc } = window.firestoreDB;
        const refPartida = doc(db, "partidas_en_vivo", gameState.player.codigoPartida);
        const snap = await getDoc(refPartida);
        if (!snap.exists()) return null;
        const slotRival = gameState.player.slotPropio === "slotA" ? "slotB" : "slotA";
        const campo = `ceremonia_year${year}_${slotRival}`;
        return snap.data()[campo] || null;
    } catch (e) {
        console.warn("No se pudo consultar el resultado del rival para la ceremonia:", e);
        return null;
    }
}

// Compara candidaturas propias contra las del rival y resuelve quién gana
// cada premio individual (el de mayor rendimiento se lo lleva).
function resolverPremiosCompartidos(resultadoPropio, resultadoRival) {
    const logrosFinales = resultadoPropio.logros.filter(l =>
        !["MVP de la Temporada 👑", "All-NBA Team ⭐", "Sexto Hombre del Año 🎖️",
          "Most Improved Player 📈", "Rookie del Año (ROY) 🏅", "All-Rookie Team",
          "Mejor Defensor del Año (DPOY) 🛡️", "Equipo Defensivo Ideal 🛡️⭐"].includes(l.nombre)
    );

    const cand = resultadoPropio.candidaturas || {};
    const candRival = resultadoRival ? (resultadoRival.candidaturas || {}) : {};
    const miRend = resultadoPropio.rendimientoIndividual || 0;
    const rendRival = resultadoRival ? (resultadoRival.rendimientoIndividual || 0) : -1;
    const miRendDef = resultadoPropio.rendimientoDefensivo || 0;
    const rendDefRival = resultadoRival ? (resultadoRival.rendimientoDefensivo || 0) : -1;

    const ganoYo = (miCandidato, rivalCandidato, miValor, rivalValor) => {
        if (miCandidato && (!rivalCandidato || miValor >= rivalValor)) return true;
        return false;
    };

    if (ganoYo(cand.mvp, candRival.mvp, miRend, rendRival)) {
        logrosFinales.push({ nombre: "MVP de la Temporada 👑", puntos: 3 });
    } else if (ganoYo(cand.allNba, candRival.allNba, miRend, rendRival)) {
        logrosFinales.push({ nombre: "All-NBA Team ⭐", puntos: 2 });
    }

    if (ganoYo(cand.sextoHombre, candRival.sextoHombre, miRend, rendRival)) {
        logrosFinales.push({ nombre: "Sexto Hombre del Año 🎖️", puntos: 2 });
    }
    if (ganoYo(cand.mip, candRival.mip, miRend, rendRival)) {
        logrosFinales.push({ nombre: "Most Improved Player 📈", puntos: 2 });
    }
    if (ganoYo(cand.roy, candRival.roy, miRend, rendRival)) {
        logrosFinales.push({ nombre: "Rookie del Año (ROY) 🏅", puntos: 2 });
    } else if (ganoYo(cand.allRookie, candRival.allRookie, miRend, rendRival)) {
        logrosFinales.push({ nombre: "All-Rookie Team", puntos: 1 });
    }
    if (ganoYo(cand.dpoy, candRival.dpoy, miRendDef, rendDefRival)) {
        logrosFinales.push({ nombre: "Mejor Defensor del Año (DPOY) 🛡️", puntos: 3 });
    }
    if (ganoYo(cand.allDefensive, candRival.allDefensive, miRendDef, rendDefRival)) {
        logrosFinales.push({ nombre: "Equipo Defensivo Ideal 🛡️⭐", puntos: 2 });
    }

    const datosRivalParaCampeon = resultadoRival ? {
        esCampeonEstaTemporada: resultadoRival.logros.some(l => l.nombre === "Campeón de la NBA 🏆"),
        rendimientoIndividual: rendRival
    } : null;
    const logrosConCampeonResuelto = resolverCampeonUnico(logrosFinales, miRend, datosRivalParaCampeon);

    const bonusFinal = logrosConCampeonResuelto.reduce((acc, l) => acc + l.puntos, 0);
    return { logros: logrosConCampeonResuelto, bonus: bonusFinal };
}

let intervaloEsperaCeremonia = null;

function mostrarPantallaEsperandoRival(resultadoAño, continuarConMostrarFn) {
    ["creation-screen", "draft-screen", "season-screen", "office-screen", "evento-screen"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });

    let esperaScreen = document.getElementById("espera-screen");
    if (!esperaScreen) {
        esperaScreen = document.createElement("section");
        esperaScreen.id = "espera-screen";
        document.getElementById("game-container").appendChild(esperaScreen);
    }
    esperaScreen.classList.remove("hidden");
    esperaScreen.innerHTML = `
        ${renderizarTarjetaJugador()}
        <h2>🏆 Ceremonia de Premios — Año ${resultadoAño.year}</h2>
        <div class="status-box alert-equipo">
            <p>⏳ Ya terminaste tu temporada. Esperando a que tu compañero de partida termine la suya para entregar los premios juntos...</p>
        </div>
    `;

    if (intervaloEsperaCeremonia) clearInterval(intervaloEsperaCeremonia);

    intervaloEsperaCeremonia = setInterval(async () => {
        const resultadoRival = await obtenerResultadoRivalCeremonia(resultadoAño.year);

        if (!resultadoRival) {
            // 🆕 si el rival ya se retiró, nunca va a jugar este año: no lo esperamos más.
            const progresoRival = await obtenerProgresoDelRivalCompartido();
            if (progresoRival && progresoRival.isRetired) {
                clearInterval(intervaloEsperaCeremonia);
                intervaloEsperaCeremonia = null;

                const { logros, bonus } = resolverPremiosCompartidos(resultadoAño, null);
                resultadoAño.logros = logros;

                continuarConMostrarFn(resultadoAño, bonus);
                return;
            }
            return; // sigue esperando
        }

        clearInterval(intervaloEsperaCeremonia);
        intervaloEsperaCeremonia = null;

        const { logros, bonus } = resolverPremiosCompartidos(resultadoAño, resultadoRival);
        resultadoAño.logros = logros;

        mostrarPantallaCeremoniaConjunta(resultadoAño, resultadoRival);
        continuarConMostrarFn(resultadoAño, bonus);
    }, 4000);
}

function mostrarPantallaCeremoniaConjunta(resultadoPropio, resultadoRival) {
    let esperaScreen = document.getElementById("espera-screen");
    if (!esperaScreen) return;

    const items = resultadoPropio.logros.map(l => `<li>${l.nombre} <strong>(+${l.puntos})</strong></li>`).join("");
    const logrosRival = resolverPremiosCompartidos(resultadoRival, resultadoPropio).logros;

    esperaScreen.innerHTML = `
        <h2>🏆 Ceremonia de Premios — Año ${resultadoPropio.year}</h2>
        <div class="status-box alert-equipo">
            <p><strong>Vos:</strong> ${resultadoPropio.pts} PTS / ${resultadoPropio.ast} AST / ${resultadoPropio.reb} REB / ${resultadoPropio.stl} STL / ${resultadoPropio.blk} BLK — ${resultadoPropio.team}</p>
            <p><strong>${resultadoRival.nombreJugador}:</strong> ${resultadoRival.pts} PTS / ${resultadoRival.ast} AST / ${resultadoRival.reb} REB / ${resultadoRival.stl} STL / ${resultadoRival.blk} BLK — ${resultadoRival.team}</p>
        </div>
        <h3>🏅 Tus logros</h3>
        ${renderizarLogrosHTML(resultadoPropio.logros)}
        <h3>🏅 Logros de ${resultadoRival.nombreJugador}</h3>
        ${renderizarLogrosHTML(logrosRival)}
        <p style="text-align:center; opacity:0.7;">Continuando en unos segundos...</p>        
    `;
}