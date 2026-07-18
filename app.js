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
        rivalRecord: { wins: 0, losses: 0 } // 🆕 historial de duelos narrativos contra el rival
    },
    // Los 10 atributos obligatorios arrancan en el mínimo (1)
    attributes: {
        tiroExt: 1,
        tiroInt: 1,
        bandejas: 1,
        dribbling: 1,
        pases: 1,
        vision: 1,
        defExt: 1,
        defInt: 1,
        fisico: 1,
        fuerza: 1
    },
    statsHistory: []
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
    if (experience <= 3) return 3;   // Años 1-3: desarrollo acelerado de novato
    if (experience <= 6) return 2;   // Años 4-6: todavía mejorando con fuerza
    if (experience <= 10) return 1;  // Años 7-10: ajustes finos de veterano
    return 0;                        // Año 11+: el techo natural ya se tocó
}

// ==========================================
// FUNCIÓN PRINCIPAL: SIMULAR EL DRAFT ALEATORIO
// ==========================================
function simularDraft() {
    asignarRivalDeFranquicia(); // 🆕 arranca tu primera rivalidad de carrera
    cachearRivalHistorico(); // consulta el fantasma histórico en paralelo, sin frenar el juego
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

    const pickAleatorio = Math.floor(Math.random() * 60) + 1;
    const equipoAleatorio = nbaTeams[Math.floor(Math.random() * nbaTeams.length)];

    gameState.player.currentTeam = equipoAleatorio;
    gameState.player.contractYearsLeft = 2;
    asignarRivalDeFranquicia(); // 🆕 arranca tu primera rivalidad de carrera

    // 🆕 MEJORA: subimos un poco el piso de puntos iniciales en todos los rangos
    // de pick. Antes un pick tardío (31-60) arrancaba con solo 20 puntos para
    // repartir en 10 atributos con piso 1 — quedaba condenado casi de entrada.
    // Ahora todos los rangos tienen más margen para armar un jugador viable.
    let puntosOtorgados = 0;
    let minutosIniciales = 0;

    if (pickAleatorio >= 1 && pickAleatorio <= 5) {
        puntosOtorgados = 65; // antes 50
        minutosIniciales = Math.floor(Math.random() * 4) + 32;
    } else if (pickAleatorio >= 6 && pickAleatorio <= 15) {
        puntosOtorgados = 55; // antes 40
        minutosIniciales = Math.floor(Math.random() * 5) + 24;
    } else if (pickAleatorio >= 16 && pickAleatorio <= 30) {
        puntosOtorgados = 42; // antes 30
        minutosIniciales = Math.floor(Math.random() * 7) + 16;
    } else {
        puntosOtorgados = 30; // antes 20
        minutosIniciales = Math.floor(Math.random() * 5) + 8;
    }

    gameState.player.availablePoints = puntosOtorgados;
    gameState.player.minutesPerGame = minutosIniciales;

    mostrarPantallaAsignacion(pickAleatorio, equipoAleatorio, puntosOtorgados, minutosIniciales);
}

// ==========================================
// 🆕 MEJORA: MENSAJE CLARO DE "TENÉS QUE REPARTIR TODO"
// ==========================================
// El botón de confirmar ya estaba deshabilitado hasta gastar los puntos,
// pero no quedaba claro POR QUÉ. Este mensaje deja explícita la regla: no se
// puede avanzar de temporada con puntos sin repartir.
function generarMensajePuntosHint(puntos) {
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

    draftScreen.innerHTML = `
        <h2>¡Noche del Draft NBA! 🏀</h2>
        <div class="draft-card">
            <p>Con el <strong>Pick #${pick}</strong> del Draft, los <strong>${equipo}</strong> seleccionan a:</p>
            <h3>${gameState.player.firstName} ${gameState.player.lastName} (${gameState.player.position})</h3>
        </div>

        <div class="status-box">
            <p><strong>Contrato firmado:</strong> 2 Años obligatorios (Escala de Rookie).</p>
            <p><strong>Tiempo en cancha inicial:</strong> Jugarás aprox. <strong>${minutos} minutos</strong> por partido debido a tu posición de Draft.</p>
            <p>Bolsa de puntos iniciales otorgados: <strong>${puntos} puntos libres</strong>.</p>
        </div>

        <hr>
        <h3>Repartí tus puntos de Atributos (Máximo 15 por barra):</h3>
        <p>Puntos restantes: <span id="puntos-contador">${puntos}</span></p>
        ${generarMensajePuntosHint(puntos)}

        <div id="contenedor-atributos">
            <!-- Los controlamos en el siguiente paso -->
        </div>

        ${renderizarSelectorEnfoque()}

        <button id="btn-confirmar-atributos" disabled>Confirmar Atributos y Simular Año 1 🚀</button>
    `;
    renderizarControlesAtributos();

    const btnConfirmar = document.getElementById("btn-confirmar-atributos");
    btnConfirmar.onclick = iniciarTemporadaUno;
}

