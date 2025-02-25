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
const storage = firebase.storage();

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

  // Handlers สำหรับฟอร์มเพิ่มวิชา
  handleSubjectChange = (e) => {
    this.setState({ newSubject: e.target.value });
  };
  handleSubjectCodeChange = (e) => {
    this.setState({ newSubjectCode: e.target.value });
  };
  handleSubjectRoomChange = (e) => {
    this.setState({ newRoom: e.target.value });
  };

  // เพิ่มวิชาใหม่ (ใช้ข้อมูลจากฟอร์ม Manage Subjects)
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
      // reset form (คงเป็นช่องว่าง)
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

  // เมื่อกด Edit ในตารางวิชา จะเปิด Modal แก้ไข (โดยฟอร์มแก้ไขจะเริ่มต้นเป็นช่องว่าง)
  editSubject = (subject) => {
    this.setState({
      subjectToEdit: subject,
      // ไม่ pre-populate ค่าในฟอร์ม Add Subject ให้คงว่างอยู่
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

  // ฟังก์ชันอัปเดตวิชา (จะได้รับข้อมูลจาก Modal แก้ไข)
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
//------1-----///
  render() {
    const { user, subjects, showSubjects, showClassroom, selectedSubject } =
      this.state;
    return (
      <Container className="mt-4 p-4 rounded-3 shadow-lg" style={{ background: "#e0e0e0", minHeight: "100vh" }}>

        <Card className="shadow-sm">
          <Card.Body> 
            <LoginBox user={this.state.user} app={this} />
            <div >
            <Button variant="success" className="mt-2" onClick={this.toggleSubjects}><i className="bi bi-pencil-square me-2">
        </i> Subject
      </Button>
      <Button variant="success" className="mt-2 ms-3" onClick={this.toggleClassroom}><i className="bi bi-pencil-square me-2">
        </i> Classroom
      </Button>
            </div>
            {user && showSubjects && (
              <div className="mt-4">

                <h3 className="mb-3" style={{ color: "black" }}>Manage Subjects</h3>

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

//-------2----------///
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
              </Button><i class="fa fa-xing" aria-hidden="true"></i>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

// Component: ClassroomList (แสดงวิชาในรูปแบบการ์ด)
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

// Component: SubjectDetail (หน้ารายละเอียดวิชาพร้อมฟังก์ชันเช็คชื่อ)
function SubjectDetail({ subject, onBack, userId }) {
  const [showQRCodeModal, setShowQRCodeModal] = React.useState(false);
  const [checkinStatus, setCheckinStatus] = React.useState(null); // "open" หรือ "closed"
  const [currentCheckinNo, setCurrentCheckinNo] = React.useState("");
  const [students, setStudents] = React.useState([]);
  const [showStudentsList, setShowStudentsList] = React.useState(false);
  const [scores, setScores] = React.useState([]);
  const [showScoresList, setShowScoresList] = React.useState(false);

  // สร้าง URL สำหรับรายละเอียดวิชา (ปรับเปลี่ยนได้ตามโปรเจค)
  const detailURL = `https://yourwebsite.com/subject-details/${subject.id}`;

  // เปิดเช็คชื่อ: สร้างเอกสาร checkin ใหม่ใน path /classroom/{cid}/checkin/{cno}
  const openCheckin = async () => {
    const cno = "checkin_" + Date.now();
    setCurrentCheckinNo(cno);
    await db
      .collection("users")
      .doc(userId)
      .collection("classroom")
      .doc(subject.id)
      .collection("checkin")
      .doc(cno)
      .set({
        status: "open",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    setCheckinStatus("open");
    alert("เช็คชื่อเปิดแล้ว รหัส: " + cno);
  };

  // ปิดเช็คชื่อ: อัปเดตสถานะเป็น closed
  const closeCheckin = async () => {
    if (!currentCheckinNo) {
      alert("ไม่มีการเช็คชื่อที่เปิดอยู่");
      return;
    }
    await db
      .collection("users")
      .doc(userId)
      .collection("classroom")
      .doc(subject.id)
      .collection("checkin")
      .doc(currentCheckinNo)
      .update({ status: "closed" });
    setCheckinStatus("closed");
    alert("เช็คชื่อปิดแล้ว");
  };

  // บันทึกการเช็คชื่อ: คัดลอกข้อมูลจาก students ไป scores โดยเพิ่ม status = 1
  const saveCheckin = async () => {
    if (!currentCheckinNo) {
      alert("ไม่มีการเช็คชื่อที่เปิดอยู่");
      return;
    }
    const studentsSnap = await db
      .collection("users")
      .doc(userId)
      .collection("classroom")
      .doc(subject.id)
      .collection("checkin")
      .doc(currentCheckinNo)
      .collection("students")
      .get();
    const batch = db.batch();
    studentsSnap.forEach((doc) => {
      const scoreRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(currentCheckinNo)
        .collection("scores")
        .doc(doc.id);
      batch.set(scoreRef, { ...doc.data(), status: 1 });
    });
    await batch.commit();
    alert("บันทึกการเช็คชื่อเรียบร้อย");
  };

  // แสดงรหัสเช็คชื่อ
  const showCheckinCode = () => {
    if (!currentCheckinNo) {
      alert("ไม่มีการเช็คชื่อที่เปิดอยู่");
    } else {
      alert("รหัสเช็คชื่อ: " + currentCheckinNo);
    }
  };
  
///----------////////////
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
  onClick={() => openQA("CP001002")}  // ใส่ subjectId ที่ต้องการ
>
  ถาม-ตอบ
</Button>
//----เชื่อมไปหน้าคำถาม---//

  // Toggle แสดงรายชื่อผู้เช็คชื่อแบบ Realtime
  const toggleStudentsList = () => {
    if (!showStudentsList) {
      const unsubscribe = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(currentCheckinNo)
        .collection("students")
        .onSnapshot((snapshot) => {
          const list = [];
          snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
          setStudents(list);
        });
      setShowStudentsList(true);
    } else {
      setShowStudentsList(false);
    }
  };

  // Toggle แสดงคะแนน (Realtime)
  const toggleScoresList = () => {
    if (!showScoresList) {
      const unsubscribe = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin")
        .doc(currentCheckinNo)
        .collection("scores")
        .onSnapshot((snapshot) => {
          const list = [];
          snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
          setScores(list);
        });
      setShowScoresList(true);
    } else {
      setShowScoresList(false);
    }
  };

  // ฟังก์ชันอัปเดตคะแนน (แก้ไข input inline)
  const updateScoreEntry = async (entryId, updatedData) => {
    await db
      .collection("users")
      .doc(userId)
      .collection("classroom")
      .doc(subject.id)
      .collection("checkin")
      .doc(currentCheckinNo)
      .collection("scores")
      .doc(entryId)
      .update(updatedData);
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
            <Button variant="primary" onClick={openCheckin} className="me-2">
              เปิดเช็คชื่อ
            </Button>
            <Button variant="warning" onClick={closeCheckin} className="me-2">
              ปิดเช็คชื่อ
            </Button>
            <Button variant="success" onClick={saveCheckin} className="me-2">
              บันทึกการเช็คชื่อ
            </Button>
            <Button variant="info" onClick={showCheckinCode} className="me-2">
              แสดงรหัสเช็คชื่อ
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
            <Button
              variant="dark"
              onClick={toggleStudentsList}
              className="me-2"
            >
              แสดงรายชื่อ
            </Button>
            <Button variant="dark" onClick={toggleScoresList} className="me-2">
              แสดงคะแนน
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* QR Code Modal */}
      <Modal
        show={showQRCodeModal}
        onHide={() => setShowQRCodeModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>QR Code for {subject.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
              detailURL
            )}&size=200x200`}
            alt="QR Code"
          />
          <p className="mt-2">Scan to view subject details</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQRCodeModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Students List Table */}
      {showStudentsList && (
        <div className="mt-4">
          <h5>รายชื่อผู้ที่เช็คชื่อ</h5>
          <Table striped bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>ลำดับ</th>
                <th>รหัส</th>
                <th>ชื่อ</th>
                <th>หมายเหตุ</th>
                <th>วันเวลา</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td>{student.code || "-"}</td>
                  <td>{student.name || "-"}</td>
                  <td>{student.note || "-"}</td>
                  <td>
                    {student.timestamp
                      ? student.timestamp.toDate().toLocaleString()
                      : "-"}
                  </td>
                  <td>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        await db
                          .collection("users")
                          .doc(userId)
                          .collection("classroom")
                          .doc(subject.id)
                          .collection("checkin")
                          .doc(currentCheckinNo)
                          .collection("students")
                          .doc(student.id)
                          .delete();
                      }}
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

      {/* Scores List Table */}
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
                  <td>
                    <Form.Control
                      type="text"
                      defaultValue={score.note || ""}
                      onBlur={(e) =>
                        updateScoreEntry(score.id, { note: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    {score.timestamp
                      ? score.timestamp.toDate().toLocaleString()
                      : "-"}
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      defaultValue={score.score || 0}
                      onBlur={(e) =>
                        updateScoreEntry(score.id, {
                          score: Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="text"
                      defaultValue={score.status || ""}
                      onBlur={(e) =>
                        updateScoreEntry(score.id, { status: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => updateScoreEntry(score.id, score)}
                    >
                      Save
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}

// Component: SubjectAvatarSelector (Modal สำหรับเลือกรูปอวตารของวิชา)
function SubjectAvatarSelector({ show, onSelect, onClose, currentAvatar }) {
  const defaultAvatars = [
    "/web/default-subject.jpg",
    "/web/default-subject1.jpg",
    "/web/default-subject2.jpg",
    "/web/default-subject3.jpg",
    "/web/default-subject4.jpg",
    "/web/default-subject5.jpg",
    "/web/default-subject6.jpg",
    "/web/default-subject7.jpg",
    "/web/default-subject8.jpg",
    "/web/default-subject9.jpg",
    "/web/default-subject10.jpg",
    "/web/default-subject11.jpg",
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

// Component: EditSubjectModal (Modal สำหรับแก้ไขวิชา โดยเริ่มต้นเป็นช่องว่าง)
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

  // เมื่อ modal เปิดขึ้นและมี subject ให้ pre-populate ค่าในฟอร์ม
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


// Component: LoginBox (แสดงข้อมูลผู้ใช้)
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

// Component: EditProfileButton (แก้ไขข้อมูลโปรไฟล์)
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
  <Modal.Body className="p-4 rounded border-0" style={{
    background: "#f8f9fa",
    color: "#333",
    boxShadow: "none"
  }}>
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
        <Form.Label className="fw-semibold">Select Default Profile Picture:</Form.Label>
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
                border: newProfilePicture === imgUrl ? "4px solid #007bff" : "2px solid #ddd",
                boxShadow: "0px 6px 10px rgba(0, 0, 0, 0.15)",
              }}
              onMouseOver={(e) => (e.target.style.transform = "scale(1.15)")}
              onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
              onClick={() => setNewProfilePicture(imgUrl)}
            />
          ))}
        </div>
      </Form.Group>
    </Form>
  </Modal.Body>
  <Modal.Footer className="bg-transparent border-0">
    <Button variant="success" onClick={handleSave} className="px-4 py-2 fw-bold rounded-pill shadow-sm" style={{ backgroundColor: "#c7c7c7", borderColor: "#c7c7c7", color: "#fff" }}>
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
app.use(cors({ 
  origin: "*",
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));
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
    await dbb.collection("users")
      .doc(uid)
      .collection("classroom")
      .doc(cid)
      .set({
        question_no,
        question_text,
        question_show
      }, { merge: true });

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
    const doc = await dbb.collection("users")
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
    await dbb.collection("users")
      .doc(uid)
      .collection("classroom")
      .doc(cid)
      .update({
        question_no: admin.firestore.FieldValue.delete(),
        question_text: admin.firestore.FieldValue.delete(),
        question_show: admin.firestore.FieldValue.delete()
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



