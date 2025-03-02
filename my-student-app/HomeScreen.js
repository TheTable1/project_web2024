import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  TextInput,
} from "react-native";
import {
  auth,
  db,
  signOut,
  getDoc,
  doc,
  collection,
  getDocs,
  onAuthStateChanged,
  setDoc,
} from "./firebase";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";

const { width, height } = Dimensions.get("window");

const HomeScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  // รายวิชาที่นักศึกษาลงทะเบียน
  const [registeredClasses, setRegisteredClasses] = useState([]);
  // ชื่อวิชาที่ดึงมาจากทุกผู้ใช้/ทุก classroom โดย key เป็นรหัสวิชา
  const [classNames, setClassNames] = useState({});
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  // state สำหรับกรอกรหัสห้อง
  const [roomCode, setRoomCode] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchUserData(user.uid);
        await fetchRegisteredClasses(user.uid);
        await fetchClassNames();
      } else {
        navigation.replace("Login");
      }
    });
    return unsubscribe;
  }, []);

  // ดึงข้อมูลผู้ใช้จาก collection "Student" หรือ "users"
  const fetchUserData = async (uid) => {
    try {
      let userDoc = await getDoc(doc(db, "Student", uid));
      if (!userDoc.exists()) {
        userDoc = await getDoc(doc(db, "users", uid));
      }
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      } else {
        Alert.alert("ข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลผู้ใช้ได้");
    }
    setLoading(false);
  };

  // วนลูปในทุกผู้ใช้และทุก classroom เพื่อตรวจสอบว่ามี document ใน subcollection "students"
  // ที่มี id ตรงกับผู้ใช้ที่ล็อกอิน (ดึง status จาก document นั้น)
  const fetchRegisteredClasses = async (uid) => {
    const registered = [];
    try {
      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(usersRef);
      for (const userDoc of usersSnap.docs) {
        const ownerUid = userDoc.id;
        const classroomsRef = collection(db, `users/${ownerUid}/classroom`);
        const classSnap = await getDocs(classroomsRef);
        for (const classDoc of classSnap.docs) {
          const classId = classDoc.id;
          const studentDocRef = doc(
            db,
            `users/${ownerUid}/classroom/${classId}/students`,
            uid
          );
          const studentSnap = await getDoc(studentDocRef);
          if (studentSnap.exists()) {
            const studentData = studentSnap.data();
            registered.push({
              ownerUid,
              id: classId,
              status: studentData.status, // 0: กำลังดำเนินการ, 1: ลงทะเบียนแล้ว
              timestamp: classDoc.data().timestamp || null,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching registered classes:", error);
    }
    setRegisteredClasses(registered);
  };

  // ดึงชื่อวิชาจาก path /users/{ownerUid}/classroom/{classId}/info/details
  const fetchClassNames = async () => {
    const names = {};
    try {
      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(usersRef);
      for (const userDoc of usersSnap.docs) {
        const ownerUid = userDoc.id;
        const classroomsRef = collection(db, `users/${ownerUid}/classroom`);
        const classSnap = await getDocs(classroomsRef);
        for (const classDoc of classSnap.docs) {
          const classId = classDoc.id;
          const detailsRef = doc(
            db,
            `users/${ownerUid}/classroom/${classId}/info/details`
          );
          const detailsSnap = await getDoc(detailsRef);
          if (detailsSnap.exists()) {
            names[classId] = detailsSnap.data().name;
          }
        }
      }
    } catch (error) {
      console.error("Error fetching class names:", error);
    }
    setClassNames(names);
  };

  // ฟังก์ชันสำหรับลงทะเบียนด้วยรหัสห้อง (ใช้ได้ทั้งกรอกด้วยมือและสแกน QR Code)
  const registerRoomCode = async (code) => {
    if (code.trim() === "") {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกรหัสห้อง");
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) return;
      let foundOwner = null;
      // ค้นหาห้องที่มีรหัสตรงกับ code ในทุกผู้ใช้
      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(usersRef);
      for (const userDoc of usersSnap.docs) {
        const ownerUid = userDoc.id;
        const classroomRef = doc(db, `users/${ownerUid}/classroom`, code);
        const classroomSnap = await getDoc(classroomRef);
        if (classroomSnap.exists()) {
          foundOwner = ownerUid;
          break;
        }
      }
      if (!foundOwner) {
        Alert.alert("ไม่พบรหัสห้อง", "กรุณาตรวจสอบรหัสห้องอีกครั้ง");
        return;
      }
      // บันทึกข้อมูลนักศึกษาลงใน subcollection "students" ของห้องที่พบ
      await setDoc(
        doc(db, `users/${foundOwner}/classroom/${code}/students`, user.uid),
        {
          uid: user.uid,
          stid: userData?.stid || "",
          name: userData?.name || "",
          email: userData?.email || "",
          phone: userData?.phone || "",
          status: 0, // กำลังดำเนินการ
        }
      );
      await fetchRegisteredClasses(user.uid);
      Alert.alert("ลงทะเบียนสำเร็จ", `ลงทะเบียนเข้าห้อง ${code} เรียบร้อยแล้ว`);
    } catch (error) {
      console.error("Register with code error:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถลงทะเบียนได้");
    }
  };

  // ฟังก์ชันสำหรับลงทะเบียนด้วยรหัสห้องจาก TextInput
  const handleRegisterWithCode = async () => {
    await registerRoomCode(roomCode);
    setRoomCode("");
  };

  // ฟังก์ชันสำหรับจัดการเมื่อสแกน QR Code แล้ว (ใช้รหัสที่สแกนได้เป็นรหัสห้อง)
  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    setScanning(false);
    await registerRoomCode(data);
  };

  const startScanning = async () => {
    const { granted } = await requestPermission();
    if (granted) {
      setScanning(true);
      setScanned(false);
    } else {
      Alert.alert(
        "ไม่ได้รับอนุญาตให้ใช้กล้อง",
        "กรุณาอนุญาตให้แอพเข้าถึงกล้องในการตั้งค่า"
      );
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("ออกจากระบบไม่สำเร็จ", error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            สวัสดี, {userData?.name || userData?.username || "นักศึกษา"}
          </Text>
          <Text style={styles.headerSubtitle}>ยินดีต้อนรับสู่ระบบลงทะเบียน</Text>
        </View>
        <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="person" size={24} color="#3498db" />
            <Text style={styles.cardTitle}>ข้อมูลผู้ใช้</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {(userData?.name?.charAt(0) ||
                    userData?.username?.charAt(0) ||
                    "?").toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {userData?.name || userData?.username || "ไม่ระบุชื่อ"}
                </Text>
                <Text style={styles.profileDetail}>
                  รหัสนักศึกษา: {userData?.stid || userData?.studentId || "-"}
                </Text>
                <Text style={styles.profileDetail}>
                  อีเมล: {userData?.email || "-"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* QR Scanner Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="qr-code-scanner" size={24} color="#3498db" />
            <Text style={styles.cardTitle}>สแกน QR Code</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.scannerInfo}>
              <MaterialIcons name="info" size={24} color="#4CAF50" />
              <Text style={styles.scannerInfoText}>
                สแกน QR Code เพื่อลงทะเบียนวิชาเรียน
              </Text>
            </View>
            <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
              <MaterialIcons name="qr-code-scanner" size={24} color="white" />
              <Text style={styles.scanButtonText}>เปิดสแกนเนอร์</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Manual Registration Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="edit" size={24} color="#3498db" />
            <Text style={styles.cardTitle}>ลงทะเบียนด้วยรหัสห้อง</Text>
          </View>
          <View style={styles.cardContent}>
            <TextInput
              style={styles.input}
              placeholder="กรอกรหัสห้อง"
              value={roomCode}
              onChangeText={setRoomCode}
            />
            <TouchableOpacity style={styles.registerButton} onPress={handleRegisterWithCode}>
              <Text style={styles.registerButtonText}>ลงทะเบียน</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Registered Classes Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="class" size={24} color="#3498db" />
            <Text style={styles.cardTitle}>วิชาที่ลงทะเบียนแล้ว</Text>
          </View>
          <View style={styles.cardContent}>
            {registeredClasses.length > 0 ? (
              registeredClasses.map((classItem) => (
                <TouchableOpacity
                  key={classItem.id}
                  style={styles.classItem}
                  onPress={() =>
                    navigation.navigate("DetailScreen", { classId: classItem.id })
                  }
                >
                  <View style={styles.classIconContainer}>
                    <MaterialIcons name="school" size={24} color="#3498db" />
                  </View>
                  <View style={styles.classInfo}>
                    <Text style={styles.classId}>
                      ชื่อวิชา:{" "}
                      {classNames[classItem.id]
                        ? classNames[classItem.id]
                        : classItem.id}
                    </Text>
                    <Text style={styles.classStatus}>
                      สถานะ:{" "}
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              classItem.status === 1 ? "#4CAF50" : "#FF9800",
                          },
                        ]}
                      >
                        {classItem.status === 1
                          ? "ลงทะเบียนแล้ว"
                          : "กำลังดำเนินการ"}
                      </Text>
                    </Text>
                    {classItem.timestamp && (
                      <Text style={styles.timestamp}>
                        เวลา:{" "}
                        {new Date(classItem.timestamp).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyClassesContainer}>
                <MaterialIcons name="info" size={40} color="#9E9E9E" />
                <Text style={styles.emptyClassesText}>
                  ยังไม่มีวิชาที่ลงทะเบียน
                </Text>
                <Text style={styles.emptyClassesSubtext}>
                  สแกน QR Code หรือลงทะเบียนด้วยรหัสห้อง
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Camera Modal สำหรับ QR Scanning */}
      {scanning && permission?.granted && (
        <View style={styles.cameraContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanInstructionText}>
                วางคิวอาร์โค้ดให้อยู่ภายในกรอบเพื่อสแกน
              </Text>
            </View>
            <SafeAreaView style={styles.scannerHeader}>
              <View style={styles.scannerHeaderContent}>
                <Text style={styles.scannerTitle}>สแกน QR Code</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setScanning(false)}
                >
                  <MaterialIcons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
            <View style={styles.scannerFooter}>
              <TouchableOpacity
                style={styles.cancelScanButton}
                onPress={() => setScanning(false)}
              >
                <Text style={styles.cancelScanText}>ยกเลิก</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  logoutIcon: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
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
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  profileDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  scannerInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  scannerInfoText: {
    marginLeft: 8,
    flex: 1,
    color: "#2E7D32",
    fontSize: 14,
  },
  scanButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  registerButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  classItem: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 12,
  },
  classIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  classInfo: {
    flex: 1,
  },
  classId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  classStatus: {
    fontSize: 14,
    color: "#666",
  },
  statusText: {
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  emptyClassesContainer: {
    alignItems: "center",
    padding: 20,
  },
  emptyClassesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  emptyClassesSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 4,
  },
  cameraContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: "#000",
    zIndex: 1000,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: "#3498db",
    borderRadius: 12,
  },
  scanInstructionText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
    maxWidth: 300,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  scannerHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
  },
  scannerHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: StatusBar.currentHeight || 44,
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  closeButton: {
    padding: 8,
  },
  scannerFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: "center",
  },
  cancelScanButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  cancelScanText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HomeScreen;
