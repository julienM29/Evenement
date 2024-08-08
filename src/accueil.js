
// Fonction servant pour la page de modification d'un évènement
function initAccueil() {
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

