
const accesToken = "pk.2716a119e7e25728fabf60cdc7af03e7";

// Fonction servant pour la page de modification d'un évènement
function initAccueil() {
    console.log('coucou')
    // Input file
    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('imgToInputFile').addEventListener('click', function () {
        document.getElementById('fileInput').click()
        });
        //Input date début évènement
        document.getElementById('dateDebutDiv').addEventListener('click', function () {
        document.getElementById('datePickerDebut').click()
        });
        // Input date fin évènement
        document.getElementById('dateFinalDiv').addEventListener('click', function () {
        document.getElementById('datePickerFin').click()
        });
        // Input date limite d'inscription
        document.getElementById('dateInscriptionDiv').addEventListener('click', function () {
        document.getElementById('datePickerInscription').click()
        });
        document.getElementById('dateDebutInput').addEventListener('change', changeDebutInput)
        document.getElementById('dateFinalInput').addEventListener('change', changeFinInput)
        document.getElementById('dateInscriptionInput').addEventListener('change', changeInscriptionInput)
        document.getElementById('lieu').addEventListener('change', changeSelectVille)
        document.getElementById('selectVille').addEventListener('change', selectVilleInput);
    });
    document.addEventListener('DOMContentLoaded', function () {
        flatpickrForm ()
    });
    document.getElementById('fileInput').addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const preview = document.getElementById('imagePreview');
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

}
window.initAccueil = initAccueil

const moisNom = {
    "01": "Janvier",
    "02": "Février",
    "03": "Mars",
    "04": "Avril",
    "05": "Mai",
    "06": "Juin",
    "07": "Juillet",
    "08": "Août",
    "09": "Septembre",
    "10": "Octobre",
    "11": "Novembre",
    "12": "Décembre"
}

function flatpickrForm (){
    let startPicker = flatpickr('#datePickerDebut', {
        enableTime: true,
        dateFormat: 'Y-m-d H:i',
        locale: 'fr',
        defaultDate: document.getElementById('datePickerDebut').innerText,
        onChange: function (selectedDates, dateStr, instance) {
            const formattedDate = instance.formatDate(selectedDates[0], 'Y-m-dTH:i');
            document.getElementById('dateDebutInput').value = formattedDate;
            changeDebutInput();
            limitPicker.set('maxDate', dateStr);
            endPicker.set('minDate', dateStr);
        }
    });

    let endPicker = flatpickr('#datePickerFin', {
        enableTime: true,
        dateFormat: 'Y-m-d H:i',
        locale: 'fr',
        defaultDate: document.getElementById('datePickerFin').innerText,
        onChange: function (selectedDates, dateStr, instance) {
            const formattedDate = instance.formatDate(selectedDates[0], 'Y-m-dTH:i');
            document.getElementById('dateFinalInput').value = formattedDate;
            changeFinInput();
            startPicker.set('maxDate', dateStr);
        }
    });

    let limitPicker = flatpickr('#datePickerInscription', {
        enableTime: true,
        dateFormat: 'Y-m-d H:i',
        locale: 'fr',
        defaultDate: document.getElementById('datePickerInscription').innerText,
        onChange: function (selectedDates, dateStr, instance) {
            const formattedDate = instance.formatDate(selectedDates[0], 'Y-m-dTH:i');
            document.getElementById('dateInscriptionInput').value = formattedDate;
            changeInscriptionInput();
            startPicker.set('maxDate', dateStr);
        }
    });
}
function changeDebutInput() {
    const valueInput = document.getElementById('dateDebutInput').value;
    const tabHoraire = valueInput.split(/[-T]/)
    const annee = tabHoraire[0];
    const mois = tabHoraire[1];
    const jour = tabHoraire[2];
    const heure = tabHoraire[3];
    document.getElementById('debutEvenementJour').textContent = jour
    document.getElementById('debutEvenementMois').textContent = moisNom[mois]
    document.getElementById('debutEvenementHeure').textContent = heure
    document.getElementById('debutEvenementAnnee').textContent = annee
}

function changeFinInput() {
    const valueInput = document.getElementById('dateFinalInput').value;
    const tabHoraire = valueInput.split(/[-T]/)
    const annee = tabHoraire[0];
    const mois = tabHoraire[1];
    const jour = tabHoraire[2];
    const heure = tabHoraire[3];

    document.getElementById('finEvenementJour').textContent = jour
    document.getElementById('finEvenementMois').textContent = moisNom[mois]
    document.getElementById('finEvenementHeure').textContent = heure
    document.getElementById('finEvenementAnnee').textContent = annee

}
function changeInscriptionInput() {
    const valueInput = document.getElementById('dateInscriptionInput').value;
    const tabHoraire = valueInput.split(/[-T]/)
    const annee = tabHoraire[0];
    const mois = tabHoraire[1];
    const jour = tabHoraire[2];
    const heure = tabHoraire[3];

    document.getElementById('inscriptionEvenementJour').textContent = jour
    document.getElementById('inscriptionEvenementMois').textContent = moisNom[mois]
    document.getElementById('inscriptionEvenementHeure').textContent = heure
    document.getElementById('inscriptionEvenementAnnee').textContent = annee
}

function changeSelectVille() {
    const adresse = document.getElementById('lieu').value;
    let adresseModif = encodeURIComponent(adresse); // Encodage de l'adresse pour l'URL

    let conteneur = document.getElementById('selectVille');
    conteneur.innerHTML = "";

    let optionDeBase = document.createElement("option");
    optionDeBase.text = "Sélectionner un lieu";
    optionDeBase.value = 0; // Vous pouvez utiliser index comme valeur ou une autre valeur unique
    conteneur.appendChild(optionDeBase)

    fetch(`https://nominatim.openstreetmap.org/search?q=${adresseModif}&format=json&addressdetails=1&limit=7
`)
        .then(res => res.json())
        .then(json => {
            json.forEach((result, index) => {
                const address = result.address; // result étant l'objet de réponse pour chaque lieu
                let ville = address.city || address.town || address.village || address.hamlet; // Permet de préciser la recherche du nom de la ville ( pas pareil entre une petite ville et une capitale)

                let adresse = result.display_name;
                let localisation = [result.lat, result.lon, ville]
                console.log(adresse)
                let option = document.createElement("option");
                option.text = adresse;
                option.value = localisation; // Vous pouvez utiliser index comme valeur ou une autre valeur unique
                conteneur.appendChild(option);
            });

        });
}

function selectVilleInput() {
    const conteneurAdresse = document.getElementById('lieu');
    let lieuSelectionner = document.getElementById('selectVille');
    const selectedOption = lieuSelectionner.options[lieuSelectionner.selectedIndex];
    const localisation = selectedOption.value.split(',')
    
    document.getElementById('latitude').value = localisation[0]
    document.getElementById('longitude').value = localisation[1]
    document.getElementById('ville').value = localisation[2]
    conteneurAdresse.value = selectedOption.innerText
}
