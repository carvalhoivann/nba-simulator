// ==========================================================
// BASE DE DATOS DE JUGADORES REALES NBA (temporada 2025-26)
// ==========================================================
// Estructura: por cada una de las 30 franquicias, un roster corto
// (5-6 jugadores clave, no el plantel completo) con:
//   - nombre: nombre real del jugador
//   - ataque: rating 40-99, basado en volumen/eficiencia ofensiva
//   - defensa: rating 40-99, basado en impacto defensivo real/reputación
//
// CRITERIO DE RATING (consistente entre todos los jugadores):
//   90-99: Nivel MVP / All-NBA First Team
//   80-89: All-Star consolidado / All-NBA Second-Third Team
//   70-79: Titular sólido / borde de All-Star
//   60-69: Rotación importante, sexto hombre de peso
//   40-59: Rol menor, banco, rookie sin consolidar
//
// NOTA: Es una curación manual con criterio parejo, no una extracción
// automática de stats. Los rosters de la NBA cambian todo el tiempo
// (trades, agencia libre, lesiones) — conviene revisar/actualizar esto
// cada cierto tiempo. Si un jugador ya cambió de equipo, se edita acá.
// ==========================================================

const NBA_PLAYERS_DB = {
    "Atlanta Hawks": [
        { nombre: "Trae Young", ataque: 88, defensa: 52 },
        { nombre: "Jalen Johnson", ataque: 78, defensa: 72 },
        { nombre: "Dyson Daniels", ataque: 62, defensa: 88 },
        { nombre: "Onyeka Okongwu", ataque: 68, defensa: 82 },
        { nombre: "Zaccharie Risacher", ataque: 65, defensa: 66 }
    ],
    "Boston Celtics": [
        { nombre: "Jayson Tatum", ataque: 92, defensa: 78 },
        { nombre: "Jaylen Brown", ataque: 86, defensa: 75 },
        { nombre: "Derrick White", ataque: 74, defensa: 84 },
        { nombre: "Kristaps Porzingis", ataque: 79, defensa: 74 },
        { nombre: "Payton Pritchard", ataque: 72, defensa: 60 }
    ],
    "Brooklyn Nets": [
        { nombre: "Cam Thomas", ataque: 80, defensa: 48 },
        { nombre: "Nic Claxton", ataque: 60, defensa: 80 },
        { nombre: "Michael Porter Jr.", ataque: 76, defensa: 58 },
        { nombre: "Egor Demin", ataque: 58, defensa: 55 },
        { nombre: "Noah Clowney", ataque: 55, defensa: 62 }
    ],
    "Charlotte Hornets": [
        { nombre: "LaMelo Ball", ataque: 87, defensa: 55 },
        { nombre: "Miles Bridges", ataque: 78, defensa: 62 },
        { nombre: "Brandon Miller", ataque: 79, defensa: 68 },
        { nombre: "Kon Knueppel", ataque: 68, defensa: 58 },
        { nombre: "Mark Williams", ataque: 65, defensa: 76 }
    ],
    "Chicago Bulls": [
        { nombre: "Josh Giddey", ataque: 78, defensa: 62 },
        { nombre: "Coby White", ataque: 79, defensa: 55 },
        { nombre: "Matas Buzelis", ataque: 68, defensa: 65 },
        { nombre: "Nikola Vucevic", ataque: 74, defensa: 62 },
        { nombre: "Ayo Dosunmu", ataque: 62, defensa: 70 }
    ],
    "Cleveland Cavaliers": [
        { nombre: "Donovan Mitchell", ataque: 90, defensa: 68 },
        { nombre: "Evan Mobley", ataque: 78, defensa: 92 },
        { nombre: "Darius Garland", ataque: 82, defensa: 55 },
        { nombre: "Jarrett Allen", ataque: 68, defensa: 80 },
        { nombre: "De'Andre Hunter", ataque: 70, defensa: 68 }
    ],
    "Dallas Mavericks": [
        { nombre: "Anthony Davis", ataque: 85, defensa: 90 },
        { nombre: "Kyrie Irving", ataque: 87, defensa: 58 },
        { nombre: "Cooper Flagg", ataque: 76, defensa: 78 },
        { nombre: "Klay Thompson", ataque: 70, defensa: 60 },
        { nombre: "Daniel Gafford", ataque: 62, defensa: 78 }
    ],
    "Denver Nuggets": [
        { nombre: "Nikola Jokic", ataque: 98, defensa: 78 },
        { nombre: "Jamal Murray", ataque: 85, defensa: 58 },
        { nombre: "Michael Porter Jr.", ataque: 76, defensa: 55 },
        { nombre: "Aaron Gordon", ataque: 74, defensa: 72 },
        { nombre: "Christian Braun", ataque: 65, defensa: 70 }
    ],
    "Detroit Pistons": [
        { nombre: "Cade Cunningham", ataque: 90, defensa: 65 },
        { nombre: "Jalen Duren", ataque: 68, defensa: 80 },
        { nombre: "Ausar Thompson", ataque: 62, defensa: 85 },
        { nombre: "Tobias Harris", ataque: 70, defensa: 60 },
        { nombre: "Jaden Ivey", ataque: 72, defensa: 58 }
    ],
    "Golden State Warriors": [
        { nombre: "Stephen Curry", ataque: 95, defensa: 60 },
        { nombre: "Jimmy Butler", ataque: 84, defensa: 78 },
        { nombre: "Draymond Green", ataque: 62, defensa: 90 },
        { nombre: "Brandin Podziemski", ataque: 66, defensa: 62 },
        { nombre: "Jonathan Kuminga", ataque: 74, defensa: 65 }
    ],
    "Houston Rockets": [
        { nombre: "Kevin Durant", ataque: 93, defensa: 68 },
        { nombre: "Alperen Sengun", ataque: 82, defensa: 74 },
        { nombre: "Amen Thompson", ataque: 72, defensa: 84 },
        { nombre: "Jalen Green", ataque: 78, defensa: 55 },
        { nombre: "Fred VanVleet", ataque: 74, defensa: 68 }
    ],
    "Indiana Pacers": [
        { nombre: "Pascal Siakam", ataque: 82, defensa: 68 },
        { nombre: "Andrew Nembhard", ataque: 68, defensa: 72 },
        { nombre: "Bennedict Mathurin", ataque: 76, defensa: 55 },
        { nombre: "Myles Turner", ataque: 68, defensa: 82 },
        { nombre: "Tyrese Haliburton", ataque: 85, defensa: 58 }
    ],
    "LA Clippers": [
        { nombre: "Kawhi Leonard", ataque: 88, defensa: 85 },
        { nombre: "James Harden", ataque: 87, defensa: 55 },
        { nombre: "Ivica Zubac", ataque: 66, defensa: 78 },
        { nombre: "Norman Powell", ataque: 76, defensa: 60 },
        { nombre: "Derrick Jones Jr.", ataque: 60, defensa: 80 }
    ],
    "Los Angeles Lakers": [
        { nombre: "Luka Doncic", ataque: 97, defensa: 60 },
        { nombre: "LeBron James", ataque: 86, defensa: 65 },
        { nombre: "Austin Reaves", ataque: 78, defensa: 62 },
        { nombre: "Rui Hachimura", ataque: 68, defensa: 60 },
        { nombre: "Deandre Ayton", ataque: 66, defensa: 70 }
    ],
    "Memphis Grizzlies": [
        { nombre: "Ja Morant", ataque: 88, defensa: 58 },
        { nombre: "Jaren Jackson Jr.", ataque: 78, defensa: 88 },
        { nombre: "Desmond Bane", ataque: 80, defensa: 62 },
        { nombre: "Santi Aldama", ataque: 65, defensa: 65 },
        { nombre: "Zach Edey", ataque: 62, defensa: 74 }
    ],
    "Miami Heat": [
        { nombre: "Tyler Herro", ataque: 84, defensa: 55 },
        { nombre: "Bam Adebayo", ataque: 74, defensa: 88 },
        { nombre: "Norman Powell", ataque: 76, defensa: 58 },
        { nombre: "Andrew Wiggins", ataque: 70, defensa: 68 },
        { nombre: "Davion Mitchell", ataque: 58, defensa: 78 }
    ],
    "Milwaukee Bucks": [
        { nombre: "Giannis Antetokounmpo", ataque: 96, defensa: 88 },
        { nombre: "Myles Turner", ataque: 68, defensa: 80 },
        { nombre: "Kyle Kuzma", ataque: 70, defensa: 55 },
        { nombre: "Gary Trent Jr.", ataque: 66, defensa: 60 },
        { nombre: "Ryan Rollins", ataque: 62, defensa: 58 }
    ],
    "Minnesota Timberwolves": [
        { nombre: "Anthony Edwards", ataque: 92, defensa: 72 },
        { nombre: "Rudy Gobert", ataque: 58, defensa: 92 },
        { nombre: "Julius Randle", ataque: 78, defensa: 58 },
        { nombre: "Jaden McDaniels", ataque: 66, defensa: 85 },
        { nombre: "Mike Conley", ataque: 62, defensa: 62 }
    ],
    "New Orleans Pelicans": [
        { nombre: "Zion Williamson", ataque: 84, defensa: 60 },
        { nombre: "Trey Murphy III", ataque: 74, defensa: 65 },
        { nombre: "Herbert Jones", ataque: 58, defensa: 85 },
        { nombre: "Yves Missi", ataque: 55, defensa: 72 },
        { nombre: "Jordan Poole", ataque: 72, defensa: 50 }
    ],
    "New York Knicks": [
        { nombre: "Jalen Brunson", ataque: 90, defensa: 58 },
        { nombre: "Karl-Anthony Towns", ataque: 84, defensa: 62 },
        { nombre: "Mikal Bridges", ataque: 74, defensa: 80 },
        { nombre: "OG Anunoby", ataque: 70, defensa: 85 },
        { nombre: "Josh Hart", ataque: 62, defensa: 72 }
    ],
    "Oklahoma City Thunder": [
        { nombre: "Shai Gilgeous-Alexander", ataque: 97, defensa: 80 },
        { nombre: "Jalen Williams", ataque: 82, defensa: 76 },
        { nombre: "Chet Holmgren", ataque: 76, defensa: 86 },
        { nombre: "Luguentz Dort", ataque: 58, defensa: 84 },
        { nombre: "Isaiah Hartenstein", ataque: 60, defensa: 78 }
    ],
    "Orlando Magic": [
        { nombre: "Paolo Banchero", ataque: 87, defensa: 65 },
        { nombre: "Franz Wagner", ataque: 82, defensa: 70 },
        { nombre: "Jalen Suggs", ataque: 68, defensa: 82 },
        { nombre: "Desmond Bane", ataque: 80, defensa: 62 },
        { nombre: "Wendell Carter Jr.", ataque: 62, defensa: 70 }
    ],
    "Philadelphia 76ers": [
        { nombre: "Joel Embiid", ataque: 88, defensa: 78 },
        { nombre: "Tyrese Maxey", ataque: 86, defensa: 60 },
        { nombre: "Paul George", ataque: 78, defensa: 68 },
        { nombre: "VJ Edgecombe", ataque: 66, defensa: 68 },
        { nombre: "Andre Drummond", ataque: 58, defensa: 74 }
    ],
    "Phoenix Suns": [
        { nombre: "Devin Booker", ataque: 91, defensa: 62 },
        { nombre: "Jalen Green", ataque: 78, defensa: 55 },
        { nombre: "Dillon Brooks", ataque: 68, defensa: 78 },
        { nombre: "Mark Williams", ataque: 65, defensa: 76 },
        { nombre: "Grayson Allen", ataque: 68, defensa: 62 }
    ],
    "Portland Trail Blazers": [
        { nombre: "Deni Avdija", ataque: 78, defensa: 72 },
        { nombre: "Jrue Holiday", ataque: 68, defensa: 82 },
        { nombre: "Shaedon Sharpe", ataque: 76, defensa: 58 },
        { nombre: "Donovan Clingan", ataque: 62, defensa: 80 },
        { nombre: "Toumani Camara", ataque: 58, defensa: 78 }
    ],
    "Sacramento Kings": [
        { nombre: "Zach LaVine", ataque: 84, defensa: 55 },
        { nombre: "Domantas Sabonis", ataque: 80, defensa: 65 },
        { nombre: "DeMar DeRozan", ataque: 80, defensa: 58 },
        { nombre: "Keegan Murray", ataque: 68, defensa: 65 },
        { nombre: "Malik Monk", ataque: 72, defensa: 52 }
    ],
    "San Antonio Spurs": [
        { nombre: "Victor Wembanyama", ataque: 87, defensa: 96 },
        { nombre: "De'Aaron Fox", ataque: 85, defensa: 62 },
        { nombre: "Stephon Castle", ataque: 72, defensa: 74 },
        { nombre: "Devin Vassell", ataque: 74, defensa: 68 },
        { nombre: "Harrison Barnes", ataque: 62, defensa: 62 }
    ],
    "Toronto Raptors": [
        { nombre: "Scottie Barnes", ataque: 82, defensa: 82 },
        { nombre: "RJ Barrett", ataque: 76, defensa: 60 },
        { nombre: "Immanuel Quickley", ataque: 74, defensa: 62 },
        { nombre: "Brandon Ingram", ataque: 80, defensa: 55 },
        { nombre: "Jakob Poeltl", ataque: 58, defensa: 78 }
    ],
    "Utah Jazz": [
        { nombre: "Lauri Markkanen", ataque: 84, defensa: 60 },
        { nombre: "Keyonte George", ataque: 72, defensa: 55 },
        { nombre: "Walker Kessler", ataque: 58, defensa: 84 },
        { nombre: "Ace Bailey", ataque: 66, defensa: 60 },
        { nombre: "Isaiah Collier", ataque: 62, defensa: 62 }
    ],
    "Washington Wizards": [
        { nombre: "Bilal Coulibaly", ataque: 68, defensa: 75 },
        { nombre: "Alex Sarr", ataque: 66, defensa: 78 },
        { nombre: "CJ McCollum", ataque: 76, defensa: 55 },
        { nombre: "Khris Middleton", ataque: 70, defensa: 62 },
        { nombre: "Bub Carrington", ataque: 60, defensa: 58 }
    ]
};

