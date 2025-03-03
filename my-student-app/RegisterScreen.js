import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
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

  // ฟังก์ชันสมัครสมาชิกด้วย Email/Password
  const handleRegister = async () => {
    if (!email || !password || !name || !stid) {
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
        uid: user.uid,
        createdAt: new Date().toISOString(),
      });

      Alert.alert("สมัครสมาชิกสำเร็จ!", "กรุณาเข้าสู่ระบบ");
      navigation.navigate("Login");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // ฟังก์ชันส่ง OTP ไปที่เบอร์โทร
  const sendOtp = async () => {
    if (!phoneNumber) {
      Alert.alert("Error", "กรุณากรอกหมายเลขโทรศัพท์");
      return;
    }

    try {
      const recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        }
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

  // ฟังก์ชันยืนยัน OTP
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
        phoneNumber,
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
    <View style={styles.container}>
      {/* หัวข้อใหญ่และคำบรรยาย */}
      <Text style={styles.title}>สมัครสมาชิก</Text>
      <Text style={styles.subtitle}>สมัครสมาชิกเพื่อใช้งานแอปพลิเคชัน</Text>

      {/* กล่องสำหรับสมัครด้วย Email/Password */}
      <View style={styles.boxContainer}>
        <TextInput
          style={styles.input}
          placeholder="ชื่อเต็ม"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="รหัสนักศึกษา"
          value={stid}
          onChangeText={setStid}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* ปุ่มสมัครด้วย Email */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "green" }]}
          onPress={handleRegister}
        >
          <Text style={styles.buttonText}>สมัครด้วย Email</Text>
        </TouchableOpacity>
      </View>

      
      {/* Element สำหรับ reCAPTCHA (ต้องมีไว้) */}
      <View id="recaptcha-container" />

      {/* ปุ่มย้อนกลับไปหน้า Login */}
      <TouchableOpacity
        style={styles.backLink}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.backLinkText}>กลับไปที่เข้าสู่ระบบ</Text>
      </TouchableOpacity>
    </View>
  );
};

// ส่วนกำหนดสไตล์
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
  },
  boxContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,

    // เงา (Android + iOS)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#FFF",
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  separator: {
    alignItems: "center",
    marginVertical: 10,
  },
  separatorText: {
    fontSize: 16,
    color: "#999",
  },
  backLink: {
    alignSelf: "center",
    marginTop: 8,
  },
  backLinkText: {
    fontSize: 16,
    color: "#007BFF",
  },
});

export default RegisterScreen;
