/* ============================================
   🔹 Gestione navigazione sezioni (SPA)
   - Mostra/nasconde le "pagine" (div) principali
   - Gestisce la visibilità del dock
   - Resetta alcune sezioni quando si torna in home
============================================ */
function showSection(sectionId) {
    document.querySelectorAll("body > div").forEach(div => {
        if (div.id !== "dock") div.style.display = "none";
    });

    const section = document.getElementById(sectionId);
    if (['startPage', 'loginPage', 'registerPage'].includes(sectionId)) {
        section.style.display = "flex";
    } else {
        section.style.display = "block";
    }

    const dock = document.getElementById("dock");
    dock.style.display = (['startPage', 'loginPage', 'registerPage'].includes(sectionId)) ? "none" : "flex";

    if (sectionId === "homePage") {
        const playlistPage = document.getElementById("playlistPage");
        if (playlistPage) playlistPage.style.display = "none";

        const risultatiPage = document.getElementById("risultatiPage");
        if (risultatiPage) risultatiPage.style.display = "none";

        const playlistDetailPage = document.getElementById("playlistDetailPage");
        if (playlistDetailPage) playlistDetailPage.style.display = "none";

        const selectPlaylistPage = document.getElementById("selectPlaylistPage");
        if (selectPlaylistPage) selectPlaylistPage.style.display = "none";

        const createCommunityPage = document.getElementById("createCommunityPage");
        if (createCommunityPage) createCommunityPage.style.display = "none";

        const communityDetailPage = document.getElementById("communityDetailPage");
        if (communityDetailPage) communityDetailPage.style.display = "none";

        const shareDialog = document.getElementById("shareDialog");
        if (shareDialog) shareDialog.style.display = "none";

        const sharedContainer = document.getElementById("sharedResults");
        if (sharedContainer) sharedContainer.innerHTML = "";

        mostraPlaylist();
        if (typeof mostraComunita === "function") {
            mostraComunita();
        }
    }
}

/* ============================================
   🔹 Menu Impostazioni (toggle + click-outside)
============================================ */
function toggleSettingsMenu() {
    const menu = document.getElementById("settingsMenu");
    const isVisible = menu.style.display === "block";

    document.querySelectorAll(".dropdown-menu").forEach(m => {
        m.style.display = "none";
    });

    if (!isVisible) {
        menu.style.display = "block";
    }
}

document.addEventListener("click", function (event) {
    const settingsMenu = document.getElementById("settingsMenu");
    const settingsIcon = document.querySelector('.dock-icon[onclick*="toggleSettingsMenu"]');
    if (!settingsMenu) return;

    if (settingsMenu.style.display === "block") {
        if (!settingsMenu.contains(event.target) && (!settingsIcon || !settingsIcon.contains(event.target))) {
            settingsMenu.style.display = "none";
        }
    }
});

function logout() {
    showSection('startPage');
}

/* ============================================
   🔹 Gestione Account: Eliminazione definitiva
============================================ */
function eliminaAccount() {
    const utente = getUtenteCorrente();
    if (!utente) {
        alert("Nessun utente loggato!");
        return;
    }

    const conferma1 = confirm(`ATTENZIONE!\n\nStai per eliminare definitivamente il tuo account "${utente.nome}".\n\nQuesta azione eliminerà:\n- Tutti i tuoi dati personali\n- Tutte le tue playlist\n- Tutte le tue preferenze\n\nQuesta azione è IRREVERSIBILE!\n\nSei sicuro di voler continuare?`);
    if (!conferma1) return;

    const conferma2 = prompt(`Per confermare l'eliminazione, digita il tuo nome utente:\n\n"${utente.nome}"`);
    if (conferma2 !== utente.nome) {
        alert("Nome utente non corretto. Eliminazione annullata.");
        return;
    }

    const conferma3 = confirm(`ULTIMA CONFERMA!\n\nStai per eliminare DEFINITIVAMENTE l'account "${utente.nome}".\n\nNon potrai più recuperare i tuoi dati!\n\nSei ASSOLUTAMENTE sicuro?`);
    if (!conferma3) return;

    // Rimuovi condivisioni dell'utente
    const remainingShares = getSharedPlaylists().filter(s => s.ownerEmail !== utente.email);
    saveSharedPlaylists(remainingShares);

    // Rimuovi membership dalle communities
    const communities = getCommunities();
    Object.values(communities).forEach(c => {
        c.membriUserIds = (c.membriUserIds || []).filter(m => m !== utente.email);
    });
    saveCommunities(communities);

    // Dati utente+token
    localStorage.removeItem("utenteRegistrato");
    localStorage.removeItem("spotifyToken");
    localStorage.removeItem("spotifyTokenExpiry");

    // Vecchio storage playlist separato (se presente)
    const playlists = JSON.parse(localStorage.getItem("playlist") || "{}");
    if (playlists[utente.email]) {
        delete playlists[utente.email];
        localStorage.setItem("playlist", JSON.stringify(playlists));
    }

    alert("Account eliminato con successo. Arrivederci!");
    showSection('startPage');
}

/* ============================================
   🔹 Autenticazione: Registrazione / Login / Generi
============================================ */
document.getElementById('registerForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
        const password = formData.get("password");
        const conferma_password = formData.get("conferma_password");

    if (password !== conferma_password) { alert("Le password non corrispondono!"); return; }

    const user = {
        nome: formData.get("nome_utente"),
        email: formData.get("email"),
        password: password,
        generi: [],
        playlists: []
    };
    salvaUtente(user);
    alert("Registrazione completata!");
    showSection('loginPage');
});

