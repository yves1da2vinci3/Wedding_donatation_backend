const API_BASE_URL = 'http://localhost:3001/api';

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
}

async function testLogout() {
  try {
    console.log('🧪 Test du logout...');

    // 1. Login
    console.log('\n1. Connexion...');
    const loginData = await makeRequest(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@wedding-donation.com',
        password: 'Admin123!'
      })
    });

    const { token, refreshToken } = loginData;
    console.log('✅ Connexion réussie');

    // 2. Vérifier que l'utilisateur est connecté
    console.log('\n2. Vérification de l\'authentification...');
    const meData = await makeRequest(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Utilisateur authentifié:', meData.admin.name);

    // 3. Test logout
    console.log('\n3. Test du logout...');
    const logoutData = await makeRequest(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Logout réussi:', logoutData.message);

    // 4. Vérifier que l'utilisateur n'est plus connecté
    console.log('\n4. Vérification post-logout...');
    try {
      await makeRequest(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Erreur: L\'utilisateur est encore connecté');
    } catch (error) {
      if (error.message.includes('401')) {
        console.log('✅ Utilisateur correctement déconnecté');
      } else {
        console.log('❌ Erreur inattendue:', error.message);
      }
    }

    // 5. Test logout sans refresh token
    console.log('\n5. Test logout sans refresh token...');
    const logoutData2 = await makeRequest(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Logout sans refresh token réussi:', logoutData2.message);

    console.log('\n🎉 Tous les tests de logout sont passés!');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testLogout(); 