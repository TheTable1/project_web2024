import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { MaterialIcons } from "@expo/vector-icons";

// ฟังก์ชันสำหรับดึงรูปภาพในเครื่อง (หากเก็บรูปเป็น /web/... )
const getLocalImage = (path) => {
  switch (path) {
    case "/web/default-subject.jpg":
      return require("./assets/default-subject.jpg");
    case "/web/default-subject1.jpg":
      return require("./assets/default-subject1.jpg");
    case "/web/default-subject2.jpg":
      return require("./assets/default-subject2.jpg");
    case "/web/default-subject3.jpg":
      return require("./assets/default-subject3.jpg");
    case "/web/default-subject4.jpg":
      return require("./assets/default-subject4.jpg");
    case "/web/default-subject5.jpg":
      return require("./assets/default-subject5.jpg");
    case "/web/default-subject6.jpg":
      return require("./assets/default-subject6.jpg");
    case "/web/default-subject7.jpg":
      return require("./assets/default-subject7.jpg");
    case "/web/default-subject8.jpg":
      return require("./assets/default-subject8.jpg");
    case "/web/default-subject9.jpg":
      return require("./assets/default-subject9.jpg");
    case "/web/default-subject10.jpg":
      return require("./assets/default-subject10.jpg");
    case "/web/default-subject11.jpg":
      return require("./assets/default-subject11.jpg");
    default:
      return null;
  }
};