document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const emailInserita = this.email.value;
    const passwordInserita = this.password.value;
    const utenteSalvato = getUtenteCorrente();

    if (!utenteSalvato) {
        alert("Nessun utente registrato. Registrati prima!");
        showSection('registerPage');
        return;
    }

    if (emailInserita === utenteSalvato.email && passwordInserita === utenteSalvato.password) {
        if (!utenteSalvato.generi || utenteSalvato.generi.length === 0) {
            showSection('generiPage');
        } else {
            showSection('homePage');
        }
    } else { alert("Email o password errati!"); }
});

document.getElementById('generiForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const generiSelezionati = formData.getAll("generi[]");

    const utente = getUtenteCorrente();
    utente.generi = generiSelezionati;
    salvaUtente(utente);

    alert("Generi salvati!");
    showSection('homePage');
});

/* ============================================
   🔹 Gestione profilo: password / username / email
============================================ */
document.getElementById('passwordForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const oldPassword = formData.get("oldPassword");
    const newPassword = formData.get("newPassword");
    const confirmNewPassword = formData.get("confirmNewPassword");

    const utente = getUtenteCorrente();
    if (!utente) { alert("Nessun utente registrato trovato!"); return; }
    if (oldPassword !== utente.password) { alert("La vecchia password non è corretta!"); return; }
    if (newPassword !== confirmNewPassword) { alert("Le password non corrispondono!"); return; }

    utente.password = newPassword;
    salvaUtente(utente);

    alert("Password cambiata con successo!");
    showSection('homePage');
});

document.getElementById('usernameForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const oldUsername = formData.get("oldUsername");
    const newUsername = formData.get("newUsername");
    const confirmNewUsername = formData.get("confirmNewUsername");

    const utente = getUtenteCorrente();
    if (!utente) { alert("Nessun utente registrato trovato!"); return; }
    if (oldUsername !== utente.nome) { alert("Il vecchio nome utente non corrisponde!"); return; }
    if (newUsername !== confirmNewUsername) { alert("I nuovi nomi utente non coincidono!"); return; }

    utente.nome = newUsername;
    salvaUtente(utente);

    alert("Nome utente cambiato con successo!");
    showSection('homePage');
});

document.getElementById('emailForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const oldEmail = formData.get("oldEmail");
    const newEmail = formData.get("newEmail");
    const confirmNewEmail = formData.get("confirmNewEmail");

    const utente = getUtenteCorrente();
    if (!utente) { alert("Nessun utente registrato trovato!"); return; }
    if (oldEmail !== utente.email) { alert("La vecchia email non corrisponde!"); return; }
    if (newEmail !== confirmNewEmail) { alert("Le nuove email non coincidono!"); return; }

    utente.email = newEmail;
    salvaUtente(utente);

    alert("Email cambiata con successo!");
    showSection('homePage');
});

/* ============================================
   🔹 Spotify: ricerca brani (token + chiamata)
============================================ */
document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const query = document.getElementById("searchInput").value.trim();
    if (query) cercaTrack(query);
});

async function getSpotifyToken() {
    const savedToken = localStorage.getItem("spotifyToken");
    const tokenExpiry = localStorage.getItem("spotifyTokenExpiry");
    const now = new Date().getTime();
    if (savedToken && tokenExpiry && now < parseInt(tokenExpiry)) return savedToken;

    
   const client_id = "INSERISCI_QUI_IL_TUO_CLIENT_ID";
   const client_secret = "INSERISCI_QUI_IL_TUO_CLIENT_SECRET";

    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: "Basic " + btoa(client_id + ":" + client_secret),
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
    });

    const data = await response.json();
    const token = data.access_token;

    localStorage.setItem("spotifyToken", token);
    localStorage.setItem("spotifyTokenExpiry", now + 3600 * 1000);

    return token;
}

