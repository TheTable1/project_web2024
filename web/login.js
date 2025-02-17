
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

  let auth = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        window.location.href = "dashboard.html"; // เปลี่ยนเส้นทางเมื่อเข้าสู่ระบบ
      }
    });

    return () => unsubscribe(); // Cleanup listener
  }, []);

  const handleGoogleLogin = () => {
    auth
      .signInWithPopup(provider)
      .then((result) => {
        console.log("Logged in as:", result.user.displayName);
      })
      .catch((error) => {
        console.error("Login failed:", error);
      });
  };

  google_logout(){
    if(confirm("Are you sure?")){
      firebase.auth().signOut();
    }
}

  return (
    <div className="login-container">
      <h3 className="fw-bold">Sign in</h3>
      <button className="login-button mt-3" onClick={handleGoogleLogin}>
        Sign in with Google
      </button>
    </div>
  );
}

// Render React Component ด้วย React 18
const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<LoginApp />);