// ==========================================================
// FUNCIONES DE UTILIDAD PARA USAR LA BASE DE DATOS
// ==========================================================

// Devuelve el roster de un equipo (o array vacío si no está cargado).
function obtenerRosterEquipo(nombreEquipo) {
    return NBA_PLAYERS_DB[nombreEquipo] || [];
}

// Calcula la "fuerza" ofensiva y defensiva promedio de un equipo en base
// a su roster real. Sirve para alimentar calidadEquipo con un componente
// basado en jugadores reales, en vez de un sorteo 100% al azar.
function calcularFuerzaRealDeEquipo(nombreEquipo) {
    const roster = obtenerRosterEquipo(nombreEquipo);
    if (roster.length === 0) return { ataque: 65, defensa: 65 }; // fallback neutro

    const sumaAtaque = roster.reduce((acc, j) => acc + j.ataque, 0);
    const sumaDefensa = roster.reduce((acc, j) => acc + j.defensa, 0);

    return {
        ataque: Math.round(sumaAtaque / roster.length),
        defensa: Math.round(sumaDefensa / roster.length)
    };
}

// Devuelve el jugador más destacado (mayor ataque+defensa combinado) de
// un equipo. Útil para mostrar "la estrella rival" en la UI.
function obtenerEstrellaDeEquipo(nombreEquipo) {
    const roster = obtenerRosterEquipo(nombreEquipo);
    if (roster.length === 0) return null;

    return roster.reduce((mejor, actual) => {
        const valorActual = actual.ataque + actual.defensa;
        const valorMejor = mejor.ataque + mejor.defensa;
        return valorActual > valorMejor ? actual : mejor;
    }, roster[0]);
}