async function cercaTrack(query) {
    try {
        const spotifyToken = await getSpotifyToken();

        const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=15&market=IT`,
            { headers: { Authorization: "Bearer " + spotifyToken } }
        );

        if (!response.ok) {
            throw new Error(`Errore Spotify: ${response.status}`);
        }

        const data = await response.json();
        mostraRisultati(data.tracks?.items || []);
        document.getElementById("searchInput").value = "";

    } catch (error) {
        console.error("Errore ricerca:", error);
        alert("Errore durante la ricerca. Riprova più tardi.");
    }
}

/* ============================================
   🔹 Risultati Spotify (render + azione Aggiungi)
============================================ */
function mostraRisultati(tracks) {
    document.getElementById("homePage").style.display = "none";
    document.getElementById("playlistPage").style.display = "none";
    document.getElementById("risultatiPage").style.display = "block";

    const container = document.getElementById("risultati");
    container.innerHTML = "";

    if (!tracks.length) {
        container.textContent = "Nessun risultato trovato.";
        return;
    }

    tracks.forEach(track => {
        const durataMin = Math.floor(track.duration_ms / 60000);
        const durataSec = Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, "0");
        const anno = track.album.release_date ? track.album.release_date.slice(0, 4) : "N/D";

        const div = document.createElement("div");
        div.classList.add("track");

        const img = document.createElement("img");
        img.src = track.album.images[0]?.url || "";
        img.alt = "Copertina Album";

        const p = document.createElement("p");
        p.innerHTML = `
            <strong>${track.name}</strong><br>
            <small>Artista: ${track.artists.map(a => a.name).join(", ")}</small><br>
            <small>Durata: ${durataMin}:${durataSec}</small><br>
            <small>Anno: ${anno}</small>
        `;

        const btn = document.createElement("button");
        btn.textContent = "Aggiungi";
        btn.onclick = () => scegliPlaylist(track);

        div.appendChild(img);
        div.appendChild(p);
        div.appendChild(btn);
        container.appendChild(div);
    });
}

/* ============================================
   🔹 Aggiunta traccia a playlist (UI di selezione)
============================================ */
let canzoneDaAggiungere = null;

function scegliPlaylist(track) {
    const user = getUtenteCorrente();
    if (!user) { alert("Devi essere loggato."); return; }
    canzoneDaAggiungere = track;
    mostraSelezionePlaylist(track);
}

function mostraSelezionePlaylist(track) {
    showSection("selectPlaylistPage");

    document.getElementById("selectPlaylistTitle").textContent = "Seleziona Playlist";

    const selectInfo = document.getElementById("selectPlaylistInfo");
    selectInfo.innerHTML = `
        <h3>Aggiungi "${track.name}"</h3>
        <p>di ${track.artists.map(a => a.name).join(", ")}</p>
    `;

    const container = document.getElementById("selectPlaylistGrid");
    container.innerHTML = "";

    const playlists = getPlaylists();

    playlists.forEach(pl => {
        const durataMin = Math.floor((pl.durataTotale || 0) / 60000);
        const durataSec = Math.floor(((pl.durataTotale || 0) % 60000) / 1000);

        const div = document.createElement("div");
        div.classList.add("select-playlist-card");
        div.innerHTML = `
            <h3>${pl.nome}</h3>
            <p>${pl.descrizione || "Nessuna descrizione"}</p>
            <p><small>${pl.tags.join(", ") || "Nessun tag"}</small></p>
            <p><small>${pl.canzoni?.length || 0} brani • ${durataMin}:${durataSec.toString().padStart(2, '0')}</small></p>
        `;
        div.onclick = () => aggiungiAllaPlaylist(pl.id);
        container.appendChild(div);
    });

    const addDiv = document.createElement("div");
    addDiv.classList.add("add-new-playlist-card");
    addDiv.innerText = "+";
    addDiv.onclick = () => creaNuovaPlaylistDaCanzone();
    container.appendChild(addDiv);
}

function aggiungiAllaPlaylist(playlistId) {
    if (!canzoneDaAggiungere) return;

    const utente = getUtenteCorrente();
    if (!utente) return;

    const playlist = utente.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    if (playlist.canzoni.some(c => c.id === canzoneDaAggiungere.id)) {
        alert(`"${canzoneDaAggiungere.name}" è già presente in "${playlist.nome}"`);
        return;
    }

    playlist.canzoni.push({
        id: canzoneDaAggiungere.id,
        name: canzoneDaAggiungere.name,
        artists: canzoneDaAggiungere.artists.map(a => a.name).join(", "),
        preview_url: canzoneDaAggiungere.preview_url,
        duration_ms: canzoneDaAggiungere.duration_ms,
        albumCoverUrl: canzoneDaAggiungere.album?.images?.[0]?.url || "",
        album: canzoneDaAggiungere.album || null
    });

    playlist.durataTotale = calcolaDurataPlaylist(playlist.canzoni);
    salvaUtente(utente);

    alert(`"${canzoneDaAggiungere.name}" aggiunta alla playlist "${playlist.nome}"!`);
    canzoneDaAggiungere = null;
    showSection("risultatiPage");
}

function creaNuovaPlaylistDaCanzone() {
    if (!canzoneDaAggiungere) return;

    const nome = prompt(`Inserisci il nome per la nuova playlist:`);
    if (!nome || !nome.trim()) return;

    const descrizione = prompt(`Inserisci una descrizione per "${nome}":`);
    const tagsRaw = prompt(`Inserisci tag separati da virgola per "${nome}":`);
    const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

    const nuovaPlaylist = creaPlaylist(nome.trim(), descrizione || "", tags);
    if (nuovaPlaylist) {
        aggiungiAllaPlaylist(nuovaPlaylist.id);
    }
}

function calcolaDurataPlaylist(canzoni) {
    return canzoni.reduce((totale, canzone) => totale + (canzone.duration_ms || 0), 0);
}

/* ============================================
   🔹 Utility utente (storage + migrazione cover)
============================================ */
function getUtenteCorrente() {
    const utente = localStorage.getItem("utenteRegistrato");
    return utente ? JSON.parse(utente) : null;
}

function salvaUtente(utente) {
    localStorage.setItem("utenteRegistrato", JSON.stringify(utente));
}

function generaId() {
    return Date.now().toString() + Math.floor(Math.random() * 1000);
}

/* Migrazione una tantum: aggiunge albumCoverUrl ai brani già salvati */
function migraCopertineBraniEsistenti() {
    const utente = getUtenteCorrente();
    if (!utente || !Array.isArray(utente.playlists)) return;
    let changed = false;

    utente.playlists.forEach(pl => {
        if (!Array.isArray(pl.canzoni)) return;
        pl.canzoni.forEach(t => {
            if (!t.albumCoverUrl) {
                const cover = t.album?.images?.[0]?.url || "";
                if (cover) {
                    t.albumCoverUrl = cover;
                    changed = true;
                }
            }
        });
    });

    if (changed) salvaUtente(utente);
}
document.addEventListener('DOMContentLoaded', migraCopertineBraniEsistenti);

/* ============================================
   🔹 Playlist: CRUD + rendering griglia in Home
============================================ */
function creaPlaylist(nome, descrizione, tags = []) {
    const utente = getUtenteCorrente();
    if (!utente) { alert("Devi essere loggato per creare playlist!"); return null; }
    if (!utente.playlists) utente.playlists = [];

    const nuovaPlaylist = {
        id: generaId(),
        nome,
        descrizione,
        tags,
        canzoni: [],
        durataTotale: 0
    };
    utente.playlists.push(nuovaPlaylist);
    salvaUtente(utente);
    return nuovaPlaylist;
}

function getPlaylists() {
    const utente = getUtenteCorrente();
    return utente ? (utente.playlists || []) : [];
}

function modificaPlaylistById(id, nuoviDati) {
    const utente = getUtenteCorrente();
    if (!utente) return;

    utente.playlists = utente.playlists.map(pl =>
        pl.id === id ? { ...pl, ...nuoviDati } : pl
    );
    salvaUtente(utente);
}

function eliminaPlaylist(id) {
    const utente = getUtenteCorrente();
    if (!utente) return;

    utente.playlists = utente.playlists.filter(pl => pl.id !== id);
    salvaUtente(utente);
}

function mostraPlaylist(selezione = false) {
    const container = document.getElementById("playlistGrid");
    if (!container) {
        console.error("❌ Container playlistGrid non trovato!");
        return;
    }

    container.innerHTML = "";
    const playlists = getPlaylists();
    const utente = getUtenteCorrente();
    const shared = (typeof getSharedPlaylists === "function") ? getSharedPlaylists() : [];

    if (!utente) {
        console.error("❌ Nessun utente loggato!");
        return;
    }

    container.style.display = "grid";
    container.style.gridTemplateColumns = "repeat(4, 1fr)";
    container.style.gap = "20px";

    playlists.forEach(pl => {
        const durataMin = Math.floor((pl.durataTotale || 0) / 60000);
        const durataSec = Math.floor(((pl.durataTotale || 0) % 60000) / 1000);

        const div = document.createElement("div");
        div.classList.add("playlist-card");
        div.innerHTML = `
            <h3>${pl.nome}</h3>
            <p>${pl.descrizione || "Nessuna descrizione"}</p>
            <p><small>${pl.tags.join(", ") || "Nessun tag"}</small></p>
            <p><small>${pl.canzoni?.length || 0} brani • ${durataMin}:${durataSec.toString().padStart(2, '0')}</small></p>
        `;

        if (!selezione && shared.length) {
            const countShares = shared.filter(s => s.ownerEmail === utente.email && s.playlistId === pl.id).length;
            if (countShares > 0) {
                const badge = document.createElement("span");
                badge.className = "playlist-badge--shared";
                badge.textContent = `Condivisa ×${countShares}`;
                div.appendChild(badge);
            }
        }

        if (selezione) {
            div.onclick = () => {
                if (!canzoneDaAggiungere) return;
                aggiungiAllaPlaylist(pl.id, canzoneDaAggiungere);
                canzoneDaAggiungere = null;
                mostraPlaylist();
            };
        } else {
            div.onclick = () => apriDettagliPlaylist(pl.id);

            const actionsDiv = document.createElement("div");
            actionsDiv.classList.add("playlist-actions");

            const editBtn = document.createElement("button");
            editBtn.classList.add("edit-btn");
            editBtn.innerText = "✏️";
            editBtn.onclick = (e) => {
                e.stopPropagation();
                modificaPlaylistForm(pl.id);
            };

            const deleteBtn = document.createElement("button");
            deleteBtn.classList.add("delete-btn");
            deleteBtn.innerText = "🗑️";
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Vuoi eliminare la playlist "${pl.nome}"?`)) {
                    eliminaPlaylist(pl.id);
                    mostraPlaylist();
                }
            };

            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            div.appendChild(actionsDiv);

            if (typeof apriDialogCondivisione === "function") {
                const shareBtn = document.createElement("button");
                shareBtn.innerText = "🔗 Condividi";
                shareBtn.onclick = (e) => {
                    e.stopPropagation();
                    apriDialogCondivisione(pl.id);
                };
                div.appendChild(shareBtn);
            }
        }

        container.appendChild(div);
    });

    if (!selezione) {
        const addDiv = document.createElement("div");
        addDiv.classList.add("add-playlist-card");
        addDiv.innerText = "+";
        addDiv.onclick = () => showSection("playlistPage");
        container.appendChild(addDiv);
    }
}

