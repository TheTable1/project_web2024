import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MaterialIcons } from "@expo/vector-icons";

// ฟังก์ชันสำหรับแมป path รูปที่เป็น local
const getLocalImage = (path) => {
  switch (path) {
    // ตัวอย่าง: ถ้าใน database photo เก็บเป็น "/web/default-subject.jpg"
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

const DetailScreen = ({ route }) => {
  const { classId } = route.params; // รับรหัสวิชาที่ส่งมาจาก HomeScreen
  const [classDetails, setClassDetails] = useState(null);
  const [ownerName, setOwnerName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassDetails = async () => {
      try {
        // ดึงข้อมูลจาก collection "users" ทั้งหมด
        const usersRef = collection(db, "users");
        const usersSnap = await getDocs(usersRef);
        let foundDetails = null;
        let foundOwnerUid = null;

        // วนลูปในแต่ละผู้ใช้เพื่อตรวจสอบว่าใน collection classroom มี document ของวิชานี้หรือไม่
        for (const userDoc of usersSnap.docs) {
          const detailsRef = doc(
            db,
            `users/${userDoc.id}/classroom/${classId}/info/details`
          );
          const detailsSnap = await getDoc(detailsRef);
          if (detailsSnap.exists()) {
            foundDetails = detailsSnap.data();
            foundOwnerUid = userDoc.id; // เก็บ ownerUid จากผู้ใช้ที่เจอข้อมูลวิชานี้
            break; // เมื่อเจอข้อมูลแล้วหยุดการวนลูป
          }
        }

        setClassDetails(foundDetails);

        // ถ้าเจอ ownerUid ให้ดึงชื่อเจ้าของห้องจาก /users/{ownerUid}/name
        if (foundOwnerUid) {
          const ownerRef = doc(db, "users", foundOwnerUid);
          const ownerSnap = await getDoc(ownerRef);
          if (ownerSnap.exists()) {
            setOwnerName(ownerSnap.data().name);
          }
        }
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Card: รายละเอียดวิชา */}
        <View style={styles.card}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <MaterialIcons name="library-books" size={24} color="#3498db" />
            <Text style={styles.cardTitle}>รายละเอียดวิชา</Text>
          </View>
          {/* Card Content */}
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
      </ScrollView>
    </SafeAreaView>
  );
};

// เพิ่มสไตล์ให้คล้ายกับหน้า HomeScreen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
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
    width: 70,
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
});

export default DetailScreen;
