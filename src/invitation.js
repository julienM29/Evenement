// dataInvitation.js
import { formatDate } from "./actions/evenement.js";
import connection from "./database.js";
import { nbNotifEvenement, nbNotifMessage } from "./discussion.js";

export async function notificationsEvenementNonLus(userId, is_read) {
    console.log('Fetching unread event notifications');

    try {
        const query = `
            SELECT e.id AS evenement_id, ne.reference_id, e.titre, CONCAT(u.prenom, ' ', u.nom) AS identite, u.photo, ne.type, ne.created_at
            FROM evenement.notification_evenement ne
            INNER JOIN evenement.invitation i ON ne.reference_id = i.id
            INNER JOIN evenement.user u ON i.user_id_sender = u.id
            INNER JOIN evenement.evenement e ON e.id = i.evenement_id
            WHERE ne.user_id = ? AND ne.type = 'invitation' AND ne.is_read = ?

            UNION ALL

            SELECT e.evenement_id, ne.reference_id, e2.titre, CONCAT(u.prenom, ' ', u.nom) AS identite, u.photo, ne.type, ne.created_at
            FROM evenement.evaluation e
            INNER JOIN evenement.evenement e2 ON e2.id = e.evenement_id
            INNER JOIN evenement.notification_evenement ne ON ne.reference_id = e.id
            INNER JOIN evenement.user u ON u.id = e.user_id
            WHERE e2.organisateur_id = ? AND ne.is_read = ?

            ORDER BY created_at DESC
        `;

        const [result] = await connection.promise().query(query, [userId, is_read, userId, is_read]);
        console.log(query, [userId, is_read, userId, is_read])
        if (result && result.length > 0) {
            // Formatage des données pour la vue
            return result.map(event => ({
                reference_id: event.reference_id,
                evenement_id: event.evenement_id,
                type: event.type,
                titre: event.titre,
                invitant: event.identite,
                photo: event.photo,
                date: formatDate(event.created_at.toISOString())
            }));
        } else {
            console.log('No unread event notifications found for user:', userId);
            return [];
        }
    } catch (error) {
        console.error('Server error while fetching event notifications:', error);
        throw new Error('Erreur serveur lors de la récupération des notifications d\'événements non lues');
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

export const invitationEvent = async (req,res)=>{
    try {
        const eventId = req.params.id
        const user = req.session.get('user');
        const userId = user.id
        const now = new Date();
        const nowFormatted = formatDate(now)
        const guests = req.body.users
        console.log(guests)
        if (!user) {
            return res.status(401).send('Utilisateur non authentifié');
        }
        for (const guestId of guests) {
            const [invitation] = await connection.promise().query(
                'INSERT INTO invitation (evenement_id, sent_at, user_id_sender, user_id_guest) VALUES (?,?,?,?)',
                [eventId,nowFormatted.dateBDD , userId,  guestId]
            );
            let reference = invitation.insertId
            await connection.promise().query(
                'INSERT INTO notification_evenement (user_id, type, reference_id, created_at) VALUES (?,?,?,?)',
                [guestId, 'invitation',reference , nowFormatted.dateBDD]
            );
        }
        
        
        res.redirect('/'); // Redirection après la création de l'événement
    } catch (error) {
        console.error('Erreur lors de la suppression de la participation :', error);
        return res.status(500).send('Erreur interne du serveur');
    }
}

export const validNotifEvent = async (req,res)=>{
    const ref_id = req.params.ref // Référence id
    const event_id = req.params.event // Évènement id
    const type = req.params.type // type de notification 
    const [validation] = await connection.promise().query(
        'UPDATE notification_evenement SET is_read = 1 WHERE reference_id = ?', [ref_id]
    ); 
    if(type === 'invitation'){
        console.log('invit')
        if(validation){
            res.redirect(`/evenement/${event_id}`)
        }
    }
    if(type === 'evaluation'){
        console.log('eval')
        if(validation){
            res.redirect(`/evaluations/evenement/${event_id}`)
        }
    } 
}
