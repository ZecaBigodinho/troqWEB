require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const validator = require('validator'); // <-- Adicionado para validação de email

// --- SELETOR DE BANCO DE DADOS ---
const db = process.env.DB_MODE === 'json' ? require('./db_json') : require('./db_postgres');
const app = express();
const PORT = 3001;

// --- Configuração do Cloudinary ---
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
// --- Configuração do Multer (Armazenamento em Memória) ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Regex para validar formato de telefone (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;

// --- Middlewares ---
app.use(express.json()); // Para parsing de JSON
app.use(express.static(path.join(__dirname, 'public'))); // Servir arquivos estáticos
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { secure: false, maxAge: 3600000 } })); // Configuração da sessão

// --- Middleware de Autenticação ---
const isAuthenticated = (req, res, next) => {
    if (req.session.user) { next(); } else { res.redirect('/login.html'); }
};

// --- ROTAS DA API ---

// Verifica se o usuário está logado
app.get('/api/auth/status', (req, res) => {
    if (req.session.user) { res.status(200).json({ loggedIn: true, user: req.session.user }); } else { res.status(200).json({ loggedIn: false }); }
});

// Registra um novo usuário (COM VALIDAÇÃO DE EMAIL)
app.post('/register', async (req, res) => {
    try {
        const { fullname, email, password } = req.body;
        if (!fullname || !email || !password) { return res.status(400).json({ message: 'Todos os campos são obrigatórios!' }); }
        // VALIDAÇÃO EMAIL
        if (!validator.isEmail(email)) { return res.status(400).json({ message: 'Formato de e-mail inválido.' }); }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.createUser({ fullname, email, hashedPassword });
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
    } catch (error) {
        if(error.code === '23505' || error.message.includes('UNIQUE constraint failed')){ return res.status(409).json({ message: 'Este e-mail já está em uso.' }); }
        console.error("Erro no registro:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

// Realiza o login do usuário (COM VALIDAÇÃO DE EMAIL)
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // VALIDAÇÃO EMAIL
        if (!validator.isEmail(email)) { return res.status(401).json({ message: 'Email ou senha inválidos.' }); } // Mensagem genérica por segurança

        const user = await db.findUserByEmail(email);
        if (!user || !await bcrypt.compare(password, user.password)) { return res.status(401).json({ message: 'Email ou senha inválidos.' }); }
        req.session.user = { id: user.id, fullname: user.fullname, email: user.email, avatar_url: user.avatar_url };
        res.status(200).json({ message: `Login bem-sucedido!`, redirectUrl: '/home.html' });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

// Realiza o logout do usuário
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) { console.error("Erro ao fazer logout:", err); return res.status(500).send('Não foi possível fazer logout.'); }
        res.redirect('/login.html');
    });
});

// Cria uma nova oferta (COM VALIDAÇÃO DE TELEFONE)
app.post('/api/offers', isAuthenticated, upload.single('offerImage'), async (req, res) => {
    try {
        const { offerType, title, description, phone, address } = req.body;
        const userId = req.session.user.id;
        if (!offerType || !title) { return res.status(400).json({ message: 'O tipo e o título da oferta são obrigatórios.' }); }
        // VALIDAÇÃO TELEFONE (se preenchido)
        if (phone && phone.trim() !== '' && !phoneRegex.test(phone)) {
             return res.status(400).json({ message: 'Formato de telefone inválido. Use (XX) XXXXX-XXXX.' });
        }

        const saveOfferToDb = async (imageUrl) => {
            try {
                const newOffer = await db.createOffer({ userId, offerType, title, description, imageUrl, phone, address });
                res.status(201).json({ message: 'Oferta publicada com sucesso!', offerId: newOffer.id });
            } catch (dbError) { console.error("Erro ao salvar oferta no DB:", dbError); res.status(500).json({ message: 'Erro interno ao salvar os dados da oferta.' }); }
        };

        if (req.file) {
            let cld_upload_stream = cloudinary.uploader.upload_stream( { folder: "troq_offers" }, (error, result) => {
                if (error) { console.error('Erro no upload para Cloudinary:', error); saveOfferToDb(null); }
                else { console.log('Upload para Cloudinary concluído:', result.secure_url); saveOfferToDb(result.secure_url); }
            });
            streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);
        } else { saveOfferToDb(null); }
    } catch (error) { console.error("Erro geral ao processar POST /api/offers:", error); res.status(500).json({ message: 'Erro interno no servidor ao processar a requisição.' }); }
});

