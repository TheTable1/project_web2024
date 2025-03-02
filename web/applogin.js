const { Alert, Card, Button, Table, Form, Modal, Container, Row, Col } =
  ReactBootstrap;

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrjydWmT19vEJu6zvsJCZk-iLg5P9G_9c",
  authDomain: "web2567teungteung.firebaseapp.com",
  projectId: "web2567teungteung",
  storageBucket: "web2567teungteung.firebasestorage.app",
  messagingSenderId: "472898800755",
  appId: "1:472898800755:web:b861572160a6ca34a4ae06",
  measurementId: "G-LVKQEQ5Z67",
};

// Initialize Firebase (compat version)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Component สำหรับสร้าง QR Code ด้วย QRCode.js
function QRCodeComponent({ value, size }) {
  const qrRef = React.useRef(null);
  React.useEffect(() => {
    if (qrRef.current) {
      qrRef.current.innerHTML = "";
      new QRCode(qrRef.current, {
        text: value,
        width: size,
        height: size,
      });
    }
  }, [value, size]);
  return <div ref={qrRef}></div>;
}

// QAModal Component สำหรับตั้งคำถามและแสดงคำตอบแบบ Realtime
function QAModal({ show, onClose, subject, userId, currentCheckinNo }) {
  const [questionNo, setQuestionNo] = React.useState("");
  const [questionText, setQuestionText] = React.useState("");
  const [answers, setAnswers] = React.useState([]);
  const [unsubscribeAnswers, setUnsubscribeAnswers] = React.useState(null);

  // เมื่อ modal ปิด ให้เคลียร์ข้อมูลและยกเลิก listener ถ้ามี
  React.useEffect(() => {
    if (!show) {
      setQuestionNo("");
      setQuestionText("");
      setAnswers([]);
      if (unsubscribeAnswers) {
        unsubscribeAnswers();
        setUnsubscribeAnswers(null);
      }
    }
  }, [show]);

  const startQuestion = () => {
    if (!currentCheckinNo) {
      alert("กรุณาเปิดเช็คชื่อก่อนที่จะตั้งคำถาม");
      return;
    }
    if (!questionNo || !questionText) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    auth.onAuthStateChanged((user) => {
      if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อน");
        return;
      }
      const uid = user.uid;
      db.collection("users")
        .doc(uid)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(currentCheckinNo)
        .set(
          {
            question_no: questionNo,
            question_text: questionText,
            question_show: true,
          },
          { merge: true }
        )
        .then(() => {
          alert("เริ่มถามคำถามสำเร็จ");
          // เริ่มฟัง (Realtime) คำตอบจาก subcollection "answers" โดย filter ตาม question_no
          const unsubscribe = db
            .collection("users")
            .doc(uid)
            .collection("classroom")
            .doc(subject.id)
            .collection("checkin")
            .doc(currentCheckinNo)
            .collection("answers")
            .where("question_no", "==", questionNo)
            .onSnapshot((snapshot) => {
              const ansList = [];
              snapshot.forEach((doc) => {
                ansList.push(doc.data());
              });
              setAnswers(ansList);
            });
          setUnsubscribeAnswers(() => unsubscribe);
        })
        .catch((error) => {
          console.error("Error starting question:", error);
          alert("เกิดข้อผิดพลาด: " + error.message);
        });
    });
  };

  const closeQuestion = () => {
    if (!currentCheckinNo) {
      alert("ไม่มีเช็คชื่อที่เปิดอยู่");
      return;
    }
    auth.onAuthStateChanged((user) => {
      if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อน");
        return;
      }
      const uid = user.uid;
      db.collection("users")
        .doc(uid)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(currentCheckinNo)
        .set(
          {
            question_show: false,
          },
          { merge: true }
        )
        .then(() => {
          alert("ปิดคำถามเรียบร้อย");
          if (unsubscribeAnswers) {
            unsubscribeAnswers();
            setUnsubscribeAnswers(null);
          }
        })
        .catch((error) => {
          console.error("Error closing question:", error);
          alert("เกิดข้อผิดพลาด: " + error.message);
        });
    });
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>ตั้งคำถามในห้องเรียน</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>หมายเลขคำถาม</Form.Label>
            <Form.Control
              type="number"
              value={questionNo}
              onChange={(e) => setQuestionNo(e.target.value)}
              placeholder="กรอกหมายเลขคำถาม"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>ข้อความคำถาม</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="กรอกข้อความคำถาม"
            />
          </Form.Group>
          <div className="d-flex justify-content-between">
            <Button variant="success" onClick={startQuestion}>
              เริ่มถาม
            </Button>
            <Button variant="danger" onClick={closeQuestion}>
              ปิดคำถาม
            </Button>
          </div>
          <hr />
          <h5>คำตอบที่ได้รับ (Realtime)</h5>
          {answers.length > 0 ? (
            answers.map((ans, index) => (
              <p key={index}>{ans.answer_text || "ไม่มีคำตอบ"}</p>
            ))
          ) : (
            <p>ยังไม่มีคำตอบ</p>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          ปิด
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// Main App Component
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      subjects: [],
      // สำหรับฟอร์มเพิ่มวิชา (Manage Subjects)
      newSubject: "",
      newSubjectCode: "",
      newRoom: "",
      newCheckincode: "",
      newPhoto: null, // URL ของอวตารที่เลือกสำหรับเพิ่มวิชา
      // สำหรับการแสดงวิชาใน Classroom/Subject Detail
      showSubjects: false,
      showClassroom: false,
      selectedSubject: null, // เมื่อเลือกวิชาแล้วให้เก็บไว้ตรงนี้
      // Modal สำหรับเลือกรูปอวตาร (สำหรับ Add Subject)
      showSubjectAvatarModal: false,
      // Modal สำหรับแก้ไขวิชา
      subjectToEdit: null,
      showEditSubjectModal: false,
    };
  }

  toggleSubjects = () => {
    this.setState({ showSubjects: true, showClassroom: false });
  };

  toggleClassroom = () => {
    this.setState({
      showClassroom: true,
      showSubjects: false,
      selectedSubject: null,
    });
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

  // โหลดข้อมูลวิชา จาก path /users/{user.uid}/classroom
  loadSubjects = async () => {
    const { user } = this.state;
    if (!user) return;
    try {
      const querySnapshot = await db
        .collection("users")
        .doc(user.uid)
        .collection("classroom")
        .get();
      let subjects = [];
      for (const doc of querySnapshot.docs) {
        const cid = doc.id;
        const infoDoc = await db
          .collection("users")
          .doc(user.uid)
          .collection("classroom")
          .doc(cid)
          .collection("info")
          .doc("details")
          .get();
        if (infoDoc.exists) {
          subjects.push({
            id: cid,
            owner: user.uid,
            ...infoDoc.data(),
          });
        }
      }
      this.setState({ subjects }, () => {
        console.log("All Subjects Loaded:", this.state.subjects);
      });
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  handleSubjectChange = (e) => {
    this.setState({ newSubject: e.target.value });
  };
  handleSubjectCodeChange = (e) => {
    this.setState({ newSubjectCode: e.target.value });
  };
  handleSubjectRoomChange = (e) => {
    this.setState({ newRoom: e.target.value });
  };

  addSubject = async () => {
    const { newSubject, newSubjectCode, newRoom, user, newPhoto } = this.state;
    if (newSubject.trim() === "" || newSubjectCode.trim() === "") {
      alert("Please enter both subject name and subject code.");
      return;
    }
    try {
      const docRef = await db
        .collection("users")
        .doc(user.uid)
        .collection("classroom")
        .add({
          owner: user.uid,
          students: [],
          checkin: [],
        });
      const photoURL = newPhoto || "";
      await db
        .collection("users")
        .doc(user.uid)
        .collection("classroom")
        .doc(docRef.id)
        .collection("info")
        .doc("details")
        .set({
          code: newSubjectCode,
          name: newSubject,
          photo: photoURL,
          room: newRoom,
        });
      alert("Subject added successfully!");
      this.setState({
        newSubject: "",
        newSubjectCode: "",
        newRoom: "",
        newPhoto: null,
      });
      this.loadSubjects();
    } catch (error) {
      console.error("Error adding subject:", error);
    }
  };

  editSubject = (subject) => {
    this.setState({
      subjectToEdit: subject,
      newPhoto: null,
      showEditSubjectModal: true,
    });
  };

  handleCloseEditSubjectModal = () => {
    this.setState({
      showEditSubjectModal: false,
      subjectToEdit: null,
      newPhoto: null,
    });
  };

  handleUpdateSubject = async (updated) => {
    const { subjectToEdit, user } = this.state;
    if (!subjectToEdit) return;
    try {
      const photoURL = updated.photo || subjectToEdit.photo || "";
      await db
        .collection("users")
        .doc(user.uid)
        .collection("classroom")
        .doc(subjectToEdit.id)
        .collection("info")
        .doc("details")
        .update({
          name: updated.name,
          code: updated.code,
          room: updated.room,
          photo: photoURL,
        });
      alert("Subject updated successfully!");
      this.setState({
        subjectToEdit: null,
        showEditSubjectModal: false,
        newPhoto: null,
      });
      this.loadSubjects();
    } catch (error) {
      console.error("Error updating subject:", error);
    }
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
    const { user, subjects, showSubjects, showClassroom, selectedSubject } =
      this.state;
    return (
      <Container
        className="mt-4 p-4 rounded-3 shadow-lg"
        style={{ background: "#e0e0e0", minHeight: "100vh" }}
      >
        <Card className="shadow-sm">
          <Card.Body>
            <LoginBox user={this.state.user} app={this} />
            {user && (
              <div>
                <Button
                  variant="success"
                  className="mt-2"
                  onClick={this.toggleSubjects}
                >
                  <i className="bi bi-pencil-square me-2"></i> Subject
                </Button>
                <Button
                  variant="success"
                  className="mt-2 ms-3"
                  onClick={this.toggleClassroom}
                >
                  <i className="bi bi-pencil-square me-2"></i> Classroom
                </Button>
              </div>
            )}
            {user && showSubjects && (
              <div className="mt-4">
                <h3 className="mb-3" style={{ color: "black" }}>
                  Manage Subjects
                </h3>

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
                      variant="info"
                      onClick={() =>
                        this.setState({ showSubjectAvatarModal: true })
                      }
                      className="mb-2"
                    >
                      Select Avatar
                    </Button>
                    {this.state.newPhoto && (
                      <img
                        src={this.state.newPhoto}
                        alt="Selected Avatar"
                        style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "50%",
                          marginTop: "5px",
                        }}
                      />
                    )}
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
                <SubjectTable
                  subjects={subjects}
                  onDelete={this.deleteSubject}
                  onEdit={this.editSubject}
                  onSelect={(subject) =>
                    this.setState({ selectedSubject: subject })
                  }
                />
              </div>
            )}
            {user && showClassroom && !selectedSubject && (
              <ClassroomList
                subjects={subjects}
                onSelect={(subject) =>
                  this.setState({ selectedSubject: subject })
                }
              />
            )}
            {user && showClassroom && selectedSubject && (
              <SubjectDetail
                subject={selectedSubject}
                onBack={() => this.setState({ selectedSubject: null })}
                userId={user.uid}
              />
            )}
          </Card.Body>
        </Card>
        {this.state.showSubjectAvatarModal && (
          <SubjectAvatarSelector
            show={this.state.showSubjectAvatarModal}
            currentAvatar={this.state.newPhoto}
            onSelect={(avatar) =>
              this.setState({ newPhoto: avatar, showSubjectAvatarModal: false })
            }
            onClose={() => this.setState({ showSubjectAvatarModal: false })}
          />
        )}
        {this.state.showEditSubjectModal && (
          <EditSubjectModal
            show={this.state.showEditSubjectModal}
            subject={this.state.subjectToEdit}
            newPhoto={this.state.newPhoto}
            onChangePhoto={(photo) => this.setState({ newPhoto: photo })}
            onSave={this.handleUpdateSubject}
            onClose={this.handleCloseEditSubjectModal}
          />
        )}
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

// Component: ClassroomList
function ClassroomList({ subjects, onSelect }) {
  return (
    <div className="mt-4">
      <h3 className="text-primary mb-3">Classroom</h3>
      <Row>
        {subjects.map((subject) => (
          <Col key={subject.id} md={4} className="mb-4">
            <Card
              onClick={() => onSelect(subject)}
              style={{ cursor: "pointer" }}
            >
              <Card.Img
                variant="top"
                src={subject.photo || "/web/default-subject.jpg"}
                style={{ height: "200px", objectFit: "cover" }}
              />
              <Card.Body>
                <Card.Title>{subject.name}</Card.Title>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

// Component: SubjectDetail
function SubjectDetail({ subject, onBack, userId }) {
  const [showQRCodeModal, setShowQRCodeModal] = React.useState(false);
  const [students, setStudents] = React.useState([]);
  const [showStudentsList, setShowStudentsList] = React.useState(false);
  const [scores, setScores] = React.useState([]);
  const [showScoresList, setShowScoresList] = React.useState(false);
  const [checkinList, setCheckinList] = React.useState([]);
  const [showCheckinList, setShowCheckinList] = React.useState(false);
  const [newCheckinCode, setNewCheckinCode] = React.useState("");
  const [newCheckinStudent, setNewCheckinStudent] = React.useState("");
  const [newCheckinStudentRemark, setNewCheckinStudentRemark] = React.useState("");
  const [newCheckinValidcode, setNewCheckinValidcode] = React.useState("");
  const [selectedCheckin, setSelectedCheckin] = React.useState(null);
  const [studentCode, setStudentCode] = React.useState("");
  const [showQuestionList, setShowQuestionList] = React.useState(false);
  const [questionList, setQuestionList] = React.useState([]);
  const [selectedQuestion, setSelectedQuestion] = React.useState(null);
  const [editingScore, setEditingScore] = React.useState(null);
  const [newScore, setNewScore] = React.useState("");
  const [newRemark, setNewRemark] = React.useState("");
  const [newStatus, setNewStatus] = React.useState("");
  const [newQuestion, setNewQuestion] = React.useState("");
  const [answers, setAnswers] = React.useState([]);
  const [studentCounts, setStudentCounts] = React.useState({});


  // สร้าง URL สำหรับรายละเอียดวิชา (ปรับเปลี่ยนได้ตามโปรเจค)
  const detailURL = `${subject.id}`;

  const openQA = (subjectId) => {
    if (!subjectId) {
      alert("❌ กรุณาเลือกวิชาก่อนเข้าไปยังหน้าคำถาม!");
      return;
    }
    window.location.href = `manage_questions.html?subjectId=${subjectId}`;
  };

  // ตัวอย่างการเรียกใช้ (จากปุ่ม)
  <Button
    variant="secondary"
    size="sm"
    className="rounded-3 fw-bold"
    onClick={() => openQA("CP001002")} // ใส่ subjectId ที่ต้องการ
  >
    ถาม-ตอบ
  </Button>;

  const fetchStudentStatus = async (studentId) => {
    try {
      // Fetch the student's document from the students sub-collection
      const studentDocRef = db
        .collection("users")
        .doc(userId) // Ensure userId is correctly set
        .collection("classroom")
        .doc(subject.id) // Ensure subject.id is set properly
        .collection("students")
        .doc(studentId);

      const studentDoc = await studentDocRef.get();

      if (studentDoc.exists) {
        // Return the status field from the student's document
        return studentDoc.data().status;
      } else {
        console.log("Student document does not exist.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching student status:", error);
      return null;
    }
  };

  const fetchStudents = async () => {
    try {
      // Reference to the "students" collection in the classroom
      const classroomRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("students");

      const snapshot = await classroomRef.get(); // Get all students from the collection

      if (snapshot.empty) {
        console.log("No students found.");
        setStudents([]); // Clear the student list

        return;
      }

      // Extract student IDs from the snapshot
      const studentIds = snapshot.docs.map((doc) => doc.id);

      // Fetch student data from the "users" collection based on the IDs
      const userDocs = await Promise.all(
        studentIds.map((id) => db.collection("users").doc(id).get())
      );

      // Fetch the status for each student and construct the students list
      const studentsList = await Promise.all(
        userDocs.map(async (doc) => {
          if (doc.exists) {
            // Fetch status for the student using their ID
            const status = await fetchStudentStatus(doc.id); // Pass the student ID here
            return { id: doc.id, ...doc.data(), status };
          }
        })
      );

      // Filter out undefined entries (in case of errors)
      const validStudents = studentsList.filter(
        (student) => student !== undefined
      );

      console.log("Fetched students:", validStudents);

      // Update state with the fetched student data
      setStudents(validStudents);
      setShowCheckinList(false);
      setShowStudentsList(true);
      setShowScoresList(false);
      setSelectedCheckin(null);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleAddCheckin = async () => {
    if (!newCheckinCode.trim()) {
      alert("กรุณากรอกรหัสเช็คชื่อ");
      return;
    }

    try {
      const checkinCollectionRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id);

      // 🔹 Get the latest check-in document to determine the next `cno`
      const latestCheckinSnapshot = await checkinCollectionRef
        .collection("checkin")
        .orderBy("cno", "desc")
        .limit(1)
        .get();

      let newCno = 1; // Default to 1 if no check-ins exist
      if (!latestCheckinSnapshot.empty) {
        const latestCheckin = latestCheckinSnapshot.docs[0].data();
        newCno = latestCheckin.cno + 1; // Increment `cno`
      }

      // 🔹 Add new check-in document
      const newCheckinRef = checkinCollectionRef.collection("checkin").doc(newCno.toString());
      await newCheckinRef.set({
        cno: newCno,
        code: newCheckinCode.trim(),
        date: firebase.firestore.FieldValue.serverTimestamp(),
        status: 0, // Default to "Not started"
      });

      // 🔹 Fetch students from classroom/students collection
      const studentCollectionRef = await checkinCollectionRef.collection("students").get();

      // 🔹 Copy each student to checkin/{newCno}/students
      const checkinStudentCollection = newCheckinRef.collection("scores");

      const batch = db.batch(); // Use batch to reduce writes
      studentCollectionRef.forEach((studentDoc) => {
        const studentData = studentDoc.data();
        const studentRef = checkinStudentCollection.doc(studentDoc.id); // Keep the same student ID
        batch.set(studentRef, studentData);
      });

      await batch.commit(); // Execute all writes at once

      setNewCheckinCode(""); // Clear input
      alert("เพิ่มเช็คชื่อสำเร็จ!");
      fetchCheckinList(); // Refresh check-in list
    } catch (error) {
      console.error("Error adding check-in:", error);
    }
  };

  const handleAddStudent = async () => {
    if (!studentCode) {
      alert("กรุณากรอกรหัสนักศึกษา");
      return;
    }

    try {
      const subStudentCollectionRef = firebase
        .firestore()
        .collection("users")
        .doc(userId) // Assuming userId is available in the component
        .collection("classroom")
        .doc(subject.id) // Assuming subject.id is available in the component
        .collection("students");

      const newStudentRef = subStudentCollectionRef.doc(studentCode); // Use the studentCode as the document ID

      // Set the student document with a default status
      await newStudentRef.set({
        status: 0, // Default status "Pending"
      });

      alert("เพิ่มนักศึกษาสำเร็จ!");

      // Clear the input after adding the student
      setStudentCode("");
    } catch (error) {
      console.error("Error adding student:", error);
    }
  };

  const handleViewCheckin = async (checkinId) => {
    try {
      // Step 1: Get the reference to the checkin document
      const checkinDocRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(checkinId);

      // Step 2: Fetch the checkin document
      const checkinDoc = await checkinDocRef.get();

      // Step 3: Check if the document exists
      if (!checkinDoc.exists) {
        console.log("Check-in document does not exist.");
        return;
      }

      // Step 4: Store the check-in document data in the state
      const checkinData = { id: checkinDoc.id, ...checkinDoc.data() };

      // Step 5: Access the students subcollection for the current checkin
      const studentsRef = checkinDocRef.collection("students");
      const studentsSnapshot = await studentsRef.get();

      console.log("Fetched check-in data:", studentsSnapshot);

      // Step 6: Check if the students subcollection contains any documents
      if (!studentsSnapshot.empty) {
        const studentsData = await Promise.all(
          studentsSnapshot.docs.map(async (doc) => {
            const studentData = doc.data();
            console.log("Fetched student data:", studentData);

            const uid = doc.id; // The document ID is the UID
            console.log("Student UID (Document ID):", uid);

            // Step 7: Fetch the user data from the 'users' collection using the uid
            const userDocRef = db.collection("users").doc(uid);
            const userDoc = await userDocRef.get();

            if (userDoc.exists) {
              return {
                id: doc.id,
                stdid: userDoc.data().stid, // Assuming 'stid' is in the 'users' collection
                name: userDoc.data().name, // Assuming 'name' is in the 'users' collection
                remark: studentData.remark,
                date: studentData.date,
              };
            } else {
              console.log("User document not found for student:", uid);
              return null; // Skip this student if user data is not found
            }
          })
        );

        // Filter out any null values in case user data was not found
        const validStudentsData = studentsData.filter(
          (student) => student !== null
        );

        // Step 8: Update the state with both check-in data and students data
        setSelectedCheckin({ ...checkinData, students: validStudentsData });
      } else {
        console.log("No students found in this check-in.");
        setSelectedCheckin({ ...checkinData, students: [] });
      }

      setShowScoresList(false);

    } catch (error) {
      console.error("Error fetching check-in document or students:", error);
    }
  };

  const handleAddCheckinStudent = async () => {
    if (!newCheckinStudent.trim() || !newCheckinStudentRemark.trim() || !newCheckinValidcode.trim()) {
      alert("กรุณากรอกให้ครบ");
      return;
    }

    try {
      const checkinRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(selectedCheckin.id);

      // Fetch the valid code from Firestore
      const checkinDoc = await checkinRef.get();
      if (!checkinDoc.exists) {
        alert("ไม่พบข้อมูลเช็คชื่อ");
        return;
      }

      const validCode = checkinDoc.data().code;
      if (newCheckinValidcode !== validCode) {
        alert("รหัสยืนยันไม่ถูกต้อง");
        return;
      }

      // Proceed to add the student after validation
      const checkinStudentRef = checkinRef
        .collection("students")
        .doc(newCheckinStudent);

      await checkinStudentRef.set({
        remark: newCheckinStudentRemark,
        date: firebase.firestore.FieldValue.serverTimestamp(),
      });

      alert("เพิ่มนักเรียนเช็คชื่อสำเร็จ!");

      // Clear input fields
      setNewCheckinStudent("");
      setNewCheckinStudentRemark("");
      setNewCheckinValidcode("");
      handleViewCheckin(selectedCheckin.id)

    } catch (error) {
      console.error("Error adding check-in student:", error);
    }
  };

  const handleDeleteCheckin = (checkinId) => {
    if (!checkinId) {
      alert("Invalid Checkin ID");
      return;
    }

    try {
      const checkinRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(checkinId);

      checkinRef.delete();

      alert("ลบการเช็คชื่่อเรียบร้อยแล้ว!");
      fetchCheckinList();




    } catch (error) { }

  };

  const handleDeletestudentinchekin = async (studentId) => {
    const confirmDelete = window.confirm("คุณต้องการลบนักเรียนออกจากเช็คอินนี้หรือไม่?");
    if (!confirmDelete) return; // Stop if user clicks 'No'

    try {
      const studentDocRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(selectedCheckin.id)
        .collection("students")
        .doc(studentId);

      await studentDocRef.delete();

      // Update local state after deleting student in Firestore
      setSelectedCheckin((prev) => {
        if (!prev) return prev;
        const updatedStudents = prev.students.filter((s) => s.id !== studentId);
        return { ...prev, students: updatedStudents };
      });

      console.log("Student deleted from check-in:", studentId);
    } catch (error) {
      console.error("Error deleting student from check-in:", error);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) {
      alert("กรุณากรอกคำถาม");
      return;
    }

    try {
      const questionCollectionRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(selectedCheckin.id)
        .collection("question");

      const answersCollectionRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(selectedCheckin.id)
        .collection("answers");

      // Step 1: Get the latest question document to determine the highest ID
      const snapshot = await questionCollectionRef.orderBy("question_id", "desc").limit(1).get();

      let newId = 1; // Default ID in case there are no existing questions

      if (!snapshot.empty) {
        const lastQuestion = snapshot.docs[0];
        newId = lastQuestion.data().question_id + 1; // Increment the last used ID
      }

      // Step 2: Add the new question with the incremented ID
      const questionRef = questionCollectionRef.doc(String(newId));
      await questionRef.set({
        question_text: newQuestion.trim(),
        question_show: true,
        date: firebase.firestore.FieldValue.serverTimestamp(),
        question_id: newId, // Store the incremented ID for reference
      });

      // Step 3: Add an empty answer document with the same ID in the "answers" subcollection
      const answerRef = answersCollectionRef.doc(String(newId));
      await answerRef.set({
        text: newQuestion.trim(),
        date: firebase.firestore.FieldValue.serverTimestamp(),
      });

      alert("เพิ่มคำถามสำเร็จ!");

      setNewQuestion(""); // Clear the input after adding the question
      fetchquestionList(selectedCheckin.id); // Refresh question list
    } catch (error) {
      console.error("Error adding question:", error);
    }
  };

  const handleOpenQuestion = async (questionId) => {
    try {
      await db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(selectedCheckin.id)
        .collection("question")
        .doc(questionId)
        .update({
          question_show: true, // Set to true for open
        });

      alert("คำถามเปิดแล้ว!");
      fetchquestionList(selectedCheckin.id); // Refresh question list after update
    } catch (error) {
      console.error("Error opening question:", error);
    }
  };

  const handleCloseQuestion = async (questionId) => {
    try {
      await db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(selectedCheckin.id)
        .collection("question")
        .doc(questionId)
        .update({
          question_show: false, // Set to false for close
        });

      alert("คำถามปิดแล้ว!");
      fetchquestionList(selectedCheckin.id); // Refresh question list after update
    } catch (error) {
      console.error("Error closing question:", error);
    }
  };

  const handleViewQuestion = async (questionId) => {
    
    try {
      // Validate input
      if (!userId || !subject?.id || !selectedCheckin || !questionId) {
        console.error("Error: Firestore path values must be valid strings.");
        return;
      }

      // Firestore query
      const questionDocRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(String(subject.id))
        .collection("checkin")
        .doc(selectedCheckin.id)
        .collection("question")
        .doc(questionId);

      const questionDoc = await questionDocRef.get();

      if (!questionDoc.exists) {
        console.log("Question document does not exist.", questionId);
        return;
      }

      const questionData = { id: questionDoc.id, ...questionDoc.data() };

      setSelectedQuestion(questionData);

    } catch (error) {
      console.error("Error fetching question document:", questionId, error);
    }

    try {
      const answersRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(selectedCheckin.id)
        .collection("answers")
        .doc(questionId)
        .collection("students");

      console.log("EEeeee", questionId)

      const snapshot = await answersRef.get();

      if (!snapshot.empty) {
        const answersData = snapshot.docs.map(doc => ({
          studentId: doc.id,
          text: doc.data().text || "-", // The student's answer text
          time: doc.data().time || "-", // The timestamp of the answer
        }));
        setAnswers(answersData); // Store the answers in state

        console.log("Ans Example", answers)
      } else {
        console.log("No answers found");
        setAnswers([]); // If no answers, reset the answers state
      }
    } catch (error) {
      console.error("Error fetching answers:", error);
    }

  };

  const handleDeleteQuestion = async (questionId) => {
    if (!questionId) {
      alert("Invalid question ID");
      return;
    }

    try {
      const questionRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(selectedCheckin.id)
        .collection("question")
        .doc(questionId);

      const answerRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(selectedCheckin.id)
        .collection("answers")
        .doc(questionId); // Same ID as the question

      // Delete both the question and its answer document
      await questionRef.delete();
      await answerRef.delete();

      alert("ลบคำถามเรียบร้อยแล้ว!");

      // Refresh question list
      fetchquestionList(selectedCheckin.id);
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  const handleupdateCheckinStatus = async (checkinId, newStatus) => {
    try {
      const checkinDocRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(checkinId);

      await checkinDocRef.update({ status: newStatus });

      // Update local state after changing status in Firestore
      setSelectedCheckin((prev) =>
        prev ? { ...prev, status: newStatus } : prev
      );

      console.log(`Check-in status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating check-in status:", error);
    }
  };

  const handleEditScore = (scoreId) => {
    // Find the score from the list based on its ID
    const scoreToEdit = scores.find(score => score.id === scoreId);

    if (scoreToEdit) {
      // Populate the state with the existing score data to pre-fill the form
      setEditingScore(scoreToEdit);
      setNewScore(scoreToEdit.score || "");
      setNewRemark(scoreToEdit.remark || "");
      setNewStatus(scoreToEdit.status || "");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingScore) return;

    // Prepare the updated data
    const updatedData = {
      score: newScore,
      remark: newRemark,
      status: newStatus,
    };

    try {
      // Update the score in the Firebase Firestore
      await db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(selectedCheckin.id)
        .collection("scores")
        .doc(editingScore.id) // Use the editingScore's id to locate the document
        .update(updatedData);

      // Close the edit modal or form
      setEditingScore(null);
      alert("Score updated successfully!");
    } catch (error) {
      console.error("Error updating score:", error);
      alert("Error updating score.");
    }
  };

  const handleCancelEdit = () => {
    setEditingScore(null); // Close the edit form without saving
  };

  const fetchCheckinList = async () => {
    try {
      const checkinSnap = await db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .get(); // Moved `.get()` to the end

      if (checkinSnap.empty) {
        console.log("No check-in found");
        setCheckinList([]); // Ensure setCheckinList is used (typo fix)
        setShowCheckinList(true);
        setShowStudentsList(false);
        setShowScoresList(false);
        return;
      }

      const checkinData = checkinSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setCheckinList(checkinData); // Update the state with fetched data
      setShowCheckinList(true);
      setShowStudentsList(false);
      setShowScoresList(false);
    } catch (error) {
      console.error("Error fetching check-in:", error);
    }
  };

  const fetchStudentCounts = async () => {
    const counts = {}; // Store fetched counts
  
    for (const checkin of checkinList) {
      const studentsRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(checkin.id)
        .collection("students");
  
      try {
        const snapshot = await studentsRef.get();
        counts[checkin.id] = snapshot.size; // Store student count
      } catch (error) {
        console.error("Error fetching student count:", error);
        counts[checkin.id] = 0; // Default to 0 if there's an error
      }
    }
  
    setStudentCounts(counts); // Update state
  };
  
  // Run function when `checkinList` updates
  React.useEffect(() => {
    if (checkinList.length > 0) {
      fetchStudentCounts();
    }
  }, [checkinList, userId, subject]);

  const fetchScoreList = async () => {
    try {
      const scoreSnap = await db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(selectedCheckin.id)
        .collection("scores")
        .get();

      if (scoreSnap.empty) {
        console.log("No score found");
        setScores([]);
        return;
      }

      // ดึงข้อมูล score พร้อมกับข้อมูล userId และ date จาก `students` subcollection
      const scoreData = await Promise.all(
        scoreSnap.docs.map(async (doc) => {
          const score = doc.data();
          const userDoc = await db.collection("users").doc(doc.id).get();
          console.log(`Fetching user ${doc.id}:`, userDoc.exists ? userDoc.data() : "Not found");

          // ดึงข้อมูล date จาก `students` subcollection ของ userId
          const studentDoc = await db
            .collection("users")
            .doc(userId) // ใช้ doc.id ซึ่งเป็น userId
            .collection("classroom")
            .doc(subject.id)
            .collection("checkin")
            .doc(selectedCheckin.id)
            .collection("students")
            .doc(doc.id) // ใช้ doc.id เป็น studentId
            .get();

          if (!studentDoc.exists) {
            console.log(`Student doc for ${doc.id} not found`);
          }

          const studentDate = studentDoc.exists && studentDoc.data().date instanceof firebase.firestore.Timestamp
            ? studentDoc.data().date.toDate().toLocaleString()
            : "-"; // เช็คว่า `date` เป็น Timestamp ก่อนเรียก .toDate()

          return {
            id: doc.id,
            ...score,
            stid: userDoc.exists ? userDoc.data().stid : "-",
            name: userDoc.exists ? userDoc.data().name : "-",
            date: studentDate, // เพิ่ม date จาก students subcollection
          };
        })
      );

      // ตั้งค่า state เพื่อเก็บข้อมูล score ที่ดึงมา
      setScores(scoreData);
    } catch (error) {
      console.error("Error fetching score:", error);
    }
  };

  const toggleScoresList = () => {
    if (!showScoresList) {
      const unsubscribe = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("scores")
        .onSnapshot((snapshot) => {
          const list = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          setScores(list);
        });
      setShowCheckinList(false);
      setShowStudentsList(false);
      setShowScoresList(true);
    } else {
      setShowScoresList(false);
      setScores([]);
    }
  };

  return (
    <div className="mt-4">
      <Button variant="secondary" onClick={onBack} className="mb-3">
        ออก
      </Button>
      <Card>
        <Card.Img
          variant="top"
          src={subject.photo || "/default-subject.png"}
          style={{ height: "300px", objectFit: "cover" }}
        />
        <Card.Body>
          <Card.Title>{subject.name}</Card.Title>
          <Card.Text>
            <strong>Subject Code:</strong> {subject.code} <br />
            <strong>Room:</strong> {subject.room || "-"}
          </Card.Text>
          <div className="mb-2">
            <Button
              variant="success"
              onClick={fetchCheckinList}
              className="me-2"
            >
              บันทึกการเช็คชื่อ
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowQRCodeModal(true)}
              className="me-2"
            >
              แสดง QRCode วิชา
            </Button>
            <Button variant="secondary" onClick={openQAModal} className="me-2">
              ถาม-ตอบ
            </Button>
            <Button variant="info" onClick={openQuestionList} className="me-2">
              ดูคำถาม
            </Button>
          </div>
          <div className="mb-2">
            <Button variant="dark" onClick={fetchStudents} className="me-2">
              แสดงรายชื่อ
            </Button>
            <Button variant="dark" onClick={toggleScoresList} className="me-2">
              แสดงคะแนน
            </Button>
            <Row>
              <Col md={3}>
                <Form.Control
                  type="text"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="Enter Student code"
                  className="mb-2"
                />
              </Col>
              <Col>
                <Button
                  variant="dark"
                  onClick={handleAddStudent}
                  className="me-2"
                >
                  Join Classroom
                </Button>
              </Col>
            </Row>
          </div>
        </Card.Body>
      </Card>

      <Modal
        show={showQRCodeModal}
        onHide={() => setShowQRCodeModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>QR Code for {subject.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <div className="mx-auto" style={{ width: 200 }}>
            <QRCodeComponent value={detailURL} size={200} />
          </div>
          <p className="mt-2">Scan to view subject details</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQRCodeModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {showStudentsList && (
        <div className="mt-4">
          <h5>รายชื่อนักศึกษาในห้อง</h5>
          <Table striped bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>ลำดับ</th>
                <th>รหัส</th>
                <th>ชื่อ</th>
                <th>สถานะ</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td>{student.stid || "-"}</td>
                  <td>{student.name || "-"}</td>
                  <td>{student.status}</td>
                  <td>
                    {student.status === 0 ? (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={async () => {
                            try {
                              const studentDocRef = db
                                .collection("users")
                                .doc(userId) // Ensure userId is defined properly
                                .collection("classroom")
                                .doc(subject.id) // Ensure subject.id is correct
                                .collection("students")
                                .doc(student.id); // Ensure student.id is valid

                              const studentDoc = await studentDocRef.get();

                              if (!studentDoc.exists) {
                                console.log("Student document does not exist.");
                                return;
                              }

                              // Update the student's status to 1 (Accepted)
                              await studentDocRef.update({
                                status: 1, // Change the status to 1 (Accepted)
                              });

                              console.log("Student accepted:", student.id);
                            } catch (error) {
                              console.error("Error accepting student:", error);
                            }
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={async () => {
                            try {
                              // Remove the student from the sub-collection "students"
                              await db
                                .collection("users")
                                .doc(userId)
                                .collection("classroom")
                                .doc(subject.id)
                                .collection("students")
                                .doc(student.id)
                                .delete(); // Delete the student document from "students" collection

                              // Now remove the student from the local state to re-render the table
                              setStudents((prevStudents) =>
                                prevStudents.filter((s) => s.id !== student.id)
                              );

                              console.log(
                                "Student rejected and removed:",
                                student.id
                              );
                            } catch (error) {
                              console.error("Error rejecting student:", error);
                            }
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          try {
                            // Remove the student from the sub-collection "students"
                            await db
                              .collection("users")
                              .doc(userId)
                              .collection("classroom")
                              .doc(subject.id)
                              .collection("students")
                              .doc(student.id)
                              .delete(); // Delete the student document from "students" collection

                            // Now remove the student from the local state to re-render the table
                            setStudents((prevStudents) =>
                              prevStudents.filter((s) => s.id !== student.id)
                            );

                            console.log(
                              "Student rejected and removed:",
                              student.id
                            );
                          } catch (error) {
                            console.error("Error rejecting student:", error);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {showCheckinList && (
        <div className="mt-4">
          <h5>รายการการเช็คชื่อในห้อง</h5>

          <Row className="mb-3">
            <Col md={3}>
              <Form.Control
                type="text"
                value={newCheckinCode}
                onChange={(e) => setNewCheckinCode(e.target.value)}
                placeholder="Enter check-in code"
                className="mb-2"
              />
            </Col>
            <Col>
              <Button variant="success" onClick={handleAddCheckin}>
                Add Check-in
              </Button>
            </Col>
          </Row>

          <Table striped bordered hover responsive>
  <thead className="table-dark">
    <tr>
      <th>ลำดับ</th>
      <th>รหัส</th>
      <th>เวลาเช็คชื่อ</th>
      <th>สถานะ</th>
      <th>จำนวนนักศึกษา</th> {/* New column */}
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {checkinList.map((checkin, index) => (
      <tr key={checkin.id}>
        <td>{index + 1}</td>
        <td>{checkin.code}</td>
        <td>
          {checkin.date?.seconds
            ? new Date(checkin.date.seconds * 1000).toLocaleString("th-TH", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : "N/A"}
        </td>
        <td>
          {checkin.status === 0
            ? "ยังไม่เริ่ม"
            : checkin.status === 1
            ? "กำลังเช็คชื่อ"
            : "เสร็จแล้ว"}
        </td>
        <td>{studentCounts[checkin.id] ?? "Loading..."}</td> {/* Student count */}
        <td>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              handleViewCheckin(checkin.id);
              setShowQuestionList(false);
              setSelectedQuestion(null);
            }}
          >
            View
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleDeleteCheckin(checkin.id)}
          >
            Delete
          </Button>
        </td>
      </tr>
    ))}
  </tbody>
</Table>

        </div>
      )}

      {selectedCheckin && (
        <div className="mt-4 p-3 border rounded">
          <h5>รายละเอียดเช็คชื่อ</h5>
          <p>
            <strong>รหัส:</strong> {selectedCheckin.code}
          </p>
          <p>
            <strong>เวลาเช็คชื่อ:</strong>{" "}
            {selectedCheckin.date?.seconds
              ? new Date(selectedCheckin.date.seconds * 1000).toLocaleString(
                "th-TH",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }
              )
              : "N/A"}
          </p>
          <p>
            <strong>สถานะ:</strong>
            {selectedCheckin.status === 0
              ? "ยังไม่เริ่ม"
              : selectedCheckin.status === 1
                ? "กำลังเช็คชื่อ"
                : "เสร็จแล้ว"}
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => setSelectedCheckin(null)}
            >
              Close
            </Button>
            <Button
              variant="success"
              onClick={() => {
                handleupdateCheckinStatus(selectedCheckin.id, 1);
                fetchCheckinList();
              }}
            >
              เปิด
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                handleupdateCheckinStatus(selectedCheckin.id, 2);
                fetchCheckinList();
              }}
            >
              ปิด
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                fetchquestionList(selectedCheckin.id);
                setShowQuestionList(true)
              }}
            >
              คำถาม
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                fetchScoreList(selectedCheckin.id);
                setShowScoresList(true)
              }}
            >
              แสดงคะแนน
            </Button>

            <Row className="mb-3">
              <Col md={3}>
                <Form.Control
                  type="text"
                  value={newCheckinStudent}
                  onChange={(e) => setNewCheckinStudent(e.target.value)}
                  placeholder="Enter student ID"
                />
              </Col>
              <Col md={3}>
                <Form.Control
                  type="text"
                  value={newCheckinStudentRemark}
                  onChange={(e) => setNewCheckinStudentRemark(e.target.value)}
                  placeholder="Enter student Remark"
                />
              </Col>
              <Col md={3}>
                <Form.Control
                  type="text"
                  value={newCheckinValidcode}
                  onChange={(e) => setNewCheckinValidcode(e.target.value)}
                  placeholder="Enter Valid Code"
                />
              </Col>
              <Col>
                <Button variant="success" onClick={handleAddCheckinStudent}>
                  Add Student
                </Button>
              </Col>
            </Row>

          </div>
          <Table striped bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>ลำดับ</th>
                <th>รหัส</th>
                <th>ชื่อ</th>
                <th>หมายเหตุ</th>
                <th>วันเวลา</th>
                <th>มามั้ย</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedCheckin.students.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td>{student.stdid || "-"}</td>
                  <td>{student.name || "-"}</td>
                  <td>{student.remark || "-"}</td>
                  <td>{student.date?.toDate().toLocaleString() || "-"}</td>
                  <td>
                    {student.date?.seconds
                      ? (() => {
                        const checkinTime = new Date(selectedCheckin.date.seconds * 1000);
                        const studentTime = new Date(student.date.seconds * 1000);
                        const diffMinutes = (studentTime - checkinTime) / (1000 * 60);

                        return diffMinutes > 15 ? "สาย" : "มาตรงเวลา";
                      })()
                      : "-"}
                  </td>
                  <td>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeletestudentinchekin(student.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {showQuestionList && (
            <div className="mt-4">
              <h5>รายการคำถาม</h5>
              <row>
                <Col md={3}>
                  <Form.Control
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Enter Question"
                    className="mb-2"
                  />
                </Col>
                <Col>
                  <Button variant="success" onClick={handleAddQuestion}>
                    Add Question
                  </Button>
                </Col>
              </row>

              <Table striped bordered hover responsive>
                <thead className="table-dark">
                  <tr>
                    <th>ลำดับ</th>
                    <th>คำถาม</th>
                    <th>แสดงคำถาม</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questionList.map((question, index) => (
                    <tr key={question.id}>
                      <td>{index + 1}</td>
                      <td>{question.question_text}</td>
                      <td>{question.question_show ? "✔️" : "❌"}</td>
                      <td>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleViewQuestion(question.id)}
                        >
                          View
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          Delete
                        </Button>

                        {/* Open/Close Action Buttons */}
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleOpenQuestion(question.id)}
                        >
                          Open
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCloseQuestion(question.id)}
                        >
                          Close
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

            </div>
          )}

          {selectedQuestion && (
            <div className="mt-4 p-3 border rounded">
              <h5>รายละเอียดคำถาม</h5>
              <p>
                <strong>คำถาม:</strong> {selectedQuestion.question_text}
              </p>

              <Table striped bordered hover responsive>
                <thead className="table-dark">
                  <tr>
                    <th>รหัสนักเรียน</th>
                    <th>คำตอบ</th>
                    <th>เวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {answers.map((answer, index) => (
                    <tr key={index}>
                      <td>{answer.studentId}</td>
                      <td>{answer.text}</td>
                      <td>{answer.time.toDate().toLocaleString() || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>

            </div>
          )}

          {showScoresList && (
            <div className="mt-4">
              <h5>คะแนนผู้เช็คชื่อ</h5>
              <Table striped bordered hover responsive>
                <thead className="table-dark">
                  <tr>
                    <th>ลำดับ</th>
                    <th>รหัส</th>
                    <th>ชื่อ</th>
                    <th>หมายเหตุ</th>
                    <th>วันเวลา</th>
                    <th>คะแนน</th>
                    <th>สถานะ</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((score, index) => {
                    // Log the date to check its value
                    console.log(score.date);

                    return (
                      <tr key={score.id}>
                        <td>{index + 1}</td>
                        <td>{score.stid || "-"}</td>
                        <td>{score.name || "-"}</td>
                        <td>{score.remark || "-"}</td>
                        <td>
                          {score.date}
                        </td>
                        <td>{score.score || "-"}</td>
                        <td>{score.status || "-"}</td>
                        <td>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteScore(score.id)}
                          >
                            Delete
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleEditScore(score.id)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

              </Table>
            </div>

          )}

          {editingScore && (
            <div className="edit-form">
              <input
                type="text"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                placeholder="Score"
              />
              <input
                type="text"
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                placeholder="Remark"
              />
              <input
                type="text"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                placeholder="Status"
              />
              <button onClick={handleSaveEdit}>Save</button>
              <button onClick={handleCancelEdit}>Cancel</button>
            </div>
          )}


        </div>
      )}

      {showScoresList && (
        <div className="mt-4">
          <h5>คะแนนผู้เช็คชื่อ</h5>
          <Table striped bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>ลำดับ</th>
                <th>รหัส</th>
                <th>ชื่อ</th>
                <th>หมายเหตุ</th>
                <th>วันเวลา</th>
                <th>คะแนน</th>
                <th>สถานะ</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => (
                <tr key={score.id}>
                  <td>{index + 1}</td>
                  <td>{score.code || "-"}</td>
                  <td>{score.name || "-"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {showQAModal && (
        <QAModal
          show={showQAModal}
          onClose={() => setShowQAModal(false)}
          subject={subject}
          userId={userId}
          currentCheckinNo={currentCheckinNo}
        />
      )}

      {/* Modal สำหรับแสดงรายการคำถามจากทุกการเช็คอิน */}
      <Modal
        show={showQuestionListModal}
        onHide={() => setShowQuestionListModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>รายการคำถามทั้งหมด</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>Checkin ID</th>
                <th>หมายเลขคำถาม</th>
                <th>ข้อความคำถาม</th>
                <th>แสดงคำถาม</th>
                <th>วันที่ตั้ง</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {questionList.map((q) => (
                <tr key={q.id}>
                  <td>{q.id}</td>
                  <td>{q.question_no || "-"}</td>
                  <td>{q.question_text || "-"}</td>
                  <td>{q.question_show ? "Yes" : "No"}</td>
                  <td>
                    {q.createdAt
                      ? new Date(q.createdAt.seconds * 1000).toLocaleString()
                      : "-"}
                  </td>
                  <td>
                    <Button
                      variant={q.question_show ? "warning" : "success"}
                      size="sm"
                      onClick={() => toggleQuestionStatus(q)}
                    >
                      {q.question_show ? "ปิดคำถาม" : "เปิดคำถาม"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowQuestionListModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// Component: SubjectAvatarSelector
function SubjectAvatarSelector({ show, onSelect, onClose, currentAvatar }) {
  const defaultAvatars = [
    "/project_web2024/web/default-subject.jpg",
    "/project_web2024/web/default-subject1.jpg",
    "/project_web2024/web/default-subject2.jpg",
    "/project_web2024/web/default-subject3.jpg",
    "/project_web2024/web/default-subject4.jpg",
    "/project_web2024/web/default-subject5.jpg",
    "/project_web2024/web/default-subject6.jpg",
    "/project_web2024/web/default-subject7.jpg",
    "/project_web2024/web/default-subject8.jpg",
    "/project_web2024/web/default-subject9.jpg",
    "/project_web2024/web/default-subject10.jpg",
    "/project_web2024/web/default-subject11.jpg",
  ];
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Select Subject Avatar</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-wrap">
          {defaultAvatars.map((avatar, index) => (
            <img
              key={index}
              src={avatar}
              alt={`Avatar ${index}`}
              style={{
                width: "60px",
                height: "60px",
                objectFit: "cover",
                cursor: "pointer",
                border:
                  currentAvatar === avatar
                    ? "3px solid #007bff"
                    : "1px solid #ccc",
                borderRadius: "50%",
                marginRight: "10px",
                marginBottom: "10px",
              }}
              onClick={() => onSelect(avatar)}
            />
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// Component: EditSubjectModal
function EditSubjectModal({
  show,
  subject,
  newPhoto,
  onChangePhoto,
  onSave,
  onClose,
}) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [room, setRoom] = React.useState("");
  const [avatar, setAvatar] = React.useState("");
  const [showAvatarModal, setShowAvatarModal] = React.useState(false);

  React.useEffect(() => {
    if (subject) {
      setName(subject.name || "");
      setCode(subject.code || "");
      setRoom(subject.room || "");
      setAvatar(newPhoto || subject.photo || "");
    }
  }, [subject, newPhoto, show]);

  const handleSave = () => {
    if (name.trim() === "" || code.trim() === "") {
      alert("Please enter both subject name and subject code.");
      return;
    }
    onSave({ name, code, room, photo: avatar });
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Subject</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Subject Code</Form.Label>
            <Form.Control
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter subject code"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Subject Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter subject name"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Room</Form.Label>
            <Form.Control
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Enter room"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Button variant="info" onClick={() => setShowAvatarModal(true)}>
              Select Avatar
            </Button>
            {avatar && (
              <img
                src={avatar}
                alt="Selected Avatar"
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  marginTop: "5px",
                }}
              />
            )}
          </Form.Group>
        </Form>
        {showAvatarModal && (
          <SubjectAvatarSelector
            show={showAvatarModal}
            currentAvatar={avatar}
            onSelect={(selectedAvatar) => {
              setAvatar(selectedAvatar);
              setShowAvatarModal(false);
              onChangePhoto(selectedAvatar);
            }}
            onClose={() => setShowAvatarModal(false)}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// Component: LoginBox
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
          // If user already exists, load their data
          const data = doc.data();
          setName(data.name || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setUserData(data);
        } else {
          // If user doesn't exist, create a new document
          const newUser = {
            uid: user.uid,
            name: user.displayName || "", // Use default name if available
            email: user.email || "",
            phone: "", // Empty by default
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          };

          userRef
            .set(newUser)
            .then(() => {
              console.log("New user added to Firestore");
              setUserData(newUser);
              setName(newUser.name);
              setEmail(newUser.email);
              setPhone(newUser.phone);
            })
            .catch((error) => console.error("Error adding new user:", error));
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
          className="rounded-circle border border-3 border-primary"
          style={{ width: "130px", height: "130px", objectFit: "cover" }}
        />
      </div>
      <h4 className="mt-4 text-dark">{userData?.name || "No Name"}</h4>
      <p className="text-muted mb-1">{userData?.email || "No Email"}</p>
      <p className="text-muted pt-0">{userData?.phone || "No Phone"}</p>
      <div>
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

// Component: EditProfileButton
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

  const defaultImages = [
    "/project_web2024/web/default-avatar.jpg",
    "/project_web2024/web/default-avatar1.jpg",
    "/project_web2024/web/default-avatar2.jpg",
    "/project_web2024/web/default-avatar3.jpg",
    "/project_web2024/web/default-avatar4.jpg",
    "/project_web2024/web/default-avatar5.jpg",
    "/project_web2024/web/default-avatar6.jpg",
    "/project_web2024/web/default-avatar7.jpg",
    "/project_web2024/web/default-avatar8.jpg",
    "/project_web2024/web/default-avatar9.jpg",
    "/project_web2024/web/default-avatar10.jpg",
    "/project_web2024/web/default-avatar11.jpg",
  ];

  return (
    <>
      <Button
        variant="light"
        className="px-3 py-2 fw-bold rounded-pill shadow-sm border-0 text-dark position-absolute top-0 start-0 m-3"
        style={{ backgroundColor: "#c7c7c7" }}
        onClick={() => setShowModal(true)}
      >
        <i className="bi bi-pencil-square me-2"></i> Edit Profile
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="bg-transparent border-0">
          <Modal.Title className="fw-bold text-dark">Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body
          className="p-4 rounded border-0"
          style={{
            background: "#f8f9fa",
            color: "#333",
            boxShadow: "none",
          }}
        >
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Name:</Form.Label>
              <Form.Control
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter your name"
                className="shadow-sm border-0 rounded-3 px-3 py-2"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Email:</Form.Label>
              <Form.Control
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter your email"
                className="shadow-sm border-0 rounded-3 px-3 py-2"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Phone:</Form.Label>
              <Form.Control
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="shadow-sm border-0 rounded-3 px-3 py-2"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                Select Default Profile Picture:
              </Form.Label>
              <div className="d-flex flex-wrap justify-content-center">
                {defaultImages.map((imgUrl, index) => (
                  <img
                    key={index}
                    src={imgUrl}
                    alt={`Default ${index}`}
                    className="rounded-circle border border-light shadow-sm mx-2"
                    style={{
                      width: "75px",
                      height: "75px",
                      objectFit: "cover",
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      border:
                        newProfilePicture === imgUrl
                          ? "4px solid #007bff"
                          : "2px solid #ddd",
                      boxShadow: "0px 6px 10px rgba(0, 0, 0, 0.15)",
                    }}
                    onMouseOver={(e) =>
                      (e.target.style.transform = "scale(1.15)")
                    }
                    onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
                    onClick={() => setNewProfilePicture(imgUrl)}
                  />
                ))}
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="bg-transparent border-0">
          <Button
            variant="success"
            onClick={handleSave}
            className="px-4 py-2 fw-bold rounded-pill shadow-sm"
            style={{
              backgroundColor: "#c7c7c7",
              borderColor: "#c7c7c7",
              color: "#fff",
            }}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

// Render App
const container = document.getElementById("myapp");
const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

//---//
const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const cors = require("cors");

// 🔥 กำหนด CORS ให้ทุกโดเมนเข้าถึง API ได้
const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(bodyParser.json());

// 🔥 Initialize Firebase Admin
const serviceAccount = require("./path/to/your/firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const dbb = admin.firestore();
const PORT = 3000;

/**
 * 📌 API: ตั้งคำถามโดยอาจารย์
 * Endpoint: POST /users/:uid/classroom/:cid/question
 */
app.post("/users/:uid/classroom/:cid/question", async (req, res) => {
  const { uid, cid } = req.params;
  const { question_no, question_text, question_show } = req.body;

  try {
    await dbb.collection("users").doc(uid).collection("classroom").doc(cid).set(
      {
        question_no,
        question_text,
        question_show,
      },
      { merge: true }
    );

    res.status(200).json({ message: "✅ Question set successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📌 API: ดึงคำถามจากห้องเรียน
 * Endpoint: GET /users/:uid/classroom/:cid/question
 */
app.get("/users/:uid/classroom/:cid/question", async (req, res) => {
  const { uid, cid } = req.params;
  try {
    const doc = await dbb
      .collection("users")
      .doc(uid)
      .collection("classroom")
      .doc(cid)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ message: "No question found" });
    }

    res.status(200).json(doc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📌 API: ลบคำถาม
 * Endpoint: DELETE /users/:uid/classroom/:cid/question
 */
app.delete("/users/:uid/classroom/:cid/question", async (req, res) => {
  const { uid, cid } = req.params;
  try {
    await dbb
      .collection("users")
      .doc(uid)
      .collection("classroom")
      .doc(cid)
      .update({
        question_no: admin.firestore.FieldValue.delete(),
        question_text: admin.firestore.FieldValue.delete(),
        question_show: admin.firestore.FieldValue.delete(),
      });

    res.status(200).json({ message: "✅ Question deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔥 Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
