import connection from "../database.js"

export const listeEvent = (req, res) => {
    return res.view('templates/index.ejs', {
        user: req.session.get('user')
    })
}
export const showEvent =  (req,res) => {
  
    return res.view('templates/evenement.ejs')
}
export const showProfil = async(req,res) => {
    const postId = req.params.id;

    const [results] = await connection.promise().query('SELECT * FROM user WHERE id =? ', [postId]);
    const user = results[0]
    return res.view('templates/profil.ejs', {
        user: user
    })
}
export const createEvent = (req,res) => {
    return res.view('templates/creation.ejs')
}

export const createKeyWords = (req,res)=>{
    return res.view('templates/motsCles.ejs')
}