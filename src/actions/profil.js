import connection from "../database.js"
// Page Affichant le profil
export const showProfil = async (req, res) => {
    const postId = req.params.id; // Récupération de l'id dans l'url

    const [results] = await connection.promise().query('SELECT * FROM user WHERE id =? ', [postId]);
    const user = results[0] // On récupère les résultats SQL dans un tableau donc obligé de passer par une variable tableau
    return res.view('templates/profil.ejs', {
        user: user
    })
}