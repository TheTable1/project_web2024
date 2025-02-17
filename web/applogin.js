const RB = ReactBootstrap;
const { Alert, Card, Button, Table } = ReactBootstrap;
const firebaseConfig = {
  apiKey: "AIzaSyDrjydWmT19vEJu6zvsJCZk-iLg5P9G_9c",
  authDomain: "web2567teungteung.firebaseapp.com",
  projectId: "web2567teungteung",
  storageBucket: "web2567teungteung.firebasestorage.app",
  messagingSenderId: "472898800755",
  appId: "1:472898800755:web:b861572160a6ca34a4ae06",
  measurementId: "G-LVKQEQ5Z67"
};
    firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

db.collection("user").get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
        console.log(`${doc.id} =>`,doc.data());
    });
});

class App extends React.Component {
    title = (<Alert variant="info">
        <b>Student Check-In System</b>
    </Alert>);
    footer = (
        <div>
            By 653380201-2 ธนวัฒน์ ถนัดค้า<br />
            College of Computing, Khon Kaen University
        </div>
    );

    state = {
        scene: 0,
        students: [],
        user : null,
        stdId: "",
        stdTitle: "",
        stdFname: "",
        stdLname: "",
        stdEmail: "",
        stdPhone: "",
    }  

    constructor(props){
      super(props);
      
      auth.onAuthStateChanged((user)=>{
          if (user) {
            this.setState({user:user.toJSON()});
          }else{
            this.setState({user:null});
         }
      });    
  }

    google_login() {
        // Using a popup.
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope("profile");
        provider.addScope("email");

        firebase.auth().signInWithPopup(provider).then((result) => {
          const user = result.user;
          if (user) {
              this.setState({ user: user.toJSON() });
  
              // Save user data to Firestore
              const userRef = db.collection("users").doc(user.uid);
              userRef.get().then((doc) => {
                  if (!doc.exists) {
                      userRef.set({
                          name: user.displayName,
                          email: user.email,
                          photo: user.photoURL,
                          phone: "", // Empty initially
                          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                      }).then(() => {
                          console.log("User data added to Firestore.");
                      }).catch((error) => {
                          console.error("Error adding user:", error);
                      });
                  }
              });
          }
      }).catch((error) => {
          console.error("Login failed:", error);
      });
    }

    google_logout() {
        if (confirm("Are you sure?")) {
            firebase.auth().signOut();
        }
    }

    render() {
        var stext = JSON.stringify(this.state.students);
        return (
          <Card>
            <Card.Header>{this.title}</Card.Header>  
            <LoginBox user={this.state.user} app={this}></LoginBox>
            <Card.Body>
            <Info user={this.state.user} app={this}></Info>  
            </Card.Body>
            <Card.Footer>{this.footer}</Card.Footer>
          </Card>          
        );
      }
};

function StudentTable({ data, app }){
    var rows = [];
    for(var s of data) {
      rows.push(<tr>
          <td>{s.id}</td>
          <td>{s.title}</td>
          <td>{s.fname}</td>
          <td>{s.lname}</td>
          <td>{s.email}</td>
          <td>{s.phone}</td>
          <td><EditButton std={s} app={app}/></td>
          <td><DeleteButton std={s} app={app}/></td>
        </tr>);
    }
  
    return <table className='table'>
    <tr>
          <td>รหัส</td>
          <td>คำนำหน้า</td>
          <td>ชื่อ</td>
          <td>สกุล</td>
          <td>email</td>
        </tr>
        { rows }
      </table>
  }
  
  function TextInput({label,app,value,style}){
  return <label className = "form-label">
  {label}:
  <input className="form-control" style = {style}
  value={app.state[value]} onChange={(ev)=>{
    var s = {};
    s[value] = ev.target.value;
    app.setState(s);}
  }></input>
  </label>;
  }
  
  function EditButton({std,app}){
    return <Button onClick={()=>app.edit(std)}>แก้ไข</Button>;
  }
  
  function DeleteButton({std,app}){
    return <Button onClick={()=>app.delete(std)}>ลบ</Button>;
  }
  
  function LoginBox(props) {
    const u = props.user;
    const app = props.app;
    if (!u) {
        return <div><Button onClick={() => app.google_login()}>Login</Button></div>
    } else {
        return <div className="d-flex align-items-center">
        {/* รูปโปรไฟล์ผู้ใช้ */}
        <img 
            src={u.photoURL} 
            alt="User Avatar" 
            className="rounded-circle me-3" 
            style={{ width: '50px', height: '50px' }} 
        />
        
        {/* ข้อมูลอีเมล */}
        <span className="me-3">{u.email}</span>
    
        {/* ปุ่ม Logout */}
        <Button 
            onClick={() => app.google_logout()} 
            variant="danger" 
            className="ms-2"
        >
            Logout
        </Button>
    </div>
    }
  }

  function Info(props) {
    const { user, app } = props;
    const [phone, setPhone] = React.useState("");
  
    React.useEffect(() => {
      if (user) {
        const userRef = db.collection("users").doc(user.uid);
        userRef.get().then((doc) => {
          if (doc.exists) {
            setPhone(doc.data().phone || "Not set");
          }
        });
      }
    }, [user]);
  
    if (!user) {
      return <div><h1>กรุณาเข้าสู่ระบบ</h1></div>;
    } else {
      return (
        <div>
          <h1>ยินดีต้อนรับ</h1>
          <h2>{user.displayName}</h2>
          <h3>{user.email}</h3>
          <h4>Phone: {phone}</h4>
          <EditProfileButton user={user} />
        </div>
      );
    }
  }

  function EditProfileButton({ user, app }) {
    const [showModal, setShowModal] = React.useState(false);
    const [newName, setNewName] = React.useState(user.displayName);
    const [newPhone, setNewPhone] = React.useState("");

    // Fetch user data from Firestore
    React.useEffect(() => {
        const userRef = db.collection("users").doc(user.uid);
        userRef.get().then((doc) => {
            if (doc.exists) {
                setNewPhone(doc.data().phone || "");
            }
        });
    }, [user]);

    const handleSave = () => {
      const { user, newPhone, newName } = this.state;
        const userRef = db.collection("users").doc(user.uid);
        
        userRef.update({
            name: newName,
            phone: newPhone,
        }).then(() => {
            alert("Profile updated successfully!");
            setShowModal(false);

            // Update app state with new data
            app.setState({
                user: {
                    ...app.state.user,
                    displayName: newName,
                },
            });
        }).catch((error) => {
            console.error("Error updating profile:", error);
        });
    };

    return (
        <div>
            <Button onClick={() => setShowModal(true)}>Edit Profile</Button>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Edit Profile</h3>
                        <label>Name:</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />

                        <label>Phone:</label>
                        <input
                            type="text"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                        />

                        <div className="modal-buttons">
                            <Button onClick={handleSave}>Save</Button>
                            <Button onClick={() => setShowModal(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


const container = document.getElementById("myapp");
const root = ReactDOM.createRoot(container);
root.render(<App />);