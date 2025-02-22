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

// Initialize Firebase (compat version)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage(); // ใช้งาน Firebase Storage (แต่ในส่วนนี้จะไม่ใช้สำหรับเปลี่ยนรูปโปรไฟล์)

// Main App Component
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      subjects: [],
      newSubject: "",
      newSubjectCode: "",
      newRoom: "",
      subjectToEdit: null,
      showSubjects: false,
    };
    this.toggleSubjects = this.toggleSubjects.bind(this);
  }

  toggleSubjects = () => {
    console.log("Toggle Subjects");
    this.setState((prevState) => ({ showSubjects: !prevState.showSubjects }));
  };

  componentDidMount() {
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.setState({ user: user.toJSON() }, () => {
          this.loadSubjects();
        });
      } else {
        this.setState({ user: null });
      }
    });
  }

  // โหลดข้อมูลรายวิชา จาก path /users/{user.uid}/classroom
  loadSubjects = () => {
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
      })
      .catch((error) => console.error("Error fetching subjects:", error));
  };

  // Handlers สำหรับ input ของวิชา
  handleSubjectChange = (event) => {
    this.setState({ newSubject: event.target.value });
  };
  handleSubjectCodeChange = (event) => {
    this.setState({ newSubjectCode: event.target.value });
  };
  handleSubjectRoomChange = (event) => {
    this.setState({ newRoom: event.target.value });
  };

  addSubject = () => {
    const { newSubject, newSubjectCode, newRoom, user } = this.state;
    if (newSubject.trim() === "" || newSubjectCode.trim() === "") {
      alert("Please enter both subject name and subject code.");
      return;
    }
    db.collection("users")
      .doc(user.uid)
      .collection("classroom")
      .add({
        name: newSubject,
        code: newSubjectCode,
        room: newRoom,
      })
      .then(() => {
        alert("Subject added successfully!");
        this.setState({ newSubject: "", newSubjectCode: "", newRoom: "" });
        this.loadSubjects();
      })
      .catch((error) => console.error("Error adding subject:", error));
  };

  editSubject = (subject) => {
    this.setState({
      subjectToEdit: subject,
      newSubject: subject.name,
      newSubjectCode: subject.code,
      newRoom: subject.room || "",
    });
  };

  updateSubject = () => {
    const { subjectToEdit, newSubject, newSubjectCode, newRoom, user } =
      this.state;
    if (newSubject.trim() === "" || newSubjectCode.trim() === "") {
      alert("Please enter both subject name and subject code.");
      return;
    }
    db.collection("users")
      .doc(user.uid)
      .collection("classroom")
      .doc(subjectToEdit.id)
      .update({
        name: newSubject,
        code: newSubjectCode,
        room: newRoom,
      })
      .then(() => {
        alert("Subject updated successfully!");
        this.setState({
          newSubject: "",
          newSubjectCode: "",
          newRoom: "",
          subjectToEdit: null,
        });
        this.loadSubjects();
      })
      .catch((error) => console.error("Error updating subject:", error));
  };

  deleteSubject = (subjectId) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      const { user } = this.state;
      db.collection("users")
        .doc(user.uid)
        .collection("classroom")
        .doc(subjectId)
        .delete()
        .then(() => {
          alert("Subject deleted successfully!");
          this.loadSubjects();
        })
        .catch((error) => console.error("Error deleting subject:", error));
    }
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
          // ตรวจสอบว่ามีเอกสารของผู้ใช้ใน Firestore หรือไม่ ถ้าไม่มีให้สร้างใหม่
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
            <Button
              variant="success"
              className="mt-2"
              onClick={this.toggleSubjects}
            >
              <i className="bi bi-pencil-square me-2"></i> View Classroom
            </Button>
            <Info user={this.state.user} app={this} />
            {this.state.user && this.state.showSubjects && (
              <div className="mt-4">
                <h3 className="text-primary mb-3">Manage Subjects</h3>
                {/* ฟอร์มสำหรับเพิ่มวิชาใหม่ */}
                <Row className="mb-3">
                  <Col md={3}>
                    <Form.Control
                      type="text"
                      value={this.state.newSubjectCode}
                      onChange={this.handleSubjectCodeChange}
                      placeholder="Enter subject code"
                      className="mb-2"
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Control
                      type="text"
                      value={this.state.newSubject}
                      onChange={this.handleSubjectChange}
                      placeholder="Enter subject name"
                      className="mb-2"
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Control
                      type="text"
                      value={this.state.newRoom}
                      onChange={this.handleSubjectRoomChange}
                      placeholder="Enter room"
                      className="mb-2"
                    />
                  </Col>
                  <Col md={3}>
                    <Button
                      variant="success"
                      onClick={this.addSubject}
                      className="w-100"
                    >
                      Add Subject
                    </Button>
                  </Col>
                </Row>
                {/* ฟอร์มแก้ไขวิชา */}
                {this.state.subjectToEdit && (
                  <div className="border p-3 rounded shadow-sm bg-light">
                    <h4 className="text-warning">Edit Subject</h4>
                    <Row className="mb-2">
                      <Col md={3}>
                        <Form.Control
                          type="text"
                          value={this.state.newSubjectCode}
                          onChange={this.handleSubjectCodeChange}
                          placeholder="Subject Code"
                        />
                      </Col>
                      <Col md={3}>
                        <Form.Control
                          type="text"
                          value={this.state.newSubject}
                          onChange={this.handleSubjectChange}
                          placeholder="Subject Name"
                        />
                      </Col>
                      <Col md={3}>
                        <Form.Control
                          type="text"
                          value={this.state.newRoom}
                          onChange={this.handleSubjectRoomChange}
                          placeholder="Room"
                        />
                      </Col>
                      <Col md={3}>
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
                {/* ตารางแสดงรายวิชา */}
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
          <th>Room</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {subjects.map((subject) => (
          <tr key={subject.id}>
            <td>{subject.code}</td>
            <td>{subject.name}</td>
            <td>{subject.room || "-"}</td>
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

// Component: LoginBox (ดึงข้อมูลผู้ใช้จาก Firestore เพื่อแสดงข้อมูลโปรไฟล์)
function LoginBox({ user, app }) {
  const [userData, setUserData] = React.useState(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  React.useEffect(() => {
    if (user) {
      const userRef = db.collection("users").doc(user.uid);
      userRef.get().then((doc) => {
        if (doc.exists) {
          const data = doc.data();
          setName(data.name || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
        }
      });
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      const userRef = db.collection("users").doc(user.uid);
      userRef.get().then((doc) => {
        if (doc.exists) {
          setUserData(doc.data());
        }
      });
    }
  }, [user]);

  if (!user) {
    return (
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

  return (
    <Card className="p-4 shadow-sm bg-light text-center">
      <div className="d-flex align-items-center justify-content-center">
        <img
          src={userData?.photo || "/default-avatar.png"}
          alt="User Avatar"
          className="rounded-circle border border-3 border-primary "
          style={{ width: "130px", height: "130px", objectFit: "cover" }}
        />
      </div>
      <h4 className="mt-4 text-dark">{userData?.name || "No Name"}</h4>
      <p className="text-muted mb-1">{userData?.email || "No Email"}</p>
      <p className="text-muted pt-0">{userData?.phone || "No Phone"}</p>
      <div className="">
        <EditProfileButton
          userId={user.uid}
          currentName={name}
          currentEmail={email}
          currentPhone={phone}
        />
      </div>
      <Button
        onClick={app.google_logout}
        variant="secondary"
        className="ms-auto px-4 py-2"
      >
        <i className="bi bi-box-arrow-right me-2" style={{ color: "gray" }}></i>{" "}
        Logout
      </Button>
    </Card>
  );
}

// Component: Info (สำหรับแสดงข้อมูลเพิ่มเติม หากต้องการ)
function Info({ user }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  React.useEffect(() => {
    if (user) {
      const userRef = db.collection("users").doc(user.uid);
      userRef.get().then((doc) => {
        if (doc.exists) {
          const data = doc.data();
          setName(data.name || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
        }
      });
    }
  }, [user]);

  return user ? <div className="mt-3"></div> : <h1></h1>;
}

// Component: EditProfileButton (เลือก default profile picture โดยไม่ใช้ file storage)
function EditProfileButton({
  userId,
  currentName,
  currentEmail,
  currentPhone,
}) {
  const [showModal, setShowModal] = React.useState(false);
  const [newName, setNewName] = React.useState(currentName);
  const [newEmail, setNewEmail] = React.useState(currentEmail);
  const [newPhone, setNewPhone] = React.useState(currentPhone);
  // state สำหรับเก็บ URL รูปโปรไฟล์ที่เลือกจาก default images
  const [newProfilePicture, setNewProfilePicture] = React.useState(null);

  React.useEffect(() => {
    setNewName(currentName);
    setNewEmail(currentEmail);
    setNewPhone(currentPhone);
  }, [currentName, currentEmail, currentPhone]);

  const handleSave = () => {
    const userRef = db.collection("users").doc(userId);
    let updateData = {
      name: newName,
      email: newEmail,
      phone: newPhone,
    };
    // ถ้ามีการเลือก default image ให้บันทึก URL รูปที่เลือกไว้
    if (newProfilePicture) {
      updateData.photo = newProfilePicture;
    }
    userRef
      .update(updateData)
      .then(() => {
        alert("Profile updated successfully!");
        setShowModal(false);
        window.location.reload();
      })
      .catch((error) => console.error("Error updating profile:", error));
  };

  // รายการ default images ที่ให้เลือก (แก้ไขเป็น URL ที่ต้องการได้)
  const defaultImages = [
    "/web/default-avatar.jpg",
    "/web/default-avatar1.jpg",
    "/web/default-avatar2.jpg",
    "/web/default-avatar3.jpg",
    "/web/default-avatar4.jpg",
    "/web/default-avatar5.jpg",
    "/web/default-avatar6.jpg",
    "/web/default-avatar7.jpg",
    "/web/default-avatar8.jpg",
    "/web/default-avatar9.jpg",
    "/web/default-avatar10.jpg",
    "/web/default-avatar11.jpg",
  ];

  return (
    <>
      <Button
        variant="warning"
        className=""
        onClick={() => setShowModal(true)}
      >
        <i className="bi bi-pencil-square me-2"></i> Edit Profile
      </Button>

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
              <Form.Label>Email:</Form.Label>
              <Form.Control
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter your email"
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
            <Form.Group className="mb-3">
              <Form.Label>Select Default Profile Picture:</Form.Label>
              <div className="d-flex flex-wrap">
                {defaultImages.map((imgUrl, index) => (
                  <img
                    key={index}
                    src={imgUrl}
                    alt={`Default ${index}`}
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "cover",
                      cursor: "pointer",
                      border:
                        newProfilePicture === imgUrl
                          ? "3px solid #007bff"
                          : "1px solid #ccc",
                      borderRadius: "50%",
                      marginRight: "10px",
                      marginBottom: "10px",
                    }}
                    onClick={() => setNewProfilePicture(imgUrl)}
                  />
                ))}
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={handleSave}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

// Render App in React
const container = document.getElementById("myapp");
const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
