import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { auth, db } from "./firebase";
import { getDoc, doc, collection, getDocs } from "firebase/firestore";
import { Camera } from "expo-camera"; 
import { MaterialIcons } from "@expo/vector-icons";

const HomeScreen = () => {
  const [userData, setUserData] = useState(null);
  const [cid, setCid] = useState("");
  const [stid, setStid] = useState("");
  const [name, setName] = useState("");
  const [registeredClasses, setRegisteredClasses] = useState([]);

  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);

  const cameraRef = useRef(null);

  // ✅ ขอสิทธิ์การเข้าถึงกล้อง
  useEffect(() => {
    const requestCameraPermission = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
      if (status !== "granted") {
        Alert.alert(
          "Error",
          "ไม่สามารถใช้กล้องได้ ต้องอนุญาตสิทธิ์การเข้าถึงกล้อง"
        );
      }
    };

    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserData(userSnap.data());
      }

      fetchRegisteredClasses(user.uid);
    };

    requestCameraPermission();
    fetchUserData();
  }, []);

  // ✅ ดึงข้อมูลวิชาที่ลงทะเบียนไว้
  const fetchRegisteredClasses = async (uid) => {
    const classRef = collection(db, `users/${uid}/classroom`);
    const classSnap = await getDocs(classRef);
    const classList = classSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setRegisteredClasses(classList);
  };

  // ✅ ฟังก์ชันเมื่อสแกน QR Code สำเร็จ
  const handleBarCodeScanned = ({ type, data }) => {
    if (type === Camera.Constants.BarCodeType.qr) {
      Alert.alert("QR Code Detected", `Data: ${data}`);
      setCid(data);
      setScanning(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      {userData && (
        <View>
          <Text style={styles.headerText}>ข้อมูลผู้ใช้</Text>
          <Text>ชื่อ: {userData.name}</Text>
          <Text>รหัสนักศึกษา: {userData.stid}</Text>
          <Text>Email: {userData.email}</Text>
        </View>
      )}

      <TextInput
        placeholder="รหัสวิชา (CID)"
        value={cid}
        onChangeText={setCid}
        style={styles.input}
      />
      
      <Button
        title={scanning ? "ปิดกล้อง" : "เปิดกล้องเพื่อสแกน QR Code"}
        onPress={() => {
          setScanning(!scanning);
          setLoadingCamera(true);
        }}
        color={scanning ? "red" : "blue"}
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

      <Button
        title="ลงทะเบียน"
        onPress={() => Alert.alert("ลงทะเบียนสำเร็จ!")}
        color="green"
      />

      {scanning && hasPermission ? (
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            type={Camera.Constants.Type.back}
            ref={cameraRef}
            onBarCodeScanned={handleBarCodeScanned}
            onCameraReady={() => setLoadingCamera(false)}
            barCodeScannerSettings={{
              barCodeTypes: [Camera.Constants.BarCodeType.qr],
            }}
          />
          {loadingCamera && (
            <ActivityIndicator
              size="large"
              color="#00ff00"
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
      ) : null}

      {!hasPermission && (
        <Text style={{ color: "red", marginTop: 20 }}>
          ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตสิทธิ์
        </Text>
      )}

      <View style={{ marginTop: 30 }}>
        <Text style={styles.headerText}>วิชาที่ลงทะเบียน</Text>
        {registeredClasses.length > 0 ? (
          registeredClasses.map((classItem) => (
            <View
              key={classItem.id}
              style={{ padding: 10, borderBottomWidth: 1 }}
            >
              <Text>รหัสวิชา: {classItem.id}</Text>
              <Text>
                สถานะ:{" "}
                {classItem.status === 2 ? "ลงทะเบียนแล้ว" : "รอดำเนินการ"}
              </Text>
            </View>
          ))
        ) : (
          <Text>ยังไม่มีการลงทะเบียน</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
  },
  cameraContainer: {
    flex: 1,
    width: "100%",
    height: 300,
    position: "relative",
  },
  camera: {
    flex: 1,
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
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 5,
  },
});

export default HomeScreen;
