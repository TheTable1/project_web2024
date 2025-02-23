import React, { useEffect, useState } from "react";
import { Table, Button, Container } from "react-bootstrap";
import { db, auth } from "./firebaseConfig"; // นำเข้า firebase ที่ config ไว้

const QuestionPage = ({ subjectId, checkinId, onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId || !checkinId) return;

    const user = auth.currentUser;
    if (!user) {
      alert("❌ กรุณาเข้าสู่ระบบก่อน");
      return;
    }

    // โหลดคำถามจาก Firestore
    const fetchQuestions = async () => {
      try {
        const questionsRef = db
          .collection("users")
          .doc(user.uid)
          .collection("classroom")
          .doc(subjectId)
          .collection("checkin")
          .doc(checkinId)
          .collection("questions");

        const querySnapshot = await questionsRef.get();
        let loadedQuestions = [];

        querySnapshot.forEach((doc) => {
          loadedQuestions.push({ id: doc.id, ...doc.data() });
        });

        setQuestions(loadedQuestions);
        setLoading(false);
      } catch (error) {
        console.error("🚨 Error fetching questions:", error);
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [subjectId, checkinId]);

  return (
    <Container className="mt-4">
      <Button variant="secondary" onClick={onBack} className="mb-3">
        🔙 กลับ
      </Button>

      <h5>📌 รายการคำถามในห้องเรียน</h5>

      {loading ? (
        <p>⏳ กำลังโหลดคำถาม...</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th>หมายเลขคำถาม</th>
              <th>ข้อความคำถาม</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {questions.length > 0 ? (
              questions.map((question, index) => (
                <tr key={question.id}>
                  <td>{index + 1}</td>
                  <td>{question.question_no}</td>
                  <td>{question.question_text}</td>
                  <td>{question.question_show ? "✅ แสดง" : "❌ ซ่อน"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center text-muted">
                  ❌ ไม่มีคำถามในห้องเรียนนี้
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default QuestionPage;
