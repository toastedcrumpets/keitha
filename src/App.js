import React, { useEffect } from 'react';

import { Store } from 'pullstate';

import socketIOClient from 'socket.io-client';

import { KeyboardProvider, Input } from './Keyboard';

import { Table, Nav, NavItem, NavLink, Dropdown, Tabs, Tab } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import './App.css';

const AppStore = new Store({
  conf_state: {
    triggerMode:0,    
  },
  buf_state: {
    sum:0,
    sum_sq:0,
    min:1e300,
    max:-1e300,
  },
  connected:false,
  connect_status:"Connecting...",
  readings_state:[],
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
  const {triggerMode} = AppStore.useState(s => ({triggerMode:s.conf_state.triggerMode}));

  return <Nav className="topnav">
    <Dropdown as={NavItem} className="mr-auto">
      <Dropdown.Toggle as={NavLink}>{TriggerButton(triggerMode)}</Dropdown.Toggle>
      <Dropdown.Menu>
	<Dropdown.Item onClick={() => socket.emit('conf_state_update', {triggerMode:0}) }>{TriggerButton(0)}</Dropdown.Item>
	<Dropdown.Item onClick={() => socket.emit('conf_state_update', {triggerMode:1}) }>{TriggerButton(1)}</Dropdown.Item>
	<Dropdown.Item onClick={() => socket.emit('conf_state_update', {triggerMode:2}) }>{TriggerButton(2)}</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
    <ConnectStatus/>
  </Nav>;
}

function LargeDisplay() {
  const reading = AppStore.useState(s => s.readings_state[s.readings_state.length-1]);
  var start = "";
  if (reading === undefined)
    start = "+-.------";
  else if (reading[1] > 0)
    start = "+"+reading[1].toFixed(6);
  else
    start = reading[1].toFixed(6);
  return (<div id="MainDisplay" className="text-monospace">
    { start + " mV" }
  </div>);

}


function StatisticsPages() {
  const {min, max, sum, sum_sq, N} = AppStore.useState(s => ({min:s.buf_state.min, max:s.buf_state.max, sum:s.buf_state.sum, sum_sq:s.buf_state.sum_sq, N:s.readings_state.length}));

  var avg = sum / N;
  var stddev = Math.sqrt(sum_sq / N - avg * avg);

  avg = avg.toString();
  stddev = stddev.toString();
  
  return (
    <Table striped bordered hover className="stats-table">
      <tbody>
	<tr>
	  <td>Peak to Peak:</td>
	  <td>{(max - min).toString()}</td>
	  <td>Span:</td>
	  <td>{N.toString()} readings</td>
	</tr>
	<tr>
	  <td>Average:</td>
	  <td>{avg}</td>
	  <td>Standard Dev:</td>
	  <td>{stddev}</td>
	</tr>
	<tr>
	  <td>Maximum:</td>
	  <td>{max.toString()}</td>
	  <td>Minimum:</td>
	  <td>{min.toString()}</td>
	</tr>
      </tbody>
    </Table>);
}

var socket = null

function App() {

  useEffect(() => {
    //The python backend is always at 8080; however, we like developing
    //with the `npm start` server as it automatically updates the pages (and
    //has cool debugging build options turned on). So we do a bit of
    //wrangling to make the npm server work with the "production" python
    //server.
    socket = socketIOClient(window.location.hostname+':8080');

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
      socket.emit('conf_state_sub');//Subscribe to configuration state
      socket.emit('buf_state_sub');//Subscribe to buffer state change
      socket.emit('readings_state_sub');//Subscribe to readings state change
    });

    socket.on('conf_state_update', (payload) => {
      AppStore.update(s => {
	Object.assign(s.conf_state, payload);
      });
    });

    socket.on('buf_state_update', (payload) => {
      AppStore.update(s => {
	Object.assign(s.buf_state, payload);
      });
    });

    socket.on('readings_state_add', (payload) => {
      AppStore.update(s => {
	s.readings_state.push(...payload);
      });
    });

    socket.on('readings_state_update', (payload) => {
      AppStore.update(s => {
	s.readings_state = payload;
      });
    });
    
    return () => socket.disconnect();
  }, []);

  return (
    <KeyboardProvider>
      <TopMenu/>
      <main role="main" className="">
	<LargeDisplay/>
	<div id="tabs">
	  <Tabs >
	    <Tab eventKey="stats" title="Stats">
	      <StatisticsPages/>
	    </Tab>
	    <Tab eventKey="mode" title="Mode">
	    </Tab>
	    <Tab eventKey="config" title="Config">
	      <Input onChange={ (text) => {} } />
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