/* ============================================
   🔹 Modifica/Creazione playlist (form pagina)
============================================ */
function modificaPlaylistForm(id) {
    const playlists = getPlaylists();
    const playlist = playlists.find(p => p.id === id);
    if (!playlist) return;

    showSection("playlistPage");

    document.getElementById("playlistName").value = playlist.nome;
    document.getElementById("playlistTags").value = playlist.tags.join(", ");
    document.getElementById("playlistDescription").value = playlist.descrizione;

    localStorage.setItem("playlistInModifica", id); //memorizza id in local storage così "sa" che è una modifica
    // Cambia il testo del pulsante del form da “Crea Playlist” a “Salva modifiche”.
    document.querySelector("#playlistForm button").innerText = "Salva modifiche";
}

document.getElementById("playlistForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const nome = document.getElementById("playlistName").value.trim();
    if (!nome) {
        alert("Il nome della playlist non può essere vuoto!");
        return;
    }

    const tags = document.getElementById("playlistTags").value
        .split(",").map(t => t.trim()).filter(t => t);
    const descrizione = document.getElementById("playlistDescription").value;

    const playlistId = localStorage.getItem("playlistInModifica");

    if (playlistId) {
        modificaPlaylistById(playlistId, { nome, tags, descrizione });
        localStorage.removeItem("playlistInModifica");
        alert("Playlist modificata con successo!");
    } else {
        creaPlaylist(nome, descrizione, tags);
        alert("Playlist creata con successo!");
    }

    mostraPlaylist();
    showSection("homePage");
    this.reset();
    document.querySelector("#playlistForm button").innerText = "Crea Playlist";
});

/* ============================================
   🔹 Dettaglio playlist: vista e rimozione brani
============================================ */
function apriDettagliPlaylist(playlistId) {
    const playlists = getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);

    if (!playlist) {
        alert("Playlist non trovata!");
        return;
    }

    mostraDettagliPlaylist(playlist);
}

