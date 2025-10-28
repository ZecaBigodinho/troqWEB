// db_postgres.js (Completo com phone/address)

const { Pool } = require('pg');
const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, database: process.env.DB_DATABASE, password: process.env.DB_PASSWORD, ssl: true, });

module.exports = {
    // --- Funções de Usuário ---
    async findUserByEmail(email) { const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]); return result.rows[0]; },
    async createUser({ fullname, email, hashedPassword }) { const result = await pool.query(`INSERT INTO users (fullname, email, password) VALUES ($1, $2, $3) RETURNING id`, [fullname, email, hashedPassword]); return result.rows[0]; },
    async findUserById(id) { const result = await pool.query('SELECT id, fullname, email, avatar_url FROM users WHERE id = $1', [id]); return result.rows[0]; },
    async findUserByIdWithPassword(id) { const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]); return result.rows[0]; },
    async updateUser(userId, { fullname, email, avatarUrl }) { const result = await pool.query(`UPDATE users SET fullname = $1, email = $2, avatar_url = $3 WHERE id = $4 RETURNING id, fullname, email, avatar_url`, [fullname, email, avatarUrl, userId]); if (result.rows.length === 0) { throw new Error('Usuário não encontrado para atualização'); } return result.rows[0]; },
    async updateUserPassword(userId, hashedPassword) { const result = await pool.query(`UPDATE users SET password = $1 WHERE id = $2 RETURNING id`, [hashedPassword, userId]); if (result.rows.length === 0) { throw new Error('Usuário não encontrado para atualização de senha'); } return result.rows[0]; },
    async findUsersByName(searchTerm) { if (!searchTerm || searchTerm.trim() === '') { return []; } const query = ` SELECT id, fullname, email, avatar_url FROM users WHERE fullname ILIKE $1 ORDER BY fullname ASC; `; const params = [`%${searchTerm}%`]; console.log("Executando busca de usuários:", query, params); const result = await pool.query(query, params); return result.rows; },

    // --- Funções de Oferta ---
    
    // === ALTERADO ===
    async createOffer({ userId, offerType, title, category, description, imageUrl, phone, address }) {
        const result = await pool.query(
            `INSERT INTO offers (user_id, offer_type, title, category, description, image_url, phone, address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`, // Adicionado category, $8
            [userId, offerType, title, category, description, imageUrl, phone, address] // Adicionado category
        );
        return result.rows[0];
    },
    
    // === ALTERADO ===
    async getAllOffers(searchTerm, category) {
        // Lista de categorias que são "tipos de oferta"
        const offerTypes = ['vender', 'trocar', 'serviço', 'comprar'];

        let query = `
            SELECT o.id, o.offer_type, o.title, o.description, o.created_at, o.image_url, o.phone, o.address, o.category,
                   u.fullname AS author_name
            FROM offers o
            JOIN users u ON o.user_id = u.id
        `;
        const params = [];
        let paramIndex = 1;
        const conditions = [];

        if (searchTerm) {
            conditions.push(` (o.title ILIKE $${paramIndex} OR o.description ILIKE $${paramIndex}) `);
            params.push(`%${searchTerm}%`);
            paramIndex++;
        }
        
        // FILTRO INTELIGENTE
        if (category) {
            if (offerTypes.includes(category)) {
                // Se a categoria for 'vender', 'trocar', etc., filtre a coluna 'offer_type'
                conditions.push(` o.offer_type = $${paramIndex} `);
            } else {
                // Se for 'eletronicos', 'moveis', etc., filtre a nova coluna 'category'
                conditions.push(` o.category = $${paramIndex} `);
            }
            params.push(category);
            paramIndex++;
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ` ORDER BY o.created_at DESC`;

        console.log("Executando query:", query, params);
        const result = await pool.query(query, params);
        return result.rows;
    },
    
    async getOfferById(id) {
        // Adicionado phone, address na query
        const result = await pool.query(
            `SELECT o.id, o.offer_type, o.title, o.description, o.created_at, o.image_url, o.phone, o.address, o.category, 
                    u.fullname AS author_name, u.email AS author_email
             FROM offers o JOIN users u ON o.user_id = u.id WHERE o.id = $1`,
            [id]
        );
        return result.rows[0];
    },
     async getOfferByIdAndOwner(offerId, userId) {
         // Adicionado phone, address na query (seleciona *)
        const result = await pool.query( `SELECT * FROM offers WHERE id = $1 AND user_id = $2`, [offerId, userId] );
        return result.rows[0];
    },
    async getMyOffers(userId) {
         // Adicionado phone, address, category na query
        const result = await pool.query( `SELECT id, offer_type, title, description, created_at, image_url, phone, address, category FROM offers WHERE user_id = $1 ORDER BY created_at DESC`, [userId] );
        return result.rows;
    },
    
    // === ALTERADO ===
    async updateOffer(offerId, userId, { offerType, title, category, description, imageUrl, phone, address }) {
        const check = await this.getOfferByIdAndOwner(offerId, userId); if (!check) { throw new Error('Acesso negado ou oferta não encontrada.'); }
        const result = await pool.query(
            `UPDATE offers SET offer_type = $1, title = $2, category = $3, description = $4, image_url = $5, phone = $6, address = $7
             WHERE id = $8 RETURNING *`, // Adicionado category = $3, e id = $8
            [offerType, title, category, description, imageUrl, phone, address, offerId] // Adicionado category
        );
        return result.rows[0];
    },
    
    async deleteOffer(offerId, userId) { const checkResult = await pool.query('SELECT user_id FROM offers WHERE id = $1', [offerId]); if (checkResult.rows.length === 0) { throw new Error('Oferta não encontrada'); } if (checkResult.rows[0].user_id !== userId) { throw new Error('Acesso negado'); } const deleteResult = await pool.query('DELETE FROM offers WHERE id = $1', [offerId]); if (deleteResult.rowCount === 0) { throw new Error('Falha ao deletar a oferta'); } return { message: 'Oferta deletada com sucesso!' }; }
};