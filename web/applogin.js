const { Alert, Card, Button, Table } = ReactBootstrap;

// Firebase Configuration
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
const db = firebase.firestore();
const auth = firebase.auth();

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      students: [],
      stdId: "",
      stdTitle: "",
      stdFname: "",
      stdLname: "",
      stdEmail: "",
      stdPhone: "",
    };
  }

  componentDidMount() {
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.setState({ user: user.toJSON() });
      } else {
        this.setState({ user: null });
      }
    });

    db.collection("user")
      .get()
      .then((querySnapshot) => {
        let students = [];
        querySnapshot.forEach((doc) => {
          students.push({ id: doc.id, ...doc.data() });
        });
        this.setState({ students });
      });
  }

  google_login = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");

    auth
      .signInWithPopup(provider)
      .then((result) => {
        const user = result.user;
        if (user) {
          this.setState({ user: user.toJSON() });

          const userRef = db.collection("users").doc(user.uid);
          userRef.get().then((doc) => {
            if (!doc.exists) {
              userRef.set({
                name: user.displayName,
                email: user.email,
                photo: user.photoURL,
                phone: "",
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              });
            }
          });
        }
      })
      .catch((error) => console.error("Login failed:", error));
  };

  google_logout = () => {
    if (confirm("Are you sure?")) {
      auth.signOut();
    }
  };

  render() {
    return (
      <Card>
        <Card.Header>
          <Alert variant="info">
            <b>Student Check-In System</b>
          </Alert>
        </Card.Header>
        <LoginBox user={this.state.user} app={this} />
        <Card.Body>
          <Info user={this.state.user} app={this} />
        </Card.Body>
        <Card.Footer>
          By 653380201-2 ธนวัฒน์ ถนัดค้า
          <br />
          College of Computing, Khon Kaen University
        </Card.Footer>
      </Card>
    );
  }
}

// ✅ Component: LoginBox
function LoginBox({ user, app }) {
  return user ? (
    <div className="d-flex align-items-center">
      <img
        src={user.photoURL}
        alt="User Avatar"
        className="rounded-circle me-3"
        style={{ width: "50px", height: "50px" }}
      />
      <span className="me-3">{user.email}</span>
      <Button onClick={app.google_logout} variant="danger" className="ms-2">
        Logout
      </Button>
    </div>
  ) : (
    <Button onClick={app.google_login}>Login</Button>
  );
}

// ✅ Component: Info
function Info({ user }) {
  const [phone, setPhone] = React.useState("");

  React.useEffect(() => {
    if (user) {
      const userRef = db.collection("users").doc(user.uid);
      userRef.get().then((doc) => {
        if (doc.exists) {
          setPhone(doc.data().phone || "Not set");
        }
      });
    }
  }, [user]);

  return user ? (
    <div>
      <h1>ยินดีต้อนรับ</h1>
      <h2>{user.displayName}</h2>
      <h3>{user.email}</h3>
      <h4>Phone: {phone}</h4>
      <EditProfileButton user={user} />
    </div>
  ) : (
    <h1>กรุณาเข้าสู่ระบบ</h1>
  );
}

// ✅ Component: EditProfileButton
function EditProfileButton({ user }) {
  const [showModal, setShowModal] = React.useState(false);
  const [newName, setNewName] = React.useState(user.displayName || "");
  const [newPhone, setNewPhone] = React.useState("");

  React.useEffect(() => {
    const userRef = db.collection("users").doc(user.uid);
    userRef.get().then((doc) => {
      if (doc.exists) {
        setNewPhone(doc.data().phone || "");
      }
    });
  }, [user]);

  const handleSave = () => {
    const userRef = db.collection("users").doc(user.uid);
    userRef
      .update({
        name: newName,
        phone: newPhone,
      })
      .then(() => {
        alert("Profile updated successfully!");

        setShowModal(false);
        
        window.location.reload();
      })
      .catch((error) => console.error("Error updating profile:", error));
  };


  return (
    <div>
      <Button onClick={() => setShowModal(true)}>Edit Profile</Button>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Profile</h3>
            <label>Name:</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <label>Phone:</label>
            <input
              type="text"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <div className="modal-buttons">
              <Button onClick={handleSave}>Save</Button>
              <Button onClick={() => setShowModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Render App in React 18+
const container = document.getElementById("myapp");
const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