// ==========================================
// INTERFAZ: GENERAR SELECTORES DE ATRIBUTOS
// ==========================================
function renderizarControlesAtributos() {
    const contenedor = document.getElementById("contenedor-atributos");
    contenedor.innerHTML = "";

    const nombresAmigables = {
        tiroExt: "Tiro Exterior", tiroInt: "Tiro Interior", bandejas: "Bandejas/Volcadas",
        dribbling: "Dribbling", pases: "Pases", vision: "Visión de Juego",
        defExt: "Defensa Exterior", defInt: "Defensa Interior", fisico: "Físico/Velocidad", fuerza: "Fuerza"
    };

    Object.keys(gameState.attributes).forEach(attr => {
        const fila = document.createElement("div");
        fila.className = "attr-row";
        fila.innerHTML = `
            <span class="attr-name">${nombresAmigables[attr]}:</span>
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

    if (cambio === 1 && (valorActual >= 15 || puntosDisponibles <= 0)) return;
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
    "Base":       { tiroExt: 0.10, tiroInt: 0.05, bandejas: 0.05, dribbling: 0.15, pases: 0.20, vision: 0.18, defExt: 0.12, defInt: 0.03, fisico: 0.07, fuerza: 0.05 },
    "Escolta":    { tiroExt: 0.20, tiroInt: 0.10, bandejas: 0.08, dribbling: 0.14, pases: 0.08, vision: 0.08, defExt: 0.14, defInt: 0.03, fisico: 0.10, fuerza: 0.05 },
    "Alero":      { tiroExt: 0.14, tiroInt: 0.10, bandejas: 0.10, dribbling: 0.10, pases: 0.08, vision: 0.08, defExt: 0.12, defInt: 0.08, fisico: 0.12, fuerza: 0.08 },
    "Ala-Pívot":  { tiroExt: 0.06, tiroInt: 0.14, bandejas: 0.12, dribbling: 0.04, pases: 0.05, vision: 0.05, defExt: 0.06, defInt: 0.16, fisico: 0.12, fuerza: 0.20 },
    "Pívot":      { tiroExt: 0.03, tiroInt: 0.15, bandejas: 0.15, dribbling: 0.02, pases: 0.03, vision: 0.03, defExt: 0.04, defInt: 0.20, fisico: 0.13, fuerza: 0.22 }
};

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

    const fraccion = (grl - 1) / 14; // 0 (piso) a 1 (techo absoluto)
    let base = 6 + fraccion * 32; // escala continua: 6 a 38 minutos según nivel

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

    if (player.minutesPerGame <= 18 && grl >= 8 && Math.random() < probBreakoutBase) {
        base += 10 + Math.random() * 8;
        huboBreakout = true;
    } else if (player.minutesPerGame >= 24 && Math.random() < probRegresionBase) {
        base -= 8 + Math.random() * 8;
        huboRegresion = true;
    }

    const minutos = Math.round(Math.max(4, Math.min(40, base)));
    return { minutos, huboBreakout, huboRegresion };
}

function renderizarMensajeMinutosHTML(huboBreakout, huboRegresion, minutosNuevos) {
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
        const fraccion = promedioPonderado / 15; // 0 (imposible) a 1 (todo al máximo)
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

    return `
        <div class="player-card">
            <div>
                <p class="player-card-name">${player.firstName} ${player.lastName}</p>
                <p class="player-card-meta">${player.position || "Sin posición"} · ${player.currentTeam}</p>
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
    if (nivelPrincipal <= 10) return 1.0; // recién penaliza si sos realmente bueno en lo principal
    const apoyoFaltante = Math.max(0, 8 - nivelApoyo); // por debajo de 8/15 empieza a doler
    if (apoyoFaltante <= 0) return 1.0;
    const carencia = apoyoFaltante / 8; // 0 (apoyo=8) a 1 (apoyo=0)
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

function calcularEstadisticasDelAño() {
    const attrs = gameState.attributes;
    const player = gameState.player;
    const bonoPos = obtenerBonoPosicion(player.position);

    // 🆕 MEJORA: ruido independiente por categoría (ahora las 5 stats, no solo
    // 3), con chance propia de anomalía en cada una — ver generarRuidoStat().
    const ruidoPts = generarRuidoStat();
    const ruidoAst = generarRuidoStat();
    const ruidoReb = generarRuidoStat();
    const ruidoStl = generarRuidoStat();
    const ruidoBlk = generarRuidoStat();

    const multiplicadorMinutos = player.minutesPerGame / 36;

    const TECHO_PTS = 34;
    const TECHO_AST = 12;
    const TECHO_REB = 13;
    const TECHO_STL = 2.8;
    const TECHO_BLK = 2.6;
    // 🆕 MEJORA: el exponente 1.7 hacía que la curva se comiera casi todo el
    // rendimiento salvo que tuvieras el atributo relacionado casi al tope.
    // Con 1.7, un nivel "medio" (0.5 en escala 0-1) rendía apenas ~30% del
    // techo. Bajarlo a 1.35 sigue premiando el atributo alto (la curva no es
    // lineal, un 15 en la barra sigue siendo mucho mejor que un 8), pero un
    // jugador bien invertido sin ser perfecto ahora promedia números de
    // rotación real, no de banco de emergencia.
    const EXPONENTE_CURVA = 1.35;

    // 🆕 MEJORA: el dribbling ahora suma (con peso menor) a tu nivel de tiro,
    // porque en la cancha real el hándil es lo que te permite crearte tu propio
    // tiro. Antes era un atributo "de adorno" que solo servía para no activar
    // una penalización — si le metías puntos, no rendía nada a cambio.
    const nivelTiro = (((attrs.tiroExt * 1.2 + attrs.tiroInt * 1.0 + attrs.bandejas * 1.1 + attrs.dribbling * 0.5) / 3.8) / 15) * bonoPos.tiro;
    const nivelPases = (((attrs.vision * 0.8 + attrs.pases * 0.4) / 1.2) / 15) * bonoPos.pases;
    const nivelReboteo = (((attrs.defInt * 0.5 + attrs.fuerza * 0.6 + attrs.fisico * 0.3) / 1.4) / 15) * bonoPos.reboteo;
    // 🆕 MEJORA: robos y tapones ahora son stats reales de la planilla, no
    // solo un número interno. Robos sale de la defensa exterior (anticipación,
    // manos rápidas), tapones de la defensa interior (protección de aro).
    const nivelRobos = (attrs.defExt / 15) * bonoPos.robos;
    const nivelTapones = (attrs.defInt / 15) * bonoPos.tapones;

    // 🆕 MEJORA: cada stat ahora tiene su propio "atributo de apoyo" que
    // castiga la especialización pura (ver calcularFactorEspecializacion):
    // - Tiro necesita manejo/físico para crearse el propio tiro.
    // - Pases necesitan visión de juego respaldada por manejo de balón.
    // - Rebote necesita fuerza para ganar la posición bajo el aro.
    // - Robos necesitan físico/velocidad para anticipar sin quedar parado.
    // - Tapones necesitan fuerza para defender el aro sin caer en falta.
    const factorTiro = calcularFactorEspecializacion(attrs.tiroExt, Math.min(attrs.dribbling, attrs.fisico));
    const factorPases = calcularFactorEspecializacion(attrs.vision, attrs.pases);
    const factorReboteo = calcularFactorEspecializacion(attrs.defInt, attrs.fuerza);
    const factorRobos = calcularFactorEspecializacion(attrs.defExt, attrs.fisico);
    const factorTapones = calcularFactorEspecializacion(attrs.defInt, attrs.fuerza);

    // 🆕 MEJORA: nivel de defensa, separado de PTS/AST/REB (para no inflar tu
    // planilla ofensiva con puntos de defensa), pero que ahora SÍ importa:
    // impacta en las chances de tu equipo de avanzar en playoffs y habilita
    // el premio a Mejor Defensor. Antes, meterle fichas a defExt/defInt para
    // armar un jugador defensivo no te devolvía absolutamente nada.
    const nivelDefensa = ((attrs.defExt * 0.55 + attrs.defInt * 0.45) / 1.0) / 15;

    let pts = TECHO_PTS * Math.pow(nivelTiro, EXPONENTE_CURVA) * multiplicadorMinutos * factorTiro * modificadorSuerte * ruidoPts;
    let ast = TECHO_AST * Math.pow(nivelPases, EXPONENTE_CURVA) * multiplicadorMinutos * factorPases * modificadorSuerte * ruidoAst;
    let reb = TECHO_REB * Math.pow(nivelReboteo, EXPONENTE_CURVA) * multiplicadorMinutos * factorReboteo * modificadorSuerte * ruidoReb;
    let stl = TECHO_STL * Math.pow(nivelRobos, EXPONENTE_CURVA) * multiplicadorMinutos * factorRobos * modificadorSuerte * ruidoStl;
    let blk = TECHO_BLK * Math.pow(nivelTapones, EXPONENTE_CURVA) * multiplicadorMinutos * factorTapones * modificadorSuerte * ruidoBlk;

    // 🆕 NUEVO: el enfoque de temporada elegido antes de simular (Modo
    // Estrella, Cuidar el Cuerpo, Juego de Equipo, Profesional) redistribuye
    // cómo se traduce tu build en la planilla final.
    const enfoque = obtenerEnfoqueActivo();
    pts *= enfoque.pts;
    ast *= enfoque.ast;
    reb *= enfoque.reb;
    stl *= enfoque.stl;
    blk *= enfoque.blk;

    const ptsPer36 = TECHO_PTS * Math.pow(nivelTiro, EXPONENTE_CURVA) * factorTiro * modificadorSuerte * ruidoPts * enfoque.pts;
    const astPer36 = TECHO_AST * Math.pow(nivelPases, EXPONENTE_CURVA) * factorPases * modificadorSuerte * ruidoAst * enfoque.ast;
    const rebPer36 = TECHO_REB * Math.pow(nivelReboteo, EXPONENTE_CURVA) * factorReboteo * modificadorSuerte * ruidoReb * enfoque.reb;
    const stlPer36 = TECHO_STL * Math.pow(nivelRobos, EXPONENTE_CURVA) * factorRobos * modificadorSuerte * ruidoStl * enfoque.stl;
    const blkPer36 = TECHO_BLK * Math.pow(nivelTapones, EXPONENTE_CURVA) * factorTapones * modificadorSuerte * ruidoBlk * enfoque.blk;
    // Robos y tapones pesan más "por unidad" en el rendimiento agregado (rango
    // 0-3 vs 0-34 de puntos), así que se ponderan x4 para que influyan de
    // verdad en decisiones de corte/retiro y no queden invisibles en la suma.
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

function sortearCalidadEquipo() {
    const pesoTotal = CALIDADES_EQUIPO.reduce((acc, t) => acc + t.probPeso, 0);
    let dado = Math.random() * pesoTotal;
    for (const tier of CALIDADES_EQUIPO) {
        if (dado < tier.probPeso) return tier;
        dado -= tier.probPeso;
    }
    return CALIDADES_EQUIPO[CALIDADES_EQUIPO.length - 1];
}

// 🆕 caja de aviso para mostrar el contexto del equipo en los resultados.
function renderizarCalidadEquipoHTML(calidadEquipo) {
    if (!calidadEquipo) return "";
    return `
        <div class="status-box alert-equipo">
            <p><strong>Contexto del equipo (${calidadEquipo.nombre}):</strong> ${calidadEquipo.mensaje}</p>
        </div>
    `;
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
// SISTEMA DE PREMIOS Y LOGROS DE TEMPORADA
// ==========================================
function calcularLogrosDeTemporada(pts, ast, reb, stl, blk, yearNumero, impactoDefensivo, calidadEquipo) {
    const player = gameState.player;
    // 🆕 rendimientoIndividual: decide premios personales (MVP, All-NBA, ROY,
    // MIP, 6MOY). rendimiento: versión ajustada por el contexto del equipo,
    // usada SOLO para la cadena de playoffs/conferencia/finales/anillo, para
    // que el equipo pese en llegar lejos sin inflar ni desinflar tus premios
    // individuales.
    const rendimientoIndividual = pts + ast + reb + (impactoDefensivo * 15);
    const bonusEquipo = calidadEquipo ? calidadEquipo.bonusRendimiento : 0;
    const rendimiento = Math.max(0, rendimientoIndividual + bonusEquipo);
    // 🆕 MEJORA: rendimiento defensivo específico (para DPOY y Equipo
    // Defensivo Ideal), combinando robos y tapones reales de la planilla con
    // el impacto defensivo general, en vez de depender solo de este último.
    const rendimientoDefensivo = (stl * 8) + (blk * 8) + (impactoDefensivo * 25);
    const esRookie = yearNumero === 1;
    const historialPrevio = gameState.statsHistory.length > 0
        ? gameState.statsHistory[gameState.statsHistory.length - 1]
        : null;

    const logros = [];
    let bonus = 0;

    const agregarLogro = (nombre, puntos) => {
        logros.push({ nombre, puntos });
        bonus += puntos;
    };

    let probPlayoffs;
    if (rendimiento >= 45) probPlayoffs = 0.80;
    else if (rendimiento >= 28) probPlayoffs = 0.55;
    else if (rendimiento >= 15) probPlayoffs = 0.30;
    else probPlayoffs = 0.10;

    if (Math.random() < probPlayoffs) {
        agregarLogro("Clasificación a Playoffs 🎟️", 1);

        const probConferencia = Math.min(0.55, 0.25 + rendimiento / 130);
        if (Math.random() < probConferencia) {
            agregarLogro("Finalista de Conferencia", 1);

            const probFinalesNBA = Math.min(0.50, 0.20 + rendimiento / 150);
            if (Math.random() < probFinalesNBA) {
                agregarLogro("Finalista de la NBA 🏀", 1);

                const probCampeon = Math.min(0.45, 0.15 + rendimiento / 170);
                if (Math.random() < probCampeon) {
                    agregarLogro("Campeón de la NBA 🏆", 2);

                    const probFinalsMVP = rendimientoIndividual >= 38 ? 0.45 : 0.15;
                    if (Math.random() < probFinalsMVP) {
                        agregarLogro("Finals MVP 🏅", 2);
                    }
                }
            }
        }
    }

    if (!esRookie && rendimientoIndividual >= 48) {
        const probMVP = Math.min(0.40, (rendimientoIndividual - 45) / 20);
        if (Math.random() < probMVP) {
            agregarLogro("MVP de la Temporada 👑", 4);
        } else if (Math.random() < Math.min(0.55, (rendimientoIndividual - 30) / 40)) {
            agregarLogro("All-NBA Team ⭐", 3);
        }
    } else if (!esRookie && rendimientoIndividual >= 35) {
        if (Math.random() < Math.min(0.55, (rendimientoIndividual - 30) / 40)) {
            agregarLogro("All-NBA Team ⭐", 3);
        }
    }

    if (!esRookie && player.minutesPerGame < 20 && rendimientoIndividual >= 15) {
        if (Math.random() < 0.30) {
            agregarLogro("Sexto Hombre del Año 🎖️", 2);
        }
    }

    if (!esRookie && historialPrevio) {
        const rendimientoPrevio = historialPrevio.pts + historialPrevio.ast + historialPrevio.reb;
        const huboSaltoGrande = rendimientoPrevio > 0 && rendimientoIndividual >= rendimientoPrevio * 1.35;
        if (huboSaltoGrande && rendimientoIndividual >= 15 && Math.random() < 0.40) {
            agregarLogro("Most Improved Player 📈", 2);
        }
    }

    if (esRookie) {
        if (rendimientoIndividual >= 20 && Math.random() < 0.35) {
            agregarLogro("Rookie del Año (ROY) 🏅", 2);
        } else if (rendimientoIndividual >= 10 && Math.random() < 0.30) {
            agregarLogro("All-Rookie Team", 1);
        }
    }

    // 🆕 MEJORA: premio a Mejor Defensor del Año, ahora basado en robos y
    // tapones reales de la temporada (no solo un número interno), para que
    // sea consistente con lo que se ve en la planilla de stats.
    if (!esRookie && rendimientoDefensivo >= 18) {
        const probDPOY = Math.min(0.35, (rendimientoDefensivo - 16) * 0.028);
        if (Math.random() < probDPOY) {
            agregarLogro("Mejor Defensor del Año (DPOY) 🛡️", 3);
        }
    }

    // 🆕 MEJORA: Equipo Defensivo Ideal, el equivalente defensivo del All-NBA
    // Team. Antes construir un defensor de elite (robos/tapones) no te daba
    // ningún reconocimiento propio más allá del DPOY (que es un solo cupo
    // simbólico); ahora hay un premio más alcanzable para builds defensivas
    // consistentes, no solo para la temporada perfecta.
    if (!esRookie && rendimientoDefensivo >= 11) {
        const probAllDef = Math.min(0.50, (rendimientoDefensivo - 9) * 0.045);
        if (Math.random() < probAllDef) {
            agregarLogro("Equipo Defensivo Ideal 🛡️⭐", 2);
        }
    }

    return { logros, bonus };
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
function iniciarTemporadaUno() {
    const player = gameState.player;
    const { modificadorSuerte, tipoAño } = generarSuerteDelAño();
    const calidadEquipo = sortearCalidadEquipo();
    const { pts, ast, reb, stl, blk, rendimientoPer36, impactoDefensivo, mensajeLesion, minutosReales } = calcularEstadisticasConLesion(modificadorSuerte, tipoAño);

    const { logros, bonus } = calcularLogrosDeTemporada(pts, ast, reb, stl, blk, 1, impactoDefensivo, calidadEquipo);

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
        mensajeRival, // 🆕
        logros,
        rendimientoPer36
    };
    gameState.statsHistory.push(resultadoAño);
    resultadoAño.mensajeRivalHistorico = generarMensajeRivalHistorico(); // 🆕 necesita el año ya en el historial

    player.contractYearsLeft = Math.max(0, player.contractYearsLeft - 1);
    player.age++;
    player.experience++;

    manejarEventoYFinalizar(
        resultadoAño,
        (bonusExtra) => {
            player.availablePoints = Math.max(0, calcularPuntosBaseDesarrollo(player.experience) + bonus + bonusExtra);
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
        <p><strong>Equipo:</strong> ${res.team} | <strong>Edad:</strong> ${gameState.player.age} años</p>
        <p><strong>Contexto del año:</strong> ${res.tipoAzar}</p>
        ${renderizarCalidadEquipoHTML(res.calidadEquipo)}
        ${renderizarLesionHTML(res.mensajeLesion)}
        ${renderizarEventoHTML(res.mensajeEvento)}

        <div class="stats-grid">
            <div class="stat-box"><p>MIN</p><h3>${res.min}</h3></div>
            <div class="stat-box"><p>PTS</p><h3>${res.pts}</h3></div>
            <div class="stat-box"><p>AST</p><h3>${res.ast}</h3></div>
            <div class="stat-box"><p>REB</p><h3>${res.reb}</h3></div>
            <div class="stat-box"><p>STL</p><h3>${res.stl}</h3></div>
            <div class="stat-box"><p>BLK</p><h3>${res.blk}</h3></div>
        </div>

        ${renderizarLogrosHTML(res.logros)}

        <div class="status-box">
            <p><strong>Contrato Restante:</strong> Queda ${gameState.player.contractYearsLeft} año obligatorio en este equipo.</p>
            <p>¡Terminó el año! Ganaste <strong>${gameState.player.availablePoints} punto(s)</strong> para entrenar de cara al Año 2.</p>
        </div>

        <button onclick="irAEntrenamientoAñoDos()">Ir a entrenar para el Año 2 🏋️‍♂️</button>
    `;
}

// ==========================================
// PANTALLA: ENTRENAMIENTO PREVIO AL AÑO 2
// ==========================================
function irAEntrenamientoAñoDos() {
    if (gameState.player.isRetired) return; // 🆕 FIX: no entrenar post-retiro

    gameState.player.enfoqueTemporada = null; // 🆕 hay que elegir de nuevo el enfoque cada temporada

    document.getElementById("season-screen").classList.add("hidden");

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
function simularAñoDos() {
    const player = gameState.player;

    const { modificadorSuerte, tipoAño } = generarSuerteDelAño();
    const { minutos, huboBreakout, huboRegresion } = calcularMinutosDelAño(modificadorSuerte);
    player.minutesPerGame = minutos;

    const calidadEquipo = sortearCalidadEquipo();
    const { pts, ast, reb, stl, blk, rendimientoPer36, impactoDefensivo, mensajeLesion, minutosReales } = calcularEstadisticasConLesion(modificadorSuerte, tipoAño);
    const { logros, bonus } = calcularLogrosDeTemporada(pts, ast, reb, stl, blk, 2, impactoDefensivo, calidadEquipo);

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
        mensajeRival, // 🆕
        logros,
        rendimientoPer36,
        huboBreakout,      // 🆕
        huboRegresion      // 🆕
    };
    gameState.statsHistory.push(resultadoAño);
    resultadoAño.mensajeRivalHistorico = generarMensajeRivalHistorico(); // 🆕

    player.contractYearsLeft = Math.max(0, player.contractYearsLeft - 1);
    player.age++;
    player.experience++;

    manejarEventoYFinalizar(
        resultadoAño,
        (bonusExtra) => {
            player.availablePoints = Math.max(0, calcularPuntosBaseDesarrollo(player.experience) + bonus + bonusExtra);
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
        <p><strong>Equipo:</strong> ${res.team} | <strong>Edad:</strong> ${gameState.player.age} años</p>
        <p><strong>Contexto del año:</strong> ${res.tipoAzar}</p>
        ${renderizarCalidadEquipoHTML(res.calidadEquipo)}
        ${renderizarLesionHTML(res.mensajeLesion)}
        ${renderizarMensajeMinutosHTML(res.huboBreakout, res.huboRegresion, res.min)}
        ${renderizarEventoHTML(res.mensajeEvento)}

        <div class="stats-grid">
            <div class="stat-box"><p>MIN</p><h3>${res.min}</h3></div>
            <div class="stat-box"><p>PTS</p><h3>${res.pts}</h3></div>
            <div class="stat-box"><p>AST</p><h3>${res.ast}</h3></div>
            <div class="stat-box"><p>REB</p><h3>${res.reb}</h3></div>
            <div class="stat-box"><p>STL</p><h3>${res.stl}</h3></div>
            <div class="stat-box"><p>BLK</p><h3>${res.blk}</h3></div>
        </div>

        ${renderizarLogrosHTML(res.logros)}

        <div class="status-box alert-warning">
            <h3>⚠️ ¡CONTRATO DE NOVATO VENCIDO! ⚠️</h3>
            <p>Completaste tus primeros 2 años obligatorios en la liga. Las oficinas del mánager están abiertas.</p>
        </div>

        <button onclick="procesarAgenciaLibreOGameOver()">Ir a la Oficina: Ver ofertas o Retiro 💼</button>
    `;
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

        ofertasHTML += `
            <div class="oferta-card ${tier.esEstrella ? "estrella" : ""}">
                <h3>${tier.esEstrella ? "🔥 Renovación Máxima" : "🔄 Renovar"} - ${player.currentTeam}</h3>
                <p>Te ofrecen ${añosRenovacion} año(s) de contrato para seguir en la franquicia.</p>
                <button onclick="aceptarContrato('${player.currentTeam}', ${añosRenovacion})">Aceptar Renovación</button>
            </div>
        `;
    }

    equiposSorteados.forEach(equipo => {
        const años = Math.floor(Math.random() * (tier.maxAños - tier.minAños + 1)) + tier.minAños;
        const etiqueta = tier.esEstrella ? "⭐ Oferta de Agente Libre" : "💼 Oferta de Mercado";
        ofertasHTML += `
            <div class="oferta-card">
                <h3>${etiqueta} - ${equipo}</h3>
                <p>Te ofrecen ${años} año(s) de contrato.</p>
                <button onclick="aceptarContrato('${equipo}', ${años})">Firmar con ${equipo}</button>
            </div>
        `;
    });

    if (!equipoActualRenueva && equiposSorteados.length < 1) {
        const equipoRescate = equiposDisponibles[Math.floor(Math.random() * equiposDisponibles.length)];
        ofertasHTML += `
            <div class="oferta-card">
                <h3>💼 Oferta de Mercado - ${equipoRescate}</h3>
                <p>Te ofrecen 1 año de contrato buscando profundidad en el banco.</p>
                <button onclick="aceptarContrato('${equipoRescate}', 1)">Firmar con ${equipoRescate}</button>
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

    if (promedioPer36Reciente < 5.0) {
        ejecutarPantallaRetiro(
            `Fin de la Carrera: Fuera de la Liga. Tus números esta temporada (${pts} PTS, ${ast} AST, ${reb} REB) fueron demasiado bajos para el nivel exigido en la NBA, incluso ajustando por los pocos minutos que jugaste. Ninguna franquicia mostró interés y decidís retirarte de manera prematura.`,
            true // 🆕 corte forzado: pesa distinto en la clasificación final del HOF
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
function aceptarContrato(equipo, años) {
    if (gameState.player.isRetired) return; // 🆕 FIX: no firmar contratos post-retiro

    const cambioDeEquipo = gameState.player.currentTeam !== equipo;
    gameState.player.currentTeam = equipo;
    gameState.player.contractYearsLeft = años;

    // 🆕 nueva franquicia, nueva rivalidad — el rival de tu equipo anterior
    // no te sigue si te vas a jugar a otro lado.
    if (cambioDeEquipo) asignarRivalDeFranquicia();

    document.getElementById("office-screen").classList.add("hidden");

    if (gameState.player.availablePoints > 0) {
        irAEntrenamientoAñoDos();
    } else {
        simularSiguienteAño();
    }
}

// ==========================================
// BUCLE GENERAL DE CARRERA (AÑO 3 EN ADELANTE)
// ==========================================
function simularSiguienteAño() {
    const player = gameState.player;
    if (player.isRetired) return; // 🆕 FIX: no simular más temporadas post-retiro

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
    const { minutos, huboBreakout, huboRegresion } = calcularMinutosDelAño(modificadorSuerte);
    player.minutesPerGame = minutos;

    const calidadEquipo = sortearCalidadEquipo();
    const { pts, ast, reb, stl, blk, rendimientoPer36, impactoDefensivo, mensajeLesion, minutosReales } = calcularEstadisticasConLesion(modificadorSuerte, tipoAño);
    const { logros, bonus } = calcularLogrosDeTemporada(pts, ast, reb, stl, blk, player.experience, impactoDefensivo, calidadEquipo);

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
        mensajeRival, // 🆕
        logros,
        rendimientoPer36,
        huboBreakout,
        huboRegresion,
    };
    gameState.statsHistory.push(resultadoAño);
    resultadoAño.mensajeRivalHistorico = generarMensajeRivalHistorico(); // 🆕

    if (chequearRetiroDefinitivo()) {
        return;
    }

    manejarEventoYFinalizar(
        resultadoAño,
        (bonusExtra) => {
            const base = (player.declineAge === null || player.age < player.declineAge)
                ? calcularPuntosBaseDesarrollo(player.experience)
                : 0;
            player.availablePoints = Math.max(0, base + bonus + bonusExtra);
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
const ENFOQUES_TEMPORADA = {
    agresivo: {
        nombre: "Modo Estrella 🌟",
        descripcion: "Buscás protagonismo total: más tiros, más responsabilidad, más minutos de riesgo. Sube mucho tu producción ofensiva pero descuida el resto del juego y el desgaste físico es real.",
        pts: 1.32, ast: 0.90, reb: 0.88, stl: 0.85, blk: 0.85,
        injuryMultiplier: 1.65
    },
    conservador: {
        nombre: "Cuidar el Cuerpo 🧊",
        descripcion: "Jugás con el freno de mano puesto para llegar entero a fin de año. Baja fuerte tu producción, pero el riesgo de lesión se reduce muchísimo.",
        pts: 0.72, ast: 0.78, reb: 0.78, stl: 0.80, blk: 0.80,
        injuryMultiplier: 0.40
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
    }
};

function obtenerEnfoqueActivo() {
    const key = gameState.player.enfoqueTemporada;
    return ENFOQUES_TEMPORADA[key] || ENFOQUES_TEMPORADA.profesional;
}

function renderizarSelectorEnfoque() {
    const seleccionado = gameState.player.enfoqueTemporada;
    const cards = Object.keys(ENFOQUES_TEMPORADA).map(key => {
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
    const cardIndex = Object.keys(ENFOQUES_TEMPORADA).indexOf(key);
    const cards = document.querySelectorAll(".enfoque-card");
    if (cards[cardIndex]) cards[cardIndex].classList.add("enfoque-card-activa");

    const hint = document.getElementById("enfoque-hint");
    if (hint) hint.textContent = "";

    actualizarEstadoBotonConfirmar();
}

// 🆕 el botón de confirmar ahora exige DOS condiciones: puntos repartidos Y
// enfoque elegido. Se centraliza acá para no duplicar la lógica en cada
// pantalla de entrenamiento.
function actualizarEstadoBotonConfirmar() {
    const btnConfirmar = document.getElementById("btn-confirmar-atributos");
    if (!btnConfirmar) return;
    const puntosListos = gameState.player.availablePoints === 0;
    const enfoqueListo = gameState.player.enfoqueTemporada !== null;
    btnConfirmar.disabled = !(puntosListos && enfoqueListo);
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
    const resistenciaFisica = (attrs.fisico + attrs.fuerza) / 30; // 0 (débil) a 1 (fuerte)
    const factorResistencia = 1.35 - resistenciaFisica * 0.65; // menos físico/fuerza = más riesgo
    // 🆕 jugadores "de vidrio": cada lesión moderada/grave previa suma propensión,
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
    { categoria: "cancha", mensaje: "🔥 Hiciste buena onda con un compañero clave y la química del equipo te sumó en la cancha.", bonusExtra: 1 },
    { categoria: "cancha", mensaje: "😤 Un cruce con el entrenador por minutos te tuvo un poco distraído parte del año.", bonusExtra: -1 },
    { categoria: "cancha", mensaje: "🤝 Un veterano del plantel te tomó como discípulo y te ayudó a pulir detalles de tu juego.", bonusExtra: 2 },
    { categoria: "fueraCancha", mensaje: "📸 Una marca deportiva te sumó a una campaña menor — más exposición, algo de presión extra.", bonusExtra: 1 },
    { categoria: "fueraCancha", mensaje: "📰 Unas declaraciones tuyas se malinterpretaron en la prensa y armaron un quilombo corto.", bonusExtra: -1 },
    { categoria: "fueraCancha", mensaje: "✈️ Un viaje familiar te desconcentró un poco antes de un tramo importante de la temporada.", bonusExtra: -1 },
    { categoria: "cancha", mensaje: "🎯 El cuerpo técnico destacó tu profesionalismo en los entrenamientos frente a todo el plantel.", bonusExtra: 1 }
];

const EVENTOS_DECISION = [
    {
        categoria: "fueraCancha",
        narrativa: "Una marca de indumentaria te ofrece un contrato de auspicio. Es plata y exposición, pero te va a robar tiempo de entrenamiento.",
        opciones: [
            { label: "Firmar el contrato 💰", resultadoTexto: "Firmaste el auspicio: sumaste plata y fama, pero le restaste horas al gimnasio.", bonusExtra: -1 },
            { label: "Rechazar y enfocarte en el juego 🏀", resultadoTexto: "Rechazaste la oferta para no distraerte — el cuerpo técnico valoró tu compromiso.", bonusExtra: 1 }
        ]
    },
    {
        categoria: "cancha",
        narrativa: "El entrenador te da a elegir: liderar vos los entrenamientos extra del equipo, o entrenar solo a tu ritmo.",
        opciones: [
            { label: "Liderar al equipo 👥", resultadoTexto: "Te pusiste al hombro los entrenamientos extra — el grupo te lo agradeció.", bonusExtra: 1 },
            { label: "Entrenar a tu ritmo 🧘", resultadoTexto: "Preferiste tu rutina personal, más efectiva para vos individualmente.", bonusExtra: 2 }
        ]
    },
    {
        categoria: "fueraCancha",
        narrativa: "Te invitan a dar una charla motivacional en tu ciudad natal, justo en medio de la pretemporada.",
        opciones: [
            { label: "Ir a la charla 🎤", resultadoTexto: "Fuiste a devolverle algo a tu gente — te costó una semana de pretemporada intensiva.", bonusExtra: -1 },
            { label: "Rechazar y quedarte entrenando 💪", resultadoTexto: "Preferiste no distraerte de la pretemporada.", bonusExtra: 1 }
        ]
    }
];

// 🆕 ~28% de chance de evento por temporada, 65% automático / 35% con
// elección, para que aparezcan de vez en cuando y no todos los años.
function procesarEventoDeTemporada() {
    if (Math.random() >= 0.28) return null;

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

    if (!evento) {
        aplicarPuntosFinal(0);
        mostrarFn(resultadoAño);
        return;
    }

    if (evento.tipo === "automatico") {
        resultadoAño.mensajeEvento = evento.mensaje;
        aplicarPuntosFinal(evento.bonusExtra);
        mostrarFn(resultadoAño);
        return;
    }

    mostrarPantallaEventoDecision(evento, resultadoAño, aplicarPuntosFinal, mostrarFn);
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

    attrs.fisico = Math.max(1, attrs.fisico - (Math.floor(Math.random() * 2) + 1));
    attrs.fuerza = Math.max(1, attrs.fuerza - (Math.floor(Math.random() * 2) + 1));
    attrs.defExt = Math.max(1, attrs.defExt - 1);

    if (Math.random() > 0.8) {
        attrs.tiroExt = Math.max(1, attrs.tiroExt - 1);
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

    if (player.experience > 4 && promedioPer36Reciente < 5.0) {
        ejecutarPantallaRetiro(`Retiro Prematuro: Con ${player.age} años, tu nivel de juego cayó demasiado bajo (${ultimoAño.pts} PTS, ${ultimoAño.ast} AST esta temporada). Decidís retirarte con dignidad antes de que la liga te olvide.`, true);
        return true;
    }

    // 🆕 MEJORA: un jugador que acumuló varias lesiones moderadas/graves ya
    // sabe que su cuerpo no da para mucho más, así que la decisión de
    // retirarse por voluntad propia empieza antes (desde los 31, no 33) y es
    // más probable a cualquier edad. No es un límite duro — solo se inclina
    // la balanza, como en la vida real con un cuerpo castigado.
    const esJugadorDeVidrio = player.injuryHistory >= 4;
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
    // 🆕 FIX: a diferencia de mostrarResultadosTemporada (año 1) y
    // mostrarResultadosAñoDos (año 2), esta función nunca ocultaba
    // draft-screen (reutilizada como pantalla de entrenamiento). Por eso a
    // partir del año 3 la pantalla de entrenamiento ya usada quedaba visible
    // arriba, y los resultados/ofertas de agencia libre se veían "apilados"
    // debajo en vez de reemplazarla limpiamente como en los primeros 2 años.
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
        <p><strong>Equipo actual:</strong> ${res.team} | <strong>Edad:</strong> ${gameState.player.age} años</p>
        <p><strong>Rendimiento del año:</strong> ${res.tipoAzar}</p>
        ${renderizarCalidadEquipoHTML(res.calidadEquipo)}
        ${renderizarLesionHTML(res.mensajeLesion)}
        ${renderizarMensajeMinutosHTML(res.huboBreakout, res.huboRegresion, res.min)}
        ${renderizarEventoHTML(res.mensajeEvento)}

        <div class="stats-grid">
            <div class="stat-box"><p>MIN</p><h3>${res.min}</h3></div>
            <div class="stat-box"><p>PTS</p><h3>${res.pts}</h3></div>
            <div class="stat-box"><p>AST</p><h3>${res.ast}</h3></div>
            <div class="stat-box"><p>REB</p><h3>${res.reb}</h3></div>
            <div class="stat-box"><p>STL</p><h3>${res.stl}</h3></div>
            <div class="stat-box"><p>BLK</p><h3>${res.blk}</h3></div>
        </div>

        ${renderizarLogrosHTML(res.logros)}


        ${seccionAcciones}
    `;
}

function avanzarProximaTemporada() {
    if (gameState.player.isRetired) return; // 🆕 FIX: no simular más temporadas post-retiro

    if (gameState.player.availablePoints > 0) {
        irAEntrenamientoAñoDos();
    } else {
        simularSiguienteAño();
    }
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
        <button onclick="mostrarLeaderboard()">Ver Leaderboard Global 🌎</button>
        <button onclick="location.reload()">Crear un nuevo Personaje 🔄</button>
    `;
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
// 🆕 FIX: BLOQUEO DE ZOOM POR DOBLE-TAP en botones (mobile/iOS)
// ==========================================
// En WebKit (iOS) el gesto de zoom por doble-tap a veces ya se interpreta
// antes de que llegue el evento touchend, así que interceptarlo ahí llega
// tarde. Lo capturamos en touchstart, y solo sobre elementos <button> (o sus
// hijos), para no interferir con el scroll normal del resto de la página.
let ultimoToqueBoton = 0;
document.addEventListener("touchstart", (e) => {
    const boton = e.target.closest("button");
    if (!boton) return;

    const ahora = Date.now();
    if (ahora - ultimoToqueBoton <= 180) {
        e.preventDefault();
        boton.click(); // disparamos el click a mano, ya que lo cancelamos
    }
    ultimoToqueBoton = ahora;
}, { passive: false });