// ==========================================================
// 🆕 NUEVO: TRASPASOS DURANTE LA CARRERA
// ==========================================================
// Cada temporada hay una chance baja de que tu franquicia haga un trade
// real: se saca un jugador de tu equipo y entra otro desde una franquicia
// rival, mutando NBA_PLAYERS_DB EN MEMORIA (solo dura mientras la pestaña
// esté abierta, no se persiste — es 100% para darle vida a la carrera en
// curso, no para "reescribir" la NBA real de forma permanente).
function procesarTraspasoAleatorio(equipoJugador) {
    const PROB_TRASPASO = 0.45; // ~15% de chance por temporada
    if (Math.random() >= PROB_TRASPASO) return null;
    return construirTraspaso(equipoJugador);
}

// 🆕 Misma lógica de trade que procesarTraspasoAleatorio, pero sin el
// chequeo de probabilidad — se usa para "garantizar" un traspaso cuando
// pasaron muchos años sin ninguno en la carrera.
function forzarTraspasoAleatorio(equipoJugador) {
    return construirTraspaso(equipoJugador);
}

function construirTraspaso(equipoJugador) {
    const rosterPropio = obtenerRosterEquipo(equipoJugador);
    if (rosterPropio.length < 2) return null; // no tocamos si el roster ya es muy corto

    const equiposDisponibles = Object.keys(NBA_PLAYERS_DB).filter(e => e !== equipoJugador);
    const equipoContraparte = equiposDisponibles[Math.floor(Math.random() * equiposDisponibles.length)];
    const rosterContraparte = obtenerRosterEquipo(equipoContraparte);
    if (rosterContraparte.length < 2) return null;

    // Elige un jugador random de cada roster para intercambiar (1x1, trade simple).
    const indicePropio = Math.floor(Math.random() * rosterPropio.length);
    const indiceContraparte = Math.floor(Math.random() * rosterContraparte.length);

    const jugadorQueSeVa = rosterPropio[indicePropio];
    const jugadorQueLlega = rosterContraparte[indiceContraparte];

    // Swap real en la base de datos en memoria.
    rosterPropio[indicePropio] = jugadorQueLlega;
    rosterContraparte[indiceContraparte] = jugadorQueSeVa;

    const mejoro = (jugadorQueLlega.ataque + jugadorQueLlega.defensa) > (jugadorQueSeVa.ataque + jugadorQueSeVa.defensa);

    return {
        id: `${equipoJugador}_${equipoContraparte}_${Date.now()}_${Math.floor(Math.random() * 10000)}`, // 🆕 id único para no duplicar al sincronizar
        equipoOrigen: equipoJugador,       // 🆕
        equipoDestino: equipoContraparte,  // 🆕
        jugadorQueSeVa,
        jugadorQueLlega,
        equipoContraparte,
        mejoro,
        mensaje: `🔄 <strong>Traspaso en la franquicia:</strong> ${equipoJugador} envió a ${jugadorQueSeVa.nombre} a los ${equipoContraparte} a cambio de ${jugadorQueLlega.nombre}. ${mejoro ? "El roster se refuerza de cara al futuro." : "Una movida más pensada en el largo plazo que en el presente inmediato."}`
    };
}

