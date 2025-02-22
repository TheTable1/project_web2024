const { Alert, Card, Button, Table, Form, Modal, Container, Row, Col } =
  ReactBootstrap;

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
      newSubjectCode: "",
      subjectToEdit: null,
      showSubjects: false,
    };
    this.toggleSubjects = this.toggleSubjects.bind(this);
  }

  toggleSubjects = () => {
    console.log("666666");
    this.setState((prevState) => ({ showSubjects: !prevState.showSubjects }));
  };

  componentDidMount() {
    // เมื่อ component ถูกโหลดเข้ามา จะเริ่มตรวจสอบสถานะผู้ใช้
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.setState({ user: user.toJSON() }, () => {
          this.loadSubjects(); // เรียกใช้ loadSubjects เมื่อผู้ใช้เข้าสู่ระบบ
        });
      } else {
        this.setState({ user: null });
      }
    });


    this.loadStudents();
    this.loadSubjects();
  }

  loadStudents = () => {
    db.collection("user")
      .get()
      .then((querySnapshot) => {
        let students = [];
        querySnapshot.forEach((doc) => {
          students.push({ id: doc.id, ...doc.data() });
        });
        this.setState({ students });
      });
  };

  loadSubjects = () => {
    const { user } = this.state;
    if (!user) return;

    // ดึงข้อมูลวิชาจาก path /users/{user.uid}/classroom
    db.collection("users")
      .doc(user.uid)
      .collection("classroom")
      .get()
      .then((querySnapshot) => {
        let subjects = [];
        querySnapshot.forEach((doc) => {
          subjects.push({ id: doc.id, ...doc.data() });
        });
        this.setState({ subjects });
      })
      .catch((error) => console.error("Error fetching subjects:", error));
  };

  handleSubjectChange = (event) => {
    this.setState({ newSubject: event.target.value });
  };

  handleSubjectCodeChange = (event) => {
    this.setState({ newSubjectCode: event.target.value });
  };

  addSubject = () => {
    const { newSubject, newSubjectCode, user } = this.state;
    if (newSubject.trim() === "" || newSubjectCode.trim() === "") {
      alert("Please enter both subject name and subject code.");
      return;
    }

    // เพิ่มรายวิชาไปที่ path /users/{user.uid}/classroom
    db.collection("users")
      .doc(user.uid)
      .collection("classroom")
      .add({
        name: newSubject,
        code: newSubjectCode,
      })
      .then(() => {
        alert("Subject added successfully!");
        this.setState({ newSubject: "", newSubjectCode: "" });
        this.loadSubjects(); // โหลดใหม่หลังเพิ่มวิชา
      })
      .catch((error) => console.error("Error adding subject:", error));
  };

  editSubject = (subject) => {
    this.setState({
      subjectToEdit: subject,
      newSubject: subject.name,
      newSubjectCode: subject.code,
    });
  };

  updateSubject = () => {
    const { subjectToEdit, newSubject, newSubjectCode, user } = this.state;
    if (newSubject.trim() === "" || newSubjectCode.trim() === "") {
      alert("Please enter both subject name and subject code.");
      return;
    }

    // แก้ไขข้อมูลใน path /users/{user.uid}/classroom/{subjectId}
    db.collection("users")
      .doc(user.uid)
      .collection("classroom")
      .doc(subjectToEdit.id)
      .update({
        name: newSubject,
        code: newSubjectCode,
      })
      .then(() => {
        alert("Subject updated successfully!");
        this.setState({
          newSubject: "",
          newSubjectCode: "",
          subjectToEdit: null,
        });
        this.loadSubjects();
      })
      .catch((error) => console.error("Error updating subject:", error));
  };

  deleteSubject = (subjectId) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      const { user } = this.state;
      // ลบรายวิชาจาก path /users/{user.uid}/classroom/{subjectId}
      db.collection("users")
        .doc(user.uid)
        .collection("classroom")
        .doc(subjectId)
        .delete()
        .then(() => {
          alert("Subject deleted successfully!");
          this.loadSubjects(); // โหลดข้อมูลวิชาใหม่หลังจากลบ
        })
        .catch((error) => console.error("Error deleting subject:", error));
    }
  };

  // (หากต้องการใช้งาน refreshSubjects ก็ควรเปลี่ยน path ด้วย)
  refreshSubjects = () => {
    const { user } = this.state;
    if (!user) return;
    db.collection("users")
      .doc(user.uid)
      .collection("classroom")
      .get()
      .then((querySnapshot) => {
        let subjects = [];
        querySnapshot.forEach((doc) => {
          subjects.push({ id: doc.id, ...doc.data() });
        });
        this.setState({ subjects });
      });
  };

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
                room: [],
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
      <Container className="mt-4">
        <Card className="shadow-sm">
          <Card.Body>
            <LoginBox user={this.state.user} app={this} />
            <Info user={this.state.user} app={this} toggleSubjects={this.toggleSubjects} />

            {this.state.user && this.state.showSubjects && (
              <div className="mt-4">
                <h3 className="text-primary mb-3">Manage Subjects</h3>

                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Control
                      type="text"
                      value={this.state.newSubjectCode}
                      onChange={this.handleSubjectCodeChange}
                      placeholder="Enter subject code"
                      className="mb-2"
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Control
                      type="text"
                      value={this.state.newSubject}
                      onChange={this.handleSubjectChange}
                      placeholder="Enter subject name"
                      className="mb-2"
                    />
                  </Col>
                  <Col md={4}>
                    <Button
                      variant="success"
                      onClick={this.addSubject}
                      className="w-100"
                    >
                      Add Subject
                    </Button>
                  </Col>
                </Row>

                {this.state.subjectToEdit && (
                  <div className="border p-3 rounded shadow-sm bg-light">
                    <h4 className="text-warning">Edit Subject</h4>
                    <Row className="mb-2">
                      <Col>
                        <Form.Control
                          type="text"
                          value={this.state.newSubjectCode}
                          onChange={this.handleSubjectCodeChange}
                        />
                      </Col>
                      <Col>
                        <Form.Control
                          type="text"
                          value={this.state.newSubject}
                          onChange={this.handleSubjectChange}
                        />
                      </Col>
                      
                      <Col>
                        <Button
                          variant="primary"
                          onClick={this.updateSubject}
                          className="w-100"
                        >
                          Update Subject
                        </Button>
                      </Col>
                    </Row>
                  </div>
                )}

                <SubjectTable
                  subjects={this.state.subjects}
                  onDelete={this.deleteSubject}
                  onEdit={this.editSubject}
                />
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    );
  }
}