function mostraDettagliPlaylist(playlist) {
    showSection("playlistDetailPage");

    document.getElementById("playlistDetailTitle").textContent = playlist.nome;

    const playlistInfo = document.getElementById("playlistInfo");
    const durataMin = Math.floor((playlist.durataTotale || 0) / 60000);
    const durataSec = Math.floor(((playlist.durataTotale || 0) % 60000) / 1000);

    playlistInfo.innerHTML = `
        <h3>${playlist.nome}</h3>
        <p>${playlist.descrizione || "Nessuna descrizione"}</p>
        <p><strong>Tag:</strong> ${playlist.tags.join(", ") || "Nessun tag"}</p>
        <p><strong>Brani:</strong> ${playlist.canzoni?.length || 0} • <strong>Durata:</strong> ${durataMin}:${durataSec.toString().padStart(2, '0')}</p>
    `;

    const tracksContainer = document.getElementById("playlistTracks");
    tracksContainer.innerHTML = "";

    if (!playlist.canzoni || playlist.canzoni.length === 0) {
        tracksContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nessuna canzone in questa playlist</p>';
        return;
    }

    playlist.canzoni.forEach((track, index) => {
        const tMin = Math.floor((track.duration_ms || 0) / 60000);
        const tSec = Math.floor(((track.duration_ms || 0) % 60000) / 1000);
        const cover = track.albumCoverUrl || track.album?.images?.[0]?.url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><rect width='100%' height='100%' fill='%23181818'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23b3b3b3' font-size='10'>No Cover</text></svg>";

        const trackDiv = document.createElement("div");
        trackDiv.classList.add("track-item");
        trackDiv.innerHTML = `
            <img src="${cover}" alt="Copertina Album">
            <div class="track-info">
                <h4>${track.name}</h4>
                <p>${track.artists}</p>
                <p>${tMin}:${tSec.toString().padStart(2, '0')}</p>
            </div>
            <div class="track-actions">
                <button class="remove-track-btn" onclick="rimuoviCanzoneDaPlaylist('${playlist.id}', ${index})">×</button>
            </div>
        `;
        tracksContainer.appendChild(trackDiv);
    });
}

function rimuoviCanzoneDaPlaylist(playlistId, trackIndex) {
    const utente = getUtenteCorrente();
    if (!utente) return;

    const playlist = utente.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const trackName = playlist.canzoni[trackIndex].name;

    if (confirm(`Vuoi rimuovere "${trackName}" dalla playlist?`)) {
        playlist.canzoni.splice(trackIndex, 1);
        playlist.durataTotale = calcolaDurataPlaylist(playlist.canzoni);
        salvaUtente(utente);
        mostraDettagliPlaylist(playlist);
        alert(`"${trackName}" rimossa dalla playlist!`);
    }
}

/* ============================================
   🔹 Comunità: storage, CRUD, membership, ricerca
============================================ */
function getCommunities() {
    const communities = localStorage.getItem("communities");
    return communities ? JSON.parse(communities) : {};
}

function saveCommunities(communities) {
    localStorage.setItem("communities", JSON.stringify(communities));
}

function creaComunita(nome, descrizione, tags = []) {
    const utente = getUtenteCorrente();
    if (!utente) { alert("Devi essere loggato per creare comunità!"); return null; }

    const communities = getCommunities();
    const existingCommunity = Object.values(communities).find(c => c.titolo === nome);
    if (existingCommunity) {
        alert("Esiste già una comunità con questo nome!");
        return null;
    }

    const nuovaComunita = {
        id: generaId(),
        titolo: nome,
        descrizione: descrizione,
        tag: tags,
        ownerUserId: utente.email,
        membriUserIds: [utente.email],
        createdAt: Date.now()
    };

    // Aggiunge la nuova comunità all'oggetto communities usando l'ID come chiave
    communities[nuovaComunita.id] = nuovaComunita;
    // Salva tutte le comunità aggiornate nel localStorage
    saveCommunities(communities);

    // Aggiorna l'utente corrente: aggiunge la comunità all'elenco delle comunità a cui partecipa
    if (!utente.communitiesJoined) utente.communitiesJoined = [];
    utente.communitiesJoined.push(nuovaComunita.id);
    // Salva le modifiche dell'utente nel localStorage
    salvaUtente(utente);

    // Restituisce la comunità appena creata
    return nuovaComunita;
}

function getComunitaUtente() {
    const utente = getUtenteCorrente();
    if (!utente || !utente.communitiesJoined) return [];

    const communities = getCommunities();

    // Restituisce un array di oggetti comunità a cui l'utente è iscritto,
    // eliminando eventuali ID non validi o comunità inesistenti
    return utente.communitiesJoined.map(id => communities[id]).filter(Boolean);
}

function eliminaComunita(communityId) {
    const utente = getUtenteCorrente();
    if (!utente) return;

    const communities = getCommunities();
    const community = communities[communityId];
    if (!community) return;

    if (community.ownerUserId !== utente.email) {
        alert("Solo il proprietario può eliminare questa comunità!");
        return;
    }

    if (confirm(`Vuoi eliminare la comunità "${community.titolo}"?`)) {
        delete communities[communityId];
        saveCommunities(communities);

        if (utente.communitiesJoined) {
            utente.communitiesJoined = utente.communitiesJoined.filter(id => id !== communityId);
            salvaUtente(utente);
        }

        const remainingShares = getSharedPlaylists().filter(s => s.communityId !== communityId);
        saveSharedPlaylists(remainingShares);

        alert("Comunità eliminata con successo!");
        mostraComunita();
        showSection("homePage");
    }
}

function mostraComunita() {
    const container = document.getElementById("communitiesGrid");
    if (!container) return;

    container.innerHTML = "";
    const communities = getComunitaUtente();
    const utente = getUtenteCorrente();

    if (!utente) return;

    communities.forEach(community => {
        const div = document.createElement("div");
        div.classList.add("community-card");
        div.innerHTML = `
            <h3>${community.titolo}</h3>
            <p>${community.descrizione || "Nessuna descrizione"}</p>
            <p><small>${community.tag.join(", ") || "Nessun tag"}</small></p>
            <p><small>${community.membriUserIds.length} membri</small></p>
        `;
        div.onclick = () => apriDettagliComunita(community.id);
        container.appendChild(div);
    });

    const addDiv = document.createElement("div");
    addDiv.classList.add("add-playlist-card");
    addDiv.innerText = "+";
    addDiv.onclick = () => showSection("createCommunityPage");
    container.appendChild(addDiv);
}

