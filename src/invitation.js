// dataInvitation.js
import connection from "./database.js";
import { nbNotifEvenement, nbNotifMessage } from "./discussion.js";

const formatDate = (dateString) => {
    const dateObj = new Date(dateString);
    const jour = dateObj.getDate().toString().padStart(2, '0');
    const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const moisNom = moisNoms[(dateObj.getMonth())];

    const mois = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const annee = dateObj.getFullYear();
    const heures = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');

    return {
        jour,
        mois,
        annee,
        moisNom,
        heures,
        minutes,
        dateFormatee: `${jour}-${mois}-${annee} ${heures}:${minutes}`,
        dateBDD: `${annee}-${mois}-${jour} ${heures}:${minutes}`
    };
};

export async function notificationsEvenementNonLus(userId, is_read) {
    try {
        const [result] = await connection.promise().query(`
        SELECT  e.id AS evenement_id,ne.reference_id,e.titre ,CONCAT(u.prenom, ' ', u.nom) AS identite, u.photo ,ne.type , ne.created_at           
        FROM notification_evenement ne
        INNER JOIN invitation i ON ne.reference_id = i.id
        INNER JOIN user u ON i.user_id_sender = u.id
        INNER JOIN evenement e ON e.id = i.evenement_id
        WHERE ne.user_id = ? AND ne.type = 'invitation' AND ne.is_read = ?
        union ALL        
        SELECT  e.evenement_id,ne.reference_id ,  e2.titre , CONCAT(u.prenom, ' ', u.nom) AS identite, u.photo, ne.type ,ne.created_at
                FROM evenement.evaluation e 
                inner join evenement e2 on e2.id = e.evenement_id 
                inner join notification_evenement ne on ne.reference_id = e.id 
                inner join user u on u.id = e.user_id 
                where e2.organisateur_id = ? and ne.is_read = ?
        order by created_at DESC
            `, [userId, is_read,userId, is_read]);

        if (result && result.length > 0) {
            // Formatage des données pour la vue
            return result.map(event => ({
                reference_id: event.reference_id,
                evenement_id: event.evenement_id,
                type: event.type,
                titre: event.titre,
                invitant: event.identite, // Concaténation des noms
                photo: event.photo,
                date: formatDate(event.created_at.toISOString()) // Format ISO
            }));
            
        } else {
            console.log('No events found for user');
            return []; // Retourner un tableau vide si aucune invitation n'est trouvée
        }
    } catch (error) {
        console.error('Erreur serveur :', error);
        throw new Error('Erreur serveur');
    }
}
export const showInvitations = async (req, res) => {
    const user = req.session.get('user');
    const user_id = user.id;
    const [nbNotifMessageNonLus, nbNotifEventNonLus, notificationsNonLus, notificationsLus] = await Promise.all([
        nbNotifMessage(user_id),
        nbNotifEvenement(user_id),
        notificationsEvenementNonLus(user_id, 0),
        notificationsEvenementNonLus(user_id, 1),
    ]);

    return res.view('templates/invitation.ejs', {
        user: user,
        nbNotifEventNonLus: nbNotifEventNonLus,
        nbNotifMessageNonLus: nbNotifMessageNonLus,
        notificationsNonLus: notificationsNonLus,
        notificationsLus: notificationsLus
    });
}

export const validNotifEvent = async (req,res)=>{
    const ref_id = req.params.ref // Référence id
    const event_id = req.params.event // Évènement id
    const [validation] = await connection.promise().query(
        'UPDATE notification_evenement SET is_read = 1 WHERE reference_id = ?', [ref_id]
    ); 
    if(validation){
        res.redirect(`/evenement/${event_id}`)
    }
    
}
