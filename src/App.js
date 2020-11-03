import React from 'react';

import { Store } from 'pullstate';

import { KeyboardProvider, Input } from './Keyboard';

import { Nav, NavItem, NavLink, Dropdown, Tabs, Tab } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import './App.css';

const AppStore = new Store({
  triggerMode:2,  
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

function TopMenu() {
  const trigMode = AppStore.useState(s => s.triggerMode);
  
  return <Nav className="topnav">
    <Dropdown as={NavItem}>
      <Dropdown.Toggle as={NavLink}>{TriggerButton(trigMode)}</Dropdown.Toggle>
      <Dropdown.Menu>
	<Dropdown.Item onClick={() => AppStore.update(s => { s.triggerMode = 0})}>{TriggerButton(0)}</Dropdown.Item>
	<Dropdown.Item onClick={() => AppStore.update(s => { s.triggerMode = 1})}>{TriggerButton(1)}</Dropdown.Item>
	<Dropdown.Item onClick={() => AppStore.update(s => { s.triggerMode = 2})}>{TriggerButton(2)}</Dropdown.Item>
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