function searchCommunities() {
    const query = document.getElementById("searchCommunitiesInput").value.trim().toLowerCase();
    if (!query) {
        document.getElementById("searchCommunitiesResults").innerHTML = "";
        return;
    }

    const communities = getCommunities();
    const utente = getUtenteCorrente();

    const results = Object.values(communities).filter(community => {
        if (community.membriUserIds.includes(utente.email)) return false; //scarta le comunità dove è già presente

        return community.titolo.toLowerCase().includes(query) ||
            (community.descrizione || "").toLowerCase().includes(query) ||
            (community.tag || []).some(tag => tag.toLowerCase().includes(query));
    });

    mostraRisultatiRicercaComunita(results);
    document.getElementById("searchCommunitiesInput").value = "";
}

function mostraRisultatiRicercaComunita(communities) {
    const container = document.getElementById("searchCommunitiesResults");
    container.innerHTML = "";

    if (communities.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Nessuna comunità trovata</p>';
        return;
    }

    communities.forEach(community => {
        const div = document.createElement("div");
        div.classList.add("community-card");
        div.innerHTML = `
            <h3>${community.titolo}</h3>
            <p>${community.descrizione || "Nessuna descrizione"}</p>
            <p><small>${community.tag.join(", ") || "Nessun tag"}</small></p>
            <p><small>${community.membriUserIds.length} membri</small></p>
            <button onclick="uniscitiComunita('${community.id}')" style="margin-top: 10px; background: var(--primary); color: white; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer;">Unisciti</button>
        `;
        container.appendChild(div);
    });
}

function uniscitiComunita(communityId) {
    const utente = getUtenteCorrente();
    if (!utente) return;

    const communities = getCommunities();
    const community = communities[communityId];

    if (!community) return;
    if (community.membriUserIds.includes(utente.email)) {
        alert("Sei già membro di questa comunità!");
        return;
    }

    community.membriUserIds.push(utente.email);
    communities[communityId] = community;
    saveCommunities(communities);

    // Se l'utente non ha ancora l'array communitiesJoined, lo inizializza come vuoto per poterci aggiungere nuove comunità
    if (!utente.communitiesJoined) utente.communitiesJoined = [];
    utente.communitiesJoined.push(communityId);
    salvaUtente(utente);

    alert(`Ti sei unito alla comunità "${community.titolo}"!`);
    mostraComunita();
    searchCommunities();
}

function lasciaComunita(communityId) {
    const utente = getUtenteCorrente();
    if (!utente) return;

    const communities = getCommunities();
    const community = communities[communityId];
    if (!community) return;

    if (community.ownerUserId === utente.email) {
        alert("Il proprietario non può lasciare la propria comunità!");
        return;
    }

    if (confirm(`Vuoi lasciare la comunità "${community.titolo}"?`)) {
        community.membriUserIds = community.membriUserIds.filter(id => id !== utente.email);
        communities[communityId] = community;
        saveCommunities(communities);

        utente.communitiesJoined = utente.communitiesJoined.filter(id => id !== communityId);
        salvaUtente(utente);

        alert(`Hai lasciato la comunità "${community.titolo}"`);
        mostraComunita();
    }
}

/* ============================================
   🔹 Dettaglio comunità: info + condivisioni
============================================ */
function apriDettagliComunita(communityId) {
    const communities = getCommunities();
    const community = communities[communityId];

    if (!community) {
        alert("Comunità non trovata!");
        return;
    }

    mostraDettagliComunita(community);
}

function mostraDettagliComunita(community) {
    showSection("communityDetailPage");

    const titleEl = document.getElementById("communityDetailTitle");
    const infoEl = document.getElementById("communityInfo");
    const membersEl = document.getElementById("communityMembers");
    const actionsEl = document.getElementById("communityActions");

    if (!titleEl || !infoEl || !membersEl || !actionsEl) {
        console.error("❌ Elementi dettaglio comunità mancanti");
        return;
    }

    const utente = getUtenteCorrente();
    const isOwner = utente && (community.ownerUserId === utente.email);

    titleEl.textContent = community.titolo;

    infoEl.innerHTML = `
        <div style="background-color: var(--bg-card); padding: 20px; border-radius: var(--radius); margin-bottom: 20px;">
            <h3>${community.titolo}</h3>
            <p>${community.descrizione || "Nessuna descrizione"}</p>
            <p><strong>Tag:</strong> ${community.tag.join(", ") || "Nessun tag"}</p>
            <p><strong>Membri:</strong> ${community.membriUserIds.length}</p>
            <p><strong>Creata:</strong> ${new Date(community.createdAt).toLocaleDateString()}</p> 
        </div>
    `; //toLocaledateString converte la data salvata con Date.now() in un formato leggibile

    actionsEl.innerHTML = "";
    if (isOwner) {
        const deleteBtn = document.createElement("button");
        deleteBtn.innerText = "🗑️ Elimina Comunità";
        deleteBtn.onclick = () => eliminaComunita(community.id);
        actionsEl.appendChild(deleteBtn);
    } else {
        const leaveBtn = document.createElement("button");
        leaveBtn.className = "community-action-btn community-action-btn--leave";
        leaveBtn.innerHTML = "👋 Lascia comunità";
        leaveBtn.onclick = () => lasciaComunita(community.id);
        actionsEl.appendChild(leaveBtn);
    }

    membersEl.innerHTML = `
        <div style="background-color: var(--bg-card); padding: 20px; border-radius: var(--radius);">
            <h3>Membri della Comunità</h3>
            <p>${community.membriUserIds.length} membri iscritti</p>
        </div>
    `;

    const sharedSection = document.createElement("div");
    sharedSection.className = "community-shared-section";
    sharedSection.innerHTML = `<h3>Condivisioni in questa comunità</h3>`;

    const sharedAll = (typeof getSharedPlaylists === "function")
        ? getSharedPlaylists().filter(s => s.communityId === community.id)
        : [];

    if (sharedAll.length === 0) {
        const empty = document.createElement("p");
        empty.style.color = "var(--text-muted)";
        empty.textContent = "Nessuna playlist condivisa qui.";
        sharedSection.appendChild(empty);
    } else {
        const grid = document.createElement("div");
        grid.className = "community-shared-grid";

        sharedAll.forEach(s => {
            const durataMs = (s.tracks || []).reduce((acc, t) => acc + (t.duration_ms || 0), 0);
            const min = Math.floor(durataMs / 60000);
            const sec = Math.floor((durataMs % 60000) / 1000).toString().padStart(2, '0');

            const card = document.createElement("div");
            card.className = "shared-card";
            card.innerHTML = `
                <h3>${s.title}</h3>
                <p>${s.description || "Nessuna descrizione"}</p>
                <p><strong>Tag:</strong> ${(s.tags || []).join(", ") || "Nessun tag"}</p>
                <p><strong>Brani:</strong> ${s.tracks?.length || 0} • <strong>Durata:</strong> ${min}:${sec}</p>
                <div style="display:flex;gap:8px;margin-top:8px;">
                    <button onclick="importaPlaylistCondivisa('${s.id}')" style="background:#1db954;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;">Importa</button>
                    ${renderUnshareIfOwner(s)}
                </div>
            `;
            grid.appendChild(card);
        });

        sharedSection.appendChild(grid);
    }

    membersEl.after(sharedSection);
}

