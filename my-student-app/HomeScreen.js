import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert, ScrollView } from "react-native";
import { auth, db } from "./firebase";
import { getDoc, doc, setDoc, collection, getDocs } from "firebase/firestore";
import Camera from "expo-camera"; // ลองเปลี่ยนเป็น default import

const HomeScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [cid, setCid] = useState(""); // รหัสวิชา
  const [registeredClasses, setRegisteredClasses] = useState([]); // วิชาที่ลงทะเบียนแล้ว
  const [classNames, setClassNames] = useState({}); // เก็บชื่อวิชาตามรหัสวิชา
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false); // เปิดกล้องหรือไม่

  // ฟังก์ชันขอสิทธิ์เข้าถึงกล้อง
  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
  };

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserData(userSnap.data());
      }

      await fetchRegisteredClasses(user.uid);
      await fetchClassNames();
    };

    fetchData();
    requestCameraPermission();
  }, []);

  const fetchRegisteredClasses = async (uid) => {
    const classRef = collection(db, `users/${uid}/classroom`); // แก้ไขที่นี่
    const classSnap = await getDocs(classRef);
    const classList = classSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setRegisteredClasses(classList);
  };

  const fetchClassNames = async () => {
    const classNamesRef = collection(db, "class_names"); // สร้าง collection สำหรับชื่อวิชา
    const classSnap = await getDocs(classNamesRef);

    const newClassNames = {};
    classSnap.forEach((doc) => {
      const classData = doc.data();
      newClassNames[classData.id] = classData.name; // เก็บชื่อวิชา
    });
    setClassNames(newClassNames);
  };

  const registerToClass = async () => {
    if (!cid || !userData?.stid || !userData?.name) {
      Alert.alert("Error", "กรุณากรอกรหัสวิชาให้ครบ");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(usersRef);
      let classExists = false;
      let ownerUid = null;

      for (const userDoc of usersSnap.docs) {
        const classroomsRef = collection(db, `users/${userDoc.id}/classroom`);
        const classSnap = await getDocs(classroomsRef);

        for (const classDoc of classSnap.docs) {
          if (classDoc.id === cid) {
            classExists = true;
            ownerUid = userDoc.id;
            break;
          }
        }
        if (classExists) break;
      }

      if (!classExists) {
        Alert.alert("Error", "ไม่มีรหัสวิชานี้ในระบบ");
        return;
      }

      const user = auth.currentUser;
      if (!user) return;

      await setDoc(
        doc(db, `users/${ownerUid}/classroom/${cid}/students/${user.uid}`),
        {
          stid: userData.stid,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          uid: user.uid,
          status: 0,
        }
      );

      await setDoc(doc(db, `users/${user.uid}/classroom/${cid}`), {
        status: 2,
      });

      Alert.alert("ลงทะเบียนสำเร็จ!");

      fetchRegisteredClasses(user.uid);
      fetchClassNames();
    } catch (error) {
      Alert.alert("Error", "ไม่สามารถลงทะเบียนได้");
    }
  };

  // ฟังก์ชันเปิดกล้อง
  const startScanning = () => {
    if (hasPermission === null) {
      Alert.alert("กำลังขอสิทธิ์เข้าถึงกล้อง...");
    } else if (hasPermission === false) {
      Alert.alert("ไม่สามารถใช้กล้องได้ กรุณาเปิดสิทธิ์ให้แอป");
    } else {
      setScanning(true);
    }
  };

  // ฟังก์ชันเมื่อสแกน QR Code สำเร็จ
  const handleBarCodeScanned = ({ type, data }) => {
    setScanning(false);
    setCid(data); // นำข้อมูลที่ได้จาก QR Code ไปใส่ใน cid
    Alert.alert("QR Code ถูกสแกนแล้ว", `รหัสวิชา: ${data}`);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      {scanning ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text>สแกน QR Code...</Text>
          <Camera
            onBarCodeScanned={scanning ? handleBarCodeScanned : undefined}
            style={{ width: "100%", height: 400 }}
          />
          <Button
            title="ยกเลิก"
            onPress={() => setScanning(false)}
            color="red"
          />
        </View>
      ) : (
        <>
          {userData && (
            <View>
              <Text style={{ fontSize: 20, fontWeight: "bold" }}>
                ข้อมูลผู้ใช้
              </Text>
              <Text>ชื่อ: {userData.name}</Text>
              <Text>รหัสนักศึกษา: {userData.stid}</Text>
              <Text>Email: {userData.email}</Text>
              <Text>Phone: {userData.phone}</Text>
            </View>
          )}

          <View style={{ marginVertical: 20 }} />

          <TextInput
            placeholder="รหัสวิชา (CID)"
            value={cid}
            onChangeText={setCid}
          />
          <Button title="ลงทะเบียน" onPress={registerToClass} color="green" />
          <Button title="สแกน QR Code" onPress={startScanning} color="blue" />

          <Text style={{ fontSize: 18, fontWeight: "bold" }}>
            วิชาที่ลงทะเบียน
          </Text>
          {registeredClasses.length > 0 ? (
            registeredClasses.map((classItem) => (
              <View
                key={classItem.id}
                style={{ padding: 10, borderBottomWidth: 1 }}
              >
                <Text>
                  ชื่อวิชา: {classNames[classItem.id] || "ไม่พบชื่อวิชา"}
                </Text>
                <Text>
                  สถานะ:{" "}
                  {classItem.status === 2 ? "ลงทะเบียนแล้ว" : "รอดำเนินการ"}
                </Text>
              </View>
            ))
          ) : (
            <Text>ยังไม่มีการลงทะเบียน</Text>
          )}
        </>
      )}
    </ScrollView>
  );
};

export default HomeScreen;
