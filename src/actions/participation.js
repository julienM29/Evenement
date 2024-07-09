import connection from "../database.js";

////////////////////////////////////////// PARTICIPATIONS //////////////////////////////////////

export const showParticipations = async (req, res) => {
    const user = req.session.get('user');
    let userId = user.id
    if (!user) {
        return res.redirect('/login');
    }

    return res.view('templates/participations.ejs', {
        user: req.session.get('user'),
    })
}

export const apiEvent = async (userId) => {
    const [result] = await connection.promise().query('SELECT * FROM participation INNER JOIN evenement ON participation.evenement_id = evenement.id WHERE participation.user_id =? ', [userId]);
    const tabEventJSON = result.map(event => ({
        title: event.titre,
        start: event.date_debut_evenement,
        end: event.date_fin_evenement
      }));
    return tabEventJSON
}