// 🆕 Aplica un traspaso llegado del otro jugador (vía Firestore) a la copia
// LOCAL de NBA_PLAYERS_DB. Busca por nombre en vez de por índice, porque el
// roster local puede haber cambiado de orden por otros traspasos previos.
function aplicarTraspasoRemoto(traspaso) {
    const rosterOrigen = obtenerRosterEquipo(traspaso.equipoOrigen);
    const rosterDestino = obtenerRosterEquipo(traspaso.equipoDestino);

    const idxSeVa = rosterOrigen.findIndex(j => j.nombre === traspaso.jugadorQueSeVa.nombre);
    const idxLlega = rosterDestino.findIndex(j => j.nombre === traspaso.jugadorQueLlega.nombre);

    if (idxSeVa !== -1) rosterOrigen[idxSeVa] = traspaso.jugadorQueLlega;
    if (idxLlega !== -1) rosterDestino[idxLlega] = traspaso.jugadorQueSeVa;
}

// 🆕 Genera el HTML del roster actual de un equipo (colapsable), para
// mostrar en la tarjeta de jugador. Usa el mismo estilo visual que el
// listado del Draft (.draft-board-details).
function renderizarRosterEquipoHTML(nombreEquipo) {
    const roster = obtenerRosterEquipo(nombreEquipo);
    if (roster.length === 0) return "";

    const filas = roster.map(j => `
        <li class="draft-pick-row">
            <span class="draft-pick-nombre">${j.nombre}</span>
            <span class="draft-pick-equipo">ATQ ${j.ataque} / DEF ${j.defensa}</span>
        </li>
    `).join("");

    return `
        <details class="draft-board-details">
            <summary>🏀 Ver roster de ${nombreEquipo}</summary>
            <ul class="draft-board-list">${filas}</ul>
        </details>
    `;
}

// 🆕 Determina si un traspaso involucra a una estrella (para decidir si se
// muestra en pantalla o pasa desapercibido).
function esTraspasoDeEstrella(traspaso) {
    if (!traspaso) return false;
    const UMBRAL_ESTRELLA = 135; // ataque + defensa combinados
    const valorQueSeVa = traspaso.jugadorQueSeVa.ataque + traspaso.jugadorQueSeVa.defensa;
    const valorQueLlega = traspaso.jugadorQueLlega.ataque + traspaso.jugadorQueLlega.defensa;
    return valorQueSeVa >= UMBRAL_ESTRELLA || valorQueLlega >= UMBRAL_ESTRELLA;
}

