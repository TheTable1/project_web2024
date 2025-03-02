import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { MaterialIcons } from "@expo/vector-icons";
import {
  auth,
  firebaseConfig,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  db,
  collection,
  query,
  where,
  getDocs,
} from "./firebase";

const OTPScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Enter phone, 2: Enter OTP

  // Reference for the reCAPTCHA verifier
  const recaptchaVerifier = useRef(null);

  // Format phone number to international format
  const formatPhoneNumber = (phone) => {
    if (phone.startsWith("+")) return phone;
    
    // If starts with 0, replace with +66
    if (phone.startsWith("0")) {
      return "+66" + phone.substring(1);
    }
    
    // Otherwise just add +66
    return "+66" + phone;
  };

  // Check if phone number exists in database
  const checkPhoneNumberExists = async (phone) => {
    try {
      const usersRef = collection(db, "Student");
      const q = query(usersRef, where("phoneNumber", "==", phone));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking phone:", error);
      return false; // For testing, return true to allow all phone numbers
    }
  };

  // Send OTP to phone number
  const sendOTP = async () => {
    if (!phoneNumber) {
      Alert.alert("กรุณากรอกข้อมูล", "โปรดกรอกเบอร์โทรศัพท์");
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    setLoading(true);

    try {
      // For production, you should uncomment this check
      // const phoneExists = await checkPhoneNumberExists(formattedPhone);
      // if (!phoneExists) {
      //   Alert.alert("เบอร์โทรศัพท์ไม่ถูกต้อง", "เบอร์นี้ยังไม่ได้ลงทะเบียนในระบบ");
      //   setLoading(false);
      //   return;
      // }

      // Send verification code
      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifier.current
      );
      
      setVerificationId(confirmation.verificationId);
      setStep(2);
      Alert.alert("ส่ง OTP สำเร็จ", "โปรดตรวจสอบข้อความ SMS ในโทรศัพท์ของคุณ");
    } catch (error) {
      console.error("OTP Error:", error);
      Alert.alert(
        "ส่ง OTP ไม่สำเร็จ", 
        "ไม่สามารถส่ง OTP ได้: " + error.message
      );
    }
    
    setLoading(false);
  };

  // Verify OTP code
  const verifyOTP = async () => {
    if (!verificationCode) {
      Alert.alert("กรุณากรอกข้อมูล", "โปรดกรอกรหัส OTP");
      return;
    }

    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );
      
      await signInWithCredential(auth, credential);
      setLoading(false);
      Alert.alert("เข้าสู่ระบบสำเร็จ", "ยินดีต้อนรับเข้าสู่ระบบ!");
      navigation.replace("Home");
    } catch (error) {
      setLoading(false);
      Alert.alert("ยืนยัน OTP ไม่สำเร็จ", "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === 2) {
              setStep(1);
            } else {
              navigation.goBack();
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>
            {step === 1 ? "เข้าสู่ระบบด้วย OTP" : "ยืนยันรหัส OTP"}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? "กรอกเบอร์โทรศัพท์เพื่อรับรหัส OTP"
              : "กรอกรหัส OTP ที่ได้รับจาก SMS"}
          </Text>
        </View>

        {step === 1 ? (
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <MaterialIcons name="phone" size={24} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="เบอร์โทรศัพท์ (เช่น 0812345678)"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={sendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>ส่งรหัส OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.phoneDisplay}>
              รหัส OTP ถูกส่งไปที่: {formatPhoneNumber(phoneNumber)}
            </Text>
            
            <View style={styles.inputContainer}>
              <MaterialIcons name="vpn-key" size={24} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="รหัส OTP (6 หลัก)"
                keyboardType="number-pad"
                maxLength={6}
                value={verificationCode}
                onChangeText={setVerificationCode}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={verifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>ยืนยัน OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={sendOTP}
              disabled={loading}
            >
              <Text style={styles.resendText}>ส่งรหัส OTP อีกครั้ง</Text>
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
    padding: 20,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
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
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
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
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  phoneDisplay: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  resendButton: {
    marginTop: 15,
    alignItems: "center",
  },
  resendText: {
    color: "#3498db",
    fontSize: 14,
  },
});

export default OTPScreen;