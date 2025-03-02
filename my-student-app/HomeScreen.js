import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { auth, db } from "./firebase";
import { getDoc, doc, setDoc, collection, getDocs } from "firebase/firestore";
import { useCameraPermissions, Camera } from "expo-camera";

const HomeScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [cid, setCid] = useState(""); // รหัสวิชา (สำหรับการลงทะเบียนด้วย QR หรือกรอกด้วยมือ)
  const [registeredClasses, setRegisteredClasses] = useState([]); // รายวิชาที่นักศึกษาอยู่ในห้องเรียน
  const [classNames, setClassNames] = useState({}); // เก็บชื่อวิชาตามรหัสวิชา
  const [hasPermission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false); // สำหรับเปิดกล้อง QR

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // ดึงข้อมูลของนักศึกษา
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserData(userSnap.data());
      }

      // ดึงรายวิชาที่นักศึกษาลงทะเบียนอยู่จากทุกผู้ใช้
      fetchRegisteredClasses(user.uid);
      // ดึงชื่อวิชาจากส่วน info/details ของแต่ละ classroom
      fetchClassNames();
    };
    fetchUserData();
  }, []);

  // ฟังก์ชันนี้จะวนลูปในทุก user และทุก classroom เพื่อตรวจสอบว่าใน subcollection "students"
  // มี document ที่มี id ตรงกับ id ของผู้ใช้ที่ล็อกอินหรือไม่
  const fetchRegisteredClasses = async (uid) => {
    const registered = [];
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
            status: studentData.status, // status: 0 หรือ 1
          });
        }
      }
    }
    setRegisteredClasses(registered);
  };

  // ดึงชื่อวิชาจาก info/details ของแต่ละ classroom จากทุกผู้ใช้
  const fetchClassNames = async () => {
    const names = {};
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
    setClassNames(names);
  };

  const handleBarCodeScanned = ({ type, data }) => {
    if (type === "qr") {
      setCid(data);
      setScanning(false);
    }
  };

  // ฟังก์ชันสำหรับลงทะเบียนวิชา (ยังคงใช้ได้ตามเดิม)
  const registerToClass = async () => {
    if (!cid || !userData?.stid || !userData?.name) {
      Alert.alert("Error", "กรุณากรอกรหัสวิชาให้ครบ");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      // ค้นหา ownerUid จากทุก user ที่มี classroom ที่มี id ตรงกับ cid
      let ownerUid = null;
      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(usersRef);
      for (const userDoc of usersSnap.docs) {
        const classroomsRef = collection(db, `users/${userDoc.id}/classroom`);
        const classSnap = await getDocs(classroomsRef);
        if (classSnap.docs.find((docSnap) => docSnap.id === cid)) {
          ownerUid = userDoc.id;
          break;
        }
      }

      if (!ownerUid) {
        Alert.alert("Error", "ไม่มีรหัสวิชานี้ในระบบ");
        return;
      }

      // บันทึกข้อมูลในส่วนของเจ้าของห้อง (เพิ่มนักศึกษาใน subcollection "students")
      await setDoc(
        doc(db, `users/${ownerUid}/classroom/${cid}/students`, user.uid),
        {
          status: 0,
          stid: userData.stid,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          uid: user.uid,
        }
      );

      // บันทึกข้อมูลในส่วนของผู้ใช้ (วิชาที่ลงทะเบียน) พร้อมกับบันทึก ownerUid เพื่อใช้อ้างอิงในภายหลัง
      await setDoc(doc(db, `users/${user.uid}/classroom/${cid}`), {
        status: 2,
        ownerUid: ownerUid,
      });

      Alert.alert("ลงทะเบียนสำเร็จ!");

      // อัพเดตรายวิชาที่นักศึกษาอยู่
      fetchRegisteredClasses(user.uid);
      fetchClassNames();
    } catch (error) {
      Alert.alert("Error", "ไม่สามารถลงทะเบียนได้");
      console.error("Register error: ", error);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>ข้อมูลผู้ใช้</Text>
      {userData ? (
        <View style={{ padding: 10, borderBottomWidth: 1 }}>
          <Text>ชื่อ: {userData.name}</Text>
          <Text>อีเมล: {userData.email}</Text>
          <Text>เบอร์โทร: {userData.phone}</Text>
          <Text>รหัสนักศึกษา: {userData.stid}</Text>
        </View>
      ) : (
        <Text>กำลังโหลดข้อมูล...</Text>
      )}

      <Text style={{ fontSize: 18, fontWeight: "bold", marginTop: 20 }}>
        วิชาที่ลงทะเบียน
      </Text>
      {registeredClasses.length > 0 ? (
        registeredClasses.map((classItem) => (
          <TouchableOpacity
            key={classItem.id}
            style={{ padding: 10, borderBottomWidth: 1 }}
            onPress={() => {
              navigation.navigate("DetailScreen", {
                classId: classItem.id, // ส่งรหัสวิชาไปยัง DetailScreen
                ownerUid: classItem.ownerUid,
              });
            }}
          >
            <Text>ชื่อวิชา: {classNames[classItem.id] || "ไม่พบชื่อวิชา"}</Text>
            <Text>
              สถานะ:{" "}
              {classItem.status === 0
                ? "รอดำเนินการ"
                : classItem.status === 1
                ? "ลงทะเบียนแล้ว"
                : "ไม่ทราบสถานะ"}
            </Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text>ยังไม่มีการลงทะเบียน</Text>
      )}

      <TextInput
        placeholder="รหัสวิชา (CID)"
        value={cid}
        onChangeText={setCid}
        style={{ borderWidth: 1, marginVertical: 10, padding: 5 }}
      />
      <Button
        title="Scan QR Code"
        onPress={() => setScanning(true)}
        color="blue"
      />
      <Button title="ลงทะเบียน" onPress={registerToClass} color="green" />

      {scanning && (
        <Camera
          style={{ width: "100%", height: 300, marginTop: 10 }}
          onBarCodeScanned={handleBarCodeScanned}
        />
      )}
    </ScrollView>
  );
};

export default HomeScreen;
