import React from 'react';

import { Store } from 'pullstate';

import socketIOClient from 'socket.io-client';

import { KeyboardProvider, Input } from './Keyboard';

import { Nav, NavItem, NavLink, Dropdown, Tabs, Tab } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import './App.css';

const AppStore = new Store({
  connected:false,
  connect_status:"Connecting...",
  triggerMode:2,
  currentReading:0.123456
});

const socket = socketIOClient(); //By default it connects to the site being served

socket.on('disconnect', (reason) => {
  AppStore.update(s => {s.connected = false; s.connect_status = "Disconnected"});
  if (reason === 'io server disconnect') {
    // the disconnection was initiated by the server, you need to reconnect manually
    socket.connect();
  }
  // else the socket will automatically try to reconnect
});

socket.on('connect', () => {
  AppStore.update(s => {s.connected = true; s.connect_status = "Connected"});
});

socket.on('status_change', (payload) => {
  AppStore.update(s => {
    s.triggerMode = payload.triggerMode;
  });
  console.log(payload);
});

socket.on('reading', (value) => {
  AppStore.update(s => {s.currentReading = value;});
});


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

function ConnectStatus() {
  const {connected, connect_status} = AppStore.useState(s => ({connected:s.connected, connect_status:s.connect_status}));
  var classes = "fas fa-signal text-success ml-1"
  if (!connected)
    classes = "fas fa-exclamation-circle text-danger ml-1";
  return <Nav.Item href="#">
    <Nav.Link eventKey="disabled" disabled>
      {connect_status}<i className={classes}></i>
    </Nav.Link>
  </Nav.Item>;
}

function TopMenu() {
  const {triggerMode} = AppStore.useState(s => ({triggerMode:s.triggerMode}));

  return <Nav className="topnav">
    <Dropdown as={NavItem} className="mr-auto">
      <Dropdown.Toggle as={NavLink}>{TriggerButton(triggerMode)}</Dropdown.Toggle>
      <Dropdown.Menu>
	<Dropdown.Item onClick={() => socket.emit('status_change', {triggerMode:0}) }>{TriggerButton(0)}</Dropdown.Item>
	<Dropdown.Item onClick={() => socket.emit('status_change', {triggerMode:1}) }>{TriggerButton(1)}</Dropdown.Item>
	<Dropdown.Item onClick={() => socket.emit('status_change', {triggerMode:2}) }>{TriggerButton(2)}</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
    <ConnectStatus/>
  </Nav>;
}

function LargeDisplay() {
  const reading = AppStore.useState(s => s.currentReading);
  const rstr = reading.toFixed(6);
  var output = "";
  if (reading >= 0)
    output += '+';
  output += rstr;
  output += " mV"
  return <div id="MainDisplay" className="text-monospace">
    {output}
  </div>;

}


function App() {

  return (
    <KeyboardProvider>
      <TopMenu/>
      <main role="main" className="">
	<LargeDisplay/>
	<div id="tabs">
	  <Tabs >
	    <Tab eventKey="mode" title="Mode">
	    </Tab>
	    <Tab eventKey="config" title="Config">
	      <Input onChange={ (text) => console.log(text) } />
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
