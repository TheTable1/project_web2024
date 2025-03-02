import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet, TouchableOpacity, Image, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import { MaterialIcons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  // ✅ ฟังก์ชันเข้าสู่ระบบด้วย Email/Password
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("กรุณากรอกข้อมูล", "กรุณากรอก Email และ Password");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      navigation.navigate("Home");
    } catch (error) {
      setLoading(false);
      Alert.alert("เข้าสู่ระบบไม่สำเร็จ", error.message);
    }
  };

  // ✅ ฟังก์ชันส่ง OTP ไปที่เบอร์โทร
  const sendOtp = async () => {
    if (!phoneNumber) {
      Alert.alert("กรุณากรอกข้อมูล", "กรุณากรอกหมายเลขโทรศัพท์");
      return;
    }

    setLoading(true);
    try {
      // สำหรับ React Native ต้องใช้ Firebase Authentication Phone หรือใช้ Firebase Auth Emulator สำหรับการทดสอบ
      // ในกรณีนี้ เราจะจำลองการส่ง OTP สำหรับการทดสอบ
      
      // สร้างรหัส OTP จำลอง (ในการใช้งานจริงจะถูกส่งโดย Firebase)
      setTimeout(() => {
        setVerificationId("verification-id-placeholder");
        setShowOtp(true);
        setLoading(false);
        Alert.alert("ส่ง OTP สำเร็จ", "รหัส OTP ถูกส่งไปยังหมายเลข " + phoneNumber);
      }, 1500);
      
    } catch (error) {
      setLoading(false);
      Alert.alert("ส่ง OTP ไม่สำเร็จ", "ไม่สามารถส่ง OTP ได้ โปรดลองอีกครั้ง");
    }
  };

  // ✅ ฟังก์ชันยืนยัน OTP
  const verifyOtp = async () => {
    if (!verificationId || !otpCode) {
      Alert.alert("กรุณากรอกข้อมูล", "กรุณากรอก OTP");
      return;
    }

    setLoading(true);
    try {
      // สำหรับการทดสอบเท่านั้น
      if (otpCode === "123456") {
        setLoading(false);
        Alert.alert("เข้าสู่ระบบสำเร็จ", "ยินดีต้อนรับกลับมา!");
        navigation.navigate("Home");
      } else {
        setLoading(false);
        Alert.alert("รหัส OTP ไม่ถูกต้อง", "กรุณาตรวจสอบรหัส OTP และลองอีกครั้ง");
      }
      
      /* สำหรับการใช้งานจริงกับ Firebase
      const credential = PhoneAuthProvider.credential(verificationId, otpCode);
      await signInWithCredential(auth, credential);
      setLoading(false);
      navigation.navigate("Home");
      */
    } catch (error) {
      setLoading(false);
      Alert.alert("ยืนยัน OTP ไม่สำเร็จ", "รหัส OTP ไม่ถูกต้อง");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.title}>เข้าสู่ระบบ</Text>
          <Text style={styles.subtitle}>เข้าสู่ระบบเพื่อลงทะเบียนเรียน</Text>
        </View>

        {!showOtp ? (
          <>
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, email ? styles.activeTab : null]} 
                onPress={() => setEmail(email || "test@example.com")}
              >
                <Text style={styles.tabText}>Email</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, phoneNumber ? styles.activeTab : null]}
                onPress={() => setPhoneNumber(phoneNumber || "0812345678")}
              >
                <Text style={styles.tabText}>โทรศัพท์</Text>
              </TouchableOpacity>
            </View>

            {phoneNumber ? (
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="phone" size={24} color="#666" />
                  <TextInput
                    style={styles.input}
                    placeholder="หมายเลขโทรศัพท์"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </View>
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={sendOtp}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "กำลังดำเนินการ..." : "ส่ง OTP"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="email" size={24} color="#666" />
                  <TextInput
                    style={styles.input}
                    placeholder="อีเมล"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock" size={24} color="#666" />
                  <TextInput
                    style={styles.input}
                    placeholder="รหัสผ่าน"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "กำลังดำเนินการ..." : "เข้าสู่ระบบ"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>ยังไม่มีบัญชี? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.footerLink}>สมัครสมาชิก</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.otpTitle}>ยืนยัน OTP</Text>
            <Text style={styles.otpSubtitle}>
              โปรดกรอกรหัส OTP ที่ส่งไปยัง {phoneNumber}
            </Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="sms" size={24} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="รหัส OTP"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>
            <TouchableOpacity 
              style={styles.button} 
              onPress={verifyOtp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "กำลังตรวจสอบ..." : "ยืนยัน OTP"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.resendButton} 
              onPress={sendOtp}
              disabled={loading}
            >
              <Text style={styles.resendButtonText}>ส่ง OTP อีกครั้ง</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setShowOtp(false)}
            >
              <Text style={styles.backButtonText}>กลับ</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#E0E0E0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#3498db",
  },
  tabText: {
    fontWeight: "600",
    color: "#333",
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#3498db",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#666",
    fontSize: 16,
  },
  footerLink: {
    color: "#3498db",
    fontSize: 16,
    fontWeight: "bold",
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  otpSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  resendButton: {
    marginTop: 15,
    alignItems: "center",
    padding: 10,
  },
  resendButtonText: {
    color: "#3498db",
    fontSize: 14,
  },
  backButton: {
    marginTop: 10,
    alignItems: "center",
    padding: 5,
  },
  backButtonText: {
    color: "#666",
    fontSize: 14,
  },
});

export default LoginScreen;