import connection from "../database.js";

////////////////////////////////////////// PARTICIPATIONS //////////////////////////////////////

// Page affichant le calendrier
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


