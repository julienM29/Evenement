function initSearch() {
    document.getElementById('toggleSwitchEvent').addEventListener('change', switchTextToggle)
    document.getElementById('searchButton').addEventListener('click', searchEvent)
    verifyUrl()
}
window.initSearch = initSearch;

let userId = 0
function verifyUrl() {

    let url = new URL(window.location.href)
    const pathSegments = url.pathname.split('/');
    const idUser = pathSegments[pathSegments.length - 1];
    let nomPage = pathSegments[pathSegments.length - 2];
    if (nomPage === 'mesEvenements') {
        console.log('id user : ' + userId)
        userId = idUser
    }
}
function switchTextToggle() {
    let toggle = document.getElementById('textToggleSwitchEvent')
    let toggleText = toggle.innerText
    let passe = 'À venir'
    if (toggleText === passe) {
        toggle.innerText = 'Passé'
    } else {
        toggle.innerText = 'À venir'
    }
    searchEvent();
}

async function searchEvent() {
    let nomRechercher = document.getElementById('nomEvenement').value;
    let lieuRechercher = document.getElementById('lieuEvenement').value;
    let toggle = document.getElementById('textToggleSwitchEvent')
    let toggleText = toggle.innerText
    let statut_id
    let optionsSelect = document.getElementById('motsCles')
    var selectedOptions = optionsSelect.selectedOptions;
    var selectedValues = [];

        for (var i = 0; i < selectedOptions.length; i++) {
            selectedValues.push(selectedOptions[i].value); // Récupère la valeur de chaque option sélectionnée
        }
    if (toggleText === 'À venir') {
        statut_id = 1
    }
    if (toggleText === 'Passé') {
        statut_id = 2
    }
    let body = document.getElementById('dataEvent');
    body.innerHTML = '';

    try {
        const response = await fetch(`/search/${selectedValues}/${lieuRechercher}/${nomRechercher}/${statut_id}/${userId}`);
        const data = await response.json();

        for (let i = 0; i < data.length; i++) {
            const evenement = data[i];

            const divEvent = document.createElement('div');
            divEvent.classList = 'col mb-5 hover-overlay position-relative rounded';

            const lienEvent = document.createElement('a');
            lienEvent.href = `/evenement/${evenement.id}`;
            lienEvent.classList = 'text-decoration-none text-black';

            const eventCard = createEventCard(evenement);
            lienEvent.appendChild(eventCard);
            divEvent.appendChild(lienEvent);
            body.appendChild(divEvent);
        }
    } catch (err) {
        console.error('Erreur lors de la recherche des événements:', err);
    }
}

function createEventCard(evenement) {
    // Créer la div principale de la carte
    const card = document.createElement('div');
    card.className = 'card border-0 cardEvents bg-transparent';

    // Créer la structure HTML de la carte en utilisant les propriétés de l'objet `evenement`
    card.innerHTML = `
        <div class="w-100 hover-zoom-bg">
            <div class="w-100 position-relative overflow-hidden hover-zoom-bg image-container">
                <img src="http://localhost:3000/images/${evenement.photo}" class="hover-zoom" style="max-height: 300px; min-height: 300px;">
            </div>
            <h5 class="card-title mt-3 mb-3 text-center fw-bold fs-3">
                ${evenement.titre}
            </h5>
            <div class="w-100 mb-2 d-flex align-items-center justify-content-center">
                <img src="http://localhost:3000/images/time-and-calendar.png" width="30" height="30" class="mx-2">
                <div class="ml-2 fw-normal">
                    ${evenement.date_debut_evenement.dateFormatee} - ${evenement.date_fin_evenement.dateFormatee}
                </div>
            </div>
            <div class="w-100 mb-2 d-flex align-items-center justify-content-center ">
                <img src="http://localhost:3000/images/espace-reserve.png" width="30" height="30" class="mx-2">
                <div class="ml-2 fw-normal">
                    ${evenement.nom_ville}
                </div>
            </div>
            <div class="w-100 d-flex justify-content-center">
                    <a href="/evenement/${evenement.id}"
                        class="btn btn-cool-blues btn-rounded fs-4 fw-bold text-decoration-none me-2 mt-3 mb-3 fs-4" style="width:40%;">
                        Évènement
                    </a>
                ${evenement.statut_id === 2 ? `
                    <a href="/evaluations/evenement/${evenement.id}"
                        class="btn btn-cool-blues btn-rounded fs-4 fw-bold text-decoration-none ms-2 mt-3 mb-3 fs-4" style="width:40%;">
                        Évaluations
                    </a>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}


