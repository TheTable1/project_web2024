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
      subjects: [],
      newSubject: "",
      newSubjectCode: "",  // เพิ่มฟิลด์สำหรับ subjectCode
      subjectToEdit: null,
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

    // Load students
    db.collection("user")
      .get()
      .then((querySnapshot) => {
        let students = [];
        querySnapshot.forEach((doc) => {
          students.push({ id: doc.id, ...doc.data() });
        });
        this.setState({ students });
      });

    // Load subjects
    db.collection("subjects")
      .get()
      .then((querySnapshot) => {
        let subjects = [];
        querySnapshot.forEach((doc) => {
          subjects.push({ id: doc.id, ...doc.data() });
        });
        this.setState({ subjects });
      });
  }

  handleSubjectChange = (event) => {
    this.setState({ newSubject: event.target.value });
  };

  handleSubjectCodeChange = (event) => {
    this.setState({ newSubjectCode: event.target.value });
  };

  addSubject = () => {
    const { newSubject, newSubjectCode } = this.state;
    if (newSubject.trim() === "" || newSubjectCode.trim() === "") {
      alert("Please enter both subject name and subject code.");
      return;
    }

    db.collection("subjects")
      .add({
        name: newSubject,
        code: newSubjectCode,  // บันทึก subjectCode ใน Firestore
      })
      .then(() => {
        alert("Subject added successfully!");
        this.setState({ newSubject: "", newSubjectCode: "" });
        this.refreshSubjects();
      })
      .catch((error) => console.error("Error adding subject:", error));
  };

  editSubject = (subject) => {
    this.setState({
      subjectToEdit: subject,
      newSubject: subject.name,
      newSubjectCode: subject.code,  // กำหนดค่าให้กับฟิลด์ subjectCode เมื่อเลือกแก้ไข
    });
  };

  updateSubject = () => {
    const { subjectToEdit, newSubject, newSubjectCode } = this.state;
    if (newSubject.trim() === "" || newSubjectCode.trim() === "") {
      alert("Please enter both subject name and subject code.");
      return;
    }

    db.collection("subjects")
      .doc(subjectToEdit.id)
      .update({
        name: newSubject,
        code: newSubjectCode,  // อัปเดต subjectCode ใน Firestore
      })
      .then(() => {
        alert("Subject updated successfully!");
        this.setState({ newSubject: "", newSubjectCode: "", subjectToEdit: null });
        this.refreshSubjects();
      })
      .catch((error) => console.error("Error updating subject:", error));
  };

  deleteSubject = (subjectId) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      db.collection("subjects")
        .doc(subjectId)
        .delete()
        .then(() => {
          alert("Subject deleted successfully!");
          this.refreshSubjects();
        })
        .catch((error) => console.error("Error deleting subject:", error));
    }
  };

  refreshSubjects = () => {
    db.collection("subjects")
      .get()
      .then((querySnapshot) => {
        let subjects = [];
        querySnapshot.forEach((doc) => {
          subjects.push({ id: doc.id, ...doc.data() });
        });
        this.setState({ subjects });
      });
  };

  render() {
    return (
      <Card>
        <LoginBox user={this.state.user} app={this} />
        <Card.Body>
          <Info user={this.state.user} app={this} />
          {this.state.user && (
  <div className="mt-4">
    <h3>Manage Subjects</h3>

    <input
      type="text"
      value={this.state.newSubjectCode}
      onChange={this.handleSubjectCodeChange}
      placeholder="Enter subject code"
    />
    <input
      type="text"
      value={this.state.newSubject}
      onChange={this.handleSubjectChange}
      placeholder="Enter subject name"
    />
    <Button onClick={this.addSubject}>Add Subject</Button>

    {this.state.subjectToEdit && (
      <div>
        <h4>Edit Subject</h4>
        <input
          type="text"
          value={this.state.newSubjectCode}
          onChange={this.handleSubjectCodeChange}
        />
        <input
          type="text"
          value={this.state.newSubject}
          onChange={this.handleSubjectChange}
        />
        
        <Button onClick={this.updateSubject}>Update Subject</Button>
      </div>
    )}

    <SubjectTable
      subjects={this.state.subjects}
      app={this}
      onDelete={this.deleteSubject}
      onEdit={this.editSubject}
    />
  </div>
)}

        </Card.Body>
      </Card>
    );
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
                room : [],
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

}


function SubjectTable({ subjects, app, onDelete, onEdit }) {
  return (
    <Table>
      <thead>
        <tr>
        <th>Subject Code</th>
          <th>Subject Name</th>
           {/* เพิ่มคอลัมน์สำหรับแสดง subjectCode */}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {subjects.map((subject) => (
          <tr key={subject.id}>
            <td>{subject.code}</td>
            <td>{subject.name}</td>
             {/* แสดง subjectCode */}
            <td>
              <Button onClick={() => onEdit(subject)}>Edit</Button>
              <Button onClick={() => onDelete(subject.id)}>Delete</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}



// ✅ Component: LoginBox
function LoginBox({ user, app }) {
  return user ? (
    <div className="d-flex align-items-center bg-light p-3 rounded shadow-sm">
      <img
        src={user.photoURL}
        alt="User Avatar"
        className="rounded-circle border border-2 border-primary"
        style={{ width: "50px", height: "50px", objectFit: "cover" }}
      />
      <span className="ms-3 fw-bold text-dark">{user.email}</span>
      <Button
        onClick={app.google_logout}
        variant="danger"
        className="ms-auto px-4 py-2"
      >
        Logout
      </Button>
    </div>
  ) : (
    <div className="d-flex justify-content-center">
      <Button
        onClick={app.google_login}
        variant="primary"
        className="px-4 py-2 fw-bold shadow-sm"
      >
        Login
      </Button>
    </div>
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
