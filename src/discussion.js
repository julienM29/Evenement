import connection from "./database.js";

// Fonction pour formatter la date venant de la BDD
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
        dateFormatee: `${jour}-${mois}-${annee} ${heures}:${minutes}`
    };
};
function getFormattedDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const jour = `${month}- ${day}`
    const heure = `${hours}:${minutes}:${seconds}`
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
// Récupérer les données des discussions pour en faire une variable contenant les informations des tables concernées
async function getDiscussions (user_id){
// Récupération des discussions de l'utilisateur
const [discussions] = await connection.promise().query(
    `SELECT * FROM discussion 
    INNER JOIN discussion_participants ON discussion.id = discussion_participants.discussion_id
    WHERE discussion_participants.user_id =?`,
    [user_id]
);
// Récupérations du dernier message de chaque discussion
const discussionsWithMessages = await Promise.all(discussions.map(async discussion => {
    const [messages] = await connection.promise().query(
        `SELECT discussion_id, sender_id, message_text, sent_at, u.nom  as nom, u.prenom as prenom
         FROM message m
         JOIN user u ON m.sender_id = u.id
         WHERE m.discussion_id = ?
         LIMIT 1`,
        [discussion.id]
    );
    // Récupération des informations des participants pour chaque discussion
    const [participants] = await connection.promise().query(
        `SELECT *, user.nom AS nom , user.prenom AS prenom , user.photo AS photo, user.id AS id
        FROM discussion_participants
        INNER JOIN user ON discussion_participants.user_id = user.id
        WHERE discussion_id =?`,
        [discussion.id]
    );
    // Nouvelle valeurs pour la variable
    return {
        ...discussion,
        messages: messages,
        participants: participants
    };
}));
return discussionsWithMessages
}
// Fonction pour récupérer les informations d'une discussion
async function getDiscussion (discussion_id, user_id){
    // Récupération des discussions de l'utilisateur
    const [discussions] = await connection.promise().query(
        `SELECT * FROM discussion 
        INNER JOIN discussion_participants ON discussion.id = discussion_participants.discussion_id
        WHERE discussion_participants.user_id =?
        AND discussion.id =?`,
        [user_id, discussion_id]
    );
    
    const discussionsWithMessages = await Promise.all(discussions.map(async discussion => {
        const [messages] = await connection.promise().query(
            `SELECT discussion_id, sender_id, message_text, sent_at, u.nom  as nom, u.prenom as prenom, u.photo as photo
             FROM message m
             JOIN user u ON m.sender_id = u.id
             WHERE m.discussion_id = ?
             `,
            [discussion.id]
        );
        const formattedMessages = messages.map(message => {
            const formattedDate = formatDate(message.sent_at);
            return {
                ...message,
                sent_at: formattedDate,
            };
        });
        const [participants] = await connection.promise().query(
            `SELECT *, user.nom AS nom , user.prenom AS prenom , user.photo AS photo, user.id AS id
            FROM discussion_participants
            INNER JOIN user ON discussion_participants.user_id = user.id
            WHERE discussion_id =?`,
            [discussion.id]
        );
        return {
            ...discussion,
            messages: formattedMessages,
            participants: participants
        };
    }));
    return discussionsWithMessages
    }

// Page de messagerie    
export const showMessage = async (req, res) => {
    const user = req.session.get('user')
    const user_id = user.id

    if (req.method === 'GET') {
        // Utilisateurs pour le select (choix pour envoyer un message)
        const [users] = await connection.promise().query('SELECT * FROM user ');
        const discussionsWithMessages = await getDiscussions(user_id)
     
        return res.view('templates/messagerie.ejs', {
            user: user,
            users: users,
            discussions: discussionsWithMessages,
        });
    }
    if (req.method === "POST") {
        const body = req.body
        const now = getFormattedDate()
        const participants = body.selectedUserIds.split(',').map(id => id.trim()); // Assurez-vous que participants est un tableau d'IDs
        participants.push(user_id)
        const message = body.message
        let discussionId
        // Recherche si une discussion entre les ID des utilisateurs sélectionnés existe déjà
        // La sous requete dans le join permet de récupérer les discussions dont le nombre de participants est égal au nombre de participant qu'il y a dans participants
        // La requete Join permet d'associer chaque entrée de la table discussion_participants au résultat de la sous requete grâce au dp.discussion_id = d2.discussion_id
        // Le WHERE permet de filtrer les discussion pour inclure seulement celles où les urser_id sont présent dans la liste
        // Le group By regroupe les discussion par id
        // Le having permet d'avoir le nombre de participants spécifié
        // On récupère l'id de la discussion dont les participants sélectionnés sont les seuls à être présent dedans
        const [existingDiscussions] = await connection.promise().query(
            `SELECT dp.discussion_id
                                FROM discussion_participants dp
                                JOIN (
                                    SELECT discussion_id
                                    FROM discussion_participants
                                    GROUP BY discussion_id
                                    HAVING COUNT(user_id) = ?
                                ) d2 ON dp.discussion_id = d2.discussion_id
                                WHERE dp.user_id IN (?)
                                GROUP BY dp.discussion_id
                                HAVING COUNT(dp.user_id) = ?`,
            [participants.length, participants, participants.length]
        );
        if (existingDiscussions.length === 0) { // Si la discussion n'existe pas

            const [discussion] = await connection.promise().query('INSERT INTO discussion (created_at) VALUES (?)',
                [now]);
            discussionId = discussion.insertId;
            for (const participantId of participants) {
                await connection.promise().query(
                    'INSERT INTO discussion_participants (discussion_id, user_id) VALUES (?, ?)',
                    [discussionId, participantId]
                );
            }
        } else {
            discussionId = existingDiscussions[0].discussion_id;
        }

        // Créer un message id id_discussion sender_id message_text sent_at
        const [result] = await connection.promise().query('INSERT INTO message ( discussion_id, sender_id, message_text, sent_at) VALUES (?,?,?,?)',
            [discussionId, user_id, message, now]);
        if (result) {
            res.redirect(`/messagerie/${user_id}`)
        }

    }
}
// Page affichant une discussion
export const showDiscussion = async (req,res)=>{
    const discussion_id = req.params.id
    const user = req.session.get('user')
    const user_id = user.id

    if (req.method === 'GET') {
        // Utilisateurs pour le select (choix pour envoyer un message)
        const [users] = await connection.promise().query('SELECT * FROM user ');
        const discussionsWithMessages = await getDiscussion(discussion_id,user_id)

        return res.view('templates/discussion.ejs', {
            user: user,
            users: users,
            discussion: discussionsWithMessages[0],
        });
    }
    if(req.method === 'POST'){
        const now = getFormattedDate()
        const message = req.body.message
        const [result] = await connection.promise().query('INSERT INTO message ( discussion_id, sender_id, message_text, sent_at) VALUES (?,?,?,?)',
            [discussion_id, user_id, message, now]);
        if (result) {
            res.redirect(`/discussion/${discussion_id}`)
        } 
    }

}