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
  measurementId: "G-LVKQEQ5Z67"
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

  render() {
    const { user, subjects, showSubjects, showClassroom, selectedSubject } =
      this.state;
    return (
      <Container className="mt-4 p-4 rounded-3 shadow-lg" style={{ background: "#e0e0e0", minHeight: "100vh" }}>
        <Card className="shadow-sm">
          <Card.Body>
            <LoginBox user={this.state.user} app={this} />
            {user && (
              <div >
                <Button variant="success" className="mt-2" onClick={this.toggleSubjects}><i className="bi bi-pencil-square me-2">
                </i> Subject
                </Button>
                <Button variant="success" className="mt-2 ms-3" onClick={this.toggleClassroom}><i className="bi bi-pencil-square me-2">
                </i> Classroom
                </Button>
              </div>
            )}
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
  const [students, setStudents] = React.useState([]);
  const [showStudentsList, setShowStudentsList] = React.useState(false);
  const [scores, setScores] = React.useState([]);
  const [showScoresList, setShowScoresList] = React.useState(false);
  const [checkinList, setCheckinList] = React.useState([]);
  const [showCheckinList, setShowCheckinList] = React.useState(false);
  const [newCheckinCode, setNewCheckinCode] = React.useState("");
  const [selectedCheckin, setSelectedCheckin] = React.useState(null);
  const [studentCode, setStudentCode] = React.useState("");

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
    onClick={() => openQA("CP001002")}  // ใส่ subjectId ที่ต้องการ
  >
    ถาม-ตอบ
  </Button>

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
      const validStudents = studentsList.filter((student) => student !== undefined);

      console.log("Fetched students:", validStudents);

      // Update state with the fetched student data
      setStudents(validStudents);
      setShowCheckinList(false);
      setShowStudentsList(true);
      setShowScoresList(false);
      setSelectedCheckin(null)
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
      // Get the latest check-in document to determine the next `cno`
      const checkinCollectionRef = db
        .collection("users")
        .doc(userId)
        .collection("classroom")
        .doc(subject.id)
        .collection("checkin");

      const latestCheckinSnapshot = await checkinCollectionRef
        .orderBy("cno", "desc")
        .limit(1)
        .get();

      let newCno = 1; // Default to 1 if no check-ins exist

      if (!latestCheckinSnapshot.empty) {
        const latestCheckin = latestCheckinSnapshot.docs[0].data();
        newCno = latestCheckin.cno + 1; // Increment `cno`
      }

      // Add new check-in document
      const newCheckinRef = checkinCollectionRef.doc(newCno.toString());
      await newCheckinRef.set({
        cno: newCno,
        code: newCheckinCode.trim(),
        date: firebase.firestore.FieldValue.serverTimestamp(),
        status: 0, // Default to "Not started"
      });

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
                name: userDoc.data().name,  // Assuming 'name' is in the 'users' collection
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
        const validStudentsData = studentsData.filter(student => student !== null);
  
        // Step 8: Update the state with both check-in data and students data
        setSelectedCheckin({ ...checkinData, students: validStudentsData });
      } else {
        console.log("No students found in this check-in.");
        setSelectedCheckin({ ...checkinData, students: [] });
      }
    } catch (error) {
      console.error("Error fetching check-in document or students:", error);
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
      setSelectedCheckin((prev) => (prev ? { ...prev, status: newStatus } : prev));

      console.log(`Check-in status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating check-in status:", error);
    }
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

  // Toggle แสดงคะแนน (Realtime)
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
            <Button variant="success" onClick={fetchCheckinList} className="me-2">
              บันทึกการเช็คชื่อ
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowQRCodeModal(true)}
              className="me-2"
            >
              แสดง QRCode วิชา
            </Button>
            <Button variant="secondary" onClick={openQA} className="me-2">
              ถาม-ตอบ
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
              <Button variant="dark" onClick={handleAddStudent} className="me-2">
              Join Classroom
            </Button>
              </Col>
              
            </Row>
            
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
                                status: 1 // Change the status to 1 (Accepted)
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

                              console.log("Student rejected and removed:", student.id);
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

                            console.log("Student rejected and removed:", student.id);
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {checkinList.map((checkin, index) => (
                <tr key={checkin.id}>
                  <td>{index + 1}</td>
                  <td>{checkin.code}</td>
                  <td>{checkin.date?.seconds
                    ? new Date(checkin.date.seconds * 1000).toLocaleString("th-TH", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false, // Ensure 24-hour format
                    })
                    : "N/A"}</td>
                  <td>
                    {checkin.status === 0
                      ? "ยังไม่เริ่ม"
                      : checkin.status === 1
                        ? "กำลังเช็คชื่อ"
                        : "เสร็จแล้ว"}
                  </td>
                  <td>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleViewCheckin(checkin.id)}
                    >
                      View
                    </Button>

                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )
      }

      {selectedCheckin && (
        <div className="mt-4 p-3 border rounded">
          <h5>รายละเอียดเช็คชื่อ</h5>
          <p><strong>รหัส:</strong> {selectedCheckin.code}</p>
          <p>
            <strong>เวลาเช็คชื่อ:</strong>{" "}
            {selectedCheckin.date?.seconds
              ? new Date(selectedCheckin.date.seconds * 1000).toLocaleString("th-TH", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
              : "N/A"}
          </p>
          <p><strong>สถานะ:</strong>
            {selectedCheckin.status === 0
              ? "ยังไม่เริ่ม"
              : selectedCheckin.status === 1
                ? "กำลังเช็คชื่อ"
                : "เสร็จแล้ว"}
          </p>
          <div>
            <Button variant="secondary" onClick={() => setSelectedCheckin(null)}>Close</Button>
            <Button variant="success" onClick={() => {
              handleupdateCheckinStatus(selectedCheckin.id, 1);
              fetchCheckinList();
            }}>เปิด</Button>
            <Button variant="danger" onClick={() => {
              handleupdateCheckinStatus(selectedCheckin.id, 2);
              fetchCheckinList();
            }}>ปิด</Button>
          </div>
          <Table striped bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>ลำดับ</th>
                <th>รหัส</th>
                <th>ชื่อ</th>
                <th>หมายเหตุ</th>
                <th>วันเวลา</th>
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

  // Pre-populate ข้อมูลเดิมเมื่อ Modal เปิดขึ้นและ subject มีค่า
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

          userRef.set(newUser)
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