// Component: SubjectTable
function SubjectTable({ subjects, onDelete, onEdit }) {
  return (
    <Table striped bordered hover responsive className="mt-4">
      <thead className="table-dark">
        <tr>
          <th>Subject Code</th>
          <th>Subject Name</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {subjects.map((subject) => (
          <tr key={subject.id}>
            <td>{subject.code}</td>
            <td>{subject.name}</td>
            <td>
              <Button
                variant="warning"
                size="sm"
                className="me-2"
                onClick={() => onEdit(subject)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDelete(subject.id)}
              >
                Delete
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

// Component: LoginBox
function LoginBox({ user, app }) {
  return user ? (
    <Card className="p-4 shadow-sm bg-light text-center">
      <div className="d-flex align-items-center justify-content-center">
        <img
          src={user.photoURL}
          alt="User Avatar"
          className="rounded-circle border border-3 border-primary"
          style={{ width: "80px", height: "80px", objectFit: "cover" }}
        />
      </div>
      <h4 className="mt-3 text-dark">{user.displayName}</h4>
      <p className="text-muted">{user.email}</p>
      <Button
        onClick={app.google_logout}
        variant="secondary"
        className="ms-auto px-4 py-2"
      >
        <i className="bi bi-box-arrow-right me-2" style={{ color: "gray" }}></i>{" "}
        Logout
      </Button>
    </Card>
  ) : (
    <div
      className="d-flex vh-100 justify-content-center align-items-center"
      style={{ background: "#f8f9fa" }}
    >
      <Card className="p-5 shadow-lg text-center">
        <h2 className="mb-4 text-primary fw-bold">กรุณาเข้าสู่ระบบ</h2>
        <Button
          variant="primary"
          onClick={app.google_login}
          className="px-4 py-2 fw-bold shadow-sm"
        >
          <i className="bi bi-google me-2"></i> Login with Google
        </Button>
      </Card>
    </div>
  );
}

<<<<<<< Updated upstream
// Component: Info
function Info({ user }) {
=======

// ✅ Component: Info
function Info({ user ,toggleSubjects }) {
>>>>>>> Stashed changes
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
      <h4>ยินดีต้อนรับ</h4>
      <h4>Name: {user.displayName}</h4>
      <h4>Email: {user.email}</h4>
      <h4>Phone: {phone}</h4>
      <EditProfileButton user={user} />
      <Button variant="success" className="mt-2" onClick={toggleSubjects}><i className="bi bi-pencil-square me-2">
        </i> View Classroom
      </Button>
      <Button variant="success" className="mt-2" onClick={toggleSubjects}><i className="bi bi-pencil-square me-2">
        </i> View Classroom
      </Button>
      
    </div>
  ) : (
    <h1></h1>
  );
}

// Component: EditProfileButton
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
    <>
      <Button
        variant="warning"
        className="mt-2"
        onClick={() => setShowModal(true)}
      >
        <i className="bi bi-pencil-square me-2"></i> Edit Profile
      </Button>

      {/* Bootstrap Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name:</Form.Label>
              <Form.Control
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter your name"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone:</Form.Label>
              <Form.Control
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Enter your phone number"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleSave}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

// Render App in React 18+
const container = document.getElementById("myapp");
const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);