// Busca ofertas (com filtro opcional de busca e categoria)
app.get('/api/offers', async (req, res) => {
    try {
        const searchTerm = req.query.search;
        const category = req.query.category;
        console.log(`Buscando ofertas com termo: '${searchTerm}', categoria: '${category}'`);
        const offers = await db.getAllOffers(searchTerm, category);
        res.status(200).json(offers);
    } catch (error) { console.error("Erro ao buscar ofertas:", error); res.status(500).json({ message: 'Erro interno no servidor ao buscar ofertas.' }); }
});

// Busca os detalhes de uma oferta específica
app.get('/api/offers/:id', async (req, res) => {
    try {
        const offer = await db.getOfferById(req.params.id);
        if (!offer) return res.status(404).json({ message: 'Oferta não encontrada.' });
        res.status(200).json(offer);
    } catch (error) { console.error("Erro ao buscar oferta por ID:", error); res.status(500).json({ message: 'Erro interno no servidor.' }); }
});

// Busca as ofertas do usuário logado
app.get('/api/my-offers', isAuthenticated, async (req, res) => {
    try {
        const offers = await db.getMyOffers(req.session.user.id);
        res.status(200).json(offers);
    } catch (error) { console.error("Erro ao buscar 'minhas ofertas':", error); res.status(500).json({ message: 'Erro interno no servidor.' }); }
});

// Deleta uma oferta do usuário logado
app.delete('/api/offers/:id', isAuthenticated, async (req, res) => {
    try {
        await db.deleteOffer(req.params.id, req.session.user.id);
        res.status(200).json({ message: 'Oferta deletada com sucesso!' });
    } catch (error) {
        console.error("Erro ao deletar oferta:", error);
        const message = error.message === 'Acesso negado' ? 'Acesso negado' : (error.message === 'Oferta não encontrada' ? 'Oferta não encontrada' : 'Erro interno no servidor.');
        const status = error.message === 'Acesso negado' ? 403 : (error.message === 'Oferta não encontrada' ? 404 : 500);
        res.status(status).json({ message });
    }
});

// Busca os dados da conta do usuário logado (perfil)
app.get('/api/account', isAuthenticated, async (req, res) => {
    try {
        const user = await db.findUserById(req.session.user.id);
        if(!user) {
             req.session.destroy();
             return res.status(404).json({message: "Usuário não encontrado, sessão encerrada."});
        }
        res.status(200).json({id: user.id, fullname: user.fullname, email: user.email, avatar_url: user.avatar_url});
    } catch(error){ console.error("Erro ao buscar dados da conta:", error); res.status(500).json({ message: 'Erro ao buscar dados da conta.' }); }
});

// Atualiza os dados da conta do usuário logado (COM VALIDAÇÃO DE EMAIL)
app.put('/api/account', isAuthenticated, upload.single('profilePic'), async (req, res) => {
    try {
        const { fullname, email } = req.body;
        const userId = req.session.user.id;
        let currentAvatarUrl = req.session.user.avatar_url || null;
        if (!fullname || !email) { return res.status(400).json({ message: 'Nome e email são obrigatórios.' }); }
        // VALIDAÇÃO EMAIL
        if (!validator.isEmail(email)) { return res.status(400).json({ message: 'Formato de e-mail inválido.' }); }

        const updateDatabase = async (newAvatarUrl) => {
            try {
                const updatedUser = await db.updateUser(userId, { fullname, email, avatarUrl: newAvatarUrl });
                req.session.user = { ...req.session.user, ...updatedUser };
                res.status(200).json({ message: 'Perfil atualizado com sucesso!', user: req.session.user });
            } catch (dbError) {
                 console.error("Erro ao atualizar perfil no DB:", dbError);
                 if(dbError.code === '23505' || dbError.message.includes('UNIQUE constraint failed')){ return res.status(409).json({ message: 'Este e-mail já está em uso por outra conta.' }); }
                 res.status(500).json({ message: 'Erro interno ao salvar as alterações.' });
            }
        };

        if (req.file) {
            let cld_upload_stream = cloudinary.uploader.upload_stream(
                { folder: "troq_avatars", transformation: [{ width: 150, height: 150, crop: "fill", gravity: "face" }] },
                (error, result) => {
                    if (error) { console.error('Erro no upload do avatar:', error); updateDatabase(currentAvatarUrl); }
                    else { console.log('Upload do avatar concluído:', result.secure_url); updateDatabase(result.secure_url); }
                }
            );
            streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);
        } else { updateDatabase(currentAvatarUrl); }
    } catch (error) { console.error("Erro geral ao processar PUT /api/account:", error); res.status(500).json({ message: 'Erro interno no servidor.' }); }
});

