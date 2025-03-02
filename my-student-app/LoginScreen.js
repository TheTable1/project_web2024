import React, { useState } from "react";
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
  Image,
} from "react-native";
import { auth, signInWithEmailAndPassword } from "./firebase";
import { MaterialIcons } from "@expo/vector-icons";

const LoginScreen = ({ navigation }) => {
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert("กรุณากรอกข้อมูล", "โปรดกรอกอีเมลและรหัสผ่าน");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      navigation.replace("Home");
    } catch (error) {
      setLoading(false);
      Alert.alert("เข้าสู่ระบบไม่สำเร็จ", error.message);
    }
  };

  const handlePhoneLogin = () => {
    navigation.navigate("OTPLogin");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.title}>เข้าสู่ระบบ</Text>
          <Text style={styles.subtitle}>เข้าสู่ระบบเพื่อใช้งานแอปพลิเคชัน</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, !showPhoneLogin ? styles.activeTab : null]}
            onPress={() => setShowPhoneLogin(false)}
          >
            <Text style={!showPhoneLogin ? styles.activeTabText : styles.tabText}>
              อีเมล
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, showPhoneLogin ? styles.activeTab : null]}
            onPress={() => setShowPhoneLogin(true)}
          >
            <Text style={showPhoneLogin ? styles.activeTabText : styles.tabText}>
              เบอร์โทรศัพท์
            </Text>
          </TouchableOpacity>
        </View>

        {!showPhoneLogin ? (
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
              onPress={handleEmailLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.phoneContainer}>
              <MaterialIcons name="phone-android" size={50} color="#3498db" />
              <Text style={styles.phoneLoginText}>เข้าสู่ระบบด้วยเบอร์โทรศัพท์</Text>
              <Text style={styles.phoneSubtext}>
                เราจะส่งข้อความยืนยันไปยังเบอร์โทรศัพท์ของคุณ
              </Text>
            </View>
            <TouchableOpacity
              style={styles.phoneButton}
              onPress={handlePhoneLogin}
            >
              <Text style={styles.buttonText}>ไปยังหน้าเข้าสู่ระบบด้วย OTP</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>ยังไม่มีบัญชี? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.footerLink}>สมัครสมาชิก</Text>
          </TouchableOpacity>
        </View>
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
    fontSize: 28,
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
  activeTabText: {
    fontWeight: "600",
    color: "#FFFFFF",
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
  phoneContainer: {
    alignItems: "center",
    padding: 10,
  },
  phoneLoginText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
  },
  phoneSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  phoneButton: {
    backgroundColor: "#28a745",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
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
});

export default LoginScreen;