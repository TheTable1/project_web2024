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

    constructor(){
      super();
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
        firebase.auth().signInWithPopup(provider);
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
            <Editinfo app={this}></Editinfo>
              
      
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
        return <div>
            <img src={u.photoURL} />
            {u.email}<Button onClick={() => app.google_logout()}>Logout</Button></div>
    }
  }

  function Editinfo(app){
    return <div>
      <TextInput label="รหัส" app={app} value="stdId"/>
      <TextInput label="คำนำหน้า" app={app} value="stdTitle"/>
      <TextInput label="ชื่อ" app={app} value="stdFname"/>
      <TextInput label="สกุล" app={app} value="stdLname"/>
      <TextInput label="email" app={app} value="stdEmail"/>
      <TextInput label="เบอร์โทร" app={app} value="stdPhone"/>
      <Button onClick={()=>app.save()}>บันทึก</Button>
    </div>;
  }

const container = document.getElementById("myapp");
const root = ReactDOM.createRoot(container);
root.render(<App />);