import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Image, ScrollView } from "react-native";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// ฟังก์ชันสำหรับแมป path รูปที่เป็น local
const getLocalImage = (path) => {
  switch (path) {
    // กรณีใน database photo เก็บเป็น "/web/default-avatar5.jpg"
    case "/web/default-subject.jpg":
      return require("./assets/default-subject.jpg");
    case "/web/default-subject1.jpg":
      return require("./assets/default-subject1.jpg");
    case "/web/default-subject2.jpg":
      return require("./assets/default-subject2.jpg");
    case "/web/default-subject3.jpg":
      return require("./assets/default-subject3.jpg");
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

const DetailScreen = ({ route }) => {
  const { classId } = route.params; // รับรหัสวิชาที่ส่งมาจาก HomeScreen
  const [classDetails, setClassDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassDetails = async () => {
      try {
        // ดึงข้อมูลจาก collection "users" ทั้งหมด
        const usersRef = collection(db, "users");
        const usersSnap = await getDocs(usersRef);
        let foundDetails = null;

        // วนลูปในแต่ละผู้ใช้เพื่อตรวจสอบว่าใน collection classroom มี document ของวิชานี้หรือไม่
        for (const userDoc of usersSnap.docs) {
          const detailsRef = doc(
            db,
            `users/${userDoc.id}/classroom/${classId}/info/details`
          );
          const detailsSnap = await getDoc(detailsRef);
          if (detailsSnap.exists()) {
            foundDetails = detailsSnap.data();
            break; // เมื่อเจอข้อมูลแล้วหยุดการวนลูป
          }
        }
        setClassDetails(foundDetails);
      } catch (error) {
        console.error("Error fetching class details: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassDetails();
  }, [classId]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!classDetails) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>ไม่พบข้อมูลรายละเอียดของวิชา</Text>
      </View>
    );
  }

  // ตรวจสอบว่า photo เป็น path local หรือ URL ภายนอก
  let imageSource = null;
  if (classDetails.photo) {
    if (classDetails.photo.startsWith("/web")) {
      imageSource = getLocalImage(classDetails.photo);
    } else {
      imageSource = { uri: classDetails.photo };
    }
  }

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
        รายละเอียดวิชา
      </Text>
      <Text style={{ marginBottom: 5 }}>
        รหัสวิชา: {classDetails.code || "-"}
      </Text>
      <Text style={{ marginBottom: 5 }}>
        ชื่อวิชา: {classDetails.name || "-"}
      </Text>
      <Text style={{ marginBottom: 5 }}>ห้อง: {classDetails.room || "-"}</Text>
      {imageSource ? (
        <Image
          source={imageSource}
          style={{ width: "100%", height: 200, marginTop: 10 }}
          resizeMode="contain"
        />
      ) : (
        <Text>ไม่มีรูปภาพ</Text>
      )}
    </ScrollView>
  );
};

export default DetailScreen;
