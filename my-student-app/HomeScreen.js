import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  StatusBar,
  Dimensions,
} from "react-native";
import { auth, db } from "./firebase";
import { getDoc, doc, collection, getDocs, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Camera } from "expo-camera";
import { MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const HomeScreen = ({ navigation }) => {
  // State variables
  const [userData, setUserData] = useState(null);
  const [cid, setCid] = useState("");
  const [stid, setStid] = useState("");
  const [name, setName] = useState("");
  const [registeredClasses, setRegisteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registerLoading, setRegisterLoading] = useState(false);

  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [scannedData, setScannedData] = useState(null);

  const cameraRef = useRef(null);

  // ✅ ขอสิทธิ์การเข้าถึงกล้องและดึงข้อมูลผู้ใช้
  useEffect(() => {
    const requestCameraPermission = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
      if (status !== "granted") {
        Alert.alert(
          "ไม่สามารถใช้งานกล้องได้",
          "โปรดอนุญาตการเข้าถึงกล้องเพื่อใช้งานฟีเจอร์สแกน QR Code"
        );
      }
    };

    const fetchUserData = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          navigation.navigate("Login");
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data);
          setStid(data.stid || "");
          setName(data.name || "");
        }

        await fetchRegisteredClasses(user.uid);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLoading(false);
        Alert.alert("Error", "ไม่สามารถดึงข้อมูลผู้ใช้ได้ โปรดลองอีกครั้ง");
      }
    };

    requestCameraPermission();
    fetchUserData();
  }, []);

  // ✅ ดึงข้อมูลวิชาที่ลงทะเบียนไว้
  const fetchRegisteredClasses = async (uid) => {
    try {
      const classRef = collection(db, `users/${uid}/classroom`);
      const classSnap = await getDocs(classRef);
      const classList = classSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRegisteredClasses(classList);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  // ✅ ฟังก์ชันเมื่อสแกน QR Code สำเร็จ
  const handleBarCodeScanned = ({ type, data }) => {
    // Simple implementation without complex conditions
    setScannedData({
      type,
      data
    });
    setCid(data);
    setScanning(false);
    Alert.alert(
      "สแกน QR Code สำเร็จ",
      `รหัสวิชา: ${data}\n\nโปรดกรอกข้อมูลเพื่อลงทะเบียน`,
      [{ text: "ตกลง", onPress: () => {} }]
    );
  };

  // ✅ ฟังก์ชันลงทะเบียนวิชา
  const handleRegister = async () => {
    if (!cid) {
      Alert.alert("กรุณาสแกน QR Code", "โปรดสแกน QR Code เพื่อรับรหัสวิชา");
      return;
    }

    if (!stid || !name) {
      Alert.alert("ข้อมูลไม่ครบถ้วน", "กรุณากรอกรหัสนักศึกษาและชื่อ-สกุล");
      return;
    }

    setRegisterLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setRegisterLoading(false);
        Alert.alert("กรุณาเข้าสู่ระบบ", "ไม่พบข้อมูลการเข้าสู่ระบบ");
        return;
      }

      // เช็คว่าลงทะเบียนไปแล้วหรือไม่
      const classExistsRef = doc(db, `users/${user.uid}/classroom`, cid);
      const classExistsSnap = await getDoc(classExistsRef);
      
      if (classExistsSnap.exists()) {
        setRegisterLoading(false);
        Alert.alert("ลงทะเบียนซ้ำ", "คุณได้ลงทะเบียนวิชานี้ไปแล้ว");
        return;
      }

      // บันทึกข้อมูลการลงทะเบียน
      await setDoc(doc(db, `users/${user.uid}/classroom`, cid), {
        cid: cid,
        stid: stid,
        name: name,
        status: 2, // 2 = ลงทะเบียนแล้ว
        timestamp: new Date().toISOString(),
      });

      // บันทึกลงในฐานข้อมูลรวมของวิชา
      await addDoc(collection(db, `classrooms/${cid}/students`), {
        uid: user.uid,
        stid: stid,
        name: name,
        email: user.email || "",
        timestamp: new Date().toISOString(),
      });

      setRegisterLoading(false);
      setCid("");
      setScannedData(null);
      
      // ดึงข้อมูลวิชาใหม่
      await fetchRegisteredClasses(user.uid);
      
      Alert.alert(
        "ลงทะเบียนสำเร็จ",
        `ลงทะเบียนวิชา ${cid} เรียบร้อยแล้ว`,
        [{ text: "ตกลง", onPress: () => {} }]
      );
    } catch (error) {
      console.error("Error registering:", error);
      setRegisterLoading(false);
      Alert.alert("ลงทะเบียนไม่สำเร็จ", "เกิดข้อผิดพลาดในการลงทะเบียน โปรดลองอีกครั้ง");
    }
  };

  // ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    Alert.alert(
      "ออกจากระบบ",
      "คุณต้องการออกจากระบบใช่หรือไม่?",
      [
        { text: "ยกเลิก", style: "cancel" },
        { 
          text: "ออกจากระบบ", 
          style: "destructive",
          onPress: async () => {
            try {
              await auth.signOut();
              navigation.replace("Login");
            } catch (error) {
              console.error("Error signing out:", error);
              Alert.alert("Error", "ไม่สามารถออกจากระบบได้ โปรดลองอีกครั้ง");
            }
          }
        }
      ]
    );
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
          <Text style={styles.headerTitle}>สวัสดี, {userData?.name || "นักศึกษา"}</Text>
          <Text style={styles.headerSubtitle}>ยินดีต้อนรับสู่ระบบลงทะเบียน</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ชื่อ-สกุล:</Text>
              <Text style={styles.infoValue}>{userData?.name || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>รหัสนักศึกษา:</Text>
              <Text style={styles.infoValue}>{userData?.stid || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>อีเมล:</Text>
              <Text style={styles.infoValue}>{userData?.email || "-"}</Text>
            </View>
          </View>
        </View>

        {/* Registration Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="qr-code-scanner" size={24} color="#3498db" />
            <Text style={styles.cardTitle}>ลงทะเบียนวิชาเรียน</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.qrSection}>
              {scannedData ? (
                <View style={styles.scannedResult}>
                  <MaterialIcons name="check-circle" size={40} color="#4CAF50" />
                  <Text style={styles.scannedText}>สแกนสำเร็จ: {scannedData.data}</Text>
                </View>
              ) : (
                <View style={styles.scanPrompt}>
                  <MaterialIcons name="qr-code" size={60} color="#3498db" />
                  <Text style={styles.scanText}>กดปุ่มด้านล่างเพื่อสแกน QR Code</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => {
                  setScanning(true);
                  setLoadingCamera(true);
                }}
              >
                <MaterialIcons name="camera-alt" size={24} color="white" />
                <Text style={styles.scanButtonText}>สแกน QR Code</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="รหัสวิชา (CID)"
              value={cid}
              onChangeText={setCid}
              style={styles.input}
              editable={false}
            />
            <TextInput
              placeholder="รหัสนักศึกษา"
              value={stid}
              onChangeText={setStid}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              placeholder="ชื่อ-สกุล"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />

            <TouchableOpacity
              style={[styles.registerButton, !cid && styles.disabledButton]}
              onPress={handleRegister}
              disabled={!cid || registerLoading}
            >
              {registerLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <FontAwesome5 name="user-plus" size={18} color="white" />
                  <Text style={styles.registerButtonText}>ลงทะเบียน</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Registered Classes Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="class" size={24} color="#3498db" />
            <Text style={styles.cardTitle}>วิชาที่ลงทะเบียน</Text>
          </View>
          <View style={styles.cardContent}>
            {registeredClasses.length > 0 ? (
              registeredClasses.map((classItem) => (
                <View key={classItem.id} style={styles.classItem}>
                  <View style={styles.classIconContainer}>
                    <MaterialIcons name="school" size={24} color="#3498db" />
                  </View>
                  <View style={styles.classInfo}>
                    <Text style={styles.classId}>รหัสวิชา: {classItem.id}</Text>
                    <Text style={styles.classStatus}>
                      สถานะ:{" "}
                      <Text 
                        style={[
                          styles.statusText, 
                          { color: classItem.status === 2 ? "#4CAF50" : "#FF9800" }
                        ]}
                      >
                        {classItem.status === 2 ? "ลงทะเบียนแล้ว" : "รอดำเนินการ"}
                      </Text>
                    </Text>
                    {classItem.timestamp && (
                      <Text style={styles.timestamp}>
                        เวลา: {new Date(classItem.timestamp).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyClasses}>
                <MaterialIcons name="info" size={40} color="#9E9E9E" />
                <Text style={styles.emptyText}>ยังไม่มีวิชาที่ลงทะเบียน</Text>
                <Text style={styles.emptySubtext}>
                  สแกน QR Code เพื่อลงทะเบียนวิชาเรียน
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Camera Modal */}
      {scanning && hasPermission && (
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            type={Camera.Constants.Type.back}
            ref={cameraRef}
            onBarCodeScanned={handleBarCodeScanned}
            onCameraReady={() => setLoadingCamera(false)}
            barCodeScannerSettings={{
              barCodeTypes: ["qr"],
            }}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.scannerIndicator} />
              <Text style={styles.scannerText}>
                วางคิวอาร์โค้ดให้อยู่ภายในกรอบ
              </Text>
              {loadingCamera && (
                <ActivityIndicator
                  size="large"
                  color="#FFFFFF"
                  style={styles.loadingIndicator}
                />
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setScanning(false)}
              >
                <MaterialIcons name="close" size={30} color="white" />
              </TouchableOpacity>
            </View>
          </Camera>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333333",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 20,
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
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#F9F9F9",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
    color: "#333333",
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  infoLabel: {
    width: 100,
    fontSize: 15,
    color: "#666666",
    fontWeight: "500",
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    color: "#333333",
  },
  qrSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  scanPrompt: {
    alignItems: "center",
    marginBottom: 15,
  },
  scanText: {
    marginTop: 10,
    textAlign: "center",
    color: "#666666",
    fontSize: 14,
  },
  scannedResult: {
    alignItems: "center",
    marginBottom: 15,
  },
  scannedText: {
    marginTop: 10,
    color: "#4CAF50",
    fontWeight: "bold",
    fontSize: 16,
  },
  scanButton: {
    flexDirection: "row",
    backgroundColor: "#3498db",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
  },
  registerButton: {
    flexDirection: "row",
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#A5D6A7",
    opacity: 0.7,
  },
  registerButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  classItem: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 12,
  },
  classIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  classInfo: {
    flex: 1,
    justifyContent: "center",
  },
  classId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 4,
  },
  classStatus: {
    fontSize: 14,
    color: "#666666",
  },
  statusText: {
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    color: "#888888",
    marginTop: 2,
  },
  emptyClasses: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#888888",
    marginTop: 4,
    textAlign: "center",
  },
  cameraContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerIndicator: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: "#3498db",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  scannerText: {
    color: "white",
    fontSize: 16,
    marginTop: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  loadingIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -15,
    marginTop: -15,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 30,
    padding: 8,
  },
});

export default HomeScreen;