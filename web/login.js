const { useEffect, useState } = React;
const { Alert, Card, Button, Form } = ReactBootstrap;

// 🔥 ตรวจสอบว่า Firebase ถูกโหลดแล้วหรือยัง
if (typeof firebase === "undefined") {
  console.error("Firebase SDK not loaded!");
} else {
  // 🔹 Firebase Config
  const firebaseConfig = {
    apiKey: "AIzaSyDpyi2trOVCMFZfTRTClLUSv9urSqFpmLA",
    authDomain: "projectweb-150fc.firebaseapp.com",
    projectId: "projectweb-150fc",
    storageBucket: "projectweb-150fc.firebaseapp.com",
    messagingSenderId: "148917915697",
    appId: "1:148917915697:web:7465133260f2d80e320510",
    measurementId: "G-Y03E7R1JSC",
  };

  // 🔹 Initialize Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  var db = firebase.firestore();
}

// 🔹 React Component
function LoginApp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // 🔹 ดึงข้อมูลจาก Firestore (ตัวอย่าง)
  useEffect(() => {
    if (db) {
      db.collection("students")
        .get()
        .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            console.log(`${doc.id} =>`, doc.data());
          });
        });
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Logging in:", username, password);
  };

  return (
    <Card className="p-4 shadow-lg">

      <h3 className="text-center fw-bold">Sign in</h3>
      <Form onSubmit={handleLogin}>
        <Form.Group className="mb-3">
          <Form.Label>User Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Form.Group>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <Form.Check type="checkbox" label="Remember me" />
          <a href="#" className="text-decoration-none">
            Forgot Password?
          </a>
        </div>

        <Button type="submit" variant="primary" className="w-100">
          Sign in
        </Button>
      </Form>

      <p className="text-center mt-3">
        Don’t have an account?{" "}
        <a href="#" className="text-primary">
          Sign Up
        </a>
      </p>

    </Card>
  );
}

// 🔹 Render React Component
const container = document.getElementById("root");
if (!container._reactRootContainer) {
  const root = ReactDOM.createRoot(container);
  root.render(<LoginApp />);
} else {
  console.warn("React root already exists. Skipping createRoot().");
}
