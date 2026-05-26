import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2N6CcL0cGxBLfSdPANHJjjKuP5Rp0EIE",
  authDomain: "ducor-pharmacy.firebaseapp.com",
  projectId: "ducor-pharmacy",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
       window.location = "/dashboard.html";
    })
    .catch((error) => {
      alert(error.message);
    });
};