// Busca dados de uma oferta específica PARA EDIÇÃO
app.get('/api/offers/:id/edit', isAuthenticated, async (req, res) => { try { const offerId = req.params.id; const userId = req.session.user.id; const offer = await db.getOfferByIdAndOwner(offerId, userId); if (!offer) { return res.status(404).json({ message: 'Oferta não encontrada ou acesso negado.' }); } res.status(200).json(offer); } catch (error) { console.error("Erro ao buscar oferta para edição:", error); res.status(500).json({ message: 'Erro interno no servidor.' }); } });

// Atualiza uma oferta existente (COM VALIDAÇÃO DE TELEFONE)
app.put('/api/offers/:id', isAuthenticated, upload.single('offerImage'), async (req, res) => {
    try {
        const offerId = req.params.id; const userId = req.session.user.id;
        const { offerType, title, description, phone, address } = req.body;
        let imageUrl = req.body.currentImageUrl || null;
        if (!offerType || !title) { return res.status(400).json({ message: 'O tipo e o título da oferta são obrigatórios.' }); }
         // VALIDAÇÃO TELEFONE
        if (phone && phone.trim() !== '' && !phoneRegex.test(phone)) { return res.status(400).json({ message: 'Formato de telefone inválido. Use (XX) XXXXX-XXXX.' }); }

        const updateDatabase = async (newImageUrl) => {
            try {
                const updatedOffer = await db.updateOffer(offerId, userId, { offerType, title, description, imageUrl: newImageUrl, phone, address });
                res.status(200).json({ message: 'Oferta atualizada com sucesso!', offer: updatedOffer });
            } catch (dbError) { console.error("Erro ao atualizar oferta no DB:", dbError); if (dbError.message.includes('Acesso negado')) { return res.status(403).json({ message: 'Acesso negado.'}); } res.status(500).json({ message: 'Erro interno ao salvar as alterações.' }); }
        };

        if (req.file) {
            let cld_upload_stream = cloudinary.uploader.upload_stream({ folder: "troq_offers" }, (error, result) => {
                if (error) { console.error('Erro no upload da nova imagem:', error); updateDatabase(imageUrl); }
                else { console.log('Upload da nova imagem concluído:', result.secure_url); updateDatabase(result.secure_url); }
            });
            streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);
        } else { updateDatabase(imageUrl); }
    } catch (error) { console.error("Erro geral ao processar PUT /api/offers/:id:", error); res.status(500).json({ message: 'Erro interno no servidor.' }); }
});

// Rota para alterar senha
app.post('/api/account/change-password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body; const userId = req.session.user.id;
        if (!currentPassword || !newPassword) { return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias.' }); }
        const user = await db.findUserByIdWithPassword(userId);
        if (!user) { return res.status(404).json({ message: 'Usuário não encontrado.' }); }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) { return res.status(400).json({ message: 'Senha atual incorreta.' }); }
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.updateUserPassword(userId, hashedNewPassword);
        res.status(200).json({ message: 'Senha alterada com sucesso!' });
    } catch (error) { console.error("Erro ao alterar senha:", error); res.status(500).json({ message: 'Erro interno no servidor ao alterar a senha.' }); }
});

// Rota para buscar usuários por nome
app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
        const searchTerm = req.query.search;
        if (!searchTerm) { return res.status(400).json({ message: 'Termo de busca é obrigatório.' }); }
        const users = await db.findUsersByName(searchTerm);
        res.status(200).json(users);
    } catch (error) { console.error("Erro ao buscar usuários:", error); res.status(500).json({ message: 'Erro interno no servidor ao buscar usuários.' }); }
});


// --- ROTAS PARA SERVIR PÁGINAS HTML ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('cadastro.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cadastro.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/offer.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'offer.html')));
app.get('/create-offer.html', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'create-offer.html')));
app.get('/my-offers.html', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'my-offers.html')));
app.get('/home.html', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/account.html', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'account.html')));
app.get('/edit-offer.html', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'edit-offer.html')));

// --- Inicia o Servidor ---
app.listen(PORT, () => { console.log(`🚀 Servidor rodando em http://localhost:${PORT} no modo '${process.env.DB_MODE}'`); });