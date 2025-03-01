import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [stid, setStid] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [otpCode, setOtpCode] = useState("");

  // ✅ ฟังก์ชันสมัครสมาชิกด้วย Email/Password
  const handleRegister = async () => {
    if (!email || !password || !name || !stid || !phoneNumber) {
      Alert.alert("Error", "กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name,
        stid,
        email,
        phone: phoneNumber, // ✅ เพิ่มการบันทึกหมายเลขโทรศัพท์
        uid: user.uid,
        createdAt: new Date().toISOString(),
      });

      Alert.alert("สมัครสมาชิกสำเร็จ!", "กรุณาเข้าสู่ระบบ");
      navigation.navigate("Login");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // ✅ ฟังก์ชันส่ง OTP ไปที่เบอร์โทร
  const sendOtp = async () => {
    if (!phoneNumber) {
      Alert.alert("Error", "กรุณากรอกหมายเลขโทรศัพท์");
      return;
    }

    try {
      const recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifier
      );
      setVerificationId(confirmation.verificationId);
      Alert.alert("OTP ถูกส่งแล้ว กรุณากรอก OTP ที่ได้รับ");
    } catch (error) {
      Alert.alert("Error", "ไม่สามารถส่ง OTP ได้");
    }
  };

  // ✅ ฟังก์ชันยืนยัน OTP
  const verifyOtp = async () => {
    if (!verificationId || !otpCode || !name || !stid) {
      Alert.alert("Error", "กรุณากรอก OTP และข้อมูลส่วนตัว");
      return;
    }

    try {
      const credential = auth.PhoneAuthProvider.credential(
        verificationId,
        otpCode
      );
      const userCredential = await auth.signInWithCredential(credential);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name,
        stid,
        phone: phoneNumber, // ✅ บันทึกหมายเลขโทรศัพท์
        uid: user.uid,
        createdAt: new Date().toISOString(),
      });

      Alert.alert("เข้าสู่ระบบสำเร็จด้วย OTP!");
      navigation.navigate("Home");
    } catch (error) {
      Alert.alert("Error", "OTP ไม่ถูกต้อง");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 10 }}>
        สมัครสมาชิก
      </Text>

      <TextInput placeholder="ชื่อเต็ม" value={name} onChangeText={setName} />
      <TextInput
        placeholder="รหัสนักศึกษา"
        value={stid}
        onChangeText={setStid}
        keyboardType="numeric"
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        placeholder="Phone"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      <Button title="สมัครด้วย Email" onPress={handleRegister} color="green" />

      <View style={{ marginVertical: 20 }} />

      <TextInput
        placeholder="Phone Number (+66xxxxxxxxx)"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      <Button title="ส่ง OTP" onPress={sendOtp} />
      <TextInput
        placeholder="OTP Code"
        value={otpCode}
        onChangeText={setOtpCode}
        keyboardType="numeric"
      />
      <Button title="ยืนยัน OTP" onPress={verifyOtp} color="blue" />

      <View id="recaptcha-container"></View>

      <Button
        title="กลับไปที่เข้าสู่ระบบ"
        onPress={() => navigation.navigate("Login")}
      />
    </View>
  );
};

export default RegisterScreen;
