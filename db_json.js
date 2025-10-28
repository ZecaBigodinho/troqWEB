// db_json.js (Completo com phone/address, funções de senha e edição de oferta)

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto'); // Para gerar IDs únicos
const dbPath = path.join(__dirname, 'database.json'); // Caminho para o arquivo JSON

// Função auxiliar para ler dados do arquivo JSON
const readData = async () => {
    try {
        const data = await fs.readFile(dbPath, 'utf8'); // Lê o arquivo como texto
        return JSON.parse(data); // Converte o texto JSON em objeto JavaScript
    } catch (error) {
        // Se o arquivo não existir (ENOENT), cria um novo com estrutura vazia
        if (error.code === 'ENOENT') {
            console.log('Arquivo database.json não encontrado, criando um novo.');
            await writeData({ users: [], offers: [] }); // Cria o arquivo com arrays vazios
            return { users: [], offers: [] }; // Retorna a estrutura vazia
        }
        // Se for outro erro de leitura, exibe e propaga
        console.error("Erro ao ler database.json:", error);
        throw error;
    }
};

// Função auxiliar para escrever dados no arquivo JSON
const writeData = async (data) => {
    try {
        // Escreve o objeto JavaScript como texto JSON formatado (indentação 2 espaços)
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
        // Se houver erro de escrita, exibe e propaga
        console.error("Erro ao escrever em database.json:", error);
        throw error;
    }
};

