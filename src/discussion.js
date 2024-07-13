import connection from "./database.js";

function getFormattedDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export const showMessage = async (req, res) => {
    const user = req.session.get('user')
    const user_id = user.id

    if (req.method === 'GET') {
        // Utilisateurs pour le select (choix pour envoyer un message)
        const [users] = await connection.promise().query('SELECT * FROM user ');
        // const [users] = await connection.promise().query('SELECT * FROM user WHERE NOT id = ?', [user_id]);

        // Récupération des discussions de l'utilisateur
        const [discussions] = await connection.promise().query(
            `SELECT * FROM discussion 
            INNER JOIN discussion_participants ON discussion.id = discussion_participants.discussion_id
            WHERE discussion_participants.user_id =?`,
            [user_id]
        );

        const discussionsWithMessages = await Promise.all(discussions.map(async discussion => {
            const [messages] = await connection.promise().query(
                `SELECT m.*, u.nom, u.prenom
                 FROM message m
                 JOIN user u ON m.sender_id = u.id
                 WHERE m.discussion_id = ?`,
                [discussion.id]
            );
            const [participants] = await connection.promise().query(
                `SELECT *, user.nom AS nom , user.prenom AS prenom 
                FROM discussion_participants
                INNER JOIN user ON discussion_participants.user_id = user.id
                WHERE discussion_id =?`,
                [discussion.id]
            );
            return {
                ...discussion,
                messages: messages,
                participants: participants
            };
        }));
        console.log('discussion  ')
        console.log(discussionsWithMessages)
        console.log(' message ')
        console.log(discussionsWithMessages[0].messages)
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
        // Créer une discussion id participants
        const [existingDiscussions] = await connection.promise().query(
            `SELECT d.id
             FROM discussion d
             JOIN discussion_participants dp ON d.id = dp.discussion_id
             WHERE dp.user_id IN (?)
             GROUP BY d.id
             HAVING COUNT(DISTINCT dp.user_id) = ?`,
            [participants, participants.length]
        );
        if (existingDiscussions.length === 0) {

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
            discussionId = existingDiscussions[0].id;
        }

        // Update une discussion

        // Créer un message id id_discussion sender_id message_text sent_at
        const [result] = await connection.promise().query('INSERT INTO message ( discussion_id, sender_id, message_text, sent_at) VALUES (?,?,?,?)',
            [discussionId, user_id, message, now]);
        if (result) {
            res.redirect(`/messagerie/${user_id}`)
        }

    }
}