/* ============================================
   🔹 Creazione comunità (form dedicato)
============================================ */
document.getElementById("communityForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const nome = document.getElementById("communityName").value.trim();
    if (!nome) {
        alert("Il nome della comunità non può essere vuoto!");
        return;
    }

    const tags = document.getElementById("communityTags").value
        .split(",").map(t => t.trim()).filter(t => t);
    const descrizione = document.getElementById("communityDescription").value;

    const nuovaComunita = creaComunita(nome, descrizione, tags);

    if (nuovaComunita) {
        alert("Comunità creata con successo!");
        mostraComunita();
        showSection("homePage");
        this.reset();
    }
});

/* ============================================
   🔹 Condivisioni: storage, dialog, share/unshare
============================================ */
function getSharedPlaylists() {
    const s = localStorage.getItem("shared_playlists");
    return s ? JSON.parse(s) : [];
}

function saveSharedPlaylists(arr) {
    localStorage.setItem("shared_playlists", JSON.stringify(arr));
}

let playlistIdDaCondividere = null;

//quando clicchi su 'condividi' di una playlist
function apriDialogCondivisione(playlistId) {

    const utente = getUtenteCorrente();
    if (!utente) { alert("Devi essere loggato."); return; }

    const mieCommunity = (typeof getComunitaUtente === "function") ? getComunitaUtente() : [];
    if (!mieCommunity || mieCommunity.length === 0) {
        alert("Prima unisciti ad almeno una comunità per poter condividere.");
        return;
    }

    playlistIdDaCondividere = playlistId;

    const playlists = getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) { alert("Playlist non trovata"); return; }

    const nameEl = document.getElementById("shareDialogPlaylistName");
    const select = document.getElementById("shareDialogCommunity");
    const dialog = document.getElementById("shareDialog");

    if (!nameEl || !select || !dialog) {
        console.error("shareDialog elementi mancanti");
        return;
    }

    // Aggiorna il testo del dialog per mostrare il nome della playlist da condividere
    nameEl.textContent = `Playlist: ${pl.nome}`;

    // Popola il menu a tendina con le comunità dell'utente
    select.innerHTML = "";
    mieCommunity.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.titolo;
        select.appendChild(opt);
    });

    dialog.style.display = "flex";
}

function chiudiShareDialog() {
    playlistIdDaCondividere = null;
    const dialog = document.getElementById("shareDialog");
    if (dialog) dialog.style.display = "none";
}

function condividiPlaylistConCommunity() {
    const utente = getUtenteCorrente();
    if (!utente || !playlistIdDaCondividere) return;

    const select = document.getElementById("shareDialogCommunity");
    const communityId = select ? select.value : null;
    if (!communityId) { alert("Seleziona una comunità."); return; }

    const playlists = getPlaylists();
    const pl = playlists.find(p => p.id === playlistIdDaCondividere);
    if (!pl) { alert("Playlist non trovata."); return; }

    const tracksSnapshot = (pl.canzoni || []).map(t => ({ //tracksSnapshots array di canzoni istantaneo
        id: t.id,
        name: t.name,
        artists: t.artists,
        duration_ms: t.duration_ms,
        albumCoverUrl: t.albumCoverUrl || t.album?.images?.[0]?.url || ""
    }));

    const shared = getSharedPlaylists();
    const dup = shared.find(s => s.ownerEmail === utente.email && s.playlistId === pl.id && s.communityId === communityId);
    if (dup) { alert("Questa playlist è già condivisa in questa comunità."); return; }

    shared.push({
        id: "share_" + generaId(),
        communityId,
        playlistId: pl.id,
        ownerEmail: utente.email,
        title: pl.nome,
        description: pl.descrizione || "",
        tags: pl.tags || [],
        tracks: tracksSnapshot,
        createdAt: Date.now()
    });
    saveSharedPlaylists(shared);

    chiudiShareDialog();
    alert("Playlist condivisa con successo!");
}

