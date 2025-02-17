// ใช้ ES6 Syntax ให้เหมาะกับ Babel และ React
function LoginApp() {
  const [user, setUser] = React.useState(null);

  // Firebase Config
  const firebaseConfig = {
    apiKey: "AIzaSyDpyi2trOVCMFZfTRTClLUSv9urSqFpmLA",
    authDomain: "projectweb-150fc.firebaseapp.com",
    projectId: "projectweb-150fc",
    storageBucket: "projectweb-150fc.firebasestorage.app",
    messagingSenderId: "148917915697",
    appId: "1:148917915697:web:93234e5ae2e53293320510",
    measurementId: "G-NXDX5YSHDE",
  };

  // Initialize Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const auth = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = () => {
    auth.signInWithPopup(provider)
      .then((result) => {
        console.log("Logged in as:", result.user.displayName);
      })
      .catch((error) => {
        console.error("Login failed:", error);
      });
  };

  const handleSignOut = () => {
    auth.signOut()
      .then(() => {
        setUser(null);
        alert("Signed out successfully!");
        window.location.href = "index.html";
      })
      .catch((error) => {
        console.error("Sign out error", error);
      });
  };

  return (
    <div className="login-container">
      {user ? (
        <div>
          <h3 className="fw-bold">Welcome, {user.displayName}</h3>
          <button className="logout-button mt-3" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      ) : (
        <div>
          <h3 className="fw-bold">Sign in</h3>
          <button className="login-button mt-3" onClick={handleGoogleLogin}>
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  );
}

// Render React Component ด้วย React 18
const container = document.getElementById("root");
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<LoginApp />);
}
