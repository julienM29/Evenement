// Fonction servant pour la page de modification d'un évènement
function initAccueil() {
    // Input file
    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('imgToInputFile').addEventListener('click', function () {
            document.getElementById('fileInput').click()
        });
        //Input date début évènement
        document.getElementById('dateDebutDiv').addEventListener('click', function () {
            document.getElementById('dateDebutInput').showPicker()
        });
        document.getElementById('dateDebutInput').addEventListener('change', changeDebutInput)
        // Input date fin évènement
        document.getElementById('dateFinalDiv').addEventListener('click', function () {
            document.getElementById('dateFinalInput').showPicker()
        });
        document.getElementById('dateFinalInput').addEventListener('change', changeFinInput)
        // Date fin inscription
        document.getElementById('dateInscriptionDiv').addEventListener('click', function () {
            document.getElementById('dateInscriptionInput').showPicker()
        });
        document.getElementById('dateInscriptionInput').addEventListener('change', changeInscriptionInput)

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
    updateLimitsValueInput()
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
    updateLimitsValueInput()

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
    updateLimitsValueInput()

}

function updateLimitsValueInput() {
    const endRegistration = document.getElementById('dateInscriptionInput');
    const startEvent = document.getElementById('dateDebutInput');
    const endEvent = document.getElementById('dateFinalInput');

    const endRegistrationValue = new Date(endRegistration.value);
    const startEventValue = new Date(startEvent.value);
    const endEventValue = new Date(endEvent.value);

    // Mise à jour des limites pour la date de début d'évènement
    if (endRegistration.value) {
        startEvent.min = endRegistration.value;
    } else {
        startEvent.min = "";
    }

    // Mise à jour des limites pour la date de fin d'évènement
    if (startEvent.value) {
        endEvent.min = startEvent.value;
    } else {
        endEvent.min = "";
    }

    // Mise à jour des limites pour la date de fin d'inscription
    if (startEvent.value) {
        endRegistration.max = startEvent.value;
    } else {
        endRegistration.max = "";
    }

    // Validation des dates pour s'assurer qu'elles respectent les contraintes
    if (endRegistrationValue > startEventValue) {
        endRegistration.value = '';
    }

    if (startEventValue > endEventValue) {
        endEvent.value = '';
    }
}