/* ============================================
   🔹 Esplora Condivise: ricerca + import + unshare
============================================ */
function cercaCondivise() {
    const utente = getUtenteCorrente();
    if (!utente) { alert("Devi essere loggato."); return; }
    const mieCommunity = utente.communitiesJoined || [];
    const input = document.getElementById("sharedQuery");
    const query = (input?.value || "").trim().toLowerCase();

    const all = getSharedPlaylists();
    const visibili = all.filter(s => mieCommunity.includes(s.communityId));

    const filtrati = visibili.filter(s => {
        if (!query) return true;
        const matchTag = (s.tags || []).some(t => t.toLowerCase().includes(query));
        const matchTrack = (s.tracks || []).some(t =>
            (t.name || "").toLowerCase().includes(query) ||
            (t.artists || "").toLowerCase().includes(query)
        );
        const matchTitle = (s.title || "").toLowerCase().includes(query);
        return matchTag || matchTrack || matchTitle;
    });

    renderSharedResults(filtrati);

    if (input) input.value = "";
}

function renderSharedResults(items) {
    const container = document.getElementById("sharedResults");
    if (!container) return;
    container.innerHTML = "";

    if (!items.length) {
        container.innerHTML = '<p style="color:var(--text-muted);">Nessuna playlist trovata.</p>';
        return;
    }

    items.forEach(s => {
        const durataMs = (s.tracks || []).reduce((acc, t) => acc + (t.duration_ms || 0), 0); //durata di tutti i brani
        const min = Math.floor(durataMs / 60000);
        const sec = Math.floor((durataMs % 60000) / 1000).toString().padStart(2, '0');

        const card = document.createElement("div");
        card.className = "shared-card";
        const actions = document.createElement("div");
        actions.style.cssText = "margin-top:8px; display:flex; gap:8px;";

        const importBtn = document.createElement("button");
        importBtn.textContent = "Importa";
        importBtn.style.cssText = "background:#1db954; color:#fff; border:none; border-radius:8px; padding:8px 12px; cursor:pointer;";
        importBtn.onclick = () => importaPlaylistCondivisa(s.id);
        actions.appendChild(importBtn);

        const owner = getUtenteCorrente();
        if (owner && owner.email === s.ownerEmail) {
            const unshareBtn = document.createElement("button");
            unshareBtn.textContent = "Annulla condivisione";
            unshareBtn.style.cssText = "background:#FF4B4B; color:#fff; border:none; border-radius:8px; padding:8px 12px; cursor:pointer;";
            unshareBtn.onclick = () => rimuoviCondivisione(s.id);
            actions.appendChild(unshareBtn);
        }

        card.innerHTML = `
            <h3>${s.title}</h3>
            <p>${s.description || "Nessuna descrizione"}</p>
            <p><strong>Tag:</strong> ${(s.tags || []).join(", ") || "Nessun tag"}</p>
            <p><strong>Brani:</strong> ${s.tracks?.length || 0} • <strong>Durata:</strong> ${min}:${sec}</p>
        `;
        card.appendChild(actions);
        container.appendChild(card);
    });
}

function renderUnshareIfOwner(s) {
    const utente = getUtenteCorrente();
    if (utente && utente.email === s.ownerEmail) {
        return `<button onclick="rimuoviCondivisione('${s.id}')" style="background:#FF4B4B; color:#fff; border:none; border-radius:8px; padding:8px 12px; cursor:pointer;">Annulla condivisione</button>`;
    }
    return "";
}

function importaPlaylistCondivisa(shareId) {
    const utente = getUtenteCorrente();
    if (!utente) return;

    const shared = getSharedPlaylists();
    const s = shared.find(x => x.id === shareId);
    if (!s) { alert("Condivisione non trovata"); return; }

    const nome = prompt(`Nome per importare la playlist "${s.title}":`, s.title);
    if (!nome || !nome.trim()) return;

    const nuova = creaPlaylist(nome.trim(), s.description || "", s.tags || []); //copia descrizione e tag
    if (!nuova) return;

    const utenteAgg = getUtenteCorrente();
    const idx = utenteAgg.playlists.findIndex(p => p.id === nuova.id);
    if (idx === -1) {
        alert("Errore durante l'importazione (playlist non trovata dopo la creazione).");
        return;
    }

    // Copia tutte le canzoni dalla playlist condivisa nella nuova playlist
    utenteAgg.playlists[idx].canzoni = (s.tracks || []).map(t => ({
        id: t.id,
        name: t.name,
        artists: t.artists,
        duration_ms: t.duration_ms,
        albumCoverUrl: t.albumCoverUrl || "",
    }));
    
    utenteAgg.playlists[idx].durataTotale = calcolaDurataPlaylist(utenteAgg.playlists[idx].canzoni);

    salvaUtente(utenteAgg);

    alert("Playlist importata nel tuo profilo!");
    mostraPlaylist();
}

function rimuoviCondivisione(shareId) {
    const utente = getUtenteCorrente();
    const shared = getSharedPlaylists();
    const s = shared.find(x => x.id === shareId);
    if (!s) return;

    if (!utente || utente.email !== s.ownerEmail) {
        alert("Solo il proprietario può annullare la condivisione.");
        return;
    }
    if (!confirm(`Annullare la condivisione di "${s.title}"?`)) return;

    const remain = shared.filter(x => x.id !== shareId);
    saveSharedPlaylists(remain);

    const communityDetailPage = document.getElementById("communityDetailPage");
    if (communityDetailPage && communityDetailPage.style.display === "block") {
        const communities = getCommunities();
        const community = communities[s.communityId];
        if (community && typeof mostraDettagliComunita === "function") {
            mostraDettagliComunita(community);
        }
    }

    if (document.getElementById("sharedResults")) {
        cercaCondivise();
    }

    alert("Condivisione annullata.");
}
