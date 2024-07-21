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

export async function dataNotificationsEvenement(userId, type) {
    console.log('data invitation' + userId)
    try {
        const [result] = await connection.promise().query(`
        SELECT ne.user_id, ne.type, ne.reference_id, ne.created_at, ne.is_read,
               CONCAT(u.prenom, ' ', u.nom) AS identite, u.photo AS photo,
               i.user_id_sender,
               e.titre
        FROM notification_evenement ne
        INNER JOIN invitation i ON ne.reference_id = i.id
        INNER JOIN user u ON i.user_id_sender = u.id
        INNER JOIN evenement e ON e.id = i.evenement_id
        WHERE ne.user_id = ? AND ne.type = ?`, [userId, type]);

        if (result && result.length > 0) {
            // Formatage des données pour la vue
            return result.map(event => ({
                evenement_id: event.reference_id,
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
    const [nbNotifMessageNonLus, nbNotifEventNonLus, invitationNonLus] = await Promise.all([
        nbNotifMessage(user_id),
        nbNotifEvenement(user_id),
        dataNotificationsEvenement(user_id, 'invitation'),
    ]);
    console.log('Données récupérées');
    console.log(invitationNonLus);

    return res.view('templates/invitation.ejs', {
        user: user,
        nbNotifEventNonLus: nbNotifEventNonLus,
        nbNotifMessageNonLus: nbNotifMessageNonLus,
        invitationsNonLus: invitationNonLus
    });
}
