import './App.css';
import {useState, useEffect} from 'react';
import ListGroup from 'react-bootstrap/ListGroup';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [users, setUsers] = useState([]);
  const [predictions, setPredictions] = useState([]);
  
  // Load user data
  const loadUserData = async () => {
    const userData = await fetch("http://localhost:8000/users")
      .then(response => response.json());

    // Update user data
    setUsers(userData);
  };

  // Get user predictions, given email
  const loadPredictions = async (e, email) => {
    e.preventDefault();

    const predictionData = await fetch(`http://localhost:8000/predictions/${email}`)
      .then(response => response.json());

    // Update user predictions
    setPredictions(predictionData);
  }

  // Get and load user data on load
  useEffect(() => {
    loadUserData();
  }, []);

  return (
    <div className="App">
      <div className="split left">
        <h3>Users</h3>
        <hr className="rounded left" />
        <ListGroup>
          { users &&
            users.map(user => {
              const {firstName, lastName, email} = user;
              return (
                <ListGroup.Item action key={email} href={email} onClick={(e) => loadPredictions(e, email)}>
                  {firstName} {lastName} - {email}
                </ListGroup.Item>
              )
            })
          }
        </ListGroup>
      </div>
      <div className="split right">
        <h3>Recurring Income</h3>
        <hr className="rounded right" />
        <ListGroup>
          { predictions &&
            predictions.map(prediction => {
              const {source, averagePayment, mostRecentPayment, estimatedPayDate} = prediction;
              return (
                <ListGroup.Item key={source}>
                  <h6>Source: {source}</h6> <br />
                  Average Payment: ${averagePayment} // Most Recent Payment: ${mostRecentPayment} <br />
                  Next Estimated Pay Date: {estimatedPayDate}
                </ListGroup.Item>
              )
            })
          }
        </ListGroup>
      </div>
    </div>
  );
}

export default App;