// Exporta um objeto com funções que simulam operações de banco de dados
module.exports = {
    // --- Funções de Usuário ---
    async findUserByEmail(email) {
        const db = await readData();
        // Encontra o primeiro usuário com o email correspondente (incluindo senha)
        return db.users.find(user => user.email === email);
    },
    async createUser({ fullname, email, hashedPassword }) {
        const db = await readData();
        // Verifica se o email já existe para simular restrição UNIQUE
        if (db.users.some(user => user.email === email)) {
            throw new Error('UNIQUE constraint failed'); // Lança erro se duplicado
        }
        // Cria um novo objeto de usuário com ID aleatório e data atual
        const newUser = {
            id: crypto.randomUUID(),
            fullname,
            email,
            password: hashedPassword,
            created_at: new Date().toISOString(),
            avatar_url: null // Avatar inicial nulo
        };
        db.users.push(newUser); // Adiciona ao array de usuários
        await writeData(db); // Salva no arquivo
        return { id: newUser.id }; // Retorna apenas o ID, como faria o RETURNING do Postgres
    },
    async findUserById(id) {
        const db = await readData();
        const user = db.users.find(user => user.id === id);
        if(user){
            // Remove a senha antes de retornar os dados do usuário
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }
        return undefined; // Retorna undefined se não encontrar
    },
    // Função para buscar usuário incluindo a senha hash (usada na alteração de senha)
    async findUserByIdWithPassword(id) {
        const db = await readData();
        // Encontra o usuário pelo ID, retornando todos os campos (incluindo senha)
        return db.users.find(user => user.id === id);
    },
    async updateUser(userId, { fullname, email, avatarUrl }) {
        const db = await readData();
        // Verifica se o novo email já está em uso por OUTRO usuário
        if (db.users.some(user => user.email === email && user.id !== userId)) {
            throw new Error('UNIQUE constraint failed'); // Simula erro de email duplicado
        }
        // Encontra o índice do usuário a ser atualizado
        const userIndex = db.users.findIndex(user => user.id === userId);
        if (userIndex === -1) {
            throw new Error('Usuário não encontrado'); // Lança erro se não achar
        }
        // Atualiza os dados do usuário no array
        db.users[userIndex].fullname = fullname;
        db.users[userIndex].email = email;
        // Atualiza avatar_url apenas se um valor foi explicitamente passado (pode ser null)
        // Se avatarUrl for undefined (não passado), mantém o valor antigo
        if(avatarUrl !== undefined){
            db.users[userIndex].avatar_url = avatarUrl;
        }
        await writeData(db); // Salva as alterações
        // Retorna o usuário atualizado (sem a senha)
        const { password, ...updatedUser } = db.users[userIndex];
        return updatedUser;
    },
    // Função para atualizar apenas a senha do usuário
    async updateUserPassword(userId, hashedPassword) {
        const db = await readData();
        const userIndex = db.users.findIndex(user => user.id === userId);
        if (userIndex === -1) {
            throw new Error('Usuário não encontrado para atualização de senha');
        }
        db.users[userIndex].password = hashedPassword; // Atualiza a senha no objeto
        await writeData(db); // Salva
        return { id: userId }; // Confirma que a atualização ocorreu retornando o ID
    },
    // Função para buscar usuários por nome (para a busca de usuários)
    async findUsersByName(searchTerm) {
        const db = await readData();
        if (!searchTerm || searchTerm.trim() === '') {
            return []; // Retorna array vazio se busca for vazia
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        console.log(`Filtrando usuários JSON com termo: '${lowerCaseSearchTerm}'`);
        // Filtra usuários cujo nome (case-insensitive) contém o termo de busca
        return db.users
            .filter(user => user.fullname && user.fullname.toLowerCase().includes(lowerCaseSearchTerm))
            .map(user => { // Remove a senha do resultado
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            })
            .sort((a, b) => a.fullname.localeCompare(b.fullname)); // Ordena alfabeticamente
    },

    // --- Funções de Oferta ---
    
    // === ALTERADO ===
    async createOffer({ userId, offerType, title, category, description, imageUrl, phone, address }) {
        const db = await readData();
        // Cria um novo objeto de oferta com ID aleatório e data atual
        const newOffer = {
            id: crypto.randomUUID(),
            user_id: userId,
            offer_type: offerType,
            title,
            category: category, // Adicionado
            description,
            image_url: imageUrl, // Salva a URL da imagem (pode ser null)
            phone,              // Salva telefone
            address,            // Salva endereço
            created_at: new Date().toISOString()
        };
        db.offers.push(newOffer); // Adiciona ao array de ofertas
        await writeData(db); // Salva no arquivo
        return { id: newOffer.id }; // Retorna apenas o ID
    },
    
    // === ALTERADO ===
    async getAllOffers(searchTerm, category) {
        const db = await readData();
        let filteredOffers = db.offers; // Começa com todas as ofertas
        const offerTypes = ['vender', 'trocar', 'serviço', 'comprar'];

        // Filtra por termo de busca (se fornecido)
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            console.log(`Filtrando JSON com termo: '${lowerCaseSearchTerm}'`);
            filteredOffers = filteredOffers.filter(offer =>
                // Verifica se o termo está no título OU na descrição (case-insensitive)
                (offer.title && offer.title.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (offer.description && offer.description.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        // FILTRO INTELIGENTE
        if (category) {
             console.log(`Filtrando JSON com categoria: '${category}'`);
             if (offerTypes.includes(category)) {
                // Filtra pela coluna offer_type
                filteredOffers = filteredOffers.filter(offer => offer.offer_type === category);
             } else {
                // Filtra pela nova coluna category
                filteredOffers = filteredOffers.filter(offer => offer.category === category);
             }
        }

        // Mapeia os resultados para adicionar o nome do autor (simulando JOIN)
        return filteredOffers.map(offer => {
            const author = db.users.find(user => user.id === offer.user_id); // Encontra o usuário correspondente
            // Retorna um objeto com os dados da oferta e o nome do autor
            return {
                id: offer.id, offer_type: offer.offer_type, title: offer.title, description: offer.description,
                created_at: offer.created_at, image_url: offer.image_url, phone: offer.phone, address: offer.address, 
                category: offer.category, // Adicionado
                author_name: author ? author.fullname : 'Usuário Desconhecido' // Nome ou fallback
            };
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Ordena pelas mais recentes
    },
    
    // === ALTERADO ===
    async getOfferById(id) {
        const db = await readData();
        const offer = db.offers.find(o => o.id === id); // Encontra a oferta pelo ID
        if (!offer) return null; // Retorna null se não encontrar
        const author = db.users.find(user => user.id === offer.user_id); // Encontra o autor
        // Retorna dados da oferta e do autor
        return {
            id: offer.id, offer_type: offer.offer_type, title: offer.title, description: offer.description,
            created_at: offer.created_at, image_url: offer.image_url, phone: offer.phone, address: offer.address,
            category: offer.category, // Adicionado
            author_name: author ? author.fullname : 'Usuário Desconhecido',
            author_email: author ? author.email : 'email@desconhecido.com' // Email para contato
        };
    },
     async getOfferByIdAndOwner(offerId, userId) {
        const db = await readData();
        // Encontra a oferta APENAS se o ID e o user_id corresponderem
        // Retorna todos os dados da oferta, incluindo phone/address
        const offer = db.offers.find(o => o.id === offerId && o.user_id === userId);
        return offer; // Retorna a oferta ou undefined
    },
    
    // === ALTERADO ===
    async getMyOffers(userId) {
        const db = await readData();
        // Filtra as ofertas pelo user_id
        return db.offers.filter(offer => offer.user_id === userId)
            // Mapeia para retornar os campos necessários, incluindo phone/address
            .map(offer => ({
                id: offer.id, offer_type: offer.offer_type, title: offer.title, description: offer.description,
                created_at: offer.created_at, image_url: offer.image_url, phone: offer.phone, address: offer.address,
                category: offer.category // Adicionado
            }))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Ordena
    },
    
    // === ALTERADO ===
    async updateOffer(offerId, userId, { offerType, title, category, description, imageUrl, phone, address }) {
        const db = await readData();
        // Encontra o índice da oferta a ser atualizada
        const offerIndex = db.offers.findIndex(o => o.id === offerId);
        if (offerIndex === -1) { throw new Error('Oferta não encontrada.'); } // Erro se não achar
        // Verifica se o usuário logado é o dono da oferta
        if (db.offers[offerIndex].user_id !== userId) { throw new Error('Acesso negado.'); } // Erro se não for o dono

        // Atualiza os campos da oferta no array
        db.offers[offerIndex].offer_type = offerType;
        db.offers[offerIndex].title = title;
        db.offers[offerIndex].category = category; // Adicionado
        db.offers[offerIndex].description = description;
        db.offers[offerIndex].image_url = imageUrl; // Atualiza a imagem (pode ser null)
        db.offers[offerIndex].phone = phone;       // Atualiza telefone
        db.offers[offerIndex].address = address;     // Atualiza endereço

        await writeData(db); // Salva as alterações
        return db.offers[offerIndex]; // Retorna a oferta atualizada
    },
    
    async deleteOffer(offerId, userId) {
        const db = await readData();
        const offerIndex = db.offers.findIndex(o => o.id === offerId);
        if (offerIndex === -1) throw new Error('Oferta não encontrada'); // Erro se não achar
        if (db.offers[offerIndex].user_id !== userId) throw new Error('Acesso negado'); // Erro se não for o dono
        db.offers.splice(offerIndex, 1); // Remove a oferta do array
        await writeData(db); // Salva as alterações
        return { message: 'Oferta deletada com sucesso!' }; // Retorna mensagem de sucesso
    }
};