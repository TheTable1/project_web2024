import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { auth } from "./firebase";
import { signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [otpCode, setOtpCode] = useState("");

  // ✅ ฟังก์ชันเข้าสู่ระบบด้วย Email/Password
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "กรุณากรอก Email และ Password");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert("เข้าสู่ระบบสำเร็จ!");
      navigation.navigate("Home");
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
      const recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      setVerificationId(confirmation.verificationId);
      Alert.alert("OTP ถูกส่งแล้ว กรุณากรอก OTP ที่ได้รับ");
    } catch (error) {
      Alert.alert("Error", "ไม่สามารถส่ง OTP ได้");
    }
  };

  // ✅ ฟังก์ชันยืนยัน OTP
  const verifyOtp = async () => {
    if (!verificationId || !otpCode) {
      Alert.alert("Error", "กรุณากรอก OTP");
      return;
    }

    try {
      const credential = PhoneAuthProvider.credential(verificationId, otpCode);
      await signInWithCredential(auth, credential);
      Alert.alert("เข้าสู่ระบบสำเร็จด้วย OTP!");
      navigation.navigate("Home");
    } catch (error) {
      Alert.alert("Error", "OTP ไม่ถูกต้อง");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 10 }}>เข้าสู่ระบบ</Text>

      {/* ✅ Login ด้วย Email/Password */}
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="เข้าสู่ระบบด้วย Email" onPress={handleLogin} />

      {/* ✅ ไปหน้าสมัครสมาชิก */}
      <Button title="สมัครสมาชิก" onPress={() => navigation.navigate("Register")} color="green" />

      <View style={{ marginVertical: 20 }} />

      {/* ✅ Login ด้วย OTP */}
      <TextInput placeholder="Phone Number (+66xxxxxxxxx)" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
      <Button title="ส่ง OTP" onPress={sendOtp} />
      <TextInput placeholder="OTP Code" value={otpCode} onChangeText={setOtpCode} keyboardType="numeric" />
      <Button title="ยืนยัน OTP" onPress={verifyOtp} />

      <View id="recaptcha-container"></View>
    </View>
  );
};

export default LoginScreen;
