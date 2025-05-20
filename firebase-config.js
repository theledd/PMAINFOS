// Configuração do Firebase
const firebaseConfig = {
  // Substitua com suas credenciais do Firebase
  apiKey: "AIzaSyAIIzeTAnbsxgp7u3eGkLfsYbeZw6YW6aI",
  authDomain: "pmainfos-d002b.firebaseapp.com",
  projectId: "pmainfos-d002b",
  storageBucket: "pmainfos-d002b.firebasestorage.app",
  messagingSenderId: "735388601563",
  appId: "1:735388601563:web:19c077813fa1ae464a10fe"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Referências para o banco de dados
const db = firebase.firestore();
const auth = firebase.auth();

// Funções de persistência
const saveData = async (collection, data) => {
  try {
    await db.collection(collection).doc('data').set(data);
    return true;
  } catch (error) {
    console.error("Erro ao salvar dados:", error);
    return false;
  }
};

const loadData = async (collection) => {
  try {
    const doc = await db.collection(collection).doc('data').get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    return null;
  }
};

// Funções de autenticação
const signIn = async (email, password) => {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Erro no login:", error);
    throw error;
  }
};

const signUp = async (email, password) => {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Erro no cadastro:", error);
    throw error;
  }
};

const signOut = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    throw error;
  }
}; 