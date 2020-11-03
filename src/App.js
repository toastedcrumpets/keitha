import React from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

import { Nav, NavItem, NavLink, Dropdown, Tabs, Tab } from 'react-bootstrap';

import 'bootstrap/dist/css/bootstrap.min.css';


import './App.css';

//import Plot from 'react-plotly.js';

const keyboardState = {
    onInputFocus:() => {},
    onInputBlur:() => {},   
};

const KeyboardContext  = React.createContext(keyboardState);

function KeyboardProvider({children}) {
    const [open, setOpen] = React.useState(false);
    const [text, setText] = React.useState("");
    
    var state = {
	keyboardOpen: open,
	onInputFocus: (text) => {setOpen(true); setText(text);},
	keyboardText: text,
    };

    
    return <KeyboardContext.Provider value={state}>
	{children}
    { open ? <div style={{position:'absolute', bottom:0, left:0, right:0, top:0, opacity:0.5, 'background-color':'black'}} onClick={() => setOpen(false)} /> : null }
	<div style={{position:'absolute', bottom:0, left:0, right:0}} >
	{ open ?
	  <React.Fragment>
	  <div className="hg-theme-default">
	  <input autofocus value={text} className="hg-button" style={{color:'white', width:'100%'}}/>
	  </div>
	  <Keyboard onChange={(text) => setText(text)}/>
	  </React.Fragment>
	  : null}
	</div>
    </KeyboardContext.Provider>;
}

function Input() {
    const [text, setText] = React.useState("");
    const [loadKeyboard, setLoad] = React.useState(false);

    return (
	<KeyboardContext.Consumer>
	    {({ onInputFocus, keyboardOpen, keyboardText }) => {
		if (loadKeyboard)
		    setText(keyboardText);

		if (loadKeyboard && !keyboardOpen)
		    setLoad(false);

		return <input value={text} onFocus={() => { onInputFocus(text); setLoad(true);}}/>;
	    }}
	</KeyboardContext.Consumer>
    );
}


function TriggerButton(trigMode) {
    //Render the trigger button depending on the mode
    switch (trigMode) {
    case 0:
	return (<React.Fragment><i className="fas fa-stop"></i><span> Hold</span></React.Fragment>);
    case 1:
	return (<React.Fragment><i className="fas fa-camera"></i><span> Single</span></React.Fragment>);
    case 2:
	return (<React.Fragment><i className="fas fa-sync fa-spin"></i><span> Continuous</span></React.Fragment>);
    default:
	throw Error("Invalid trigger mode");
    };
};

function TopMenu(props) {
  const [trigMode, setTrigMode] = React.useState(2);
  
  return <Nav className="topnav">
    <Dropdown as={NavItem}>
      <Dropdown.Toggle as={NavLink}>{TriggerButton(trigMode)}</Dropdown.Toggle>
      <Dropdown.Menu>
	<Dropdown.Item onClick={() => setTrigMode(0)}>{TriggerButton(0)}</Dropdown.Item>
	<Dropdown.Item onClick={() => setTrigMode(1)}>{TriggerButton(1)}</Dropdown.Item>
	<Dropdown.Item onClick={() => setTrigMode(2)}>{TriggerButton(2)}</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  </Nav>;
}

function App() {
  return (
    <KeyboardProvider>
      <TopMenu/>
      <main role="main" className="">
	<div id="MainDisplay" className="text-monospace">
	  +0.00000000 mV
	</div>
	<div id="tabs">
	  <Tabs >
	    <Tab eventKey="mode" title="Mode">
	    </Tab>
	    <Tab eventKey="config" title="Config">
	    </Tab>
	    <Tab eventKey="graph" title="Graph">
	    </Tab>
	  </Tabs>
	</div>
      </main>
    </KeyboardProvider>
  );
}

export default App;
