document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES DE ELEMENTOS ---
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const offerForm = document.getElementById('offer-form'); // Para criar oferta
    const editOfferForm = document.getElementById('edit-offer-form'); // Para editar oferta
    const accountForm = document.getElementById('account-form');
    const passwordForm = document.getElementById('password-form'); // Seleciona form de senha
    const mainMessageDiv = document.getElementById('message');
    const themeToggleButton = document.getElementById('theme-toggle');
    const themePlaceholderPublic = document.getElementById('theme-toggle-placeholder-public');
    const searchFormPublic = document.getElementById('search-form'); // Busca dashboard.html
    const searchFormLoggedIn = document.getElementById('search-form-logged-in'); // Busca home.html (ID alterado)
    const categorySwiperContainer = document.querySelector('.category-swiper'); // Container das categorias
    const profilePicUpload = document.getElementById('profile-pic-upload'); // Input file avatar
    const profilePicPreview = document.getElementById('profile-pic-preview'); // Img preview avatar
    const offerImageInput = document.getElementById('offer-image'); // Input file oferta
    const imagePreviewContainer = document.getElementById('image-preview'); // Div preview oferta
    const hamburger = document.getElementById('hamburger-menu'); // Menu hamburguer
    const sideMenu = document.getElementById('side-menu'); // Menu lateral
    const menuOverlay = document.getElementById('menu-overlay'); // Overlay do menu
    const headerAvatarImg = document.getElementById('header-avatar-img'); // Avatar no header logado
    const phoneInputOffer = document.querySelector('#offer-form #phone'); // Telefone no form de criar
    const phoneInputEdit = document.querySelector('#edit-offer-form #phone'); // Telefone no form de editar
    const emailInputs = document.querySelectorAll('input[type="email"]'); // Todos os inputs de email

    let activeCategory = null;

    // --- FUNÇÕES AUXILIARES ---
    const showMessage = (form, message, type) => {
        const messageDiv = form.querySelector('#message') || form.querySelector('#password-message') || mainMessageDiv;
        if (messageDiv) { messageDiv.textContent = message; messageDiv.className = `message ${type}`; messageDiv.style.display = 'block'; }
    };

    // --- FUNÇÕES DE VALIDAÇÃO E MÁSCARA ---
    const validateEmailFormat = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };
    const validatePhoneFormat = (phone) => {
         const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
         return phoneRegex.test(phone);
     };
    const phoneMask = (value) => {
        if (!value) return "";
        value = value.replace(/\D/g,'');
        value = value.replace(/(\d{2})(\d)/,"($1) $2");
        value = value.replace(/(\d)(\d{4})$/,"$1-$2");
        return value;
    };

    // --- LÓGICA DO TEMA CLARO/ESCURO ---
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') { document.body.classList.add('dark-theme'); }
    const toggleTheme = () => { document.body.classList.toggle('dark-theme'); let theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light'; localStorage.setItem('theme', theme); updateThemeButtons(theme); };
    const updateThemeButtons = (theme) => { const icon = theme === 'dark' ? '☀️' : '🌙'; if (themeToggleButton) themeToggleButton.textContent = icon; const placeholderButton = themePlaceholderPublic?.querySelector('.theme-toggle-button'); if (placeholderButton) placeholderButton.textContent = icon; };
    if (themeToggleButton) { themeToggleButton.addEventListener('click', toggleTheme); }
    if (themePlaceholderPublic) { const button = document.createElement('button'); button.className = 'theme-toggle-button'; button.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙'; button.addEventListener('click', toggleTheme); themePlaceholderPublic.appendChild(button); }
    updateThemeButtons(currentTheme);

    // --- INICIALIZAÇÃO DE COMPONENTES (SWIPER) ---
    if (categorySwiperContainer) { try { const categorySwiper = new Swiper('.category-swiper', { slidesPerView: 'auto', spaceBetween: 10, navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }, }); } catch (error) { console.error("Erro ao inicializar o Swiper:", error); } }

    // --- LÓGICA DOS FORMULÁRIOS ---

    // Validação de Email em tempo real
    emailInputs.forEach(input => {
        input.addEventListener('input', () => {
            if (validateEmailFormat(input.value)) { input.style.borderColor = 'var(--success-border-color)'; }
            else { input.style.borderColor = 'var(--danger-color)'; }
        });
         input.addEventListener('blur', () => { if(input.value === '') { input.style.borderColor = 'var(--border-color)'; } });
    });

    // Cadastro
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const fullname = document.getElementById('fullname').value; const email = document.getElementById('email').value; const password = document.getElementById('password').value; const confirmPassword = document.getElementById('confirm-password').value;
            if (!validateEmailFormat(email)) { showMessage(signupForm, 'Por favor, insira um e-mail válido.', 'error'); return; }
            if (password !== confirmPassword) { showMessage(signupForm, 'As senhas não coincidem!', 'error'); return; }
            try { const res = await fetch('/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullname, email, password }), }); const data = await res.json(); if (res.ok) { showMessage(signupForm, data.message, 'success'); signupForm.reset(); setTimeout(() => window.location.href = '/login.html', 2000); } else { showMessage(signupForm, data.message, 'error'); } } catch (error) { showMessage(signupForm, 'Ocorreu um erro na comunicação com o servidor.', 'error'); }
        });
    }

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const email = document.getElementById('email').value; const password = document.getElementById('password').value;
            if (!validateEmailFormat(email)) { showMessage(loginForm, 'Por favor, insira um e-mail válido.', 'error'); return; }
            try { const res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), }); const data = await res.json(); if (res.ok) { showMessage(loginForm, data.message, 'success'); if (data.redirectUrl) { setTimeout(() => { window.location.href = data.redirectUrl; }, 1500); } } else { showMessage(loginForm, data.message, 'error'); } } catch (error) { showMessage(loginForm, 'Ocorreu um erro na comunicação com o servidor.', 'error'); }
        });
    }

    // Criar Oferta
    if (offerForm) {
        if (phoneInputOffer) { phoneInputOffer.addEventListener('input', (e) => { e.target.value = phoneMask(e.target.value); }); phoneInputOffer.maxLength = 15; }
        offerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const formData = new FormData(offerForm); const submitButton = offerForm.querySelector('button[type="submit"]'); const phoneValue = formData.get('phone');
            if (phoneValue && !validatePhoneFormat(phoneValue)) { showMessage(offerForm, 'Formato de telefone inválido. Use (XX) XXXXX-XXXX.', 'error'); return; }
            if (submitButton) submitButton.disabled = true; showMessage(offerForm, 'Publicando oferta...', 'loading');
            try { const res = await fetch('/api/offers', { method: 'POST', body: formData }); const data = await res.json(); if (res.ok) { alert(data.message || 'Oferta publicada com sucesso!'); offerForm.reset(); const imagePreviewContainer = document.getElementById('image-preview'); const imagePreviewImage = imagePreviewContainer?.querySelector(".image-preview__image"); const imagePreviewDefaultText = imagePreviewContainer?.querySelector(".image-preview__default-text"); if (imagePreviewDefaultText && imagePreviewImage) { imagePreviewDefaultText.style.display = null; imagePreviewImage.style.display = null; imagePreviewImage.setAttribute("src", ""); } showMessage(offerForm, '', ''); } else { showMessage(offerForm, data.message, 'error'); } } catch (error) { showMessage(offerForm, 'Ocorreu um erro na comunicação com o servidor.', 'error'); } finally { if (submitButton) submitButton.disabled = false; }
        });
    }

    // Carregar Detalhes da Conta
    const loadAccountDetails = async () => { if (!accountForm || !profilePicPreview) return; try { const res = await fetch('/api/account'); if (!res.ok) { showMessage(accountForm, 'Erro ao carregar seus dados.', 'error'); profilePicPreview.src = "https://via.placeholder.com/150"; return; } const user = await res.json(); document.getElementById('fullname').value = user.fullname; document.getElementById('email').value = user.email; profilePicPreview.src = user.avatar_url || "https://via.placeholder.com/150"; } catch (error) { showMessage(accountForm, 'Erro de conexão ao carregar dados.', 'error'); profilePicPreview.src = "https://via.placeholder.com/150"; } };
    
    // Submeter Atualização da Conta
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const formData = new FormData(accountForm); const emailValue = formData.get('email');
            if (!validateEmailFormat(emailValue)) { showMessage(accountForm, 'Por favor, insira um e-mail válido.', 'error'); return; }
            try { const res = await fetch('/api/account', { method: 'PUT', body: formData }); const data = await res.json(); if (res.ok) { showMessage(accountForm, data.message, 'success'); if (document.querySelector('.welcome-message')) { document.querySelector('.welcome-message').textContent = `Olá, ${data.user.fullname}!`; } const profilePicPreviewLocal = document.getElementById('profile-pic-preview'); if(profilePicPreviewLocal && data.user.avatar_url){ profilePicPreviewLocal.src = data.user.avatar_url; } const profilePicUploadLocal = document.getElementById('profile-pic-upload'); if(profilePicUploadLocal) profilePicUploadLocal.value = null; } else { showMessage(accountForm, data.message || 'Erro desconhecido ao salvar.', 'error'); } } catch (error) { showMessage(accountForm, 'Erro de conexão ao salvar.', 'error'); }
        });
    }

    // Submeter Alteração de Senha
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const currentPassword = document.getElementById('current-password').value; const newPassword = document.getElementById('new-password').value;
            if (!currentPassword || !newPassword) { showMessage(passwordForm, 'Por favor, preencha ambos os campos de senha.', 'error'); return; }
            if (newPassword.length < 6) { showMessage(passwordForm, 'A nova senha deve ter pelo menos 6 caracteres.', 'error'); return; }
            try { const res = await fetch('/api/account/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }), }); const data = await res.json(); if (res.ok) { showMessage(passwordForm, data.message, 'success'); passwordForm.reset(); } else { showMessage(passwordForm, data.message, 'error'); } } catch (error) { console.error("Erro ao tentar alterar senha:", error); showMessage(passwordForm, 'Erro de comunicação com o servidor.', 'error'); }
        });
    }

    // Preview Imagem Perfil
    if (profilePicUpload && profilePicPreview) { profilePicUpload.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { profilePicPreview.src = event.target.result; }
     reader.readAsDataURL(file); } }); }
    
    // Preview Imagem Oferta
    if(offerImageInput && imagePreviewContainer) { const imagePreviewImage = imagePreviewContainer.querySelector(".image-preview__image"); const imagePreviewDefaultText = imagePreviewContainer.querySelector(".image-preview__default-text"); if(imagePreviewImage && imagePreviewDefaultText){ offerImageInput.addEventListener("change", function() { const file = this.files[0]; if (file) { const reader = new FileReader(); imagePreviewDefaultText.style.display = "none"; imagePreviewImage.style.display = "block"; reader.addEventListener("load", function() { imagePreviewImage.setAttribute("src", this.result); }); reader.readAsDataURL(file); } else { imagePreviewDefaultText.style.display = null; imagePreviewImage.style.display = null; imagePreviewImage.setAttribute("src", ""); } }); } }

    // Carregar Dados para Edição de Oferta
    const loadOfferForEditing = async () => {
         if (!editOfferForm) return; const urlParams = new URLSearchParams(window.location.search); const offerId = urlParams.get('id');
         if (!offerId) { showMessage(editOfferForm, 'Erro: ID da oferta não fornecido.', 'error'); return; }
         try {
             const res = await fetch(`/api/offers/${offerId}/edit`);
             if (!res.ok) { const data = await res.json(); showMessage(editOfferForm, data.message || `Erro ${res.status} ao carregar dados.`, 'error'); editOfferForm.style.opacity = '0.5'; editOfferForm.style.pointerEvents = 'none'; return; }
             const offer = await res.json();
             editOfferForm.querySelector('#offer-type').value = offer.offer_type;
             editOfferForm.querySelector('#title').value = offer.title;
             editOfferForm.querySelector('#description').value = offer.description || '';
             editOfferForm.querySelector('#phone').value = phoneMask(offer.phone || ''); // Aplica máscara ao carregar
             editOfferForm.querySelector('#address').value = offer.address || '';
             const imagePreviewContainer = document.getElementById('image-preview'); const imagePreviewImage = imagePreviewContainer?.querySelector(".image-preview__image"); const imagePreviewDefaultText = imagePreviewContainer?.querySelector(".image-preview__default-text");
             if(imagePreviewImage && imagePreviewDefaultText){ if (offer.image_url) { imagePreviewImage.src = offer.image_url; imagePreviewImage.style.display = 'block'; imagePreviewDefaultText.style.display = 'none'; let hiddenInput = editOfferForm.querySelector('input[name="currentImageUrl"]'); if (!hiddenInput) { hiddenInput = document.createElement('input'); hiddenInput.type = 'hidden'; hiddenInput.name = 'currentImageUrl'; editOfferForm.appendChild(hiddenInput); } hiddenInput.value = offer.image_url; } else { imagePreviewDefaultText.textContent = "Nenhuma imagem cadastrada"; imagePreviewDefaultText.style.display = 'block'; imagePreviewImage.style.display = 'none'; const hiddenInput = editOfferForm.querySelector('input[name="currentImageUrl"]'); if (hiddenInput) { hiddenInput.remove();} } }
         } catch (error) { showMessage(editOfferForm, 'Erro de conexão ao carregar oferta.', 'error'); }
    };
    
    // Submeter Edição de Oferta
    if (editOfferForm) {
        if (phoneInputEdit) { phoneInputEdit.addEventListener('input', (e) => { e.target.value = phoneMask(e.target.value); }); phoneInputEdit.maxLength = 15; }
        editOfferForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const urlParams = new URLSearchParams(window.location.search); const offerId = urlParams.get('id'); if (!offerId) { showMessage(editOfferForm, 'Erro: ID da oferta ausente.', 'error'); return; }
            const formData = new FormData(editOfferForm); const phoneValue = formData.get('phone');
            if (phoneValue && !validatePhoneFormat(phoneValue)) { showMessage(editOfferForm, 'Formato de telefone inválido. Use (XX) XXXXX-XXXX.', 'error'); return; }
            try { const res = await fetch(`/api/offers/${offerId}`, { method: 'PUT', body: formData }); const data = await res.json(); if (res.ok) { showMessage(editOfferForm, data.message, 'success'); setTimeout(() => window.location.href = '/my-offers.html', 1500); } else { showMessage(editOfferForm, data.message || `Erro ${res.status}`, 'error'); } } catch (error) { showMessage(editOfferForm, 'Erro de conexão ao salvar alterações.', 'error'); }
        });
    }

    // --- FUNÇÕES DE BUSCA DE DADOS (FETCH) ---
    // --- FUNÇÕES DE BUSCA DE DADOS (FETCH) ---
    const fetchAndDisplayOffers = async (searchTerm = '', category = null) => {
        const offersListDiv = document.getElementById('offers-list');
        const offersTitle = document.getElementById('offers-title');
        if (!offersListDiv || !offersTitle) return;

        let apiUrl = '/api/offers?';
        const params = [];
        
        // CORREÇÃO: Usa o parâmetro 'searchTerm'
        if (searchTerm && searchTerm.trim() !== '') {
            params.push(`search=${encodeURIComponent(searchTerm.trim())}`);
        }
        
        // CORREÇÃO: Usa o parâmetro 'category'
        if (category) {
            params.push(`category=${encodeURIComponent(category)}`);
        }
        
        apiUrl += params.join('&');

        // CORREÇÃO: Usa o parâmetro 'category' e corrige o typo 'activeGrapheme'
        if (category) {
            offersTitle.textContent = `Ofertas de ${category.charAt(0).toUpperCase() + category.slice(1)}`;
        } else {
            offersTitle.textContent = 'Ofertas Recentes / Recomendações';
        }
        
        if (searchTerm && searchTerm.trim() !== '') {
            offersTitle.textContent += ` (Busca: "${searchTerm}")`;
        }

        console.log(`Buscando com URL: ${apiUrl}`);
        
        try {
            offersListDiv.innerHTML = '<p>Carregando ofertas...</p>';
            const res = await fetch(apiUrl);
            const offers = await res.json();
            if (!res.ok) {
                offersListDiv.innerHTML = '<p>Erro ao carregar as ofertas.</p>';
                return;
            }
            if (offers.length === 0) {
                let message = 'Nenhuma oferta encontrada.';
                if (searchTerm && searchTerm.trim() !== '') message += ` Para "${searchTerm}"`;
                if (category) message += ` na categoria ${category}`; // CORREÇÃO: Usa o parâmetro 'category'
                offersListDiv.innerHTML = `<p>${message}</p>`;
                return;
            }
            offersListDiv.innerHTML = '';
            offers.forEach(offer => {
                const offerLink = document.createElement('a');
                offerLink.href = `/offer.html?id=${offer.id}`;
                offerLink.className = 'offer-card-link';
                offerLink.style.textDecoration = 'none';
                const imageHtml = offer.image_url ? `<img class="offer-card-image" src="${offer.image_url}" alt="${offer.title}">` : `<div class="offer-card-image placeholder-img"></div>`;
                offerLink.innerHTML = `
                    <div class="offer-card">
                        ${imageHtml}
                        <div class="offer-card-content">
                            <span class="offer-type offer-type-${offer.offer_type}">${offer.offer_type}</span>
                            <h3>${offer.title}</h3>
                            <p>${offer.description ? offer.description.substring(0, 60) + '...' : 'Clique para ver mais detalhes...'}</p>
                            <div class="author">Publicado por: <strong>${offer.author_name}</strong></div>
                        </div>
                    </div>`;
                offersListDiv.appendChild(offerLink);
            });
        } catch (error) {
            console.error("Erro no fetch das ofertas:", error);
            offersListDiv.innerHTML = '<p>Erro ao conectar com o servidor.</p>';
        }
    };
    const fetchOfferDetails = async () => { const offerDetailContainer = document.getElementById('offer-detail-container'); if (!offerDetailContainer) return; const urlParams = new URLSearchParams(window.location.search); const offerId = urlParams.get('id'); if (!offerId) { offerDetailContainer.innerHTML = '<h1 style="text-align: center;">Erro: ID da oferta não fornecido.</h1>'; return; } try { const res = await fetch(`/api/offers/${offerId}`); if (!res.ok) { let errorMsg = `Erro ${res.status} ao carregar dados.`; try { const errData = await res.json(); errorMsg = errData.message || errorMsg; } catch (jsonError) { errorMsg = `Erro ${res.status}: ${res.statusText}. Falha ao conectar com o servidor.`; } offerDetailContainer.innerHTML = `<h1 style="text-align: center;">${errorMsg}</h1>`; return; } const offer = await res.json(); const formattedDate = new Date(offer.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); const imageHtml = offer.image_url ? `<img src="${offer.image_url}" alt="${offer.title}">` : `<div class="no-image">Sem imagem disponível</div>`; 

            // --- INÍCIO DA ALTERAÇÃO ---
            let contactDetailsHtml = '';
            let hasSpecificContact = false;
            
            // Adiciona o Email (como antes)
            if (offer.author_email) {
                contactDetailsHtml += `<p>Email para contato: <a href="mailto:${offer.author_email}" class="contact-link">${offer.author_email}</a></p>`;
            }

            // Lógica do Telefone (Modificada para ser um link)
            if (offer.phone && offer.phone.trim() !== '') {
                // Remove parênteses, espaços e traços para criar o link
                const whatsappNumber = '55' + offer.phone.replace(/\D/g, ''); // Adiciona o código do Brasil (55)
                const whatsappMessage = `Olá, ${offer.author_name}! Vi seu anúncio "${offer.title}" no TROQ e tenho interesse.`;
                
                // Cria o link do WhatsApp no lugar do texto simples
                contactDetailsHtml += `
                    <p>Telefone: 
                        <a href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}" target="_blank" class="contact-link" style="font-weight: 600;">
                            ${offer.phone} (WhatsApp)
                        </a>
                    </p>`;
                hasSpecificContact = true;
            }

            // Adiciona o Endereço (como antes)
            if (offer.address && offer.address.trim() !== '') {
                contactDetailsHtml += `<p>Localização: <strong class="contact-info">${offer.address}</strong></p>`;
                hasSpecificContact = true;
            }
            
            // Lógica dos textos de ajuda (atualizada)
            if (!hasSpecificContact && offer.author_email) {
                contactDetailsHtml += `<p class="contact-hint"><i>Nenhuma informação adicional de contato (telefone/localização) fornecida.</i></p>`;
            } else if (hasSpecificContact && offer.author_email) {
                contactDetailsHtml += `<small class="contact-hint">(Clique no email ou telefone para iniciar a conversa)</small>`;
            } else if (!hasSpecificContact && !offer.author_email) {
                contactDetailsHtml += `<p class="contact-hint"><i>Nenhuma informação de contato fornecida.</i></p>`;
            }
            // --- FIM DA ALTERAÇÃO ---

            offerDetailContainer.innerHTML = ` <div class="offer-image-section">${imageHtml}</div> <div class="offer-info-section"> <span class="offer-type offer-type-${offer.offer_type}">${offer.offer_type}</span> <h1>${offer.title}</h1> <p class="description">${offer.description || 'Nenhuma descrição detalhada fornecida.'}</p> <div class="seller-info-box"> <h3>Informações do Vendedor</h3> <p>Publicado por: <strong>${offer.author_name}</strong></p> <p>Data de publicação: ${formattedDate}</p> ${contactDetailsHtml} </div> </div>`; } catch (error) { console.error('Erro de conexão ao buscar detalhes da oferta:', error); offerDetailContainer.innerHTML = '<h1 style="text-align: center;">Erro ao conectar com o servidor. Verifique sua conexão.</h1>'; } };
    const fetchMyOffers = async () => { const myOffersListDiv = document.getElementById('my-offers-list'); if (!myOffersListDiv) return; try { const res = await fetch('/api/my-offers'); const offers = await res.json(); if (offers.length === 0) { myOffersListDiv.innerHTML = '<p>Você ainda não publicou nenhuma oferta.</p>'; return; } myOffersListDiv.innerHTML = ''; offers.forEach(offer => { const card = document.createElement('div'); card.className = 'offer-card'; const imageHtml = offer.image_url ? `<img class="offer-card-image" src="${offer.image_url}" alt="${offer.title}">` : `<div class="offer-card-image placeholder-img"></div>`; card.innerHTML = `${imageHtml} <div class="offer-card-content"> <span class="offer-type offer-type-${offer.offer_type}">${offer.offer_type}</span><h3>${offer.title}</h3><p>${offer.description ? offer.description.substring(0, 60) + '...' : ''}</p><div class="card-actions"><a href="/edit-offer.html?id=${offer.id}" class="edit-btn">Editar</a> <button class="delete-btn" data-id="${offer.id}">Excluir</button></div> </div>`; myOffersListDiv.appendChild(card); }); } catch (error) { myOffersListDiv.innerHTML = '<p>Erro ao carregar suas ofertas.</p>'; } };
    const updateUserNav = async () => { const authLinksContainer = document.getElementById('auth-links-container'); const avatarImgElement = document.getElementById('header-avatar-img'); try { const res = await fetch('/api/auth/status'); const data = await res.json(); if (data.loggedIn) { if (authLinksContainer) { authLinksContainer.innerHTML = `<span class="welcome-message">Olá, ${data.user.fullname}!</span><a href="/create-offer.html" class="auth-link">Criar Oferta</a><a href="/my-offers.html" class="auth-link">Minhas Ofertas</a><a href="/account.html" class="auth-link">Minha Conta</a><a href="/logout" class="auth-link">Sair</a>`; } if (avatarImgElement) { avatarImgElement.src = data.user.avatar_url || 'https://via.placeholder.com/40'; avatarImgElement.alt = data.user.fullname; } } else { if (authLinksContainer) { authLinksContainer.innerHTML = `<a href="/login.html" class="auth-link">Login</a><a href="/index.html" class="auth-link">Cadastro</a>`; } if (avatarImgElement) { avatarImgElement.src = 'https://via.placeholder.com/40'; avatarImgElement.alt = 'Avatar'; } } } catch (error) { console.error('Erro ao verificar status de autenticação:', error); if (authLinksContainer) { authLinksContainer.innerHTML = `<a href="/login.html" class="auth-link">Login</a><a href="/index.html" class="auth-link">Cadastro</a>`; } if (avatarImgElement) { avatarImgElement.src = 'https://via.placeholder.com/40'; avatarImgElement.alt = 'Avatar'; } } };

    // --- EVENT LISTENERS GLOBAIS ---
    document.body.addEventListener('click', async (e) => { if (e.target.classList.contains('delete-btn')) { const offerId = e.target.getAttribute('data-id'); if (confirm('Tem certeza que deseja excluir esta oferta? Esta ação não pode ser desfeita.')) { try { const res = await fetch(`/api/offers/${offerId}`, { method: 'DELETE' }); const data = await res.json(); if (res.ok) { alert(data.message); fetchMyOffers(); } else { alert(`Erro: ${data.message}`); } } catch (err) { alert('Erro de comunicação com o servidor.'); } } } });
    const handleOfferSearch = (event) => { event.preventDefault(); const form = event.target; const searchInput = form.querySelector('#search') || form.querySelector('#search-input-logged-in') || form.querySelector('input[type="text"]'); if (searchInput) { const searchTerm = searchInput.value; console.log('Busca de OFERTAS com termo:', searchTerm, 'Categoria ativa:', activeCategory); fetchAndDisplayOffers(searchTerm, activeCategory); } };
    if (searchFormPublic) { searchFormPublic.addEventListener('submit', handleOfferSearch); }
    if (searchFormLoggedIn) { searchFormLoggedIn.addEventListener('submit', handleOfferSearch); }
    if (categorySwiperContainer) { categorySwiperContainer.addEventListener('click', (e) => { const categoryLink = e.target.closest('.category-item'); if (categoryLink) { e.preventDefault(); const category = categoryLink.dataset.category; categorySwiperContainer.querySelectorAll('.category-item').forEach(item => item.classList.remove('active')); if (category === activeCategory || category === '') { activeCategory = null; } else { activeCategory = category; categoryLink.classList.add('active'); } console.log('Categoria selecionada:', activeCategory); const searchInputPublic = searchFormPublic?.querySelector('input[type="text"]'); const searchInputLoggedIn = searchFormLoggedIn?.querySelector('input[type="text"]'); if (searchInputPublic) searchInputPublic.value = ''; if(searchInputLoggedIn) searchInputLoggedIn.value = ''; fetchAndDisplayOffers('', activeCategory); } }); }

    // --- LÓGICA DO MENU HAMBÚRGUER ---
    if (hamburger && sideMenu && menuOverlay) { hamburger.addEventListener('click', () => { sideMenu.classList.add('open'); menuOverlay.classList.add('open'); }); const closeMenu = () => { sideMenu.classList.remove('open'); menuOverlay.classList.remove('open'); }; menuOverlay.addEventListener('click', closeMenu); }
    
    // --- CORREÇÃO DOS LINKS "VOLTAR" ---
    if (document.getElementById('my-offers-list') || document.getElementById('offer-form') || document.getElementById('account-form') || document.getElementById('edit-offer-form') ) { const backLink = document.querySelector('.back-link'); if(backLink) { if(document.getElementById('edit-offer-form')) { backLink.href = "/my-offers.html"; } else { backLink.href = "/home.html"; } } }

    // --- CHAMADA DAS FUNÇÕES AO CARREGAR A PÁGINA ---
    const urlParams = new URLSearchParams(window.location.search); const initialSearchTerm = urlParams.get('search'); const initialCategory = urlParams.get('category'); if(initialCategory){ activeCategory = initialCategory; const activeCategoryLink = categorySwiperContainer?.querySelector(`.category-item[data-category="${initialCategory}"]`); if(activeCategoryLink) { categorySwiperContainer.querySelectorAll('.category-item').forEach(item => item.classList.remove('active')); activeCategoryLink.classList.add('active'); } } if (initialSearchTerm) { const searchInputPublic = searchFormPublic?.querySelector('input[type="text"]'); const searchInputLoggedIn = searchFormLoggedIn?.querySelector('input[type="text"]'); if (searchInputPublic) searchInputPublic.value = initialSearchTerm; if (searchInputLoggedIn) searchInputLoggedIn.value = initialSearchTerm; }

    updateUserNav();
    loadAccountDetails();
    loadOfferForEditing();
    fetchOfferDetails();
    fetchMyOffers();
    fetchAndDisplayOffers(initialSearchTerm || '', activeCategory);
});