const DetailScreen = ({ route, navigation }) => {
  const { classId } = route.params;

  // ข้อมูลหลักของวิชา
  const [classDetails, setClassDetails] = useState(null);
  const [ownerName, setOwnerName] = useState(null);
  const [ownerUid, setOwnerUid] = useState(null);
  const [loading, setLoading] = useState(true);

  // ข้อมูล checkin (status=1)
  const [checkinList, setCheckinList] = useState([]);

  // คำถามใน checkin
  const [questionList, setQuestionList] = useState([]);

  // เก็บคำตอบที่ดึงมาจาก Firestore (key = questionId)
  const [questionAnswers, setQuestionAnswers] = useState({});
  // เก็บข้อความที่ผู้ใช้พิมพ์ก่อนกดส่ง (key = questionId)
  const [answers, setAnswers] = useState({});

  // รหัสนักศึกษา (stid)
  const [studentId, setStudentId] = useState("");

  // Modal เช็คอิน
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [modalStep, setModalStep] = useState("code");
  const [checkinCodeInput, setCheckinCodeInput] = useState("");
  const [remarkText, setRemarkText] = useState("");
  const [selectedCheckin, setSelectedCheckin] = useState(null);

  // ------------------- useEffect หลัก -------------------
  // 1) ดึงข้อมูล classDetails + ownerUid ทันทีที่ classId เปลี่ยน
  useEffect(() => {
    fetchClassDetailsUpdated();
  }, [classId]);

  // 2) เมื่อหน้า focus -> re-fetch checkin + questionList + answers
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      if (ownerUid && studentId) {
        // ดึง checkin+question (อัปเดต questionList)
        await fetchCheckinModified(ownerUid);
        // ดึงคำตอบ
        await fetchAnsweredQuestions();
      }
    });
    return unsubscribe;
  }, [navigation, ownerUid, studentId]);

  // 3) เมื่อ questionList เปลี่ยน -> ดึงคำตอบจาก Firestore ใหม่
  useEffect(() => {
    if (ownerUid && studentId && questionList.length > 0) {
      fetchAnsweredQuestions();
    }
  }, [ownerUid, studentId, questionList]);

  // 4) ดึง stid ของผู้ใช้ปัจจุบัน
  useEffect(() => {
    const fetchStudentId = async () => {
      const user = auth.currentUser;
      if (!user) return;
      let userDoc = await getDoc(doc(db, "Student", user.uid));
      if (!userDoc.exists()) {
        userDoc = await getDoc(doc(db, "users", user.uid));
      }
      if (userDoc.exists()) {
        setStudentId(userDoc.data().stid);
      }
    };
    fetchStudentId();
  }, []);

  // ------------------- ฟังก์ชันหลัก -------------------
  // ดึงข้อมูลห้อง + ownerUid
  const fetchClassDetailsUpdated = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(usersRef);

      let foundDetails = null;
      let foundOwnerUid = null;
      for (const userDoc of usersSnap.docs) {
        const detailsRef = doc(
          db,
          `users/${userDoc.id}/classroom/${classId}/info/details`
        );
        const detailsSnap = await getDoc(detailsRef);
        if (detailsSnap.exists()) {
          foundDetails = detailsSnap.data();
          foundOwnerUid = userDoc.id;
          break;
        }
      }
      setClassDetails(foundDetails);

      if (foundOwnerUid) {
        setOwnerUid(foundOwnerUid);
        // ดึงชื่อเจ้าของ
        const ownerRef = doc(db, "users", foundOwnerUid);
        const ownerSnap = await getDoc(ownerRef);
        if (ownerSnap.exists()) {
          setOwnerName(ownerSnap.data().name);
        }
        // ดึง checkin
        await fetchCheckinModified(foundOwnerUid);
      }
    } catch (error) {
      console.error("Error fetching class details:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลวิชาได้");
    } finally {
      setLoading(false);
    }
  };

  // ดึง checkin (status=1)
  const fetchCheckinModified = async (ownerUid) => {
    try {
      const checkinRef = collection(
        db,
        `users/${ownerUid}/classroom/${classId}/checkin`
      );
      const checkinSnap = await getDocs(checkinRef);
      const activeCheckins = [];
      checkinSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 1) {
          activeCheckins.push({ id: docSnap.id, ...data });
        }
      });
      setCheckinList(activeCheckins);

      // ดึงคำถาม
      await fetchQuestionsForCheckins(ownerUid, activeCheckins);
    } catch (error) {
      console.error("Error fetching checkin data:", error);
    }
  };

  // ดึง question_show = true
  const fetchQuestionsForCheckins = async (ownerUid, checkins) => {
    try {
      const questionsArr = [];
      for (const checkin of checkins) {
        const questionRef = collection(
          db,
          `users/${ownerUid}/classroom/${classId}/checkin/${checkin.id}/question`
        );
        const questionSnap = await getDocs(questionRef);
        questionSnap.forEach((qDoc) => {
          const qData = qDoc.data();
          if (qData.question_show === true) {
            // checkinId = "1", questionId = "1" (ตัวอย่าง)
            questionsArr.push({
              checkinId: checkin.id,
              questionId: qDoc.id,
              ...qData,
            });
          }
        });
      }
      setQuestionList(questionsArr);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  // ดึงคำตอบจาก Firestore -> questionAnswers
  const fetchAnsweredQuestions = async () => {
    if (!ownerUid || !studentId) return;
    const newAnswers = {};
    for (const question of questionList) {
      // path: checkin/<checkinId>/answers/<questionId>/students/<studentId>
      const answerRef = doc(
        db,
        `users/${ownerUid}/classroom/${classId}/checkin/${question.checkinId}/answers/${question.questionId}/students/${studentId}`
      );
      const answerSnap = await getDoc(answerRef);
      if (answerSnap.exists()) {
        // อ่าน field "text"
        newAnswers[question.questionId] = answerSnap.data().text || "";
      }
    }
    setQuestionAnswers(newAnswers);
  };

  // ------------------- เช็คอิน -------------------
  const handleCheckInPress = (item) => {
    setSelectedCheckin(item);
    setShowCheckInModal(true);
    setModalStep("code");
    setCheckinCodeInput("");
    setRemarkText("");
  };

  const verifyCheckinCode = async () => {
    try {
      if (!selectedCheckin) return;
      const correctCode = selectedCheckin.code;
      if (checkinCodeInput.trim() === correctCode) {
        setModalStep("remark");
      } else {
        Alert.alert("รหัสไม่ถูกต้อง", "กรุณาลองอีกครั้ง");
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถตรวจสอบรหัสได้");
    }
  };

  const handleSubmitRemark = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !selectedCheckin) return;
      const docRef = doc(
        db,
        `users/${ownerUid}/classroom/${classId}/checkin/${selectedCheckin.id}/students/${user.uid}`
      );
      await setDoc(
        docRef,
        {
          remark: remarkText.trim(),
          date: serverTimestamp(),
        },
        { merge: true }
      );
      Alert.alert("เช็คชื่อสำเร็จ", "บันทึกหมายเหตุและเวลาการเช็คชื่อเรียบร้อย");
    } catch (error) {
      console.error("Submit remark error:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setShowCheckInModal(false);
      setSelectedCheckin(null);
      setCheckinCodeInput("");
      setRemarkText("");
    }
  };

  // ------------------- ส่งคำตอบ -------------------
  const handleSubmitAnswer = async (question) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      // ดึง stid
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const stuId = userDocSnap.exists() ? userDocSnap.data().stid : "";
      if (!stuId) {
        Alert.alert("ไม่พบรหัสนักศึกษา", "กรุณาติดต่อเจ้าหน้าที่");
        return;
      }
      // path: checkin/<checkinId>/answers/<questionId>/students/<stuId>
      const answerRef = doc(
        db,
        `users/${ownerUid}/classroom/${classId}/checkin/${question.checkinId}/answers/${question.questionId}/students/${stuId}`
      );
      const answerText = answers[question.questionId]
        ? answers[question.questionId].trim()
        : "";
      await setDoc(
        answerRef,
        {
          text: answerText,
          time: serverTimestamp(),
        },
        { merge: true }
      );
      Alert.alert("ส่งคำตอบสำเร็จ", "คำตอบของคุณถูกบันทึกเรียบร้อย");

      // อัปเดต state ให้ขึ้น "ตอบแล้ว"
      setQuestionAnswers((prev) => ({
        ...prev,
        [question.questionId]: answerText,
      }));
      // ล้างช่อง input
      setAnswers((prev) => ({ ...prev, [question.questionId]: "" }));
    } catch (error) {
      console.error("Error submitting answer:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถส่งคำตอบได้");
    }
  };

  // ------------------- Rendering -------------------
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

  if (!classDetails) {
    return (
      <View style={styles.loadingContainer}>
        <Text>ไม่พบข้อมูลรายละเอียดของวิชา</Text>
      </View>
    );
  }

  // แมป path รูป (ถ้าเป็น /web/...)
  let imageSource = null;
  if (classDetails.photo) {
    if (classDetails.photo.startsWith("/web")) {
      imageSource = getLocalImage(classDetails.photo);
    } else {
      imageSource = { uri: classDetails.photo };
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* การ์ด: รายละเอียดวิชา */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="library-books" size={24} color="#3498db" />
            <Text style={styles.cardTitle}>รายละเอียดวิชา</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>รหัสวิชา:</Text>
              <Text style={styles.value}>{classDetails.code || "-"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>ชื่อวิชา:</Text>
              <Text style={styles.value}>{classDetails.name || "-"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>ห้อง:</Text>
              <Text style={styles.value}>{classDetails.room || "-"}</Text>
            </View>
            {ownerName && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>อาจารย์:</Text>
                <Text style={styles.value}>{ownerName}</Text>
              </View>
            )}
            {imageSource ? (
              <Image
                source={imageSource}
                style={styles.subjectImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.noImageText}>ไม่มีรูปภาพ</Text>
            )}
          </View>
        </View>

        {/* การ์ด: Checkin */}
        {checkinList.map((item) => (
          <View style={styles.card} key={item.id}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="event-available" size={24} color="#3498db" />
              <Text style={styles.cardTitle}>เช็คชื่อ: {item.name || item.id}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={{ marginBottom: 8, color: "#555" }}>
                {item.description || "ยังไม่มีรายละเอียดสำหรับการเช็คอินนี้"}
              </Text>
              <TouchableOpacity
                style={styles.checkinButton}
                onPress={() => handleCheckInPress(item)}
              >
                <MaterialIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.checkinButtonText}>เช็คชื่อ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* การ์ด: คำถามการเช็คชื่อ */}
        {questionList.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="help-outline" size={24} color="#3498db" />
              <Text style={styles.cardTitle}>คำถามการเช็คชื่อ</Text>
            </View>
            <View style={styles.cardContent}>
              {questionList.map((question) => {
                const existingAnswer = questionAnswers[question.questionId];
                return (
                  <View key={question.questionId} style={styles.questionContainer}>
                    <Text style={styles.questionText}>
                      {question.question_text || "คำถาม"}
                    </Text>
                    {existingAnswer ? (
                      <View style={styles.answeredContainer}>
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color="#3498db"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.answeredText}>
                          ตอบแล้ว: {existingAnswer}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <TextInput
                          style={styles.answerInput}
                          placeholder="กรอกคำตอบ..."
                          value={answers[question.questionId] || ""}
                          onChangeText={(text) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question.questionId]: text,
                            }))
                          }
                        />
                        <TouchableOpacity
                          style={styles.submitButton}
                          onPress={() => handleSubmitAnswer(question)}
                        >
                          <Text style={styles.submitButtonText}>ส่งคำตอบ</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal เช็คอิน */}
      <Modal
        visible={showCheckInModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCheckInModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {modalStep === "code" && (
              <>
                <Text style={styles.modalTitle}>กรอกรหัสการเช็คอิน</Text>
                <TextInput
                  style={styles.input}
                  placeholder="กรอกรหัส..."
                  value={checkinCodeInput}
                  onChangeText={setCheckinCodeInput}
                />
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#ccc" }]}
                    onPress={() => {
                      setShowCheckInModal(false);
                      setCheckinCodeInput("");
                      setSelectedCheckin(null);
                    }}
                  >
                    <Text style={styles.modalButtonText}>ยกเลิก</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#3498db" }]}
                    onPress={verifyCheckinCode}
                  >
                    <Text style={styles.modalButtonText}>ตรวจสอบ</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {modalStep === "remark" && (
              <>
                <Text style={styles.modalTitle}>หมายเหตุ (ไม่บังคับ)</Text>
                <TextInput
                  style={styles.remarkInput}
                  placeholder="กรอกหมายเหตุ..."
                  multiline
                  value={remarkText}
                  onChangeText={setRemarkText}
                />
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#ccc" }]}
                    onPress={() => {
                      setShowCheckInModal(false);
                      setRemarkText("");
                      setSelectedCheckin(null);
                    }}
                  >
                    <Text style={styles.modalButtonText}>ยกเลิก</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#3498db" }]}
                    onPress={handleSubmitRemark}
                  >
                    <Text style={styles.modalButtonText}>บันทึก</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... (เหมือนเดิม)
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scrollView: { flex: 1, padding: 16 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f9f9f9",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
    color: "#333",
  },
  cardContent: {
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    width: 80,
  },
  value: {
    fontSize: 16,
    color: "#555",
    flex: 1,
    flexWrap: "wrap",
  },
  subjectImage: {
    width: "100%",
    height: 200,
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  noImageText: {
    marginTop: 16,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  checkinButton: {
    flexDirection: "row",
    backgroundColor: "#3498db",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  checkinButtonText: {
    color: "#fff",
    marginLeft: 6,
    fontSize: 16,
    fontWeight: "600",
  },
  questionContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  questionText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  answeredContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eaf6ff",
    padding: 10,
    borderRadius: 8,
  },
  answeredText: {
    color: "#3498db",
    fontSize: 16,
    fontWeight: "600",
  },
  answerInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#3498db",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  remarkInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    minHeight: 80,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
    textAlignVertical: "top",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default DetailScreen;
