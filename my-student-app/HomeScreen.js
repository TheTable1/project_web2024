import React, { useState, useEffect } from "react";  
import { View, Text, TextInput, Button, Alert, ScrollView } from "react-native";
import { auth, db } from "./firebase";
import { getDoc, doc, setDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useCameraPermissions, Camera } from "expo-camera";

const HomeScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [cid, setCid] = useState(""); // รหัสวิชา
  const [stid, setStid] = useState(""); // รหัสนักศึกษา
  const [name, setName] = useState(""); // ชื่อ-สกุล
  const [registeredClasses, setRegisteredClasses] = useState([]); // วิชาที่ลงทะเบียนแล้ว
  const [hasPermission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false); // เปิดกล้องหรือไม่

  // ✅ ดึงข้อมูลผู้ใช้จาก Firestore
  useEffect(() => {
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

  // ✅ ฟังก์ชันตรวจสอบว่าห้องเรียนอยู่ใน `users/{uid}/classroom/{cid}` หรือไม่
  const checkClassExists = async (cid) => {
    const usersRef = collection(db, "users");
    const usersSnap = await getDocs(usersRef);

    for (const userDoc of usersSnap.docs) {
      const classroomsRef = collection(db, `users/${userDoc.id}/classroom`);
      const classSnap = await getDocs(classroomsRef);

      for (const classDoc of classSnap.docs) {
        if (classDoc.id === cid) {
          return userDoc.id; // คืนค่า `uid` ของเจ้าของห้องที่ตรงกัน
        }
      }
    }
    return null; // ถ้าไม่พบห้องเรียน
  };

  // ✅ ฟังก์ชัน Scan QR Code
  const handleBarCodeScanned = ({ type, data }) => {
    if (type === "qr") {
      setCid(data); // รับค่ารหัสวิชาจาก QR Code
      setScanning(false);
    }
  };

  // ✅ ฟังก์ชันลงทะเบียนเข้าเรียน
  const registerToClass = async () => {
    if (!cid || !stid || !name) {
      Alert.alert("Error", "กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      // ✅ เช็คว่าห้องเรียน `CID` อยู่ใน `users/{uid}/classroom/{cid}` ของผู้ใช้ใดหรือไม่
      const ownerUid = await checkClassExists(cid);

      if (!ownerUid) {
        Alert.alert("Error", "ไม่มีห้องนี้อยู่");
        return;
      }

      // ✅ บันทึกข้อมูลนักศึกษาใน `/users/{uid}/classroom/{cid}/students/{user.uid}`
      await setDoc(doc(db, `users/${ownerUid}/classroom/${cid}/students/${user.uid}`), {
        stid: stid,
        name: name,
      });

      await setDoc(doc(db, `users/${user.uid}/classroom/${cid}`), {
        status: 2,
      });

      Alert.alert("ลงทะเบียนสำเร็จ!");

      // ✅ ดึงข้อมูลที่เพิ่งลงทะเบียนใหม่ และแสดงใน UI ทันที
      fetchRegisteredClasses(user.uid);
    } catch (error) {
      Alert.alert("Error", "ไม่สามารถลงทะเบียนได้");
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      {userData && (
        <View>
          <Text style={{ fontSize: 20, fontWeight: "bold" }}>ข้อมูลผู้ใช้</Text>
          <Text>ชื่อ: {userData.name}</Text>
          <Text>รหัสนักศึกษา: {userData.stid}</Text>
          <Text>Email: {userData.email}</Text>
        </View>
      )}

      <View style={{ marginVertical: 20 }} />

      {/* ✅ ลงทะเบียนเข้าห้องเรียน */}
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>ลงทะเบียนวิชา</Text>
      <TextInput placeholder="รหัสวิชา (CID)" value={cid} onChangeText={setCid} />
      <Button title="Scan QR Code" onPress={() => setScanning(true)} color="blue" />

      <TextInput placeholder="รหัสนักศึกษา" value={stid} onChangeText={setStid} keyboardType="numeric" />
      <TextInput placeholder="ชื่อ-สกุล" value={name} onChangeText={setName} />

      <Button title="ลงทะเบียน" onPress={registerToClass} color="green" />

      {/* ✅ เปิดกล้องสำหรับสแกน QR Code */}
      {scanning && (
        <Camera
          style={{ width: "100%", height: 300 }}
          onBarCodeScanned={handleBarCodeScanned}
          barCodeScannerSettings={{
            barCodeTypes: ["qr"],
          }}
        />
      )}

      {/* ✅ แสดงวิชาที่ลงทะเบียนใต้เบอร์โทร */}
      <View style={{ marginTop: 30 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>วิชาที่ลงทะเบียน</Text>
        {registeredClasses.length > 0 ? (
          registeredClasses.map((classItem) => (
            <View key={classItem.id} style={{ padding: 10, borderBottomWidth: 1 }}>
              <Text>รหัสวิชา: {classItem.id}</Text>
              <Text>สถานะ: {classItem.status === 2 ? "ลงทะเบียนแล้ว" : "รอดำเนินการ"}</Text>
            </View>
          ))
        ) : (
          <Text>ยังไม่มีการลงทะเบียน</Text>
        )}
      </View>
    </ScrollView>
  );
};

export default HomeScreen;
