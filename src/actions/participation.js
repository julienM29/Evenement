import connection from "../database.js";
import { nbNotifEvenement, nbNotifMessage } from "../discussion.js";
import { formatDate } from "./evenement.js";

////////////////////////////////////////// PARTICIPATIONS //////////////////////////////////////

// Page affichant le calendrier
export const showParticipations = async (req, res) => {
    const user = req.session.get('user');
    let userId = user.id
    const nbNotifMessageNonLus = await nbNotifMessage(userId)
    const nbNotifEventNonLus = await nbNotifEvenement(userId)
    if (!user) {
        return res.redirect('/login');
    }

    return res.view('templates/participations.ejs', {
        user: req.session.get('user'),
        nbNotifMessageNonLus: nbNotifMessageNonLus,
        nbNotifEventNonLus: nbNotifEventNonLus
    })
}

export const showMyParticipations = async (req,res)=>{
    const user = req.session.get('user');
    let userId = user.id
    const nbNotifMessageNonLus = await nbNotifMessage(userId)
    const nbNotifEventNonLus = await nbNotifEvenement(userId)
    const [evaluations] = await connection.promise().query(`
        SELECT p.evenement_id, p.user_id, e.titre,e.lieu, e.date_debut_evenement , e.date_fin_evenement, e.statut_id , e.nbParticipants , e.photo, (SELECT COUNT(*) 
            FROM evaluation 
            WHERE user_id = ? AND evenement_id = p.evenement_id) as evaluation_count 
            FROM evenement.participation p
            inner join evenement e on e.id = p.evenement_id 
            where p.user_id =?
            order by e.date_debut_evenement ASC
        `,[userId,userId])
    const evaluationsAvecDetails = await Promise.all(evaluations.map(async evaluation => {
            const dateDebutEvenement = formatDate(evaluation.date_debut_evenement);
            const dateFinEvenement = formatDate(evaluation.date_fin_evenement);
            return { // On modifie les dates et les mots clés ainsi que l'organisateur pour ne pas avoir un id mais des données
                ...evaluation,
                date_debut: dateDebutEvenement,
                date_fin: dateFinEvenement,
            };
        }));
        console.log(evaluationsAvecDetails)
        const users = [
        { id: 1, nom: 'John', prenom: 'Doe', email: 'john.doe@example.com' },
        { id: 2, nom: 'Jane', prenom: 'Doe', email: 'jane.doe@example.com' },
        // Ajoutez plus de données si nécessaire
      ];
    return res.view('templates/mesParticipations.ejs', {
        user: req.session.get('user'),
        nbNotifMessageNonLus: nbNotifMessageNonLus,
        nbNotifEventNonLus: nbNotifEventNonLus,
        users: users,
        evaluations:evaluationsAvecDetails
    })
}

